// src/contexts/SocketContext.tsx
import React, { createContext, useContext, useEffect, ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { getSocket, connectSocket, disconnectSocket } from "../lib/socket";

type SocketValue = Socket | null;
const SocketContext = createContext<SocketValue | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, token } = useAuth() as { user: any; token?: string };

  const socketValue: SocketValue = user ? getSocket() : null;

  useEffect(() => {
    if (user) {
      connectSocket(token ? { token } : undefined);

      const socket = getSocket();
      if (socket) {
        // Prevent multiple listeners
        socket.off("disconnect");
        socket.on("disconnect", reason => {
          if (reason !== "io client disconnect") {
            console.warn("[socket] disconnect:", reason);
          }
        });
      }

      // Cleanup when user logs out
      return () => {
        // Disable auto‑reconnect before disconnecting
        const s = getSocket();
        if (s) s.io.opts.autoConnect = false;
        disconnectSocket();
      };
    } else {
      // Already logged out: ensure no connect is attempted
      const s = getSocket();
      if (s) s.io.opts.autoConnect = false;
      try {
        disconnectSocket();
      } catch {
        /* ignore if not initialized */
      }
    }
  }, [user, token]);

  return (
    <SocketContext.Provider value={socketValue}>
      {children}
    </SocketContext.Provider>
  );
};
