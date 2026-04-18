import { io } from 'socket.io-client';

let dashboardSocket = null;
let activeToken = '';

export const connectDashboardSocket = (token) => {
  if (!token) return null;

  if (dashboardSocket && activeToken === token) {
    return dashboardSocket;
  }

  if (dashboardSocket) {
    dashboardSocket.disconnect();
  }

  dashboardSocket = io('http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    withCredentials: false,
  });

  activeToken = token;
  return dashboardSocket;
};

export const disconnectDashboardSocket = () => {
  if (dashboardSocket) {
    dashboardSocket.disconnect();
    dashboardSocket = null;
    activeToken = '';
  }
};
