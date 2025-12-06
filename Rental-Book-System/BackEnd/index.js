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

// 🔥 Cron Job: ทำงานทุก 5 นาที
cron.schedule('*/5 * * * *', async () => {
    console.log(`⏰ [CRON] Starting maintenance at ${new Date().toLocaleString('th-TH')}`);
    
    try {
        // Import Controllers
        const loanController = require('./controllers/loanController');
        const reservationController = require('./controllers/reservationController');
        const bookController = require('./controllers/bookController');

        // Execute Tasks (Sequential เพื่อความปลอดภัย)
        
        // 1. Auto-Return หนังสือที่หมดเวลา
        console.log('📖 [CRON] Task 1: Auto-Return Expired Loans...');
        await loanController.autoReturnExpiredLoans(null, null);
        
        // 2. Process Expired Reservations
        console.log('🎫 [CRON] Task 2: Process Expired Reservations...');
        await reservationController.processExpiredReservations(null, null);
        
        // 3. Sync Book Statuses (ตรวจสอบสถานะหนังสือทั้งหมด)
        console.log('🔄 [CRON] Task 3: Sync Book Statuses...');
        await bookController.syncBookStatuses();

        console.log('✅ [CRON] All maintenance tasks completed\n');

    } catch (error) {
        console.error('❌ [CRON] Failed:', error.message);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 CORS Allowed:`, allowedOrigins);
    console.log(`⏰ Cron Job: Running every 5 minutes`);
    console.log(`   - Auto-Return Expired Loans`);
    console.log(`   - Process Expired Reservations`);
    console.log(`   - Sync Book Statuses\n`);
});