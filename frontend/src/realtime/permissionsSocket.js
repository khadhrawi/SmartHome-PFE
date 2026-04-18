import { io } from 'socket.io-client';

let socketInstance = null;
let currentToken = '';

export const connectPermissionsSocket = (token) => {
  if (!token) return null;

  if (socketInstance && currentToken === token) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  socketInstance = io('http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    withCredentials: false,
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
