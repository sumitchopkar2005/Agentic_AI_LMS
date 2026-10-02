const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: Record<string, unknown>,
  ) {
    super(`API Error ${status}`);
  }
}

export async function apiClient<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.token && { Authorization: `Bearer ${options.token}` }),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let data: Record<string, unknown>;
    try { data = await res.json(); } catch { data = { detail: res.statusText || 'Unknown error' }; }
    throw  new ApiError(res.status, data);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export async function uploadFile(
  path: string,
  file: File,
  token: string,
  extraFields?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append('file', file);
  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      formData.append(key, value);
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    let data: Record<string, unknown>;
    try { data = await res.json(); } catch { data = { detail: res.statusText || 'Unknown error' }; }
    throw new ApiError(res.status, data);
  }

  return res.json();
}
