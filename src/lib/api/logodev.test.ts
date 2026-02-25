/**
 * Logo.dev API Client Tests
 *
 * Tests for the Logo.dev API client with mocked fetch.
 * Demonstrates co-located testing pattern per AR19.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLogoDevClient,
  getDefaultLogoDevClient,
  type ILogoFetchResult,
} from './logodev';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('logodev', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    vi.stubEnv('LOGO_DEV_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('createLogoDevClient', () => {
    it('throws error when API key is not provided', () => {
      expect(() => createLogoDevClient({ apiKey: '' })).toThrow(
        '[LogoDev] API key is required',
      );
    });

    it('creates client with valid API key', () => {
      const client = createLogoDevClient({ apiKey: 'test-key' });

      expect(client).toHaveProperty('fetchLogo');
      expect(client).toHaveProperty('getDirectLogoUrl');
    });

    it('uses custom base URL when provided', () => {
      const client = createLogoDevClient({
        apiKey: 'test-key',
        baseUrl: 'https://custom.logo.dev',
      });

      const url = client.getDirectLogoUrl('example.com');
      expect(url).toBe('https://custom.logo.dev/example.com?token=test-key');
    });
  });

  describe('fetchLogo', () => {
    it('returns logo URL on successful fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const client = createLogoDevClient({ apiKey: 'test-key' });
      const result = await client.fetchLogo('apple.com');

      expect(result).toEqual<ILogoFetchResult>({
        logoUrl: '/api/logo/apple.com',
        domain: 'apple.com',
        success: true,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://img.logo.dev/apple.com?token=test-key',
        { method: 'GET' },
      );
    });

    it('cleans domain by removing protocol and www', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const client = createLogoDevClient({ apiKey: 'test-key' });
      const result = await client.fetchLogo('https://www.apple.com/store');

      expect(result.domain).toBe('apple.com');
    });

    it('returns null logoUrl on 404 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const client = createLogoDevClient({ apiKey: 'test-key' });
      const result = await client.fetchLogo('unknown-domain.xyz');

      expect(result).toEqual<ILogoFetchResult>({
        logoUrl: null,
        domain: 'unknown-domain.xyz',
        success: false,
        error: 'Logo not found',
      });
    });

    it('returns null logoUrl on rate limit (429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const client = createLogoDevClient({ apiKey: 'test-key' });
      const result = await client.fetchLogo('apple.com');

      expect(result).toEqual<ILogoFetchResult>({
        logoUrl: null,
        domain: 'apple.com',
        success: false,
        error: 'Rate limit exceeded',
      });
    });

    it('returns null logoUrl on authentication error (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const client = createLogoDevClient({ apiKey: 'invalid-key' });
      const result = await client.fetchLogo('apple.com');

      expect(result).toEqual<ILogoFetchResult>({
        logoUrl: null,
        domain: 'apple.com',
        success: false,
        error: 'Invalid API key',
      });
    });

    it('returns null logoUrl on authentication error (403)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const client = createLogoDevClient({ apiKey: 'invalid-key' });
      const result = await client.fetchLogo('apple.com');

      expect(result).toEqual<ILogoFetchResult>({
        logoUrl: null,
        domain: 'apple.com',
        success: false,
        error: 'Invalid API key',
      });
    });

    it('returns null logoUrl on other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const client = createLogoDevClient({ apiKey: 'test-key' });
      const result = await client.fetchLogo('apple.com');

      expect(result).toEqual<ILogoFetchResult>({
        logoUrl: null,
        domain: 'apple.com',
        success: false,
        error: 'HTTP error: 500',
      });
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = createLogoDevClient({ apiKey: 'test-key' });
      const result = await client.fetchLogo('apple.com');

      expect(result).toEqual<ILogoFetchResult>({
        logoUrl: null,
        domain: 'apple.com',
        success: false,
        error: 'Network error',
      });
    });

    it('returns error for empty domain', async () => {
      const client = createLogoDevClient({ apiKey: 'test-key' });
      const result = await client.fetchLogo('');

      expect(result).toEqual<ILogoFetchResult>({
        logoUrl: null,
        domain: '',
        success: false,
        error: 'Domain is required',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns error for whitespace-only domain', async () => {
      const client = createLogoDevClient({ apiKey: 'test-key' });
      const result = await client.fetchLogo('   ');

      expect(result).toEqual<ILogoFetchResult>({
        logoUrl: null,
        domain: '',
        success: false,
        error: 'Domain is required',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('getDirectLogoUrl', () => {
    it('returns URL without making a request', () => {
      const client = createLogoDevClient({ apiKey: 'test-key' });
      const url = client.getDirectLogoUrl('apple.com');

      expect(url).toBe('https://img.logo.dev/apple.com?token=test-key');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('cleans domain in URL', () => {
      const client = createLogoDevClient({ apiKey: 'test-key' });
      const url = client.getDirectLogoUrl('https://www.apple.com/');

      expect(url).toBe('https://img.logo.dev/apple.com?token=test-key');
    });
  });

  describe('getDefaultLogoDevClient', () => {
    it('returns null when LOGO_DEV_API_KEY is not set', () => {
      vi.stubEnv('LOGO_DEV_API_KEY', '');

      const client = getDefaultLogoDevClient();

      expect(client).toBeNull();
    });

    it('returns client when LOGO_DEV_API_KEY is set', () => {
      vi.stubEnv('LOGO_DEV_API_KEY', 'env-api-key');

      const client = getDefaultLogoDevClient();

      expect(client).not.toBeNull();
      expect(client?.getDirectLogoUrl('test.com')).toContain('env-api-key');
    });
  });
});
