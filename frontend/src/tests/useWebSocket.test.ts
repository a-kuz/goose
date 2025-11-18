import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWebSocket } from '../hooks/useWebSocket';

describe('useWebSocket', () => {
  let mockWebSocket: any;
  let mockWebSocketInstances: any[] = [];

  beforeEach(() => {
    mockWebSocketInstances = [];
    
    class MockWebSocket {
      url: string;
      readyState = 1;
      onopen: any = null;
      onclose: any = null;
      onmessage: any = null;
      onerror: any = null;
      close = vi.fn();
      send = vi.fn();

      constructor(url: string) {
        this.url = url;
        mockWebSocketInstances.push(this);
        
        setTimeout(() => {
          if (this.onopen) {
            this.onopen({});
          }
        }, 0);
      }
    }

    globalThis.WebSocket = MockWebSocket as any;
  });

  it('should initialize with connecting status', () => {
    const { result } = renderHook(() => useWebSocket());
    expect(result.current.status).toBe('connecting');
  });

  it('should create WebSocket connection', () => {
    renderHook(() => useWebSocket());
    expect(mockWebSocketInstances.length).toBe(1);
  });

  it('should handle messages', async () => {
    const { result } = renderHook(() => useWebSocket());
    
    const instance = mockWebSocketInstances[0];
    const testMessage = { type: 'tap', roundId: 'test-round' };
    
    if (instance.onmessage) {
      instance.onmessage({ data: JSON.stringify(testMessage) });
    }

    await waitFor(() => {
      expect(result.current.lastMessage).toEqual(testMessage);
    });
  });

  it('should handle invalid JSON gracefully', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useWebSocket());
    
    const instance = mockWebSocketInstances[0];
    
    if (instance.onmessage) {
      instance.onmessage({ data: 'invalid json' });
    }

    expect(consoleError).toHaveBeenCalled();
    expect(result.current.lastMessage).toBeNull();
    
    consoleError.mockRestore();
  });

  it('should close connection on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket());
    
    const instance = mockWebSocketInstances[0];
    unmount();
    
    expect(instance.close).toHaveBeenCalled();
  });

  it('should handle errors', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderHook(() => useWebSocket());
    
    const instance = mockWebSocketInstances[0];
    
    if (instance.onerror) {
      instance.onerror(new Error('Connection error'));
    }

    expect(consoleError).toHaveBeenCalled();
    
    consoleError.mockRestore();
  });
});
