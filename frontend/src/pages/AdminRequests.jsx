import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';

const AdminRequests = () => {
  const { fetchAdminRequests, reviewPermissionRequest, adminPermissionRequests } = useContext(AuthContext);
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    fetchAdminRequests();
  }, []);

  const safeRequests = Array.isArray(adminPermissionRequests) ? adminPermissionRequests : [];

  const pendingCount = useMemo(() => safeRequests.filter((request) => request.status === 'pending').length, [safeRequests]);

  const decide = async (requestId, decision) => {
    setBusyId(requestId + decision);
    await reviewPermissionRequest({ requestId, decision });
    setBusyId('');
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-3xl border border-sky-300/30 bg-sky-500/10 p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200">Admin Mode</p>
        <h1 className="mt-2 text-3xl font-black text-white">Permission Requests</h1>
        <p className="mt-2 text-sm text-zinc-100">
          You have full control over all rooms, devices, and user permissions.
        </p>
        <p className="mt-2 text-sm font-semibold text-sky-100">Pending: {pendingCount}</p>
      </section>

      <section className="space-y-3">
        {safeRequests.map((request) => (
          <article key={request._id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-200">
                {request.status}
              </span>
              <p className="text-sm font-bold text-white">{request.actionLabel}</p>
            </div>

            <p className="mt-2 text-xs text-zinc-300">
              User: {request.requester?.name} ({request.requester?.email})
            </p>
            <p className="mt-1 text-xs text-zinc-300">
              Requested room: {request.room || 'Global'}
            </p>

            {request.status === 'pending' ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busyId === request._id + 'approved'}
                  onClick={() => decide(request._id, 'approved')}
                  className="rounded-xl bg-emerald-300 px-3 py-2 text-xs font-bold text-emerald-950 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === request._id + 'denied'}
                  onClick={() => decide(request._id, 'denied')}
                  className="rounded-xl bg-rose-300 px-3 py-2 text-xs font-bold text-rose-950 disabled:opacity-60"
                >
                  Deny
                </button>
              </div>
            ) : null}
          </article>
        ))}

        {safeRequests.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-zinc-300">
            No permission requests yet.
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default AdminRequests;
