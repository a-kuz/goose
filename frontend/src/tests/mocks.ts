import { vi } from 'vitest';
import { User, UserRole, Round, RoundStatus, PlayerStats } from '../types';

export const mockUser: User = {
  id: 'user-1',
  username: 'TestUser',
  role: UserRole.SURVIVOR,
};

export const mockAdminUser: User = {
  id: 'admin-1',
  username: 'AdminUser',
  role: UserRole.ADMIN,
};

export const mockPlayerStats: PlayerStats = {
  id: 'stats-1',
  userId: 'user-1',
  roundId: 'round-1',
  taps: 10,
  score: 100,
  user: mockUser,
};

export const mockActiveRound: Round = {
  id: 'round-1',
  startTime: new Date(Date.now() - 60000).toISOString(),
  endTime: new Date(Date.now() + 300000).toISOString(),
  cooldownEnd: new Date(Date.now() - 120000).toISOString(),
  status: RoundStatus.ACTIVE,
  totalScore: 500,
  playerStats: [mockPlayerStats],
  serverTime: new Date().toISOString(),
};

export const mockCooldownRound: Round = {
  id: 'round-2',
  startTime: new Date(Date.now() + 60000).toISOString(),
  endTime: new Date(Date.now() + 360000).toISOString(),
  cooldownEnd: new Date(Date.now() - 60000).toISOString(),
  status: RoundStatus.COOLDOWN,
  totalScore: 0,
  playerStats: [],
  serverTime: new Date().toISOString(),
};

export const mockFinishedRound: Round = {
  id: 'round-3',
  startTime: new Date(Date.now() - 360000).toISOString(),
  endTime: new Date(Date.now() - 60000).toISOString(),
  cooldownEnd: new Date(Date.now() - 420000).toISOString(),
  status: RoundStatus.FINISHED,
  totalScore: 1000,
  playerStats: [
    { ...mockPlayerStats, score: 500 },
    { ...mockPlayerStats, id: 'stats-2', userId: 'user-2', score: 300, user: { ...mockUser, id: 'user-2', username: 'User2' } },
  ],
  serverTime: new Date().toISOString(),
};

export const mockApiClient = {
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn(),
  getRounds: vi.fn(),
  getRound: vi.fn(),
  createRound: vi.fn(),
  tap: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
};

export const createMockWebSocket = () => {
  const listeners: { [key: string]: Function[] } = {};
  
  return {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn((event: string, handler: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeEventListener: vi.fn(),
    trigger: (event: string, data?: any) => {
      if (listeners[event]) {
        listeners[event].forEach(handler => handler(data));
      }
    },
    readyState: WebSocket.OPEN,
  };
};

