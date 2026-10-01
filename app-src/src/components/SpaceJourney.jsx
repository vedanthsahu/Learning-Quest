import { lazy, Suspense, useMemo } from 'react';
import { usePreferences } from '../utils/preferences';
import { buildFlightContent } from '../flight/lib/data';

// The flight (R3F scene, overlays, smooth scroll) loads only when this view
// opens, so work screens never pay for Three.js.
const FlightJourney = lazy(() => import('../flight/FlightJourney'));

export default function SpaceJourney({ data, stats, onNavigate, onOpenReader, onToggleMenu, paused }) {
  const { reduced, update, prefs } = usePreferences();
  const content = useMemo(() => buildFlightContent(data, stats), [data, stats]);
  const actions = useMemo(() => ({
    navigate: onNavigate,
    openReader: onOpenReader,
    toggleMenu: onToggleMenu,
    toggleMotion: () => update({ motion: prefs.motion === 'quiet' ? 'full' : 'quiet' }),
    reduced,
  }), [onNavigate, onOpenReader, onToggleMenu, update, prefs.motion, reduced]);

  return <Suspense fallback={<div className="flight-boot" role="status">Preparing your universe…</div>}>
    <FlightJourney content={content} actions={actions} paused={paused} />
  </Suspense>;
}
