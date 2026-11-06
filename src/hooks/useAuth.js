import { useState, useEffect, useCallback } from 'react';
import { getAdminSession, loginWithDevBypass, signOutAdmin } from '../services/api/auth.js';
import { isLocalEnvironment, isDevBypassActive } from '../services/api/client.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusCode, setStatusCode] = useState(null);

  const checkSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminSession();
      if (res.ok) {
        setUser(res.user);
        setStatusCode(200);
      } else {
        setUser(null);
        setStatusCode(res.status || 401);
        setError(res.error || 'Authentication required');
      }
    } catch (err) {
      setUser(null);
      setStatusCode(err.status || 500);
      setError(err.message || 'Error verifying admin session');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const signInDev = async () => {
    setLoading(true);
    try {
      const res = await loginWithDevBypass();
      if (res.ok) {
        setUser(res.user);
        setStatusCode(200);
        setError(null);
      } else {
        setError(res.error);
        setStatusCode(res.status);
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await signOutAdmin();
    setUser(null);
    setStatusCode(401);
  };

  return {
    user,
    isAdmin: Boolean(user),
    loading,
    isLoading: loading,
    error,
    statusCode,
    isForbidden: statusCode === 403,
    isLocal: isLocalEnvironment(),
    isDevBypass: isDevBypassActive(),
    refreshSession: checkSession,
    signInDev,
    signOut
  };
}
