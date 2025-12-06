// BackEnd/index.js
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8888;

// CORS Config
const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
            return callback(null, true);
        } else {
            console.error(`❌ CORS Blocked: ${origin}`);
            return callback(new Error('CORS Policy: Not allowed by CORS'), false);
        }
    },
    credentials: true
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

app.get('/', (req, res) => res.send('📚 ShelfShare API is Running...'));

// ✅ Helper Function: สร้าง Mock Response เพื่อหลอก Controller ว่ามีคนเรียก
// เพื่อกัน Error เวลา Controller พยายามเรียก res.status().json()
const createMockRes = (taskName) => {
    return {
        status: (code) => ({
            json: (data) => console.log(`✅ [CRON - ${taskName}] Success:`, data.message || 'Completed'),
            send: (msg) => console.log(`✅ [CRON - ${taskName}] Sent:`, msg)
        }),
        json: (data) => console.log(`✅ [CRON - ${taskName}] Json:`, data.message || 'Completed')
    };
};

// 🔥 Cron Job: ทำงานทุก 15 นาที
cron.schedule('*/15 * * * *', async () => {
    console.log(`⏰ [CRON] Starting maintenance at ${new Date().toLocaleString('th-TH')}`);
    
    try {
        // Import Controllers (เรียกใหม่ทุกครั้งเพื่อความสดใหม่ของ Code)
        const loanController = require('./controllers/loanController');
        const reservationController = require('./controllers/reservationController');
        // const bookController = require('./controllers/bookController'); // เปิดใช้ถ้ามีฟังก์ชันนี้จริง

        // Execute Tasks (ส่ง req เป็น {} ว่างๆ และ res เป็น Mock Object)
        
        // 1. Auto-Return หนังสือที่หมดเวลา
        console.log('📖 [CRON] Task 1: Auto-Return Expired Loans...');
        await loanController.autoReturnExpiredLoans({}, createMockRes('Auto-Return'));
        
        // 2. Process Expired Reservations
        console.log('🎫 [CRON] Task 2: Process Expired Reservations...');
        // หมายเหตุ: ต้องแน่ใจว่า reservationController มีฟังก์ชันนี้จริงๆ
        if (reservationController.processExpiredReservations) {
            await reservationController.processExpiredReservations({}, createMockRes('Expire-Reservation'));
        } else {
            console.log('⚠️ [CRON] Task 2 Skipped: Function not found in controller');
        }
        
        // 3. Sync Book Statuses (ถ้ามีฟังก์ชันนี้)
        // console.log('🔄 [CRON] Task 3: Sync Book Statuses...');
        // await bookController.syncBookStatuses({}, createMockRes('Sync-Books'));

        console.log('✅ [CRON] All maintenance tasks completed\n');

    } catch (error) {
        console.error('❌ [CRON] Failed:', error.message);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 CORS Allowed:`, allowedOrigins);
    console.log(`⏰ Cron Job: Running every 15 minutes`);
});