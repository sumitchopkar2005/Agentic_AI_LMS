import { apiClient } from './client';

export interface MascotTip {
  id: string;
  text: string;
  type: string;
  priority: string;
  action_label?: string;
  action_href?: string;
}

export async function fetchTips(token: string): Promise<MascotTip[]> {
  const res = await apiClient<{ tips: MascotTip[] }>('/api/v1/mascot/tips', { token });
  return res.tips;
}

export async function logInteraction(
  token: string,
  interactionType: string,
  tipId?: string,
  context?: Record<string, unknown>,
): Promise<void> {
  await apiClient('/api/v1/mascot/interactions', {
    method: 'POST',
    token,
    body: JSON.stringify({ interaction_type: interactionType, tip_id: tipId, context }),
  });
}
