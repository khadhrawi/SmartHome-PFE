import { useContext, useState } from 'react';
import { Lock, Send } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const ResidentRestricted = ({ title, description, actionKey, actionLabel, room = '' }) => {
  const { hasApprovedPermission, requestPermission } = useContext(AuthContext);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  const approved = hasApprovedPermission(actionKey, room);

  const onRequest = async () => {
    setBusy(true);
    const res = await requestPermission({ actionKey, actionLabel, room });
    setBusy(false);
    setFeedback(res.success ? 'Permission request sent to admin.' : res.error);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-12">
      <section className="rounded-3xl border border-emerald-300/30 bg-emerald-500/10 p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Resident Mode</p>
        <h1 className="mt-2 text-3xl font-black text-white">{title}</h1>
        <p className="mt-2 text-sm text-zinc-100">{description}</p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-zinc-200">
          <Lock size={12} />
          Restricted Feature
        </div>

        <p className="mt-4 text-sm text-zinc-300">
          This action is outside your assigned room scope and requires explicit admin approval.
        </p>

        {approved ? (
          <p className="mt-4 text-sm font-semibold text-emerald-200">Access approved by admin. Refresh if controls remain locked.</p>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onRequest}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-bold text-emerald-950 disabled:opacity-60"
          >
            <Send size={14} />
            {busy ? 'Sending...' : 'Request Access'}
          </button>
        )}

        {feedback ? <p className="mt-4 text-sm text-emerald-200">{feedback}</p> : null}
      </section>
    </div>
  );
};

export default ResidentRestricted;
