import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getApiToken, getApiBase, resetTokenCache } from './asset-api';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  resetTokenCache();
  vi.stubEnv('ASSET_API_USER', 'testuser');
  vi.stubEnv('ASSET_API_PASS', 'testpass');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getApiBase', () => {
  it('should return default API base when env var is not set', () => {
    expect(getApiBase()).toContain('/api');
  });
});

describe('getApiToken', () => {
  it('should fetch a new token on first call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ access_token: 'token-abc-123' }),
    });

    const token = await getApiToken();

    expect(token).toBe('token-abc-123');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('should return cached token on second call (no re-fetch)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ access_token: 'token-cached' }),
    });

    const token1 = await getApiToken();
    const token2 = await getApiToken();

    expect(token1).toBe('token-cached');
    expect(token2).toBe('token-cached');
    // Only 1 fetch call — second call used cache
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should re-fetch token after cache expires', async () => {
    vi.useFakeTimers();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token-first' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token-refreshed' }),
      });

    const token1 = await getApiToken();
    expect(token1).toBe('token-first');

    // Advance past TTL (25 minutes)
    vi.advanceTimersByTime(26 * 60 * 1000);

    const token2 = await getApiToken();
    expect(token2).toBe('token-refreshed');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('should throw when API credentials are missing', async () => {
    vi.stubEnv('ASSET_API_USER', '');
    vi.stubEnv('ASSET_API_PASS', '');

    await expect(getApiToken()).rejects.toThrow('ASSET_API_USER and ASSET_API_PASS must be set');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw when login API returns non-ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await expect(getApiToken()).rejects.toThrow('API login failed');
  });

  it('should send credentials as URL-encoded form data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ access_token: 'tok' }),
    });

    await getApiToken();

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(opts.body).toContain('username=testuser');
    expect(opts.body).toContain('password=testpass');
  });

  it('should reset cache when resetTokenCache is called', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token-a' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token-b' }),
      });

    const t1 = await getApiToken();
    expect(t1).toBe('token-a');

    resetTokenCache();

    const t2 = await getApiToken();
    expect(t2).toBe('token-b');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
