const API_URL = '/api';

export function getToken(): string | null {
  return localStorage.getItem('eventflow_token');
}

export function setToken(token: string): void {
  localStorage.setItem('eventflow_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('eventflow_token');
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}
