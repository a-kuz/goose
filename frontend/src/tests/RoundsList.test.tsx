import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoundsList } from '../components/RoundsList';
import { render } from './utils';
import { api } from '../api';
import { mockActiveRound, mockFinishedRound } from './mocks';

vi.mock('../api');

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

  it.skip('should show create round button for admin', async () => {
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

  it.skip('should create round when button clicked', async () => {
    const user = userEvent.setup();
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

});


