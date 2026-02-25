/**
 * Google News RSS Client
 *
 * Fetches stock-related news articles via Google News RSS feeds
 * and extracts full article content using Readability.
 * Server-side only.
 *
 * @module lib/api/googleNewsClient
 */

import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const execFileAsync = promisify(execFile);

// =============================================================================
// Constants
// =============================================================================

const LOG_PREFIX = '[GoogleNews]';
const GOOGLE_NEWS_RSS_URL = 'https://news.google.com/rss/search';
const MAX_RSS_ITEMS = 5;
const MAX_ARTICLES = 2;
const FETCH_DELAY_MS = 500;
const RESOLVE_TIMEOUT_MS = 5000;

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

// =============================================================================
// Types
// =============================================================================

/**
 * A news article with only title and content
 */
export interface INewsArticle {
  title: string;
  content: string;
}

/**
 * Response from searchNews method
 */
export interface INewsSearchResponse {
  success: boolean;
  articles: INewsArticle[];
  error?: string;
}

/**
 * Options for news search
 */
export interface INewsSearchOptions {
  /** Number of days to look back (default: 1 for last 24 hours) */
  days?: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Logs a message with the [GoogleNews] prefix
 */
function log(message: string, ...args: unknown[]): void {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Logs an error with the [GoogleNews] prefix
 */
function logError(message: string, ...args: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Delay execution for a specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the Google News RSS search URL from a raw query string
 */
function buildRssUrl(query: string): string {
  return `${GOOGLE_NEWS_RSS_URL}?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

/**
 * Returns ordered search queries to try for a stock.
 * First the specific query, then a broader fallback.
 */
function buildSearchQueries(ticker: string, companyName: string): string[] {
  const queries = [`${ticker} ${companyName} stock`];
  const fallback = `${ticker} stock news`;
  if (fallback !== queries[0]) {
    queries.push(fallback);
  }
  return queries;
}

/**
 * Path to the Python decode script (resolved from project root).
 */
const DECODE_SCRIPT_PATH = path.resolve(
  process.cwd(),
  'scripts',
  'decode_google_news_url.py',
);

/**
 * Resolve a Google News redirect URL to the actual article URL.
 *
 * Delegates to the Python `googlenewsdecoder` package via a subprocess,
 * which handles both old-style (base64) and new-style (batchexecute)
 * Google News URLs reliably.
 *
 * @returns The resolved article URL, or null on failure
 */
async function resolveGoogleNewsUrl(
  googleNewsUrl: string,
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'python3',
      [DECODE_SCRIPT_PATH, googleNewsUrl],
      { timeout: RESOLVE_TIMEOUT_MS * 2 },
    );

    const result = JSON.parse(stdout.trim()) as {
      status: string;
      url?: string;
      message?: string;
    };

    if (result.status === 'ok' && result.url) {
      return result.url;
    }

    logError('Python decoder failed:', result.message || 'Unknown error');
    return null;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('Google News URL decode subprocess failed:', errorMessage);
    return null;
  }
}

/**
 * Fetch a URL and extract article content using Readability
 *
 * @returns Extracted text content, or null if extraction fails
 */
async function extractArticleContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
      },
    });

    if (!response.ok) {
      logError('Failed to fetch article:', url, response.status);
      return null;
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (
      !article ||
      !article.textContent ||
      article.textContent.trim().length === 0
    ) {
      logError('Readability extraction returned no content:', url);
      return null;
    }

    return article.textContent.trim();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('Article extraction failed:', url, errorMessage);
    return null;
  }
}

// =============================================================================
// GoogleNewsClient Class
// =============================================================================

/**
 * Client for Google News RSS feed operations
 */
export class GoogleNewsClient {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  /**
   * Search for stock-related news articles via Google News RSS.
   *
   * Tries the primary query first. If no articles with real content
   * are found, retries with a broader fallback query.
   *
   * @param ticker - Stock ticker symbol (e.g., "AAPL")
   * @param companyName - Company name (e.g., "Apple Inc")
   * @param options - Search options
   * @returns INewsSearchResponse with articles (max 2) containing only title and content
   */
  async searchNews(
    ticker: string,
    companyName: string,
    _options: INewsSearchOptions = {},
  ): Promise<INewsSearchResponse> {
    const queries = buildSearchQueries(ticker, companyName);

    for (let attempt = 0; attempt < queries.length; attempt++) {
      const query = queries[attempt];
      const isRetry = attempt > 0;

      if (isRetry) {
        log('Retrying with broader query for:', ticker, '-', query);
      }

      try {
        const articles = await this.fetchArticlesForQuery(ticker, query);

        if (articles.length > 0) {
          log('Search completed:', articles.length, 'articles for:', ticker);
          return { success: true, articles };
        }

        if (!isRetry && queries.length > 1) {
          log(
            'No articles with content found for:',
            ticker,
            '- will retry with different query',
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        logError('RSS fetch failed for:', ticker, errorMessage);

        if (!isRetry) {
          continue;
        }

        return {
          success: false,
          articles: [],
          error: errorMessage,
        };
      }
    }

    log('All search queries exhausted, no articles found for:', ticker);
    return { success: true, articles: [] };
  }

  /**
   * Fetch and extract articles for a single RSS query.
   *
   * @returns Array of articles with real extracted content (no headline fallback)
   */
  private async fetchArticlesForQuery(
    ticker: string,
    query: string,
  ): Promise<INewsArticle[]> {
    const rssUrl = buildRssUrl(query);
    log('Fetching RSS feed for:', ticker, '-', query);

    const feed = await this.parser.parseURL(rssUrl);
    const items = (feed.items || []).slice(0, MAX_RSS_ITEMS);

    log('RSS feed returned', items.length, 'items for:', ticker);

    if (items.length === 0) {
      return [];
    }

    const articles: INewsArticle[] = [];

    for (let i = 0; i < items.length && articles.length < MAX_ARTICLES; i++) {
      const item = items[i];
      const googleNewsUrl = item.link;

      if (!googleNewsUrl) {
        log('Skipping item without link:', item.title);
        continue;
      }

      if (i > 0) {
        await delay(FETCH_DELAY_MS);
      }

      log('Resolving Google News URL for:', item.title);
      const resolvedUrl = await resolveGoogleNewsUrl(googleNewsUrl);

      if (!resolvedUrl) {
        log('Could not resolve URL, skipping:', item.title);
        continue;
      }

      log('Resolved to:', resolvedUrl);

      const content = await extractArticleContent(resolvedUrl);

      if (content) {
        articles.push({
          title: item.title || 'Untitled',
          content,
        });
        log('Successfully extracted article:', item.title);
      } else {
        log('Skipping failed extraction, trying next article');
      }
    }

    return articles;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let defaultClient: GoogleNewsClient | null = null;

/**
 * Get the default Google News client
 *
 * @returns GoogleNewsClient instance (always available, no API key needed)
 */
export function getDefaultGoogleNewsClient(): GoogleNewsClient {
  if (!defaultClient) {
    defaultClient = new GoogleNewsClient();
  }
  return defaultClient;
}
