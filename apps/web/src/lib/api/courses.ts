import { apiClient, uploadFile } from './client';
import type { Course, CourseMaterial, CourseCreateRequest, IngestionStatus } from '@/types/api';

export async function createCourse(data: CourseCreateRequest, token: string): Promise<Course> {
  return apiClient<Course>('/api/v1/courses', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

export async function listCourses(token: string): Promise<Course[]> {
  return apiClient<Course[]>('/api/v1/courses', { token });
}

export async function getCourse(courseId: string, token: string): Promise<Course> {
  return apiClient<Course>(`/api/v1/courses/${courseId}`, { token });
}

export async function updateCourse(
  courseId: string,
  data: Record<string, unknown>,
  token: string,
): Promise<Course> {
  return apiClient<Course>(`/api/v1/courses/${courseId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    token,
  });
}

export async function uploadMaterials(
  courseId: string,
  file: File,
  token: string,
  unitInfo?: { unit_number: number; unit_name: string },
): Promise<Record<string, unknown>> {
  const extraFields: Record<string, string> | undefined = unitInfo
    ? { unit_number: String(unitInfo.unit_number), unit_name: unitInfo.unit_name }
    : undefined;
  return uploadFile(`/api/v1/courses/${courseId}/upload`, file, token, extraFields);
}

export async function getIngestionStatus(
  courseId: string,
  token: string,
): Promise<IngestionStatus> {
  return apiClient<IngestionStatus>(`/api/v1/courses/${courseId}/ingestion-status`, { token });
}

export async function listMaterials(
  courseId: string,
  token: string,
): Promise<CourseMaterial[]> {
  return apiClient<CourseMaterial[]>(`/api/v1/courses/${courseId}/materials`, { token });
}

export async function deleteMaterial(
  courseId: string,
  materialId: string,
  token: string,
): Promise<{ status: string; material_id: string; weaviate_chunks_deleted: number; neo4j_concepts_deleted: number }> {
  return apiClient(`/api/v1/courses/${courseId}/materials/${materialId}`, {
    method: 'DELETE',
    token,
  });
}

export async function getKnowledgeGraph(
  courseId: string,
  token: string,
  unit?: number,
): Promise<{ course_id: string; nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> }> {
  const url = unit != null
    ? `/api/v1/courses/${courseId}/knowledge-graph?unit=${unit}`
    : `/api/v1/courses/${courseId}/knowledge-graph`;
  return apiClient(url, { token });
}

export async function getCourseUnits(
  courseId: string,
  token: string,
): Promise<{ course_id: string; units: Array<{ unit_number: number; unit_name: string }> }> {
  return apiClient(`/api/v1/courses/${courseId}/units`, { token });
}

export async function deleteKnowledgeGraph(
  courseId: string,
  token: string,
): Promise<{ status: string; deleted_count: number }> {
  return apiClient(`/api/v1/courses/${courseId}/knowledge-graph`, {
    method: 'DELETE',
    token,
  });
}

export async function getKnowledgeGraphMermaid(
  courseId: string,
  token: string,
  unit?: number,
  regenerate?: boolean,
): Promise<{ mermaid_code: string; node_count: number; edge_count: number }> {
  const params = new URLSearchParams();
  if (unit != null) params.set('unit', String(unit));
  if (regenerate) params.set('regenerate', 'true');
  const qs = params.toString();
  const url = `/api/v1/courses/${courseId}/knowledge-graph/mermaid${qs ? `?${qs}` : ''}`;
  return apiClient(url, { token });
}

export async function getDashboardStats(
  token: string,
): Promise<{ active_courses: number; total_students: number; pending_reviews: number; at_risk_count: number }> {
  return apiClient('/api/v1/faculty/dashboard-stats', { token });
}

export async function getCourseSummary(
  courseId: string,
  token: string,
): Promise<{ course_id: string; active_students: number; average_score: number; completion_rate: number; hint_usage_rate: number; at_risk_count: number }> {
  return apiClient(`/api/v1/courses/${courseId}/analytics/summary`, { token });
}

export async function getCourseHeatmap(
  courseId: string,
  token: string,
): Promise<Record<string, unknown>> {
  return apiClient(`/api/v1/courses/${courseId}/analytics/heatmap`, { token });
}

export async function getAtRiskStudents(
  courseId: string,
  token: string,
): Promise<{ course_id: string; students: Array<{ student_id: string; full_name: string; risk_score: number; reasons: string[] }> }> {
  return apiClient(`/api/v1/courses/${courseId}/analytics/at-risk`, { token });
}

// ─── Student-specific ─────────────────────────────────────
export async function listStudentCourses(token: string): Promise<Course[]> {
  return apiClient<Course[]>('/api/v1/student/courses/all', { token });
}
