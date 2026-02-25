'use client';

import { useCallback, useEffect, useState } from 'react';
import { DemoModal } from '@/components/demo/DemoModal';
import { ConfigButtonWithModal } from './ConfigButtonWithModal';

interface IMobileGateProps {
  children: React.ReactNode;
  isDemoMode?: boolean;
}

/**
 * On screens narrower than 768px OR shorter than 768px the dashboard is hidden
 * and the config modal is opened automatically so the user sees a useful page
 * instead of a broken layout.
 *
 * In demo mode on mobile, the DemoModal shows first. When dismissed,
 * the config modal auto-opens.
 */
export function MobileGate({ children, isDemoMode = false }: IMobileGateProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [demoDismissed, setDemoDismissed] = useState(false);

  useEffect(() => {
    const mqWidth = window.matchMedia('(max-width: 767px)');
    const mqHeight = window.matchMedia('(max-height: 767px)');
    const check = () => setIsMobile(mqWidth.matches || mqHeight.matches);
    check();

    mqWidth.addEventListener('change', check);
    mqHeight.addEventListener('change', check);
    return () => {
      mqWidth.removeEventListener('change', check);
      mqHeight.removeEventListener('change', check);
    };
  }, []);

  const handleDemoDismiss = useCallback(() => {
    setDemoDismissed(true);
  }, []);

  const shouldAutoOpenConfig = isMobile && (isDemoMode ? demoDismissed : true);

  return (
    <>
      {/* Desktop: visible when viewport is large enough */}
      {!isMobile && children}

      {/* Mobile / small viewport */}
      {isMobile && (
        <div>
          {isDemoMode && isMobile && !demoDismissed && (
            <DemoModal onDismiss={handleDemoDismiss} />
          )}
          <ConfigButtonWithModal
            autoOpen={shouldAutoOpenConfig}
            isDemoMode={isDemoMode}
          />
        </div>
      )}
    </>
  );
}
