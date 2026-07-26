import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../utils/api.js';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [health, setHealth] = useState({ state: 'checking', modelName: null });

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetchApi('/api/health');
      setHealth({ state: 'ok', modelName: response.modelName || null });
    } catch (error) {
      setHealth({ state: 'error', modelName: null });
      console.error('Health check failed:', error);
    }
  }, []);

  const checkSession = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      const response = await fetchApi('/api/auth/me');
      if (response && response.user) {
        setIsAuthenticated(true);
        setUser(response.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const login = async ({ username, password }) => {
    try {
      await fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      // After successful login, get user details
      await checkSession();
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  useEffect(() => {
    checkHealth();
    checkSession();
  }, [checkHealth, checkSession]);

  return {
    isAuthenticated,
    user,
    isAuthLoading,
    health,
    login,
    logout,
    checkHealth,
  };
}
