import { apiClient } from './client';
import type { StudentProfile, Leaderboard, HintPreview, HintPurchase, Badge } from '@/types/api';

export async function getMyProfile(token: string): Promise<StudentProfile> {
  return apiClient<StudentProfile>('/api/v1/students/me/profile', { token });
}

export async function getLeaderboard(courseId: string, token: string): Promise<Leaderboard> {
  return apiClient<Leaderboard>(`/api/v1/courses/${courseId}/leaderboard`, { token });
}

export async function previewHint(
  assignmentId: string,
  tier: string,
  token: string,
): Promise<HintPreview> {
  return apiClient<HintPreview>(
    `/api/v1/assignments/${assignmentId}/hint/preview?tier=${tier}`,
    { token },
  );
}

export async function purchaseHint(
  assignmentId: string,
  tier: string,
  token: string,
): Promise<HintPurchase> {
  return apiClient<HintPurchase>(`/api/v1/assignments/${assignmentId}/hint`, {
    method: 'POST',
    body: JSON.stringify({ tier }),
    token,
  });
}

export async function getMyBadges(token: string): Promise<Badge[]> {
  return apiClient<Badge[]>('/api/v1/students/me/badges', { token });
}
