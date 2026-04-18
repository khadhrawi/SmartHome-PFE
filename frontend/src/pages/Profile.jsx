import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Shield, Bell, Moon, LogOut,
  ChevronRight, X, Lock, Eye, EyeOff,
  Camera, Settings, Check, AlertTriangle, Copy,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.50)',
  dimmed: 'rgba(248,249,250,0.25)',
  gold:   '#E3C598',
  bg:     'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
};

/* ── Glassmorphic toggle (matches ScenarioCard style) ─────── */
const GlassToggle = ({ isOn, accent = C.gold, onToggle }) => (
  <button
    onClick={onToggle}
    aria-label={isOn ? 'Disable' : 'Enable'}
    style={{ position: 'relative', width: 46, height: 26, flexShrink: 0 }}
  >
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 999,
      background: isOn ? `linear-gradient(135deg, ${accent}ee, ${accent}99)` : 'rgba(255,255,255,0.10)',
      border: `1px solid ${isOn ? accent + '55' : 'rgba(255,255,255,0.15)'}`,
      boxShadow: isOn ? `0 0 14px ${accent}55` : 'none',
      transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
    }} />
    <div style={{
      position: 'absolute', top: 4, width: 18, height: 18, borderRadius: '50%',
      left: isOn ? 24 : 4,
      background: isOn ? '#fff' : 'rgba(255,255,255,0.55)',
      boxShadow: isOn ? `0 2px 8px rgba(0,0,0,0.4), 0 0 6px ${accent}55` : '0 2px 6px rgba(0,0,0,0.3)',
      transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
    }} />
  </button>
);

/* ── Clickable setting row ────────────────────────────────── */
const SettingRow = ({ icon: Icon, label, subtitle, accent = C.gold, onClick, rightEl }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '14px 16px',
        borderRadius: 18, border: 'none', cursor: 'pointer',
        background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        boxShadow: hovered ? `0 0 20px ${accent}14` : 'none',
        transform: pressed ? 'scale(0.99)' : hovered ? 'scale(1.012)' : 'scale(1)',
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hovered ? `${accent}18` : 'rgba(255,255,255,0.07)',
          border: `1px solid ${hovered ? accent + '35' : 'rgba(255,255,255,0.09)'}`,
          color: hovered ? accent : C.muted,
          transition: 'all 0.22s ease',
          flexShrink: 0,
        }}>
          <Icon size={17} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: hovered ? C.text : C.muted, transition: 'color 0.2s' }}>
            {label}
          </p>
          {subtitle && (
            <p style={{ fontSize: 11, color: C.dimmed, marginTop: 2 }}>{subtitle}</p>
          )}
        </div>
      </div>
      {rightEl ?? <ChevronRight size={16} style={{ color: hovered ? accent : C.dimmed, transition: 'color 0.2s' }} />}
    </button>
  );
};

/* ══════════════════════════════════════════════════════════════
   PERSONAL INFORMATION SLIDE-OVER MODAL
══════════════════════════════════════════════════════════════ */
const PersonalInfoModal = ({ profile, onSave, onClose }) => {
  const [form, setForm] = useState({ name: profile.name, email: profile.email, phone: profile.phone ?? '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
    color: C.text, borderRadius: 14, padding: '12px 16px', width: '100%',
    fontSize: 14, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Outfit', sans-serif",
  };

  return (
    <SlideOverShell title="Personal Information" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Avatar placeholder */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.gold}55, #a78bfa44)`,
              border: `2px solid ${C.gold}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32,
            }}>
              {form.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 26, height: 26, borderRadius: '50%',
              background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <Camera size={12} style={{ color: '#08100D' }} />
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>Display Name</FieldLabel>
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <FieldLabel>Email Address</FieldLabel>
          <input style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
        </div>
        <div>
          <FieldLabel>Phone (optional)</FieldLabel>
          <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" />
        </div>

        <ModalFooter onClose={onClose} onSave={() => { onSave(form); onClose(); }} />
      </div>
    </SlideOverShell>
  );
};

/* ══════════════════════════════════════════════════════════════
   PRIVACY & SECURITY SLIDE-OVER MODAL
══════════════════════════════════════════════════════════════ */
const PrivacyModal = ({ onClose }) => {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [twoFA, setTwoFA]   = useState(false);
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
    color: C.text, borderRadius: 14, padding: '12px 48px 12px 16px', width: '100%',
    fontSize: 14, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Outfit', sans-serif",
  };

  const PasswordField = ({ label, field, show, onToggle }) => (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          style={inputStyle} value={form[field]}
          onChange={e => set(field, e.target.value)} placeholder="••••••••"
        />
        <button
          onClick={onToggle}
          style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: C.dimmed, padding: 0,
          }}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );

  return (
    <SlideOverShell title="Privacy & Security" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <p style={{ fontSize: 12, color: C.dimmed, margin: 0 }}>
          Keep your account secure by using a strong, unique password.
        </p>

        <PasswordField label="Current Password" field="oldPassword" show={showOld} onToggle={() => setShowOld(p => !p)} />
        <PasswordField label="New Password" field="newPassword" show={showNew} onToggle={() => setShowNew(p => !p)} />
        <PasswordField label="Confirm New Password" field="confirmPassword" show={showNew} onToggle={() => setShowNew(p => !p)} />

        {/* 2FA row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={18} style={{ color: C.gold }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Two-Factor Auth</p>
              <p style={{ fontSize: 11, color: C.dimmed, margin: '2px 0 0' }}>Extra layer of protection</p>
            </div>
          </div>
          <GlassToggle isOn={twoFA} accent="#4ade80" onToggle={() => setTwoFA(p => !p)} />
        </div>

        <ModalFooter onClose={onClose} onSave={onClose} saveLabel="Update Password" />
      </div>
    </SlideOverShell>
  );
};

/* ── Shared slide-over shell ─────────────────────────────── */
const SlideOverShell = ({ title, children, onClose }) => (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      background: 'rgba(8,16,13,0.72)', backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}
    onClick={e => e.target === e.currentTarget && onClose()}
  >
    <div
      style={{
        width: '100%', maxWidth: 440, height: '100%',
        background: 'linear-gradient(170deg, rgba(18,28,24,0.98) 0%, rgba(10,20,16,0.99) 100%)',
        borderLeft: `1px solid ${C.gold}22`,
        boxShadow: `-40px 0 100px rgba(0,0,0,0.65), 0 0 0 1px ${C.gold}0a`,
        display: 'flex', flexDirection: 'column',
        animation: 'slide-in-right 0.35s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
          {title}
        </h3>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: 10, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)',
          color: C.muted,
        }}>
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {children}
      </div>
    </div>
  </div>
);

/* ── Modal footer ────────────────────────────────────────── */
const ModalFooter = ({ onClose, onSave, saveLabel = 'Save Changes' }) => (
  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
    <button onClick={onClose} style={{
      flex: 1, padding: '13px 0', borderRadius: 14, fontWeight: 700,
      fontSize: 14, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.10)',
      background: 'rgba(255,255,255,0.05)', color: C.muted,
    }}>
      Cancel
    </button>
    <button onClick={onSave} style={{
      flex: 1, padding: '13px 0', borderRadius: 14, fontWeight: 800,
      fontSize: 14, cursor: 'pointer', border: 'none',
      background: `linear-gradient(135deg, ${C.gold}, #D4AF37)`,
      color: '#08100D',
      boxShadow: `0 8px 24px rgba(227,197,152,0.35)`,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Check size={14} /> {saveLabel}
      </span>
    </button>
  </div>
);

/* ── Field label ─────────────────────────────────────────── */
const FieldLabel = ({ children }) => (
  <p style={{
    fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
    letterSpacing: '0.16em', color: C.gold, marginBottom: 8, marginTop: 0,
  }}>
    {children}
  </p>
);

/* ── Logout confirmation modal ───────────────────────────── */
const LogoutModal = ({ onConfirm, onCancel }) => (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(8,16,13,0.82)', backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}
    onClick={e => e.target === e.currentTarget && onCancel()}
  >
    <div style={{
      width: '100%', maxWidth: 400, margin: '0 16px',
      background: 'linear-gradient(160deg, rgba(26,31,29,0.97) 0%, rgba(13,26,21,0.99) 100%)',
      border: '1px solid rgba(248,113,113,0.25)',
      borderRadius: 28,
      boxShadow: '0 40px 100px rgba(0,0,0,0.70), 0 0 0 1px rgba(248,113,113,0.10)',
      padding: 36,
      animation: 'fade-up 0.3s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      {/* Icon */}
      <div style={{
        width: 56, height: 56, borderRadius: 18,
        background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
      }}>
        <AlertTriangle size={26} style={{ color: '#f87171' }} />
      </div>

      <h3 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
        Leaving already?
      </h3>
      <p style={{ fontSize: 14, color: C.muted, margin: '0 0 28px', lineHeight: 1.6 }}>
        Your session will be cleared and you'll be redirected to the login screen.
      </p>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '13px 0', borderRadius: 14, fontWeight: 700,
          fontSize: 14, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(255,255,255,0.05)', color: C.muted,
        }}>
          Stay
        </button>
        <button onClick={onConfirm} style={{
          flex: 1, padding: '13px 0', borderRadius: 14, fontWeight: 800,
          fontSize: 14, cursor: 'pointer', border: '1px solid rgba(248,113,113,0.28)',
          background: 'rgba(248,113,113,0.12)', color: '#f87171',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <LogOut size={15} /> Log Out
        </button>
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   PROFILE PAGE
══════════════════════════════════════════════════════════════ */
const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const { isDarkMode, toggleDarkMode, notificationsEnabled, toggleNotifications, pushToast } = useTheme();

  /* ── Local user profile state ── */
  const [userProfile, setUserProfile] = useState({
    name:  user?.name  ?? 'Farah',
    email: user?.email ?? 'imenkhadhrawi9@gmail.com',
    phone: user?.phone ?? '',
    role:  user?.role === 'admin' ? 'Admin' : 'House Resident',
    houseCode: user?.houseCode ?? '',
  });
  const [houseCodeCopied, setHouseCodeCopied] = useState(false);

  /* ── Modal state ── */
  const [modal, setModal] = useState(null); // null | 'personal' | 'privacy' | 'logout'

  const handleSaveProfile = (updated) => {
    setUserProfile(prev => ({ ...prev, ...updated }));
    pushToast('Profile saved', C.gold);
  };

  const navigate = useNavigate();

  /* Clear session then hard-redirect to login */
  const handleLogout = () => {
    logout();
    navigate('/auth/choose', { replace: true });
  };

  /* Preference change handler — toggleNotifications already fires a toast */
  const handlePreferenceChange = (type) => {
    if (type === 'notifications') toggleNotifications();
    if (type === 'darkMode')       toggleDarkMode();
  };

  const handleCopyHouseCode = async () => {
    if (!userProfile.houseCode) return;

    try {
      await navigator.clipboard.writeText(userProfile.houseCode);
      setHouseCodeCopied(true);
      pushToast('House code copied', C.gold);
      window.setTimeout(() => setHouseCodeCopied(false), 1500);
    } catch {
      pushToast('Unable to copy house code', '#f87171');
    }
  };

  const initials = userProfile.name
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  /* ── Card section wrapper ── */
  const Section = ({ title, children }) => (
    <div style={{
      borderRadius: 24, overflow: 'hidden',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
    }}>
      <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{
          fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '0.18em', color: C.gold, margin: 0,
        }}>
          {title}
        </p>
      </div>
      <div style={{ padding: '8px 8px 8px' }}>
        {children}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Slide-over modals ── */}
      {modal === 'personal' && (
        <PersonalInfoModal
          profile={userProfile}
          onSave={handleSaveProfile}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'privacy' && (
        <PrivacyModal onClose={() => setModal(null)} />
      )}
      {modal === 'logout' && (
        <LogoutModal onConfirm={handleLogout} onCancel={() => setModal(null)} />
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', color: C.text }}>
        {/* ── Page header ── */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
            Profile
          </h2>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
            Manage your account settings and preferences.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'start' }}>

          {/* ── LEFT COLUMN: Avatar card + Logout ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Avatar card */}
            <div style={{
              borderRadius: 24, padding: 32,
              background: `linear-gradient(145deg, ${C.gold}08 0%, rgba(255,255,255,0.025) 100%)`,
              border: `1px solid ${C.gold}22`,
              backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)',
              boxShadow: `0 20px 50px rgba(0,0,0,0.38), 0 0 32px ${C.gold}14, inset 0 1px 0 rgba(255,255,255,0.07)`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              {/* Avatar ring */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <div style={{
                  width: 90, height: 90, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${C.gold}44, #a78bfa33)`,
                  border: `2px solid ${C.gold}50`,
                  boxShadow: `0 0 30px ${C.gold}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 30, fontWeight: 900, color: C.gold,
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  {initials}
                </div>
                {/* Online dot */}
                <div style={{
                  position: 'absolute', bottom: 4, right: 4,
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#4ade80', border: '2px solid #08100D',
                  boxShadow: '0 0 8px #4ade80',
                }} />
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 4px', color: C.text }}>
                {userProfile.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Mail size={12} style={{ color: C.dimmed }} />
                <span style={{ fontSize: 12, color: C.dimmed }}>{userProfile.email}</span>
              </div>

              {/* Role badge */}
              <span style={{
                padding: '5px 16px', borderRadius: 999, fontSize: 11, fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.14em',
                background: `${C.gold}15`, border: `1px solid ${C.gold}30`, color: C.gold,
              }}>
                {userProfile.role}
              </span>

              {user?.role === 'admin' && userProfile.houseCode ? (
                <div style={{
                  marginTop: 14,
                  width: '100%',
                  borderRadius: 14,
                  padding: '10px 12px',
                  background: 'rgba(227,197,152,0.08)',
                  border: '1px solid rgba(227,197,152,0.25)',
                }}>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.dimmed }}>
                    Your House Code
                  </span>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.14em', color: C.gold }}>
                      {userProfile.houseCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyHouseCode}
                      style={{
                        border: '1px solid rgba(227,197,152,0.28)',
                        background: 'rgba(227,197,152,0.12)',
                        color: C.gold,
                        borderRadius: 10,
                        cursor: 'pointer',
                        padding: '6px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Copy house code"
                      title={houseCodeCopied ? 'Copied' : 'Copy house code'}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Log Out */}
            <button
              onClick={() => setModal('logout')}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(248,113,113,0.14)';
                e.currentTarget.style.borderColor = 'rgba(248,113,113,0.32)';
                e.currentTarget.style.color = '#f87171';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(248,113,113,0.06)';
                e.currentTarget.style.borderColor = 'rgba(248,113,113,0.18)';
                e.currentTarget.style.color = '#f8717190';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontWeight: 800, fontSize: 14, cursor: 'pointer',
                background: 'rgba(248,113,113,0.06)',
                border: '1px solid rgba(248,113,113,0.18)',
                color: '#f8717190',
                transition: 'all 0.22s ease',
              }}
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>

          {/* ── RIGHT COLUMN: settings sections ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Account Settings */}
            <Section title="Account Settings">
              <SettingRow
                icon={User}
                label="Personal Information"
                subtitle="Name, email, phone"
                onClick={() => setModal('personal')}
              />
              <SettingRow
                icon={Shield}
                label="Privacy & Security"
                subtitle="Password, 2FA, sessions"
                onClick={() => setModal('privacy')}
              />
            </Section>

            {/* App Preferences */}
            <Section title="App Preferences">
              <SettingRow
                icon={Bell}
                label="Push Notifications"
                subtitle={notificationsEnabled ? "Enabled — you'll hear from us" : 'Disabled'}
                accent="#4ade80"
                onClick={() => handlePreferenceChange('notifications')}
                rightEl={<GlassToggle isOn={notificationsEnabled} accent="#4ade80" onToggle={() => handlePreferenceChange('notifications')} />}
              />
              <SettingRow
                icon={Moon}
                label="Dark Mode Appearance"
                subtitle={isDarkMode ? 'On — rich & moody' : 'Off — light theme'}
                accent="#a78bfa"
                onClick={() => handlePreferenceChange('darkMode')}
                rightEl={<GlassToggle isOn={isDarkMode} accent="#a78bfa" onToggle={() => handlePreferenceChange('darkMode')} />}
              />
              <SettingRow
                icon={Settings}
                label="System Preferences"
                subtitle="Language, timezone, units"
                onClick={() => pushToast('System preferences coming soon', '#a78bfa')}
              />
            </Section>

            {user?.role === 'admin' ? (
              <Section title="Admin Controls">
                <SettingRow
                  icon={Shield}
                  label="Manage Users"
                  subtitle="Advanced crew control panel"
                  onClick={() => navigate('/users')}
                />
              </Section>
            ) : null}

            {/* Quick stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
            }}>
              {[
                { label: 'Devices',     value: '12', accent: C.gold },
                { label: 'Automations', value: '5',  accent: '#a78bfa' },
                { label: 'Rooms',       value: '4',  accent: '#4ade80' },
              ].map(s => (
                <div key={s.label} style={{
                  borderRadius: 18, padding: '16px 18px',
                  background: `${s.accent}0a`, border: `1px solid ${s.accent}22`,
                  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                }}>
                  <span style={{ fontSize: 26, fontWeight: 900, color: s.accent, display: 'block' }}>
                    {s.value}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.dimmed }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </>
  );
};

export default Profile;
