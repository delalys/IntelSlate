/**
 * News Summary Service Tests
 *
 * Tests for the news pipeline: Google News → Ollama → Database
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  GoogleNewsClient,
  INewsSearchResponse,
} from '../api/googleNewsClient';
import type { OllamaClient, ISummarizationResponse } from '../api/ollama';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    newsCache: {
      upsert: vi.fn(),
    },
  },
  prisma: {
    newsCache: {
      upsert: vi.fn(),
    },
  },
}));

// Import after mocks are set up
import { NewsService } from './newsService';
import prisma from '@/lib/prisma';

// =============================================================================
// Test Data
// =============================================================================

const MOCK_ARTICLES = [
  {
    title: 'Apple Reports Record Q4 Earnings',
    content:
      'Apple Inc reported record earnings for Q4 2025, exceeding analyst expectations.',
  },
  {
    title: 'Apple Announces New Product Line',
    content:
      'Apple has unveiled its latest product innovations at the annual event.',
  },
];

const MOCK_NEWS_SUCCESS: INewsSearchResponse = {
  success: true,
  articles: MOCK_ARTICLES,
};

const MOCK_NEWS_FAILURE: INewsSearchResponse = {
  success: false,
  articles: [],
  error: 'RSS fetch failed: Network error',
};

const MOCK_NEWS_EMPTY: INewsSearchResponse = {
  success: true,
  articles: [],
};

const MOCK_ARTICLE_SUMMARY: ISummarizationResponse = {
  summary: 'Record Q4 earnings exceeded analyst expectations',
};

const MOCK_NEWS_CACHE = {
  id: 'test-id',
  ticker: 'AAPL',
  articles: JSON.stringify(MOCK_ARTICLES),
  summary: null,
  updatedAt: new Date(),
};

// =============================================================================
// Mock Factories
// =============================================================================

function createMockGoogleNewsClient(
  searchNewsResult: INewsSearchResponse = MOCK_NEWS_SUCCESS,
): GoogleNewsClient {
  return {
    searchNews: vi.fn().mockResolvedValue(searchNewsResult),
  } as unknown as GoogleNewsClient;
}

function createMockOllamaClient(
  summarizeArticleResult: ISummarizationResponse | null = MOCK_ARTICLE_SUMMARY,
): OllamaClient {
  return {
    summarizeArticle: vi.fn().mockResolvedValue(summarizeArticleResult),
  } as unknown as OllamaClient;
}

// =============================================================================
// Tests: NewsService
// =============================================================================

describe('NewsService', () => {
  let mockGoogleNewsClient: GoogleNewsClient;
  let mockOllamaClient: OllamaClient;
  let service: NewsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGoogleNewsClient = createMockGoogleNewsClient();
    mockOllamaClient = createMockOllamaClient();
    service = new NewsService(mockGoogleNewsClient, mockOllamaClient);

    // Setup Prisma mock
    vi.mocked(prisma.newsCache.upsert).mockResolvedValue(MOCK_NEWS_CACHE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchAndSummarizeNews', () => {
    it('should fetch news articles from Google News', async () => {
      await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

      expect(mockGoogleNewsClient.searchNews).toHaveBeenCalledWith(
        'AAPL',
        'Apple Inc',
        expect.any(Object),
      );
    });

    it('should call summarizeArticle for each article individually', async () => {
      await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

      expect(mockOllamaClient.summarizeArticle).toHaveBeenCalledTimes(2);
      expect(mockOllamaClient.summarizeArticle).toHaveBeenCalledWith({
        ticker: 'AAPL',
        article: expect.objectContaining({ title: MOCK_ARTICLES[0].title }),
      });
      expect(mockOllamaClient.summarizeArticle).toHaveBeenCalledWith({
        ticker: 'AAPL',
        article: expect.objectContaining({ title: MOCK_ARTICLES[1].title }),
      });
    });

    it('should store articles with per-article summaries in NewsCache', async () => {
      await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

      expect(prisma.newsCache.upsert).toHaveBeenCalledWith({
        where: { ticker: 'AAPL' },
        update: {
          articles: expect.arrayContaining([
            expect.objectContaining({ summary: MOCK_ARTICLE_SUMMARY.summary }),
          ]),
          summary: null,
        },
        create: {
          ticker: 'AAPL',
          articles: expect.arrayContaining([
            expect.objectContaining({ summary: MOCK_ARTICLE_SUMMARY.summary }),
          ]),
          summary: null,
        },
      });
    });

    it('should return success with articles containing summaries', async () => {
      const result = await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(2);
      expect(result.articles[0].summary).toBe(MOCK_ARTICLE_SUMMARY.summary);
      expect(result.error).toBeUndefined();
    });

    it('should log each step for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

      expect(consoleSpy).toHaveBeenCalled();
      const logCalls = consoleSpy.mock.calls.map((call) => call.join(' '));
      expect(logCalls.some((log) => log.includes('[NewsService]'))).toBe(true);

      consoleSpy.mockRestore();
    });

    describe('News fetch failure handling', () => {
      it('should log error and skip summarization when news fetch fails', async () => {
        const failingNewsClient = createMockGoogleNewsClient(MOCK_NEWS_FAILURE);
        const errorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});
        service = new NewsService(failingNewsClient, mockOllamaClient);

        const result = await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(mockOllamaClient.summarizeArticle).not.toHaveBeenCalled();
        expect(prisma.newsCache.upsert).not.toHaveBeenCalled();

        errorSpy.mockRestore();
      });

      it('should return error when news client throws an exception', async () => {
        const newsClient = {
          searchNews: vi.fn().mockRejectedValue(new Error('Network failure')),
        } as unknown as GoogleNewsClient;
        const errorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});
        service = new NewsService(newsClient, mockOllamaClient);

        const result = await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network failure');
        expect(mockOllamaClient.summarizeArticle).not.toHaveBeenCalled();
        expect(prisma.newsCache.upsert).not.toHaveBeenCalled();

        errorSpy.mockRestore();
      });

      it('should not call Ollama when news returns no articles', async () => {
        const emptyNewsClient = createMockGoogleNewsClient(MOCK_NEWS_EMPTY);
        service = new NewsService(emptyNewsClient, mockOllamaClient);

        await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

        expect(mockOllamaClient.summarizeArticle).not.toHaveBeenCalled();
      });
    });

    describe('Ollama failure handling', () => {
      it('should store articles without summaries when Ollama fails', async () => {
        const failingOllamaClient = createMockOllamaClient(null);
        service = new NewsService(mockGoogleNewsClient, failingOllamaClient);

        const result = await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

        expect(result.success).toBe(true);
        expect(result.articles).toHaveLength(2);
        expect(result.articles[0].summary).toBeUndefined();

        expect(prisma.newsCache.upsert).toHaveBeenCalledWith({
          where: { ticker: 'AAPL' },
          update: {
            articles: expect.any(Array),
            summary: null,
          },
          create: {
            ticker: 'AAPL',
            articles: expect.any(Array),
            summary: null,
          },
        });
      });

      it('should store articles when Ollama throws an exception', async () => {
        const ollamaClient = {
          summarizeArticle: vi
            .fn()
            .mockRejectedValue(new Error('Ollama crashed')),
        } as unknown as OllamaClient;
        const errorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});
        service = new NewsService(mockGoogleNewsClient, ollamaClient);

        const result = await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

        expect(result.success).toBe(true);
        expect(result.articles).toHaveLength(2);
        expect(result.articles[0].summary).toBeUndefined();
        expect(prisma.newsCache.upsert).toHaveBeenCalled();

        errorSpy.mockRestore();
      });

      it('should log error when Ollama fails but continue processing', async () => {
        const failingOllamaClient = createMockOllamaClient(null);
        const errorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});
        service = new NewsService(mockGoogleNewsClient, failingOllamaClient);

        await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
      });
    });

    describe('Database failure handling', () => {
      it('should return error when database operation fails', async () => {
        const dbError = new Error('Database connection failed');
        vi.mocked(prisma.newsCache.upsert).mockRejectedValue(dbError);
        const errorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});

        const result = await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Database connection failed');

        errorSpy.mockRestore();
      });
    });

    describe('Ollama not configured', () => {
      it('should store articles and return success without summaries', async () => {
        service = new NewsService(mockGoogleNewsClient, null);

        const result = await service.fetchAndSummarizeNews('AAPL', 'Apple Inc');

        expect(result.success).toBe(true);
        expect(result.articles).toHaveLength(2);
        expect(result.articles[0].summary).toBeUndefined();
        expect(prisma.newsCache.upsert).toHaveBeenCalled();
      });
    });
  });

  describe('fetchAndSummarizeNewsForMultiple (batch processing)', () => {
    it('should process multiple stocks', async () => {
      const stocks = [
        { ticker: 'AAPL', companyName: 'Apple Inc' },
        { ticker: 'GOOGL', companyName: 'Alphabet Inc' },
      ];

      const results = await service.fetchAndSummarizeNewsForMultiple(stocks);

      expect(results).toHaveLength(2);
      expect(mockGoogleNewsClient.searchNews).toHaveBeenCalledTimes(2);
    });

    it('should return results for each stock with ticker identifier', async () => {
      const stocks = [
        { ticker: 'AAPL', companyName: 'Apple Inc' },
        { ticker: 'GOOGL', companyName: 'Alphabet Inc' },
      ];

      const results = await service.fetchAndSummarizeNewsForMultiple(stocks);

      expect(results[0].ticker).toBe('AAPL');
      expect(results[1].ticker).toBe('GOOGL');
    });

    it('should continue processing other stocks if one fails', async () => {
      // First call fails, second succeeds
      const newsClient = {
        searchNews: vi
          .fn()
          .mockResolvedValueOnce(MOCK_NEWS_FAILURE)
          .mockResolvedValueOnce(MOCK_NEWS_SUCCESS),
      } as unknown as GoogleNewsClient;

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      service = new NewsService(newsClient, mockOllamaClient);

      const stocks = [
        { ticker: 'FAIL', companyName: 'Failing Co' },
        { ticker: 'AAPL', companyName: 'Apple Inc' },
      ];

      const results = await service.fetchAndSummarizeNewsForMultiple(stocks);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);

      errorSpy.mockRestore();
    });

    it('should return empty array for empty stock list', async () => {
      const results = await service.fetchAndSummarizeNewsForMultiple([]);

      expect(results).toEqual([]);
      expect(mockGoogleNewsClient.searchNews).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Tests: getDefaultNewsService
// =============================================================================

describe('getDefaultNewsService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should always return a service (Google News needs no API key)', async () => {
    vi.doMock('../api/googleNewsClient', () => ({
      getDefaultGoogleNewsClient: () => ({ searchNews: vi.fn() }),
    }));
    vi.doMock('../api/summarization', () => ({
      getSummarizationClient: vi
        .fn()
        .mockResolvedValue({ summarizeArticle: vi.fn() }),
    }));

    const { getDefaultNewsService } = await import('./newsService');
    const service = await getDefaultNewsService();

    expect(service).not.toBeNull();
  });

  it('should return a service when summarization client is not available', async () => {
    vi.doMock('../api/googleNewsClient', () => ({
      getDefaultGoogleNewsClient: () => ({ searchNews: vi.fn() }),
    }));
    vi.doMock('../api/summarization', () => ({
      getSummarizationClient: vi.fn().mockResolvedValue(null),
    }));

    const { getDefaultNewsService } = await import('./newsService');
    const service = await getDefaultNewsService();

    expect(service).not.toBeNull();
  });

  it('should return a service when both clients are available', async () => {
    vi.doMock('../api/googleNewsClient', () => ({
      getDefaultGoogleNewsClient: () => ({ searchNews: vi.fn() }),
    }));
    vi.doMock('../api/summarization', () => ({
      getSummarizationClient: vi
        .fn()
        .mockResolvedValue({ summarizeArticle: vi.fn() }),
    }));

    const { getDefaultNewsService } = await import('./newsService');
    const service = await getDefaultNewsService();

    expect(service).not.toBeNull();
  });
});
