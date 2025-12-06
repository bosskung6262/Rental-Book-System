import axios from 'axios';

// Vercel Environment Variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888/api';

const instance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
       // กันกรณี User อยู่หน้า Login อยู่แล้วไม่ต้อง Refresh ซ้ำ
       if (!window.location.pathname.includes('/login')) {
           localStorage.removeItem('token');
           window.location.href = '/login';
       }
    }
    return Promise.reject(error);
  }
);

export default instance;