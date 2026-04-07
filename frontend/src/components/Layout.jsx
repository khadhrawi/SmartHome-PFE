import { useState, useContext } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Layers, Grid, Zap, User, LogOut, Bell, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
/* Background photo sourced from Unsplash — no local import needed */

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Rooms',     path: '/rooms',     icon: Layers },
    { name: 'Devices',   path: '/devices',   icon: Grid },
    { name: 'Automations', path: '/scenarios', icon: Zap },
    { name: 'Profile',   path: '/profile',   icon: User },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ color: '#F8F9FA' }}>

      {/* ════════════════════════════════════════
          GLOBAL AMBIENT BACKGROUND — 3-layer sandwich
          Layer 1: Rich warm cinematic living room image
          Layer 2: Soft gradient scrim for readability
          Layer 3: Glass panels (z-index naturally above)
      ════════════════════════════════════════ */}

      {/* Layer 1 — Crisp luxury warm living room photo (Unsplash) */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: `url('https://images.unsplash.com/photo-1600210492493-0946911123ea?q=90&w=1920&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          filter: 'brightness(0.82) saturate(1.20)',
          transform: 'scale(1.01)',
        }}
      />

      {/* Layer 2 — Very thin warm scrim for text legibility */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background:
            'linear-gradient(170deg, rgba(15,8,2,0.18) 0%, rgba(10,5,1,0.30) 45%, rgba(6,3,0,0.55) 100%)',
        }}
      />

      {/* ════════ SIDEBAR ════════ */}
      <aside className={`hidden md:flex flex-col ${collapsed ? 'w-[76px]' : 'w-[240px]'} glass border-r h-screen sticky top-0 shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]`}
        style={{ borderColor: 'rgba(227,197,152,0.12)', zIndex: 20 }}>

        {/* Logo area */}
        <div className={`h-20 flex items-center px-5 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 champagne-glow-sm"
            style={{ background: 'linear-gradient(135deg, #E3C598, #D4AF37, #D4AF37)' }}>
            <Shield size={18} style={{ color: '#1a1008' }} strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <span className="text-[20px] font-black tracking-tight select-none" style={{ color: '#F8F9FA' }}>
              Smart<span style={{ color: '#E3C598' }}>Home</span>
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto scrollbar-none">
          {navItems.map(({ name, path, icon: Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <NavLink key={name} to={path} title={collapsed ? name : undefined}
                className={`relative flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-all duration-300 group ${
                  active ? 'glass-card' : 'hover:bg-white/5'
                }`}
                style={active ? { borderColor: 'rgba(227,197,152,0.25)' } : {}}>
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full champagne-glow-sm"
                    style={{ background: 'linear-gradient(to bottom, #D4AF37, #D4AF37)' }} />
                )}
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8}
                  style={{ color: active ? '#E3C598' : 'rgba(248,249,250,0.45)', transition: 'color 0.3s' }} />
                {!collapsed && (
                  <span className="text-sm font-semibold"
                    style={{ color: active ? '#F8F9FA' : 'rgba(248,249,250,0.45)' }}>
                    {name}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div className="px-3 pb-3">
          <button onClick={() => setCollapsed(!collapsed)}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3.5 py-2.5 rounded-2xl transition-all duration-300`}
            style={{ background: 'rgba(227,197,152,0.07)', border: '1px solid rgba(227,197,152,0.12)' }}>
            {!collapsed && <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(227,197,152,0.55)' }}>Collapse</span>}
            {collapsed
              ? <ChevronRight size={16} strokeWidth={2} style={{ color: 'rgba(227,197,152,0.6)' }} />
              : <ChevronLeft  size={16} strokeWidth={2} style={{ color: 'rgba(227,197,152,0.6)' }} />
            }
          </button>
        </div>

        {/* User footer */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(227,197,152,0.07)' }}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2.5 rounded-2xl`}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(227,197,152,0.08)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(227,197,152,0.15)', border: '1px solid rgba(227,197,152,0.2)' }}>
              <User size={15} style={{ color: '#E3C598' }} />
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold truncate" style={{ color: '#F8F9FA' }}>{user?.name || 'User'}</p>
                  <p className="text-[10px] truncate font-mono" style={{ color: 'rgba(227,197,152,0.5)' }}>{user?.email}</p>
                </div>
                <button onClick={handleLogout} className="p-1.5 rounded-xl transition-all hover:scale-110"
                  style={{ color: 'rgba(248,249,250,0.25)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(248,249,250,0.25)'}>
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ════════ MAIN CONTENT ════════ */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0" style={{ position: 'relative', zIndex: 10 }}>

        {/* Top header */}
        <header className="h-20 shrink-0 flex items-center justify-between px-8 glass sticky top-0 border-b"
          style={{ borderColor: 'rgba(227,197,152,0.10)', zIndex: 20 }}>
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#E3C598,#D4AF37)' }}>
              <Shield size={16} style={{ color: '#1a1008' }} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-black" style={{ color: '#F8F9FA' }}>Smart<span style={{ color: '#E3C598' }}>Home</span></span>
          </div>

          <div className="hidden md:flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'rgba(227,197,152,0.5)' }}>Smart Home</span>
            <span className="text-base font-black" style={{ color: '#F8F9FA' }}>
              {navItems.find(i => location.pathname.startsWith(i.path))?.name ?? 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2.5 rounded-2xl glass-card transition-all hover:scale-105 active:scale-95">
              <Bell size={17} strokeWidth={2} style={{ color: 'rgba(248,249,250,0.6)' }} />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full champagne-glow-sm"
                style={{ background: '#E3C598' }} />
            </button>
            <div className="hidden sm:flex items-center gap-3 pl-4" style={{ borderLeft: '1px solid rgba(227,197,152,0.1)' }}>
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold" style={{ color: '#F8F9FA' }}>{user?.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(227,197,152,0.6)' }}>Admin</span>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(227,197,152,0.12)', border: '1px solid rgba(227,197,152,0.2)' }}>
                <User size={16} style={{ color: '#E3C598' }} />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-32 md:pb-10">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10 space-y-12">
            {children}
          </div>
        </main>
      </div>

      {/* ════════ MOBILE NAV PILL ════════ */}
      <nav className="md:hidden fixed bottom-5 left-5 right-5 glass border z-40 rounded-3xl shadow-xl"
        style={{ borderColor: 'rgba(227,197,152,0.12)', background: 'rgba(15,10,4,0.55)' }}>
        <div className="flex items-center justify-around px-3 py-3">
          {navItems.map(({ name, path, icon: Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <NavLink key={name} to={path} className="flex flex-col items-center justify-center group">
                <div className="p-2.5 rounded-2xl transition-all duration-300"
                  style={active
                    ? { background: 'linear-gradient(135deg,#E3C598,#D4AF37)', boxShadow: '0 0 20px rgba(227,197,152,0.5)' }
                    : { color: 'rgba(248,249,250,0.35)' }}>
                  <Icon size={21} strokeWidth={active ? 2.5 : 1.8} style={{ color: active ? '#1a1008' : 'inherit' }} />
                </div>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
