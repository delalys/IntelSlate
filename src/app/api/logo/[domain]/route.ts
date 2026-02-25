import { NextResponse } from 'next/server';

const DEFAULT_BASE_URL = 'https://img.logo.dev';
const LOG_PREFIX = '[LogoDevProxy]';

function cleanDomain(domain: string): string {
  return domain
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const resolvedParams = await params;
  const rawDomain = resolvedParams.domain
    ? decodeURIComponent(resolvedParams.domain)
    : '';
  const domain = cleanDomain(rawDomain);

  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  const apiKey = process.env.LOGO_DEV_API_KEY;
  if (!apiKey) {
    console.error(`${LOG_PREFIX} LOGO_DEV_API_KEY not configured`);
    return NextResponse.json(
      { error: 'Logo.dev API key not configured' },
      { status: 500 },
    );
  }

  const logoUrl = `${DEFAULT_BASE_URL}/${domain}?token=${apiKey}`;

  try {
    const response = await fetch(logoUrl, { method: 'GET' });

    if (!response.ok) {
      console.error(
        `${LOG_PREFIX} Failed to fetch logo for ${domain}: HTTP ${response.status}`,
      );
      return NextResponse.json(
        { error: `Logo fetch failed (${response.status})` },
        { status: response.status },
      );
    }

    const contentType = response.headers.get('content-type') ?? 'image/png';
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching logo for ${domain}:`, error);
    return NextResponse.json({ error: 'Logo fetch failed' }, { status: 502 });
  }
}
