import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from '../components/Login';
import { render } from './utils';
import * as AuthContext from '../context/AuthContext';

const mockLogin = vi.fn();

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
    }),
  };
});

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form', () => {
    render(<Login />);

    expect(screen.getByText('The Last of Guss')).toBeInTheDocument();
    expect(screen.getByLabelText(/имя игрока/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
  });

  it('should handle username input', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const input = screen.getByLabelText(/имя игрока/i);
    await user.type(input, 'TestUser');

    expect(input).toHaveValue('TestUser');
  });

  it('should submit form with username', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);
    
    render(<Login />);

    const input = screen.getByLabelText(/имя игрока/i);
    const button = screen.getByRole('button', { name: /войти/i });

    await user.type(input, 'TestUser');
    await user.click(button);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('TestUser');
    });
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<Login />);

    const input = screen.getByLabelText(/имя игрока/i);
    const button = screen.getByRole('button', { name: /войти/i });

    await user.type(input, 'TestUser');
    await user.click(button);

    expect(screen.getByText(/вход\.\.\./i)).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('should display error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    
    render(<Login />);

    const input = screen.getByLabelText(/имя игрока/i);
    const button = screen.getByRole('button', { name: /войти/i });

    await user.type(input, 'TestUser');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('should clear error on new submission', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('Error 1'));
    
    render(<Login />);

    const input = screen.getByLabelText(/имя игрока/i);
    const button = screen.getByRole('button', { name: /войти/i });

    await user.type(input, 'TestUser');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Error 1')).toBeInTheDocument();
    });

    mockLogin.mockResolvedValue(undefined);
    await user.clear(input);
    await user.type(input, 'NewUser');
    await user.click(button);

    await waitFor(() => {
      expect(screen.queryByText('Error 1')).not.toBeInTheDocument();
    });
  });

  it('should require username input', () => {
    render(<Login />);
    const input = screen.getByLabelText(/имя игрока/i);
    expect(input).toBeRequired();
  });
});


