import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { RoundsList } from './components/RoundsList';
import { RoundGame } from './components/RoundGame';
import './App.css';

function Header() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="header">
      <h1>The Last of Guss</h1>
      <div className="header-right">
        <span className="username">{user.username}</span>
        <button onClick={logout} className="btn btn-danger">
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
            <RoundsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/round/:id"
        element={
          <ProtectedRoute>
            <RoundGame />
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

