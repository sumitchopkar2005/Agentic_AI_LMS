// ─── Course ──────────────────────────────────────────────
export interface Course {
  id: string;
  institution_id: string;
  faculty_id: string;
  title: string;
  description: string | null;
  gamification_level: 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH';
  grading_strictness: 'LENIENT' | 'MEDIUM' | 'STRICT';
  status: 'SETUP' | 'ACTIVE' | 'ARCHIVED';
  hints_enabled: boolean;
  leaderboard_visible: boolean;
  streak_tracking_active: boolean;
}

export interface CourseCreateRequest {
  title: string;
  description?: string;
  gamification_level?: Course['gamification_level'];
  grading_strictness?: Course['grading_strictness'];
}

export interface IngestionStatus {
  course_id: string;
  status: string;
  progress_pct: number;
  current_step: string;
  estimated_remaining_seconds?: number;
}

// ─── Course Material ─────────────────────────────────────
export interface CourseMaterial {
  id: string;
  course_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  object_name: string;
  status: 'UPLOADED' | 'PARSING' | 'COMPLETED' | 'FAILED';
  unit_number: number | null;
  unit_name: string | null;
  created_at: string | null;
}

// ─── Assignment ──────────────────────────────────────────
export type AssignmentType = 'MCQ' | 'SCENARIO' | 'CODE_LAB' | 'DEBATE' | 'REVERSE_ESSAY' | 'CUSTOM';

export interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  type: AssignmentType;
  generated_by: 'AI_AGENT' | 'FACULTY_MANUAL';
  status: 'DRAFT' | 'FACULTY_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  content: Record<string, unknown> | null;
  rubric: Record<string, unknown> | null;
  concept_tags: string[] | null;
  hint_config: Record<string, unknown> | null;
  max_xp: number;
  max_gold: number;
  difficulty: number;
  order_index: number;
  unit_number: number | null;
  unit_name: string | null;
  group_id: string | null;
}

export interface AssignmentGenerationConfig {
  types?: AssignmentType[];
  count_per_type?: number;
  mcq_count?: number;
  difficulty_range?: [number, number];
  unit_number?: number;
  unit_name?: string;
  model?: string;
}

// ─── Submission ──────────────────────────────────────────
export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  content_json: Record<string, unknown> | null;
  ai_grade: Record<string, unknown> | null;
  human_override: Record<string, unknown> | null;
  hints_used: Record<string, unknown> | null;
  xp_awarded: number;
  gold_awarded: number;
  feedback: string | null;
  appeal_status: 'NONE' | 'PENDING' | 'REVIEWED' | 'OVERTURNED';
  attempt_number: number;
}

// ─── Gamification ────────────────────────────────────────
export interface StudentProfile {
  id: string;
  full_name: string;
  xp_total: number;
  gold_balance: number;
  current_streak: number;
  longest_streak: number;
  badges: Record<string, unknown>[] | null;
  mastery_map: Record<string, unknown> | null;
}

export interface LeaderboardEntry {
  rank: number;
  student_id: string;
  full_name: string;
  xp_total: number;
}

export interface Leaderboard {
  course_id: string;
  entries: LeaderboardEntry[];
  my_rank: number | null;
}

export interface HintPreview {
  tier: string;
  gold_cost: number;
  current_balance: number;
  can_afford: boolean;
}

export interface HintPurchase {
  hint_text: string;
  gold_cost: number;
  new_balance: number;
  tier: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}
