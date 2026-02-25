'use client';

import { useTranslations } from 'next-intl';

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="glass-card max-w-md space-y-4 p-8 text-center">
        <h2 className="text-xl font-semibold">{t('error')}</h2>
        <button type="button" onClick={reset} className="btn-primary">
          {t('tryAgain')}
        </button>
      </div>
    </div>
  );
}
