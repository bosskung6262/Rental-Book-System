// BackEnd/routes/loans.js
const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const authMiddleware = require('../middleware/authMiddleware');

// 1. ยืมหนังสือ
router.post('/borrow', authMiddleware, loanController.borrowBook);

// 2. คืนหนังสือ
router.post('/return', authMiddleware, loanController.returnBook);

// 3. ดูรายการยืมของฉัน
router.get('/my-loans', authMiddleware, loanController.getMyLoans);

// 4. ดูหนังสือเกินกำหนด
router.get('/overdue', authMiddleware, loanController.getOverdueLoans);

// 🔥 5. Auto-Return (เรียกจาก Cron Job)
router.post('/auto-return', loanController.autoReturnExpiredLoans);

module.exports = router;