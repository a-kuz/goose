import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { api } from '../api';
import { mockUser, mockAdminUser } from './mocks';

vi.mock('../api');

describe('App Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (api.getRounds as any).mockResolvedValue([]);
  });

  it('should render app', () => {
    render(<App />);
    expect(document.querySelector('.app')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    localStorage.setItem('token', 'test-token');
    (api.getMe as any).mockImplementation(() => new Promise(() => {}));
    
    render(<App />);
    expect(screen.getByText(/загрузка\.\.\./i)).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/the last of guss/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/имя игрока/i)).toBeInTheDocument();
    });
  });

  it('should show header when authenticated', async () => {
    localStorage.setItem('token', 'test-token');
    (api.getMe as any).mockResolvedValue(mockUser);
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('The Last of Guss')).toBeInTheDocument();
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });
  });

  it('should not show header when not authenticated', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('TestUser')).not.toBeInTheDocument();
    });
  });

  it('should handle logout', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    (api.getMe as any).mockResolvedValue(mockUser);
    (api.clearToken as any).mockImplementation(() => {
      localStorage.removeItem('token');
    });
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: /выйти/i });
    await user.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/имя игрока/i)).toBeInTheDocument();
    });
  });

  it('should protect routes when not authenticated', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/имя игрока/i)).toBeInTheDocument();
    });
  });

  it('should allow access to protected routes when authenticated', async () => {
    localStorage.setItem('token', 'test-token');
    (api.getMe as any).mockResolvedValue(mockUser);
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('The Last of Guss')).toBeInTheDocument();
    });
  });

  it('should redirect to home from login when authenticated', async () => {
    localStorage.setItem('token', 'test-token');
    (api.getMe as any).mockResolvedValue(mockUser);
    
    window.history.pushState({}, '', '/login');
    
    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).not.toBe('/login');
    });
  });

  it('should display username in header', async () => {
    localStorage.setItem('token', 'test-token');
    (api.getMe as any).mockResolvedValue(mockUser);
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });
  });

  it('should handle authentication error', async () => {
    localStorage.setItem('token', 'invalid-token');
    (api.getMe as any).mockRejectedValue(new Error('Unauthorized'));
    (api.clearToken as any).mockImplementation(() => {
      localStorage.removeItem('token');
    });
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/имя игрока/i)).toBeInTheDocument();
    });
  });
});

