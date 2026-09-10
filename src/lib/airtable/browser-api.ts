// Client-side fetch helpers that call this app's own /api/* routes (which
// proxy to Airtable server-side). Never talks to Airtable directly — the
// API key must stay on the server.

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request to ${path} failed with ${res.status}`);
  }
  return res.json();
}

export function listResource<T>(resource: string): Promise<T[]> {
  return request<T[]>(`/api/${resource}`);
}

export function createResource<T>(resource: string, body: Partial<T>): Promise<T> {
  return request<T>(`/api/${resource}`, { method: "POST", body: JSON.stringify(body) });
}

export function updateResource<T>(resource: string, id: string, body: Partial<T>): Promise<T> {
  return request<T>(`/api/${resource}/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

/** Hits a custom (non-CRUD) /api/* action route, e.g. one that triggers server-side
 *  work like AI generation rather than a plain field write. */
export function postAction<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
}

export async function deleteResource(resource: string, id: string): Promise<void> {
  const res = await fetch(`/api/${resource}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `DELETE /api/${resource}/${id} failed with ${res.status}`);
  }
}
