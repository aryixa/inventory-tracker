// src/contexts/SocketContext.tsx
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

let socket: Socket | null = null;

const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_BACKEND_URL, {
      withCredentials: true,
      autoConnect: false,
    });
    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error:', err.message);
    });
    socket.on('disconnect', (reason) => {
      console.warn('[socket] disconnect:', reason);
    });
  }
  return socket;
};

type SocketValue = Socket | null;
const SocketContext = createContext<SocketValue | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  // context is Socket | null here; null means "provider present, not connected yet"
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth();

  // Provide the singleton immediately when user is truthy, even before connect()
  const socketValue: SocketValue = user ? getSocket() : null;

  useEffect(() => {
    const s = user ? getSocket() : null;
    if (s) {
      s.connect();
      return () => {
        s.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        console.log('Socket disconnected (no user)');
      }
    }
  }, [user]);

  return <SocketContext.Provider value={socketValue}>{children}</SocketContext.Provider>;
};
