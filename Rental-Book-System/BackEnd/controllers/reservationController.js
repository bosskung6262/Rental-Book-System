// BackEnd/controllers/reservationController.js
const pool = require("../config/db");
const axios = require("axios");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const READY_HOURS = 48;

const getOrAddBookId = async (client, inputId) => {
  if (!isNaN(inputId)) return parseInt(inputId, 10);
  try {
    const API_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";
    const { data } = await axios.get(`https://www.googleapis.com/books/v1/volumes/${inputId}?key=${API_KEY}`);
    if (!data?.volumeInfo) throw new Error("No data found");
    
    const info = data.volumeInfo;
    const isbn = info.industryIdentifiers?.[0]?.identifier || `GID-${inputId}`;
    
    const existing = await client.query("SELECT book_id FROM books WHERE isbn = $1 OR google_id = $2", [isbn, inputId]);
    if (existing.rows.length > 0) return existing.rows[0].book_id;
    
    let category_id = 1;
    if (info.categories?.length > 0) {
      const catRes = await client.query("SELECT category_id FROM categories WHERE name ILIKE $1", [`%${info.categories[0]}%`]);
      if (catRes.rows.length > 0) category_id = catRes.rows[0].category_id;
    }
    
    const newBook = await client.query(
      `INSERT INTO books (title, author, isbn, published_year, category_id, cover_image, description, owner_id, status, google_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 'available', $8) RETURNING book_id`,
      [
        info.title || "Untitled Book",
        info.authors?.[0] || "Unknown",
        isbn,
        info.publishedDate?.substring(0, 4),
        category_id,
        info.imageLinks?.thumbnail?.replace('http:', 'https:') || "https://via.placeholder.com/150x220?text=No+Cover",
        info.description || "No description",
        inputId
      ]
    );
    return newBook.rows[0].book_id;
  } catch (err) {
    console.error("🔥 Error handling Google ID:", err.message);
    throw new Error("Cannot process this book data.");
  }
};

const sendReservationEmail = async (userEmail, userName, bookTitle, status, additionalInfo = {}) => {
  try {
    let subject, html;
    if (status === "created") {
      const { queuePosition, estimatedDate, preferredHours } = additionalInfo;
      const hours = parseFloat(preferredHours);
      const durationText = hours < 1 ? `${Math.round(hours * 60)} minutes` 
        : hours < 24 ? `${hours} hour${hours > 1 ? 's' : ''}` 
        : hours < 168 ? `${hours / 24} day${hours / 24 > 1 ? 's' : ''}` 
        : `${hours / 168} week${hours / 168 > 1 ? 's' : ''}`;
      
      subject = `📚 Reservation Confirmed: "${bookTitle}"`;
      html = `
        <div style="font-family:Arial,sans-serif;padding:20px;background:#f5f5f5">
          <div style="background:white;padding:30px;border-radius:10px;max-width:600px;margin:0 auto">
            <h2 style="color:#0770ad">✅ Reservation Confirmed!</h2>
            <p>Hi ${userName},</p>
            <p>You're <strong>#${queuePosition}</strong> in queue for <strong>"${bookTitle}"</strong></p>
            <div style="background:#e3f2fd;border-left:4px solid #0770ad;padding:15px;margin:20px 0">
              <p style="margin:0;font-size:18px;color:#0770ad"><strong>🎯 Position: #${queuePosition}</strong></p>
              ${estimatedDate ? `<p style="margin:10px 0 0;color:#666">📅 Est. available: ${new Date(estimatedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>` : ''}
              <p style="margin:10px 0 0;color:#666">⏱️ Duration: ${durationText}</p>
            </div>
            <p style="color:#666">✨ <strong>Auto-Borrow:</strong> When it's your turn, we'll automatically borrow the book for you!</p>
          </div>
        </div>`;
    } else if (status === "auto_borrowed") {
      const { dueDate, borrowHours } = additionalInfo;
      const hours = parseFloat(borrowHours);
      const durationText = hours < 1 ? `${Math.round(hours * 60)} minutes` 
        : hours < 24 ? `${hours} hour${hours > 1 ? 's' : ''}` 
        : hours < 168 ? `${hours / 24} day${hours / 24 > 1 ? 's' : ''}` 
        : `${hours / 168} week${hours / 168 > 1 ? 's' : ''}`;
      
      subject = `🎉 Auto-Borrowed: "${bookTitle}"`;
      html = `
        <div style="font-family:Arial,sans-serif;padding:20px;background:#f5f5f5">
          <div style="background:white;padding:30px;border-radius:10px;max-width:600px;margin:0 auto">
            <h2 style="color:#0770ad">🎉 Great News, ${userName}!</h2>
            <p>Your reserved book <strong>"${bookTitle}"</strong> has been automatically borrowed!</p>
            <div style="background:#d4edda;border-left:4px solid #28a745;padding:15px;margin:20px 0">
              <p style="margin:0;color:#155724"><strong>⏱️ Duration:</strong> ${durationText}</p>
              <p style="margin:10px 0 0;color:#155724"><strong>📖 Due:</strong> ${new Date(dueDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </div>`;
    }
    
    await transporter.sendMail({
      from: `"ShelfShare Library" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject,
      html
    });
    console.log(`✅ [EMAIL] Sent to ${userEmail}: ${status}`);
  } catch (err) {
    console.error("❌ [EMAIL] Error:", err.message);
  }
};

const autoBorrowForUser = async (client, reservation) => {
  try {
    console.log(`🤖 [AUTO-BORROW] Processing user ${reservation.user_id}, book ${reservation.book_id}`);
    
    const existingLoan = await client.query(
      "SELECT * FROM loans WHERE book_id = $1 AND user_id = $2 AND status = 'active'",
      [reservation.book_id, reservation.user_id]
    );
    if (existingLoan.rows.length > 0) return { success: false, reason: "already_borrowed" };
    
    const [activeLoans, userInfo] = await Promise.all([
      client.query("SELECT COUNT(*) as count FROM loans WHERE user_id = $1 AND status = 'active'", [reservation.user_id]),
      client.query("SELECT borrow_limit, email, username FROM users WHERE user_id = $1", [reservation.user_id])
    ]);
    
    const borrowLimit = userInfo.rows[0]?.borrow_limit || 5;
    if (parseInt(activeLoans.rows[0].count) >= borrowLimit) {
      return { success: false, reason: "limit_reached" };
    }
    
    const borrowHours = parseFloat(reservation.preferred_hours) || 168.0;
    const dueDate = new Date(Date.now() + borrowHours * 60 * 60 * 1000);
    
    const newLoan = await client.query(
      `INSERT INTO loans (book_id, user_id, loan_date, due_date, status) 
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'active') RETURNING loan_id`,
      [reservation.book_id, reservation.user_id, dueDate]
    );
    
    await Promise.all([
      client.query("UPDATE reservations SET status = 'completed' WHERE reservation_id = $1", [reservation.reservation_id]),
      client.query("UPDATE books SET status = 'borrowed' WHERE book_id = $1", [reservation.book_id])
    ]);
    
    const bookInfo = await client.query("SELECT title FROM books WHERE book_id = $1", [reservation.book_id]);
    await sendReservationEmail(
      userInfo.rows[0].email,
      userInfo.rows[0].username,
      bookInfo.rows[0].title,
      "auto_borrowed",
      { dueDate, borrowHours }
    );
    
    console.log(`✅ [AUTO-BORROW] Success - Loan ID: ${newLoan.rows[0].loan_id}`);
    return { success: true, loan_id: newLoan.rows[0].loan_id };
  } catch (err) {
    console.error("❌ [AUTO-BORROW] Error:", err.message);
    return { success: false, reason: "error", error: err.message };
  }
};

// ✅ ประกาศฟังก์ชัน processNextInQueue
const processNextInQueue = async (client, bookId) => {
  try {
    console.log(`🔄 [QUEUE] Processing book_id: ${bookId}`);
    
    const nextInQueue = await client.query(
      `SELECT r.*, u.email, u.username, b.title
       FROM reservations r
       JOIN users u ON r.user_id = u.user_id
       JOIN books b ON r.book_id = b.book_id
       WHERE r.book_id = $1 AND r.status = 'active'
       ORDER BY r.reservation_date ASC
       LIMIT 1`,
      [bookId]
    );
    
    if (nextInQueue.rows.length === 0) {
      await client.query("UPDATE books SET status = 'available' WHERE book_id = $1", [bookId]);
      console.log("✅ [QUEUE] No queue - Book available");
      return { hasQueue: false };
    }
    
    const reservation = nextInQueue.rows[0];
    const autoBorrowResult = await autoBorrowForUser(client, reservation);
    
    if (autoBorrowResult.success) {
      console.log(`✅ [QUEUE] Auto-borrowed for: ${reservation.username}`);
      return { hasQueue: true, nextUser: reservation.username, autoBorrowed: true };
    }
    
    const expiresAt = new Date(Date.now() + READY_HOURS * 60 * 60 * 1000);
    await client.query(
      `UPDATE reservations SET status = 'ready', ready_date = CURRENT_TIMESTAMP, expires_at = $1 WHERE reservation_id = $2`,
      [expiresAt, reservation.reservation_id]
    );
    await client.query("UPDATE books SET status = 'borrowed' WHERE book_id = $1", [bookId]);
    
    console.log(`⚠️ [QUEUE] Auto-borrow failed (${autoBorrowResult.reason}) - Set to ready`);
    return { hasQueue: true, nextUser: reservation.username, autoBorrowed: false };
  } catch (err) {
    console.error("❌ [QUEUE] Error:", err.message);
    throw err;
  }
};

// ✅ Export ฟังก์ชัน processNextInQueue
exports.processNextInQueue = processNextInQueue;

exports.processExpiredReservations = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const expired = await client.query(
      `SELECT r.*, u.email, u.username, b.title, b.book_id
       FROM reservations r
       JOIN users u ON r.user_id = u.user_id
       JOIN books b ON r.book_id = b.book_id
       WHERE r.status = 'ready' AND r.expires_at < NOW()`
    );
    
    console.log(`⏰ [CRON] Found ${expired.rows.length} expired reservations`);
    
    for (const r of expired.rows) {
      await client.query("UPDATE reservations SET status = 'expired' WHERE reservation_id = $1", [r.reservation_id]);
      await processNextInQueue(client, r.book_id);
    }
    
    await client.query("COMMIT");
    if (res) res.json({ message: "Processed", count: expired.rows.length });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ [CRON] Error:", err.message);
    if (res) res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

exports.createReservation = async (req, res) => {
  const { book_id, preferred_hours } = req.body;
  const user_id = req.user.id || req.user.user_id;
  
  if (!book_id) return res.status(400).json("Book ID required");
  
  const borrowHours = parseFloat(preferred_hours) || 168.0;
  if (borrowHours <= 0 || borrowHours > 720) {
    return res.status(400).json("Invalid duration (5 min to 30 days)");
  }
  
  const client = await pool.connect();
  try {
    const realBookId = await getOrAddBookId(client, book_id);
    await client.query("BEGIN");
    
    const existing = await client.query(
      "SELECT * FROM reservations WHERE book_id = $1 AND user_id = $2 AND status IN ('active', 'ready')",
      [realBookId, user_id]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json("Already reserved");
    }
    
    const bookCheck = await client.query("SELECT status, title FROM books WHERE book_id = $1", [realBookId]);
    if (bookCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json("Book not found");
    }
    if (bookCheck.rows[0].status === "available") {
      await client.query("ROLLBACK");
      return res.status(400).json("Book available - borrow directly");
    }
    
    const newReservation = await client.query(
      `INSERT INTO reservations (book_id, user_id, reservation_date, status, preferred_hours) 
       VALUES ($1, $2, CURRENT_TIMESTAMP, 'active', $3) RETURNING *`,
      [realBookId, user_id, borrowHours]
    );
    
    const queuePos = await client.query(
      `SELECT COUNT(*) as position FROM reservations 
       WHERE book_id = $1 AND status IN ('active', 'ready') AND reservation_date <= $2`,
      [realBookId, newReservation.rows[0].reservation_date]
    );
    
    const position = parseInt(queuePos.rows[0].position);
    
    const currentLoan = await client.query(
      `SELECT due_date FROM loans WHERE book_id = $1 AND status = 'active' ORDER BY loan_date DESC LIMIT 1`,
      [realBookId]
    );
    
    const userInfo = await client.query("SELECT email, username FROM users WHERE user_id = $1", [user_id]);
    await client.query("COMMIT");
    
    if (userInfo.rows.length > 0) {
      await sendReservationEmail(
        userInfo.rows[0].email,
        userInfo.rows[0].username,
        bookCheck.rows[0].title,
        "created",
        { 
          queuePosition: position, 
          estimatedDate: currentLoan.rows[0]?.due_date, 
          preferredHours: borrowHours 
        }
      );
    }
    
    console.log(`✅ [RESERVATION] Created position #${position} with ${borrowHours}h duration`);
    res.json({
      ...newReservation.rows[0],
      queue_position: position,
      estimated_available: currentLoan.rows[0]?.due_date,
      book_title: bookCheck.rows[0].title,
      preferred_hours: borrowHours
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ [RESERVATION] Error:", err);
    res.status(500).send("Server Error: " + err.message);
  } finally {
    client.release();
  }
};

exports.getMyReservations = async (req, res) => {
  const user_id = req.user.id || req.user.user_id;
  try {
    const result = await pool.query(
      `SELECT r.*, b.title, b.cover_image, b.author, b.book_id,
       (SELECT COUNT(*) FROM reservations r2 WHERE r2.book_id = r.book_id AND r2.status IN ('active', 'ready') AND r2.reservation_date < r.reservation_date) as queue_position,
       (SELECT due_date FROM loans l WHERE l.book_id = r.book_id AND l.status = 'active' ORDER BY l.loan_date DESC LIMIT 1) as current_holder_due_date
       FROM reservations r 
       JOIN books b ON r.book_id = b.book_id 
       WHERE r.user_id = $1 AND r.status IN ('active', 'ready')
       ORDER BY r.reservation_date DESC`,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ [GET-RESERVATIONS] Error:", err);
    res.status(500).send("Server Error");
  }
};

exports.cancelReservation = async (req, res) => {
  const { reservation_id } = req.params;
  const user_id = req.user.id || req.user.user_id;
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    const reservationCheck = await client.query(
      `SELECT r.*, b.title FROM reservations r JOIN books b ON r.book_id = b.book_id WHERE r.reservation_id = $1 AND r.user_id = $2`,
      [reservation_id, user_id]
    );
    
    if (reservationCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json("Reservation not found");
    }
    
    const reservation = reservationCheck.rows[0];
    const wasReady = reservation.status === "ready";
    
    await client.query("UPDATE reservations SET status = 'cancelled' WHERE reservation_id = $1", [reservation_id]);
    
    if (wasReady) {
      const queueResult = await processNextInQueue(client, reservation.book_id);
      await client.query("COMMIT");
      console.log(`✅ [CANCEL] Processed queue for book ${reservation.book_id}`);
      res.json({
        message: "Reservation cancelled",
        queueStatus: queueResult.hasQueue 
          ? (queueResult.autoBorrowed ? `Auto-borrowed by ${queueResult.nextUser}` : `Ready for ${queueResult.nextUser}`)
          : "Book now available"
      });
    } else {
      await client.query("COMMIT");
      console.log(`✅ [CANCEL] Cancelled reservation ${reservation_id}`);
      res.json({ message: "Reservation cancelled" });
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ [CANCEL] Error:", err);
    res.status(500).send("Server Error: " + err.message);
  } finally {
    client.release();
  }
};