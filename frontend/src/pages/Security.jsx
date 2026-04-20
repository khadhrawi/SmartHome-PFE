import React, { useMemo, useState, useContext } from 'react';
import {
  Video, VideoOff, AlertTriangle, Shield, Camera,
  Radio, Download, X, Clock, ChevronRight,
  Eye, WifiOff,
} from 'lucide-react';
import { CAMERA_FEEDS, EVENT_CONFIG, MOTION_LOG } from '../data/security';
import { useFloorPlanState } from '../hooks/useFloorPlanState';
import { AuthContext } from '../context/AuthContext';

const C = {
  text:   '#F8F9FA',
  muted:  'rgba(248,249,250,0.45)',
  dimmed: 'rgba(248,249,250,0.22)',
  gold:   '#E3C598',
};

const normalizeCameraName = (value) => String(value || '').trim().toLowerCase();

const mergeCameraFeeds = ({ baseFeeds, deviceCameras, awayMode, lockdownMode }) => {
  const byName = new Map(
    (deviceCameras || []).map((device) => [normalizeCameraName(device.name), device]),
  );

  const merged = (baseFeeds || []).map((camera) => {
    const direct = byName.get(normalizeCameraName(camera.location));

    const roomMatch = (deviceCameras || []).find(
      (device) => normalizeCameraName(device.room) === normalizeCameraName(camera.room),
    );

    const sourceDevice = direct || roomMatch;
    const isArmed = awayMode || lockdownMode;

    return {
      ...camera,
      sourceId: sourceDevice?._id || camera.id,
      isLive: sourceDevice ? sourceDevice.state === 'ON' : camera.isLive,
      motionDetected: isArmed ? camera.motionDetected : false,
      stateLabel: lockdownMode ? 'LOCKDOWN' : awayMode ? 'AWAY MONITORING' : 'MONITORING',
    };
  });

  const unmatchedDeviceCameras = (deviceCameras || [])
    .filter((device) => {
      const normalizedName = normalizeCameraName(device.name);
      return !merged.some((camera) => normalizeCameraName(camera.location) === normalizedName);
    })
    .map((device, idx) => {
      const fallback = baseFeeds[idx % baseFeeds.length] || baseFeeds[0];
      return {
        id: `device-${device._id}`,
        sourceId: device._id,
        location: device.name,
        room: device.room || 'Unknown',
        emoji: '📷',
        isLive: device.state === 'ON',
        motionDetected: awayMode || lockdownMode ? false : false,
        stateLabel: lockdownMode ? 'LOCKDOWN' : awayMode ? 'AWAY MONITORING' : 'MONITORING',
        accentColor: fallback?.accentColor || '#60a5fa',
        recentEvents: [{ time: 'Now', event: 'Camera connected to floor plan state', type: 'system' }],
        thumbnailGradient: fallback?.thumbnailGradient || 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(10,12,20,0.9) 100%)',
      };
    });

  return [...merged, ...unmatchedDeviceCameras];
};

/* ══════════════════════════════════════════════════
   LIVE VIEW MODAL
══════════════════════════════════════════════════ */
function LiveModal({ cam, onClose }) {
  const [recording, setRecording] = useState(false);
  const [screenshot, setScreenshot] = useState(false);

  const handleScreenshot = () => {
    setScreenshot(true);
    setTimeout(() => setScreenshot(false), 800);
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,16,13,0.88)', backdropFilter: 'blur(25px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-2xl rounded-[2rem] overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(18,10,4,0.98) 0%, rgba(10,6,2,0.99) 100%)',
          border: `1px solid ${cam.accentColor}30`,
          boxShadow: `0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px ${cam.accentColor}12`,
        }}
      >
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${cam.accentColor}12 0%, transparent 70%)`, transform: 'translate(30%,-30%)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
              style={{ background: `${cam.accentColor}18`, border: `1px solid ${cam.accentColor}35` }}>
              {cam.emoji}
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: C.text }}>{cam.location}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: cam.isLive ? '#4ade80' : '#6b7280',
                    boxShadow: cam.isLive ? '0 0 6px #4ade80' : 'none',
                    animation: cam.isLive ? 'warm-pulse 2s ease-in-out infinite' : 'none' }} />
                <span className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: cam.isLive ? '#4ade8099' : C.dimmed }}>
                  {cam.isLive ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: C.muted }}>
            <X size={15} />
          </button>
        </div>

        {/* Video viewport */}
        <div className="relative mx-6 mt-4 rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {/* Simulated camera feed */}
          <div className="absolute inset-0" style={{ background: cam.thumbnailGradient }} />

          {/* Scan line animation */}
          {cam.isLive && (
            <div className="absolute inset-x-0 h-0.5 opacity-30"
              style={{ background: `linear-gradient(90deg, transparent, ${cam.accentColor}, transparent)`,
                animation: 'scan-line 3s linear infinite', top: '40%' }} />
          )}

          {/* Offline overlay */}
          {!cam.isLive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <WifiOff size={40} style={{ color: C.dimmed }} />
              <p className="text-sm font-bold" style={{ color: C.dimmed }}>Camera Offline</p>
            </div>
          )}

          {/* Grid overlay (cctv feel) */}
          {cam.isLive && (
            <div className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                backgroundSize: '40px 40px' }} />
          )}

          {/* Corner brackets */}
          {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-5 h-5`}
              style={{ borderColor: `${cam.accentColor}80`,
                borderTopWidth: i < 2 ? 2 : 0, borderBottomWidth: i >= 2 ? 2 : 0,
                borderLeftWidth: i % 2 === 0 ? 2 : 0, borderRightWidth: i % 2 === 1 ? 2 : 0 }} />
          ))}

          {/* Motion badge */}
          {cam.motionDetected && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.5)',
                backdropFilter: 'blur(8px)' }}>
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#f87171', animation: 'warm-pulse 0.8s ease-in-out infinite' }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#f87171' }}>
                Motion
              </span>
            </div>
          )}

          {/* Recording badge */}
          {recording && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(248,113,113,0.18)', border: '1px solid rgba(248,113,113,0.55)',
                backdropFilter: 'blur(8px)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"
                style={{ animation: 'warm-pulse 0.6s ease-in-out infinite' }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#f87171' }}>
                REC
              </span>
            </div>
          )}

          {/* Screenshot flash */}
          {screenshot && (
            <div className="absolute inset-0 bg-white opacity-60 pointer-events-none transition-opacity duration-100" />
          )}

          {/* Timestamp overlay */}
          <div className="absolute bottom-3 left-3 text-[10px] font-mono font-bold"
            style={{ color: `${cam.accentColor}cc` }}>
            {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-6 py-5">
          <button
            onClick={() => setRecording(r => !r)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold flex-1 justify-center transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: recording ? 'rgba(248,113,113,0.18)' : `${cam.accentColor}15`,
              border: `1px solid ${recording ? 'rgba(248,113,113,0.45)' : cam.accentColor + '35'}`,
              color: recording ? '#f87171' : cam.accentColor,
            }}
          >
            <Radio size={14} />
            {recording ? 'Stop Recording' : 'Record'}
          </button>

          <button
            onClick={handleScreenshot}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold flex-1 justify-center transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: C.muted,
            }}
          >
            <Download size={14} />
            Screenshot
          </button>
        </div>

        {/* Recent events */}
        <div className="px-6 pb-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: C.dimmed }}>
            Recent Events
          </p>
          {cam.recentEvents.slice(0, 4).map((ev, i) => {
            const cfg = EVENT_CONFIG[ev.type] ?? EVENT_CONFIG.system;
            return (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                <span className="text-[10px] font-bold flex-shrink-0 tabular-nums" style={{ color: cfg.color }}>
                  {ev.time}
                </span>
                <span className="text-[11px] font-medium truncate" style={{ color: C.muted }}>{ev.event}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   CAMERA CARD
══════════════════════════════════════════════════ */
function CameraCard({ cam, onClick }) {
  const latestEvent = cam.recentEvents[0];
  const evCfg = EVENT_CONFIG[latestEvent?.type] ?? EVENT_CONFIG.system;

  return (
    <div
      onClick={onClick}
      className="group relative rounded-[2rem] overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-1.5"
      style={{
        border: `1px solid ${cam.motionDetected ? 'rgba(248,113,113,0.40)' : cam.accentColor + '25'}`,
        backdropFilter: 'blur(25px)',
        boxShadow: cam.motionDetected
          ? '0 20px 50px rgba(248,113,113,0.15), 0 0 0 1px rgba(248,113,113,0.15)'
          : `0 20px 50px rgba(0,0,0,0.35)`,
      }}
    >
      {/* Thumbnail / viewport */}
      <div className="relative" style={{ aspectRatio: '16/9', background: cam.thumbnailGradient }}>
        {/* Scan line */}
        {cam.isLive && (
          <div className="absolute inset-x-0 h-px opacity-25"
            style={{ background: `linear-gradient(90deg, transparent, ${cam.accentColor}cc, transparent)`,
              animation: 'scan-line 4s linear infinite', top: '50%' }} />
        )}

        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-30"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '30px 30px' }} />

        {/* Corner brackets */}
        {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-4 h-4`}
            style={{ borderColor: `${cam.accentColor}60`,
              borderTopWidth: i < 2 ? 1.5 : 0, borderBottomWidth: i >= 2 ? 1.5 : 0,
              borderLeftWidth: i % 2 === 0 ? 1.5 : 0, borderRightWidth: i % 2 === 1 ? 1.5 : 0 }} />
        ))}

        {/* Live / Offline badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
            border: `1px solid ${cam.isLive ? 'rgba(74,222,128,0.4)' : 'rgba(107,114,128,0.3)'}` }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: cam.isLive ? '#4ade80' : '#6b7280',
              animation: cam.isLive ? 'warm-pulse 2s ease-in-out infinite' : 'none' }} />
          <span className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: cam.isLive ? '#4ade80' : '#6b7280' }}>
            {cam.isLive ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Motion alert */}
        {cam.motionDetected && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{ background: 'rgba(248,113,113,0.18)', border: '1px solid rgba(248,113,113,0.50)',
              backdropFilter: 'blur(8px)' }}>
            <AlertTriangle size={9} style={{ color: '#f87171' }} />
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#f87171' }}>
              Motion
            </span>
          </div>
        )}

        {/* Offline overlay */}
        {!cam.isLive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <VideoOff size={28} style={{ color: C.dimmed }} />
          </div>
        )}

        {/* Camera emoji */}
        <div className="absolute bottom-3 right-3 text-xl opacity-60 group-hover:opacity-100 transition-opacity">
          {cam.emoji}
        </div>

        {/* View on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
              border: `1px solid ${cam.accentColor}50` }}>
            <Eye size={14} style={{ color: cam.accentColor }} />
            <span className="text-xs font-black" style={{ color: cam.accentColor }}>View Feed</span>
          </div>
        </div>
      </div>

      {/* Card info */}
      <div className="p-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.025)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black" style={{ color: C.text }}>{cam.location}</h3>
          <ChevronRight size={14} style={{ color: C.dimmed }} />
        </div>

        {/* Latest event */}
        {latestEvent && (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: evCfg.dot }} />
            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: evCfg.color }}>
              {latestEvent.time}
            </span>
            <span className="text-[10px] font-medium truncate" style={{ color: C.muted }}>
              {latestEvent.event}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   SECURITY PAGE
══════════════════════════════════════════════════ */
const Security = () => {
  const {
    floorPlanState,
    toggleAway,
  } = useFloorPlanState();
  const { user } = useContext(AuthContext);

  const [selectedCam, setSelectedCam] = useState(null);

  const isAwayMode = !!floorPlanState.awayMode;
  const isLockdownMode = !!floorPlanState.lockdownMode;
  const isAdmin = user?.role === 'admin';

  const cameraDevices = useMemo(() => {
    return (Array.isArray(floorPlanState.devices) ? floorPlanState.devices : []).filter((device) => {
      return String(device?.type || '').toLowerCase() === 'camera';
    });
  }, [floorPlanState.devices]);

  const cameras = useMemo(() => {
    return mergeCameraFeeds({
      baseFeeds: CAMERA_FEEDS,
      deviceCameras: cameraDevices,
      awayMode: isAwayMode,
      lockdownMode: isLockdownMode,
    });
  }, [cameraDevices, isAwayMode, isLockdownMode]);

  const liveCount    = cameras.filter(c => c.isLive).length;
  const motionCount  = cameras.filter(c => c.motionDetected).length;
  const isAlertState = (isAwayMode || isLockdownMode) && motionCount > 0;

  return (
    <div className="space-y-10 pb-28" style={{ color: C.text }}>

      {/* Live modal */}
      {selectedCam && <LiveModal cam={selectedCam} onClose={() => setSelectedCam(null)} />}

      {/* ── Page header ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-black tracking-tight" style={{ color: C.text }}>Security</h2>
          <p className="text-sm font-medium mt-1.5" style={{ color: C.muted }}>
            {liveCount} cameras live · {motionCount > 0 ? `${motionCount} motion alert${motionCount > 1 ? 's' : ''}` : 'No active motion'}
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => toggleAway().catch(() => {})}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{
              background: isAwayMode ? 'rgba(248,113,113,0.15)' : 'rgba(96,165,250,0.12)',
              border: `1px solid ${isAwayMode ? 'rgba(248,113,113,0.40)' : 'rgba(96,165,250,0.30)'}`,
              color: isAwayMode ? '#f87171' : '#60a5fa',
            }}
          >
            <Shield size={15} strokeWidth={2.5} />
            {isAwayMode ? 'Away Mode ON' : 'Away Mode OFF'}
          </button>
        ) : (
          <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-200">
            View only
          </div>
        )}
      </div>

      {/* ── Alert banner (Away + Motion) ── */}
      {isAlertState && (
        <div
          className="flex items-center justify-between px-6 py-4 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(248,113,113,0.12) 0%, rgba(255,255,255,0.03) 100%)',
            border: '1px solid rgba(248,113,113,0.45)',
            boxShadow: '0 0 30px rgba(248,113,113,0.12)',
            animation: 'warm-pulse 2s ease-in-out infinite',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.40)' }}>
              <AlertTriangle size={18} style={{ color: '#f87171' }} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: '#fca5a5' }}>
                ⚠️ Motion Detected — Security Mode Active
              </p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: 'rgba(252,165,165,0.65)' }}>
                {motionCount} camera{motionCount > 1 ? 's' : ''} triggered · {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedCam(cameras.find(c => c.motionDetected))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all hover:scale-105"
            style={{ background: 'rgba(248,113,113,0.18)', border: '1px solid rgba(248,113,113,0.45)', color: '#f87171' }}
          >
            <Eye size={13} /> View Feed
          </button>
        </div>
      )}

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Cameras',  value: cameras.length, accent: '#E3C598', emoji: '📷' },
          { label: 'Live',     value: liveCount,       accent: '#4ade80', emoji: '🟢' },
          { label: 'Motion',   value: motionCount,     accent: '#f87171', emoji: '🚨' },
          { label: 'Events',   value: cameras.reduce((s, c) => s + c.recentEvents.length, 0),
            accent: '#a78bfa', emoji: '📋' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl px-5 py-4 flex flex-col gap-1"
            style={{ background: `${s.accent}0a`, border: `1px solid ${s.accent}22` }}>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black" style={{ color: s.accent }}>{s.value}</span>
              <span className="text-xl">{s.emoji}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.dimmed }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Camera grid ── */}
      <div className="space-y-4">
        <h3 className="text-lg font-black" style={{ color: C.text }}>Camera Feeds</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-5">
          {cameras.map(cam => (
            <CameraCard key={cam.id} cam={cam} onClick={() => setSelectedCam(cam)} />
          ))}
        </div>
      </div>

      {/* ── Motion log ── */}
      <div className="space-y-4">
        <h3 className="text-lg font-black" style={{ color: C.text }}>Motion Log</h3>
        <div className="space-y-2">
          {MOTION_LOG.map(log => (
            <div key={log.id}
              className="flex items-center gap-4 px-5 py-3.5 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${log.severity === 'high' ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: log.severity === 'high' ? '#f87171' : log.severity === 'medium' ? '#f5c842' : '#4ade80',
                  boxShadow: log.severity === 'high' ? '0 0 8px #f87171' : 'none',
                }}
              />
              <span className="text-[11px] font-bold flex-shrink-0" style={{ color: C.muted }}>{log.time}</span>
              <span className="text-sm font-bold flex-1" style={{ color: C.text }}>{log.camera}</span>
              <span
                className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{
                  background: log.severity === 'high' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.05)',
                  color: log.severity === 'high' ? '#f87171' : C.dimmed,
                  border: `1px solid ${log.severity === 'high' ? 'rgba(248,113,113,0.30)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {log.severity}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Security;
