import axios from 'axios';
import { API_URL } from '../constants/common';

const api = axios.create({
  baseURL: `${API_URL}:8762/api/v1`, // chỉnh theo API Gateway của bạn
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: gắn accessToken vào header
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    const isAuthUrl =
      config.url?.includes('/login') || config.url?.includes('/register');

    if (accessToken && !isAuthUrl) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: nếu 401 thì thử refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu người dụng bị ban
    if (error.response?.status === 403) {
      localStorage.clear();
      window.location.href = '/login';
      alert('Your account has been banned. Please contact support.');
      return Promise.reject(error);
    }
    // Nếu token hết hạn và chưa retry → refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const res = await axios.post(
          `${API_URL}:8762/api/v1/auth/refresh-token`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        const {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        } = res.data as {
          accessToken: string;
          refreshToken: string;
        };

        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Gắn lại header rồi retry request cũ
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token failed', refreshError);
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
