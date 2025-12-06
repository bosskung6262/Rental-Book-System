const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const authMiddleware = require('../middleware/authMiddleware');

// --- โซนเส้นทางเฉพาะ (Specific Paths) ต้องมาก่อนเสมอ ---

// 1. ค้นหาหนังสือจาก Google
router.get('/search', bookController.searchGoogleBooks);

// 2. แนะนำหนังสือ (✅ ใส่ตรงนี้ครับ ก่อนถึง /:id)
router.get('/suggest', bookController.getSuggestions);

// 3. ดึงหนังสือทั้งหมด
router.get('/', bookController.getAllBooks);

// --- โซนเส้นทางแบบระบุ ID (Dynamic Paths) ต้องอยู่ท้ายๆ ---

// 4. ดึงรายละเอียดหนังสือรายเล่ม (ถ้าเอา suggest ไปไว้หลังอันนี้ พังทันที!)
router.get('/:id', bookController.getBookById);

// 5. เพิ่มหนังสือลง DB (ต้อง Login)
router.post('/', authMiddleware, bookController.addBook);

module.exports = router;