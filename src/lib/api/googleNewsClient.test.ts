/**
 * Google News RSS Client Tests
 *
 * Tests for stock-related news search via Google News RSS + Readability
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleNewsClient, type INewsArticle } from './googleNewsClient';

// =============================================================================
// Mocks
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock rss-parser
const mockParseURL = vi.fn();
vi.mock('rss-parser', () => {
  return {
    default: class MockParser {
      parseURL = mockParseURL;
    },
  };
});

// Mock jsdom + Readability
const mockParse = vi.fn();
vi.mock('jsdom', () => ({
  JSDOM: class MockJSDOM {
    window: { document: object };
    constructor() {
      this.window = { document: {} };
    }
  },
}));

vi.mock('@mozilla/readability', () => ({
  Readability: class MockReadability {
    parse = mockParse;
  },
}));

// Mock node:child_process + node:util (used by resolveGoogleNewsUrl)
vi.mock('node:child_process', () => {
  const execFile = vi.fn();
  return { default: { execFile }, execFile };
});

vi.mock('node:util', () => {
  const mockExecFileAsync = vi.fn().mockResolvedValue({
    stdout: JSON.stringify({
      status: 'ok',
      url: 'https://resolved.example.com/article',
    }),
  });
  return {
    default: { promisify: () => mockExecFileAsync },
    promisify: () => mockExecFileAsync,
  };
});

// =============================================================================
// Test Data
// =============================================================================

const MOCK_RSS_FEED = {
  items: [
    {
      title: 'Apple Reports Record Q4 Earnings',
      link: 'https://example.com/apple-earnings',
    },
    {
      title: 'Apple Announces New Product Line',
      link: 'https://example.com/apple-products',
    },
    {
      title: 'Third Article About Apple',
      link: 'https://example.com/apple-third',
    },
    {
      title: 'Fourth Article About Apple',
      link: 'https://example.com/apple-fourth',
    },
    {
      title: 'Fifth Article About Apple',
      link: 'https://example.com/apple-fifth',
    },
  ],
};

const MOCK_ARTICLE_HTML =
  '<html><body><article><p>Full article content here.</p></article></body></html>';

const EXPECTED_ARTICLES: INewsArticle[] = [
  {
    title: 'Apple Reports Record Q4 Earnings',
    content: 'Full article content here.',
  },
  {
    title: 'Apple Announces New Product Line',
    content: 'Full article content here.',
  },
];

// =============================================================================
// Tests: GoogleNewsClient
// =============================================================================

describe('GoogleNewsClient', () => {
  let client: GoogleNewsClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    client = new GoogleNewsClient();

    // Default: RSS returns feed, fetch returns HTML, Readability extracts content
    mockParseURL.mockResolvedValue(MOCK_RSS_FEED);
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => MOCK_ARTICLE_HTML,
    });
    mockParse.mockReturnValue({
      textContent: 'Full article content here.',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const FETCH_DELAY_MS = 500;

  describe('searchNews', () => {
    it('should return articles for valid ticker and company name', async () => {
      const promise = client.searchNews('AAPL', 'Apple Inc');
      // Advance timers for delay between fetches
      await vi.advanceTimersByTimeAsync(FETCH_DELAY_MS * 5);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(2);
      expect(result.articles).toEqual(EXPECTED_ARTICLES);
      expect(result.error).toBeUndefined();
    });

    it('should build correct RSS URL with encoded query', async () => {
      const promise = client.searchNews('AAPL', 'Apple Inc');
      await vi.advanceTimersByTimeAsync(FETCH_DELAY_MS * 5);
      await promise;

      expect(mockParseURL).toHaveBeenCalledWith(
        expect.stringContaining('AAPL%20Apple%20Inc%20stock'),
      );
      expect(mockParseURL).toHaveBeenCalledWith(
        expect.stringContaining('https://news.google.com/rss/search'),
      );
    });

    it('should return only title and content (no URLs or metadata)', async () => {
      const promise = client.searchNews('AAPL', 'Apple Inc');
      await vi.advanceTimersByTimeAsync(FETCH_DELAY_MS * 5);
      const result = await promise;

      expect(result.success).toBe(true);
      result.articles.forEach((article) => {
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('content');
        expect(article).not.toHaveProperty('url');
        expect(article).not.toHaveProperty('link');
      });
    });

    it('should limit to MAX_ARTICLES even if more available', async () => {
      const promise = client.searchNews('AAPL', 'Apple Inc');
      await vi.advanceTimersByTimeAsync(FETCH_DELAY_MS * 5);
      const result = await promise;

      expect(result.articles).toHaveLength(2);
      // Should have only fetched 2 articles (stopped after reaching MAX_ARTICLES)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should skip articles where extraction fails and try next', async () => {
      // First article extraction fails, second and third succeed
      mockParse
        .mockReturnValueOnce(null) // first fails
        .mockReturnValueOnce({ textContent: 'Second article content.' })
        .mockReturnValueOnce({ textContent: 'Third article content.' });

      const promise = client.searchNews('AAPL', 'Apple Inc');
      await vi.advanceTimersByTimeAsync(FETCH_DELAY_MS * 5);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(2);
      expect(result.articles[0].title).toBe('Apple Announces New Product Line');
      expect(result.articles[0].content).toBe('Second article content.');
      expect(result.articles[1].title).toBe('Third Article About Apple');
      expect(result.articles[1].content).toBe('Third article content.');
    });

    it('should return empty array when RSS fetch fails', async () => {
      mockParseURL.mockRejectedValue(new Error('Network error'));

      const result = await client.searchNews('AAPL', 'Apple Inc');

      expect(result.success).toBe(false);
      expect(result.articles).toEqual([]);
      expect(result.error).toContain('Network error');
    });

    it('should return empty array when no items in feed', async () => {
      mockParseURL.mockResolvedValue({ items: [] });

      const result = await client.searchNews('AAPL', 'Apple Inc');

      expect(result.success).toBe(true);
      expect(result.articles).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const promise = client.searchNews('AAPL', 'Apple Inc');
      // Need extra time for retry with fallback query
      await vi.advanceTimersByTimeAsync(FETCH_DELAY_MS * 20);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.articles).toEqual([]);
    });

    it('should handle article fetch returning non-ok status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
      });

      const promise = client.searchNews('AAPL', 'Apple Inc');
      // Need extra time for retry with fallback query
      await vi.advanceTimersByTimeAsync(FETCH_DELAY_MS * 20);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.articles).toEqual([]);
    });

    it('should apply delay between article fetches', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      const promise = client.searchNews('AAPL', 'Apple Inc');
      await vi.advanceTimersByTimeAsync(FETCH_DELAY_MS * 5);
      await promise;

      // setTimeout should have been called for the delay between fetches
      const delayCalls = setTimeoutSpy.mock.calls.filter(
        (call) => call[1] === 500,
      );
      expect(delayCalls.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// =============================================================================
// Tests: getDefaultGoogleNewsClient
// =============================================================================

describe('getDefaultGoogleNewsClient', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should always return a client (no API key needed)', async () => {
    const { getDefaultGoogleNewsClient: getClient } = await import(
      './googleNewsClient'
    );
    const client = getClient();

    expect(client).not.toBeNull();
    expect(typeof client.searchNews).toBe('function');
  });

  it('should return the same instance on repeated calls', async () => {
    const { getDefaultGoogleNewsClient: getClient } = await import(
      './googleNewsClient'
    );
    const client1 = getClient();
    const client2 = getClient();

    expect(client1).toBe(client2);
  });
});
