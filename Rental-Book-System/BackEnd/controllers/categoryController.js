// BackEnd/controllers/categoryController.js
const pool = require('../config/db');

exports.getAllCategories = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};