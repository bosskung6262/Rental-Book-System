// FrontEnd/src/api/axios.js
import axios from 'axios';

// 🔥 สำคัญ: ตรวจสอบ BASE_URL
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8888/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: แนบ Token
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 🔥 Debug Log
    console.log(`📡 [${config.method.toUpperCase()}] ${config.baseURL}${config.url}`, config.data);
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: จัดการ Error
instance.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.data);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default instance;