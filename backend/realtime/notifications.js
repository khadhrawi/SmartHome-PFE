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

    socket.join(`user:${userId}`);
    socket.join(`role:${userRole}`);

    if (houseCode) {
      socket.join(`house:${houseCode}`);
    }

    if (userRole === 'admin' && houseCode) {
      socket.join(`house-admin:${houseCode}`);
    }
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

const emitPermissionCreated = (requestDoc) => {
  if (!ioInstance) return;
  const requesterId = normalizeRequesterId(requestDoc);
  const houseCode = requestDoc?.houseCode;

  if (houseCode) {
    ioInstance.to(`house-admin:${houseCode}`).emit('permissions:created', requestDoc);
  }
  if (requesterId) {
    ioInstance.to(`user:${requesterId}`).emit('permissions:created', requestDoc);
  }
};

const emitPermissionUpdated = (requestDoc) => {
  if (!ioInstance) return;
  const requesterId = normalizeRequesterId(requestDoc);
  const houseCode = requestDoc?.houseCode;

  if (houseCode) {
    ioInstance.to(`house-admin:${houseCode}`).emit('permissions:updated', requestDoc);
  }
  if (requesterId) {
    ioInstance.to(`user:${requesterId}`).emit('permissions:updated', requestDoc);
  }
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

module.exports = {
  initNotificationsServer,
  emitPermissionCreated,
  emitPermissionUpdated,
  emitHouseUserCreated,
  emitHouseUserUpdated,
  emitHouseUserDeleted,
  emitDashboardStateUpdated,
};
