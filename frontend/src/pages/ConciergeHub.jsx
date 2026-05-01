import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicMotionShell from '../components/PublicMotionShell';
import api from '../api/axios';

const ConciergeHub = () => {
  const navigate = useNavigate();
  const [houses, setHouses] = useState([]);
  const sseRef = useRef(null);

  const code = typeof window !== 'undefined' ? window.sessionStorage.getItem('conciergeCode') : null;

  useEffect(() => {
    if (!code) {
      // guard: only accessible via About page code entry
      navigate('/about');
      return;
    }

    const fetchHouses = async () => {
      try {
        const res = await api.get(`/concierge/houses?code=${encodeURIComponent(code)}`);
        setHouses(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load houses', err);
      }
    };

    fetchHouses();

    // open SSE
    const es = new EventSource(`/api/concierge/stream?code=${encodeURIComponent(code)}`);
    sseRef.current = es;

    es.addEventListener('admin-connected', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setHouses((prev) => {
          const found = prev.find((p) => p.houseCode === payload.houseCode);
          if (found) return prev.map((h) => (h.houseCode === payload.houseCode ? { ...h, online: true } : h));
          // fetch latest list if new
          return prev;
        });
      } catch (err) {}
    });

    es.addEventListener('admin-disconnected', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setHouses((prev) => prev.map((h) => (h.houseCode === payload.houseCode ? { ...h, online: false } : h)));
      } catch (err) {}
    });

    es.addEventListener('unit-updated', (e) => {
      try {
        const unit = JSON.parse(e.data);
        setHouses((prev) => prev.map((h) => (h.houseCode === unit.houseCode ? { ...h, lastActivity: Date.now() } : h)));
      } catch (err) {}
    });

    es.onerror = () => {
      // try reconnect handled by EventSource automatically in browsers
    };

    return () => {
      try { es.close(); } catch (e) {}
    };
  }, [code, navigate]);

  return (
    <PublicMotionShell>
      <main className="mx-auto w-[min(92%,1100px)] px-2 py-8">
        <h1 className="text-2xl font-bold text-white mb-4">Concierge Hub</h1>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <p className="text-sm text-zinc-300 mb-3">Monitoring view for houses (concierge-level).</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-zinc-400 uppercase">
                  <th className="px-3 py-2">House</th>
                  <th className="px-3 py-2">House Code</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Activity</th>
                </tr>
              </thead>
              <tbody>
                {houses.map((h) => (
                  <tr key={h.houseCode} className="border-t border-white/6">
                    <td className="px-3 py-3 font-mono font-bold">House {h.houseNumber}</td>
                    <td className="px-3 py-3">{h.houseCode}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${h.online ? 'bg-green-800 text-green-300' : 'bg-red-900 text-red-300'}`}>
                        {h.online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-zinc-300">{h.lastActivity ? new Date(h.lastActivity).toLocaleString() : (h.createdAt ? new Date(h.createdAt).toLocaleString() : '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </PublicMotionShell>
  );
};

export default ConciergeHub;
