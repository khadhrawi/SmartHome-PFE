import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English',  flag: '🇬🇧', short: 'EN' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', short: 'FR' },
  { code: 'ar', label: 'العربية', flag: '🇹🇳', short: 'AR' },
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪', short: 'DE' },
  { code: 'es', label: 'Español',  flag: '🇪🇸', short: 'ES' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', short: 'IT' },
];

const LanguageSwitcher = ({ moodTheme }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const activeLangCode = window.getCurrentTranslateLang?.() || 'en';
  const current = LANGUAGES.find(l => l.code === activeLangCode) || LANGUAGES[0];

  const handleSelect = (lang) => {
    setOpen(false);
    if (lang.code === 'en') window.resetTranslation?.();
    else window.triggerGoogleTranslate?.(lang.code);
  };

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const bg     = moodTheme?.actionBg     || 'rgba(255,255,255,0.05)';
  const border = moodTheme?.actionBorder || 'rgba(255,255,255,0.09)';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 transition-all duration-300 hover:scale-105"
        style={{
          background: open ? 'rgba(227,197,152,0.12)' : bg,
          border: `1px solid ${open ? 'rgba(227,197,152,0.40)' : border}`,
          boxShadow: open ? '0 0 16px rgba(227,197,152,0.20)' : 'none',
        }}
      >
        <Globe size={14} style={{ color: open ? '#E3C598' : 'rgba(227,197,152,0.70)' }} />
        <span className="text-[11px] font-black tracking-wider"
          style={{ color: open ? '#E3C598' : 'rgba(248,249,250,0.65)' }}>
          {current.flag} {current.short}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 overflow-hidden rounded-2xl"
          style={{
            top: '100%', minWidth: 170,
            background: 'rgba(8,12,26,0.98)',
            border: '1px solid rgba(227,197,152,0.18)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.70)',
            backdropFilter: 'blur(30px)',
          }}>
          <div className="px-4 py-2.5 border-b border-white/6">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Language</p>
          </div>
          {LANGUAGES.map(l => {
            const isActive = l.code === current.code;
            return (
              <button key={l.code} onClick={() => handleSelect(l)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-white/5">
                <span className="text-base leading-none">{l.flag}</span>
                <p className="flex-1 text-sm font-bold"
                  style={{ color: isActive ? '#E3C598' : 'rgba(248,249,250,0.80)' }}>{l.label}</p>
                {isActive && <div className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#E3C598', boxShadow: '0 0 6px rgba(227,197,152,0.8)' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
