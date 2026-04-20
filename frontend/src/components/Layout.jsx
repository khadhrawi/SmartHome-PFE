import React, { useState, useContext, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Layers, Grid, Zap, User, LogOut, Bell, Shield, Mail, PanelTopClose, PanelTopOpen } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PermissionNotificationCenter from './PermissionNotificationCenter';
import SupportModal from './SupportModal';

/* ── Module-level constants (never re-created on render) ── */
const NAV_MOOD_STYLES = {
  default: {
    headerBg: 'rgba(10,7,3,0.52)',
    headerBorder: 'rgba(227,197,152,0.10)',
    iconTint: 'rgba(248,249,250,0.65)',
    actionBg: 'rgba(255,255,255,0.05)',
    actionBorder: 'rgba(255,255,255,0.09)',
  },
  Cinematic: {
    headerBg: 'rgba(8,10,24,0.72)',
    headerBorder: 'rgba(140,150,220,0.32)',
    iconTint: 'rgba(220,230,255,0.80)',
    actionBg: 'rgba(83,97,180,0.14)',
    actionBorder: 'rgba(132,145,230,0.32)',
  },
  Dinner: {
    headerBg: 'rgba(34,18,6,0.72)',
    headerBorder: 'rgba(255,175,86,0.32)',
    iconTint: 'rgba(255,232,205,0.88)',
    actionBg: 'rgba(255,165,70,0.13)',
    actionBorder: 'rgba(255,175,86,0.30)',
  },
  Morning: {
    headerBg: 'rgba(236,246,255,0.78)',
    headerBorder: 'rgba(154,195,230,0.42)',
    iconTint: 'rgba(19,31,50,0.78)',
    actionBg: 'rgba(255,255,255,0.72)',
    actionBorder: 'rgba(170,198,228,0.40)',
  },
  Sleep: {
    headerBg: 'rgba(10,14,35,0.74)',
    headerBorder: 'rgba(115,121,215,0.34)',
    iconTint: 'rgba(216,227,255,0.84)',
    actionBg: 'rgba(106,118,220,0.14)',
    actionBorder: 'rgba(115,121,215,0.32)',
  },
};

/* ── NavIconLink: top-level component (NOT nested inside Layout) ──
   Defined here so React keeps a stable component identity across renders.
   Previously it was defined inside Layout's body which violated Rules of Hooks. */
const NavIconLink = ({ name, path, Icon, moodTheme }) => {
  const location = useLocation();
  const active = location.pathname.startsWith(path);

  return (
    <NavLink
      to={path}
      className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 hover:scale-110"
      style={
        active
          ? {
              background: 'linear-gradient(135deg,#E3C598,#D4AF37)',
              boxShadow: '0 0 22px rgba(227,197,152,0.42)',
            }
          : {
              background: moodTheme.actionBg,
              border: `1px solid ${moodTheme.actionBorder}`,
            }
      }
    >
      <Icon
        size={18}
        strokeWidth={active ? 2.5 : 2}
        style={{ color: active ? '#1a1008' : moodTheme.iconTint }}
      />
      <span
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-0 transition-all duration-200 group-hover:opacity-100"
        style={{
          background: 'rgba(8,16,13,0.92)',
          border: '1px solid rgba(227,197,152,0.25)',
          color: '#E3C598',
          backdropFilter: 'blur(10px)',
        }}
      >
        {name}
      </span>
    </NavLink>
  );
};

/* ── Layout ── */
const Layout = ({ children }) => {
  const { user, logout, getUnreadPermissionCount } = useContext(AuthContext);
  const [compactNav, setCompactNav] = useState(false);
  const [navMood, setNavMood] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const navigate = useNavigate();
  const unreadPermissionCount = getUnreadPermissionCount();

  const handleLogout = () => { logout(); navigate('/auth/choose'); };
  const handleContact = () => setSupportOpen(true);

  const adminNavItems = [
    { name: 'Dashboard',   path: '/dashboard', icon: Home },
    { name: 'Rooms',       path: '/rooms',     icon: Layers },
    { name: 'Devices',     path: '/devices',   icon: Grid },
    { name: 'Automations', path: '/scenarios', icon: Zap },
    { name: 'Profile',     path: '/profile',   icon: User },
  ];

  const residentNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Profile',   path: '/profile',   icon: User },
  ];

  const navItems = user?.role === 'admin' ? adminNavItems : residentNavItems;

  const navMoodTheme = useMemo(
    () => NAV_MOOD_STYLES[navMood] || NAV_MOOD_STYLES.default,
    [navMood],
  );

  /* Listen for scene mood changes broadcast from FloorPlan */
  useEffect(() => {
    const onMoodChange = (event) => {
      setNavMood(event.detail?.mode ?? null);
    };
    window.addEventListener('dashboard:mood-change', onMoodChange);
    return () => window.removeEventListener('dashboard:mood-change', onMoodChange);
  }, []);

  const actionBtnClass =
    'group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 hover:scale-105';

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ color: '#F8F9FA' }}
    >
      {/* ════════════════════════════════════════
          GLOBAL AMBIENT BACKGROUND
      ════════════════════════════════════════ */}

      {/* Layer 1 — base gradient canvas */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'linear-gradient(155deg, #07080E 0%, #101624 48%, #090A13 100%)',
        }}
      />

      {/* Layer 2 — subtle radial atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background:
            'radial-gradient(100% 100% at 14% 8%, rgba(59,130,246,0.18), transparent 52%), radial-gradient(95% 95% at 88% 84%, rgba(99,102,241,0.16), transparent 58%)',
        }}
      />

      {/* ════════ MAIN CONTENT ════════ */}
      <div className="relative z-10 flex h-screen min-w-0 flex-col overflow-hidden">

        {/* Top icon navbar */}
        <header
          className={`glass sticky top-0 z-30 border-b px-4 sm:px-6 ${compactNav ? 'h-16' : 'h-20'} transition-all duration-300`}
          style={{
            borderColor: navMoodTheme.headerBorder,
            background: navMoodTheme.headerBg,
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          }}
        >
          <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="champagne-glow-sm flex h-9 w-9 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #E3C598, #D4AF37, #D4AF37)' }}
              >
                <Shield size={17} style={{ color: '#1a1008' }} strokeWidth={2.5} />
              </div>
              <div className="hidden sm:block">
                <span className="text-[18px] font-black tracking-tight" style={{ color: '#F8F9FA' }}>
                  Smart<span style={{ color: '#E3C598' }}>Home</span>
                </span>
                <div className="mt-1 inline-flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
                    style={{
                      background: user?.role === 'admin' ? 'rgba(14,165,233,0.18)' : 'rgba(74,222,128,0.18)',
                      border: user?.role === 'admin' ? '1px solid rgba(14,165,233,0.45)' : '1px solid rgba(74,222,128,0.45)',
                      color: user?.role === 'admin' ? '#bae6fd' : '#bbf7d0',
                    }}
                  >
                    {user?.role === 'admin' ? 'Admin Mode' : 'Resident Mode'}
                  </span>
                </div>
              </div>
            </div>

            <nav className="flex min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto scrollbar-none px-2 sm:gap-3">
              {navItems.map(({ name, path, icon }) => (
                <NavIconLink
                  key={name}
                  name={name}
                  path={path}
                  Icon={icon}
                  moodTheme={navMoodTheme}
                />
              ))}
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                className={actionBtnClass}
                onClick={() => setCompactNav((prev) => !prev)}
                style={{ background: navMoodTheme.actionBg, border: `1px solid ${navMoodTheme.actionBorder}` }}
              >
                {compactNav
                  ? <PanelTopOpen size={16} style={{ color: 'rgba(227,197,152,0.9)' }} />
                  : <PanelTopClose size={16} style={{ color: 'rgba(227,197,152,0.9)' }} />}
                <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-0 transition-all duration-200 group-hover:opacity-100"
                  style={{ background: 'rgba(8,16,13,0.92)', border: '1px solid rgba(227,197,152,0.25)', color: '#E3C598' }}>
                  Collapse
                </span>
              </button>

              <button
                className={actionBtnClass}
                onClick={handleContact}
                title="Support Concierge"
                style={{ background: navMoodTheme.actionBg, border: `1px solid ${navMoodTheme.actionBorder}`, transition: 'all 0.25s ease' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(227,197,152,0.13)';
                  e.currentTarget.style.borderColor = 'rgba(227,197,152,0.45)';
                  e.currentTarget.style.boxShadow = '0 0 18px rgba(227,197,152,0.30), 0 0 6px rgba(227,197,152,0.18)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = navMoodTheme.actionBg;
                  e.currentTarget.style.borderColor = navMoodTheme.actionBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Mail size={16} style={{ color: '#E3C598' }} />
                <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-0 transition-all duration-200 group-hover:opacity-100 whitespace-nowrap"
                  style={{ background: 'rgba(8,16,13,0.92)', border: '1px solid rgba(227,197,152,0.25)', color: '#E3C598' }}>
                  Support Concierge
                </span>
              </button>

              <button
                className={actionBtnClass}
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                style={{ background: navMoodTheme.actionBg, border: `1px solid ${navMoodTheme.actionBorder}` }}>
                <Bell size={16} style={{ color: navMoodTheme.iconTint }} />
                {unreadPermissionCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-300 px-1 text-[10px] font-black text-sky-950">
                    {unreadPermissionCount}
                  </span>
                ) : null}
                <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-0 transition-all duration-200 group-hover:opacity-100"
                  style={{ background: 'rgba(8,16,13,0.92)', border: '1px solid rgba(227,197,152,0.25)', color: '#E3C598' }}>
                  {user?.role === 'admin' ? 'Permission Alerts' : 'Alerts'}
                </span>
              </button>

              <button
                className={actionBtnClass}
                onClick={handleLogout}
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)' }}
              >
                <LogOut size={16} style={{ color: 'rgba(248,113,113,0.9)' }} />
                <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-0 transition-all duration-200 group-hover:opacity-100"
                  style={{ background: 'rgba(8,16,13,0.92)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
                  Logout
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-10">
          <div className="mx-auto max-w-7xl space-y-12 px-6 py-8 sm:px-10">
            {children}
          </div>
        </main>
      </div>

      <PermissionNotificationCenter isOpen={isNotificationsOpen} setIsOpen={setIsNotificationsOpen} />
      {supportOpen && <SupportModal onClose={() => setSupportOpen(false)} />}
    </div>
  );
};

export default Layout;
