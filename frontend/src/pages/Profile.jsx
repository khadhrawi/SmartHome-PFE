import { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Shield, Bell, Moon, LogOut,
  ChevronRight, X, Lock, Eye, EyeOff,
  Camera, Settings, Check, AlertTriangle, Copy, KeyRound, ShieldCheck, ShieldOff,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';

/* ── Design tokens — computed per theme ─────────────────────── */
const getTokens = (isDark) => isDark ? {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.50)',
  dimmed: 'rgba(248,249,250,0.25)',
  gold:   '#E3C598',
  bg:     'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
} : {
  text:   '#1a1008',
  muted:  'rgba(26,16,8,0.60)',
  dimmed: 'rgba(26,16,8,0.35)',
  gold:   '#b8860b',
  bg:     'rgba(0,0,0,0.04)',
  border: 'rgba(0,0,0,0.08)',
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
const SettingRow = ({ icon: Icon, label, subtitle, accent, onClick, rightEl }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const { isDarkMode } = useTheme();
  const T = getTokens(isDarkMode);
  const ac = accent ?? T.gold;

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
        background: hovered ? (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'transparent',
        boxShadow: hovered ? `0 0 20px ${ac}14` : 'none',
        transform: pressed ? 'scale(0.99)' : hovered ? 'scale(1.012)' : 'scale(1)',
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hovered ? `${ac}18` : (isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
          border: `1px solid ${hovered ? ac + '35' : T.border}`,
          color: hovered ? ac : T.muted,
          transition: 'all 0.22s ease',
          flexShrink: 0,
        }}>
          <Icon size={17} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: hovered ? T.text : T.muted, transition: 'color 0.2s' }}>
            {label}
          </p>
          {subtitle && (
            <p style={{ fontSize: 11, color: T.dimmed, marginTop: 2 }}>{subtitle}</p>
          )}
        </div>
      </div>
      {rightEl ?? <ChevronRight size={16} style={{ color: hovered ? ac : T.dimmed, transition: 'color 0.2s' }} />}
    </button>
  );
};

/* ══════════════════════════════════════════════════════════════
   PERSONAL INFORMATION SLIDE-OVER MODAL
══════════════════════════════════════════════════════════════ */
const PersonalInfoModal = ({ profile, onSave, onClose }) => {
  const [form, setForm] = useState({ name: profile.name, email: profile.email, phone: profile.phone ?? '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const { isDarkMode } = useTheme();
  const C = getTokens(isDarkMode);

  const inputStyle = {
    background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    border: `1px solid ${C.border}`,
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
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const { isDarkMode } = useTheme();
  const { pushToast } = useTheme();
  const C = getTokens(isDarkMode);

  const handleSave = async () => {
    setError('');
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      return setError('All password fields are required.');
    }
    if (form.newPassword.length < 8) {
      return setError('New password must be at least 8 characters.');
    }
    if (form.newPassword !== form.confirmPassword) {
      return setError('New passwords do not match.');
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('aura_token') || sessionStorage.getItem('aura_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: form.oldPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update password.');
      setSuccess(true);
      pushToast('Password updated successfully', '#4ade80');
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    border: `1px solid ${C.border}`,
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

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#f87171', fontWeight: 600 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.30)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#4ade80', fontWeight: 600 }}>
            Password updated!
          </div>
        )}

        <ModalFooter onClose={onClose} onSave={handleSave} saveLabel={saving ? 'Updating…' : 'Update Password'} />
      </div>
    </SlideOverShell>
  );
};

/* ── Shared slide-over shell ─────────────────────────────── */
const SlideOverShell = ({ title, children, onClose }) => {
  const { isDarkMode } = useTheme();
  const C = getTokens(isDarkMode);
  return (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      background: isDarkMode ? 'rgba(8,16,13,0.72)' : 'rgba(240,236,228,0.72)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}
    onClick={e => e.target === e.currentTarget && onClose()}
  >
    <div
      style={{
        width: '100%', maxWidth: 440, height: '100%',
        background: isDarkMode
          ? 'linear-gradient(170deg, rgba(18,28,24,0.98) 0%, rgba(10,20,16,0.99) 100%)'
          : 'linear-gradient(170deg, rgba(255,253,248,0.99) 0%, rgba(245,240,232,0.99) 100%)',
        borderLeft: `1px solid ${C.gold}22`,
        boxShadow: `-40px 0 100px rgba(0,0,0,0.35), 0 0 0 1px ${C.gold}0a`,
        display: 'flex', flexDirection: 'column',
        animation: 'slide-in-right 0.35s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 28px 20px', borderBottom: `1px solid ${C.border}`,
      }}>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
          {title}
        </h3>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: 10, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          background: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          border: `1px solid ${C.border}`, color: C.muted,
        }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {children}
      </div>
    </div>
  </div>
  );
};

/* ── Modal footer ────────────────────────────────────────── */
const ModalFooter = ({ onClose, onSave, saveLabel = 'Save Changes' }) => {
  const { isDarkMode } = useTheme();
  const C = getTokens(isDarkMode);
  return (
  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
    <button onClick={onClose} style={{
      flex: 1, padding: '13px 0', borderRadius: 14, fontWeight: 700,
      fontSize: 14, cursor: 'pointer', border: `1px solid ${C.border}`,
      background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: C.muted,
    }}>
      Cancel
    </button>
    <button onClick={onSave} style={{
      flex: 1, padding: '13px 0', borderRadius: 14, fontWeight: 800,
      fontSize: 14, cursor: 'pointer', border: 'none',
      background: `linear-gradient(135deg, ${C.gold}, #D4AF37)`,
      color: '#08100D', boxShadow: `0 8px 24px rgba(227,197,152,0.35)`,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Check size={14} /> {saveLabel}
      </span>
    </button>
  </div>
  );
};

/* ── Field label ─────────────────────────────────────────── */
const FieldLabel = ({ children }) => {
  const { isDarkMode } = useTheme();
  const C = getTokens(isDarkMode);
  return (
  <p style={{
    fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
    letterSpacing: '0.16em', color: C.gold, marginBottom: 8, marginTop: 0,
  }}>
    {children}
  </p>
  );
};

/* ── Logout confirmation modal ───────────────────────────── */
const LogoutModal = ({ onConfirm, onCancel }) => {
  const { isDarkMode } = useTheme();
  const C = getTokens(isDarkMode);
  return (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: isDarkMode ? 'rgba(8,16,13,0.82)' : 'rgba(240,236,228,0.82)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    }}
    onClick={e => e.target === e.currentTarget && onCancel()}
  >
    <div style={{
      width: '100%', maxWidth: 400, margin: '0 16px',
      background: isDarkMode
        ? 'linear-gradient(160deg, rgba(26,31,29,0.97) 0%, rgba(13,26,21,0.99) 100%)'
        : 'linear-gradient(160deg, rgba(255,253,248,0.99) 0%, rgba(245,240,232,0.99) 100%)',
      border: '1px solid rgba(248,113,113,0.25)',
      borderRadius: 28,
      boxShadow: isDarkMode ? '0 40px 100px rgba(0,0,0,0.70)' : '0 20px 60px rgba(0,0,0,0.15)',
      padding: 36,
      animation: 'fade-up 0.3s cubic-bezier(0.22,1,0.36,1) both',
    }}>
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
          fontSize: 14, cursor: 'pointer', border: `1px solid ${C.border}`,
          background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: C.muted,
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
};

/* ══════════════════════════════════════════════════════════════
   TWO-FACTOR AUTHENTICATION SECTION COMPONENT
══════════════════════════════════════════════════════════════ */
const TwoFASection = ({ twoFactorEnabled, onStatusChange }) => {
  const { isDarkMode } = useTheme();
  const { pushToast } = useTheme();
  const C = getTokens(isDarkMode);

  const [phase, setPhase] = useState('idle'); // idle | setup | confirm | disable
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = {
    background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    border: `1px solid ${C.border}`,
    color: C.text, borderRadius: 14, padding: '12px 16px', width: '100%',
    fontSize: 15, fontWeight: 700, outline: 'none', boxSizing: 'border-box',
    letterSpacing: '0.18em', textAlign: 'center',
    fontFamily: "'Outfit', sans-serif",
  };

  const handleSetup = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/2fa/setup');
      setQr(data.qr);
      setSecret(data.secret);
      setPhase('confirm');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start 2FA setup.');
    } finally {
      setBusy(false);
    }
  };

  const handleEnable = async () => {
    if (code.length !== 6) return setError('Please enter the 6-digit code from your authenticator app.');
    setBusy(true); setError('');
    try {
      await api.post('/2fa/enable', { code });
      pushToast('Two-factor authentication enabled', '#4ade80');
      setPhase('idle'); setCode('');
      onStatusChange(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (code.length !== 6) return setError('Please enter your 6-digit code to confirm.');
    setBusy(true); setError('');
    try {
      await api.post('/2fa/disable', { code });
      pushToast('Two-factor authentication disabled', C.gold);
      setPhase('idle'); setCode('');
      onStatusChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setPhase('idle'); setCode(''); setError(''); setQr(''); setSecret(''); };

  return (
    <div style={{
      borderRadius: 24, overflow: 'hidden',
      background: C.bg,
      border: `1px solid ${twoFactorEnabled ? 'rgba(74,222,128,0.22)' : C.border}`,
      backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)',
      boxShadow: twoFactorEnabled
        ? '0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(74,222,128,0.08)'
        : isDarkMode ? '0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)' : '0 8px 32px rgba(0,0,0,0.08)',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.gold, margin: 0 }}>
          Two-Factor Authentication
        </p>
        {twoFactorEnabled && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 800,
            background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.30)', color: '#4ade80',
          }}>
            <ShieldCheck size={12} /> 2FA Enabled
          </span>
        )}
      </div>

      <div style={{ padding: '20px 20px 20px' }}>
        {/* IDLE — 2FA OFF */}
        {!twoFactorEnabled && phase === 'idle' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <KeyRound size={20} style={{ color: C.muted }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Two-Factor Authentication</p>
                <p style={{ fontSize: 11, color: C.dimmed, marginTop: 2 }}>Add an extra layer of security to your account</p>
              </div>
            </div>
            <button
              onClick={handleSetup}
              disabled={busy}
              style={{
                flexShrink: 0, padding: '10px 18px', borderRadius: 14, fontWeight: 800,
                fontSize: 13, cursor: busy ? 'not-allowed' : 'pointer', border: 'none',
                background: `linear-gradient(135deg, ${C.gold}, #D4AF37)`,
                color: '#08100D', boxShadow: `0 6px 18px rgba(227,197,152,0.30)`,
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? 'Loading…' : 'Enable 2FA'}
            </button>
          </div>
        )}

        {/* SETUP / CONFIRM phase — show QR + secret + code input */}
        {!twoFactorEnabled && phase === 'confirm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code below.
            </p>
            {qr && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  padding: 12, borderRadius: 16, background: '#fff',
                  border: `2px solid ${C.gold}44`, display: 'inline-block',
                  boxShadow: `0 8px 24px rgba(0,0,0,0.25)`,
                }}>
                  <img src={qr} alt="2FA QR Code" style={{ width: 160, height: 160, display: 'block' }} />
                </div>
              </div>
            )}
            {secret && (
              <div style={{
                background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 14px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.gold, margin: '0 0 6px' }}>
                  Manual Entry Key
                </p>
                <code style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: '0.12em', wordBreak: 'break-all' }}>
                  {secret}
                </code>
              </div>
            )}
            <div>
              <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em', color: C.gold, marginBottom: 8, marginTop: 0 }}>
                6-Digit Code
              </p>
              <input
                style={inputStyle}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#f87171', fontWeight: 600 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={reset} style={{
                flex: 1, padding: '12px 0', borderRadius: 14, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                border: `1px solid ${C.border}`, background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: C.muted,
              }}>
                Cancel
              </button>
              <button onClick={handleEnable} disabled={busy || code.length !== 6} style={{
                flex: 2, padding: '12px 0', borderRadius: 14, fontWeight: 800, fontSize: 13,
                cursor: (busy || code.length !== 6) ? 'not-allowed' : 'pointer', border: 'none',
                background: (busy || code.length !== 6) ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${C.gold}, #D4AF37)`,
                color: (busy || code.length !== 6) ? C.dimmed : '#08100D',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Check size={14} /> {busy ? 'Verifying…' : 'Confirm & Enable'}
              </button>
            </div>
          </div>
        )}

        {/* IDLE — 2FA ON */}
        {twoFactorEnabled && phase === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldCheck size={20} style={{ color: '#4ade80' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Two-factor authentication is active</p>
                <p style={{ fontSize: 11, color: C.dimmed, marginTop: 2 }}>Your account is protected with an authenticator app</p>
              </div>
            </div>
            <button
              onClick={() => { setPhase('disable'); setError(''); setCode(''); }}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 14, fontWeight: 700, fontSize: 13,
                cursor: 'pointer', border: '1px solid rgba(248,113,113,0.25)',
                background: 'rgba(248,113,113,0.08)', color: '#f87171',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.40)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; }}
            >
              <ShieldOff size={14} /> Disable 2FA
            </button>
          </div>
        )}

        {/* DISABLE phase */}
        {twoFactorEnabled && phase === 'disable' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              Enter the 6-digit code from your authenticator app to confirm disabling 2FA.
            </p>
            <div>
              <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em', color: C.gold, marginBottom: 8, marginTop: 0 }}>
                6-Digit Code
              </p>
              <input
                style={inputStyle}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#f87171', fontWeight: 600 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={reset} style={{
                flex: 1, padding: '12px 0', borderRadius: 14, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                border: `1px solid ${C.border}`, background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: C.muted,
              }}>
                Cancel
              </button>
              <button onClick={handleDisable} disabled={busy || code.length !== 6} style={{
                flex: 2, padding: '12px 0', borderRadius: 14, fontWeight: 800, fontSize: 13,
                cursor: (busy || code.length !== 6) ? 'not-allowed' : 'pointer',
                border: '1px solid rgba(248,113,113,0.35)',
                background: (busy || code.length !== 6) ? 'rgba(248,113,113,0.05)' : 'rgba(248,113,113,0.14)',
                color: (busy || code.length !== 6) ? 'rgba(248,113,113,0.4)' : '#f87171',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <ShieldOff size={14} /> {busy ? 'Disabling…' : 'Confirm Disable'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   PROFILE PAGE
══════════════════════════════════════════════════════════════ */
const Profile = () => {
  const { user, logout, updateUser, verifyTwoFactor } = useContext(AuthContext);
  const { isDarkMode, toggleDarkMode, notificationsEnabled, toggleNotifications, pushToast } = useTheme();
  const C = getTokens(isDarkMode);

  /* ── Avatar upload ── */
  const fileInputRef = useRef(null);
  const [avatarUrl, setAvatarUrl]   = useState(user?.avatar ?? null);
  const [uploading, setUploading]   = useState(false);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { pushToast('Image must be under 2 MB', '#f87171'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/profile/avatar', formData);
      setAvatarUrl(data.avatar);
      updateUser(prev => ({ ...prev, avatar: data.avatar }));
      pushToast('Profile picture updated', C.gold);
    } catch {
      pushToast('Upload failed', '#f87171');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await api.delete('/profile/avatar');
      setAvatarUrl(null);
      updateUser(prev => ({ ...prev, avatar: null }));
      pushToast('Profile picture removed', C.gold);
    } catch {
      pushToast('Failed to remove picture', '#f87171');
    }
  };

  /* ── Local user profile state ── */
  const [userProfile, setUserProfile] = useState({
    name:  user?.name  ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    role:  user?.role === 'admin' ? 'Admin' : 'House Resident',
    houseCode: user?.houseCode ?? '',
  });
  const [houseCodeCopied, setHouseCodeCopied] = useState(false);

  /* ── 2FA state — read from user context, can be updated locally ── */
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? false);

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
      background: C.bg,
      border: `1px solid ${C.border}`,
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
      boxShadow: isDarkMode ? '0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)' : '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
    }}>
      <div style={{ padding: '18px 20px 12px', borderBottom: `1px solid ${C.border}` }}>
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
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />

              {/* Avatar ring */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <div
                  onClick={handleAvatarClick}
                  title="Click to change profile picture"
                  style={{
                    width: 90, height: 90, borderRadius: '50%',
                    background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${C.gold}44, #a78bfa33)`,
                    border: `2px solid ${C.gold}50`,
                    boxShadow: `0 0 30px ${C.gold}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 30, fontWeight: 900, color: C.gold,
                    fontFamily: "'Outfit', sans-serif",
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials}
                  {/* Hover overlay */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: uploading ? 1 : 0,
                    transition: 'opacity 0.2s',
                  }} className="avatar-hover-overlay">
                    <Camera size={20} color="#fff" />
                  </div>
                </div>
                {/* Camera badge */}
                <button
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  title="Upload photo"
                  style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 28, height: 28, borderRadius: '50%',
                    background: C.gold, border: '2px solid ' + (isDarkMode ? '#08100D' : '#fff'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}>
                  <Camera size={13} style={{ color: '#08100D' }} />
                </button>
                {/* Online dot */}
                <div style={{
                  position: 'absolute', bottom: 4, right: 4,
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#4ade80', border: '2px solid #08100D',
                  boxShadow: '0 0 8px #4ade80',
                }} />
              </div>

              {/* Upload / Remove buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={handleAvatarClick} disabled={uploading}
                  style={{
                    padding: '6px 14px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                    background: `${C.gold}18`, border: `1px solid ${C.gold}40`, color: C.gold, cursor: 'pointer',
                  }}>
                  {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
                </button>
                {avatarUrl && (
                  <button onClick={handleRemoveAvatar}
                    style={{
                      padding: '6px 14px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.30)',
                      color: '#f87171', cursor: 'pointer',
                    }}>
                    Remove
                  </button>
                )}
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
                rightEl={<GlassToggle isOn={notificationsEnabled} accent="#4ade80" onToggle={(e) => { e.stopPropagation(); handlePreferenceChange('notifications'); }} />}
              />
              <SettingRow
                icon={Moon}
                label="Dark Mode Appearance"
                subtitle={isDarkMode ? 'On — rich & moody' : 'Off — light theme'}
                accent="#a78bfa"
                onClick={() => handlePreferenceChange('darkMode')}
                rightEl={<GlassToggle isOn={isDarkMode} accent="#a78bfa" onToggle={(e) => { e.stopPropagation(); handlePreferenceChange('darkMode'); }} />}
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

            {/* Two-Factor Authentication */}
            <TwoFASection
              twoFactorEnabled={twoFactorEnabled}
              onStatusChange={(enabled) => {
                setTwoFactorEnabled(enabled);
                updateUser(prev => ({ ...prev, twoFactorEnabled: enabled }));
              }}
            />

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
