import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let sharedSocket = null;
let refCount = 0;

const getSocket = (token) => {
  if (!sharedSocket || sharedSocket.disconnected) {
    sharedSocket = io('/', {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return sharedSocket;
};

/**
 * Returns a stable socket instance tied to the user's JWT.
 * Automatically disconnects when ref count hits 0.
 */
const useSocket = (token) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    socketRef.current = socket;
    refCount++;

    return () => {
      refCount--;
      if (refCount === 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
      }
    };
  }, [token]);

  const on = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  return { socket: socketRef.current, on };
};

export default useSocket;
