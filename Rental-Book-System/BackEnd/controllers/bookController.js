// BackEnd/controllers/bookController.js
const pool = require('../config/db');
const axios = require('axios');

// ✅ Cache (เก็บข้อมูลไว้ 30 นาที จะได้ไม่ต้องยิง Google บ่อยๆ)
const cache = new Map();
const CACHE_DURATION = 30 * 60 * 1000;

// หมวดหมู่หน้าแรก (ดึงเฉพาะกลุ่มนี้มาโชว์ให้เป็นระเบียบ)
const CATEGORY_MAPPING = {
  'Fiction': 'subject:fiction',
  'Non-Fiction': 'subject:general', 
  'Technology': 'subject:computers',
  'Science': 'subject:science',
  'History': 'subject:history',
  'Business': 'subject:business',
  'Art & Design': 'subject:art',
  'Biography': 'subject:biography'
};

// 🧠 Helper: จัดหมวดหมู่เอง (ใช้ตอน Search)
const determineSmartCategory = (googleCategories) => {
    if (!googleCategories || googleCategories.length === 0) return 'Non-Fiction';
    const allCats = googleCategories.join(' ').toLowerCase();

    if (allCats.includes('fiction') || allCats.includes('fantasy') || allCats.includes('novel') || allCats.includes('thriller') || allCats.includes('manga')) return 'Fiction';
    if (allCats.includes('computer') || allCats.includes('technology') || allCats.includes('software') || allCats.includes('coding')) return 'Technology';
    if (allCats.includes('business') || allCats.includes('economics') || allCats.includes('marketing') || allCats.includes('investing')) return 'Business';
    if ((allCats.includes('science') && !allCats.includes('social')) || allCats.includes('physics') || allCats.includes('biology')) return 'Science';
    if (allCats.includes('history') || allCats.includes('war') || allCats.includes('ancient')) return 'History';
    if (allCats.includes('art') || allCats.includes('design') || allCats.includes('music')) return 'Art & Design';
    if (allCats.includes('biography') || allCats.includes('memoir')) return 'Biography';

    return 'Non-Fiction';
};

// ✅ Helper Cache
const getCache = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`✅ Cache HIT: ${key}`);
    return cached.data;
  }
  return null;
};
const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// ✅ Helper: รวมสถิติจาก DB
const enrichBooksWithStats = async (googleBooks) => {
  const client = await pool.connect();
  try {
    const ids = googleBooks.map(b => `'${b.google_id}'`).join(',');
    if (!ids) return googleBooks;

    const statsQuery = `
      SELECT 
        b.google_id, b.book_id,
        COALESCE(COUNT(DISTINCT l.loan_id), 0)::int as borrow_count,
        COALESCE(COUNT(DISTINCT r.reservation_id) FILTER (WHERE r.status = 'active'), 0)::int as queue_count,
        COALESCE(AVG(rv.rating), 0)::float as avg_rating,
        COALESCE(COUNT(DISTINCT rv.review_id), 0)::int as review_count
      FROM books b
      LEFT JOIN loans l ON b.book_id = l.book_id
      LEFT JOIN reservations r ON b.book_id = r.book_id
      LEFT JOIN reviews rv ON b.book_id = rv.book_id
      WHERE b.google_id IN (${ids})
      GROUP BY b.google_id, b.book_id
    `;
    
    const statsResult = await client.query(statsQuery);
    const statsMap = new Map();
    statsResult.rows.forEach(row => statsMap.set(row.google_id, row));

    return googleBooks.map(book => {
      const stats = statsMap.get(book.google_id) || {};
      return {
        ...book,
        book_id: stats.book_id || book.google_id, // ใช้ ID จาก DB ถ้ามี
        borrow_count: parseInt(stats.borrow_count || 0),
        queue_count: parseInt(stats.queue_count || 0),
        avg_rating: parseFloat(stats.avg_rating || 0).toFixed(1),
        review_count: parseInt(stats.review_count || 0)
      };
    });
  } catch (err) {
      console.error("Enrich stats error", err);
      return googleBooks; 
  } finally {
    client.release();
  }
};

// 🔥 MAIN FUNCTION: Search & Fetch
exports.searchGoogleBooks = async (req, res) => {
  const { query } = req.query;
  const API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';

  try {
    // =========================================================
    // 🔍 MODE 1: SEARCH (หาหนังสืออิสระ เจอเยอะๆ ไม่สนหมวดหน้าแรก)
    // =========================================================
    if (query && query.trim()) {
      const searchTerm = query.trim().toLowerCase();
      const cacheKey = `search:${searchTerm}`;
      const cachedResult = getCache(cacheKey);
      if (cachedResult) return res.json(cachedResult);

      console.log(`🔍 Searching: "${searchTerm}" (Deep Search)...`);

      // 🔥 ยิง 2 หน้าพร้อมกัน (80 เล่ม) เพื่อให้เจอหนังสือเยอะที่สุด
      const [res1, res2] = await Promise.allSettled([
        axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerm)}&startIndex=0&maxResults=40&printType=books&key=${API_KEY}`),
        axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerm)}&startIndex=40&maxResults=40&printType=books&key=${API_KEY}`)
      ]);

      let rawItems = [];
      if (res1.status === 'fulfilled') rawItems.push(...(res1.value.data.items || []));
      if (res2.status === 'fulfilled') rawItems.push(...(res2.value.data.items || []));

      // แปลงข้อมูล + Smart Category
      let items = rawItems.map(item => {
        const info = item.volumeInfo || {};
        const cat = determineSmartCategory(info.categories);
        return {
          google_id: item.id,
          id: item.id,
          title: info.title || "No Title",
          author: info.authors ? info.authors[0] : "Unknown",
          description: info.description || "",
          cover_image: info.imageLinks?.thumbnail?.replace('http:', 'https:') || "https://via.placeholder.com/150x220?text=No+Cover",
          published_year: info.publishedDate?.substring(0, 4) || null,
          category: cat,
          category_name: cat,
          status: 'available'
        };
      });

      // กรองซ้ำในผลการค้นหา
      const seen = new Set();
      items = items.filter(item => {
        if (seen.has(item.google_id)) return false;
        seen.add(item.google_id);
        return true;
      });

      if (items.length > 0) items = await enrichBooksWithStats(items);
      setCache(cacheKey, items);
      return res.json(items);
    } 

    // =========================================================
    // 🏠 MODE 2: HOMEPAGE (จัดระเบียบเป๊ะๆ ห้ามซ้ำข้ามหมวด)
    // =========================================================
    else {
      const cacheKey = 'default:books_strict_unique';
      const cachedResult = getCache(cacheKey);
      if (cachedResult) return res.json(cachedResult);

      console.log("🔄 Building Homepage (Strict Unique Mode)...");
      let allBooks = [];
      const globalSeenIds = new Set(); // ⭐️ ตัวแปรสำคัญ: เช็คซ้ำทั้งระบบ

      // วนลูปทีละหมวด (ตามลำดับความสำคัญ)
      for (const [catName, searchTerm] of Object.entries(CATEGORY_MAPPING)) {
          try {
              // ดึงมาเผื่อๆ 15 เล่ม (เราจะเอาแค่ 10 ที่ไม่ซ้ำ)
              const response = await axios.get(
                  `https://www.googleapis.com/books/v1/volumes?q=${searchTerm}&maxResults=20&langRestrict=en&printType=books&key=${API_KEY}`
              );
              
              const items = response.data.items || [];
              let addedCount = 0;

              for (const item of items) {
                  if (addedCount >= 10) break; // ครบ 10 เล่มต่อหมวดแล้วหยุด
                  
                  // ⭐️ ถ้าเล่มนี้เคยถูกใส่ไปในหมวดก่อนหน้าแล้ว (เช่น Tech) -> ข้ามเลย (จะไม่โผล่ใน Business อีก)
                  if (globalSeenIds.has(item.id)) continue; 

                  const info = item.volumeInfo || {};
                  
                  allBooks.push({
                      google_id: item.id,
                      id: item.id,
                      title: info.title || "No Title",
                      author: info.authors ? info.authors[0] : "Unknown",
                      description: info.description || "",
                      cover_image: info.imageLinks?.thumbnail?.replace('http:', 'https:') || "https://via.placeholder.com/150x220?text=No+Cover",
                      published_year: info.publishedDate?.substring(0, 4) || null,
                      
                      // ⭐️ บังคับหมวดหมู่ตามกล่องที่มันอยู่เลย (หน้าบ้านจะได้ไม่งง)
                      category: catName, 
                      category_name: catName,
                      status: 'available'
                  });

                  globalSeenIds.add(item.id); // จดไว้ว่าเล่มนี้มีที่อยู่แล้ว
                  addedCount++;
              }

          } catch (e) {
              console.error(`Failed to fetch ${catName}`, e.message);
          }
      }

      // สุ่มลำดับนิดหน่อยตอนแสดงผลรวม (แต่หมวดหมู่ยังถูกต้องตามที่เราแปะป้ายไว้)
      allBooks = await enrichBooksWithStats(allBooks);
      
      setCache(cacheKey, allBooks);
      res.json(allBooks);
    }

  } catch (err) {
    console.error("🔥 Error:", err.message);
    res.json([]);
  }
};

// 2. Add Book
exports.addBook = async (req, res) => {
  const { title, author, isbn, published_year, category_name, cover_image, description, google_id } = req.body;
  const owner_id = req.user ? (req.user.id || req.user.user_id) : 1; 
  
  try {
    const checkDup = await pool.query(
      "SELECT * FROM books WHERE isbn = $1 OR title = $2 OR google_id = $3", 
      [isbn, title, google_id]
    );
    
    if (checkDup.rows.length > 0) return res.json(checkDup.rows[0]);
    
    let category_id = 1; 
    if (category_name) {
      const catRes = await pool.query("SELECT category_id FROM categories WHERE name ILIKE $1", [category_name]);
      if (catRes.rows.length > 0) category_id = catRes.rows[0].category_id;
    }
    
    const newBook = await pool.query(
      `INSERT INTO books (title, author, isbn, published_year, category_id, cover_image, description, owner_id, status, google_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'available', $9) RETURNING *`,
      [title, author, isbn, published_year, category_id, cover_image, description, owner_id, google_id]
    );
    
    res.json(newBook.rows[0]);
  } catch (err) { res.status(500).send('Server Error: ' + err.message); }
};

// 3. Get All Books
exports.getAllBooks = async (req, res) => {
  try {
    const allBooks = await pool.query(`
      SELECT b.*, c.name as category_name,
        EXISTS (SELECT 1 FROM loans l WHERE l.book_id = b.book_id AND l.status = 'active') as is_borrowed,
        COALESCE((SELECT COUNT(*)::int FROM loans l WHERE l.book_id = b.book_id), 0) as borrow_count,
        COALESCE((SELECT COUNT(*)::int FROM reservations r WHERE r.book_id = b.book_id AND r.status = 'active'), 0) as queue_count,
        COALESCE((SELECT AVG(rating)::float FROM reviews rv WHERE rv.book_id = b.book_id), 0) as avg_rating,
        COALESCE((SELECT COUNT(*)::int FROM reviews rv WHERE rv.book_id = b.book_id), 0) as review_count
      FROM books b 
      LEFT JOIN categories c ON b.category_id = c.category_id 
      ORDER BY b.book_id DESC
    `);
    
    const booksWithStatus = allBooks.rows.map(book => ({
      ...book,
      id: book.book_id,
      status: book.is_borrowed ? 'borrowed' : 'available',
      category: book.category_name || "General",
      avg_rating: parseFloat(book.avg_rating || 0).toFixed(1),
      review_count: parseInt(book.review_count || 0),
      borrow_count: parseInt(book.borrow_count || 0),
      queue_count: parseInt(book.queue_count || 0)
    }));
    
    res.json(booksWithStatus);
  } catch (err) { res.status(500).send('Server Error'); }
};

// 4. Get Book By ID
exports.getBookById = async (req, res) => {
  const { id } = req.params;
  const API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';
  const client = await pool.connect();
  
  try {
    let bookData = null;
    let isGoogle = false;

    // 4.1 ลองค้นหาใน Database ก่อนเสมอ (ทั้งแบบ ID ปกติ และ Google ID)
    if (!isNaN(id)) {
      // กรณี ID เป็นตัวเลข
      const query = `
        SELECT b.*, c.name as category_name,
          EXISTS (SELECT 1 FROM loans l WHERE l.book_id = b.book_id AND l.status = 'active') as is_borrowed,
          (SELECT COUNT(*)::int FROM reservations r WHERE r.book_id = b.book_id AND r.status = 'active') as queue_count,
          (SELECT COUNT(*)::int FROM loans l WHERE l.book_id = b.book_id) as borrow_count,
          (SELECT COALESCE(AVG(rating), 0)::float FROM reviews r WHERE r.book_id = b.book_id) as avg_rating,
          (SELECT COUNT(*)::int FROM reviews r WHERE r.book_id = b.book_id) as review_count
        FROM books b 
        LEFT JOIN categories c ON b.category_id = c.category_id 
        WHERE b.book_id = $1
      `;
      const result = await client.query(query, [id]);
      if (result.rows.length > 0) bookData = result.rows[0];
    } else {
        // กรณี ID เป็น Google ID (String) -> ให้เช็คใน DB ด้วย google_id
        const query = `
        SELECT b.*, c.name as category_name,
          EXISTS (SELECT 1 FROM loans l WHERE l.book_id = b.book_id AND l.status = 'active') as is_borrowed,
          (SELECT COUNT(*)::int FROM reservations r WHERE r.book_id = b.book_id AND r.status = 'active') as queue_count,
          (SELECT COUNT(*)::int FROM loans l WHERE l.book_id = b.book_id) as borrow_count,
          (SELECT COALESCE(AVG(rating), 0)::float FROM reviews r WHERE r.book_id = b.book_id) as avg_rating,
          (SELECT COUNT(*)::int FROM reviews r WHERE r.book_id = b.book_id) as review_count
        FROM books b 
        LEFT JOIN categories c ON b.category_id = c.category_id 
        WHERE b.google_id = $1
      `;
      const result = await client.query(query, [id]);
      if (result.rows.length > 0) bookData = result.rows[0];
    }

    // 4.2 ถ้ายังไม่เจอใน DB ค่อยไปเช็ค Google API
    if (!bookData) {
      // ❌❌ Comment Out Cache check here to ensure fresh data ❌❌
      /*
      const cacheKey = `book:${id}`;
      const cachedBook = getCache(cacheKey);
      if (cachedBook) return res.json(cachedBook);
      */

      try {
        const googleRes = await axios.get(`https://www.googleapis.com/books/v1/volumes/${id}?key=${API_KEY}`);
        const item = googleRes.data;
        const info = item.volumeInfo || {};
        const isbn = info.industryIdentifiers ? info.industryIdentifiers[0].identifier : "N/A";
        
        // เช็คซ้ำอีกทีเผื่อ Race Condition
        const existing = await client.query(
          "SELECT book_id FROM books WHERE title = $1 OR isbn = $2 OR google_id = $3", 
          [info.title, isbn, id]
        );
        
        // ถ้าเจอใน DB แล้ว ให้เรียกตัวเองใหม่โดยใช้ ID จริง
        if (existing.rows.length > 0) {
            return exports.getBookById({ params: { id: existing.rows[0].book_id } }, res);
        }

        isGoogle = true;
        const finalCategory = determineSmartCategory(info.categories);

        bookData = {
          book_id: item.id,
          title: info.title || "No Title",
          author: info.authors ? info.authors[0] : "Unknown",
          isbn: isbn,
          description: info.description || "",
          cover_image: info.imageLinks?.thumbnail?.replace('http:', 'https:') || "https://via.placeholder.com/150",
          published_year: info.publishedDate ? info.publishedDate.substring(0, 4) : null,
          category_name: finalCategory,
          status: 'available',
          // สถิติเป็น 0 เพราะเพิ่งดึงจาก Google ครั้งแรก
          queue_count: 0, borrow_count: 0, avg_rating: 0, review_count: 0
        };
        
        // Cache ไว้ได้เฉพาะกรณี Google เพราะข้อมูลไม่ค่อยเปลี่ยน
        // แต่ถ้า User มีปฏิสัมพันธ์ (ยืม/รีวิว) มันจะลง DB และเข้าเงื่อนไขบนแทน
        // setCache(cacheKey, { ...bookData, is_google_book: isGoogle });
        
      } catch (e) { return res.status(404).json("Book not found"); }
    }
    
    res.json({ ...bookData, status: bookData.is_borrowed ? 'borrowed' : 'available', is_google_book: isGoogle });
    
  } catch (err) { res.status(500).send("Server Error"); } 
  finally { client.release(); }
};

// 5. Get Suggestions (Hybrid: Random + Auto-Complete)
exports.getSuggestions = async (req, res) => {
  const { query } = req.query; // รับคำที่ user พิมพ์มา (เช่น "har")

  try {
      // =========================================================
      // 🅰️ กรณีมีคำค้นหา (Auto-Complete Mode)
      // =========================================================
      if (query && query.trim()) {
          const searchTerm = query.trim().toLowerCase();
          const API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';
          
          // 1. เช็ค Cache ก่อน (พิมพ์คำเดิมจะได้ไม่ต้องโหลดใหม่)
          const cacheKey = `suggest:${searchTerm}`;
          const cachedResult = getCache(cacheKey);
          if (cachedResult) return res.json(cachedResult);

          // 2. ค้นใน Database เราก่อน (เร็วสุด + แม่นยำเรื่องสถานะ)
          const dbRes = await pool.query(
              `SELECT book_id, google_id, title, author, cover_image, category_id 
               FROM books 
               WHERE LOWER(title) LIKE $1 OR LOWER(author) LIKE $1 
               LIMIT 5`,
              [`%${searchTerm}%`]
          );

          // 3. ค้นใน Google Books API (ดึงมาน้อยๆ พอ แค่ 5-6 เล่ม เพื่อความไว)
          // ใช้ fields เพื่อดึงมาเฉพาะข้อมูลที่จำเป็น (ลดขนาดไฟล์)
          let googleBooks = [];
          try {
              const googleRes = await axios.get(
                  `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerm)}&maxResults=6&printType=books&fields=items(id,volumeInfo(title,authors,imageLinks))&key=${API_KEY}`
              );
              
              if (googleRes.data.items) {
                  googleBooks = googleRes.data.items.map(item => {
                      const info = item.volumeInfo || {};
                      return {
                          google_id: item.id,
                          id: item.id,
                          book_id: null, // ยังไม่มีใน DB
                          title: info.title || "No Title",
                          author: info.authors ? info.authors[0] : "Unknown",
                          cover_image: info.imageLinks?.thumbnail?.replace('http:', 'https:') || "https://via.placeholder.com/100x150?text=No+Cover",
                          source: 'google'
                      };
                  });
              }
          } catch (err) {
              console.warn("Google Suggest API Error (Skipping):", err.message);
          }

          // 4. รวมร่าง (DB มาก่อน Google) + ตัดตัวซ้ำ
          const combined = [...dbRes.rows, ...googleBooks];
          const uniqueSuggestions = [];
          const seenKeys = new Set();

          combined.forEach(book => {
              // สร้าง Key เช็คซ้ำ (ตัดช่องว่างและตัวอักษรพิเศษออกให้หมด เพื่อความแม่น)
              const cleanTitle = book.title.toLowerCase().replace(/[^a-z0-9]/g, "");
              const cleanAuthor = book.author ? book.author.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
              const key = `${cleanTitle}-${cleanAuthor}`;

              if (!seenKeys.has(key)) {
                  seenKeys.add(key);
                  // ปรับ Format ให้ Frontend ใช้ง่ายๆ
                  uniqueSuggestions.push({
                      id: book.book_id || book.google_id,
                      title: book.title,
                      author: book.author,
                      cover_image: book.cover_image,
                      is_local: !!book.book_id // บอก Frontend ว่าเล่มนี้มีในระบบแล้วนะ
                  });
              }
          });

          // ตัดให้เหลือแค่ 6-8 เล่มพอ (Dropdown จะได้ไม่ยาวเกิน)
          const finalResult = uniqueSuggestions.slice(0, 8);

          // เก็บ Cache ไว้ 5 นาทีพอ (Suggestions เปลี่ยนบ่อยได้)
          setCache(cacheKey, finalResult); 
          
          return res.json(finalResult);
      }

      // =========================================================
      // 🅱️ กรณีไม่มีคำค้นหา (Random Suggestions - ตอนกดกล่องเฉยๆ)
      // =========================================================
      else {
          const result = await pool.query(`
              SELECT b.book_id as id, b.title, b.author, b.cover_image, c.name as category_name
              FROM books b
              LEFT JOIN categories c ON b.category_id = c.category_id
              ORDER BY RANDOM() LIMIT 5
          `);
          
          return res.json(result.rows);
      }

  } catch (err) {
      console.error("Suggestion Error:", err.message);
      res.status(500).json([]); // ถ้า Error ให้คืน Array ว่าง จะได้ไม่พังหน้าบ้าน
  }
};