import { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api.js';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [health, setHealth] = useState({ state: 'checking', modelName: null });

  const checkHealth = async () => {
    try {
      const response = await fetchApi('/api/health');
      setHealth({ state: 'ok', modelName: response.modelName || null });
    } catch (error) {
      setHealth({ state: 'error', modelName: null });
      console.error('Health check failed:', error);
    }
  };

  const login = async ({ username, password }) => {
    try {
      const response = await fetchApi('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      setIsAuthenticated(false);
      console.error('Login failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return {
    isAuthenticated,
    health,
    login,
    checkHealth,
  };
}
