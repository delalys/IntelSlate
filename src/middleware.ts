import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Screenshot mode (?screenshot=1): layouts cannot read searchParams, so the
  // flag is forwarded as a request header (read via headers()). This keeps the
  // rendered HTML self-contained for capture services like TRMNL, which fetch
  // the page once and re-render the HTML without the original URL.
  const screenshot = request.nextUrl.searchParams.get('screenshot');
  if (screenshot === '1' || screenshot === 'true') {
    request.headers.set('x-screenshot', '1');
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
