import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoundsList } from '../components/RoundsList';
import { render } from './utils';
import { api } from '../api';
import { mockActiveRound, mockFinishedRound, mockUser, mockAdminUser } from './mocks';
import { UserRole } from '../types';

vi.mock('../api');
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  let currentUser = mockUser;
  return {
    ...actual,
    useAuth: () => ({
      user: currentUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    }),
    setMockUser: (user: any) => {
      currentUser = user;
    },
  };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RoundsList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getRounds as any).mockResolvedValue([]);
  });

  it('should show loading state initially', () => {
    (api.getRounds as any).mockImplementation(() => new Promise(() => {}));
    render(<RoundsList />);
    expect(screen.getByText(/загрузка\.\.\./i)).toBeInTheDocument();
  });

  it('should load and display rounds', async () => {
    (api.getRounds as any).mockResolvedValue([mockActiveRound]);
    render(<RoundsList />);

    await waitFor(() => {
      expect(screen.getByText(/раунд 1/i)).toBeInTheDocument();
    });
  });

  it('should display active rounds', async () => {
    (api.getRounds as any).mockResolvedValue([mockActiveRound]);
    render(<RoundsList />);

    await waitFor(() => {
      expect(screen.getByText(/активен/i)).toBeInTheDocument();
    });
  });

  it('should display finished rounds in table', async () => {
    (api.getRounds as any).mockResolvedValue([mockFinishedRound]);
    render(<RoundsList />);

    await waitFor(() => {
      expect(screen.getByText(/завершенные раунды/i)).toBeInTheDocument();
    });
  });

  it('should navigate to round on click', async () => {
    const user = userEvent.setup();
    (api.getRounds as any).mockResolvedValue([mockActiveRound]);
    render(<RoundsList />);

    await waitFor(() => {
      expect(screen.getByText(/раунд 1/i)).toBeInTheDocument();
    });

    const roundCard = screen.getByText(/раунд 1/i).closest('.round-card');
    if (roundCard) {
      await user.click(roundCard);
      expect(mockNavigate).toHaveBeenCalledWith('/round/round-1');
    }
  });

  it('should show create round button for admin', async () => {
    const { setMockUser } = await import('../context/AuthContext');
    (setMockUser as any)(mockAdminUser);
    (api.getRounds as any).mockResolvedValue([]);
    
    render(<RoundsList />);

    await waitFor(() => {
      expect(screen.getByText(/создать раунд/i)).toBeInTheDocument();
    });
  });

  it('should not show create round button for non-admin', async () => {
    (api.getRounds as any).mockResolvedValue([]);
    render(<RoundsList />);

    await waitFor(() => {
      expect(screen.queryByText(/создать раунд/i)).not.toBeInTheDocument();
    });
  });

  it('should create round when button clicked', async () => {
    const user = userEvent.setup();
    const { setMockUser } = await import('../context/AuthContext');
    (setMockUser as any)(mockAdminUser);
    (api.getRounds as any).mockResolvedValue([]);
    (api.createRound as any).mockResolvedValue(mockActiveRound);
    
    render(<RoundsList />);

    await waitFor(() => {
      expect(screen.getByText(/создать раунд/i)).toBeInTheDocument();
    });

    const button = screen.getByText(/создать раунд/i);
    await user.click(button);

    await waitFor(() => {
      expect(api.createRound).toHaveBeenCalled();
    });
  });

  it('should display round status correctly', async () => {
    (api.getRounds as any).mockResolvedValue([mockActiveRound]);
    render(<RoundsList />);

    await waitFor(() => {
      const statusElement = screen.getByText(/активен/i);
      expect(statusElement).toHaveClass('round-status', 'status-active');
    });
  });

  it('should format round period correctly', async () => {
    (api.getRounds as any).mockResolvedValue([mockActiveRound]);
    render(<RoundsList />);

    await waitFor(() => {
      const periodElement = screen.getByText(/—/);
      expect(periodElement).toBeInTheDocument();
    });
  });

  it('should display player stats in finished rounds', async () => {
    (api.getRounds as any).mockResolvedValue([mockFinishedRound]);
    render(<RoundsList />);

    await waitFor(() => {
      expect(screen.getByText('500')).toBeInTheDocument();
    });
  });

  it('should refresh rounds periodically', async () => {
    vi.useFakeTimers();
    (api.getRounds as any).mockResolvedValue([]);
    
    render(<RoundsList />);

    await waitFor(() => {
      expect(api.getRounds).toHaveBeenCalledTimes(1);
    });

    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(api.getRounds).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it('should handle error when loading rounds', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (api.getRounds as any).mockRejectedValue(new Error('Network error'));
    
    render(<RoundsList />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to load rounds:', expect.any(Error));
    });

    consoleError.mockRestore();
  });
});

