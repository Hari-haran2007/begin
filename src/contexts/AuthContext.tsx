import { API_URL } from '../lib/api';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Profile, GrowthMetrics } from '../types'; // Moved types away from supabase.ts

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthError {
  message: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  profile: Profile | null;
  growthMetrics: GrowthMetrics | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string, rollNumber: string, department: string, semester: number) => Promise<{ error: AuthError | null }>;
  signInStaff: (staffId: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpStaff: (staffId: string, password: string, fullName: string, department: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  

  const fetchProfile = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = { ...data, id: data._id, user_id: data._id };
        setProfile(normalized);
        setUser({ id: data._id, email: data.email, role: data.role });
        return normalized;
      }
      return null;
    } catch (err) {
      console.error('Fetch profile exception:', err);
      return null;
    }
  }, []);

  const fetchGrowthMetrics = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/growthMetrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const metric = Array.isArray(data) && data.length > 0 ? data[0] : null;
        setGrowthMetrics(metric);
        return metric;
      }
      return null;
    } catch (err) {
      console.error('Fetch growth metrics exception:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        await fetchProfile(token);
        await fetchGrowthMetrics(token);
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token, fetchProfile, fetchGrowthMetrics]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { error: null };
    } catch (err) {
      return { error: err as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, rollNumber: string, department: string, semester: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, roll_number: rollNumber, department, semester, role: 'student' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { error: null };
    } catch (err) {
      return { error: err as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signInStaff = async (staffId: string, password: string) => {
    setLoading(true);
    try {
      const sanitizedId = staffId.trim().replace(/\s+/g, '').toLowerCase();
      const email = `${sanitizedId}@staff.beyondgrades.internal`;
      return await signIn(email, password);
    } catch (err) {
      return { error: err as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signUpStaff = async (staffId: string, password: string, fullName: string, department: string) => {
    setLoading(true);
    try {
      const sanitizedId = staffId.trim().replace(/\s+/g, '').toLowerCase();
      const email = `${sanitizedId}@staff.beyondgrades.internal`;
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, roll_number: staffId, department, semester: 0, role: 'staff' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { error: null };
    } catch (err) {
      return { error: err as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setProfile(null);
    setGrowthMetrics(null);
    setLoading(false);
  };

  const resetPassword = async (email: string) => {
    return { error: new Error('Not implemented for MongoDB yet') as AuthError };
  };

  const updatePassword = async (password: string) => {
    return { error: new Error('Not implemented for MongoDB yet') as AuthError };
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
      await fetchGrowthMetrics(token);
    }
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      profile,
      growthMetrics,
      loading,
      signIn,
      signUp,
      signInStaff,
      signUpStaff,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
