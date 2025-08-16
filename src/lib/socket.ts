// src/lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function backendURL() {
  const raw = import.meta.env.VITE_SOCKET_URL;
  if (!raw) throw new Error("VITE_SOCKET_URL is not defined");
  return raw.replace(/\/$/, "");
}


export function getSocket(): Socket {
  if (!socket) {
    socket = io(backendURL(), {
      // Keep defaults: polling first, then upgrade to websocket when possible.
      // This is more robust behind shared hosting/proxies until explicitly tuned.
      // transports: ["polling", "websocket"], // implicit default

      // If you use cookie-based auth, this must be true and server must allow credentials.
      withCredentials: true,

      // Let the app decide when to connect.
      autoConnect: false,

      // If your server uses a custom path, set it from env; else default "/socket.io"
      path: import.meta.env.VITE_SOCKET_PATH || "/socket.io",

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    // Light diagnostics
    socket.on("connect_error", (err) => {
      console.warn("[socket] connect_error:", err.message);
    });
    socket.on("disconnect", (reason) => {
      console.warn("[socket] disconnect:", reason);
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
