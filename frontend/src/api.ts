import type { User, UserRole } from './types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

type AuthPayload = {
  userId: string;
  username: string;
  role: UserRole;
};

export class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async login(username: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  }

  async register(username: string) {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  }

  async getMe() {
    const payload = await this.request<AuthPayload>('/auth/me');
    const user: User = {
      id: payload.userId,
      username: payload.username,
      role: payload.role,
    };
    return user;
  }

  async getRounds() {
    return this.request<any[]>('/rounds');
  }

  async getRound(id: string) {
    return this.request<any>(`/rounds/${id}`);
  }

  async createRound() {
    return this.request<any>('/rounds', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async tap(roundId: string) {
    return this.request<any>('/tap', {
      method: 'POST',
      body: JSON.stringify({ roundId }),
    });
  }
}

export const api = new ApiClient();

