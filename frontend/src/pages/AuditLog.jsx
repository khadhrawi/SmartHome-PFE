import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Zap, User, ClipboardList, Settings, Lock,
  RefreshCw, Loader2, ChevronDown, Download, FileText
} from 'lucide-react';
import api from '../api/axios';
import { jsPDF } from 'jspdf';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORY_META = {
  all:      { label: 'All',      color: '#e4e4e7', border: 'rgba(228,228,231,0.35)' },
  auth:     { label: 'Auth',     color: '#60a5fa', border: 'rgba(96,165,250,0.50)' },
  device:   { label: 'Device',   color: '#fbbf24', border: 'rgba(251,191,36,0.50)' },
  security: { label: 'Security', color: '#f87171', border: 'rgba(248,113,113,0.50)' },
  user:     { label: 'User',     color: '#4ade80', border: 'rgba(74,222,128,0.50)' },
  scenario: { label: 'Scenario', color: '#a78bfa', border: 'rgba(167,139,250,0.50)' },
  system:   { label: 'System',   color: '#94a3b8', border: 'rgba(148,163,184,0.50)' },
};

const CATEGORY_ICONS = {
  auth:     Lock,
  device:   Zap,
  security: Shield,
  user:     User,
  scenario: Settings,
  system:   Settings,
};

const ROLE_META = {
  owner:    { label: 'Owner',    bg: 'rgba(227,197,152,0.15)', border: 'rgba(227,197,152,0.35)', color: '#E3C598' },
  resident: { label: 'Resident', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.28)',  color: '#60a5fa' },
  admin:    { label: 'Admin',    bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.28)', color: '#f87171' },
  system:   { label: 'System',   bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.28)', color: '#94a3b8' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const RoleBadge = ({ role }) => {
  const m = ROLE_META[role?.toLowerCase()] || ROLE_META.system;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
      style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.color }}
    >
      {m.label}
    </span>
  );
};

const LogEntry = ({ entry }) => {
  const cat = entry.category?.toLowerCase() || 'system';
  const meta = CATEGORY_META[cat] || CATEGORY_META.system;
  const Icon = CATEGORY_ICONS[cat] || Settings;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="relative flex gap-4 rounded-2xl border overflow-hidden px-5 py-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderLeft: `3px solid ${meta.color}`,
      }}
    >
      {/* Icon */}
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
        style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}35` }}
      >
        <Icon size={16} style={{ color: meta.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-snug truncate">{entry.action}</p>
            {entry.details && (
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{entry.details}</p>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 shrink-0 mt-0.5">{timeAgo(entry.createdAt)}</p>
        </div>

        {/* Actor row */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {entry.actorName && (
            <span className="text-xs text-zinc-300 font-semibold">{entry.actorName}</span>
          )}
          {entry.actorRole && <RoleBadge role={entry.actorRole} />}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: `${meta.color}14`,
              border: `1px solid ${meta.color}30`,
              color: meta.color,
            }}
          >
            {meta.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const LIMIT = 20;

const AuditLog = () => {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState('all');
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(true);
  const [error, setError]       = useState('');
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchLogs = useCallback(async (cat, pg, replace = false) => {
    replace ? setLoading(true) : setLoadingMore(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (cat !== 'all') params.append('category', cat);
      const { data } = await api.get(`/audit?${params}`);
      const entries = Array.isArray(data?.logs) ? data.logs : Array.isArray(data) ? data : [];
      setLogs(prev => replace ? entries : [...prev, ...entries]);
      setHasMore(entries.length === LIMIT);
      setLastRefresh(Date.now());
    } catch {
      setError('Failed to load audit logs.');
    } finally {
      replace ? setLoading(false) : setLoadingMore(false);
    }
  }, []);

  // Initial fetch + category change
  useEffect(() => {
    setPage(1);
    setLogs([]);
    fetchLogs(category, 1, true);
  }, [category, fetchLogs]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(() => {
      fetchLogs(category, 1, true);
      setPage(1);
    }, 30000);
    return () => clearInterval(id);
  }, [category, fetchLogs]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchLogs(category, next, false);
  };

  const handleManualRefresh = () => {
    setPage(1);
    fetchLogs(category, 1, true);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('SmartHome — Audit Report', pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleString()}   ·   ${logs.length} entries`, pageW / 2, y, { align: 'center' });
    y += 10;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, pageW - 15, y);
    y += 8;

    // Entries
    logs.forEach((e, i) => {
      if (y > 270) { doc.addPage(); y = 20; }

      const cat = String(e.category || 'system').toUpperCase();
      const date = new Date(e.createdAt).toLocaleString();

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(`${i + 1}. ${e.action}`, 15, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`${cat}  ·  ${e.actorName || 'System'}  ·  ${date}`, 18, y);
      y += 4;

      if (e.details) {
        const lines = doc.splitTextToSize(e.details, pageW - 36);
        doc.setTextColor(130, 130, 130);
        doc.text(lines, 18, y);
        y += lines.length * 4;
      }
      y += 4;
    });

    doc.save(`audit-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportCSV = () => {
    const header = 'Date,Category,Action,Details,Actor,Role\n';
    const rows = logs.map(e => {
      const date = new Date(e.createdAt).toLocaleString();
      const escape = v => `"${String(v || '').replace(/"/g, '""')}"`;
      return [date, e.category, e.action, e.details, e.actorName, e.actorRole].map(escape).join(',');
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = Object.keys(CATEGORY_META);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">House Owner</p>
          <h1 className="text-3xl font-black text-white">Audit Log</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Full activity history · auto-refreshes every 30s
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportPDF}
            disabled={logs.length === 0}
            className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/8 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/15 transition disabled:opacity-40"
          >
            <FileText size={13} />
            PDF Report
          </button>
          <button
            onClick={exportCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10 transition disabled:opacity-40"
          >
            <Download size={13} />
            Export CSV
          </button>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10 transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => {
          const m = CATEGORY_META[tab];
          const active = category === tab;
          return (
            <button
              key={tab}
              onClick={() => setCategory(tab)}
              className="rounded-xl px-4 py-2 text-sm font-bold transition"
              style={
                active
                  ? { background: m.color, color: '#18181b' }
                  : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: '#94a3b8',
                    }
              }
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-2xl border border-red-400/25 bg-red-400/8 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Log list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-zinc-500" />
        </div>
      ) : logs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/4 border border-white/8">
            <ClipboardList size={32} className="text-zinc-500" />
          </div>
          <p className="text-zinc-400 font-semibold">No audit entries found.</p>
          <p className="text-xs text-zinc-600 max-w-xs">
            {category !== 'all'
              ? `No "${CATEGORY_META[category]?.label}" events have been recorded yet.`
              : 'Activity will appear here once actions are performed.'}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2.5">
            {logs.map((entry, i) => (
              <LogEntry key={entry._id ?? `${entry.action}-${i}`} entry={entry} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Load more */}
      {!loading && hasMore && logs.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/4 px-6 py-3 text-sm font-bold text-zinc-300 hover:bg-white/8 transition disabled:opacity-50"
          >
            {loadingMore ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <ChevronDown size={15} />
            )}
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {/* End-of-list indicator */}
      {!loading && !hasMore && logs.length > 0 && (
        <p className="text-center text-xs text-zinc-600 py-2">
          All {logs.length} entries loaded
        </p>
      )}
    </div>
  );
};

export default AuditLog;
