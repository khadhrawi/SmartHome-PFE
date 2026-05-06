// Melo mascot design options — pass design={1|2|3|4} and size prop

export const MeloRobot = ({ size = 48, animate = false }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={animate ? { animation: 'melo-float 3s ease-in-out infinite' } : {}}>
    {/* Antenna */}
    <line x1="32" y1="6" x2="32" y2="14" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="32" cy="5" r="3" fill="#c4b5fd"/>
    {/* Head */}
    <rect x="14" y="14" width="36" height="26" rx="8" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="2"/>
    {/* Eyes */}
    <rect x="20" y="21" width="10" height="8" rx="3" fill="#6d28d9"/>
    <rect x="34" y="21" width="10" height="8" rx="3" fill="#6d28d9"/>
    <rect x="22" y="23" width="4" height="4" rx="2" fill="#c4b5fd"/>
    <rect x="36" y="23" width="4" height="4" rx="2" fill="#c4b5fd"/>
    {/* Mouth */}
    <path d="M24 33 Q32 38 40 33" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" fill="none"/>
    {/* Body */}
    <rect x="20" y="40" width="24" height="16" rx="6" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="2"/>
    {/* Belly button */}
    <circle cx="32" cy="48" r="3" fill="#6d28d9"/>
    {/* Arms */}
    <rect x="8" y="42" width="10" height="6" rx="3" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="2"/>
    <rect x="46" y="42" width="10" height="6" rx="3" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="2"/>
    {/* Glow */}
    <circle cx="32" cy="32" r="30" fill="url(#robotGlow)" opacity="0.15"/>
    <defs>
      <radialGradient id="robotGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#8b5cf6"/>
        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
      </radialGradient>
    </defs>
  </svg>
);

export const MeloGhost = ({ size = 48, animate = false }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={animate ? { animation: 'melo-float 2.5s ease-in-out infinite' } : {}}>
    {/* Body */}
    <path d="M10 36 Q10 14 32 14 Q54 14 54 36 L54 54 Q46 48 40 54 Q36 48 32 54 Q28 48 24 54 Q18 48 10 54 Z"
      fill="#2e1065" stroke="#7c3aed" strokeWidth="2"/>
    {/* Eyes */}
    <ellipse cx="24" cy="34" rx="5" ry="6" fill="#8b5cf6"/>
    <ellipse cx="40" cy="34" rx="5" ry="6" fill="#8b5cf6"/>
    <ellipse cx="24" cy="35" rx="2.5" ry="3" fill="white"/>
    <ellipse cx="40" cy="35" rx="2.5" ry="3" fill="white"/>
    {/* Blush */}
    <ellipse cx="18" cy="40" rx="4" ry="2.5" fill="#ec4899" opacity="0.5"/>
    <ellipse cx="46" cy="40" rx="4" ry="2.5" fill="#ec4899" opacity="0.5"/>
    {/* Smile */}
    <path d="M26 44 Q32 49 38 44" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" fill="none"/>
    {/* Stars */}
    <text x="6" y="20" fontSize="8" fill="#c4b5fd" opacity="0.8">✦</text>
    <text x="50" y="18" fontSize="6" fill="#c4b5fd" opacity="0.6">✦</text>
  </svg>
);

export const MeloCat = ({ size = 48, animate = false }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={animate ? { animation: 'melo-float 3.5s ease-in-out infinite' } : {}}>
    {/* Ears */}
    <polygon points="14,22 8,8 22,16" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="1.5"/>
    <polygon points="50,22 56,8 42,16" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="1.5"/>
    <polygon points="15,20 11,11 21,17" fill="#6d28d9"/>
    <polygon points="49,20 53,11 43,17" fill="#6d28d9"/>
    {/* Head */}
    <circle cx="32" cy="32" r="20" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="2"/>
    {/* Eyes */}
    <ellipse cx="24" cy="29" rx="5" ry="6" fill="#6d28d9"/>
    <ellipse cx="40" cy="29" rx="5" ry="6" fill="#6d28d9"/>
    <ellipse cx="24" cy="30" rx="2" ry="4" fill="white"/>
    <ellipse cx="40" cy="30" rx="2" ry="4" fill="white"/>
    <circle cx="24" cy="28" r="1.5" fill="#c4b5fd"/>
    <circle cx="40" cy="28" r="1.5" fill="#c4b5fd"/>
    {/* Nose */}
    <polygon points="32,36 29,40 35,40" fill="#ec4899"/>
    {/* Mouth */}
    <path d="M29 40 Q32 43 35 40" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <line x1="32" y1="36" x2="32" y2="40" stroke="#ec4899" strokeWidth="1.5"/>
    {/* Whiskers */}
    <line x1="12" y1="36" x2="26" y2="38" stroke="#a78bfa" strokeWidth="1" opacity="0.7"/>
    <line x1="12" y1="39" x2="26" y2="39" stroke="#a78bfa" strokeWidth="1" opacity="0.7"/>
    <line x1="38" y1="38" x2="52" y2="36" stroke="#a78bfa" strokeWidth="1" opacity="0.7"/>
    <line x1="38" y1="39" x2="52" y2="39" stroke="#a78bfa" strokeWidth="1" opacity="0.7"/>
    {/* Blush */}
    <ellipse cx="18" cy="36" rx="4" ry="2.5" fill="#ec4899" opacity="0.4"/>
    <ellipse cx="46" cy="36" rx="4" ry="2.5" fill="#ec4899" opacity="0.4"/>
  </svg>
);

export const MeloAlien = ({ size = 48, animate = false }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={animate ? { animation: 'melo-float 2.8s ease-in-out infinite' } : {}}>
    {/* Antennae */}
    <line x1="22" y1="14" x2="16" y2="5" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="15" cy="4" r="3" fill="#c4b5fd"/>
    <line x1="42" y1="14" x2="48" y2="5" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="49" cy="4" r="3" fill="#c4b5fd"/>
    {/* Head — oval */}
    <ellipse cx="32" cy="32" rx="20" ry="24" fill="#0f172a" stroke="#7c3aed" strokeWidth="2"/>
    {/* Big eyes */}
    <ellipse cx="23" cy="27" rx="7" ry="9" fill="#6d28d9"/>
    <ellipse cx="41" cy="27" rx="7" ry="9" fill="#6d28d9"/>
    <ellipse cx="21" cy="26" rx="3" ry="4" fill="#c4b5fd"/>
    <ellipse cx="39" cy="26" rx="3" ry="4" fill="#c4b5fd"/>
    <circle cx="20" cy="25" r="1.5" fill="white"/>
    <circle cx="38" cy="25" r="1.5" fill="white"/>
    {/* Small mouth */}
    <path d="M26 42 Q32 46 38 42" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" fill="none"/>
    {/* Glow aura */}
    <ellipse cx="32" cy="32" rx="19" ry="23" fill="none" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" strokeDasharray="4 4"/>
  </svg>
);

// Design names for display
export const MELO_DESIGNS = [
  { id: 1, name: 'Robot', Component: MeloRobot, desc: 'Techy little bot' },
  { id: 2, name: 'Ghost', Component: MeloGhost, desc: 'Friendly spirit' },
  { id: 3, name: 'Cat', Component: MeloCat, desc: 'Cute & cozy' },
  { id: 4, name: 'Alien', Component: MeloAlien, desc: 'Big-eyed & quirky' },
];
