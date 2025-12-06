// BackEnd/routes/reservations.js
const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const authMiddleware = require('../middleware/authMiddleware'); // ✅ ถูกต้อง

// 1. สร้างการจอง
router.post('/', authMiddleware, reservationController.createReservation);

// 2. ดูรายการจองของฉัน
router.get('/my-reservations', authMiddleware, reservationController.getMyReservations);

// 3. ยกเลิกการจอง
router.delete('/:reservation_id', authMiddleware, reservationController.cancelReservation);

// ✅ 4. Process Expired Reservations (ไม่ต้องใช้ authMiddleware)
router.post('/process-expired', reservationController.processExpiredReservations);

module.exports = router;