const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ ต้อง Login
router.post('/', authMiddleware, loanController.borrowBook);
router.post('/return', authMiddleware, loanController.returnBook);
router.get('/my-loans', authMiddleware, loanController.getMyLoans);
router.get('/overdue', authMiddleware, loanController.getOverdueLoans);

// ✅ Cron endpoint (ไม่ต้อง auth)
router.post('/auto-return', loanController.autoReturnExpiredLoans);

module.exports = router;