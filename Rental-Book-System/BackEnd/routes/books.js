// BackEnd/routes/books.js
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const authMiddleware = require('../middleware/authMiddleware');

// 1. Search Google Books
router.get('/search', bookController.searchGoogleBooks);

// 2. Get Suggestions (รองรับทั้ง /suggestions และ /suggest)
router.get('/suggestions', bookController.getSuggestions);
router.get('/suggest', bookController.getSuggestions); // Alias

// 3. Get All Books
router.get('/', bookController.getAllBooks);

// 4. Get Book By ID
router.get('/:id', bookController.getBookById);

// 5. Add Book
router.post('/', authMiddleware, bookController.addBook);

// 6. Sync Book Statuses
router.post('/sync-statuses', bookController.syncBookStatuses);

module.exports = router;