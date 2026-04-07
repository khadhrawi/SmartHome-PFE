import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { User, Lock, Mail, Loader2, Wifi, Shield, Thermometer, Home, Zap } from 'lucide-react';

const Register = () => {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const res = await register(name, email, password);
    setIsLoading(false);
    if (res.success) navigate('/dashboard');
    else setError(res.error);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between relative overflow-hidden select-none"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ══ SHARED KEYFRAMES (identical to Login) ══ */}
      <style>{`
        @keyframes softFloat {
          0%,100% { transform: translateY(0px) scale(1);      opacity:0.4; }
          50%      { transform: translateY(-22px) scale(1.1); opacity:0.8; }
        }
        @keyframes twinkle {
          0%,100% { opacity:0.15; } 55% { opacity:0.85; }
        }
        @keyframes windowFlicker {
          0%,100% { opacity:0.75; } 60% { opacity:1; }
        }
        @keyframes moonGlow {
          0%,100% { box-shadow: 0 0 40px rgba(255,240,200,0.25), 0 0 100px rgba(255,220,150,0.1); }
          50%      { box-shadow: 0 0 60px rgba(255,240,200,0.45), 0 0 130px rgba(255,220,150,0.2); }
        }
        @keyframes wifiRing {
          0%   { transform: scale(0.6); opacity:0.8; }
          100% { transform: scale(2);   opacity:0;   }
        }
        @keyframes houseFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes groundGlow {
          0%,100% { opacity:0.5; } 50% { opacity:0.9; }
        }
        @keyframes particleIcon {
          0%,100% { transform: translateY(0)   rotate(0deg);  opacity:0.2;  }
          50%      { transform: translateY(-14px) rotate(8deg); opacity:0.45; }
        }
        .warm-input {
          background: rgba(255,248,235,0.06) !important;
          border: 1px solid rgba(227,197,152,0.22) !important;
          color: #F8F9FA !important;
          transition: border-color 0.3s, box-shadow 0.3s;
          outline: none;
        }
        .warm-input::placeholder { color: rgba(240,220,160,0.35); }
        .warm-input:focus {
          border-color: rgba(227,197,152,0.65) !important;
          box-shadow: 0 0 0 3px rgba(227,197,152,0.12), 0 0 20px rgba(227,197,152,0.15) !important;
        }
      `}</style>

      {/* ══ BACKGROUND ══ */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(160deg,#1a1208 0%,#120e06 25%,#0d0b07 50%,#100c05 75%,#1c1409 100%)'
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 55%, rgba(180,110,20,0.22) 0%, rgba(140,80,10,0.08) 40%, transparent 70%)'
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(30,25,50,0.7) 0%, transparent 55%)'
        }} />

        {/* Stars */}
        {[...Array(70)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={{
            width:  Math.random() * 2 + 0.5,
            height: Math.random() * 2 + 0.5,
            top:  `${Math.random() * 52}%`,
            left: `${Math.random() * 100}%`,
            animation: `twinkle ${2 + Math.random() * 5}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }} />
        ))}

        {/* Moon */}
        <div className="absolute rounded-full" style={{
          width:58, height:58, top:'6%', right:'16%',
          background: 'radial-gradient(circle at 38% 38%,#fff8e8,#e8d8a0 60%,#c8b870)',
          animation: 'moonGlow 5s ease-in-out infinite',
        }} />

        {/* Warm glow orbs */}
        {[
          { w:300, h:300, t:'15%', l:'10%',  op:0.15, d:'0s'   },
          { w:220, h:220, t:'25%', r:'12%',  op:0.10, d:'2s'   },
          { w:350, h:350, t:'40%', l:'40%',  op:0.12, d:'1.5s' },
        ].map((o, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none" style={{
            width: o.w, height: o.h, top: o.t,
            left: o.l ?? 'auto', right: o.r ?? 'auto',
            background: 'radial-gradient(circle,rgba(227,197,152,0.6) 0%,transparent 70%)',
            opacity: o.op,
            animation: `softFloat ${8 + i * 2}s ease-in-out infinite`,
            animationDelay: o.d,
          }} />
        ))}
      </div>

      {/* ══ FLOATING IoT ICONS ══ */}
      {[
        { icon: Wifi,        top:'22%', left:'7%',  delay:'0s',   size:18 },
        { icon: Shield,      top:'30%', left:'84%', delay:'1.4s', size:16 },
        { icon: Thermometer, top:'57%', left:'5%',  delay:'2.2s', size:15 },
        { icon: Zap,         top:'18%', left:'73%', delay:'0.7s', size:15 },
        { icon: Lock,        top:'62%', left:'88%', delay:'1.9s', size:14 },
        { icon: Wifi,        top:'38%', left:'91%', delay:'3.1s', size:13 },
      ].map(({ icon: Icon, top, left, delay, size }, i) => (
        <div key={i} className="fixed pointer-events-none z-10" style={{
          top, left,
          animation: `particleIcon ${5 + i * 0.7}s ease-in-out infinite`,
          animationDelay: delay,
        }}>
          <Icon size={size} color="rgba(227,197,152,0.35)" strokeWidth={1.5} />
        </div>
      ))}

      {/* Hills */}
      <div className="fixed bottom-0 left-0 right-0 z-0 pointer-events-none" style={{ height:'42%' }}>
        <svg viewBox="0 0 1440 270" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
          <path d="M0,270 L0,200 Q180,130 380,175 Q560,218 680,155 Q830,85 1020,165 Q1180,228 1320,142 Q1390,108 1440,158 L1440,270 Z"
            fill="#0e0b06" opacity="0.9"/>
          <path d="M0,270 L0,235 Q200,195 350,218 Q480,238 580,205 Q680,170 820,208 Q970,244 1100,210 Q1230,174 1440,210 L1440,270 Z"
            fill="#0a0805" opacity="1"/>
        </svg>
      </div>

      {/* ══ HOUSE ILLUSTRATION ══ */}
      <div className="fixed z-10 pointer-events-none"
        style={{ bottom:'30%', left:'50%', transform:'translateX(-50%)', animation:'houseFloat 6s ease-in-out infinite' }}>
        <svg width="420" height="300" viewBox="0 0 420 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="rWA" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#ffcc70" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="#ff9020" stopOpacity="0.2"/>
            </radialGradient>
            <radialGradient id="rWB" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#ffd080" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="#ff8010" stopOpacity="0.15"/>
            </radialGradient>
            <radialGradient id="rDoor" cx="50%" cy="30%" r="60%">
              <stop offset="0%"   stopColor="#E3C598" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#b06010" stopOpacity="0"/>
            </radialGradient>
            <filter id="gb2"><feGaussianBlur stdDeviation="8"/></filter>
            <filter id="sb2"><feGaussianBlur stdDeviation="3"/></filter>
          </defs>
          <ellipse cx="210" cy="268" rx="150" ry="14"
            fill="rgba(180,110,20,0.12)" filter="url(#gb2)"
            style={{ animation:'groundGlow 4s ease-in-out infinite' }}/>
          <polygon points="55,240 365,240 365,140 210,68 55,140" fill="#14100a"/>
          <polygon points="55,140 210,68 210,240 55,240"  fill="#1a1308" opacity="0.8"/>
          <polygon points="365,140 210,68 210,240 365,240" fill="#120f08" opacity="0.8"/>
          <polygon points="42,148 210,58 378,148 365,140 210,68 55,140" fill="#1e1710"/>
          <polyline points="42,148 210,58 378,148" stroke="rgba(227,197,152,0.25)" strokeWidth="1.5" fill="none"/>
          <rect x="268" y="68" width="24" height="38" rx="2" fill="#161008"/>
          <rect x="268" y="65" width="24" height="8"  rx="3" fill="#1e1710"/>
          {[0,1,2].map(i=>(
            <ellipse key={i} cx={280+i*4} cy={55-i*14} rx={6-i} ry={4-i}
              fill="rgba(200,180,140,0.08)" filter="url(#sb2)"/>
          ))}
          {/* Left window */}
          <rect x="78" y="150" width="80" height="60" rx="5" fill="#100d08"/>
          <rect x="80" y="152" width="76" height="56" rx="4" fill="url(#rWA)"
            style={{ animation:'windowFlicker 4s ease-in-out infinite' }}/>
          <line x1="118" y1="152" x2="118" y2="208" stroke="rgba(14,10,6,0.5)" strokeWidth="2"/>
          <line x1="80"  y1="180" x2="156" y2="180" stroke="rgba(14,10,6,0.5)" strokeWidth="2"/>
          <rect x="78"  y="150" width="80" height="60" rx="5" fill="rgba(255,170,50,0.08)" filter="url(#gb2)"/>
          {/* Right window */}
          <rect x="262" y="150" width="80" height="60" rx="5" fill="#100d08"/>
          <rect x="264" y="152" width="76" height="56" rx="4" fill="url(#rWB)"
            style={{ animation:'windowFlicker 5.5s ease-in-out infinite 1s' }}/>
          <line x1="302" y1="152" x2="302" y2="208" stroke="rgba(14,10,6,0.5)" strokeWidth="2"/>
          <line x1="264" y1="180" x2="340" y2="180" stroke="rgba(14,10,6,0.5)" strokeWidth="2"/>
          <rect x="262" y="150" width="80" height="60" rx="5" fill="rgba(255,150,30,0.08)" filter="url(#gb2)"/>
          {/* Ground glow from windows */}
          <ellipse cx="118" cy="248" rx="55" ry="12" fill="rgba(255,170,50,0.12)" filter="url(#gb2)"/>
          <ellipse cx="302" cy="248" rx="55" ry="12" fill="rgba(255,150,30,0.10)" filter="url(#gb2)"/>
          {/* Door */}
          <rect x="179" y="188" width="62" height="52" rx="31" fill="#0d0a06"/>
          <rect x="182" y="191" width="56" height="46" rx="28" fill="url(#rDoor)" opacity="0.7"/>
          <circle cx="233" cy="217" r="4" fill="rgba(227,197,152,0.8)"/>
          <rect x="173" y="238" width="74" height="6" rx="3" fill="#1a1308"/>
          {/* Security camera */}
          <rect x="320" y="135" width="18" height="8" rx="3" fill="#1a1510"/>
          <circle cx="321" cy="139" r="3.5" fill="rgba(227,197,152,0.55)"/>
          <line x1="329" y1="139" x2="338" y2="135" stroke="rgba(227,197,152,0.25)" strokeWidth="1.5"/>
          {/* Thermostat */}
          <circle cx="86" cy="136" r="10" fill="#1a1510" stroke="rgba(227,197,152,0.3)" strokeWidth="1"/>
          <circle cx="86" cy="136" r="6"  fill="rgba(227,197,152,0.2)"/>
          <text x="83" y="140" fill="rgba(227,197,152,0.8)" fontSize="6" fontFamily="monospace">22°</text>
        </svg>

        {/* WiFi rings */}
        <div className="absolute" style={{ top:-30, left:'50%', transform:'translateX(-50%)' }}>
          {[0,1,2].map(i=>(
            <div key={i} className="absolute" style={{
              width: 18+i*20, height: 10+i*10,
              top: -(i*9), left: -(i*10),
              borderTop:   '1.5px solid rgba(227,197,152,0.6)',
              borderLeft:  '1.5px solid rgba(227,197,152,0.6)',
              borderRight: '1.5px solid rgba(227,197,152,0.6)',
              borderRadius: `${50+i*10}% ${50+i*10}% 0 0`,
              animation: 'wifiRing 2.5s ease-out infinite',
              animationDelay: `${i*0.5}s`,
            }}/>
          ))}
        </div>
      </div>

      {/* ══ BRANDING ══ */}
      <div className="relative z-20 flex flex-col items-center pt-12 pointer-events-none">
        <div className="mb-4 flex items-center justify-center rounded-[1.2rem]" style={{
          width:62, height:62,
          background: 'linear-gradient(135deg,#2a1e06,#3d2c0a)',
          border: '1px solid rgba(227,197,152,0.35)',
          boxShadow: '0 0 24px rgba(227,197,152,0.3),0 0 60px rgba(180,110,20,0.12)',
        }}>
          <Home size={28} color="#E3C598" strokeWidth={2} />
        </div>
        <h1 className="text-[3rem] font-black tracking-tight leading-none" style={{
          color: '#F8F9FA',
          textShadow: '0 0 25px rgba(227,197,152,0.45),0 0 70px rgba(180,100,10,0.2)',
          letterSpacing: '-0.02em',
        }}>
          Smart<span style={{ color:'#E3C598' }}>.</span>Home
        </h1>
        <div className="mt-2 mb-3 rounded-full" style={{
          width:72, height:2,
          background:'linear-gradient(90deg,transparent,#E3C598,transparent)',
        }}/>
        <p className="text-xs font-semibold uppercase" style={{
          color:'rgba(227,197,152,0.5)', letterSpacing:'0.28em',
        }}>
          Smart living starts here.
        </p>
      </div>

      <div className="flex-1" />

      {/* ══ REGISTER CARD ══ */}
      <div className="relative z-20 w-full max-w-sm px-6 pb-10 pointer-events-auto">
        <div className="rounded-3xl px-8 py-9" style={{
          background: 'linear-gradient(160deg,rgba(255,248,225,0.07) 0%,rgba(25,18,6,0.72) 100%)',
          backdropFilter: 'blur(34px) saturate(160%)',
          WebkitBackdropFilter: 'blur(34px) saturate(160%)',
          border: '1px solid rgba(227,197,152,0.2)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,220,140,0.1)',
        }}>

          {/* Sub-heading inside card */}
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] mb-6"
            style={{ color:'rgba(227,197,152,0.45)' }}>
            Create your account
          </p>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-2xl text-sm font-medium" style={{
              background:'rgba(248,113,113,0.08)',
              border:'1px solid rgba(248,113,113,0.2)',
              color:'#fca5a5',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name */}
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <User size={16} color="rgba(227,197,152,0.55)" strokeWidth={2} />
              </div>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="warm-input w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Mail size={16} color="rgba(227,197,152,0.55)" strokeWidth={2} />
              </div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="warm-input w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Lock size={16} color="rgba(227,197,152,0.55)" strokeWidth={2} />
              </div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="warm-input w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium"
              />
            </div>

            {/* Create Account (primary full-width) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-4 rounded-2xl text-sm font-black transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:opacity-50 mt-2"
              style={{
                background: 'linear-gradient(135deg,#c49010,#e8b830,#c49010)',
                color: '#1a1005',
                boxShadow: '0 8px 24px rgba(227,197,152,0.35)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow='0 12px 36px rgba(227,197,152,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow='0 8px 24px rgba(227,197,152,0.35)'; }}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
            </button>
          </form>

          {/* Already have account */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <span className="text-xs font-medium" style={{ color:'rgba(240,220,170,0.35)' }}>
              Already have an account?
            </span>
            <Link
              to="/login"
              className="text-xs font-bold transition-all"
              style={{ color:'rgba(227,197,152,0.65)' }}
              onMouseEnter={e => e.currentTarget.style.color='#E3C598'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(227,197,152,0.65)'}
            >
              Sign In
            </Link>
          </div>
        </div>

        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.3em] mt-5"
          style={{ color:'rgba(227,197,152,0.2)' }}>
          Secured by Aura Smart Systems
        </p>
      </div>
    </div>
  );
};

export default Register;
