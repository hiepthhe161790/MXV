import io, { Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const useWebSocket = () => {
  const connect = (token: string) => {
    if (socket?.connected) return socket;

    socket = io(WS_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    return socket;
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  };

  const subscribe = (channel: string) => {
    if (socket) {
      socket.emit('subscribe', { channel });
    }
  };

  const unsubscribe = (channel: string) => {
    if (socket) {
      socket.emit('unsubscribe', { channel });
    }
  };

  const on = (event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event: string) => {
    if (socket) {
      socket.off(event);
    }
  };

  return { connect, disconnect, subscribe, unsubscribe, on, off, socket };
};
