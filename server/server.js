//server\server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import http from 'http';

import connectDB from './config/database.js';
import { initSocket } from './socket.js';

// Load env
dotenv.config();

// Connect DB
connectDB();
const app = express();
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Logging dev
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(compression());

// Rate limiting
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300, 
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Allowed origins 
const buildAllowedOrigins = () => {
  const set = new Set();

  const envList =
    process.env.CLIENT_URLS ??
    process.env.CLIENT_URL ??
    '';

  envList
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(o => set.add(o));

  // Dev defaults local
  if (process.env.NODE_ENV !== 'production') {
    set.add('http://localhost:5173');
    set.add('http://127.0.0.1:5173');
  }

  if (process.env.NODE_ENV === 'production' && set.size === 0) {
    set.add('https://silver-jellyfish-497679.hostingersite.com');
  }

  return Array.from(set);
};

const allowedOrigins = buildAllowedOrigins();

// CORS 
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn('[CORS] Blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import inventoryRoutes from './routes/inventory.js';
import transactionRoutes from './routes/transactions.js';
import exportRoutes from './routes/export.js';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler (last)
app.use((err, req, res, next) => {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS: Origin not allowed',
    });
  }

  console.error('Global error handler:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
  });
});

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

export const io = initSocket(httpServer, allowedOrigins);

const server = httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  // Force exit if not closed in time
  setTimeout(() => {
    console.warn('Forcing shutdown.');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  shutdown('unhandledRejection');
});

export default app;
