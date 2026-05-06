const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let ioInstance = null;

const attachSocketAuth = (io) => {
  io.use(async (socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const headerToken = socket.handshake.headers?.authorization?.replace('Bearer ', '');
      const token = authToken || headerToken;

      if (!token) {
        return next(new Error('Socket authentication failed: missing token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Socket authentication failed: user not found'));
      }

      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error('Socket authentication failed'));
    }
  });
};

const initNotificationsServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  attachSocketAuth(io);

  io.on('connection', (socket) => {
    const userId = String(socket.user._id);
    const userRole = socket.user.role;
    const houseCode = socket.user.houseCode;

    socket.join(userId);
    socket.join(`user:${userId}`);
    socket.join(`role:${userRole}`);

    if (houseCode) {
      socket.join(houseCode);
      socket.join(`house:${houseCode}`);
    }

    if (userRole === 'admin' && houseCode) {
      socket.join(`house-admin:${houseCode}`);
      // mark as connected for concierge view
      try {
        // lazy require to avoid cycles
        // track connected admins via rooms
        socket.conciergeHouse = houseCode;
      } catch (e) {
        // ignore
      }
      // emit connected event for concierge subscribers
      try {
        conciergeEmitter.emit('admin:connected', { houseCode });
      } catch (e) {}
    }

    // Agency accounts get their own global room so they receive cross-unit alerts
    if (userRole === 'agency') {
      socket.join('agency:global');
    }

    console.log(`[socket] connected user=${userId} role=${userRole} house=${houseCode || 'n/a'}`);
    // attach disconnect handler to update concierge listeners
    socket.on('disconnect', () => {
      try {
        const house = socket.conciergeHouse || socket.user?.houseCode;
        if (socket.user?.role === 'admin' && house) {
          const room = io.sockets.adapter.rooms.get(`house-admin:${house}`);
          const count = room ? room.size : 0;
          if (count === 0) {
            // emit via conciergeEmitter if present
            if (typeof conciergeEmitter !== 'undefined') {
              conciergeEmitter.emit('admin:disconnected', { houseCode: house });
            }
          }
        }
      } catch (err) {
        // ignore
      }
    });
  });

  ioInstance = io;
  return io;
};

const normalizeRequesterId = (requestDoc) => {
  if (!requestDoc?.requester) return '';
  if (typeof requestDoc.requester === 'string') return requestDoc.requester;
  if (requestDoc.requester?._id) return String(requestDoc.requester._id);
  return String(requestDoc.requester);
};

const normalizeUserId = (userValue) => {
  if (!userValue) return '';
  if (typeof userValue === 'string') return userValue;
  if (userValue?._id) return String(userValue._id);
  return String(userValue);
};

const toPermissionPayload = (requestDoc) => {
  if (!requestDoc) return null;

  const base = typeof requestDoc.toObject === 'function'
    ? requestDoc.toObject()
    : { ...requestDoc };

  return {
    ...base,
    residentName: base.requester?.name || 'Resident',
    requestedAction: base.actionLabel || base.actionKey || 'Unknown action',
    timestamp: base.createdAt || new Date().toISOString(),
  };
};

const emitPermissionCreated = (requestDoc) => {
  if (!ioInstance) return;
  const payload = toPermissionPayload(requestDoc);
  if (!payload) return;

  const requesterId = normalizeRequesterId(requestDoc);
  const adminId = normalizeUserId(payload.houseAdmin);
  const houseCode = payload.houseCode;

  if (houseCode) {
    console.log('[socket] emit requestCreated', { houseCode, adminId, requesterId, requestId: payload._id });
    ioInstance.to(houseCode).emit('requestCreated', payload);
    ioInstance.to(`house-admin:${houseCode}`).emit('permissions:created', payload);
    ioInstance.to(`house-admin:${houseCode}`).emit('requestCreated', payload);
  }
  if (adminId) {
    ioInstance.to(adminId).emit('requestCreated', payload);
    ioInstance.to(`user:${adminId}`).emit('requestCreated', payload);
  }
  if (requesterId) {
    ioInstance.to(`user:${requesterId}`).emit('permissions:created', payload);
  }
};

const emitPermissionUpdated = (requestDoc) => {
  if (!ioInstance) return;
  const payload = toPermissionPayload(requestDoc);
  if (!payload) return;

  const requesterId = normalizeRequesterId(requestDoc);
  const adminId = normalizeUserId(payload.houseAdmin);
  const houseCode = payload.houseCode;

  if (houseCode) {
    console.log('[socket] emit requestStatusChanged', { houseCode, adminId, requesterId, requestId: payload._id, status: payload.status });
    ioInstance.to(houseCode).emit('requestStatusChanged', payload);
    ioInstance.to(`house-admin:${houseCode}`).emit('permissions:updated', payload);
    ioInstance.to(`house-admin:${houseCode}`).emit('requestStatusChanged', payload);
  }
  if (adminId) {
    ioInstance.to(adminId).emit('requestStatusChanged', payload);
    ioInstance.to(`user:${adminId}`).emit('requestStatusChanged', payload);
  }
  if (requesterId) {
    ioInstance.to(requesterId).emit('requestStatusChanged', payload);
    ioInstance.to(`user:${requesterId}`).emit('permissions:updated', payload);
    ioInstance.to(`user:${requesterId}`).emit('requestStatusChanged', payload);
  }
};

const emitPermissionsUpdated = ({ userId, permissions }) => {
  if (!ioInstance || !userId) return;
  console.log('[socket] emit permissionsUpdated', { userId: String(userId), permissions });
  ioInstance.to(String(userId)).emit('permissionsUpdated', {
    userId: String(userId),
    permissions: Array.isArray(permissions) ? permissions : [],
  });
  ioInstance.to(`user:${userId}`).emit('permissionsUpdated', {
    userId: String(userId),
    permissions: Array.isArray(permissions) ? permissions : [],
  });
};

const emitHouseUserCreated = (userDoc) => {
  if (!ioInstance || !userDoc?.houseCode) return;
  ioInstance.to(`house-admin:${userDoc.houseCode}`).emit('house-users:created', userDoc);
};

const emitHouseUserUpdated = (userDoc) => {
  if (!ioInstance || !userDoc?.houseCode) return;
  ioInstance.to(`house-admin:${userDoc.houseCode}`).emit('house-users:updated', userDoc);
};

const emitHouseUserDeleted = ({ houseCode, userId }) => {
  if (!ioInstance || !houseCode || !userId) return;
  ioInstance.to(`house-admin:${houseCode}`).emit('house-users:deleted', { userId });
};

const emitDashboardStateUpdated = ({ houseCode, payload }) => {
  if (!ioInstance || !houseCode) return;
  ioInstance.to(`house:${houseCode}`).emit('dashboard:state-updated', payload);
};

/**
 * Broadcast a gas-level reading + emergency state to every client in the house.
 * Emitted on every sensor reading so the UI can show live ppm even if not in emergency.
 */
const emitGasEmergency = ({ houseCode, gasLevel, threshold, emergencyMode, gasValveOpen }) => {
  if (!ioInstance || !houseCode) return;
  const payload = { houseCode, gasLevel, threshold, emergencyMode, gasValveOpen, ts: Date.now() };
  ioInstance.to(`house:${houseCode}`).emit('house:gas-emergency', payload);
  // Also update the main dashboard state so the header reacts
  ioInstance.to(`house:${houseCode}`).emit('dashboard:gas-update', payload);
  // Forward gas leaks to every connected agency dashboard in real-time
  if (emergencyMode) {
    // Forward gas leaks to any connected concierge/global listeners in real-time
    ioInstance.to('agency:global').emit('agency:gas-alert', { houseCode, gasLevel, threshold, ts: Date.now() });
  }
};

// Concierge event emitter: used by concierge SSE/routes to subscribe to agency events
const EventEmitter = require('events');
const conciergeEmitter = new EventEmitter();

const emitDeviceUpdated = (device) => {
  console.log('[emit] emitDeviceUpdated houseCode=', device?.houseCode, 'ioInstance=', !!ioInstance);
  if (!ioInstance || !device?.houseCode) return;
  const room = `house:${device.houseCode}`;
  const sockets = ioInstance.sockets.adapter.rooms.get(room);
  console.log('[emit] room=', room, 'sockets in room=', sockets ? sockets.size : 0);
  ioInstance.to(room).emit('device:updated', device);
};

const emitAgencyUnitUpdated = (unit) => {
  if (!ioInstance) return;
  ioInstance.to('agency:global').emit('agency:unit-updated', unit);
  conciergeEmitter.emit('agency:unit-updated', unit);
};

// export additional helpers for concierge endpoints
module.exports = {
  initNotificationsServer,
  emitPermissionCreated,
  emitPermissionUpdated,
  emitPermissionsUpdated,
  emitHouseUserCreated,
  emitHouseUserUpdated,
  emitHouseUserDeleted,
  emitDashboardStateUpdated,
  emitGasEmergency,
  emitAgencyUnitUpdated,
  emitDeviceUpdated,
  conciergeEmitter,
};

// Helper to check if any sockets remain in a house-admin room
module.exports.isHouseAdminOnline = (houseCode) => {
  try {
    if (!ioInstance) return false;
    const room = ioInstance.sockets.adapter.rooms.get(`house-admin:${houseCode}`);
    return !!(room && room.size > 0);
  } catch (err) {
    return false;
  }
};

