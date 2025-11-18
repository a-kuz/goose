import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import App from '../App';
import { api } from '../api';
import { mockUser, mockActiveRound, mockFinishedRound } from './mocks';
import { UserRole } from '../types';

vi.mock('../api');
vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    lastMessage: null,
    status: 'connected',
  }),
}));

describe('Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should complete full login flow', async () => {
    const user = userEvent.setup();
    const loginResponse = {
      token: 'new-token',
      user: mockUser,
    };

    (api.login as any).mockResolvedValue(loginResponse);
    (api.getRounds as any).mockResolvedValue([]);
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/имя игрока/i)).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/имя игрока/i);
    const button = screen.getByRole('button', { name: /войти/i });

    await user.type(input, 'TestUser');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });
  });

  it('should navigate through rounds flow', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    (api.getMe as any).mockResolvedValue(mockUser);
    (api.getRounds as any).mockResolvedValue([mockActiveRound, mockFinishedRound]);
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/раунд 1/i)).toBeInTheDocument();
    });

    const roundCard = screen.getByText(/раунд 1/i).closest('.round-card');
    if (roundCard) {
      await user.click(roundCard);
    }

    await waitFor(() => {
      expect(screen.getByText(/очки:/i)).toBeInTheDocument();
    });
  });

  it('should handle tap and update score', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    (api.getMe as any).mockResolvedValue(mockUser);
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    (api.tap as any).mockResolvedValue({ success: true });
    
    const updatedRound = {
      ...mockActiveRound,
      playerStats: [{
        ...mockActiveRound.playerStats![0],
        score: 110,
      }],
    };
    (api.getRound as any).mockResolvedValueOnce(mockActiveRound).mockResolvedValueOnce(updatedRound);

    window.history.pushState({}, '', '/round/round-1');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/очки: 100/i)).toBeInTheDocument();
    });

    const goose = document.querySelector('.goose');
    if (goose) {
      await user.click(goose);
    }

    await waitFor(() => {
      expect(api.tap).toHaveBeenCalledWith('round-1');
    });
  });

  it('should handle logout and redirect to login', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    (api.getMe as any).mockResolvedValue(mockUser);
    (api.getRounds as any).mockResolvedValue([]);
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

  it('should show create round button for admin', async () => {
    const adminUser = { ...mockUser, role: UserRole.ADMIN };
    localStorage.setItem('token', 'admin-token');
    (api.getMe as any).mockResolvedValue(adminUser);
    (api.getRounds as any).mockResolvedValue([]);
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/создать раунд/i)).toBeInTheDocument();
    });
  });

  it('should create round and display it', async () => {
    const user = userEvent.setup();
    const adminUser = { ...mockUser, role: UserRole.ADMIN };
    localStorage.setItem('token', 'admin-token');
    (api.getMe as any).mockResolvedValue(adminUser);
    (api.getRounds as any).mockResolvedValueOnce([]).mockResolvedValueOnce([mockActiveRound]);
    (api.createRound as any).mockResolvedValue(mockActiveRound);
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/создать раунд/i)).toBeInTheDocument();
    });

    const createButton = screen.getByText(/создать раунд/i);
    await user.click(createButton);

    await waitFor(() => {
      expect(api.createRound).toHaveBeenCalled();
    });
  });

  it('should display finished rounds table', async () => {
    localStorage.setItem('token', 'test-token');
    (api.getMe as any).mockResolvedValue(mockUser);
    (api.getRounds as any).mockResolvedValue([mockFinishedRound]);
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/завершенные раунды/i)).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('token', 'test-token');
    (api.getMe as any).mockRejectedValue(new Error('Network error'));
    (api.clearToken as any).mockImplementation(() => {
      localStorage.removeItem('token');
    });
    
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/имя игрока/i)).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it('should persist authentication across page reloads', async () => {
    localStorage.setItem('token', 'test-token');
    (api.getMe as any).mockResolvedValue(mockUser);
    (api.getRounds as any).mockResolvedValue([]);
    
    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    unmount();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });
  });
});

