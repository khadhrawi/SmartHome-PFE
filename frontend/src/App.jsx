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
import AgencyLogin from './pages/AgencyLogin';
import AgencyRegister from './pages/AgencyRegister';
import AgencyDashboard from './pages/AgencyDashboard';
import ResidentLogin from './pages/ResidentLogin';
import ResidentRegister from './pages/ResidentRegister';
import UnitOnboarding from './pages/UnitOnboarding';
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

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Returns true if this user still needs to pick Join / Solo */
const userNeedsOnboarding = (user) =>
  !!user && user.role !== 'agency' && !user.houseCode;

// ── Protection Wrappers ────────────────────────────────────────────────────────

/** Blocks authenticated users from public auth pages */
const PublicRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return children;
  if (user.role === 'agency') return <Navigate to="/agency-dashboard" />;
  if (userNeedsOnboarding(user)) return <Navigate to="/onboarding" />;
  return <Navigate to="/dashboard" />;
};

/**
 * OnboardingGuard — wraps every private route.
 * If the user is logged in but has no houseCode, send them to /onboarding first.
 */
const OnboardingGuard = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/auth/choose" />;
  if (user.role === 'agency') return <Navigate to="/agency-dashboard" />;
  if (userNeedsOnboarding(user)) return <Navigate to="/onboarding" />;
  return children;
};

/** Requires login + passed onboarding, wraps with Layout */
const PrivateRoute = ({ children }) => (
  <OnboardingGuard>
    <Layout>{children}</Layout>
  </OnboardingGuard>
);

/**
 * RoleRoute — allows admin OR isSuperAdmin (solo-home owners get equivalent access).
 * The `allow` array should still be ['admin'], isSuperAdmin is grafted on top.
 */
const RoleRoute = ({ allow, children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/auth/choose" />;
  if (user.role === 'agency') return <Navigate to="/agency-dashboard" />;
  if (userNeedsOnboarding(user)) return <Navigate to="/onboarding" />;

  const isPermitted = allow.includes(user.role) || user.isSuperAdmin;
  return isPermitted
    ? <Layout>{children}</Layout>
    : <Navigate to="/dashboard" />;
};

/** Admin vs resident feature gating — isSuperAdmin always gets the admin view */
const FeatureRoute = ({ children, residentFallback }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/auth/choose" />;
  if (user.role === 'agency') return <Navigate to="/agency-dashboard" />;
  if (userNeedsOnboarding(user)) return <Navigate to="/onboarding" />;

  const showAdmin = user.role === 'admin' || user.isSuperAdmin;
  return <Layout>{showAdmin ? children : residentFallback}</Layout>;
};

/** Agency-only route */
const AgencyRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/auth/agency/login" />;
  if (user.role !== 'agency') return <Navigate to="/dashboard" />;
  return <Layout>{children}</Layout>;
};

/** Smart dashboard router by role */
const DashboardByRole = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/auth/choose" />;
  if (user.role === 'agency') return <Navigate to="/agency-dashboard" />;
  if (userNeedsOnboarding(user)) return <Navigate to="/onboarding" />;

  const showAdmin = user.role === 'admin' || user.isSuperAdmin;
  return <Layout>{showAdmin ? <Dashboard /> : <ResidentDashboard />}</Layout>;
};

/** The /onboarding route — fullscreen, no Layout */
const OnboardingRoute = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/auth/choose" />;
  if (user.role === 'agency') return <Navigate to="/agency-dashboard" />;
  if (!userNeedsOnboarding(user)) return <Navigate to="/dashboard" />;
  return <UnitOnboarding />;
};

// ── Animated Route Tree ────────────────────────────────────────────────────────
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Landing */}
        <Route path="/"      element={<PublicRoute><Home /></PublicRoute>} />
        <Route path="/about" element={<PublicRoute><About /></PublicRoute>} />

        {/* Auth — shared */}
        <Route path="/auth/choose" element={<PublicRoute><AuthEntry /></PublicRoute>} />

        {/* Auth — Admin */}
        <Route path="/auth/admin/login"    element={<PublicRoute><AdminLogin /></PublicRoute>} />
        <Route path="/auth/admin/register" element={<PublicRoute><AdminRegister /></PublicRoute>} />

        {/* Auth — Agency */}
        <Route path="/auth/agency/login"    element={<PublicRoute><AgencyLogin /></PublicRoute>} />
        <Route path="/auth/agency/register" element={<PublicRoute><AgencyRegister /></PublicRoute>} />

        {/* Auth — Resident */}
        <Route path="/auth/resident/login"    element={<PublicRoute><ResidentLogin /></PublicRoute>} />
        <Route path="/auth/resident/register" element={<PublicRoute><ResidentRegister /></PublicRoute>} />

        {/* ── Onboarding (no Layout — fullscreen) ── */}
        <Route path="/onboarding" element={<OnboardingRoute />} />

        {/* Agency-only */}
        <Route path="/agency-dashboard" element={<AgencyRoute><AgencyDashboard /></AgencyRoute>} />

        {/* Standard dashboard (admin / resident / isSuperAdmin) */}
        <Route path="/dashboard" element={<DashboardByRole />} />

        {/* Feature routes */}
        <Route path="/rooms" element={
          <FeatureRoute residentFallback={<ResidentRestricted title="Room Access" description="House Residents can only control their assigned room." actionKey="rooms:other" actionLabel="Access Other Rooms" />}>
            <Rooms />
          </FeatureRoute>
        } />
        <Route path="/devices" element={
          <FeatureRoute residentFallback={<ResidentRestricted title="Global Device Controls" description="Global device controls are protected for resident accounts." actionKey="global:controls" actionLabel="Use Global Device Controls" />}>
            <Devices />
          </FeatureRoute>
        } />
        <Route path="/scenarios"   element={<RoleRoute allow={['admin']}><Scenarios /></RoleRoute>} />
        <Route path="/security"    element={<RoleRoute allow={['admin', 'resident']}><Security /></RoleRoute>} />
        <Route path="/energy"      element={<RoleRoute allow={['admin']}><Energy /></RoleRoute>} />
        <Route path="/permissions" element={<RoleRoute allow={['admin']}><AdminRequests /></RoleRoute>} />
        <Route path="/users"       element={<RoleRoute allow={['admin']}><UserManagement /></RoleRoute>} />
        <Route path="/profile"     element={<PrivateRoute><Profile /></PrivateRoute>} />

        {/* Catch-all */}
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
          <div
            className="min-h-screen text-zinc-100 font-sans antialiased overflow-x-hidden selection:bg-amber-500/20"
            style={{ background: 'transparent' }}
          >
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
