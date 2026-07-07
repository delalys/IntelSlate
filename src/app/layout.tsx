import { Open_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import { isScreenshotRequest } from '@/lib/screenshot-server';
import { getThemeId } from '@/lib/settings';
import { ThemeProvider } from '@/theme-engine/ThemeProvider';
import './globals.css';

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  display: 'swap',
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await headers()).get('x-next-intl-locale') ?? 'en';
  const themeId = await getThemeId();
  // Screenshot mode is baked into the HTML (no client JS): capture services
  // like TRMNL re-render the fetched HTML without the original URL, so
  // anything keyed on location.search would never fire there.
  const isScreenshot = await isScreenshotRequest();

  return (
    <html
      lang={locale}
      className={openSans.variable}
      data-screenshot={isScreenshot ? '1' : undefined}
    >
      <body className="font-sans antialiased" data-theme={themeId}>
        <ThemeProvider initialThemeId={themeId}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
