// BackEnd/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
  // 1. รับ Token จาก Header
  const token = req.header('Authorization');

  // 2. เช็คว่ามี Token ไหม
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // 3. ตัดคำว่า "Bearer " ออก (ถ้า Frontend ส่งมาแบบ Bearer token)
    const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

    // 4. Verify Token
    const decoded = jwt.verify(tokenString, process.env.JWT_SECRET || 'your_jwt_secret');

    // 5. ใส่ User ลงใน Request
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};