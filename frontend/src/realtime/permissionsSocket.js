import { io } from 'socket.io-client';

let socketInstance = null;
let currentToken = '';

const getSocketBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return String(envUrl).replace(/\/api\/?$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:5000`;
  }

  return 'http://localhost:5000';
};

export const connectPermissionsSocket = (token) => {
  if (!token) return null;

  if (socketInstance && currentToken === token) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  socketInstance = io(getSocketBaseUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    withCredentials: false,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  });

  currentToken = token;
  return socketInstance;
};

export const disconnectPermissionsSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = '';
  }
};
