'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
      />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  );
}

function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

interface IDemoModalProps {
  onDismiss?: () => void;
}

export function DemoModal({ onDismiss }: IDemoModalProps) {
  const t = useTranslations('demo');
  const [isOpen, setIsOpen] = useState(true);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const originalOverflowRef = useRef<string>('');

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onDismiss?.();
  }, [onDismiss]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  useEffect(() => {
    if (isOpen) {
      originalOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = originalOverflowRef.current;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      const timeout = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 10);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const features = [
    {
      icon: <PaletteIcon className="w-6 h-6" />,
      title: t('focus.designTitle'),
      body: t('focus.design'),
    },
    {
      icon: <BoltIcon className="w-6 h-6" />,
      title: t('focus.performanceTitle'),
      body: t('focus.performance'),
    },
    {
      icon: <CurrencyIcon className="w-6 h-6" />,
      title: t('focus.costTitle'),
      body: t('focus.cost'),
    },
  ];

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close is a standard modal UX pattern
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key is handled via the document keydown listener above
    <div
      className="fixed inset-0 z-40 flex items-stretch xl:items-center justify-center bg-black/60 xl:p-6"
      onClick={handleBackdropClick}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop-propagation only, keyboard is handled by the dialog role */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
        onClick={handleContentClick}
        className="flex flex-col w-full h-full xl:h-auto xl:max-h-[90vh] xl:max-w-4xl bg-surface xl:rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Hero — image with overlaid title */}
        <div className="relative w-full shrink-0">
          <div className="relative w-full aspect-[16/8] sm:aspect-[16/7]">
            <Image
              src="/demo-hero.png"
              alt={t('title')}
              fill
              priority
              className="object-cover"
            />
            {/* Gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>

          {/* Overlaid title block */}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <h2
              id="demo-modal-title"
              className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
            >
              {t('title')}
            </h2>
            <p className="text-sm sm:text-base text-white/80 mt-1">
              {t('subtitle')}
            </p>
          </div>

          {/* X close button */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
            aria-label={t('close')}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Intro */}
          <p className="text-sm leading-relaxed text-primary/70">
            {t('intro')}
          </p>

          {/* Feature cards grid */}
          <section>
            <h3 className="section-heading mb-3">{t('focus.heading')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="flex flex-col gap-2 p-4 rounded-lg border border-primary/10 bg-primary/[0.03]"
                >
                  <div className="text-primary/50">{f.icon}</div>
                  <h4 className="text-sm font-semibold text-primary">
                    {f.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-primary/60">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Built with */}
          <section>
            <h3 className="section-heading mb-3">{t('builtWith.heading')}</h3>
            <p className="text-xs text-primary/50 mb-3">
              {t('builtWith.stack')}
            </p>
            <ul className="space-y-1.5">
              {(['themes', 'i18n', 'pipeline', 'ssr'] as const).map((key) => (
                <li
                  key={key}
                  className="flex gap-2 text-xs leading-relaxed text-primary/60"
                >
                  <span className="text-primary/30 shrink-0">&#x2022;</span>
                  {t(`builtWith.highlights.${key}`)}
                </li>
              ))}
            </ul>
          </section>

          {/* Two-column info sections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <section>
              <h3 className="section-heading mb-1.5">{t('context.heading')}</h3>
              <p className="text-sm leading-relaxed text-primary/60">
                {t('context.body')}
              </p>
            </section>

            <section>
              <h3 className="section-heading mb-1.5">{t('aboutAi.heading')}</h3>
              <p className="text-sm leading-relaxed text-primary/60">
                {t('aboutAi.body')}
              </p>
            </section>

            <section>
              <h3 className="section-heading mb-1.5">
                {t('howToRun.heading')}
              </h3>
              <p className="text-sm leading-relaxed text-primary/60">
                {t('howToRun.body')}
              </p>
            </section>

            <section>
              <h3 className="section-heading mb-1.5">
                {t('demoNote.heading')}
              </h3>
              <p className="text-sm leading-relaxed text-primary/60 italic">
                {t('demoNote.body')}
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-primary/10 shrink-0 bg-surface">
          <button type="button" onClick={handleClose} className="btn-primary">
            {t('viewDashboard')}
          </button>
        </div>
      </div>
    </div>
  );
}
