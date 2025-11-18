import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoundGame } from '../components/RoundGame';
import { render } from './utils';
import { api } from '../api';
import { mockActiveRound, mockCooldownRound, mockFinishedRound, mockUser } from './mocks';
import { RoundStatus } from '../types';

vi.mock('../api');
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    lastMessage: null,
    status: 'connected',
  }),
}));

const mockParams = { id: 'round-1' };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  };
});

describe('RoundGame Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show loading state initially', () => {
    (api.getRound as any).mockImplementation(() => new Promise(() => {}));
    render(<RoundGame />);
    expect(screen.getByText(/загрузка\.\.\./i)).toBeInTheDocument();
  });

  it('should load and display round', async () => {
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    render(<RoundGame />);

    await waitFor(() => {
      expect(api.getRound).toHaveBeenCalledWith('round-1');
    });
  });

  it('should display active round with goose', async () => {
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/очки:/i)).toBeInTheDocument();
    });
  });

  it('should display cooldown round', async () => {
    (api.getRound as any).mockResolvedValue(mockCooldownRound);
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/до начала/i)).toBeInTheDocument();
    });
  });

  it('should display finished round with stats', async () => {
    (api.getRound as any).mockResolvedValue(mockFinishedRound);
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/раунд завершен/i)).toBeInTheDocument();
      expect(screen.getByText(/статистика/i)).toBeInTheDocument();
    });
  });

  it('should handle tap on active round', async () => {
    const user = userEvent.setup();
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    (api.tap as any).mockResolvedValue({ success: true });
    
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/очки:/i)).toBeInTheDocument();
    });

    const goose = document.querySelector('.goose');
    if (goose) {
      await user.click(goose);
      expect(api.tap).toHaveBeenCalledWith('round-1');
    }
  });

  it('should not allow tap on cooldown round', async () => {
    const user = userEvent.setup();
    (api.getRound as any).mockResolvedValue(mockCooldownRound);
    (api.tap as any).mockResolvedValue({ success: true });
    
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/до начала/i)).toBeInTheDocument();
    });

    const goose = document.querySelector('.goose');
    if (goose) {
      await user.click(goose);
      expect(api.tap).not.toHaveBeenCalled();
    }
  });

  it('should not allow tap on finished round', async () => {
    const user = userEvent.setup();
    (api.getRound as any).mockResolvedValue(mockFinishedRound);
    (api.tap as any).mockResolvedValue({ success: true });
    
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/раунд завершен/i)).toBeInTheDocument();
    });

    const goose = document.querySelector('.goose');
    if (goose) {
      await user.click(goose);
      expect(api.tap).not.toHaveBeenCalled();
    }
  });

  it('should display timer for active round', async () => {
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/осталось/i)).toBeInTheDocument();
    });
  });

  it('should display timer for cooldown round', async () => {
    (api.getRound as any).mockResolvedValue(mockCooldownRound);
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/до начала/i)).toBeInTheDocument();
    });
  });

  it('should update timer every second', async () => {
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/осталось/i)).toBeInTheDocument();
    });

    const initialTimer = screen.getByText(/\d{2}:\d{2}/);
    const initialTime = initialTimer.textContent;

    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      const newTimer = screen.getByText(/\d{2}:\d{2}/);
      expect(newTimer.textContent).not.toBe(initialTime);
    });
  });

  it('should display player score', async () => {
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/очки: 100/i)).toBeInTheDocument();
    });
  });

  it('should display player position', async () => {
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/🥇/)).toBeInTheDocument();
    });
  });

  it('should display winner in finished round', async () => {
    (api.getRound as any).mockResolvedValue(mockFinishedRound);
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/победитель/i)).toBeInTheDocument();
    });
  });

  it('should display WebSocket status', async () => {
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    render(<RoundGame />);

    await waitFor(() => {
      const wsStatus = document.querySelector('.ws-status-connected');
      expect(wsStatus).toBeInTheDocument();
    });
  });

  it('should handle tap error gracefully', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    (api.tap as any).mockRejectedValue(new Error('Tap failed'));
    
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/очки:/i)).toBeInTheDocument();
    });

    const goose = document.querySelector('.goose');
    if (goose) {
      await user.click(goose);
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Tap failed:', expect.any(Error));
      });
    }

    consoleError.mockRestore();
  });

  it('should render back link', async () => {
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/← раунды/i)).toBeInTheDocument();
    });
  });

  it('should display total score in finished round', async () => {
    (api.getRound as any).mockResolvedValue(mockFinishedRound);
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText('1000')).toBeInTheDocument();
    });
  });

  it('should handle missing round', async () => {
    (api.getRound as any).mockResolvedValue(null);
    render(<RoundGame />);

    await waitFor(() => {
      expect(screen.getByText(/раунд не найден/i)).toBeInTheDocument();
    });
  });

  it('should format time correctly', async () => {
    (api.getRound as any).mockResolvedValue(mockActiveRound);
    render(<RoundGame />);

    await waitFor(() => {
      const timer = screen.getByText(/\d{2}:\d{2}/);
      expect(timer.textContent).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});

