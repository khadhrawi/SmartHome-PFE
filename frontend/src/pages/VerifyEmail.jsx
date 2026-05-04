import { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailCheck, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import PublicMotionShell from '../components/PublicMotionShell';
import { AuthContext } from '../context/AuthContext';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus]   = useState('loading'); // 'loading' | 'success' | 'error' | 'pending'
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent]   = useState(false);

  const { verifyEmail, resendVerification } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('pending');
      return;
    }

    verifyEmail(token).then((res) => {
      if (res.success) {
        setStatus('success');
        setMessage(res.message);
      } else {
        setStatus('error');
        setMessage(res.error);
      }
    });
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail) return;
    const res = await resendVerification(resendEmail);
    if (res.success) setResendSent(true);
  };

  return (
    <PublicMotionShell showNavbar={false}>
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <motion.section
          className="w-full max-w-md rounded-3xl border border-sky-200/30 bg-sky-500/10 p-8 shadow-[0_35px_120px_rgba(0,0,0,0.52)] backdrop-blur-xl text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {status === 'loading' && (
            <>
              <Loader2 size={48} className="mx-auto animate-spin text-sky-300" />
              <p className="mt-4 text-white font-semibold">Verifying your email…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 size={48} className="mx-auto text-emerald-400" />
              <h1 className="mt-4 text-2xl font-extrabold text-white">Email Verified!</h1>
              <p className="mt-2 text-sm text-zinc-300">{message}</p>
              <button
                onClick={() => navigate('/auth/choose')}
                className="mt-8 w-full rounded-2xl bg-emerald-300 py-3.5 text-sm font-bold text-emerald-950"
              >
                Go to Login
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={48} className="mx-auto text-rose-400" />
              <h1 className="mt-4 text-2xl font-extrabold text-white">Verification Failed</h1>
              <p className="mt-2 text-sm text-zinc-300">{message}</p>
              <p className="mt-6 text-sm text-zinc-400">Need a new link? Enter your email below.</p>
              {resendSent ? (
                <p className="mt-3 text-sm text-emerald-300">A new verification email has been sent.</p>
              ) : (
                <form onSubmit={handleResend} className="mt-3 flex gap-2">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-400"
                    required
                  />
                  <button type="submit" className="rounded-xl bg-sky-300 px-4 py-2 text-sm font-bold text-sky-950">
                    Resend
                  </button>
                </form>
              )}
            </>
          )}

          {status === 'pending' && (
            <>
              <MailCheck size={48} className="mx-auto text-sky-300" />
              <h1 className="mt-4 text-2xl font-extrabold text-white">Check Your Email</h1>
              <p className="mt-2 text-sm text-zinc-300">
                We sent you a verification link. Click it to activate your account.
              </p>
              <p className="mt-6 text-sm text-zinc-400">Didn't receive it? Resend below.</p>
              {resendSent ? (
                <p className="mt-3 text-sm text-emerald-300">A new verification email has been sent.</p>
              ) : (
                <form onSubmit={handleResend} className="mt-3 flex gap-2">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-400"
                    required
                  />
                  <button type="submit" className="rounded-xl bg-sky-300 px-4 py-2 text-sm font-bold text-sky-950">
                    Resend
                  </button>
                </form>
              )}
              <button
                onClick={() => navigate('/auth/choose')}
                className="mt-6 w-full text-sm font-semibold text-sky-100"
              >
                Back to login
              </button>
            </>
          )}
        </motion.section>
      </main>
    </PublicMotionShell>
  );
};

export default VerifyEmail;
