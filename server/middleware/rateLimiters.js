import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 15,                  // 15 login attempts per username
  keyGenerator: (req) => {
    return req.body?.username?.toLowerCase() || req.ip;
  },
  message: {
    success: false,
    message: 'Too many login attempts. Please wait 15 minutes and try again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,                 // each *user account* gets 500 req / 15min
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  message: {
    success: false,
    message: 'Rate limit exceeded for this account. Try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});