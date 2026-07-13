import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import { Suspense } from 'react';
import { ConfigButtonWithModal } from '@/components/config/ConfigButtonWithModal';
import { MobileGate } from '@/components/config/MobileGate';
import { DemoModal } from '@/components/demo/DemoModal';
import { DeviceFrame } from '@/components/ui/DeviceFrame';
import { routing } from '@/i18n/routing';
import { isEmbedRequest } from '@/lib/embed-server';
import { isScreenshotRequest } from '@/lib/screenshot-server';

type TLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'app' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: TLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // Screenshot mode: overlays (demo modal, config button, mobile gate) are
  // left out of the HTML entirely, so captures are correct even when the
  // capture service never runs our JS (TRMNL re-renders the fetched HTML).
  if (await isScreenshotRequest()) {
    return (
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    );
  }

  const content = (
    <MobileGate isDemoMode={isDemoMode}>
      {children}
      <Suspense fallback={null}>
        <ConfigButtonWithModal isDemoMode={isDemoMode} />
      </Suspense>
      {isDemoMode && <DemoModal />}
    </MobileGate>
  );

  // Top-level navigation (neither screenshot nor embed) gets the device-frame
  // shell instead of the app directly: a sized iframe pointing back at this
  // same route with ?embed=1, which renders `content` unwrapped below. This
  // keeps the dashboard from stretching full-bleed across large monitors
  // without any CSS scaling — the iframe is a genuine separate viewport, so
  // every responsive class and window measurement inside it resolves against
  // the iframe's own size, not scaled/blurred after the fact.
  if (!(await isEmbedRequest())) {
    return (
      <NextIntlClientProvider messages={messages}>
        <DeviceFrame locale={locale} />
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider messages={messages}>
      {content}
    </NextIntlClientProvider>
  );
}
