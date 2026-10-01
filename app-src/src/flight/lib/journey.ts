import * as THREE from "three";
import { SKILL_COUNT, PROJECT_COUNT } from "./data";

/**
 * The journey map — single source of truth for the scroll-driven flight.
 *
 * World layout: the voyage travels along -Z. Scroll progress p ∈ [0,1]
 * drives the camera and rocket along keyframed paths through the scene.
 */

export const TOTAL_PAGES = 10; // page height = TOTAL_PAGES * 100vh

export const SECTIONS = [
  { id: "hero", label: "Home", range: [0.0, 0.1] },
  { id: "launch", label: "Launch", range: [0.1, 0.19] },
  { id: "about", label: "About", range: [0.19, 0.34] },
  { id: "experience", label: "Work", range: [0.34, 0.5] },
  { id: "skills", label: "Skills", range: [0.5, 0.62] },
  { id: "projects", label: "Projects", range: [0.62, 0.8] },
  { id: "contact", label: "Contact", range: [0.8, 1.0] },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

/**
 * Discrete stops for keyboard "step" navigation. One waypoint per content beat
 * — every skill card and every project card gets its own stop — so a key press
 * advances to the next beat instead of overshooting a whole dense section.
 */
function rangeOf(id: SectionId): readonly [number, number] {
  const s = SECTIONS.find((x) => x.id === id);
  return s ? s.range : [0, 1];
}
export const WAYPOINTS: number[] = (() => {
  const stops: number[] = [0, 0.145]; // home, launch
  const [aA, aB] = rangeOf("about");
  stops.push(aA + (aB - aA) * 0.5);
  const [eA, eB] = rangeOf("experience");
  stops.push(eA + (eB - eA) * 0.5);
  const [sA, sB] = rangeOf("skills");
  for (let i = 0; i < SKILL_COUNT; i++)
    stops.push(sA + ((i + 0.5) / SKILL_COUNT) * (sB - sA));
  const [pA, pB] = rangeOf("projects");
  for (let i = 0; i < PROJECT_COUNT; i++)
    stops.push(pA + ((i + 0.5) / PROJECT_COUNT) * (pB - pA));
  stops.push(0.85, 1); // contact panel, sun-impact finale
  const uniq = [...new Set(stops.map((s) => Math.round(s * 1000) / 1000))];
  return uniq.sort((a, b) => a - b);
})();

/** Landmark positions — everything in the scene anchors to these. */
export const ABOUT_PLANET = {
  position: new THREE.Vector3(-24, 5, -70),
  radius: 11,
};

/** The work-log station drifts here — visited between Earth and the corridor. */
export const STATION = {
  position: new THREE.Vector3(-14, 2, -96),
};

export const SKILLS_CENTER = new THREE.Vector3(9, -2, -128);

export const PROJECTS_PLANET = {
  position: new THREE.Vector3(-4, -3, -186),
  radius: 13,
  ringInner: 16,
  ringOuter: 30,
};

export const CONTACT_SUN = {
  position: new THREE.Vector3(28, 9, -262),
  radius: 7,
};

/**
 * Where the rocket rams the sun — the surface point on its incoming line.
 * The finale explosion (SunImpact) anchors here and the rocket path ends here.
 */
export const IMPACT_POINT = new THREE.Vector3(24.7, 8.2, -256);

/**
 * Finale ramp: 0 until the rocket nears the sun, 1 once it has plunged in.
 * Drives the rocket's disintegration, the explosion, and the sun flare.
 */
export function impactProgress(p: number): number {
  // Plays over a wide scroll band so the detonation unfolds gradually as
  // you scroll rather than firing all at once; completes a hair before the
  // very end so it fully resolves even if the scroll settles short of 1.0.
  return THREE.MathUtils.smoothstep(p, 0.88, 0.99);
}

/** Shared tilt for the projects ring plane + orbiting cards. */
export const PROJECTS_RING_TILT = new THREE.Euler(0.45, 0, 0.08);

/* ------------------------------------------------------------------ */
/* Keyframed paths                                                     */
/* ------------------------------------------------------------------ */

type CamKey = {
  p: number;
  pos: [number, number, number];
  tgt: [number, number, number];
  fov: number;
};

const CAMERA_KEYS: CamKey[] = [
  { p: 0.0, pos: [0, 0.4, 10], tgt: [0, 0.7, 0], fov: 45 },
  { p: 0.07, pos: [0, 0.7, 9.2], tgt: [0, 0.7, 0], fov: 46 },
  { p: 0.12, pos: [0, 2.4, 7.8], tgt: [0, 0.6, -5], fov: 50 },
  { p: 0.19, pos: [0, 1.6, 1.5], tgt: [0, 0.2, -16], fov: 55 },
  { p: 0.26, pos: [-5, 2.5, -36], tgt: [-17, 4, -62], fov: 55 },
  { p: 0.33, pos: [-3, 2.5, -64], tgt: [-22, 5, -82], fov: 52 },
  { p: 0.4, pos: [2, 1.5, -78], tgt: [-13, 2, -95], fov: 52 },
  { p: 0.47, pos: [4, 0.5, -92], tgt: [-8, 1.5, -108], fov: 52 },
  { p: 0.53, pos: [3, -1, -104], tgt: [11, -2, -129], fov: 52 },
  { p: 0.6, pos: [8.5, -2, -135], tgt: [7, -1.5, -156], fov: 52 },
  { p: 0.66, pos: [16, 9, -142], tgt: [-4, -3, -186], fov: 50 },
  { p: 0.74, pos: [32, 8, -157], tgt: [-4, -2, -186], fov: 48 },
  { p: 0.8, pos: [16, 3, -197], tgt: [14, 5, -231], fov: 50 },
  { p: 0.9, pos: [10, 3.5, -215], tgt: [36, 10, -262], fov: 46 },
  { p: 1.0, pos: [13, 4.5, -226], tgt: [36, 10, -262], fov: 44 },
];

type RocketKey = { p: number; pos: [number, number, number] };

/** Rocket path — stays ahead of the camera, threads past the landmarks. */
const ROCKET_KEYS: RocketKey[] = [
  { p: 0.0, pos: [0, 0, 0] },
  { p: 0.1, pos: [0, 0.3, -0.5] },
  { p: 0.19, pos: [0, -0.3, -11] },
  { p: 0.26, pos: [-10, 2.5, -52] },
  { p: 0.33, pos: [-9, 3, -74] },
  // Work section: swing wide left, under the station — keeps the rocket
  // out from behind the experience panel on the right half of the screen
  { p: 0.36, pos: [-13, 0.5, -80] },
  { p: 0.4, pos: [-13, -2.5, -88] },
  { p: 0.47, pos: [-10, -3.5, -102] },
  { p: 0.53, pos: [6, -2.8, -115] },
  { p: 0.6, pos: [7.5, -2, -146] },
  { p: 0.66, pos: [6, 2, -160] },
  { p: 0.74, pos: [14, 4, -174] },
  { p: 0.8, pos: [15, 4, -213] },
  { p: 0.85, pos: [17.5, 5.5, -234] },
  // Final ram: reach the sun's surface (IMPACT_POINT) right as the blast
  // ignites, then keep plunging deeper while the sun consumes the wreck.
  { p: 0.89, pos: [24.7, 8.2, -256] },
  { p: 1.0, pos: [26.8, 8.7, -259.5] },
];

/* ------------------------------------------------------------------ */
/* Sampling helpers                                                    */
/* ------------------------------------------------------------------ */

function buildCurve(keys: { p: number; pos: [number, number, number] }[]) {
  const pts = keys.map((k) => new THREE.Vector3(...k.pos));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
  const stops = keys.map((k) => k.p);
  return { curve, stops };
}

const camPosCurve = buildCurve(CAMERA_KEYS);
const camTgtCurve = buildCurve(
  CAMERA_KEYS.map((k) => ({ p: k.p, pos: k.tgt }))
);
const rocketCurve = buildCurve(ROCKET_KEYS);

/** Map progress -> curve parameter u, honouring non-uniform key spacing. */
function progressToU(p: number, stops: number[]): number {
  const n = stops.length;
  const clamped = THREE.MathUtils.clamp(p, 0, 1);
  for (let i = 0; i < n - 1; i++) {
    if (clamped <= stops[i + 1]) {
      const t = (clamped - stops[i]) / (stops[i + 1] - stops[i]);
      return (i + t) / (n - 1);
    }
  }
  return 1;
}

/* ------------------------------------------------------------------ */
/* Projects orbit — a full lap around the planet so every project card */
/* sweeps past the camera while the section scrolls.                   */
/* ------------------------------------------------------------------ */

const ORBIT_START = 0.63;
const ORBIT_END = 0.79;
const ORBIT_THETA0 = 1.14; // aligned with the keyframed entry position
const ORBIT_CAM_RADIUS = 56; // far enough that planet + ring + cards all frame
const ORBIT_CAM_HEIGHT = 11; // above the ring plane, in ring-local space
const ORBIT_ROCKET_RADIUS = 27; // just outside the outer card lane
const ORBIT_ROCKET_HEIGHT = 1.4; // in ring-plane local space
const ORBIT_LEAD = 0.22; // rocket runs ahead of the camera (radians)

const _orb = new THREE.Vector3();
const _orbDir = new THREE.Vector3();

/**
 * 0 outside the projects-lap window, 1 fully inside, eased at both edges.
 * Exported so the orbiting cards can enlarge themselves while the camera
 * is lapping the planet.
 */
export function projectsOrbitBlend(p: number): number {
  return (
    THREE.MathUtils.smoothstep(p, ORBIT_START, ORBIT_START + 0.025) *
    (1 - THREE.MathUtils.smoothstep(p, ORBIT_END - 0.035, ORBIT_END))
  );
}
const orbitBlend = projectsOrbitBlend;

function orbitTheta(p: number): number {
  const t = THREE.MathUtils.clamp(
    (p - ORBIT_START) / (ORBIT_END - ORBIT_START),
    0,
    1
  );
  return ORBIT_THETA0 + t * Math.PI * 2;
}

/** Sample the camera path. Writes into outPos/outTgt, returns fov. */
export function sampleCamera(
  p: number,
  outPos: THREE.Vector3,
  outTgt: THREE.Vector3
): number {
  camPosCurve.curve.getPoint(progressToU(p, camPosCurve.stops), outPos);
  camTgtCurve.curve.getPoint(progressToU(p, camTgtCurve.stops), outTgt);

  // Projects lap: camera rides the ring plane (elevated), coplanar with
  // the rocket and cards — constant framing, no edge-on moment.
  const ob = orbitBlend(p);
  if (ob > 0) {
    const th = orbitTheta(p);
    _orb
      .set(
        Math.cos(th) * ORBIT_CAM_RADIUS,
        ORBIT_CAM_HEIGHT,
        Math.sin(th) * ORBIT_CAM_RADIUS
      )
      .applyEuler(PROJECTS_RING_TILT)
      .add(PROJECTS_PLANET.position);
    outPos.lerp(_orb, ob);
    outTgt.lerp(PROJECTS_PLANET.position, ob);
  }

  // fov: linear between keys
  const keys = CAMERA_KEYS;
  let fov = keys[keys.length - 1].fov;
  for (let i = 0; i < keys.length - 1; i++) {
    if (p <= keys[i + 1].p) {
      const t = THREE.MathUtils.clamp(
        (p - keys[i].p) / (keys[i + 1].p - keys[i].p),
        0,
        1
      );
      fov = THREE.MathUtils.lerp(keys[i].fov, keys[i + 1].fov, t);
      break;
    }
  }
  return fov;
}

const UP = new THREE.Vector3(0, 1, 0);
const _ahead = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _qPitch = new THREE.Quaternion();
const _qFace = new THREE.Quaternion();
const _qBank = new THREE.Quaternion();

/**
 * Sample the rocket. Writes position + orientation, returns thrust ∈ [0,1].
 * Orientation convention: the rocket model's nose points along +Y in local
 * space; this quaternion rotates local +Y onto the direction of travel.
 * During the hero the rocket stands vertical (identity-ish, gentle idle
 * motion should be layered on top by the component).
 */
export function sampleRocket(
  p: number,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion
): number {
  const u = progressToU(p, rocketCurve.stops);
  rocketCurve.curve.getPoint(u, outPos);

  // Direction of travel from the curve tangent
  rocketCurve.curve.getTangent(Math.min(u, 0.9999), _dir);
  if (_dir.lengthSq() < 1e-6) _dir.set(0, 0, -1);
  _dir.normalize();

  // Projects lap: circle the ring plane just outside the card lanes,
  // running ahead of the camera so each card is flown past in turn.
  const ob = orbitBlend(p);
  if (ob > 0) {
    const th = orbitTheta(p) + ORBIT_LEAD;
    _orb
      .set(
        Math.cos(th) * ORBIT_ROCKET_RADIUS,
        ORBIT_ROCKET_HEIGHT,
        Math.sin(th) * ORBIT_ROCKET_RADIUS
      )
      .applyEuler(PROJECTS_RING_TILT)
      .add(PROJECTS_PLANET.position);
    outPos.lerp(_orb, ob);

    // Travel direction follows the circle's tangent
    _orbDir
      .set(-Math.sin(th), 0, Math.cos(th))
      .applyEuler(PROJECTS_RING_TILT)
      .normalize();
    _dir.lerp(_orbDir, ob).normalize();
  }

  // Blend from "standing vertical" (+Y) to "facing travel direction"
  // across the launch window.
  const pitchT = THREE.MathUtils.smoothstep(p, 0.08, 0.17);
  _qFace.setFromUnitVectors(UP, _dir);
  _qPitch.identity();
  outQuat.copy(_qPitch).slerp(_qFace, pitchT);

  // Bank into turns: roll around the travel axis by lateral curvature,
  // plus a steady lean into the circle while lapping the planet.
  const uAhead = Math.min(u + 0.012, 1);
  rocketCurve.curve.getTangent(uAhead, _ahead);
  // Lateral curvature = x-component of (ahead - dir); dot with (1,0,0)
  const lateral = _ahead.x - _dir.x;
  const bank =
    THREE.MathUtils.clamp(-lateral * 18, -0.7, 0.7) * pitchT * (1 - ob) -
    0.38 * ob;
  _qBank.setFromAxisAngle(UP, bank);
  outQuat.multiply(_qBank);

  // Thrust profile: cold on the pad, ignition through launch, cruise,
  // then a full-throttle kamikaze burn into the sun for the finale.
  const ignition = THREE.MathUtils.smoothstep(p, 0.09, 0.19);
  const burn = 1 + THREE.MathUtils.smoothstep(p, 0.88, 0.97) * 0.6;
  return ignition * burn;
}

/* ------------------------------------------------------------------ */
/* Section helpers                                                     */
/* ------------------------------------------------------------------ */

export function sectionAt(p: number): SectionId {
  for (const s of SECTIONS) {
    if (p <= s.range[1]) return s.id;
  }
  return "contact";
}

/** 0..1 progress within a section, clamped. */
export function sectionProgress(p: number, id: SectionId): number {
  const s = SECTIONS.find((x) => x.id === id)!;
  return THREE.MathUtils.clamp(
    (p - s.range[0]) / (s.range[1] - s.range[0]),
    0,
    1
  );
}

/** Progress value the nav should scroll to for a section (mid-ish entry). */
export function sectionAnchor(id: SectionId): number {
  const s = SECTIONS.find((x) => x.id === id)!;
  if (id === "hero") return 0;
  if (id === "contact") return 1;
  return s.range[0] + (s.range[1] - s.range[0]) * 0.45;
}
