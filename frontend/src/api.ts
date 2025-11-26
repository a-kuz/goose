import type { User, UserRole } from './types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

type AuthPayload = {
  id: string;
  username: string;
  role: UserRole;
};

export class ApiClient {
  setToken(token: string) {
    localStorage.setItem('token', token);
  }

  clearToken() {
    localStorage.removeItem('token');
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const url = `${API_URL}${endpoint}`;
    console.log('🌐 Fetch request:', { url, method: options.method || 'GET', hasAuth: !!token });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('📥 Fetch response:', { url, status: response.status, ok: response.ok });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Request failed:', { url, status: response.status, error });
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
    console.log('👤 getMe payload:', payload);
    const user: User = {
      id: payload.id,
      username: payload.username,
      role: payload.role,
    };
    console.log('👤 getMe user:', user);
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

  async tap(roundId: string, tapId: string) {
    console.log('🔑 api.tap called', { roundId, tapId });
    
    const token = this.getToken();
    console.log('🔑 Token check:', { hasToken: !!token, tokenLength: token?.length });
    
    if (!token) {
      console.error('❌ No token found when trying to tap!');
      throw new Error('Authentication required');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('⏱️ Request timeout after 5s');
      controller.abort();
    }, 5000);
    
    try {
      console.log('📤 Sending POST /tap request...');
      const result = await this.request<any>('/tap', {
        method: 'POST',
        body: JSON.stringify({ roundId, tapId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log('✅ api.tap response received:', result);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ api.tap error:', error);
      throw error;
    }
  }
}

export const api = new ApiClient();

