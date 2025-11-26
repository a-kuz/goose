import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from '../api';
import { UserRole } from '../types';

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient();
    localStorage.clear();
    globalThis.fetch = vi.fn() as any;
  });

  describe('Token Management', () => {
    it('should set token in localStorage', () => {
      const token = 'test-token';
      apiClient.setToken(token);
      expect(localStorage.getItem('token')).toBe(token);
    });

    it('should clear token from localStorage', () => {
      apiClient.setToken('test-token');
      apiClient.clearToken();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should load token from localStorage on initialization', () => {
      localStorage.setItem('token', 'existing-token');
      const newClient = new ApiClient();
      expect(newClient).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        token: 'new-token',
        user: { id: '1', username: 'testuser', role: UserRole.SURVIVOR },
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.login('testuser');
      expect(result).toEqual(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'testuser' }),
        })
      );
    });

    it('should register successfully', async () => {
      const mockResponse = {
        token: 'new-token',
        user: { id: '1', username: 'newuser', role: UserRole.SURVIVOR },
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.register('newuser');
      expect(result).toEqual(mockResponse);
    });

    it('should get current user', async () => {
      const mockPayload = {
        userId: '1',
        username: 'testuser',
        role: UserRole.SURVIVOR,
      };

      apiClient.setToken('test-token');
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayload,
      });

      const result = await apiClient.getMe();
      expect(result).toEqual({
        id: '1',
        username: 'testuser',
        role: UserRole.SURVIVOR,
      });
    });

    it('should include authorization header when token is set', async () => {
      apiClient.setToken('test-token');
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ userId: '1', username: 'test', role: UserRole.SURVIVOR }),
      });

      await apiClient.getMe();

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });
  });

  describe('Rounds', () => {
    beforeEach(() => {
      apiClient.setToken('test-token');
    });

    it('should get all rounds', async () => {
      const mockRounds = [
        { id: '1', status: 'ACTIVE' },
        { id: '2', status: 'FINISHED' },
      ];

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRounds,
      });

      const result = await apiClient.getRounds();
      expect(result).toEqual(mockRounds);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rounds'),
        expect.any(Object)
      );
    });

    it('should get single round', async () => {
      const mockRound = { id: '1', status: 'ACTIVE' };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRound,
      });

      const result = await apiClient.getRound('1');
      expect(result).toEqual(mockRound);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rounds/1'),
        expect.any(Object)
      );
    });

    it('should create round', async () => {
      const mockRound = { id: '1', status: 'COOLDOWN' };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRound,
      });

      const result = await apiClient.createRound();
      expect(result).toEqual(mockRound);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rounds'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Tap', () => {
    it('should send tap request', async () => {
      apiClient.setToken('test-token');
      const mockResponse = { success: true };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const tapId = 'test-tap-id';
      const result = await apiClient.tap('round-1', tapId);
      expect(result).toEqual(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tap'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ roundId: 'round-1', tapId }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error on failed request', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(apiClient.login('test')).rejects.toThrow('Unauthorized');
    });

    it('should handle unknown errors', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('Parse error');
        },
      });

      await expect(apiClient.login('test')).rejects.toThrow('Unknown error');
    });
  });
});

