import { headers } from 'next/headers';

/**
 * Server-side check for whether this request is the inner content the
 * device-frame iframe loads (readable from layouts, which cannot access
 * searchParams). The x-embed header is set by the middleware when the
 * request URL carries ?embed=1.
 *
 * Kept separate from lib/screenshot-server.ts: embed mode and screenshot mode
 * are triggered independently (the device-frame iframe vs. TRMNL's capture
 * service) even though both skip the same outer chrome.
 */
export async function isEmbedRequest(): Promise<boolean> {
  return (await headers()).get('x-embed') === '1';
}
