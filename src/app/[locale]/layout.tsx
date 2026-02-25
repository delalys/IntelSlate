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
import { routing } from '@/i18n/routing';

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

  return (
    <NextIntlClientProvider messages={messages}>
      <MobileGate isDemoMode={isDemoMode}>
        {children}
        <Suspense fallback={null}>
          <ConfigButtonWithModal isDemoMode={isDemoMode} />
        </Suspense>
        {isDemoMode && <DemoModal />}
      </MobileGate>
    </NextIntlClientProvider>
  );
}
