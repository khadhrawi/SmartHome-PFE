import { useState, useRef, useEffect, useContext, Suspense } from 'react';
import { X, Send, Loader2, ChevronDown } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { CatMelo } from './Melo3D';

const SUGGESTIONS = [
  'Turn off all lights',
  "What's the gas level?",
  'Close all doors',
  'Show device status',
];

/* ── Small 3D canvas for chat UI (header, message avatars) ── */
const MiniMascot = ({ size = 40 }) => (
  <Canvas
    frameloop="always"
    style={{ width: size, height: size, pointerEvents: 'none' }}
    camera={{ position: [0, 0.1, 2.8], fov: 50 }}
    gl={{ alpha: true, antialias: true }}
  >
    <ambientLight intensity={0.7} />
    <pointLight position={[2, 3, 3]} intensity={1.2} color="#c4b5fd" />
    <pointLight position={[-2, -1, 2]} intensity={0.5} color="#7c3aed" />
    <Suspense fallback={null}>
      <CatMelo />
    </Suspense>
  </Canvas>
);

/* ── Typing dots ── */
const TypingDots = () => (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '10px 14px' }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 7, height: 7, borderRadius: '50%',
        background: 'rgba(167,139,250,0.7)',
        animation: `melo-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
      }} />
    ))}
  </div>
);

/* ── Chat message ── */
const Message = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      {!isUser && (
        <div style={{ width: 34, height: 34, flexShrink: 0, marginRight: 8, marginTop: 2 }}>
          <MiniMascot size={34} />
        </div>
      )}
      <div style={{
        maxWidth: '78%', padding: '9px 13px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(255,255,255,0.07)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.10)',
        color: '#f1f5f9', fontSize: 13, lineHeight: 1.55,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  );
};

/* ══ Main Companion Component ══ */
const AuraCompanion = () => {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - 130, y: window.innerHeight - 130 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const roamRef = useRef(null);
  const posRef = useRef(pos);
  const velRef = useRef({ x: -0.6, y: -0.4 });
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (user && !history) {
      setHistory([{
        role: 'assistant',
        content: `Hi ${user.name?.split(' ')[0] || 'there'}! I'm Melo, your smart home companion 🏠 I can control your devices, check gas levels, and more. What do you need?`,
      }]);
    }
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, loading]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);

  useEffect(() => {
    if (open) return;
    const id = setInterval(() => { setPulse(true); setTimeout(() => setPulse(false), 1000); }, 6000);
    return () => clearInterval(id);
  }, [open]);

  // Roam around the page (pause when chat is open or dragging)
  useEffect(() => {
    if (open || dragging) {
      cancelAnimationFrame(roamRef.current);
      return;
    }
    const SIZE = 108;
    let lastTime = null;
    const step = (ts) => {
      if (lastTime === null) { lastTime = ts; roamRef.current = requestAnimationFrame(step); return; }
      const dt = Math.min(ts - lastTime, 50);
      lastTime = ts;
      const speed = 0.09; // px per ms
      const dx = velRef.current.x * speed * dt;
      const dy = velRef.current.y * speed * dt;
      let nx = posRef.current.x + dx;
      let ny = posRef.current.y + dy;
      const maxX = window.innerWidth - SIZE;
      const maxY = window.innerHeight - SIZE;
      if (nx < 0) { nx = 0; velRef.current.x *= -1; }
      if (nx > maxX) { nx = maxX; velRef.current.x *= -1; }
      if (ny < 0) { ny = 0; velRef.current.y *= -1; }
      if (ny > maxY) { ny = maxY; velRef.current.y *= -1; }
      posRef.current = { x: nx, y: ny };
      setPos({ x: nx, y: ny });
      roamRef.current = requestAnimationFrame(step);
    };
    roamRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(roamRef.current);
  }, [open, dragging]);

  // Drag handlers
  const mouseDownPos = useRef(null);
  const hasDragged = useRef(false);

  const onMouseDown = (e) => {
    e.preventDefault();
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;
    dragOffset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
    setDragging(true);
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - mouseDownPos.current.x;
    const dy = e.clientY - mouseDownPos.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasDragged.current = true;
    const nx = e.clientX - dragOffset.current.x;
    const ny = e.clientY - dragOffset.current.y;
    posRef.current = { x: nx, y: ny };
    setPos({ x: nx, y: ny });
  };
  const onMouseUp = () => setDragging(false);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    const next = [...(history || []), { role: 'user', content: msg }];
    setHistory(next);
    setLoading(true);
    try {
      // Only send plain text messages (no tool-call leftovers)
      const cleanHistory = (history || []).filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: String(m.content || '') }));
      const { data } = await api.post('/companion/chat', { message: msg, history: cleanHistory });
      setHistory(h => [...h, { role: 'assistant', content: data.reply }]);
      // Force floor plan refresh if devices were controlled
      if (data.actionsExecuted) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('melo:refresh-devices'));
        }, 400);
      }
    } catch (err) {
      setHistory(h => [...h, { role: 'assistant', content: err.response?.data?.message || 'Oops, something went wrong!' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <>
      <style>{`
        @keyframes melo-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes melo-pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes melo-appear {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Chat panel — anchored near mascot */}
      {open && (
        <div style={{
          position: 'fixed',
          left: Math.min(pos.x, window.innerWidth - 384),
          top: Math.max(pos.y - 520, 8),
          zIndex: 1000,
          width: 360, height: 500,
          background: 'linear-gradient(160deg, rgba(18,10,40,0.97) 0%, rgba(10,6,28,0.99) 100%)',
          border: '1px solid rgba(139,92,246,0.30)',
          borderRadius: 24,
          boxShadow: '0 32px 80px rgba(0,0,0,0.70), 0 0 60px rgba(109,40,217,0.15)',
          display: 'flex', flexDirection: 'column',
          animation: 'melo-appear 0.3s cubic-bezier(0.22,1,0.36,1) both',
          backdropFilter: 'blur(24px)',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(139,92,246,0.18)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, flexShrink: 0 }}>
              <MiniMascot size={44} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 14, color: '#f1f5f9' }}>Melo</p>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(167,139,250,0.7)', fontWeight: 600 }}>AI Smart Home Companion</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent' }}>
            {(history || []).map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                  <MiniMascot size={34} />
                </div>
                <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '18px 18px 18px 4px' }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {history?.length <= 1 && (
            <div style={{ padding: '6px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.28)', color: '#c4b5fd',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.22)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.12)'; }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 14px 14px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Melo anything…"
              rows={1}
              style={{
                flex: 1, resize: 'none', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(139,92,246,0.25)', borderRadius: 14,
                color: '#f1f5f9', fontSize: 13, padding: '10px 14px', outline: 'none',
                fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 80, overflowY: 'auto',
              }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'; }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0, border: 'none', cursor: 'pointer',
                background: input.trim() && !loading ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(139,92,246,0.15)',
                color: input.trim() && !loading ? '#fff' : 'rgba(167,139,250,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: input.trim() && !loading ? '0 4px 14px rgba(139,92,246,0.4)' : 'none',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}

      {/* Floating 3D cat mascot */}
      <div
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ position: 'fixed', inset: 0, zIndex: 1001, pointerEvents: dragging ? 'all' : 'none' }}
      />
      <div style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 1001, transition: dragging ? 'none' : 'none' }}>
        {/* Pulse ring */}
        {pulse && !open && (
          <div style={{
            position: 'absolute', inset: -10, borderRadius: '50%',
            border: '2px solid rgba(139,92,246,0.6)',
            animation: 'melo-pulse-ring 1s ease-out forwards',
            pointerEvents: 'none',
          }} />
        )}

        {/* 3D canvas button */}
        <div
          onMouseDown={onMouseDown}
          onClick={() => { if (!hasDragged.current) setOpen(o => !o); }}
          title="Open Melo — drag to move"
          style={{
            width: 100, height: 100,
            cursor: dragging ? 'grabbing' : 'grab',
            filter: open
              ? 'drop-shadow(0 0 14px rgba(139,92,246,0.5))'
              : 'drop-shadow(0 0 22px rgba(139,92,246,0.75))',
            transition: 'filter 0.3s ease',
          }}
        >
          {open ? (
            /* Close button when chat is open */
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'linear-gradient(145deg, #1e1b4b, #2e1065)',
              border: '2px solid rgba(139,92,246,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(109,40,217,0.5)',
            }}>
              <X size={28} color="#c4b5fd" />
            </div>
          ) : (
            <Canvas
              frameloop="always"
              style={{ width: 100, height: 100 }}
              camera={{ position: [0, 0.05, 2.5], fov: 52 }}
              gl={{ alpha: true, antialias: true }}
            >
              <ambientLight intensity={0.7} />
              <pointLight position={[2, 4, 3]} intensity={1.5} color="#c4b5fd" />
              <pointLight position={[-2, -1, 2]} intensity={0.6} color="#7c3aed" />
              <pointLight position={[0, -3, 1]} intensity={0.3} color="#4c1d95" />
              <Suspense fallback={null}>
                <CatMelo />
              </Suspense>
            </Canvas>
          )}
        </div>
      </div>
    </>
  );
};

export default AuraCompanion;
