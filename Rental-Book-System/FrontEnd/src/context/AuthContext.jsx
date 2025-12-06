import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get('/users/profile');
      setUser(res.data);
    } catch (err) {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await fetchUserProfile();
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.login(email, password);
      if (res.token) {
        localStorage.setItem('token', res.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.token}`;
        setUser(res.user);
        navigate('/');
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.response?.data || "Login failed" };
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await api.register(username, email, password);
      if (res.token) {
        localStorage.setItem('token', res.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.token}`;
        setUser(res.user);
        navigate('/');
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.response?.data || "Register failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateProfile: api.updateProfile, changePassword: api.changePassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};