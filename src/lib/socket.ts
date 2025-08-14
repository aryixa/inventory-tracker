//src\lib\socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_BACKEND_URL, {
      // If you use cookie-based auth, credentials must be sent
      withCredentials: true,
      // Prefer websockets in prod; socket.io will fall back if needed
      transports: ['websocket'],
      // Let us control connect timing (after we know auth/org)
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    // Optional: lightweight diagnostics (safe to keep in prod)
    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error:', err.message);
    });
    socket.on('disconnect', (reason) => {
      console.warn('[socket] disconnect:', reason);
    });
  }
  return socket;
}

// If you use header-based auth (JWT), pass it here; if cookie-based, omit.
export function connectSocket(opts?: { token?: string }) {
  const s = getSocket();
  s.auth = opts?.token ? { token: opts.token } : {};
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  const s = getSocket();
  if (s.connected) s.disconnect();
}
