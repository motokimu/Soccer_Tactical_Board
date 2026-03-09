import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { Login } from './components/Login';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      const authDataStr = localStorage.getItem('soccerBoardAuth');
      if (!authDataStr) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const authData = JSON.parse(authDataStr);
        const isValid = Date.now() - authData.timestamp < SESSION_DURATION;
        if (!isValid) {
          localStorage.removeItem('soccerBoardAuth');
        }
        setIsAuthenticated(isValid);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [location.pathname]);

  if (isAuthenticated === null) return null; // Loading state

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={() => window.location.href = '/'} />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/editor/:id"
          element={
            <AuthGuard>
              <Editor />
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
