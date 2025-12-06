// BackEnd/controllers/reviewController.js
const pool = require('../config/db');
const axios = require('axios'); // ✅ อย่าลืมบรรทัดนี้

// ✅ Helper: หา Book ID จริง (ถ้าไม่มีให้สร้างใหม่จาก Google Books)
const getOrAddBookId = async (client, inputId) => {
  // 1. ถ้าเป็นตัวเลข = มีอยู่ใน Database แล้ว
  if (!isNaN(inputId)) return parseInt(inputId, 10);

  try {
    // 2. ถ้าเป็น Google ID ลองหาใน DB ก่อน
    const existing = await client.query(
      "SELECT book_id FROM books WHERE google_id = $1",
      [inputId]
    );
    if (existing.rows.length > 0) return existing.rows[0].book_id;

    // 3. ถ้าไม่มีใน DB เลย -> ดึงจาก Google API แล้วบันทึก
    console.log(`📚 Fetching book info for review: ${inputId}`);
    const API_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";
    
    // ดึงข้อมูล
    let title, author, isbn, published_year, description, cover_image, category_name;
    
    // รองรับ Open Library ID
    if (inputId.startsWith("OL_")) {
        // (Logic ย่อสำหรับ OpenLib เพื่อความสั้น)
        return null; // หรือ throw error ถ้ายังไม่อยากรองรับในส่วนรีวิว
    } 
    // Google Books
    else {
        const googleRes = await axios.get(
            `https://www.googleapis.com/books/v1/volumes/${inputId}?key=${API_KEY}`
        );
        const info = googleRes.data.volumeInfo || {};
        title = info.title || "No Title";
        author = info.authors ? info.authors[0] : "Unknown";
        isbn = info.industryIdentifiers ? info.industryIdentifiers[0].identifier : "N/A";
        published_year = info.publishedDate ? info.publishedDate.substring(0, 4) : null;
        description = info.description || "";
        cover_image = info.imageLinks?.thumbnail?.replace('http:', 'https:') || "https://via.placeholder.com/150";
        category_name = info.categories ? info.categories[0] : "General";
    }

    // หา Category ID
    let category_id = 1;
    if (category_name) {
        const catRes = await client.query(
            "SELECT category_id FROM categories WHERE name ILIKE $1",
            [`%${category_name}%`]
        );
        if (catRes.rows.length > 0) category_id = catRes.rows[0].category_id;
    }

    // บันทึกลง DB
    const newBook = await client.query(
      `INSERT INTO books (title, author, isbn, published_year, category_id, cover_image, description, owner_id, status, google_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 'available', $8) RETURNING book_id`,
      [title, author, isbn, published_year, category_id, cover_image, description, inputId]
    );

    return newBook.rows[0].book_id;

  } catch (err) {
    console.error("🔥 Error fetching book for review:", err.message);
    throw new Error("Failed to add book for review.");
  }
};

// 1. ดึงรีวิวตาม Book ID (รองรับ Google ID)
exports.getBookReviews = async (req, res) => {
  const { book_id } = req.params;

  try {
    let targetBookId = book_id;

    // ถ้าเป็น Google ID ให้ไปหา ID จริงใน DB ก่อน
    if (isNaN(book_id)) {
        const bookCheck = await pool.query("SELECT book_id FROM books WHERE google_id = $1", [book_id]);
        if (bookCheck.rows.length === 0) {
            // ถ้ายังไม่มีหนังสือใน DB เลย แสดงว่ายังไม่มีรีวิวแน่นอน
            return res.json([]); 
        }
        targetBookId = bookCheck.rows[0].book_id;
    }

    const reviews = await pool.query(
      `SELECT r.review_id, r.rating, r.comment, r.created_at, u.username, r.user_id 
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.book_id = $1
       ORDER BY r.created_at DESC`,
      [targetBookId]
    );

    res.json(reviews.rows);
  } catch (err) {
    console.error("Get Reviews Error:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// 2. เพิ่มรีวิว (แก้ไขให้รองรับ Google ID)
exports.addReview = async (req, res) => {
  const { book_id, rating, comment } = req.body;
  const user_id = req.user.id || req.user.user_id;

  if (!book_id || !rating) {
      return res.status(400).json({ message: "Book ID and Rating are required" });
  }

  const client = await pool.connect();
  try {
    // ✅ 1. หา ID จริง หรือสร้างหนังสือใหม่ถ้ายังไม่มี
    const realBookId = await getOrAddBookId(client, book_id);

    // ✅ 2. เช็คว่าเคยรีวิวไปหรือยัง
    const existingReview = await client.query(
        "SELECT review_id FROM reviews WHERE book_id = $1 AND user_id = $2",
        [realBookId, user_id]
    );

    if (existingReview.rows.length > 0) {
        return res.status(400).json({ message: "You have already reviewed this book." });
    }

    // ✅ 3. บันทึกรีวิว
    const newReview = await client.query(
      `INSERT INTO reviews (book_id, user_id, rating, comment, created_at) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [realBookId, user_id, rating, comment]
    );

    const user = await client.query("SELECT username FROM users WHERE user_id = $1", [user_id]);
    
    res.json({
        ...newReview.rows[0],
        username: user.rows[0].username
    });

  } catch (err) {
    console.error("Add Review Error:", err.message);
    res.status(500).json({ message: "Server Error: " + err.message });
  } finally {
    client.release();
  }
};

// ✅ 3. แก้ไขรีวิว
exports.updateReview = async (req, res) => {
    const { review_id } = req.params;
    const { rating, comment } = req.body;
    const user_id = req.user.id || req.user.user_id;

    if (!rating) {
        return res.status(400).json({ message: "Rating is required" });
    }

    try {
        const review = await pool.query(
            "SELECT user_id FROM reviews WHERE review_id = $1", 
            [review_id]
        );
        
        if (review.rows.length === 0) {
            return res.status(404).json({ message: "Review not found" });
        }
        
        if (review.rows[0].user_id !== user_id) {
            return res.status(403).json({ message: "You can only edit your own reviews" });
        }

        const updatedReview = await pool.query(
            `UPDATE reviews 
             SET rating = $1, comment = $2, created_at = CURRENT_TIMESTAMP 
             WHERE review_id = $3 
             RETURNING *`,
            [rating, comment, review_id]
        );

        const user = await pool.query(
            "SELECT username FROM users WHERE user_id = $1", 
            [user_id]
        );

        res.json({
            ...updatedReview.rows[0],
            username: user.rows[0].username
        });

    } catch (err) {
        console.error("Update Review Error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// 4. ลบรีวิว
exports.deleteReview = async (req, res) => {
    const { review_id } = req.params;
    const user_id = req.user.id || req.user.user_id;

    try {
        const review = await pool.query(
            "SELECT user_id FROM reviews WHERE review_id = $1", 
            [review_id]
        );
        
        if (review.rows.length === 0) {
            return res.status(404).json({ message: "Review not found" });
        }
        
        if (review.rows[0].user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await pool.query("DELETE FROM reviews WHERE review_id = $1", [review_id]);
        res.json({ message: "Review deleted successfully" });
        
    } catch (err) {
        console.error("Delete Review Error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
};