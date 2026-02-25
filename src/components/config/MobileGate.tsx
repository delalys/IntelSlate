'use client';

import { useEffect, useState, useCallback } from 'react';
import { ConfigButtonWithModal } from './ConfigButtonWithModal';
import { DemoModal } from '@/components/demo/DemoModal';

interface IMobileGateProps {
  children: React.ReactNode;
  isDemoMode?: boolean;
}

/**
 * On screens narrower than the `md` breakpoint (768px) the dashboard is hidden
 * and the config modal is opened automatically so the user sees a useful page
 * instead of a broken layout.
 *
 * Uses CSS-first approach: both layouts are rendered, with CSS hiding the wrong
 * one. JS only handles auto-opening the config modal on mobile.
 *
 * In demo mode on mobile, the DemoModal shows first. When dismissed,
 * the config modal auto-opens.
 */
export function MobileGate({ children, isDemoMode = false }: IMobileGateProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [demoDismissed, setDemoDismissed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleDemoDismiss = useCallback(() => {
    setDemoDismissed(true);
  }, []);

  const shouldAutoOpenConfig = isMobile && (isDemoMode ? demoDismissed : true);

  return (
    <>
      {/* Desktop: visible at md and above */}
      <div className="hidden md:contents">{children}</div>

      {/* Mobile: visible below md */}
      <div className="contents md:hidden">
        {isDemoMode && isMobile && !demoDismissed && (
          <DemoModal onDismiss={handleDemoDismiss} />
        )}
        <ConfigButtonWithModal
          autoOpen={shouldAutoOpenConfig}
          isDemoMode={isDemoMode}
        />
      </div>
    </>
  );
}
