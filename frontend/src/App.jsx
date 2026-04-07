import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Scenarios from './pages/Scenarios';
import Rooms from './pages/Rooms';
import Devices from './pages/Devices';
import Profile from './pages/Profile';
import Security from './pages/Security';
import Energy from './pages/Energy';

// Protection Wrapper
const PrivateRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

// Route blocking authenticated users from login/register
const PublicRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return !user ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Router>
        <div className="min-h-screen text-zinc-100 font-sans antialiased overflow-x-hidden selection:bg-amber-500/20" style={{ background: 'transparent' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute><Login /></PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute><Register /></PublicRoute>
            } />
            
            {/* Private Routes with Layout Wrapper */}
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/rooms" element={<PrivateRoute><Rooms /></PrivateRoute>} />
            <Route path="/devices" element={<PrivateRoute><Devices /></PrivateRoute>} />
            <Route path="/scenarios" element={<PrivateRoute><Scenarios /></PrivateRoute>} />
            <Route path="/security" element={<PrivateRoute><Security /></PrivateRoute>} />
            <Route path="/energy" element={<PrivateRoute><Energy /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            
            {/* Catch All */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
