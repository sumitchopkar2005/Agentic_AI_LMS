'use client';

import { create } from 'zustand';
import type { Course, Assignment, IngestionStatus } from '@/types/api';
import * as coursesApi from '@/lib/api/courses';
import * as assignmentsApi from '@/lib/api/assignments';

// ── sessionStorage helpers for generation state (survives page refreshes) ──
const GEN_STORAGE_KEY = 'lms_gen_state';

interface PersistedGenState {
  isGenerating: boolean;
  genTypes: AssignmentType[];
  genStartTime: number | null;
  genTaskId: string | null;
  genCourseId: string | null;
}

function saveGenState(s: PersistedGenState) {
  try { sessionStorage.setItem(GEN_STORAGE_KEY, JSON.stringify(s)); } catch {}
}

function loadGenState(): PersistedGenState {
  try {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(GEN_STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw) as PersistedGenState;
  } catch {}
  return { isGenerating: false, genTypes: [], genStartTime: null, genTaskId: null, genCourseId: null };
}

function clearGenState() {
  try { sessionStorage.removeItem(GEN_STORAGE_KEY); } catch {}
}

interface DashboardStats {
  active_courses: number;
  total_students: number;
  pending_reviews: number;
  at_risk_count: number;
}

type AssignmentType = 'MCQ' | 'SCENARIO' | 'CODE_LAB' | 'DEBATE' | 'REVERSE_ESSAY' | 'CUSTOM';

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  assignments: Assignment[];
  ingestionStatus: IngestionStatus | null;
  dashboardStats: DashboardStats | null;
  loading: boolean;
  error: string | null;

  // Generation state (persists across component remounts)
  isGenerating: boolean;
  genTypes: AssignmentType[];
  genStartTime: number | null;
  genTaskId: string | null;
  genCourseId: string | null;

  fetchCourses: (token: string) => Promise<void>;
  fetchCourse: (courseId: string, token: string) => Promise<void>;
  createCourse: (data: { title: string; description?: string }, token: string) => Promise<Course>;
  updateCourse: (courseId: string, data: Record<string, unknown>, token: string) => Promise<void>;
  fetchAssignments: (courseId: string, token: string) => Promise<void>;
  generateAssignments: (courseId: string, config: Record<string, unknown>, token: string) => Promise<string | null>;
  fetchIngestionStatus: (courseId: string, token: string) => Promise<void>;
  fetchDashboardStats: (token: string) => Promise<void>;
  startGeneration: (types: AssignmentType[], taskId: string, courseId: string) => void;
  stopGeneration: () => void;
  clearError: () => void;
}

// Restore generation state from sessionStorage (survives HMR & page refresh)
const _restored = loadGenState();

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: [],
  currentCourse: null,
  assignments: [],
  ingestionStatus: null,
  dashboardStats: null,
  loading: false,
  error: null,
  isGenerating: _restored.isGenerating,
  genTypes: _restored.genTypes,
  genStartTime: _restored.genStartTime,
  genTaskId: _restored.genTaskId,
  genCourseId: _restored.genCourseId,

  fetchCourses: async (token) => {
    set({ loading: true, error: null });
    try {
      const courses = await coursesApi.listCourses(token);
      set({ courses, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchCourse: async (courseId, token) => {
    set({ loading: true, error: null });
    try {
      const course = await coursesApi.getCourse(courseId, token);
      set({ currentCourse: course, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createCourse: async (data, token) => {
    set({ loading: true, error: null });
    try {
      const course = await coursesApi.createCourse(data, token);
      set((s) => ({ courses: [course, ...s.courses], loading: false }));
      return course;
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  updateCourse: async (courseId, data, token) => {
    try {
      const updated = await coursesApi.updateCourse(courseId, data, token);
      set((s) => ({
        courses: s.courses.map((c) => (c.id === courseId ? updated : c)),
        currentCourse: s.currentCourse?.id === courseId ? updated : s.currentCourse,
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchAssignments: async (courseId, token) => {
    try {
      const assignments = await assignmentsApi.listAssignments(courseId, token);
      set({ assignments });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  generateAssignments: async (courseId, config, token) => {
    set({ loading: true, error: null });
    try {
      const { task_id } = await assignmentsApi.generateAssignments(courseId, config, token);
      set({ loading: false });
      return task_id;
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      return null;
    }
  },

  fetchIngestionStatus: async (courseId, token) => {
    try {
      const status = await coursesApi.getIngestionStatus(courseId, token);
      set({ ingestionStatus: status });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchDashboardStats: async (token) => {
    try {
      const stats = await coursesApi.getDashboardStats(token);
      set({ dashboardStats: stats });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  startGeneration: (types, taskId, courseId) => {
    const s = { isGenerating: true as const, genTypes: types, genStartTime: Date.now(), genTaskId: taskId, genCourseId: courseId };
    saveGenState(s);
    set(s);
  },
  stopGeneration: () => {
    clearGenState();
    set({ isGenerating: false, genTypes: [], genStartTime: null, genTaskId: null, genCourseId: null });
  },
  clearError: () => set({ error: null }),
}));
