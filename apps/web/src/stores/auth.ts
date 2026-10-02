'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';

interface AuthState {
  token: string | null;
  role: 'faculty' | 'student' | 'admin' | 'ta' | null;
  userId: string | null;
  fullName: string | null;
  courseId: string | null;
  loading: boolean;
  error: string | null;
  setAuth: (token: string, role: AuthState['role'], userId: string, fullName?: string) => void;
  setCourseId: (courseId: string) => void;
  clearAuth: () => void;
  login: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('lms_token') : null,
  role: (typeof window !== 'undefined' ? localStorage.getItem('lms_role') : null) as AuthState['role'],
  userId: typeof window !== 'undefined' ? localStorage.getItem('lms_user_id') : null,
  fullName: typeof window !== 'undefined' ? localStorage.getItem('lms_full_name') : null,
  courseId: typeof window !== 'undefined' ? localStorage.getItem('lms_course_id') : null,
  loading: false,
  error: null,

  setAuth: (token, role, userId, fullName) => {
    localStorage.setItem('lms_token', token);
    if (role) localStorage.setItem('lms_role', role);
    localStorage.setItem('lms_user_id', userId);
    if (fullName) localStorage.setItem('lms_full_name', fullName);
    set({ token, role, userId, fullName: fullName ?? null });
  },

  setCourseId: (courseId) => {
    localStorage.setItem('lms_course_id', courseId);
    set({ courseId });
  },

  clearAuth: () => {
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_role');
    localStorage.removeItem('lms_user_id');
    localStorage.removeItem('lms_full_name');
    localStorage.removeItem('lms_course_id');
    set({ token: null, role: null, userId: null, fullName: null, courseId: null });
  },

  login: async (email: string) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient<{ token: string; user_id: string; role: string; full_name: string }>(
        '/api/v1/auth/login',
        { method: 'POST', body: JSON.stringify({ email }) },
      );
      const role = res.role as AuthState['role'];
      localStorage.setItem('lms_token', res.token);
      localStorage.setItem('lms_role', res.role);
      localStorage.setItem('lms_user_id', res.user_id);
      localStorage.setItem('lms_full_name', res.full_name);
      set({ token: res.token, role, userId: res.user_id, fullName: res.full_name, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },
}));
