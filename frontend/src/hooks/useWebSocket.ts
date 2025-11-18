import { useEffect, useRef, useState } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export function useWebSocket() {
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    shouldReconnectRef.current = true;

    const connect = () => {
      if (!shouldReconnectRef.current) return;

      setStatus('connecting');
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setStatus('disconnected');
        wsRef.current = null;

        if (shouldReconnectRef.current) {
          const delay = reconnectDelayRef.current;
          console.log(`Reconnecting in ${delay}ms...`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectDelayRef.current = Math.min(
              reconnectDelayRef.current * 2,
              MAX_RECONNECT_DELAY
            );
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return { lastMessage, status };
}

