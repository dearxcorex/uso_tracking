const API_BASE = process.env.ASSET_API_BASE || 'http://34.126.174.195:8000/api';

/** Cached token with expiry — avoids re-login on every request */
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
const TOKEN_TTL_MS = 25 * 60 * 1000; // 25 minutes (assume 30min token, refresh early)

export async function getApiToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const user = process.env.ASSET_API_USER;
  const pass = process.env.ASSET_API_PASS;
  if (!user || !pass) throw new Error('ASSET_API_USER and ASSET_API_PASS must be set');

  const form = new URLSearchParams({ username: user, password: pass });
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!r.ok) throw new Error('API login failed');

  const data = await r.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
  return cachedToken!;
}

export function getApiBase(): string {
  return API_BASE;
}

export function resetTokenCache(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}
