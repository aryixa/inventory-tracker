// server/controllers/authController.js
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';

const cookieName = process.env.JWT_COOKIE_NAME || 'token';

// Generate JWT (id only; role is loaded from DB in protect)
const generateToken = (id) => {
  // Use a sane default if env is too small for dev (e.g., "30s")
  const expiresIn = process.env.JWT_EXPIRE || '15m';
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

// Prefer maxAge to avoid clock drift; accept either env var name
const getCookieMaxAgeMs = () => {
  const v =
    process.env.JWT_COOKIE_EXPIRE_MS ??
    process.env.JWT_COOKIE_MAX_AGE_MS; // fallback to your previous name if present
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 60 * 60 * 1000; // default 1h
};

const buildCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    maxAge: getCookieMaxAgeMs(),
    httpOnly: true,
    secure: isProd,                    // secure cookies in production
    sameSite: isProd ? 'none' : 'lax', // dev: lax is fine for localhost:5173 -> 5000
    // path, domain defaults are fine for localhost
  };
};

const setTokenCookie = (res, token) => {
  const options = buildCookieOptions();
  res.cookie(cookieName, token, options);
};

// @desc      Register a new user or the first admin
// @route     POST /api/auth/register
// @access    Public (only for the very first Admin)
const register = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const adminCount = await User.countDocuments({ role: 'Admin' });
  if (adminCount > 0) {
    return res.status(403).json({
      success: false,
      message: 'Registration is disabled. Ask the Admin to create your account.',
      code: 'REGISTRATION_DISABLED'
    });
  }

  const userExists = await User.findOne({ username });
  if (userExists) {
    return res.status(400).json({ success: false, message: 'User already exists' });
  }

  const user = await User.create({
    username,
    password,
    role: 'Admin',
  });

  if (user) {
    return res.status(201).json({
      success: true,
      message: 'First admin created. Please log in.',
    });
  }

  res.status(400).json({ success: false, message: 'Invalid user data' });
});

// @desc      Check if an admin account exists
// @route     GET /api/auth/check-admin
// @access    Public
const checkAdmin = asyncHandler(async (req, res) => {
  const adminCount = await User.countDocuments({ role: 'Admin' });
  const hasAdmin = adminCount > 0;
  res.status(200).json({ success: true, data: { hasAdmin } });
});

// @desc      Login user
// @route     POST /api/auth/login
// @access    Public
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select('+password');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Account is deactivated' });
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = generateToken(user._id);
  setTokenCookie(res, token);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
    }
  });
});

// @desc      Logout user (unprotected to ensure cookie can be cleared even if token expired)
// @route     POST /api/auth/logout
// @access    Public
const logout = asyncHandler(async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const options = {
    maxAge: 0,
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  };
  res.cookie(cookieName, '', options);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// @desc      Get user data
// @route     GET /api/auth/me
// @access    Protected
const getMe = asyncHandler(async (req, res) => {
  if (req.user) {
    return res.status(200).json({
      success: true,
      data: {
        id: req.user.id || req.user._id,
        username: req.user.username,
        role: req.user.role,
      }
    });
  }
  res.status(404).json({ success: false, message: 'User not found' });
});

// @desc      Refresh token (placeholder)
const refreshToken = asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, message: 'Refresh token functionality not implemented' });
});

export { register, login, logout, getMe, checkAdmin, refreshToken };
