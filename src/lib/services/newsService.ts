/**
 * News Summary Generation Service
 *
 * Orchestrates the news pipeline: Google News → Ollama → Database
 * Fetches news articles and generates AI summaries for stock tickers.
 *
 * @module lib/services/newsService
 */

import prisma from '@/lib/prisma';
import {
  type GoogleNewsClient,
  getDefaultGoogleNewsClient,
  type INewsSearchResponse,
} from '../api/googleNewsClient';
import type { IArticleWithSummary } from '../api/ollama';
import {
  getSummarizationClient,
  type TSummarizationClient,
} from '../api/summarization';

// =============================================================================
// Constants
// =============================================================================

const LOG_PREFIX = '[NewsService]';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a news fetch and summarization operation
 */
export interface INewsServiceResult {
  /** Whether the operation succeeded (news fetch was successful) */
  success: boolean;
  /** The news articles fetched from Google News, with optional per-article summaries */
  articles: IArticleWithSummary[];
  /** Error message if the operation failed */
  error?: string;
}

/**
 * Result with ticker identifier for batch operations
 */
export interface INewsServiceResultWithTicker extends INewsServiceResult {
  /** Stock ticker symbol */
  ticker: string;
}

/**
 * Stock input for batch processing
 */
export interface IStockInput {
  /** Stock ticker symbol */
  ticker: string;
  /** Company name */
  companyName: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Logs a message with the [NewsService] prefix
 */
function log(message: string, ...args: unknown[]): void {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Logs an error with the [NewsService] prefix
 */
function logError(message: string, ...args: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...args);
}

// =============================================================================
// NewsService Class
// =============================================================================

/**
 * Service for fetching news and generating AI summaries
 *
 * Orchestrates the pipeline:
 * 1. Fetch news articles from Google News RSS
 * 2. Send articles to Ollama for summarization
 * 3. Store results in NewsCache database table
 */
export class NewsService {
  private googleNewsClient: GoogleNewsClient;
  private summarizationClient: TSummarizationClient | null;

  constructor(
    googleNewsClient: GoogleNewsClient,
    summarizationClient: TSummarizationClient | null,
  ) {
    this.googleNewsClient = googleNewsClient;
    this.summarizationClient = summarizationClient;
  }

  /**
   * Fetch news articles and generate AI summary for a stock ticker
   *
   * @param ticker - Stock ticker symbol (e.g., "AAPL")
   * @param companyName - Company name (e.g., "Apple Inc")
   * @returns INewsServiceResult with articles and optional summary
   */
  async fetchAndSummarizeNews(
    ticker: string,
    companyName: string,
  ): Promise<INewsServiceResult> {
    log('Starting news pipeline for:', ticker);

    // Step 1: Fetch news from Google News
    log('Fetching news from Google News for:', ticker);
    let newsResponse: INewsSearchResponse;
    try {
      newsResponse = await this.googleNewsClient.searchNews(
        ticker,
        companyName,
        { days: 1 },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown news fetch error';
      logError('News fetch failed for:', ticker, errorMessage);
      return {
        success: false,
        articles: [],
        error: errorMessage,
      };
    }

    // Handle news fetch failure - log error and skip summarization
    if (!newsResponse.success) {
      logError('News fetch failed for:', ticker, newsResponse.error);
      return {
        success: false,
        articles: [],
        error: newsResponse.error || 'Failed to fetch news',
      };
    }

    const articles = newsResponse.articles;
    log('Fetched', articles.length, 'articles for:', ticker);

    // Build articles with summaries array
    const articlesWithSummaries: IArticleWithSummary[] = articles.map((a) => ({
      title: a.title,
      content: a.content,
    }));

    // If summarization client isn't configured, store raw articles only (summaries can be generated later)
    if (!this.summarizationClient) {
      log(
        'Summarization client not available, storing articles only for:',
        ticker,
      );
      try {
        await this.storeInDatabase(ticker, articlesWithSummaries);
        return {
          success: true,
          articles: articlesWithSummaries,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown database error';
        logError('Database error for:', ticker, errorMessage);
        return {
          success: false,
          articles: articlesWithSummaries,
          error: errorMessage,
        };
      }
    }

    // If no articles, skip summarization and store empty result
    if (articles.length === 0) {
      log('No articles found, skipping summarization for:', ticker);
      try {
        await this.storeInDatabase(ticker, articlesWithSummaries);
        return {
          success: true,
          articles: [],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown database error';
        logError('Database error for:', ticker, errorMessage);
        return {
          success: false,
          articles: [],
          error: errorMessage,
        };
      }
    }

    // Step 2: Summarize each article individually
    log('Summarizing articles individually for:', ticker);
    for (const article of articlesWithSummaries) {
      try {
        const response = await this.summarizationClient.summarizeArticle({
          ticker,
          article,
        });

        if (response) {
          article.summary = response.summary;
          log('Generated summary for article:', article.title);
        } else {
          logError('Failed to summarize article:', article.title);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown Ollama error';
        logError('Article summarization failed:', article.title, errorMessage);
      }
    }

    // Step 3: Store in database
    try {
      log('Storing results in database for:', ticker);
      await this.storeInDatabase(ticker, articlesWithSummaries);
      log('Successfully stored news cache for:', ticker);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown database error';
      logError('Database error for:', ticker, errorMessage);
      return {
        success: false,
        articles: articlesWithSummaries,
        error: errorMessage,
      };
    }

    log('News pipeline completed for:', ticker);
    return {
      success: true,
      articles: articlesWithSummaries,
    };
  }

  /**
   * Fetch news and summaries for multiple stocks
   *
   * @param stocks - Array of stock inputs with ticker and company name
   * @returns Array of results for each stock
   */
  async fetchAndSummarizeNewsForMultiple(
    stocks: IStockInput[],
  ): Promise<INewsServiceResultWithTicker[]> {
    if (stocks.length === 0) {
      return [];
    }

    log('Processing batch of', stocks.length, 'stocks');

    const results: INewsServiceResultWithTicker[] = [];

    for (const stock of stocks) {
      const result = await this.fetchAndSummarizeNews(
        stock.ticker,
        stock.companyName,
      );
      results.push({
        ...result,
        ticker: stock.ticker,
      });
    }

    log('Batch processing completed:', results.length, 'stocks processed');
    return results;
  }

  /**
   * Store articles (with per-article summaries) in the NewsCache table
   *
   * @param ticker - Stock ticker symbol
   * @param articles - Articles with optional per-article summaries
   */
  private async storeInDatabase(
    ticker: string,
    articles: IArticleWithSummary[],
  ): Promise<void> {
    await prisma.newsCache.upsert({
      where: { ticker },
      update: {
        articles: articles as unknown as object[],
        summary: null,
      },
      create: {
        ticker,
        articles: articles as unknown as object[],
        summary: null,
      },
    });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Get the default NewsService using environment-configured clients.
 * Uses Claude when API key is set in DB, otherwise Ollama.
 *
 * @returns NewsService instance (always available since Google News needs no API key)
 */
export async function getDefaultNewsService(): Promise<NewsService> {
  const googleNewsClient = getDefaultGoogleNewsClient();
  const summarizationClient = await getSummarizationClient();
  return new NewsService(googleNewsClient, summarizationClient);
}
