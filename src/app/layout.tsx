import { Open_Sans } from 'next/font/google';
import { headers } from 'next/headers';
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

  return (
    <html lang={locale} className={openSans.variable}>
      <body className="font-sans antialiased" data-theme={themeId}>
        <ThemeProvider initialThemeId={themeId}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
