// src/scripts/craftNavigation.ts — the contract shared by the home and /craft.
//
// Craft enters as one uninterrupted sheet of water. The home ends with this
// sheet covering the viewport and /craft starts on the very same frame before
// cutting it into horizontal tides. Keeping the geometry here prevents the two
// documents from drifting apart when the transition is tuned.
import { SEAM_ASPECT, SEAM_OVERSCAN } from '../data/gallery';
import { viewportSize } from './viewport';

export const CRAFT_ENTRY_KEY = 'portfolio:craft-entry';
export const CRAFT_RETURN_KEY = 'portfolio:craft-return';
export const CRAFT_HOME_KEY = 'portfolio:craft-home';

export const CRAFT_SEAM = {
  aspect: SEAM_ASPECT,
  overscan: SEAM_OVERSCAN,
  rotation: 90,

  // The word surfaces only after the DOM painting has cleanly taken over the
  // flattened Three.js segment.
  titleFrom: 0.38,
  titleScale: 0.08,

  // Used only when the home had to be rebuilt and therefore has no departure
  // timeline to rewind.
  returnDur: 0.95,
  returnEase: 'power3.inOut',
} as const;

/**
 * The seven horizontal pieces of the tide curtain.
 *
 * Delays travel from the middle towards the edges, like a disturbance moving
 * across water. Each band gets an explicit destination instead of relying on
 * calc() multiplication so the choreography remains portable across browsers.
 */
export const CRAFT_TIDES = [
  { travel: '-114vw', lift: '-5vh', tilt: '-2.2deg', delay: '0.18s' },
  { travel: '112vw',  lift: '3vh',  tilt: '1.5deg',  delay: '0.10s' },
  { travel: '-111vw', lift: '-2vh', tilt: '-1.1deg', delay: '0.04s' },
  { travel: '113vw',  lift: '1vh',  tilt: '0.8deg',  delay: '0s' },
  { travel: '-112vw', lift: '2vh',  tilt: '1.2deg',  delay: '0.04s' },
  { travel: '114vw',  lift: '-3vh', tilt: '-1.7deg', delay: '0.10s' },
  { travel: '-113vw', lift: '5vh',  tilt: '2.4deg',  delay: '0.18s' },
] as const;

/** The full-screen seam rectangle for the current viewport, in CSS pixels. */
export function craftSeamBox(): { w: number; h: number } {
  const viewport = viewportSize();
  const w = Math.max(viewport.width, viewport.height * CRAFT_SEAM.aspect)
    * CRAFT_SEAM.overscan;
  return { w, h: w / CRAFT_SEAM.aspect };
}
