// BackEnd/routes/reviews.js
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// 1. ดูรีวิวของหนังสือ (ไม่ต้อง Login)
router.get('/:book_id', reviewController.getBookReviews);

// 2. เพิ่มรีวิว (ต้อง Login)
router.post('/', authMiddleware, reviewController.addReview);

// ❌ ลบบรรทัดนี้ออก (ถ้าไม่ต้องการ Update)
// router.put('/:review_id', authMiddleware, reviewController.updateReview);

// 3. ลบรีวิว (ต้อง Login)
router.delete('/:review_id', authMiddleware, reviewController.deleteReview);

module.exports = router;