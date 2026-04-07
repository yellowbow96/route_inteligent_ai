import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const API_BASE = '';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      setUser({ token }); // In a real app, fetch profile. We'll use token presence.
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await axios.post(`${API_BASE}/api/auth/login/`, { username, password });
    setToken(res.data.token);
    localStorage.setItem('username', username);
  };

  const register = async (username, password, fullName) => {
    const res = await axios.post(`${API_BASE}/api/auth/register/`, { username, password, full_name: fullName });
    setToken(res.data.token);
    localStorage.setItem('username', username);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('username');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
