import React, { useMemo, useState, useContext } from 'react';
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Video,
  VideoOff,
  WifiOff,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { CAMERA_FEEDS, EVENT_CONFIG } from '../data/security';

const normalizeCameraName = (value) => String(value || '').trim().toLowerCase();

const buildCameraSnapshot = (baseCamera, cameraDevice, awayMode, lockdownMode) => {
  const isArmed = awayMode || lockdownMode;
  const isLive = cameraDevice ? cameraDevice.state === 'ON' : baseCamera.isLive;
  const motionDetected = isArmed ? baseCamera.motionDetected : false;

  return {
    ...baseCamera,
    sourceId: cameraDevice?._id || baseCamera.id,
    isLive,
    motionDetected,
    stateLabel: lockdownMode ? 'LOCKDOWN' : awayMode ? 'AWAY MONITORING' : 'MONITORING',
  };
};

const mergeCameraFeeds = ({ deviceCameras, awayMode, lockdownMode }) => {
  const byName = new Map(
    (deviceCameras || []).map((device) => [normalizeCameraName(device.name), device]),
  );

  const merged = CAMERA_FEEDS.map((camera) => {
    const direct = byName.get(normalizeCameraName(camera.location));
    if (direct) return buildCameraSnapshot(camera, direct, awayMode, lockdownMode);

    const roomMatch = (deviceCameras || []).find(
      (device) => normalizeCameraName(device.room) === normalizeCameraName(camera.room),
    );
    return buildCameraSnapshot(camera, roomMatch, awayMode, lockdownMode);
  });

  if (!Array.isArray(deviceCameras) || deviceCameras.length === 0) return merged;

  const unmatched = deviceCameras
    .filter((device) => {
      const normalizedName = normalizeCameraName(device.name);
      return !merged.some((camera) => normalizeCameraName(camera.location) === normalizedName);
    })
    .map((device, idx) => {
      const fallback = CAMERA_FEEDS[idx % CAMERA_FEEDS.length];
      return buildCameraSnapshot(
        {
          id: `device-${device._id}`,
          location: device.name,
          room: device.room || 'Unknown',
          emoji: '📷',
          isLive: true,
          motionDetected: false,
          accentColor: fallback.accentColor,
          recentEvents: [
            { time: 'Now', event: 'Camera connected to dashboard', type: 'system' },
          ],
          thumbnailGradient: fallback.thumbnailGradient,
        },
        device,
        awayMode,
        lockdownMode,
      );
    });

  return [...merged, ...unmatched];
};

const CameraCard = ({ cam, selected, onSelect }) => {
  const latestEvent = cam.recentEvents?.[0];
  const eventCfg = EVENT_CONFIG[latestEvent?.type] || EVENT_CONFIG.system;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative overflow-hidden rounded-2xl border p-0 text-left transition-all duration-300"
      style={{
        borderColor: selected ? `${cam.accentColor}aa` : 'rgba(255,255,255,0.12)',
        boxShadow: selected
          ? `0 0 0 1px ${cam.accentColor}55, 0 24px 45px rgba(0,0,0,0.42)`
          : '0 16px 30px rgba(0,0,0,0.32)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div className="relative aspect-[16/9]" style={{ background: cam.thumbnailGradient }}>
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {!cam.isLive ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <VideoOff size={28} className="text-zinc-400" />
          </div>
        ) : null}

        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest"
          style={{
            borderColor: cam.isLive ? 'rgba(74,222,128,0.4)' : 'rgba(113,113,122,0.4)',
            color: cam.isLive ? '#86efac' : '#a1a1aa',
            background: 'rgba(0,0,0,0.45)',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: cam.isLive ? '#4ade80' : '#71717a',
              boxShadow: cam.isLive ? '0 0 6px rgba(74,222,128,0.8)' : 'none',
            }}
          />
          {cam.isLive ? 'Live' : 'Offline'}
        </div>

        {cam.motionDetected ? (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-rose-400/55 bg-rose-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-rose-200">
            <AlertTriangle size={10} />
            Motion
          </div>
        ) : null}

        <div className="absolute bottom-2 right-2 text-xl opacity-75">{cam.emoji}</div>
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-white">{cam.location}</p>
          <ChevronRight size={14} className="text-zinc-400" />
        </div>

        <p className="text-[11px] text-zinc-400">{cam.room} · {cam.stateLabel}</p>

        {latestEvent ? (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: eventCfg.dot }} />
            <span className="font-bold" style={{ color: eventCfg.color }}>{latestEvent.time}</span>
            <span className="truncate text-zinc-300">{latestEvent.event}</span>
          </div>
        ) : null}
      </div>
    </button>
  );
};

const CameraModal = ({ camera, onClose }) => {
  if (!camera) return null;

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/75 p-4 backdrop-blur-lg"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/15 bg-zinc-950/90">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/15 bg-white/5 p-2 text-lg">{camera.emoji}</div>
            <div>
              <p className="text-sm font-black text-white">{camera.location}</p>
              <p className="text-xs text-zinc-400">{camera.room} · {camera.stateLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 p-2 text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl border border-white/10" style={{ background: camera.thumbnailGradient }}>
            <div className="aspect-[16/9]" />
            {!camera.isLive ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-zinc-300">
                <WifiOff size={18} />
                Camera currently offline
              </div>
            ) : null}
            <div className="absolute left-3 top-3 rounded-full border border-emerald-300/45 bg-emerald-400/15 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
              {camera.isLive ? 'Live Feed' : 'Offline'}
            </div>
            {camera.motionDetected ? (
              <div className="absolute right-3 top-3 rounded-full border border-rose-300/55 bg-rose-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-rose-200">
                Motion Alert
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Quick Actions</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-100">
                  <Eye size={12} /> Focus View
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-100">
                  <Download size={12} /> Snapshot
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Recent Events</p>
              <div className="space-y-2">
                {(camera.recentEvents || []).slice(0, 4).map((event, index) => {
                  const cfg = EVENT_CONFIG[event.type] || EVENT_CONFIG.system;
                  return (
                    <div key={`${camera.id}-event-${index}`} className="flex items-center gap-2 text-[11px]">
                      <Clock size={12} style={{ color: cfg.color }} />
                      <span className="font-bold" style={{ color: cfg.color }}>{event.time}</span>
                      <span className="truncate text-zinc-300">{event.event}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CameraMonitoringPanel = ({ awayMode, lockdownMode, deviceCameras, collapsed = false, onToggleCollapse }) => {
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  const cameras = useMemo(
    () => mergeCameraFeeds({ deviceCameras, awayMode, lockdownMode }),
    [deviceCameras, awayMode, lockdownMode],
  );

  const selectedCamera = useMemo(
    () => cameras.find((camera) => camera.id === selectedCameraId || camera.sourceId === selectedCameraId) || null,
    [cameras, selectedCameraId],
  );

  const liveCount = cameras.filter((camera) => camera.isLive).length;
  const motionCount = cameras.filter((camera) => camera.motionDetected).length;
  const securityEmphasis = awayMode || lockdownMode;

  return (
    <section className="space-y-4">
      <div
        className="rounded-2xl border p-4 backdrop-blur-sm"
        style={{
          borderColor: securityEmphasis ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.15)',
          background: securityEmphasis
            ? 'linear-gradient(135deg, rgba(127,29,29,0.35) 0%, rgba(9,9,11,0.45) 100%)'
            : 'rgba(0,0,0,0.28)',
          boxShadow: securityEmphasis ? '0 0 0 1px rgba(248,113,113,0.25), 0 20px 45px rgba(127,29,29,0.25)' : 'none',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Camera Monitoring</h2>
            <p className="text-sm text-zinc-300">
              {collapsed
                ? 'Away Mode Monitoring'
                : lockdownMode
                ? 'Lockdown mode active. Security feeds are in high-priority monitoring.'
                : awayMode
                  ? 'Away mode active. Cameras are armed and motion alerts are prioritized.'
                  : 'Select a camera card to inspect feed details and recent events.'}
            </p>
          </div>

            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-100 transition-all duration-200 hover:border-white/35 hover:bg-white/10"
            >
              {collapsed ? 'Expand' : 'Collapse'}
              <motion.span
                animate={{ rotate: collapsed ? 0 : 180 }}
                transition={{ type: 'spring', stiffness: 340, damping: 24 }}
                className="inline-flex"
              >
                <ChevronDown size={13} />
              </motion.span>
            </button>

          {!collapsed ? (
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-zinc-200">Cameras: {cameras.length}</div>
              <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-zinc-200">Live: {liveCount}</div>
              <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-zinc-200">Motion: {motionCount}</div>
              <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-zinc-200">
                {lockdownMode ? 'LOCKDOWN' : awayMode ? 'AWAY ARMED' : 'NORMAL'}
              </div>
            </div>
          ) : null}
        </div>

        {!collapsed && (awayMode || lockdownMode) && motionCount > 0 ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200">
            <AlertTriangle size={14} />
            Motion is detected while security mode is active. Review highlighted camera feeds.
          </div>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            key="camera-panel-body"
            initial={{ height: 0, opacity: 0, filter: 'blur(6px)', y: -6 }}
            animate={{ height: 'auto', opacity: 1, filter: 'blur(0px)', y: 0 }}
            exit={{ height: 0, opacity: 0, filter: 'blur(4px)', y: -4 }}
            transition={{
              height: { type: 'spring', stiffness: 230, damping: 28 },
              opacity: { duration: 0.24, ease: 'easeOut' },
              y: { duration: 0.24, ease: 'easeOut' },
            }}
            className="overflow-hidden"
          >
            <motion.div layout className="space-y-4 pt-1">
              <motion.div layout className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {cameras.map((camera, index) => (
                  <motion.div
                    key={camera.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.12) }}
                  >
                    <CameraCard
                      cam={camera}
                      selected={selectedCameraId === camera.id || selectedCameraId === camera.sourceId}
                      onSelect={() => setSelectedCameraId(camera.sourceId || camera.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {selectedCamera ? (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-white/15 bg-black/30 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-black text-white">Selected Camera</h3>
                    <button
                      type="button"
                      onClick={() => setSelectedCameraId(null)}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-zinc-200 transition-all duration-200 hover:border-white/30 hover:bg-white/10"
                    >
                      Clear
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCameraId(selectedCamera.sourceId || selectedCamera.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center gap-2">
                      <Camera size={14} className="text-zinc-200" />
                      <p className="text-sm font-bold text-white">{selectedCamera.location}</p>
                    </div>
                    <span className="text-xs font-semibold text-zinc-300">Tap card again to open detailed view</span>
                  </button>
                </motion.div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CameraModal camera={selectedCamera} onClose={() => setSelectedCameraId(null)} />
    </section>
  );
};

export default CameraMonitoringPanel;