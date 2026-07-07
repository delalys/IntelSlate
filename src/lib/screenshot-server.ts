import { headers } from 'next/headers';

/**
 * Server-side check for screenshot mode, readable from layouts (which cannot
 * access searchParams). The x-screenshot header is set by the middleware when
 * the request URL carries ?screenshot=1|true.
 *
 * Kept separate from lib/screenshot.ts because next/headers cannot be
 * imported into client components.
 */
export async function isScreenshotRequest(): Promise<boolean> {
  return (await headers()).get('x-screenshot') === '1';
}
