import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import { RoundsProvider } from './context/RoundsContext';
import { Login } from './components/Login';
import { RoundsList } from './components/RoundsList';
import { RoundGame } from './components/RoundGame';
import styles from './styles/Header.module.css';
import './styles/global.css';

function Header() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className={styles.header}>
      <h1>The Last of Guss</h1>
      <div className={styles.headerRight}>
        <span className={styles.username}>{user.username}</span>
        <button onClick={logout} className={`${styles.btn} ${styles.btnDanger}`}>
          Выйти
        </button>
      </div>
    </header>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function GameWrapper() {
  const { user } = useAuth();
  
  if (!user) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <GameProvider userId={user.id}>
      <RoundGame />
    </GameProvider>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoundsProvider>
              <RoundsList />
            </RoundsProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/round/:id"
        element={
          <ProtectedRoute>
            <GameWrapper />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app">
          <Header />
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
