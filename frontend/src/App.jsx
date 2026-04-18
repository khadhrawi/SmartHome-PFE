import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppErrorBoundary from './components/AppErrorBoundary';
import Layout from './components/Layout';
import AuthEntry from './pages/AuthEntry';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import ResidentLogin from './pages/ResidentLogin';
import ResidentRegister from './pages/ResidentRegister';
import Home from './pages/Home';
import About from './pages/About';
import Dashboard from './pages/Dashboard';
import ResidentDashboard from './pages/ResidentDashboard';
import ResidentRestricted from './pages/ResidentRestricted';
import Scenarios from './pages/Scenarios';
import Rooms from './pages/Rooms';
import Devices from './pages/Devices';
import Profile from './pages/Profile';
import Security from './pages/Security';
import Energy from './pages/Energy';
import AdminRequests from './pages/AdminRequests';
import UserManagement from './pages/UserManagement';

// Protection Wrapper
const PrivateRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user ? <Layout>{children}</Layout> : <Navigate to="/auth/choose" />;
};

const RoleRoute = ({ allow, children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/auth/choose" />;
  return allow.includes(user.role) ? <Layout>{children}</Layout> : <Navigate to="/dashboard" />;
};

const FeatureRoute = ({ children, residentFallback }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/auth/choose" />;
  if (user.role === 'admin') return <Layout>{children}</Layout>;
  return <Layout>{residentFallback}</Layout>;
};

// Route blocking authenticated users from login/register
const PublicRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return !user ? children : <Navigate to="/dashboard" />;
};

const DashboardByRole = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/auth/choose" />;
  return <Layout>{user.role === 'admin' ? <Dashboard /> : <ResidentDashboard />}</Layout>;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PublicRoute><Home /></PublicRoute>
        } />
        <Route path="/about" element={
          <PublicRoute><About /></PublicRoute>
        } />

        {/* Public Routes */}
        <Route path="/auth/choose" element={<PublicRoute><AuthEntry /></PublicRoute>} />
        <Route path="/auth/admin/login" element={<PublicRoute><AdminLogin /></PublicRoute>} />
        <Route path="/auth/admin/register" element={<PublicRoute><AdminRegister /></PublicRoute>} />
        <Route path="/auth/resident/login" element={<PublicRoute><ResidentLogin /></PublicRoute>} />
        <Route path="/auth/resident/register" element={<PublicRoute><ResidentRegister /></PublicRoute>} />

        {/* Private Routes with Layout Wrapper */}
        <Route path="/dashboard" element={<DashboardByRole />} />
        <Route path="/rooms" element={<FeatureRoute residentFallback={<ResidentRestricted title="Room Access" description="House Residents can only control their assigned room." actionKey="rooms:other" actionLabel="Access Other Rooms" />}><Rooms /></FeatureRoute>} />
        <Route path="/devices" element={<FeatureRoute residentFallback={<ResidentRestricted title="Global Device Controls" description="Global device controls are protected for resident accounts." actionKey="global:controls" actionLabel="Use Global Device Controls" />}><Devices /></FeatureRoute>} />
        <Route path="/scenarios" element={<RoleRoute allow={['admin']}><Scenarios /></RoleRoute>} />
        <Route path="/security" element={<RoleRoute allow={['admin', 'resident']}><Security /></RoleRoute>} />
        <Route path="/energy" element={<RoleRoute allow={['admin']}><Energy /></RoleRoute>} />
        <Route path="/permissions" element={<RoleRoute allow={['admin']}><AdminRequests /></RoleRoute>} />
        <Route path="/users" element={<RoleRoute allow={['admin']}><UserManagement /></RoleRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

        {/* Catch All */}
        <Route path="*" element={<Navigate to="/auth/choose" />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Router>
        <div className="min-h-screen text-zinc-100 font-sans antialiased overflow-x-hidden selection:bg-amber-500/20" style={{ background: 'transparent' }}>
          <AppErrorBoundary>
            <AnimatedRoutes />
          </AppErrorBoundary>
        </div>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
