import { apiClient } from './client';
import type { Assignment, AssignmentGenerationConfig, Submission } from '@/types/api';

export async function generateAssignments(
  courseId: string,
  config: AssignmentGenerationConfig,
  token: string,
): Promise<{ task_id: string }> {
  return apiClient(`/api/v1/courses/${courseId}/generate-assignments`, {
    method: 'POST',
    body: JSON.stringify(config),
    token,
  });
}

export async function getGenerationTask(
  taskId: string,
  token: string,
): Promise<{
  task_id: string;
  status: 'running' | 'completed' | 'failed';
  course_id: string;
  result: { course_id: string; generated_count: number; assignments: Assignment[] } | null;
  error: string | null;
}> {
  return apiClient(`/api/v1/generation-tasks/${taskId}`, { token });
}

export async function listAssignments(courseId: string, token: string): Promise<Assignment[]> {
  return apiClient<Assignment[]>(`/api/v1/courses/${courseId}/assignments`, { token });
}

export async function getAssignment(assignmentId: string, token: string): Promise<Assignment> {
  return apiClient<Assignment>(`/api/v1/assignments/${assignmentId}`, { token });
}

export async function publishAssignment(
  assignmentId: string,
  token: string,
): Promise<Assignment> {
  return apiClient<Assignment>(`/api/v1/assignments/${assignmentId}/publish`, {
    method: 'POST',
    token,
  });
}

export async function deleteAssignment(assignmentId: string, token: string): Promise<void> {
  await apiClient(`/api/v1/assignments/${assignmentId}`, {
    method: 'DELETE',
    token,
  });
}

export async function updateAssignment(
  assignmentId: string,
  data: Record<string, unknown>,
  token: string,
): Promise<Assignment> {
  return apiClient<Assignment>(`/api/v1/assignments/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    token,
  });
}

export async function publishGroup(groupId: string, token: string): Promise<Assignment[]> {
  return apiClient<Assignment[]>(`/api/v1/assignments/group/${groupId}/publish`, {
    method: 'POST',
    token,
  });
}

export async function deleteGroup(groupId: string, token: string): Promise<void> {
  await apiClient(`/api/v1/assignments/group/${groupId}`, {
    method: 'DELETE',
    token,
  });
}

// ─── Code execution helpers ─────────────────────────────
export interface RunTestResult {
  name: string;
  passed: boolean;
  output?: string | null;
  error?: string | null;
  expected?: string | null;
}

export interface RunCodeResponse {
  stdout: string;
  stderr: string;
  exit_code: number;
  test_results: RunTestResult[] | null;
  tests_passed: number;
  tests_total: number;
  all_passed: boolean;
  execution_time_ms: number;
}

export async function runCode(
  code: string,
  language: string,
  assignmentId: string | null,
  token: string,
): Promise<RunCodeResponse> {
  return apiClient<RunCodeResponse>('/api/v1/code/run', {
    method: 'POST',
    body: JSON.stringify({
      code,
      language,
      assignment_id: assignmentId,
    }),
    token,
  });
}

// ─── Student submission helpers ──────────────────────────
export async function submitAssignment(
  assignmentId: string,
  data: { content?: string; content_json?: Record<string, unknown> },
  token: string,
): Promise<Submission> {
  return apiClient<Submission>(`/api/v1/assignments/${assignmentId}/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

export async function getMySubmissions(
  assignmentId: string,
  token: string,
): Promise<Submission[]> {
  return apiClient<Submission[]>(`/api/v1/assignments/${assignmentId}/submissions/mine`, { token });
}

export async function getMyCourseSubmissions(
  courseId: string,
  token: string,
): Promise<Submission[]> {
  return apiClient<Submission[]>(`/api/v1/courses/${courseId}/submissions/mine`, { token });
}
