// server/socket.js
import { Server } from 'socket.io';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

const cookieName = process.env.JWT_COOKIE_NAME || 'token';

export function initSocket(httpServer, allowedOrigins) {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    path: '/socket.io',
  });

  // Engine-level connection errors (CORS/protocol/etc.)
  io.engine.on('connection_error', (err) => {
    console.warn('[io.engine] connection_error:', {
      code: err.code,
      message: err.message,
      context: err.context,
    });
  });

  // Auth handshake
  io.use(async (socket, next) => {
    try {
      const rawCookie = socket.request.headers.cookie || '';
      const cookies = cookie.parse(rawCookie);
      const tokenFromCookie = cookies[cookieName];
      const tokenFromAuth = socket.handshake.auth?.token;
      const token = tokenFromCookie || tokenFromAuth;

      
      if (!token) {
        return next(new Error('Authentication error: no token'));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (e) {
        if (e.name === 'TokenExpiredError') {
          return next(new Error('Authentication error: token_expired'));
        }
        return next(new Error('Authentication error: invalid_token'));
      }

      const user = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: user_inactive'));
      }

      socket.user = {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
      };

      return next();
    } catch (err) {
      console.error('[socket] unexpected auth error:', err);
      return next(new Error('Authentication error: unexpected'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (${socket.user.username})`);
    socket.join('inventory');

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} reason: ${reason}`);
    });
  });

  return io;
}
