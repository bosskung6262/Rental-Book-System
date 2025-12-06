// BackEnd/controllers/loanController.js
const pool = require("../config/db");
const axios = require("axios");

// ✅ Helper: จัดการ Book ID (รองรับทั้ง ID, Google ID, Open Library ID)
const getOrAddBookId = async (client, inputId) => {
  // 1. ถ้าเป็นตัวเลข = มีอยู่ใน Database แล้ว
  if (!isNaN(inputId)) return parseInt(inputId, 10);

  try {
    // 2. ตรวจสอบว่ามี Google ID หรือ OpenLibrary ID นี้ใน Database แล้วหรือไม่
    const existing = await client.query(
      "SELECT book_id FROM books WHERE google_id = $1",
      [inputId]
    );
    if (existing.rows.length > 0) return existing.rows[0].book_id;

    console.log(`📚 Adding new book from API: ${inputId}`);
    
    let title, author, isbn, published_year, description, cover_image, category_name;

    // ----------------------------------------------------------------
    // กรณี A: Open Library ID (ขึ้นต้นด้วย OL_)
    // ----------------------------------------------------------------
    if (inputId.startsWith("OL_")) {
      const workKey = inputId.replace("OL_", "/works/");
      const [workRes, editionRes] = await Promise.all([
        axios.get(`https://openlibrary.org${workKey}.json`, { timeout: 5000 }),
        axios.get(`https://openlibrary.org${workKey}/editions.json?limit=1`, { timeout: 5000 })
      ]);

      const work = workRes.data;
      const edition = editionRes.data.entries?.[0];

      title = work.title || "Untitled Book";
      published_year = work.first_publish_year || null;
      description = typeof work.description === "string" ? work.description : (work.description?.value || "No description");
      
      // หาชื่อผู้แต่ง
      author = "Unknown";
      if (work.authors?.[0]?.author?.key) {
        try {
          const authorRes = await axios.get(`https://openlibrary.org${work.authors[0].author.key}.json`);
          author = authorRes.data.name || "Unknown";
        } catch (e) {}
      }

      // หา ISBN & Cover
      isbn = edition?.isbn_13?.[0] || edition?.isbn_10?.[0] || `OL-${inputId}`;
      cover_image = "https://via.placeholder.com/150";
      if (work.covers?.[0]) coverImage = `https://covers.openlibrary.org/b/id/${work.covers[0]}-L.jpg`;
      else if (edition?.covers?.[0]) coverImage = `https://covers.openlibrary.org/b/id/${edition.covers[0]}-L.jpg`;

      // หา Category (Subject)
      category_name = work.subjects?.[0] || "General";
    } 
    
    // ----------------------------------------------------------------
    // กรณี B: Google Books ID (เช่น nFaQ2fVI1hwC)
    // ----------------------------------------------------------------
    else {
      const API_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";
      const googleRes = await axios.get(
        `https://www.googleapis.com/books/v1/volumes/${inputId}?key=${API_KEY}`
      );
      
      const info = googleRes.data.volumeInfo || {};
      
      title = info.title || "No Title";
      author = info.authors ? info.authors[0] : "Unknown";
      isbn = info.industryIdentifiers ? info.industryIdentifiers[0].identifier : "N/A";
      published_year = info.publishedDate ? info.publishedDate.substring(0, 4) : null;
      description = info.description || "No description available";
      cover_image = info.imageLinks?.thumbnail?.replace('http:', 'https:') || "https://via.placeholder.com/150";
      category_name = info.categories ? info.categories[0] : "General";
    }

    // ----------------------------------------------------------------
    // Common: บันทึกลง Database
    // ----------------------------------------------------------------
    
    // แปลง Category Name เป็น Category ID
    let category_id = 1; // Default General
    if (category_name) {
      // ลอง map keyword ง่ายๆ หรือใช้ชื่อตรงๆ
      let searchCat = category_name;
      if(category_name.toLowerCase().includes('fiction')) searchCat = 'Fiction';
      else if(category_name.toLowerCase().includes('computer')) searchCat = 'Technology';

      const catRes = await client.query(
        "SELECT category_id FROM categories WHERE name ILIKE $1",
        [`%${searchCat}%`]
      );
      if (catRes.rows.length > 0) category_id = catRes.rows[0].category_id;
    }

    const newBook = await client.query(
      `INSERT INTO books (title, author, isbn, published_year, category_id, cover_image, description, owner_id, status, google_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 'available', $8) RETURNING book_id`,
      [
        title,
        author,
        isbn,
        published_year,
        category_id,
        cover_image,
        description,
        inputId // ใช้ Google ID/OL ID ใส่ในช่อง google_id
      ]
    );

    console.log(`✅ Added new book to DB: ${title} (ID: ${newBook.rows[0].book_id})`);
    return newBook.rows[0].book_id;

  } catch (err) {
    console.error("🔥 Error processing book:", err.message);
    throw new Error("Cannot process this book data (Invalid ID or API Error).");
  }
};

// ✅ 1. Borrow Book
exports.borrowBook = async (req, res) => {
  const { book_id, hours } = req.body;
  const user_id = req.user.id || req.user.user_id;

  console.log("📥 Borrow request:", { book_id, hours, user_id });

  if (!book_id) return res.status(400).json("Book ID required");

  // ถ้าส่ง minutes มา (ค่าน้อยๆ) หรือ hours (ค่ามากๆ) ก็รองรับหมด
  const borrowHours = parseFloat(hours) || 168.0; 
  if (borrowHours <= 0) {
    return res.status(400).json("Invalid duration");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🔍 Processing book_id:", book_id);
    // แปลง Google ID -> Real Book ID (Integer)
    const realBookId = await getOrAddBookId(client, book_id);
    console.log("✅ Real book_id:", realBookId);

    // ตรวจสอบว่ายืมอยู่แล้วหรือไม่
    const existingLoan = await client.query(
      "SELECT * FROM loans WHERE book_id = $1 AND user_id = $2 AND status = 'active'",
      [realBookId, user_id]
    );

    if (existingLoan.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json("You already borrowed this book");
    }

    // ตรวจสอบสถานะหนังสือ
    const bookCheck = await client.query(
      "SELECT status, title FROM books WHERE book_id = $1",
      [realBookId]
    );

    if (bookCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json("Book not found after adding");
    }

    if (bookCheck.rows[0].status !== "available") {
      await client.query("ROLLBACK");
      return res.status(400).json("Book is currently borrowed by another user");
    }

    // ตรวจสอบ Borrow Limit
    const [activeLoans, userInfo] = await Promise.all([
      client.query(
        "SELECT COUNT(*) as count FROM loans WHERE user_id = $1 AND status = 'active'",
        [user_id]
      ),
      client.query("SELECT borrow_limit FROM users WHERE user_id = $1", [user_id]),
    ]);

    const borrowLimit = userInfo.rows[0]?.borrow_limit || 5;
    const currentCount = parseInt(activeLoans.rows[0].count);

    if (currentCount >= borrowLimit) {
      await client.query("ROLLBACK");
      return res.status(400).json(`You can only borrow ${borrowLimit} books at a time`);
    }

    // สร้าง Loan
    // คำนวณ Due Date (รองรับทศนิยม เช่น 0.083 ชั่วโมง = 5 นาที)
    const dueDate = new Date(Date.now() + borrowHours * 60 * 60 * 1000);
    
    const newLoan = await client.query(
      `INSERT INTO loans (book_id, user_id, loan_date, due_date, status) 
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'active') RETURNING *`,
      [realBookId, user_id, dueDate]
    );

    // อัปเดตสถานะหนังสือ
    await client.query("UPDATE books SET status = 'borrowed' WHERE book_id = $1", [realBookId]);

    await client.query("COMMIT");

    console.log(`✅ Book borrowed: ${bookCheck.rows[0].title} for ${borrowHours}h`);
    
    res.json({
      ...newLoan.rows[0],
      book_title: bookCheck.rows[0].title,
      hours: borrowHours,
      message: "Book borrowed successfully"
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Borrow Error:", err.message);
    res.status(500).json("Failed to borrow book: " + err.message);
  } finally {
    client.release();
  }
};

// ✅ 2. Return Book
exports.returnBook = async (req, res) => {
  const { book_id } = req.body;
  const user_id = req.user.id || req.user.user_id;

  if (!book_id) return res.status(400).json("Book ID required");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // แปลง ID ก่อนเสมอ (เผื่อส่ง Google ID มาคืน)
    const realBookId = !isNaN(book_id) ? book_id : (await client.query("SELECT book_id FROM books WHERE google_id = $1", [book_id])).rows[0]?.book_id;

    if (!realBookId) {
       await client.query("ROLLBACK");
       return res.status(404).json("Book not found in system");
    }

    // ค้นหา Active Loan
    const loan = await client.query(
      "SELECT * FROM loans WHERE book_id = $1 AND user_id = $2 AND status = 'active'",
      [realBookId, user_id]
    );

    if (loan.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json("Active loan not found");
    }

    // อัปเดต Loan เป็น Returned
    await client.query(
      "UPDATE loans SET status = 'returned', return_date = CURRENT_TIMESTAMP WHERE loan_id = $1",
      [loan.rows[0].loan_id]
    );

    // ตรวจสอบ Queue
    const { processNextInQueue } = require("./reservationController");
    const queueResult = await processNextInQueue(client, realBookId);

    await client.query("COMMIT");

    console.log(`✅ Book returned: book_id=${realBookId}`);

    res.json({
      message: "Book returned successfully",
      queueStatus: queueResult.hasQueue
        ? queueResult.autoBorrowed
          ? `Auto-borrowed by next user`
          : `Ready for next user`
        : "Book now available",
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Return Error:", err);
    res.status(500).json("Failed to return book: " + err.message);
  } finally {
    client.release();
  }
};

// ✅ 3. Get My Loans
exports.getMyLoans = async (req, res) => {
  const user_id = req.user.id || req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT l.*, b.title, b.cover_image, b.author, b.book_id, b.google_id
       FROM loans l 
       JOIN books b ON l.book_id = b.book_id 
       WHERE l.user_id = $1 
       ORDER BY l.loan_date DESC`,
      [user_id]
    );
    
    console.log(`📚 User ${user_id} has ${result.rows.length} loans`);
    res.json(result.rows);
    
  } catch (err) {
    console.error("❌ Get Loans Error:", err);
    res.status(500).json("Failed to get loans");
  }
};

// ✅ 4. Get Overdue Loans
exports.getOverdueLoans = async (req, res) => {
  const user_id = req.user.id || req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT l.*, b.title, b.cover_image, b.author 
       FROM loans l 
       JOIN books b ON l.book_id = b.book_id 
       WHERE l.user_id = $1 AND l.status = 'active' AND l.due_date < NOW()
       ORDER BY l.due_date ASC`,
      [user_id]
    );
    
    res.json(result.rows);
    
  } catch (err) {
    console.error("❌ Get Overdue Error:", err);
    res.status(500).json("Failed to get overdue loans");
  }
};

// ✅ 5. Auto Return (Cron Job)
exports.autoReturnExpiredLoans = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const expiredLoans = await client.query(
      `SELECT l.*, b.title FROM loans l 
       JOIN books b ON l.book_id = b.book_id 
       WHERE l.status = 'active' AND l.due_date < NOW()`
    );
    
    console.log(`📚 [AUTO-RETURN] Found ${expiredLoans.rows.length} expired loans`);
    
    for (const loan of expiredLoans.rows) {
      await client.query(
        "UPDATE loans SET status = 'returned', return_date = CURRENT_TIMESTAMP WHERE loan_id = $1",
        [loan.loan_id]
      );
      
      const { processNextInQueue } = require("./reservationController");
      await processNextInQueue(client, loan.book_id);
      
      console.log(`✅ [AUTO-RETURN] Returned: ${loan.title} (loan_id: ${loan.loan_id})`);
    }
    
    await client.query("COMMIT");
    
    if (res) {
      res.json({ 
        message: "Auto-return completed", 
        count: expiredLoans.rows.length 
      });
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ [AUTO-RETURN] Error:", err.message);
    if (res) res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};