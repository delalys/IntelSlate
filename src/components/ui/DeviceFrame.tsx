interface IDeviceFrameProps {
  locale: string;
}

/**
 * Caps the app to a compact, boxed preview instead of stretching full-bleed
 * across large monitors — via a same-origin iframe rather than CSS
 * transform: scale(). transform/zoom only shrink painted output; @media
 * queries and window measurements inside still resolve against the real
 * browser viewport, so scaled content and fixed-position overlays (the
 * config button, demo modal) would render blurry and/or wrongly sized. An
 * iframe is a genuine separate browsing context: everything inside sees the
 * iframe's own size as its viewport, so it lays out — and reads as — a real,
 * sharp, appropriately-sized page at that size.
 *
 * Sized responsively (min() against the real viewport) so it also degrades
 * correctly on narrow/mobile windows, where the iframe's own MobileGate
 * (running inside, against the iframe's own width) takes over.
 */
export function DeviceFrame({ locale }: IDeviceFrameProps) {
  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden">
      <iframe
        src={`/${locale}?embed=1`}
        title="IntelSlate dashboard preview"
        className="h-[min(864px,100vh)] w-[min(1152px,100vw)] border-0"
      />
    </div>
  );
}
