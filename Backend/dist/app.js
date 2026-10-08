import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './src/routes/api.js';
import rateLimit from 'express-rate-limit';
import requestLogger from './src/middlewares/requestLogger.js';
dotenv.config();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
const app = express();
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, mobile apps)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        const error = new Error(`CORS: origin ${origin} not allowed`);
        error.statusCode = 403;
        callback(error);
    },
    credentials: true
}));
app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('trust proxy', 1);
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
app.use(requestLogger);
console.log('✅ Rate limiting configured');
async function bootstrap() {
    app.get('/health', (_req, res) => {
        res.status(200).json({ status: 'ok' });
    });
    app.use('/api', apiRouter);
    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: 'Route not found',
            path: req.originalUrl
        });
    });
    // Error handling middleware
    const errorHandler = (error, req, res, next) => {
        if (res.headersSent) {
            return next(error);
        }
        const err = error instanceof Error ? error : new Error(String(error));
        const statusCode = 'statusCode' in err && typeof err.statusCode === 'number'
            ? err.statusCode
            : 'status' in err && typeof err.status === 'number'
                ? err.status
                : 500;
        console.error('Error:', err);
        res.status(statusCode).json({
            success: false,
            message: err.message || 'Internal Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    };
    app.use(errorHandler);
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        // console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
    });
}
bootstrap().catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
});
