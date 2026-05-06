import React, { useState, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Layers, Grid, Zap, LogOut, Shield, Mail, PanelTopClose, PanelTopOpen, Wrench, Inbox, ClipboardList, Bell } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PermissionNotificationCenter from './PermissionNotificationCenter';
import SupportModal from './SupportModal';
import LanguageSwitcher from './LanguageSwitcher';
import GasEmergencyOverlay from './GasEmergencyOverlay';
import GasSafetyBanner from './GasSafetyBanner';
import AuraCompanion from './AuraCompanion';
import { useGasMonitor } from '../hooks/useGasMonitor';
import api from '../api/axios';

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

/* ── NavAvatarLink: profile button with avatar or initials fallback ── */
const NavAvatarLink = ({ user, moodTheme }) => {
  const location = useLocation();
  const active = location.pathname.startsWith('/profile');
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  return (
    <NavLink
      to="/profile"
      className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 hover:scale-110 overflow-hidden"
      style={
        active
          ? { boxShadow: '0 0 22px rgba(227,197,152,0.55)', outline: '2px solid #E3C598' }
          : { background: moodTheme.actionBg, border: `1px solid ${moodTheme.actionBorder}` }
      }
    >
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt="avatar"
          className="h-full w-full object-cover rounded-xl"
        />
      ) : (
        <span
          className="text-[11px] font-black tracking-wide select-none"
          style={{ color: active ? '#E3C598' : moodTheme.iconTint }}
        >
          {initials}
        </span>
      )}
      <span
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-0 transition-all duration-200 group-hover:opacity-100 whitespace-nowrap"
        style={{
          background: 'rgba(8,16,13,0.92)',
          border: '1px solid rgba(227,197,152,0.25)',
          color: '#E3C598',
          backdropFilter: 'blur(10px)',
        }}
      >
        Profile
      </span>
    </NavLink>
  );
};

/* ── NotificationBell: polls backend and shows a dropdown ── */
const NotificationBell = ({ user, moodTheme, actionBtnClass }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const POLL_MS = 15000;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      if (user.role === 'admin') {
        // Admins: count pending permission requests + unread messages with replies
        const [permRes, msgRes] = await Promise.allSettled([
          api.get('/permissions/admin/requests?status=pending'),
          api.get('/messages'),
        ]);
        const pendingPerms = permRes.status === 'fulfilled'
          ? (Array.isArray(permRes.value.data) ? permRes.value.data.length : 0)
          : 0;
        const unreadMessages = msgRes.status === 'fulfilled'
          ? (Array.isArray(msgRes.value.data)
            ? msgRes.value.data.filter(m => m.adminReply && m.status !== 'resolved').length
            : 0)
          : 0;

        const items = [];
        if (pendingPerms > 0) items.push({ key: 'perms', label: `${pendingPerms} pending permission request${pendingPerms > 1 ? 's' : ''}`, path: '/permissions', color: '#E3C598' });
        if (unreadMessages > 0) items.push({ key: 'msgs', label: `${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''}`, path: '/messages', color: '#38bdf8' });
        setNotifications(items);
      } else if (user.role === 'resident') {
        // Residents: messages where adminReply exists and not resolved
        const res = await api.get('/messages/mine').catch(() => null);
        if (!res) return;
        const messages = Array.isArray(res.data) ? res.data : [];
        const replied = messages.filter(m => m.adminReply && m.status !== 'resolved');
        const items = replied.length > 0
          ? [{ key: 'replies', label: `You have ${replied.length} new repl${replied.length > 1 ? 'ies' : 'y'}`, path: '/my-requests', color: '#4ade80' }]
          : [];
        setNotifications(items);
      }
    } catch {
      // silently fail — non-critical
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role === 'agency') return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications, user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user || user.role === 'agency') return null;

  const count = notifications.length;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className={actionBtnClass}
        onClick={() => setOpen(prev => !prev)}
        style={{
          background: count > 0 ? 'rgba(227,197,152,0.12)' : moodTheme.actionBg,
          border: `1px solid ${count > 0 ? 'rgba(227,197,152,0.45)' : moodTheme.actionBorder}`,
          transition: 'all 0.25s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(227,197,152,0.15)';
          e.currentTarget.style.borderColor = 'rgba(227,197,152,0.50)';
          e.currentTarget.style.boxShadow = '0 0 18px rgba(227,197,152,0.28)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = count > 0 ? 'rgba(227,197,152,0.12)' : moodTheme.actionBg;
          e.currentTarget.style.borderColor = count > 0 ? 'rgba(227,197,152,0.45)' : moodTheme.actionBorder;
          e.currentTarget.style.boxShadow = 'none';
        }}
        title="Notifications"
      >
        <Bell size={16} style={{ color: count > 0 ? '#E3C598' : 'rgba(227,197,152,0.75)' }} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, borderRadius: 999,
            background: '#ef4444', border: '2px solid rgba(8,16,13,0.9)',
            fontSize: 9, fontWeight: 900, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>
            {count}
          </span>
        )}
        <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-0 transition-all duration-200 group-hover:opacity-100 whitespace-nowrap"
          style={{ background: 'rgba(8,16,13,0.92)', border: '1px solid rgba(227,197,152,0.25)', color: '#E3C598' }}>
          Notifications
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          minWidth: 260, maxWidth: 320, zIndex: 50,
          background: 'linear-gradient(170deg, rgba(14,20,18,0.97) 0%, rgba(8,14,12,0.99) 100%)',
          border: '1px solid rgba(227,197,152,0.22)',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(227,197,152,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          overflow: 'hidden',
          animation: 'fade-up 0.2s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#E3C598', margin: 0 }}>
              Notifications
            </p>
          </div>
          <div style={{ padding: 8 }}>
            {notifications.length === 0 ? (
              <p style={{ fontSize: 13, color: 'rgba(248,249,250,0.40)', padding: '10px 8px', margin: 0, textAlign: 'center' }}>
                All caught up!
              </p>
            ) : (
              notifications.map(n => (
                <button
                  key={n.key}
                  onClick={() => { setOpen(false); navigate(n.path); }}
                  style={{
                    width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'transparent', color: 'rgba(248,249,250,0.85)',
                    fontSize: 13, fontWeight: 600,
                    transition: 'background 0.18s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: n.color, boxShadow: `0 0 8px ${n.color}88`,
                  }} />
                  {n.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Layout ── */
const Layout = ({ children }) => {
  const { user, logout, isSuperAdmin, isManaged } = useContext(AuthContext);
  const { isDarkMode } = useTheme();
  const [compactNav, setCompactNav] = useState(false);
  const [navMood, setNavMood] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const navigate = useNavigate();

  /* Gas safety monitor — always active while logged in */
  const { gasLevel, threshold, emergencyMode, gasValveOpen, clearEmergency } = useGasMonitor();

  const handleLogout = () => { logout(); navigate('/auth/choose'); };
  const handleContact = () => setSupportOpen(true);

  const adminNavItems = [
    { name: 'Dashboard',   path: '/dashboard', icon: Home },
    { name: 'Rooms',       path: '/rooms',     icon: Layers },
    { name: 'Devices',     path: '/devices',   icon: Grid },
    { name: 'Automations', path: '/scenarios', icon: Zap },
    { name: 'Inbox',       path: '/messages',  icon: Inbox },
    { name: 'Audit',       path: '/audit',     icon: Shield },
  ];

  const residentNavItems = [
    { name: 'Dashboard',   path: '/dashboard',   icon: Home },
    { name: 'My Room',     path: '/my-room',     icon: Layers },
    { name: 'My Requests', path: '/my-requests', icon: ClipboardList },
  ];

  const agencyNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
  ];

  const navItems = user?.role === 'agency'
    ? agencyNavItems
    : (user?.role === 'admin' || isSuperAdmin) ? adminNavItems : residentNavItems;

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
      style={{ color: isDarkMode ? '#F8F9FA' : '#1a1008' }}
    >
      {/* ════════════════════════════════════════
          GLOBAL AMBIENT BACKGROUND
      ════════════════════════════════════════ */}

      {/* Layer 1 — base gradient canvas */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background: isDarkMode
            ? 'linear-gradient(155deg, #07080E 0%, #101624 48%, #090A13 100%)'
            : 'linear-gradient(155deg, #f0ece4 0%, #e8e2d8 48%, #ede8df 100%)',
        }}
      />

      {/* Layer 2 — subtle radial atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: isDarkMode
            ? 'radial-gradient(100% 100% at 14% 8%, rgba(59,130,246,0.18), transparent 52%), radial-gradient(95% 95% at 88% 84%, rgba(99,102,241,0.16), transparent 58%)'
            : 'radial-gradient(100% 100% at 14% 8%, rgba(59,130,246,0.07), transparent 52%), radial-gradient(95% 95% at 88% 84%, rgba(99,102,241,0.06), transparent 58%)',
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
                <span className="text-[18px] font-black tracking-tight" style={{ color: isDarkMode ? '#F8F9FA' : '#1a1008' }}>
                  Smart<span style={{ color: '#E3C598' }}>Home</span>
                </span>
                <div className="mt-1 inline-flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
                    style={{
                      background: user?.role === 'agency' ? 'rgba(251,191,36,0.18)' : isSuperAdmin ? 'rgba(167,139,250,0.18)' : (user?.role === 'admin' ? 'rgba(14,165,233,0.18)' : 'rgba(74,222,128,0.18)'),
                      border: user?.role === 'agency' ? '1px solid rgba(251,191,36,0.45)' : isSuperAdmin ? '1px solid rgba(167,139,250,0.45)' : (user?.role === 'admin' ? '1px solid rgba(14,165,233,0.45)' : '1px solid rgba(74,222,128,0.45)'),
                      color: user?.role === 'agency' ? '#fde68a' : isSuperAdmin ? '#ddd6fe' : (user?.role === 'admin' ? '#bae6fd' : '#bbf7d0'),
                    }}
                  >
                    {user?.role === 'agency' ? 'Platform Admin' : isSuperAdmin ? 'Super Admin' : (user?.role === 'admin' ? 'House Owner' : 'Resident Mode')}
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
              <NavAvatarLink user={user} moodTheme={navMoodTheme} />
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

              {/* Support Concierge — hidden for solo (isSuperAdmin) users and agency */}
              {isManaged !== false && user?.role !== 'agency' && (
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
              )}

              {/* Request Maintenance — hidden for solo (isSuperAdmin) users and agency */}
              {isManaged !== false && user?.role !== 'agency' && (
                <button
                  className={actionBtnClass}
                  onClick={() => setSupportOpen(true)}
                  title="Request Maintenance"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)', transition: 'all 0.25s ease' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(251,191,36,0.15)';
                    e.currentTarget.style.borderColor = 'rgba(251,191,36,0.50)';
                    e.currentTarget.style.boxShadow = '0 0 18px rgba(251,191,36,0.22)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(251,191,36,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(251,191,36,0.22)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Wrench size={16} style={{ color: 'rgba(251,191,36,0.90)' }} />
                  <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-0 transition-all duration-200 group-hover:opacity-100 whitespace-nowrap"
                    style={{ background: 'rgba(8,16,13,0.92)', border: '1px solid rgba(251,191,36,0.30)', color: '#fbbf24' }}>
                    Request Maintenance
                  </span>
                </button>
              )}

              <NotificationBell user={user} moodTheme={navMoodTheme} actionBtnClass={actionBtnClass} />

              <LanguageSwitcher moodTheme={navMoodTheme} />

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

      {/* ⚠ Slide-down Gas Safety Banner — visible on any screen */}
      <GasSafetyBanner
        gasLevel={gasLevel}
        threshold={threshold}
        emergencyMode={emergencyMode}
        isAdmin={user?.role === 'admin'}
        onClear={clearEmergency}
      />

      {/* 🚨 Full-screen Gas Emergency Overlay — only for extreme levels (> 1.5x threshold) */}
      {emergencyMode && gasLevel > threshold * 1.5 && (
        <GasEmergencyOverlay
          gasLevel={gasLevel}
          threshold={threshold}
          gasValveOpen={gasValveOpen}
          onClear={clearEmergency}
        />
      )}

      {/* ✦ Aura AI Companion */}
      <AuraCompanion />
    </div>
  );
};

export default Layout;
