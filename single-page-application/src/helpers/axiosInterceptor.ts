import axios from 'axios';

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    // Không thêm token nếu đang gọi tới /login hoặc /register
    const isAuthUrl =
      config.url?.includes('/login') || config.url?.includes('/register');

    if (!token && !isAuthUrl) {
      window.location.href = '/login';
      throw new Error('No token, redirecting to login...');
    }

    if (token && !isAuthUrl) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

