import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoundGame } from '../components/RoundGame';
import { render } from './utils';
import { api } from '../api';
import { mockActiveRound, mockCooldownRound, mockFinishedRound } from './mocks';

vi.mock('../api');

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

});


