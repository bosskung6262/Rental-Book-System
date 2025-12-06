// BackEnd/routes/users.js
const router = require('express').Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Public Routes
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);
router.post('/subscribe-newsletter', userController.subscribeNewsletter);

// Protected Routes
router.get('/profile', authMiddleware, userController.getProfile); // ✅ เปลี่ยนเป็น getProfile
router.put('/profile', authMiddleware, userController.updateProfile); // ✅ เปลี่ยนเป็น updateProfile
router.put('/change-password', authMiddleware, userController.changePassword);

// Verify Token Route
router.get('/is-verify', authMiddleware, (req, res) => res.json(true));

module.exports = router;