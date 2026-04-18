import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { connectPermissionsSocket, disconnectPermissionsSocket } from '../realtime/permissionsSocket';

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

const sortUsersByLatest = (users) => {
  return [...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const upsertHouseUser = (users, nextUser) => {
  const filtered = users.filter((item) => item._id !== nextUser._id);
  return sortUsersByLatest([nextUser, ...filtered]);
};

export const AuthProvider = ({ children }) => {
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

  const hasApprovedPermission = (actionKey, room = '') => {
    return myPermissionRequests.some(
      (request) => request.status === 'approved' && request.actionKey === actionKey && (request.room || '') === room,
    );
  };

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

    const handleCreated = (request) => {
      if (user.role === 'admin') {
        setAdminPermissionRequests((prev) => upsertPermissionRequest(prev, request));
      }

      if (String(getRequesterId(request)) === String(user._id)) {
        setMyPermissionRequests((prev) => upsertPermissionRequest(prev, request));
      }
    };

    const handleUpdated = (request) => {
      if (user.role === 'admin') {
        setAdminPermissionRequests((prev) => upsertPermissionRequest(prev, request));
      }

      if (String(getRequesterId(request)) === String(user._id)) {
        setMyPermissionRequests((prev) => upsertPermissionRequest(prev, request));
      }
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

    socket.on('permissions:created', handleCreated);
    socket.on('permissions:updated', handleUpdated);
    socket.on('house-users:created', handleHouseUserCreated);
    socket.on('house-users:updated', handleHouseUserUpdated);
    socket.on('house-users:deleted', handleHouseUserDeleted);

    return () => {
      socket.off('permissions:created', handleCreated);
      socket.off('permissions:updated', handleUpdated);
      socket.off('house-users:created', handleHouseUserCreated);
      socket.off('house-users:updated', handleHouseUserUpdated);
      socket.off('house-users:deleted', handleHouseUserDeleted);
      disconnectPermissionsSocket();
    };
  }, [token, user]);

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
