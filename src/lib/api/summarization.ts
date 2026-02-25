/**
 * Summarization client resolver
 *
 * Returns Claude client when API key is set in DB, otherwise Ollama.
 * Used by pipeline, cron, and news service.
 *
 * @module lib/api/summarization
 */

import { getClaudeApiKey } from '@/lib/settings';
import { getDefaultOllamaClient } from '@/lib/api/ollama';
import { ClaudeClient } from '@/lib/api/claude';
import type { OllamaClient } from '@/lib/api/ollama';

export type TSummarizationClient = OllamaClient | ClaudeClient;

/**
 * Get the summarization client: Claude if API key is set, otherwise Ollama.
 * Callers must await; returns null if neither is available.
 */
export async function getSummarizationClient(): Promise<TSummarizationClient | null> {
  const claudeKey = await getClaudeApiKey();
  if (claudeKey && claudeKey.length > 0) {
    return new ClaudeClient(claudeKey);
  }
  return getDefaultOllamaClient();
}
