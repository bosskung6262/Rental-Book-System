const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// กรณี Dev ใช้ค่าแยก กรณี Prod (Render) จะใช้ DATABASE_URL ตัวเดียวจบ
const connectionString = isProduction 
    ? process.env.DATABASE_URL 
    : `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new Pool({
  connectionString,
  ssl: isProduction 
    ? { rejectUnauthorized: false } // Supabase/Render ต้องการสิ่งนี้เพื่อยอมรับ Self-signed cert
    : false
});

pool.on('connect', () => {
    if (!isProduction) console.log('✅ Connected to Database');
});

pool.on('error', (err) => {
    console.error('❌ Database Connection Error:', err);
    // ไม่ exit process เพื่อให้ Render พยายาม restart service เอง
});

module.exports = pool;