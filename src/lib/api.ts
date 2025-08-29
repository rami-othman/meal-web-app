// src/lib/api.ts
const getStored = (k: string) =>
  window.localStorage.getItem(k) ?? window.sessionStorage.getItem(k);

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const accessToken = getStored('access_token');

  const headers = new Headers(init.headers || {});
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  return fetch(input, { ...init, headers });
}

// أمثلة استخدام:
export async function getProjects() {
  const res = await apiFetch('/api/projects'); // مثال على API تبعك
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
}



// const API_BASE = 'https://192.168.1.169:7012';
export const API_BASE= 'https://192.168.1.169:7012';
// export const DJISYMBOL = "&symbol=DJI"