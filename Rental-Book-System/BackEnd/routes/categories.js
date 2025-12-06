// BackEnd/routes/categories.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// ดึงหมวดหมู่ทั้งหมด (ใช้ตอน Add Book หรือ Filter หน้าแรก)
router.get('/', categoryController.getAllCategories);

module.exports = router;