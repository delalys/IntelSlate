/**
 * Ollama LLM Client Integration Tests
 *
 * Tests against a real Ollama server running locally.
 * Requires: Ollama service running at http://localhost:11434 with phi3:medium model
 *
 * Run with: npm test -- ollama.integration.test.ts
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { type ISummarizationInput, OllamaClient } from './ollama';

// =============================================================================
// Configuration
// =============================================================================

const OLLAMA_BASE_URL = 'http://localhost:11434';
const TEST_TIMEOUT = 60000; // 60 seconds for LLM response

// =============================================================================
// Test Data
// =============================================================================

const MOCK_ARTICLES: ISummarizationInput = {
  ticker: 'AAPL',
  articles: [
    {
      title: 'Apple Reports Record Q4 Earnings',
      content:
        'Apple Inc reported record earnings for Q4 2025, exceeding analyst expectations with strong iPhone sales and services revenue growth.',
    },
  ],
};

// =============================================================================
// Helper Functions
// =============================================================================

async function isOllamaRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

async function hasPhiModel(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.models?.some(
      (m: { name: string }) =>
        m.name.includes('phi3') || m.name.includes('phi3:medium'),
    );
  } catch {
    return false;
  }
}

// =============================================================================
// Integration Tests
// =============================================================================

describe('OllamaClient Integration Tests', () => {
  let client: OllamaClient;
  let ollamaAvailable: boolean;
  let modelAvailable: boolean;

  beforeAll(async () => {
    ollamaAvailable = await isOllamaRunning();
    modelAvailable = await hasPhiModel();
    client = new OllamaClient(OLLAMA_BASE_URL);

    if (!ollamaAvailable) {
      console.warn(
        '\n⚠️  Ollama is not running. Integration tests will be skipped.',
      );
      console.warn('   Start Ollama with: brew services start ollama\n');
    } else if (!modelAvailable) {
      console.warn(
        '\n⚠️  phi3:medium model not found. Integration tests will be skipped.',
      );
      console.warn('   Pull model with: ollama pull phi3:medium\n');
    }
  });

  describe('summarizeNews (live)', () => {
    it(
      'should return a real summary from Ollama',
      async () => {
        if (!ollamaAvailable || !modelAvailable) {
          console.log('Skipping: Ollama or model not available');
          return;
        }

        const result = await client.summarizeNews(MOCK_ARTICLES);

        expect(result).not.toBeNull();
        expect(result?.summary).toBeDefined();
        expect(result?.summary.length).toBeGreaterThan(10);

        console.log('\n📝 Ollama Response:\n', result?.summary, '\n');
      },
      TEST_TIMEOUT,
    );

    it(
      'should generate bullet points in the response',
      async () => {
        if (!ollamaAvailable || !modelAvailable) {
          console.log('Skipping: Ollama or model not available');
          return;
        }

        const result = await client.summarizeNews(MOCK_ARTICLES);

        expect(result).not.toBeNull();
        // Check for bullet point indicators (•, -, *, or numbered)
        const hasBulletPoints =
          result?.summary.includes('•') ||
          result?.summary.includes('-') ||
          result?.summary.includes('*') ||
          /\d+\./m.test(result?.summary || '');

        expect(hasBulletPoints).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      'should mention the stock ticker context',
      async () => {
        if (!ollamaAvailable || !modelAvailable) {
          console.log('Skipping: Ollama or model not available');
          return;
        }

        const result = await client.summarizeNews(MOCK_ARTICLES);

        expect(result).not.toBeNull();
        // The summary should be relevant to the content
        const summary = result?.summary.toLowerCase() || '';
        const isRelevant =
          summary.includes('apple') ||
          summary.includes('earnings') ||
          summary.includes('iphone') ||
          summary.includes('services');

        expect(isRelevant).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it('should return null for empty articles without calling API', async () => {
      // This test doesn't need Ollama to be running
      const result = await client.summarizeNews({
        ticker: 'AAPL',
        articles: [],
      });

      expect(result).toBeNull();
    });

    it(
      'should handle custom timeout',
      async () => {
        if (!ollamaAvailable || !modelAvailable) {
          console.log('Skipping: Ollama or model not available');
          return;
        }

        // Create client with very short timeout to test timeout handling
        const shortTimeoutClient = new OllamaClient(OLLAMA_BASE_URL, {
          timeout: 100, // 100ms - too short for LLM
        });

        const result = await shortTimeoutClient.summarizeNews(MOCK_ARTICLES);

        // Should return null due to timeout
        expect(result).toBeNull();
      },
      TEST_TIMEOUT,
    );
  });

  describe('connection tests', () => {
    it('should detect Ollama service status', async () => {
      const running = await isOllamaRunning();
      console.log(`\n🔌 Ollama service running: ${running ? 'Yes' : 'No'}`);
      // Just log, don't fail
      expect(typeof running).toBe('boolean');
    });

    it('should detect phi3:medium model availability', async () => {
      const available = await hasPhiModel();
      console.log(
        `\n🧠 phi3:medium model available: ${available ? 'Yes' : 'No'}`,
      );
      // Just log, don't fail
      expect(typeof available).toBe('boolean');
    });

    it('should handle connection to wrong port gracefully', async () => {
      const badClient = new OllamaClient('http://localhost:99999');
      const result = await badClient.summarizeNews(MOCK_ARTICLES);

      expect(result).toBeNull();
    }, 10000);
  });
});
