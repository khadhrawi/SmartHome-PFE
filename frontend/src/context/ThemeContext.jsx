import { createContext, useState, useContext, useCallback, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aura_dark_mode') ?? 'true'); }
    catch { return true; }
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aura_notifications') ?? 'true'); }
    catch { return true; }
  });

  /* ── Toast queue ── */
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, accent = '#E3C598') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, accent }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);

  /* ── Persist preferences ── */
  useEffect(() => {
    localStorage.setItem('aura_dark_mode', JSON.stringify(isDarkMode));
    /* Toggle CSS class for stylesheet overrides */
    document.documentElement.classList.toggle('aura-light', !isDarkMode);
    /* Apply CSS custom properties so components can react to theme */
    if (!isDarkMode) {
      document.documentElement.style.setProperty('--theme-bg-base',     'rgba(240,237,230,0.92)');
      document.documentElement.style.setProperty('--theme-card-bg',     'rgba(255,255,255,0.55)');
      document.documentElement.style.setProperty('--theme-text',        '#1a1008');
      document.documentElement.style.setProperty('--theme-muted',       'rgba(26,16,8,0.55)');
      document.documentElement.style.setProperty('--theme-border',      'rgba(26,16,8,0.10)');
    } else {
      document.documentElement.style.setProperty('--theme-bg-base',     'rgba(8,16,13,0.92)');
      document.documentElement.style.setProperty('--theme-card-bg',     'rgba(255,255,255,0.04)');
      document.documentElement.style.setProperty('--theme-text',        '#F8F9FA');
      document.documentElement.style.setProperty('--theme-muted',       'rgba(248,249,250,0.50)');
      document.documentElement.style.setProperty('--theme-border',      'rgba(255,255,255,0.08)');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('aura_notifications', JSON.stringify(notificationsEnabled));
  }, [notificationsEnabled]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      pushToast(next ? 'Dark mode enabled' : 'Light mode enabled', '#a78bfa');
      return next;
    });
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(prev => !prev);
    pushToast('Preferences updated', '#4ade80');
  };

  return (
    <ThemeContext.Provider value={{
      isDarkMode, toggleDarkMode,
      notificationsEnabled, toggleNotifications,
      pushToast, toasts,
    }}>
      {children}

      {/* ── Global glassmorphic toast stack (top-center) ── */}
      <div
        style={{
          position: 'fixed',
          right: 20,
          bottom: 100,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 18,
              background: 'rgba(8,16,13,0.88)',
              border: `1px solid ${t.accent}40`,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: `0 16px 40px rgba(0,0,0,0.55), 0 0 18px ${t.accent}22`,
              animation: 'fade-up 0.35s cubic-bezier(0.22,1,0.36,1) both',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: t.accent,
              boxShadow: `0 0 8px ${t.accent}`,
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 13, fontWeight: 700, color: '#F8F9FA',
              fontFamily: "'Outfit', sans-serif",
            }}>
              {t.message}
            </span>
          </div>
        ))}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
