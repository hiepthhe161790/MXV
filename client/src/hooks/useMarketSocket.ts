import { useEffect, useState, useRef } from 'react';

export interface MarketPrice {
  price: number;
  change: number;
}

export const useMarketSocket = () => {
  const [prices, setPrices] = useState<Record<string, MarketPrice>>({});
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    // Convert HTTP(S) URL to WS(S) URL
    const wsUrl = (import.meta.env.VITE_WS_URL || 'http://localhost:3001').replace(/^http/, 'ws');

    const connect = () => {
      console.log('🔌 Connecting to Market WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Market WebSocket connected');
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'market:prices') {
            setPrices((prev) => ({
              ...prev,
              ...message.data,
            }));
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        console.log('❌ Market WebSocket disconnected');
        setIsConnected(false);
        // Attempt reconnection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      ws.onerror = (err) => {
        console.error('Market WebSocket error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        // Remove close listener to prevent reconnect on intentional unmount
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { prices, isConnected };
};
