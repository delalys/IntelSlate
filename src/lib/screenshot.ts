/**
 * Screenshot mode (`?screenshot=1` or `?screenshot=true`) renders the
 * dashboard as-is for headless capture services (e.g. the TRMNL screenshot
 * plugin, which captures at a fixed 800x480 viewport): the mobile gate,
 * demo modal, and config button are suppressed.
 *
 * Client-only: App Router layouts cannot read searchParams, so components
 * check this from mount effects (safe: returns false during SSR).
 */
export function isScreenshotMode(): boolean {
  if (typeof window === 'undefined') return false;
  const value = new URLSearchParams(window.location.search).get('screenshot');
  return value === '1' || value === 'true';
}
