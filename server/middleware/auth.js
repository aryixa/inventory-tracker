//server\middleware\auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const cookieName = process.env.JWT_COOKIE_NAME || 'token';

export const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.[cookieName];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Please login again!',
        code: 'NO_TOKEN'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie(cookieName, '', {
          httpOnly: true,
          secure: isProd,
          sameSite: isProd ? 'none' : 'lax',
          path: '/',
          expires: new Date(0),
        });

        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Populate req.user from DB
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
        code: 'USER_INVALID'
      });
    }

    // Attach user (with role) for downstream checks
    req.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role // 'Admin' | 'User' | 'Viewer'
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Authentication server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Role-based access control
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized`,
        code: 'UNAUTHORIZED_ROLE'
      });
    }
    next();
  };
};
