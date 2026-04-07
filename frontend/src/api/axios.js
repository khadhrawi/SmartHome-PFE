import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Note: backend express server port
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to include token
api.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    const { token } = JSON.parse(userInfo);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
