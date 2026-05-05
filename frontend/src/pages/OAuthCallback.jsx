import { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Key, AlertTriangle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const { loginWithOAuthData, verifyTwoFactor } = useContext(AuthContext);
  const navigate = useNavigate();

  const [twoFAStep, setTwoFAStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const rawData = searchParams.get('data');
    const oauthError = searchParams.get('oauthError');

    if (oauthError || !rawData) {
      navigate('/auth/choose?oauthError=1');
      return;
    }

    try {
      const data = JSON.parse(decodeURIComponent(rawData));

      if (data.requiresTwoFactor) {
        setTempToken(data.tempToken);
        setTwoFAStep(true);
        return;
      }

      loginWithOAuthData(data);
      if (!data.houseCode) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch {
      navigate('/auth/choose?oauthError=1');
    }
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6 || loading) return;
    setError('');
    setLoading(true);
    const res = await verifyTwoFactor(code, tempToken);
    setLoading(false);
    if (res.success) {
      navigate('/dashboard');
      return;
    }
    setError(res.error || 'Invalid code. Try again.');
  };

  if (twoFAStep) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-white/5 p-8 shadow-xl backdrop-blur-xl">
          <h2 className="mb-2 text-center text-2xl font-extrabold text-white">Two-Factor Auth</h2>
          <p className="mb-6 text-center text-sm text-zinc-400">Enter the 6-digit code from your authenticator app.</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              <AlertTriangle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
              <Key size={17} className="text-zinc-400" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-transparent text-center text-xl font-bold tracking-[0.4em] text-white outline-none placeholder:text-zinc-500"
                placeholder="000000"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={code.length !== 6 || loading}
              className="flex w-full items-center justify-center rounded-2xl bg-sky-300 py-3.5 text-sm font-bold text-sky-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify & Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 size={36} className="animate-spin text-sky-300" />
    </div>
  );
};

export default OAuthCallback;
