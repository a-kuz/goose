import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { api } from '../api';
import { mockUser } from './mocks';

vi.mock('../api', () => ({
  api: {
    setToken: vi.fn(),
    clearToken: vi.fn(),
    getMe: vi.fn(),
    login: vi.fn(),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });

  describe('AuthProvider', () => {
    it('should initialize with no user when no token exists', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('should load user from token on mount', async () => {
      localStorage.setItem('token', 'existing-token');
      (api.getMe as any).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(api.setToken).toHaveBeenCalledWith('existing-token');
      expect(result.current.user).toEqual(mockUser);
    });

    it('should clear token on failed user load', async () => {
      localStorage.setItem('token', 'invalid-token');
      (api.getMe as any).mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(api.clearToken).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });

    it('should login successfully', async () => {
      const loginResponse = {
        token: 'new-token',
        user: mockUser,
      };
      (api.login as any).mockResolvedValue(loginResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.login('testuser');

      await waitFor(() => {
        expect(api.setToken).toHaveBeenCalledWith('new-token');
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should logout successfully', async () => {
      localStorage.setItem('token', 'existing-token');
      (api.getMe as any).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      result.current.logout();

      await waitFor(() => {
        expect(api.clearToken).toHaveBeenCalled();
        expect(result.current.user).toBeNull();
      });
    });
  });
});

