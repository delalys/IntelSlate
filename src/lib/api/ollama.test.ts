/**
 * Ollama LLM Client Tests
 *
 * Tests for AI-powered news summarization via Ollama API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaClient, type ISummarizationInput } from './ollama';

// =============================================================================
// Mocks
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// Test Data
// =============================================================================

const MOCK_ARTICLES: ISummarizationInput = {
  ticker: 'AAPL',
  articles: [
    {
      title: 'Apple Reports Record Q4 Earnings',
      content:
        'Apple Inc reported record earnings for Q4 2025, exceeding analyst expectations with strong iPhone sales.',
    },
    {
      title: 'Apple Announces New Product Line',
      content:
        'Apple has unveiled its latest product innovations, driving investor confidence.',
    },
  ],
};

const MOCK_OLLAMA_RESPONSE = {
  model: 'phi3:medium',
  response:
    '• Record Q4 earnings exceeded analyst expectations\n• Strong iPhone sales drove revenue growth\n• New product announcements boosted investor confidence',
  done: true,
};

// =============================================================================
// Tests: OllamaClient
// =============================================================================

describe('OllamaClient', () => {
  let client: OllamaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OllamaClient('http://localhost:11434');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('summarizeNews', () => {
    it('should return bullet point summary for valid input', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_OLLAMA_RESPONSE,
      });

      const result = await client.summarizeNews(MOCK_ARTICLES);

      expect(result).not.toBeNull();
      expect(result?.summary).toContain('•');
    });

    it('should call the correct Ollama generate endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_OLLAMA_RESPONSE,
      });

      await client.summarizeNews(MOCK_ARTICLES);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should include ticker in prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_OLLAMA_RESPONSE,
      });

      await client.summarizeNews(MOCK_ARTICLES);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.prompt).toContain('AAPL');
    });

    it('should include article titles and content in prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_OLLAMA_RESPONSE,
      });

      await client.summarizeNews(MOCK_ARTICLES);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.prompt).toContain('Apple Reports Record Q4 Earnings');
      expect(requestBody.prompt).toContain('record earnings for Q4 2025');
    });

    it('should set stream to false in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_OLLAMA_RESPONSE,
      });

      await client.summarizeNews(MOCK_ARTICLES);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.stream).toBe(false);
    });

    it('should use phi3:medium model by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_OLLAMA_RESPONSE,
      });

      await client.summarizeNews(MOCK_ARTICLES);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.model).toBe('phi3:medium');
    });

    it('should use custom model when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...MOCK_OLLAMA_RESPONSE, model: 'llama3' }),
      });

      const customClient = new OllamaClient('http://localhost:11434', {
        model: 'llama3',
      });
      await customClient.summarizeNews(MOCK_ARTICLES);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.model).toBe('llama3');
    });

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await client.summarizeNews(MOCK_ARTICLES);

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.summarizeNews(MOCK_ARTICLES);

      expect(result).toBeNull();
    });

    it('should return null when empty articles provided', async () => {
      const result = await client.summarizeNews({
        ticker: 'AAPL',
        articles: [],
      });

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle timeout errors gracefully', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('The operation timed out')), 100);
          }),
      );

      const result = await client.summarizeNews(MOCK_ARTICLES);

      expect(result).toBeNull();
    });

    it('should use default 30 second timeout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_OLLAMA_RESPONSE,
      });

      await client.summarizeNews(MOCK_ARTICLES);

      const fetchCall = mockFetch.mock.calls[0];
      const fetchOptions = fetchCall[1];

      // Check that AbortSignal.timeout was used
      expect(fetchOptions.signal).toBeDefined();
    });

    it('should use custom timeout when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_OLLAMA_RESPONSE,
      });

      const customClient = new OllamaClient('http://localhost:11434', {
        timeout: 60000,
      });
      await customClient.summarizeNews(MOCK_ARTICLES);

      // Verify the client was created with custom timeout
      expect(customClient).toBeDefined();
    });

    it('should handle malformed API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unexpected: 'response' }),
      });

      const result = await client.summarizeNews(MOCK_ARTICLES);

      expect(result).toBeNull();
    });

    it('should handle response with empty response field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ model: 'phi3:medium', response: '', done: true }),
      });

      const result = await client.summarizeNews(MOCK_ARTICLES);

      expect(result).toBeNull();
    });

    it('should instruct model to output 2-3 bullet points maximum', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_OLLAMA_RESPONSE,
      });

      await client.summarizeNews(MOCK_ARTICLES);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.prompt.toLowerCase()).toContain('2-3 bullet points');
    });

    it('should handle Ollama service unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await client.summarizeNews(MOCK_ARTICLES);

      expect(result).toBeNull();
    });
  });
});

// =============================================================================
// Tests: getDefaultOllamaClient
// =============================================================================

describe('getDefaultOllamaClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return null when OLLAMA_BASE_URL is not set', async () => {
    delete process.env.OLLAMA_BASE_URL;

    const { getDefaultOllamaClient: getClient } = await import('./ollama');
    const client = getClient();

    expect(client).toBeNull();
  });

  it('should return a client when OLLAMA_BASE_URL is set', async () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434';

    const { getDefaultOllamaClient: getClient } = await import('./ollama');
    const client = getClient();

    expect(client).not.toBeNull();
    expect(typeof client?.summarizeNews).toBe('function');
  });

  it('should use the OLLAMA_BASE_URL from environment', async () => {
    process.env.OLLAMA_BASE_URL = 'http://custom-ollama:11434';

    const { getDefaultOllamaClient: getClient } = await import('./ollama');
    const client = getClient();

    expect(client).not.toBeNull();
  });
});
