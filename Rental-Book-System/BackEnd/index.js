const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8888; // Render จะส่ง PORT มาให้เอง

// ✅ CORS Config: รวมเหลือชุดเดียวที่สมบูรณ์ที่สุด
const allowedOrigins = [
    'http://localhost:5173', // สำหรับ Local Dev
    process.env.FRONTEND_URL // ค่าจาก .env (เช่น https://rental-book-system.vercel.app)
];

const corsOptions = {
    origin: function (origin, callback) {
        // 1. อนุญาตถ้าไม่มี origin (เช่นยิงจาก Postman หรือ Server-to-Server ภายใน)
        if (!origin) return callback(null, true);

        // 2. อนุญาตถ้าตรงกับในรายการ allowedOrigins หรือ ลงท้ายด้วย .vercel.app (รองรับ Preview URL)
        // บรรทัดนี้จะช่วยแก้ปัญหา CORS Error ที่คุณเจอเมื่อกี้ครับ
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
            return callback(null, true);
        } else {
            // ถ้าไม่เข้าเงื่อนไขเลย ให้แจ้ง Error
            console.error(`❌ CORS Blocked: ${origin}`); // เพิ่ม Log ให้เห็นว่าใครโดนบล็อก
            return callback(new Error('CORS Policy: Not allowed by CORS'), false);
        }
    },
    credentials: true // อนุญาตให้ส่ง Cookie/Header
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/books', require('./routes/books'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/reviews', require('./routes/reviews'));

app.get('/', (req, res) => res.send('📚 ShelfShare API on Render is Running...'));

// ✅ Cron Job Management
cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ [CRON] Starting maintenance tasks...');
    
    // บน Render ถ้าใช้ Free Tier, Server จะหลับ (Spin down) ถ้าไม่มี Traffic
    // Cron นี้จะทำงานเฉพาะตอน Server ตื่นอยู่เท่านั้น
    
    try {
        // ใช้ Loopback IP เพื่อความชัวร์ในการเรียกหาตัวเอง
        const LOCAL_API = `http://127.0.0.1:${PORT}`; 

        // 1. Admin Login
        const loginResponse = await axios.post(`${LOCAL_API}/api/users/login`, {
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        });

        const token = loginResponse.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Execute Tasks (Parallel เพื่อความไว)
        await Promise.all([
            axios.post(`${LOCAL_API}/api/loans/auto-return`, {}, config)
                .then(res => console.log('✅ Auto-return:', res.data.message || 'Success')),
            axios.post(`${LOCAL_API}/api/reservations/process-expired`, {}, config)
                .then(res => console.log('✅ Process expired:', res.data.message || 'Success'))
        ]);

    } catch (error) {
        console.error('❌ [CRON] Failed:', error.message);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 CORS Allowed:`, allowedOrigins);
});