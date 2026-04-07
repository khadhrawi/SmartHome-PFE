import { NavLink } from 'react-router-dom';
import {
  Home, Layers, LayoutGrid, User, LogOut,
  Shield, Zap, BedDouble,
} from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const C = {
  gold:      '#E3C598',
  goldDim:   'rgba(227,197,152,0.55)',
  goldBg:    'rgba(227,197,152,0.08)',
  goldBorder:'rgba(227,197,152,0.18)',
  text:      '#F8F9FA',
  muted:     'rgba(248,249,250,0.45)',
  dimmed:    'rgba(248,249,250,0.22)',
};

const NAV_ITEMS = [
  { path: '/dashboard', icon: Home,      label: 'Dashboard',  accent: '#E3C598' },
  { path: '/rooms',     icon: BedDouble, label: 'Rooms',      accent: '#818cf8' },
  { path: '/devices',   icon: Layers,    label: 'Devices',    accent: '#f5c842' },
  { path: '/scenarios', icon: LayoutGrid,label: 'Automations',accent: '#a78bfa' },
  { path: '/security',  icon: Shield,    label: 'Security',   accent: '#60a5fa' },
  { path: '/energy',    icon: Zap,       label: 'Energy',     accent: '#3E5F4F' },
  { path: '/profile',   icon: User,      label: 'Profile',    accent: '#f97316' },
];

const Sidebar = ({ isOpen, setOpen }) => {
  const { logout } = useContext(AuthContext);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          background: 'rgba(12,7,3,0.72)',
          backdropFilter: 'blur(25px) saturate(180%)',
          WebkitBackdropFilter: 'blur(25px) saturate(180%)',
          borderRight: '1px solid rgba(227,197,152,0.10)',
          boxShadow: '4px 0 30px rgba(0,0,0,0.35)',
        }}
      >
        {/* ── Brand ── */}
        <div className="flex items-center gap-3 px-6 py-7">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-base"
            style={{
              background: 'linear-gradient(135deg, #E3C598, #D4AF37)',
              boxShadow: '0 6px 20px rgba(227,197,152,0.40)',
            }}
          >
            🏠
          </div>
          <div>
            <span
              className="text-base font-black tracking-tight"
              style={{ color: C.text }}
            >
              SmartHome
            </span>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: C.dimmed }}>
              Aura Dashboard
            </p>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-none">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className="group"
              >
                {({ isActive }) => (
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200"
                    style={{
                      background: isActive ? `${item.accent}12` : 'transparent',
                      border: `1px solid ${isActive ? item.accent + '28' : 'transparent'}`,
                      boxShadow: isActive ? `0 0 20px ${item.accent}10` : 'none',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div
                        className="absolute left-0 w-[3px] h-7 rounded-r-full"
                        style={{
                          background: item.accent,
                          boxShadow: `0 0 10px ${item.accent}`,
                        }}
                      />
                    )}
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      style={{ color: isActive ? item.accent : C.muted, flexShrink: 0 }}
                    />
                    <span
                      className="text-sm font-bold"
                      style={{ color: isActive ? C.text : C.muted }}
                    >
                      {item.label}
                    </span>
                    {/* Active dot */}
                    {isActive && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{
                          background: item.accent,
                          boxShadow: `0 0 6px ${item.accent}`,
                          animation: 'warm-pulse 2s ease-in-out infinite',
                        }}
                      />
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all group"
            style={{ color: C.dimmed }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(248,113,113,0.08)';
              e.currentTarget.style.color = '#f87171';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = C.dimmed;
            }}
          >
            <LogOut size={17} strokeWidth={2} />
            <span className="text-sm font-bold">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
