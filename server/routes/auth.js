//server/routes/auth.js
import express from 'express';
import { register, login, logout, getMe, checkAdmin, refreshToken } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validateUserRegistration, validateUserLogin } from '../middleware/validation.js';
import rateLimit from 'express-rate-limit';
import { loginLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
});

// Public routes
router.post('/register', authLimiter, validateUserRegistration, register);
router.post('/login', loginLimiter, validateUserLogin, login);
router.post('/refresh', refreshToken);
router.get('/check-admin', checkAdmin);

// Logout: make public so client can clear cookie even if token expired
router.post('/logout', logout);

// Protected routes
router.get('/me', protect, getMe);

export default router;