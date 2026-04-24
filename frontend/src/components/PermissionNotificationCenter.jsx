import { useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, CheckCheck, Clock3, ShieldCheck, ShieldX, UserRound } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const statusStyles = {
  pending: 'border-zinc-400/35 bg-zinc-200/10 text-zinc-100',
  approved: 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100',
  denied: 'border-rose-300/40 bg-rose-400/15 text-rose-100',
};

const statusIcon = {
  pending: Clock3,
  approved: ShieldCheck,
  denied: ShieldX,
};

const prettyDate = (dateString) => {
  if (!dateString) return 'Unknown time';
  return new Date(dateString).toLocaleString();
};

const PermissionNotificationCenter = ({ isOpen, setIsOpen }) => {
  const {
    user,
    myPermissionRequests,
    adminPermissionRequests,
    reviewPermissionRequest,
    markPermissionNotificationAsRead,
    markAllPermissionNotificationsAsRead,
    getUnreadPermissionCount,
  } = useContext(AuthContext);

  const [busyKey, setBusyKey] = useState('');
  const [tab, setTab] = useState('all');
  const [expandedRequestId, setExpandedRequestId] = useState('');

  const requests = user?.role === 'admin' ? adminPermissionRequests : myPermissionRequests;
  const unreadCount = getUnreadPermissionCount();

  const { pending, history } = useMemo(() => {
    const pendingItems = requests.filter((request) => request.status === 'pending');
    const historyItems = requests.filter((request) => request.status !== 'pending');
    return { pending: pendingItems, history: historyItems };
  }, [requests]);

  const visibleRequests = tab === 'history' ? history : requests;

  const isUnread = (request) => {
    if (user?.role === 'admin') return !request.adminReadAt;
    return !request.requesterReadAt;
  };

  const requestMessage = (request) => {
    if (user?.role === 'admin') {
      return `${request.residentName || request.requester?.name || 'Resident'} requested: ${request.requestedAction || request.actionLabel}`;
    }

    if (request.status === 'approved') return 'Your request has been approved';
    if (request.status === 'denied') return 'Your request has been denied';
    return 'Your request is pending';
  };

  const handleReview = async (requestId, decision) => {
    setBusyKey(`${requestId}:${decision}`);
    try {
      await reviewPermissionRequest({ requestId, decision });
    } finally {
      setBusyKey('');
    }
  };

  const markSingleAsRead = async (requestId) => {
    try {
      await markPermissionNotificationAsRead(requestId);
    } catch {
      // Ignore temporary network errors in panel interactions.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-200/35 bg-sky-300/20 text-sky-100 shadow-[0_12px_35px_rgba(14,165,233,0.3)] backdrop-blur-md transition hover:scale-105"
      >
        <Bell size={22} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-300 px-1.5 py-0.5 text-[10px] font-black text-rose-950">
            {unreadCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 z-40 w-[min(92vw,430px)] rounded-3xl border border-white/15 bg-zinc-950/90 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-300">Notifications</p>
                <h3 className="mt-1 text-lg font-black text-white">
                  {unreadCount > 0 ? `${unreadCount} new requests` : 'All caught up'}
                </h3>
              </div>
              <button
                type="button"
                onClick={markAllPermissionNotificationsAsRead}
                className="inline-flex items-center gap-1 rounded-xl border border-white/20 px-2.5 py-1.5 text-xs font-bold text-zinc-200 transition hover:border-sky-300/40 hover:text-sky-100"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => setTab('all')}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${tab === 'all' ? 'bg-sky-300/25 text-sky-100' : 'text-zinc-300 hover:text-white'}`}
              >
                All ({requests.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('history')}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${tab === 'history' ? 'bg-sky-300/25 text-sky-100' : 'text-zinc-300 hover:text-white'}`}
              >
                History ({history.length})
              </button>
            </div>

            <div className="mt-3 max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {visibleRequests.map((request) => {
                const StatusIcon = statusIcon[request.status] || Clock3;
                const unread = isUnread(request);

                return (
                  <article
                    key={request._id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                    onMouseEnter={() => {
                      if (unread) markSingleAsRead(request._id);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${statusStyles[request.status]}`}>
                        <StatusIcon size={12} />
                        {request.status}
                      </span>
                      <div className="flex items-center gap-2">
                        {unread ? <span className="h-2 w-2 rounded-full bg-sky-300" /> : null}
                        <button
                          type="button"
                          onClick={() => markSingleAsRead(request._id)}
                          className="rounded-lg border border-white/15 p-1 text-zinc-300 transition hover:text-white"
                          title="Mark as read"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-white">{requestMessage(request)}</p>

                    {user?.role === 'admin' ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-300">
                        <UserRound size={12} />
                        {request.residentName || request.requester?.name || 'Resident'}
                      </p>
                    ) : null}

                    <p className="mt-1 text-xs text-zinc-400">{prettyDate(request.timestamp || request.createdAt)}</p>

                    <button
                      type="button"
                      onClick={() => setExpandedRequestId((prev) => (prev === request._id ? '' : request._id))}
                      className="mt-2 text-xs font-semibold text-sky-200 transition hover:text-sky-100"
                    >
                      {expandedRequestId === request._id ? 'Hide details' : 'View details'}
                    </button>

                    {expandedRequestId === request._id ? (
                      <div className="mt-2 space-y-1 rounded-xl border border-white/10 bg-black/20 p-2.5 text-xs text-zinc-200">
                        <p><span className="text-zinc-400">Resident:</span> {request.residentName || request.requester?.name || 'Resident'}</p>
                        <p><span className="text-zinc-400">Requested action:</span> {request.requestedAction || request.actionLabel || 'Unknown action'}</p>
                        <p><span className="text-zinc-400">Room/feature:</span> {request.room || 'Global'}</p>
                        <p><span className="text-zinc-400">Reason:</span> {request.reason || 'No reason provided'}</p>
                        <p><span className="text-zinc-400">Requested at:</span> {prettyDate(request.timestamp || request.createdAt)}</p>
                      </div>
                    ) : null}

                    {user?.role === 'admin' && request.status === 'pending' ? (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleReview(request._id, 'approved')}
                          disabled={busyKey === `${request._id}:approved` || busyKey === `${request._id}:denied`}
                          className="rounded-xl bg-emerald-300 px-3 py-1.5 text-xs font-black text-emerald-950 transition hover:brightness-105 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReview(request._id, 'denied')}
                          disabled={busyKey === `${request._id}:approved` || busyKey === `${request._id}:denied`}
                          className="rounded-xl bg-rose-300 px-3 py-1.5 text-xs font-black text-rose-950 transition hover:brightness-105 disabled:opacity-60"
                        >
                          Deny
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}

              {visibleRequests.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-300">
                  No notifications yet.
                </div>
              ) : null}
            </div>

            {pending.length > 0 && user?.role === 'admin' ? (
              <p className="mt-3 text-xs font-semibold text-sky-100">Pending requests: {pending.length}</p>
            ) : null}
          </motion.section>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default PermissionNotificationCenter;
