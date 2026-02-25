/**
 * Ollama LLM Client for News Summarization
 *
 * Generates AI-powered bullet point summaries of stock news articles.
 * Server-side only to protect API endpoint.
 *
 * @module lib/api/ollama
 */

// =============================================================================
// Constants
// =============================================================================

const LOG_PREFIX = '[Ollama]';
const DEFAULT_MODEL = 'phi3:medium';
const DEFAULT_TIMEOUT = 120000; // 120 seconds (2 minutes for news summarization)

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
 * A news article with an optional AI-generated summary
 */
export interface IArticleWithSummary extends INewsArticle {
  summary?: string;
}

/**
 * Input for news summarization
 */
export interface ISummarizationInput {
  /** Stock ticker symbol (e.g., "AAPL") */
  ticker: string;
  /** Array of news articles to summarize */
  articles: INewsArticle[];
}

/**
 * Response from summarization
 */
export interface ISummarizationResponse {
  /** Bullet point summary explaining stock movement */
  summary: string;
}

/**
 * Options for Ollama client configuration
 */
export interface IOllamaClientOptions {
  /** LLM model to use (default: phi3:medium) */
  model?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Raw Ollama API response structure
 */
interface IOllamaApiResponse {
  model?: string;
  response?: string;
  done?: boolean;
  error?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Logs a message with the [Ollama] prefix
 */
function log(message: string, ...args: unknown[]): void {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Logs an error with the [Ollama] prefix
 */
function logError(message: string, ...args: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Formats articles into a single content string for the prompt
 */
function formatArticles(articles: INewsArticle[]): string {
  return articles
    .map((article) => `Title: ${article.title}\n${article.content}`)
    .join('\n\n');
}

/**
 * Builds the summarization prompt
 */
function buildPrompt(ticker: string, articlesContent: string): string {
  return `You are a financial news analyst. Based on these articles, write 2-3 bullet points explaining why ${ticker} stock moved.

CRITICAL INSTRUCTIONS:
1. Write ONLY the bullet points. No introductions, no explanations, no meta-commentary.
2. Each bullet point must be max 20 words
3. Use <strong> tags to highlight 1-2 key drivers per bullet (e.g., <strong>earnings miss</strong>, <strong>rate hike</strong>)
4. NEVER bold the company name, stock name, or ticker symbol
5. Be factual and concise
6. No emojis

Example good output:
• ${ticker} fell due to <strong>quarterly earnings miss</strong> and <strong>weak guidance</strong>.
• Concerns over <strong>regulatory investigation</strong> pressured shares.

Now analyze these articles and write the bullet points:

${articlesContent}`;
}

/**
 * Builds the per-article summarization prompt
 */
function buildArticlePrompt(ticker: string, articleContent: string): string {
  return `You are a financial news analyst. Based on the article below, write EXACTLY ONE factual sentence (max 20 words) explaining why ${ticker} stock moved.

CRITICAL INSTRUCTIONS:
1. Write ONLY the sentence. No introductions, no explanations, no meta-commentary.
2. Use <strong> tags to highlight 1-2 key drivers (e.g., <strong>earnings miss</strong>, <strong>rate hike</strong>)
3. NEVER bold the company name, stock name, or ticker symbol
4. Be factual and concise
5. No emojis

Example good output: "${ticker} declined after <strong>quarterly earnings miss</strong> and <strong>weak guidance</strong>."

Now analyze this article and write the sentence:

${articleContent}`;
}

// =============================================================================
// OllamaClient Class
// =============================================================================

/**
 * Client for Ollama LLM API operations
 */
export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(baseUrl: string, options: IOllamaClientOptions = {}) {
    this.baseUrl = baseUrl;
    this.model = options.model || DEFAULT_MODEL;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
  }

  /**
   * Summarize news articles into bullet points explaining stock movement
   *
   * @param input - Ticker and articles to summarize
   * @returns SummarizationResponse with bullet point summary, or null on failure
   */
  async summarizeNews(
    input: ISummarizationInput,
  ): Promise<ISummarizationResponse | null> {
    const { ticker, articles } = input;

    // Return null for empty input
    if (!articles || articles.length === 0) {
      log('No articles provided for summarization');
      return null;
    }

    const articlesContent = formatArticles(articles);
    const prompt = buildPrompt(ticker, articlesContent);

    log('Summarizing news for:', ticker);

    try {
      const requestBody = {
        model: this.model,
        prompt,
        stream: false,
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        logError('API request failed:', response.status, response.statusText);
        return null;
      }

      const data: IOllamaApiResponse = await response.json();

      if (data.error) {
        logError('API error:', data.error);
        return null;
      }

      // Validate response has content
      if (!data.response || data.response.trim() === '') {
        logError('Empty response from API');
        return null;
      }

      log('Summarization completed for:', ticker);

      return {
        summary: data.response,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError('Summarization failed:', errorMessage);
      return null;
    }
  }

  /**
   * Summarize a single news article
   *
   * @param input - Ticker and single article to summarize
   * @returns SummarizationResponse with summary, or null on failure
   */
  async summarizeArticle(input: {
    ticker: string;
    article: INewsArticle;
  }): Promise<ISummarizationResponse | null> {
    const { ticker, article } = input;

    const articleContent = `Title: ${article.title}\n${article.content}`;
    const prompt = buildArticlePrompt(ticker, articleContent);

    log('Summarizing article for:', ticker, '-', article.title);

    try {
      const requestBody = {
        model: this.model,
        prompt,
        stream: false,
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        logError('API request failed:', response.status, response.statusText);
        return null;
      }

      const data: IOllamaApiResponse = await response.json();

      if (data.error) {
        logError('API error:', data.error);
        return null;
      }

      if (!data.response || data.response.trim() === '') {
        logError('Empty response from API');
        return null;
      }

      log('Article summarization completed for:', ticker);

      return {
        summary: data.response,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError('Article summarization failed:', errorMessage);
      return null;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let defaultClient: OllamaClient | null = null;

/**
 * Get the default Ollama client using environment variable
 *
 * @returns OllamaClient instance or null if base URL not configured
 */
export function getDefaultOllamaClient(): OllamaClient | null {
  const baseUrl = process.env.OLLAMA_BASE_URL;

  if (!baseUrl) {
    log('Base URL not configured (OLLAMA_BASE_URL)');
    return null;
  }

  if (!defaultClient) {
    defaultClient = new OllamaClient(baseUrl);
  }

  return defaultClient;
}
