/**
 * Claude LLM Client for News Summarization
 *
 * Uses Anthropic Messages API. Same interface as Ollama for summarization
 * so the pipeline can use either client interchangeably.
 *
 * @module lib/api/claude
 */

import Anthropic from '@anthropic-ai/sdk';
import type { INewsArticle, ISummarizationResponse } from '@/lib/api/ollama';

// =============================================================================
// Constants
// =============================================================================

const LOG_PREFIX = '[Claude]';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MAX_TOKENS = 256;

/** Minimum article content length (chars) to attempt summarization */
const MIN_CONTENT_LENGTH = 50;

/** Phrases that indicate Claude refused to summarize (no real article content) */
const REFUSAL_PHRASES = [
  "i don't see",
  "i don't have",
  "i can't",
  'i cannot',
  'i would need',
  'no article',
  'no content',
  'not provided',
  'not available',
  'unable to',
  'full article',
  'actual article',
  'article text',
  'article content',
];

// =============================================================================
// Helper Functions
// =============================================================================

function log(message: string, ...args: unknown[]): void {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

function logError(message: string, ...args: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Checks if the article has enough real content to attempt summarization.
 */
function hasEnoughContent(article: INewsArticle): boolean {
  const content = (article.content ?? '').trim();
  return content.length >= MIN_CONTENT_LENGTH;
}

/**
 * Detects if Claude's response is a refusal rather than an actual summary.
 */
function isRefusalResponse(text: string): boolean {
  const lower = text.toLowerCase();
  return REFUSAL_PHRASES.some((phrase) => lower.includes(phrase));
}

function buildArticlePrompt(ticker: string, articleContent: string): string {
  return `You are a financial news analyst. Based on the article below, write EXACTLY ONE factual sentence (max 20 words) explaining why ${ticker} stock moved.

CRITICAL INSTRUCTIONS:
1. Write ONLY the sentence. No introductions, no explanations, no meta-commentary.
2. Use <strong> tags to highlight 1-2 key drivers (e.g., <strong>earnings miss</strong>, <strong>rate hike</strong>)
3. NEVER bold the company name, stock name, or ticker symbol
4. Be factual and concise
5. No emojis
6. If the article contains only technical analysis or trading signals with no substantive news, write: "${ticker} saw <strong>mixed trading activity</strong> amid broader <strong>market movements</strong>."

Example good output: "${ticker} declined after <strong>quarterly earnings miss</strong> and <strong>weak guidance</strong>."

Now analyze this article and write the sentence:

${articleContent}`;
}

// =============================================================================
// ClaudeClient Class
// =============================================================================

/**
 * Client for Claude API article summarization.
 * Implements the same summarizeArticle contract as OllamaClient.
 */
export class ClaudeClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, options?: { model?: string }) {
    this.client = new Anthropic({ apiKey });
    this.model = options?.model ?? DEFAULT_MODEL;
  }

  /**
   * Summarize a single news article (same interface as OllamaClient).
   */
  async summarizeArticle(input: {
    ticker: string;
    article: INewsArticle;
  }): Promise<ISummarizationResponse | null> {
    const { ticker, article } = input;

    if (!hasEnoughContent(article)) {
      log(
        'Skipping article with insufficient content for:',
        ticker,
        '-',
        article.title,
      );
      return null;
    }

    const articleContent = `Title: ${article.title}\n${article.content}`;
    const prompt = buildArticlePrompt(ticker, articleContent);

    log('Summarizing article for:', ticker, '-', article.title);

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: DEFAULT_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = getTextFromMessage(message);
      if (!text || text.trim() === '') {
        logError('Empty response from Claude for article:', article.title);
        return null;
      }

      const summary = text.trim();

      if (isRefusalResponse(summary)) {
        logError(
          'Claude refused to summarize (insufficient content):',
          article.title,
        );
        return null;
      }

      log('Article summarization completed for:', ticker);
      log('Summary:', summary);
      return { summary };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError('Article summarization failed:', errorMessage);
      return null;
    }
  }
}

/**
 * Extract plain text from Anthropic message content.
 * content is an array of content blocks; we take the first text block.
 */
function getTextFromMessage(message: { content: unknown }): string | null {
  if (!message.content || !Array.isArray(message.content)) {
    return null;
  }
  const textBlock = message.content.find(
    (block: { type?: string; text?: string }) =>
      block?.type === 'text' && typeof block?.text === 'string',
  ) as { text: string } | undefined;
  return textBlock?.text ?? null;
}
