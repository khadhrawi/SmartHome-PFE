import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { connectPermissionsSocket, disconnectPermissionsSocket } from '../realtime/permissionsSocket';
import { useTheme } from './ThemeContext';

export const AuthContext = createContext();

const sortByLatest = (requests) => {
  return [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const upsertPermissionRequest = (requests, nextRequest) => {
  const filtered = requests.filter((request) => request._id !== nextRequest._id);
  return sortByLatest([nextRequest, ...filtered]);
};

const getRequesterId = (request) => {
  if (!request?.requester) return '';
  if (typeof request.requester === 'string') return request.requester;
  return request.requester._id || '';
};

const normalizeActionKey = (value) => String(value || '').trim().toLowerCase();
const normalizeRoom = (value) => String(value || '').trim().toLowerCase();

const mergePermissionsFromApprovedRequest = (permissions, request) => {
  if (!request || request.status !== 'approved') return Array.isArray(permissions) ? permissions : [];

  const nextPermissions = new Set(Array.isArray(permissions) ? permissions.map(normalizeActionKey) : []);
  const actionKey = normalizeActionKey(request.actionKey);
  const room = normalizeRoom(request.room);

  if (actionKey) {
    nextPermissions.add(actionKey);
  }

  if (room) {
    nextPermissions.add(room);
    nextPermissions.add(`room:${room}`);
  }

  return [...nextPermissions];
};

const sortUsersByLatest = (users) => {
  return [...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const upsertHouseUser = (users, nextUser) => {
  const filtered = users.filter((item) => item._id !== nextUser._id);
  return sortUsersByLatest([nextUser, ...filtered]);
};

export const AuthProvider = ({ children }) => {
  const { pushToast, notificationsEnabled } = useTheme();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myPermissionRequests, setMyPermissionRequests] = useState([]);
  const [adminPermissionRequests, setAdminPermissionRequests] = useState([]);
  const [houseCrew, setHouseCrew] = useState([]);

  useEffect(() => {
    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        const parsed = JSON.parse(storedUserInfo);
        if (parsed && typeof parsed === 'object' && parsed.token) {
          setUser(parsed);
          setToken(parsed.token);
        } else {
          localStorage.removeItem('userInfo');
        }
      }
    } catch {
      localStorage.removeItem('userInfo');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAuthState = (data) => {
    setUser(data);
    setToken(data.token);
    localStorage.setItem('userInfo', JSON.stringify(data));
  };

  const setUserWithLocalSync = (updater) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('userInfo', JSON.stringify(next));
      return next;
    });
  };

  const loginResident = async (email, password, houseCode) => {
    try {
      const { data } = await api.post('/auth/resident/login', { email, password, houseCode });
      saveAuthState(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  };

  const loginAdmin = async (email, password, adminAccessCode) => {
    try {
      const { data } = await api.post('/auth/admin/login', { email, password, adminAccessCode });
      saveAuthState(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  };

  const registerAdmin = async (name, email, password, adminAccessCode) => {
    try {
      const { data } = await api.post('/auth/admin/register', { name, email, password, adminAccessCode });
      saveAuthState(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Registration failed' };
    }
  };

  const registerResident = async ({ name, email, password, assignedRoom, roomRequest, inviteCode, houseCode }) => {
    try {
      const { data } = await api.post('/auth/resident/register', {
        name,
        email,
        password,
        houseCode,
        assignedRoom,
        roomRequest,
        inviteCode,
      });
      saveAuthState(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Registration failed' };
    }
  };

  const requestPermission = async ({ actionKey, actionLabel, room = '', reason = '' }) => {
    try {
      const { data } = await api.post('/permissions/request', { actionKey, actionLabel, room, reason });
      setMyPermissionRequests((prev) => upsertPermissionRequest(prev, data));
      pushToast('Your request has been sent to the admin', '#38bdf8');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to send request' };
    }
  };

  const fetchMyPermissionRequests = async () => {
    if (!token) return [];
    try {
      const { data } = await api.get('/permissions/mine');
      setMyPermissionRequests(sortByLatest(data));
      return data;
    } catch {
      return [];
    }
  };

  const fetchAdminRequests = async (status = '') => {
    const query = status ? `?status=${status}` : '';
    const { data } = await api.get(`/permissions/admin/requests${query}`);
    if (!status) {
      setAdminPermissionRequests(sortByLatest(data));
    }
    return data;
  };

  const reviewPermissionRequest = async ({ requestId, decision, reviewNote = '' }) => {
    const { data } = await api.patch(`/permissions/admin/requests/${requestId}`, { decision, reviewNote });
    setAdminPermissionRequests((prev) => upsertPermissionRequest(prev, data));
    if (String(getRequesterId(data)) === String(user?._id)) {
      setMyPermissionRequests((prev) => upsertPermissionRequest(prev, data));
    }
    if (decision === 'approved') {
      pushToast('Request approved', '#4ade80');
    } else if (decision === 'denied') {
      pushToast('Request denied', '#fb7185');
    }
    return data;
  };

  const markPermissionNotificationAsRead = async (requestId) => {
    const { data } = await api.patch(`/permissions/${requestId}/read`);
    setAdminPermissionRequests((prev) => upsertPermissionRequest(prev, data));
    setMyPermissionRequests((prev) => upsertPermissionRequest(prev, data));
    return data;
  };

  const markAllPermissionNotificationsAsRead = async () => {
    const endpoint = user?.role === 'admin' ? '/permissions/admin/read-all' : '/permissions/mine/read-all';
    const { data } = await api.patch(endpoint);
    const readAt = data.readAt || new Date().toISOString();

    if (user?.role === 'admin') {
      setAdminPermissionRequests((prev) =>
        prev.map((request) => ({
          ...request,
          adminReadAt: request.adminReadAt || readAt,
        })),
      );
    } else {
      setMyPermissionRequests((prev) =>
        prev.map((request) => ({
          ...request,
          requesterReadAt: request.requesterReadAt || readAt,
        })),
      );
    }
  };

  const getUnreadPermissionCount = useCallback(() => {
    if (user?.role === 'admin') {
      return adminPermissionRequests.filter((request) => !request.adminReadAt).length;
    }
    return myPermissionRequests.filter((request) => !request.requesterReadAt).length;
  }, [adminPermissionRequests, myPermissionRequests, user?.role]);

  const hasApprovedPermission = useCallback((actionKey, room = '') => {
    const normalizedActionKey = normalizeActionKey(actionKey);
    const normalizedRoom = normalizeRoom(room);

    const directPermissions = new Set(
      (Array.isArray(user?.permissions) ? user.permissions : []).map(normalizeActionKey),
    );

    if (normalizedActionKey && directPermissions.has(normalizedActionKey)) {
      return true;
    }

    if (normalizedRoom) {
      if (directPermissions.has(normalizedRoom) || directPermissions.has(`room:${normalizedRoom}`)) {
        return true;
      }
    }

    return myPermissionRequests.some((request) => {
      if (request.status !== 'approved') return false;

      const requestAction = normalizeActionKey(request.actionKey);
      const requestRoom = normalizeRoom(request.room);

      if (normalizedActionKey && requestAction === normalizedActionKey) {
        return true;
      }

      if (normalizedRoom && requestRoom === normalizedRoom) {
        return true;
      }

      return false;
    });
  }, [myPermissionRequests, user?.permissions]);

  const fetchHouseCrew = async () => {
    try {
      const { data } = await api.get('/users/house-crew');
      setHouseCrew(sortUsersByLatest(data));
      return { success: true, data };
    } catch (error) {
      setHouseCrew([]);
      return { success: false, error: error.response?.data?.message || 'Failed to fetch crew members', data: [] };
    }
  };

  const createHouseMember = async (payload) => {
    try {
      const { data } = await api.post('/users/house-crew', payload);
      setHouseCrew((prev) => upsertHouseUser(prev, data));
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to create user' };
    }
  };

  const deleteHouseMember = async (userId) => {
    try {
      await api.delete(`/users/house-crew/${userId}`);
      setHouseCrew((prev) => prev.filter((item) => item._id !== userId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to delete member' };
    }
  };

  const updateHouseMember = async (userId, updates) => {
    try {
      const { data } = await api.patch(`/users/house-crew/${userId}`, updates);
      setHouseCrew((prev) => upsertHouseUser(prev, data));
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to update user' };
    }
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
    setToken(null);
    setMyPermissionRequests([]);
    setAdminPermissionRequests([]);
    setHouseCrew([]);
    disconnectPermissionsSocket();
  };

  useEffect(() => {
    if (!token || !user) return;

    if (user.role === 'admin') {
      fetchAdminRequests();
      fetchHouseCrew();
    } else {
      fetchMyPermissionRequests();
    }
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) return undefined;

    const socket = connectPermissionsSocket(token);
    if (!socket) return undefined;
    socket.connect();

    const handleCreated = (request) => {
      console.log('REQUEST RECEIVED:', request);
      if (user.role === 'admin') {
        setAdminPermissionRequests((prev) => upsertPermissionRequest(prev, request));
      }

      if (String(getRequesterId(request)) === String(user._id)) {
        setMyPermissionRequests((prev) => upsertPermissionRequest(prev, request));
      }
    };

    const notifyAdminOnCreated = (request) => {
      if (user.role !== 'admin') return;
      const residentName = request.residentName || request.requester?.name || 'Resident';
      const requestedAction = request.requestedAction || request.actionLabel || 'a feature';
      pushToast(`${residentName} requested access to ${requestedAction}`, '#38bdf8');
    };

    const handleUpdated = (request) => {
      console.log('REQUEST STATUS CHANGED:', request);
      if (user.role === 'admin') {
        setAdminPermissionRequests((prev) => upsertPermissionRequest(prev, request));
      }

      if (String(getRequesterId(request)) === String(user._id)) {
        setMyPermissionRequests((prev) => upsertPermissionRequest(prev, request));
        if (request.status === 'approved') {
          setUserWithLocalSync((prev) => ({
            ...prev,
            permissions: mergePermissionsFromApprovedRequest(prev.permissions, request),
          }));
        }
      }
    };

    const notifyResidentOnStatusChanged = (request) => {
      if (user.role === 'admin') return;

      if (request.status === 'approved') {
        pushToast('Your request has been approved', '#4ade80');
        return;
      }

      if (request.status === 'denied') {
        const deniedAction = request.requestedAction || request.actionLabel || 'this feature';
        pushToast(`Your request to ${deniedAction} was denied`, '#fb7185');
      }
    };

    const handlePermissionsUpdated = ({ userId, permissions }) => {
      console.log('PERMISSIONS UPDATED:', { userId, permissions });
      if (String(userId) !== String(user._id)) return;
      setUserWithLocalSync((prev) => ({
        ...prev,
        permissions: Array.isArray(permissions) ? permissions : prev.permissions,
      }));
    };

    const handleHouseUserCreated = (houseUser) => {
      if (user.role !== 'admin') return;
      setHouseCrew((prev) => upsertHouseUser(prev, houseUser));
    };

    const handleHouseUserUpdated = (houseUser) => {
      if (user.role !== 'admin') return;
      setHouseCrew((prev) => upsertHouseUser(prev, houseUser));
    };

    const handleHouseUserDeleted = ({ userId }) => {
      if (user.role !== 'admin') return;
      setHouseCrew((prev) => prev.filter((item) => item._id !== userId));
    };

    const handleSocketConnect = () => {
      console.log('PERMISSIONS SOCKET CONNECTED:', socket.id);
      if (user.role === 'admin') {
        fetchAdminRequests();
      } else {
        fetchMyPermissionRequests();
      }
    };

    const handleSocketError = () => {
      console.error('PERMISSIONS SOCKET ERROR');
    };

    const handleRequestCreated = (request) => {
      handleCreated(request);
      notifyAdminOnCreated(request);
    };

    const handleRequestStatusChanged = (request) => {
      handleUpdated(request);
      notifyResidentOnStatusChanged(request);
    };

    socket.on('permissions:created', handleCreated);
    socket.on('permissions:updated', handleUpdated);
    socket.on('requestCreated', handleRequestCreated);
    socket.on('requestStatusChanged', handleRequestStatusChanged);
    socket.on('permissionsUpdated', handlePermissionsUpdated);
    socket.on('house-users:created', handleHouseUserCreated);
    socket.on('house-users:updated', handleHouseUserUpdated);
    socket.on('house-users:deleted', handleHouseUserDeleted);
    socket.on('connect', handleSocketConnect);
    socket.on('connect_error', handleSocketError);
    socket.on('reconnect_error', handleSocketError);

    return () => {
      socket.off('permissions:created', handleCreated);
      socket.off('permissions:updated', handleUpdated);
      socket.off('requestCreated', handleRequestCreated);
      socket.off('requestStatusChanged', handleRequestStatusChanged);
      socket.off('permissionsUpdated', handlePermissionsUpdated);
      socket.off('house-users:created', handleHouseUserCreated);
      socket.off('house-users:updated', handleHouseUserUpdated);
      socket.off('house-users:deleted', handleHouseUserDeleted);
      socket.off('connect', handleSocketConnect);
      socket.off('connect_error', handleSocketError);
      socket.off('reconnect_error', handleSocketError);
    };
  }, [token, user, notificationsEnabled, pushToast]);

  if (loading) return null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loginResident,
        loginAdmin,
        registerAdmin,
        registerResident,
        logout,
        requestPermission,
        houseCrew,
        myPermissionRequests,
        adminPermissionRequests,
        fetchMyPermissionRequests,
        fetchAdminRequests,
        reviewPermissionRequest,
        markPermissionNotificationAsRead,
        markAllPermissionNotificationsAsRead,
        getUnreadPermissionCount,
        hasApprovedPermission,
        fetchHouseCrew,
        createHouseMember,
        deleteHouseMember,
        updateHouseMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
