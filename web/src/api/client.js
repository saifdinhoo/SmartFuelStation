const API_URL = import.meta.env.VITE_API_URL;

// Thin wrapper around fetch: adds the base URL, JSON headers, the auth
// token (if present), and throws on non-2xx so callers can just await.
async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = res.status === 204 ? null : await res.json();

  if (!res.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  return data;
}

export default request;
