'use server';

/**
 * Server actions for Claude API key configuration.
 * Key is stored in SystemConfig; never returned to the client.
 */

import { revalidatePath } from 'next/cache';
import {
  setClaudeApiKey,
  getClaudeApiKeyStatus as getStatus,
} from '@/lib/settings';

/**
 * Save Claude API key to database.
 * Pass empty string to clear the key.
 */
export async function saveClaudeApiKey(key: string): Promise<void> {
  await setClaudeApiKey(key);
  revalidatePath('/');
}

/**
 * Get whether a Claude API key is set (for UI display only).
 * Does not return the key value.
 */
export async function getClaudeApiKeyStatus(): Promise<{ isSet: boolean }> {
  return await getStatus();
}
