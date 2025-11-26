import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeToken(token: string): User | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    console.log('🔓 Decoded token:', payload);
    
    return {
      id: payload.id,
      username: payload.username,
      role: payload.role,
    };
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        console.log('✅ User from token:', decoded);
        setUser(decoded);
      } else {
        api.clearToken();
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string) => {
    const response = await api.login(username);
    api.setToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

