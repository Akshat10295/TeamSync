import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

// Placeholder Pages
import AuthPage from './pages/Auth';
import DashboardPage from './pages/Dashboard';
import LandingPage from './pages/Landing';
import IdePage from './pages/IdePage';
import ResetPasswordPage from './pages/ResetPassword';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0c13]">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={<AuthPage session={session} />} 
        />
        <Route 
          path="/dashboard" 
          element={session ? <DashboardPage session={session} /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/reset-password" 
          element={<ResetPasswordPage />} 
        />
        <Route 
          path="/" 
          element={<LandingPage session={session} />} 
        />
        <Route
          path="/ide/:projectId"
          element={session ? <IdePage session={session} /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
