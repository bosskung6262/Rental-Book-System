// BackEnd/controllers/userController.js
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.user_id,
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" }
  );
};

// ✅ Email Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Register
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const userExist = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const bcryptPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, 'user') RETURNING *",
      [username, email, bcryptPassword]
    );

    const token = generateToken(newUser.rows[0]);
    const { password: _, ...userData } = newUser.rows[0];

    res.json({ token, user: userData });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  try {
    const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = userRes.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);
    const { password: _, ...userData } = user;

    res.json({ token, user: userData });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Get Profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found in token" });
    }

    const result = await pool.query(
      `SELECT user_id, username, email, created_at, role, borrow_limit 
       FROM users WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const { username } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found in token" });
    }

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const update = await pool.query(
      "UPDATE users SET username = $1 WHERE user_id = $2 RETURNING user_id, username, email",
      [username, userId]
    );

    if (update.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(update.rows[0]);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Change Password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found in token" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords are required" });
    }

    const user = await pool.query(
      "SELECT password FROM users WHERE user_id = $1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(currentPassword, user.rows[0].password);

    if (!valid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1 WHERE user_id = $2", [
      hash,
      userId,
    ]);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Forgot Password - ส่งอีเมลจริง
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.json({
        message: "If the email exists, a reset link has been sent",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetTokenExpire = new Date(Date.now() + 3600000);

    await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expire = $2 WHERE user_id = $3",
      [resetTokenHash, resetTokenExpire, user.rows[0].user_id]
    );

    // ✅ แก้ไข URL Format เป็น /reset-password/:token แทน ?token=
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: `"ShelfShare Library" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0770ad;">Reset Your Password</h2>
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0770ad; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Reset Password</a>
          <p style="color: #666;">Or copy this link: <br><a href="${resetUrl}">${resetUrl}</a></p>
          <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "If the email exists, a reset link has been sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to send reset email" });
  }
};

// ✅ Reset Password - รับ token จาก Body แทน URL Params
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await pool.query(
      "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expire > NOW()",
      [resetTokenHash]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password = $1, reset_token = NULL, reset_token_expire = NULL WHERE user_id = $2",
      [hash, user.rows[0].user_id]
    );

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
};
exports.subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // ✅ แก้ไขชื่อคอลัมน์ให้ตรงกับ database
    const existing = await pool.query(
      "SELECT * FROM newsletter_subscribers WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "This email is already subscribed" });
    }

    // ✅ แก้ไขให้ใช้ subscribed_at แทน created_at
    await pool.query(
      "INSERT INTO newsletter_subscribers (email, subscribed_at) VALUES ($1, NOW())",
      [email]
    );

    // ส่งอีเมลยืนยัน
    await transporter.sendMail({
      from: `"ShelfShare Library" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🎉 Welcome to ShelfShare Newsletter!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0770ad; margin: 0;">📚 ShelfShare</h1>
            <p style="color: #666; margin-top: 10px;">Your Personal Library Hub</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #0770ad 0%, #055a8c 100%); padding: 30px; border-radius: 12px; color: white; text-align: center;">
            <h2 style="margin: 0 0 15px 0;">Thank You for Subscribing! 🎉</h2>
            <p style="margin: 0; font-size: 16px; line-height: 1.6;">
              You'll now receive the latest book recommendations, platform updates, 
              and exclusive content delivered straight to your inbox.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <h3 style="color: #0770ad; margin-top: 0;">What to Expect:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>📖 Curated book recommendations based on trending genres</li>
              <li>✨ New feature announcements and platform updates</li>
              <li>🎯 Personalized reading suggestions</li>
              <li>🏆 Monthly top books and authors highlights</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              If you wish to unsubscribe, you can do so at any time by clicking the unsubscribe link in our emails.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 15px;">
              © ${new Date().getFullYear()} ShelfShare. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    res.json({
      message: "Successfully subscribed! Check your email for confirmation.",
      email,
    });
  } catch (err) {
    console.error("Newsletter subscription error:", err);
    res.status(500).json({ message: "Failed to subscribe. Please try again." });
  }
};

exports.subscribeNewsletter = async (req, res) => {
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  try {
    // เช็คว่ามี email นี้ในระบบหรือยัง
    const existing = await pool.query(
      'SELECT email FROM newsletter_subscribers WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        message: 'This email is already subscribed to our newsletter' 
      });
    }

    // บันทึก email
    await pool.query(
      'INSERT INTO newsletter_subscribers (email, subscribed_at) VALUES ($1, CURRENT_TIMESTAMP)',
      [email]
    );

    // ✅ ส่ง Welcome Email
    try {
      await transporter.sendMail({
        from: `"ShelfShare Library" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '📚 Welcome to ShelfShare Newsletter!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 48px; margin-bottom: 10px;">📚</div>
                <h1 style="color: #0770ad; margin: 0; font-size: 32px; font-weight: bold;">
                  Welcome to ShelfShare!
                </h1>
              </div>

              <!-- Body -->
              <div style="color: #333; line-height: 1.8; font-size: 16px;">
                <p style="margin-bottom: 20px;">
                  Hi there! 👋
                </p>
                <p style="margin-bottom: 20px;">
                  Thank you for subscribing to the <strong style="color: #0770ad;">ShelfShare Newsletter</strong>! 
                  We're excited to have you join our community of book lovers.
                </p>
                
                <div style="background: #f0f7ff; border-left: 4px solid #0770ad; padding: 20px; margin: 30px 0; border-radius: 8px;">
                  <h3 style="color: #0770ad; margin-top: 0; font-size: 18px;">
                    🎉 What You'll Get:
                  </h3>
                  <ul style="margin: 15px 0; padding-left: 20px; color: #555;">
                    <li style="margin-bottom: 10px;">📖 Personalized book recommendations</li>
                    <li style="margin-bottom: 10px;">✨ New arrivals & trending books</li>
                    <li style="margin-bottom: 10px;">🎁 Exclusive offers & early access</li>
                    <li style="margin-bottom: 10px;">📬 Monthly reading challenges</li>
                  </ul>
                </div>

                <p style="margin-bottom: 20px;">
                  Start exploring our collection now and discover your next favorite book!
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                  <a href="https://shelfshare.com/books" 
                     style="display: inline-block; background: #0770ad; color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(7, 112, 173, 0.3);">
                    Browse Books 📚
                  </a>
                </div>
              </div>

              <!-- Footer -->
              <div style="border-top: 2px solid #f0f0f0; margin-top: 40px; padding-top: 30px; text-align: center;">
                <p style="color: #999; font-size: 14px; margin-bottom: 15px;">
                  Happy Reading! 📖✨
                </p>
                <p style="color: #999; font-size: 12px; margin: 0;">
                  You're receiving this because you subscribed to <strong>${email}</strong>
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 10px;">
                  <a href="#" style="color: #0770ad; text-decoration: none;">Unsubscribe</a> | 
                  <a href="#" style="color: #0770ad; text-decoration: none;">Preferences</a>
                </p>
              </div>

            </div>
          </div>
        `
      });

      console.log(`✅ [NEWSLETTER] Welcome email sent to: ${email}`);
    } catch (emailError) {
      console.error('❌ [NEWSLETTER] Email sending failed:', emailError.message);
      // ไม่ return error เพราะการ subscribe สำเร็จแล้ว แค่เมลไม่ส่ง
    }

    res.json({ 
      message: 'Successfully subscribed to newsletter',
      email: email 
    });

  } catch (err) {
    console.error('❌ [NEWSLETTER] Subscription error:', err);
    res.status(500).json({ 
      message: 'Failed to subscribe. Please try again later.' 
    });
  }
};