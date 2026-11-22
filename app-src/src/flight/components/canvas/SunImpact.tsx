import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { IMPACT_POINT } from "@/lib/journey";
import { scrollState } from "@/lib/scroll";

/**
 * The finale — a cinematic detonation when the rocket rams the sun at
 * IMPACT_POINT. Three independently-designed VFX layers, synthesized:
 *
 *   FB_ — Fireball core (additive HDR puffs) + billowing dark smoke
 *         (NormalBlending, occludes the sun) — domain-warped FBM shaders.
 *   SD_ — Streak sparks (velocity-aligned camera-billboarded tracers) +
 *         ballistic debris shrapnel (opaque faceted octahedra).
 *   SW_ — Shockwave ring + white-hot lens flash w/ star spikes + a
 *         horizontal anamorphic streak.
 *
 * Everything is a PURE function of `e = scrollState.impact` (the slow-mo
 * eased finale value, so the whole blast plays out cinematically); only
 * turbulence/tumble detail rides clock time. Scrubbing up un-explodes it,
 * scrubbing down replays it. Zero per-frame allocation — all scratch is at
 * module scope. Bloom (threshold 0.22) ignites the >1 HDR hot layers.
 */

/* ============================================================ *
 * Shared counts + math aliases                                 *
 * ============================================================ */
const FB_CORE_PUFFS = 4;
const FB_SMOKE_PUFFS = 7;
const SD_COUNT_SPARK = 120;
const SD_COUNT_DEBRIS = 24;

const fbSmooth = THREE.MathUtils.smoothstep;
const fbLerp = THREE.MathUtils.lerp;
const SD_smooth = THREE.MathUtils.smoothstep;
const swClamp = THREE.MathUtils.clamp;
const swSmooth = THREE.MathUtils.smoothstep;
const swLerp = THREE.MathUtils.lerp;

/* ============================================================ *
 * FIREBALL CORE + SMOKE (FB_) — module scratch                 *
 * ============================================================ */
const _fbCamQ = new THREE.Quaternion();
const _fbRight = new THREE.Vector3();
const _fbUp = new THREE.Vector3();
const _fbPos = new THREE.Vector3();
const _fbScl = new THREE.Vector3();
const _fbMat = new THREE.Matrix4();

/** Deterministic unit-disc puff layout (offsets NORMALIZED; scaled per frame). */
function fbBuildPuffs(count: number, seed: number) {
  const ox = new Float32Array(count);
  const oy = new Float32Array(count);
  const size = new Float32Array(count);
  const nseed = new Float32Array(count);
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      ox[i] = 0;
      oy[i] = 0;
      size[i] = 1.35; // central dominant lobe
    } else {
      const ang = rand() * Math.PI * 2;
      const rad = Math.sqrt(rand()); // even fill of unit disc
      ox[i] = Math.cos(ang) * rad;
      oy[i] = Math.sin(ang) * rad;
      size[i] = fbLerp(0.7, 1.2, rand());
    }
    nseed[i] = rand() * 100.0; // decorrelates each puff's noise
  }
  return { ox, oy, size, nseed };
}

/** Domain-warped value-noise FBM (house style, namespaced fb*). */
const FB_FBM = /* glsl */ `
  float fbHash(vec3 p){
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float fbVnoise(vec3 p){
    vec3 i = floor(p); vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(fbHash(i+vec3(0,0,0)), fbHash(i+vec3(1,0,0)), f.x),
          mix(fbHash(i+vec3(0,1,0)), fbHash(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(fbHash(i+vec3(0,0,1)), fbHash(i+vec3(1,0,1)), f.x),
          mix(fbHash(i+vec3(0,1,1)), fbHash(i+vec3(1,1,1)), f.x), f.y),
      f.z);
  }
  float fbFbm(vec3 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++){
      v += a * fbVnoise(p);
      p = p * 2.03 + vec3(11.3, 17.7, 5.1);
      a *= 0.5;
    }
    return v;
  }
  float fbTurb(vec3 p){                 // domain warp -> billowy, not wispy
    vec3 q = vec3(
      fbFbm(p),
      fbFbm(p + vec3(5.2, 1.3, 2.7)),
      fbFbm(p + vec3(2.1, 8.3, 4.4)));
    return fbFbm(p + q * 1.4);
  }
`;

/** Shared vertex — instanceMatrix auto-injected by three under USE_INSTANCING. */
const FB_VERT = /* glsl */ `
  attribute float aSeed;
  varying vec2 vUv;
  varying float vSeed;
  void main(){
    vUv = uv;
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

/** HOT CORE — additive HDR (>1) so bloom ignites it; torn edge, soot voids. */
const FB_CORE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uE;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vSeed;
  ${FB_FBM}
  void main(){
    vec2 p = (vUv - 0.5) * 2.0;         // -1..1
    float r = length(p);
    if (r > 1.0) discard;
    float ang = atan(p.y, p.x);
    float t = uTime;

    float flow = t * 0.55 + uE * 2.2;
    vec3 sp = vec3(cos(ang), sin(ang), 0.0) * r * 2.4 + vec3(0.0, 0.0, vSeed);
    vec3 nc = sp - vec3(0.0, 0.0, r * 3.0 - flow);
    float turb = fbTurb(nc * 1.15 + vec3(0.0, 0.0, t * 0.2));

    float edge = r + (turb - 0.5) * 0.6;
    float body = 1.0 - smoothstep(0.12, 0.98, edge);
    if (body <= 0.001) discard;

    float temp = (1.0 - smoothstep(0.0, 0.8, edge)) * (0.55 + 0.7 * turb);
    float cool = smoothstep(0.12, 0.7, uE);
    temp *= 1.0 - 0.6 * cool;

    vec3 cRed    = vec3(1.7, 0.22, 0.03);
    vec3 cOrange = vec3(4.6, 1.35, 0.22);
    vec3 cWhite  = vec3(7.0, 4.6, 1.9);   // HDR heart -> bloom
    vec3 col = cRed * smoothstep(0.02, 0.30, temp);
    col = mix(col, cOrange, smoothstep(0.30, 0.62, temp));
    col = mix(col, cWhite,  smoothstep(0.66, 1.00, temp));

    float soot = smoothstep(0.5, 0.8, fbFbm(nc * 2.2 + vec3(0.0, 0.0, t * 0.15)));
    col *= 1.0 - soot * 0.5;

    gl_FragColor = vec4(col, body * uOpacity);
  }
`;

/** DARK SMOKE — NORMAL blend so it OCCLUDES the sun; near-black late. */
const FB_SMOKE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uE;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vSeed;
  ${FB_FBM}
  void main(){
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;
    float ang = atan(p.y, p.x);
    float t = uTime;

    float flow = t * 0.22 + uE * 1.4;
    vec3 sp = vec3(cos(ang), sin(ang), 0.0) * r * 1.7 + vec3(0.0, 0.0, vSeed);
    vec3 nc = sp - vec3(0.0, 0.0, r * 2.2 - flow);
    float turb = fbTurb(nc * 0.95 + vec3(0.0, 0.0, t * 0.08));

    float edge = r + (turb - 0.5) * 0.8;
    float body = 1.0 - smoothstep(0.05, 0.99, edge);
    if (body <= 0.001) discard;
    float dens = body * (0.45 + 0.6 * turb);

    float cool = smoothstep(0.18, 0.72, uE);
    vec3 warm = vec3(0.40, 0.16, 0.05);
    vec3 dark = vec3(0.015, 0.014, 0.018);
    vec3 col = mix(warm, dark, cool);
    float lit = (1.0 - smoothstep(0.0, 0.55, r)) * (1.0 - cool);
    col += vec3(0.7, 0.28, 0.06) * lit * 0.6 * turb;   // inner rim catches firelight

    gl_FragColor = vec4(col, dens * uOpacity);
  }
`;

/* ============================================================ *
 * STREAK SPARKS + BALLISTIC DEBRIS (SD_) — module scratch      *
 * ============================================================ */
const SD_pos = new THREE.Vector3();
const SD_dir = new THREE.Vector3();
const SD_x = new THREE.Vector3(); // streak width axis
const SD_y = new THREE.Vector3(); // streak length axis (= velocity)
const SD_z = new THREE.Vector3(); // streak normal (faces camera)
const SD_look = new THREE.Vector3(); // per-instance dir toward camera (local space)
const SD_camLocal = new THREE.Vector3(); // camera position in GROUP-LOCAL space
const SD_scale = new THREE.Vector3();
const SD_axis = new THREE.Vector3();
const SD_mat4 = new THREE.Matrix4();
const SD_quat = new THREE.Quaternion();
const SD_col = new THREE.Color(); // setup-only (per-instance ember tint)
const SD_UP = new THREE.Vector3(0, 1, 0);
const SD_TAU = Math.PI * 2;
/** Constant "gravity" curving debris back INTO the sun so shards are consumed. */
const SD_GRAV = new THREE.Vector3(3.3, 0.8, -6).normalize();
/** Forward-biased spray axis (rocket incoming dir, roughly +X/+Y into sun -Z). */
const SD_SPRAY = new THREE.Vector3(0.55, 0.18, -0.82).normalize();

/** Longitudinal tracer texture: hot white head -> gold tail, sharp centre line. */
function SD_makeStreakTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0.0, "rgba(255,255,255,0)"); // faint tip
  g.addColorStop(0.1, "rgba(255,255,255,1)"); // hot white head
  g.addColorStop(0.35, "rgba(255,225,150,0.75)");
  g.addColorStop(1.0, "rgba(255,180,90,0)"); // gold tail, fades out
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 128);
  const h = ctx.createLinearGradient(0, 0, 16, 0);
  h.addColorStop(0, "rgba(0,0,0,1)");
  h.addColorStop(0.5, "rgba(0,0,0,0)");
  h.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, 16, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ============================================================ *
 * SHOCKWAVE + LENS-FLASH (SW_) — module scratch                *
 * ============================================================ */
const _swCamQ = new THREE.Quaternion();
/** Static roll so the rim crescent leans onto the sun limb (built once). */
const SW_RIM_ROLL = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 0, 1),
  0.5
);

/** Own domain-warped value-noise fbm (namespaced, no collision w/ Planets). */
const SW_NOISE = /* glsl */ `
  float swHash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0;
    return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float swNoise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(swHash(i+vec3(0.,0.,0.)),swHash(i+vec3(1.,0.,0.)),f.x),
                   mix(swHash(i+vec3(0.,1.,0.)),swHash(i+vec3(1.,1.,0.)),f.x),f.y),
               mix(mix(swHash(i+vec3(0.,0.,1.)),swHash(i+vec3(1.,0.,1.)),f.x),
                   mix(swHash(i+vec3(0.,1.,1.)),swHash(i+vec3(1.,1.,1.)),f.x),f.y), f.z); }
  float swFbm(vec3 p){ float v=0.0,a=0.5;
    for(int i=0;i<4;i++){ v+=a*swNoise(p); p=p*2.02+vec3(11.1,7.7,3.3); a*=0.5; } return v; }
  float swFbmW(vec3 p){ vec3 q=vec3(swFbm(p),swFbm(p+vec3(5.2,1.3,2.7)),swFbm(p+vec3(1.7,9.2,3.4)));
    return swFbm(p + 0.6*q); }
`;

const SW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

/** (A) SHOCKWAVE — spec-safe smoothstep, ONE reused warp sample (perf fix). */
const SW_SHOCK_FRAG = /* glsl */ `
  uniform float uRadius, uWidth, uOpacity, uTime;
  uniform vec3 uEdge, uTrail;
  varying vec2 vUv;
  ${SW_NOISE}
  void main(){
    vec2 p = vUv - 0.5;
    float d = length(p) * 2.0;
    float ang = atan(p.y, p.x);
    // ONE warp sample, reused (was 3x swFbmW -> ~400 hashes/frag)
    float warp = swFbmW(vec3(cos(ang)*2.8, sin(ang)*2.8, uTime*0.8));
    float rr = uRadius * (0.985 + warp*0.035);
    float edge = 1.0 - smoothstep(0.0, uWidth, abs(d - rr));
    edge = pow(max(edge,0.0), 1.6) * (0.6 + 0.4*warp);
    float edge2 = 1.0 - smoothstep(0.0, uWidth*2.4, abs(d - rr*0.8));
    edge2 = pow(max(edge2,0.0), 2.0) * 0.35;
    // trail: edge0<edge1 form (spec-safe), then flip
    float inside = (1.0 - smoothstep(rr - 0.30, rr, d)) * step(d, rr);
    float trail = inside * (0.10 + warp*0.22);
    vec3 col = uEdge*(edge*1.7) + uTrail*(edge2 + trail);
    float a = (edge + edge2 + trail) * uOpacity;
    if(a < 0.002) discard;
    gl_FragColor = vec4(col, a);
  }
`;

/** (B) CORE FLASH — hard white-hot disc + thin sharp rim + pointed star spikes. */
const SW_FLASH_FRAG = /* glsl */ `
  uniform float uOpacity, uTime;
  uniform vec3 uCore, uSpike;
  varying vec2 vUv;
  void main(){
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p) + 1e-4;
    float ang = atan(p.y, p.x);
    // near-solid white-hot centre + thin sharp rim (NOT a fuzzy warm ball)
    float disc = 1.0 - smoothstep(0.06, 0.14, r);
    float rim  = (1.0 - smoothstep(0.14, 0.30, r)) * 0.6;
    float core = disc + rim;
    // thin pointed star: crossed spikes, high-power angular concentration / r
    float s4  = pow(abs(cos(ang*2.0)), 220.0);
    float s4b = pow(abs(cos(ang*2.0 - 0.7854)), 220.0);
    float spikes = (s4 + s4b*0.6) * pow(clamp(1.0 - r, 0.0, 1.0), 2.0) / (r*3.0 + 0.10);
    spikes *= 0.82 + 0.18*sin(ang*8.0 + uTime*30.0);
    vec3 col = uCore*(core*3.0) + uSpike*(spikes*1.3);
    float a = clamp(core + spikes*0.7, 0.0, 1.0) * uOpacity;
    if(a < 0.002) discard;
    gl_FragColor = vec4(col, a);
  }
`;

/** (B) HORIZONTAL ANAMORPHIC STREAK — razor cyan-white line w/ longitudinal taper. */
const SW_STREAK_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform vec3  uStreak;
  varying vec2 vUv;
  void main(){
    vec2 p = (vUv - 0.5) * 2.0;                      // p.x, p.y in [-1,1]
    float line  = 1.0 / (abs(p.y) * 90.0 + 1.0);     // razor horizontal core
    float taper = pow(clamp(1.0 - abs(p.x), 0.0, 1.0), 1.5); // bright centre -> fades to edges
    float i = line * taper;
    float a = clamp(i, 0.0, 1.0) * uOpacity;
    if(a < 0.003) discard;
    gl_FragColor = vec4(uStreak * (i * 2.2), a);
  }
`;

/** (C) RIM FLASH — hot molten arc riding the sun limb, angular-windowed. */
const SW_RIM_FRAG = /* glsl */ `
  uniform float uOpacity, uTime, uCenter;
  uniform vec3 uColor;
  varying vec2 vUv;
  ${SW_NOISE}
  void main(){
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float ang = atan(p.y, p.x);
    float arc = 1.0 - smoothstep(0.0, 0.16, abs(r - 0.7));
    arc = pow(max(arc,0.0), 1.5);
    float da = abs(atan(sin(ang-uCenter), cos(ang-uCenter))); // wrapped delta
    float win = 1.0 - smoothstep(0.7, 1.5, da);
    float br = 0.55 + 0.45*swFbmW(vec3(ang*4.0, r*6.0, uTime*1.6));
    float m = arc * win * br;
    vec3 col = uColor * (m*2.0);
    float a = clamp(m, 0.0, 1.0) * uOpacity;
    if(a < 0.002) discard;
    gl_FragColor = vec4(col, a);
  }
`;

/* ============================================================ *
 * Component                                                    *
 * ============================================================ */
export default function SunImpact() {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // FB refs
  const fbCoreRef = useRef<THREE.InstancedMesh>(null);
  const fbSmokeRef = useRef<THREE.InstancedMesh>(null);
  // SD refs
  const SD_sparkRef = useRef<THREE.InstancedMesh>(null);
  const SD_debrisRef = useRef<THREE.InstancedMesh>(null);
  // SW refs
  const swShockRef = useRef<THREE.Mesh>(null);
  const swFlashRef = useRef<THREE.Mesh>(null);
  const swStreakRef = useRef<THREE.Mesh>(null);
  const swRimRef = useRef<THREE.Mesh>(null);

  /* ---- FIREBALL: geometry (unit quad + per-puff aSeed), materials ---- */
  const { fbCoreGeo, fbSmokeGeo, fbCoreMat, fbSmokeMat, fbCorePuffs, fbSmokePuffs } =
    useMemo(() => {
      const fbCorePuffs = fbBuildPuffs(FB_CORE_PUFFS, 0xc0ffee);
      const fbSmokePuffs = fbBuildPuffs(FB_SMOKE_PUFFS, 0xbadf00d);

      const makeGeo = (nseed: Float32Array) => {
        const g = new THREE.PlaneGeometry(1, 1);
        g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(nseed, 1));
        return g;
      };
      const fbCoreGeo = makeGeo(fbCorePuffs.nseed);
      const fbSmokeGeo = makeGeo(fbSmokePuffs.nseed);

      const fbCoreMat = new THREE.ShaderMaterial({
        vertexShader: FB_VERT,
        fragmentShader: FB_CORE_FRAG,
        uniforms: { uTime: { value: 0 }, uE: { value: 0 }, uOpacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      });
      fbCoreMat.toneMapped = false; // keep HDR values for bloom

      const fbSmokeMat = new THREE.ShaderMaterial({
        vertexShader: FB_VERT,
        fragmentShader: FB_SMOKE_FRAG,
        uniforms: { uTime: { value: 0 }, uE: { value: 0 }, uOpacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending, // dark alpha OCCLUDES the bright sun
        side: THREE.DoubleSide,
        fog: false,
      });
      fbSmokeMat.toneMapped = false;

      return { fbCoreGeo, fbSmokeGeo, fbCoreMat, fbSmokeMat, fbCorePuffs, fbSmokePuffs };
    }, []);

  /* ---- SPARKS + DEBRIS: geometry + materials ---- */
  const { SD_sparkGeo, SD_sparkMat, SD_sparkTex, SD_debrisGeo, SD_debrisMat } =
    useMemo(() => {
      // (A) streak quad: unit plane, +Y = length axis, +X = width, +Z = normal.
      // material.color stays white — per-instance HDR ember lives in instanceColor.
      const SD_sparkGeo = new THREE.PlaneGeometry(1, 1);
      const SD_sparkTex = SD_makeStreakTexture();
      const SD_sparkMat = new THREE.MeshBasicMaterial({
        map: SD_sparkTex,
        color: new THREE.Color(1, 1, 1),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false, // billboard: composite over the near sun limb
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      });
      SD_sparkMat.toneMapped = false;

      // (B) faceted shard: octahedron, flat-shaded dark metal (real 3D mesh).
      const SD_debrisGeo = new THREE.OctahedronGeometry(0.9, 0);
      const SD_debrisMat = new THREE.MeshStandardMaterial({
        color: 0x14161f,
        metalness: 0.65,
        roughness: 0.4,
        emissive: new THREE.Color(1.0, 0.35, 0.08),
        emissiveIntensity: 0,
        flatShading: true,
        fog: false,
      });

      return { SD_sparkGeo, SD_sparkMat, SD_sparkTex, SD_debrisGeo, SD_debrisMat };
    }, []);

  /* ---- SPARKS + DEBRIS: deterministic per-instance data (seeded LCG) ---- */
  const SD_data = useMemo(() => {
    let seed = 0x1a2b3c4d >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const onSphere = (out: Float32Array, i: number) => {
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      out[i * 3] = Math.cos(th) * r;
      out[i * 3 + 1] = u;
      out[i * 3 + 2] = Math.sin(th) * r;
    };

    // sparks — CONE-biased along SD_SPRAY (forward spray + ~20% backsplash)
    const dir = new Float32Array(SD_COUNT_SPARK * 3);
    const reach = new Float32Array(SD_COUNT_SPARK);
    const width = new Float32Array(SD_COUNT_SPARK);
    const lenGain = new Float32Array(SD_COUNT_SPARK);
    const tint = new Float32Array(SD_COUNT_SPARK); // 0=white-hot .. 1=deep-orange
    const forwardCount = Math.floor(SD_COUNT_SPARK * 0.8);
    for (let i = 0; i < SD_COUNT_SPARK; i++) {
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const rr = Math.sqrt(1 - u * u);
      const ux = Math.cos(th) * rr;
      const uy = u;
      const uz = Math.sin(th) * rr;
      const fwd = i < forwardCount;
      const tx = fwd ? SD_SPRAY.x : -SD_SPRAY.x;
      const ty = fwd ? SD_SPRAY.y : -SD_SPRAY.y;
      const tz = fwd ? SD_SPRAY.z : -SD_SPRAY.z;
      const b = 0.55; // blend toward spray axis
      const dx = ux + (tx - ux) * b;
      const dy = uy + (ty - uy) * b;
      const dz = uz + (tz - uz) * b;
      const inv = 1 / Math.hypot(dx, dy, dz);
      dir[i * 3] = dx * inv;
      dir[i * 3 + 1] = dy * inv;
      dir[i * 3 + 2] = dz * inv;
      reach[i] = 18 + rand() * 26; // 18..44
      width[i] = 0.06 + rand() * 0.1; // 0.06..0.16
      lenGain[i] = 0.8 + rand() * 0.8; // 0.8..1.6
      tint[i] = rand();
    }

    // debris
    const ddir = new Float32Array(SD_COUNT_DEBRIS * 3);
    const dspeed = new Float32Array(SD_COUNT_DEBRIS);
    const dgrav = new Float32Array(SD_COUNT_DEBRIS);
    const axis = new Float32Array(SD_COUNT_DEBRIS * 3);
    const spin = new Float32Array(SD_COUNT_DEBRIS);
    const tspin = new Float32Array(SD_COUNT_DEBRIS);
    const end = new Float32Array(SD_COUNT_DEBRIS);
    const size = new Float32Array(SD_COUNT_DEBRIS);
    for (let i = 0; i < SD_COUNT_DEBRIS; i++) {
      onSphere(ddir, i);
      dspeed[i] = 5 + rand() * 16; // 5..21
      dgrav[i] = 4 + rand() * 10; // pull into the sun
      onSphere(axis, i); // unit tumble axis
      spin[i] = 0.5 + rand() * 2.0; // revolutions across e
      tspin[i] = (rand() * 2 - 1) * 2.0; // time tumble rate
      end[i] = i < 5 ? 1.15 : 0.8; // first 5 linger as cold silhouettes
      size[i] = 0.2 + rand() * 0.8;
    }

    return {
      dir, reach, width, lenGain, tint,
      ddir, dspeed, dgrav, axis, spin, tspin, end, size,
    };
  }, []);

  /* ---- SHOCKWAVE + LENS-FLASH: shared plane + four materials ---- */
  const { swPlaneGeo, swShockMat, swFlashMat, swStreakMat, swRimMat } = useMemo(() => {
    const swPlaneGeo = new THREE.PlaneGeometry(1, 1);

    const mk = (frag: string, uniforms: Record<string, THREE.IUniform>) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: SW_VERT,
        fragmentShader: frag,
        uniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false, // composite over the sun sphere (no hard z-clip edge)
        side: THREE.DoubleSide,
        fog: false,
      });
      m.toneMapped = false; // let >1 HDR survive into bloom
      return m;
    };

    const swShockMat = mk(SW_SHOCK_FRAG, {
      uRadius: { value: 0 },
      uWidth: { value: 0.18 },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uEdge: { value: new THREE.Color(4.5, 6.2, 9.0) }, // cool white-blue front
      uTrail: { value: new THREE.Color(3.2, 2.2, 1.3) }, // warm heat trail
    });

    const swFlashMat = mk(SW_FLASH_FRAG, {
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uCore: { value: new THREE.Color(9.0, 8.4, 7.0) }, // blown white-hot
      uSpike: { value: new THREE.Color(3.0, 6.0, 9.0) }, // cyan-white spikes
    });

    const swStreakMat = mk(SW_STREAK_FRAG, {
      uOpacity: { value: 0 },
      uStreak: { value: new THREE.Color(5.0, 6.5, 8.0) }, // cyan-white, warm-biased
    });

    const swRimMat = mk(SW_RIM_FRAG, {
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uCenter: { value: 0.7 },
      uColor: { value: new THREE.Color(9.0, 5.0, 2.0) }, // molten orange-white
    });

    return { swPlaneGeo, swShockMat, swFlashMat, swStreakMat, swRimMat };
  }, []);

  /* ---- Post-mount: per-instance ember tint + dynamic instance buffers ---- */
  useEffect(() => {
    const spk = SD_sparkRef.current;
    if (spk) {
      for (let i = 0; i < SD_COUNT_SPARK; i++) {
        const tint = SD_data.tint[i];
        // HDR (>1) so bloom ignites; white-hot -> deep-orange by tint
        SD_col.r = fbLerp(2.6, 2.9, tint);
        SD_col.g = fbLerp(2.4, 1.15, tint);
        SD_col.b = fbLerp(2.0, 0.35, tint);
        spk.setColorAt(i, SD_col);
      }
      if (spk.instanceColor) spk.instanceColor.needsUpdate = true;
      spk.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
    if (SD_debrisRef.current)
      SD_debrisRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (fbCoreRef.current)
      fbCoreRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (fbSmokeRef.current)
      fbSmokeRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, [SD_data]);

  /* ---- Dispose EVERY geometry / material / texture (single cleanup) ---- */
  useEffect(() => {
    return () => {
      fbCoreGeo.dispose();
      fbSmokeGeo.dispose();
      fbCoreMat.dispose();
      fbSmokeMat.dispose();
      SD_sparkGeo.dispose();
      SD_sparkTex.dispose();
      SD_sparkMat.dispose();
      SD_debrisGeo.dispose();
      SD_debrisMat.dispose();
      swPlaneGeo.dispose();
      swShockMat.dispose();
      swFlashMat.dispose();
      swStreakMat.dispose();
      swRimMat.dispose();
    };
  }, [
    fbCoreGeo, fbSmokeGeo, fbCoreMat, fbSmokeMat,
    SD_sparkGeo, SD_sparkTex, SD_sparkMat, SD_debrisGeo, SD_debrisMat,
    swPlaneGeo, swShockMat, swFlashMat, swStreakMat, swRimMat,
  ]);

  /* ---- Single master useFrame: read e ONCE, drive every layer ---- */
  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const e = scrollState.impact;
    g.visible = e > 0.001;
    if (!g.visible) return; // hidden: skip ALL per-frame cost

    // Slow-mo finale: the macro blast already unfolds in slow motion (every
    // layer is driven by the eased `e`). Dilate the raw clock too so the fire
    // churn, flicker and shrapnel tumble lick along lazily — the filmic look.
    const t = state.clock.elapsedTime * 0.5;

    /* ================= FIREBALL CORE + SMOKE ================= */
    _fbCamQ.copy(state.camera.quaternion);
    _fbRight.set(1, 0, 0).applyQuaternion(_fbCamQ);
    _fbUp.set(0, 1, 0).applyQuaternion(_fbCamQ);

    const attack = Math.pow(fbSmooth(e, 0.0, 0.2), 0.55); // violent sub-20% punch
    const grow = fbSmooth(e, 0.04, 1.0);

    const coreLife =
      fbSmooth(e, 0.0, 0.045) *
      (1.0 - fbSmooth(e, 0.42, 0.86)) *
      (0.9 + 0.1 * Math.sin(t * 30.0));
    const coreCloudR = fbLerp(2.0, 8.0, attack);
    const corePuffSz = fbLerp(3.0, 9.0, attack);

    const smokeLife = fbSmooth(e, 0.05, 0.32) * (1.0 - 0.8 * fbSmooth(e, 0.62, 1.0));
    const smokeCloudR = fbLerp(2.5, 14.0, grow);
    const smokePuffSz = fbLerp(4.0, 16.0, grow);
    const rise = fbLerp(0.0, 9.0, grow);

    fbCoreMat.uniforms.uTime.value = t;
    fbCoreMat.uniforms.uE.value = e;
    fbCoreMat.uniforms.uOpacity.value = Math.max(coreLife, 0.0);
    fbSmokeMat.uniforms.uTime.value = t;
    fbSmokeMat.uniforms.uE.value = e;
    fbSmokeMat.uniforms.uOpacity.value = smokeLife;

    const sm = fbSmokeRef.current;
    if (sm) {
      sm.visible = smokeLife > 0.002;
      if (sm.visible) {
        for (let i = 0; i < FB_SMOKE_PUFFS; i++) {
          _fbPos
            .set(0, 0, 0)
            .addScaledVector(_fbRight, fbSmokePuffs.ox[i] * smokeCloudR)
            .addScaledVector(_fbUp, fbSmokePuffs.oy[i] * smokeCloudR);
          _fbPos.y += rise;
          const s = fbSmokePuffs.size[i] * smokePuffSz;
          _fbScl.set(s, s, 1);
          _fbMat.compose(_fbPos, _fbCamQ, _fbScl);
          sm.setMatrixAt(i, _fbMat);
        }
        sm.instanceMatrix.needsUpdate = true;
      }
    }

    const cm = fbCoreRef.current;
    if (cm) {
      cm.visible = coreLife > 0.002;
      if (cm.visible) {
        for (let i = 0; i < FB_CORE_PUFFS; i++) {
          _fbPos
            .set(0, 0, 0)
            .addScaledVector(_fbRight, fbCorePuffs.ox[i] * coreCloudR)
            .addScaledVector(_fbUp, fbCorePuffs.oy[i] * coreCloudR);
          _fbPos.y += rise * 0.35;
          const s = fbCorePuffs.size[i] * corePuffSz;
          _fbScl.set(s, s, 1);
          _fbMat.compose(_fbPos, _fbCamQ, _fbScl);
          cm.setMatrixAt(i, _fbMat);
        }
        cm.instanceMatrix.needsUpdate = true;
      }
    }

    /* ================= STREAK SPARKS + DEBRIS ================= */
    // camera into group-local space (group is unrotated/unscaled at IMPACT_POINT)
    SD_camLocal.copy(state.camera.position).sub(IMPACT_POINT);

    // (A) STREAK SPARKS — velocity-aligned, camera-billboarded tracers
    {
      const life = swClamp(e / 0.55, 0, 1); // gone by e~0.55
      const env = SD_smooth(e, 0.02, 0.06) * (1 - SD_smooth(life, 0.75, 1.0));
      SD_sparkMat.opacity = env;
      const mesh = SD_sparkRef.current;
      if (mesh) {
        mesh.visible = env > 0.001;
        if (mesh.visible) {
          const ease = 1 - (1 - life) * (1 - life) * (1 - life); // ease-out throw
          const dEase = 3 * (1 - life) * (1 - life); // d/dlife -> streak length
          for (let i = 0; i < SD_COUNT_SPARK; i++) {
            const reach = SD_data.reach[i];
            const dist = reach * ease;
            SD_dir.set(SD_data.dir[i * 3], SD_data.dir[i * 3 + 1], SD_data.dir[i * 3 + 2]);
            SD_pos.copy(SD_dir).multiplyScalar(dist); // local position
            const length = Math.max(0.25, SD_data.lenGain[i] * dEase * 3.0);
            const width = SD_data.width[i];

            SD_y.copy(SD_dir); // long axis = velocity
            SD_look.copy(SD_camLocal).sub(SD_pos).normalize(); // toward camera (local)
            SD_x.crossVectors(SD_y, SD_look);
            let l = SD_x.length();
            if (l < 1e-4) {
              // GUARD: velocity ∥ view — cross() degenerates -> NaN
              SD_x.crossVectors(SD_y, SD_UP);
              l = SD_x.length();
              if (l < 1e-4) {
                SD_x.set(1, 0, 0);
                l = 1;
              }
            }
            SD_x.multiplyScalar(1 / l);
            SD_z.crossVectors(SD_x, SD_y); // unit (x,y ⟂)
            SD_x.multiplyScalar(width); // scale basis columns
            SD_y.multiplyScalar(length);
            SD_mat4.makeBasis(SD_x, SD_y, SD_z); // rotation + scale
            SD_mat4.setPosition(SD_pos.x, SD_pos.y, SD_pos.z);
            mesh.setMatrixAt(i, SD_mat4);
          }
          mesh.instanceMatrix.needsUpdate = true;
        }
      }
    }

    // (B) BALLISTIC DEBRIS — tumbling shrapnel, cooling embers
    {
      const mesh = SD_debrisRef.current;
      if (mesh) {
        SD_debrisMat.emissiveIntensity = fbLerp(3.3, 0.12, SD_smooth(e, 0.02, 0.5));
        for (let i = 0; i < SD_COUNT_DEBRIS; i++) {
          SD_dir.set(SD_data.ddir[i * 3], SD_data.ddir[i * 3 + 1], SD_data.ddir[i * 3 + 2]);
          SD_pos.copy(SD_dir).multiplyScalar(SD_data.dspeed[i] * e);
          SD_pos.addScaledVector(SD_GRAV, SD_data.dgrav[i] * e * e); // curve into sun
          SD_axis.set(SD_data.axis[i * 3], SD_data.axis[i * 3 + 1], SD_data.axis[i * 3 + 2]);
          const ang = e * SD_data.spin[i] * SD_TAU + t * SD_data.tspin[i];
          SD_quat.setFromAxisAngle(SD_axis, ang);
          const end = SD_data.end[i];
          const s = SD_data.size[i] * (1 - SD_smooth(e, end - 0.15, end));
          SD_scale.set(s, s, s);
          SD_mat4.compose(SD_pos, SD_quat, SD_scale);
          mesh.setMatrixAt(i, SD_mat4);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    }

    /* ================= SHOCKWAVE + LENS FLASH ================= */
    _swCamQ.copy(state.camera.quaternion);
    const punch = swSmooth(e, 0.02, 0.1) * (1 - swSmooth(e, 0.24, 0.34));
    const kr = swClamp(e / 0.2, 0, 1);
    const eo3 = 1 - (1 - kr) * (1 - kr) * (1 - kr); // ease-out-cubic expansion
    const shockOp = swSmooth(e, 0.02, 0.09) * (1 - swSmooth(e, 0.24, 0.34));
    const rimOp = swSmooth(e, 0.0, 0.04) * (1 - swSmooth(e, 0.14, 0.3));

    const shock = swShockRef.current;
    if (shock) {
      shock.visible = shockOp > 0.001;
      if (shock.visible) {
        swShockMat.uniforms.uRadius.value = swLerp(0.05, 1.0, eo3);
        swShockMat.uniforms.uWidth.value = swLerp(0.18, 0.025, eo3);
        swShockMat.uniforms.uOpacity.value = shockOp;
        swShockMat.uniforms.uTime.value = t;
        shock.quaternion.copy(_swCamQ);
      }
    }

    const flash = swFlashRef.current;
    if (flash) {
      flash.visible = punch > 0.001;
      if (flash.visible) {
        swFlashMat.uniforms.uOpacity.value = punch;
        swFlashMat.uniforms.uTime.value = t;
        const s =
          34.0 *
          (0.94 + 0.06 * Math.sin(t * 60.0)) *
          (0.55 + 0.45 * swSmooth(e, 0.0, 0.06)); // snaps open
        flash.scale.set(s, s, 1);
        flash.quaternion.copy(_swCamQ);
      }
    }

    const streak = swStreakRef.current;
    if (streak) {
      streak.visible = punch > 0.001;
      if (streak.visible) {
        swStreakMat.uniforms.uOpacity.value = punch;
        const w = 95.0 * (0.55 + 0.45 * swSmooth(e, 0.0, 0.09)); // whips outward
        streak.scale.set(w, 4.2, 1);
        streak.quaternion.copy(_swCamQ); // camera-aligned => dead horizontal on screen
      }
    }

    const rim = swRimRef.current;
    if (rim) {
      rim.visible = rimOp > 0.001;
      if (rim.visible) {
        swRimMat.uniforms.uOpacity.value = rimOp;
        swRimMat.uniforms.uTime.value = t;
        rim.quaternion.copy(_swCamQ).multiply(SW_RIM_ROLL);
      }
    }

    /* ================= Shared environment light ================= */
    if (lightRef.current) {
      const pulse = fbSmooth(e, 0.0, 0.05) * (1 - fbSmooth(e, 0.12, 0.5)); // blast flash
      const ember = 0.12 * fbSmooth(e, 0.4, 0.85); // dim resting glow
      lightRef.current.intensity = (pulse * 4.0 + ember) * 90;
    }
  });

  return (
    <group ref={groupRef} position={IMPACT_POINT} visible={false}>
      {/* Shared environment illumination — bright at the blast, settling to ember */}
      <pointLight ref={lightRef} color="#ffb060" intensity={0} distance={90} decay={2} />

      {/* smoke 20 — NormalBlending, occludes the sun */}
      <instancedMesh
        ref={fbSmokeRef}
        args={[fbSmokeGeo, fbSmokeMat, FB_SMOKE_PUFFS]}
        frustumCulled={false}
        renderOrder={20}
      />
      {/* debris 21 — opaque faceted shrapnel (real 3D mesh, keeps depthTest) */}
      <instancedMesh
        ref={SD_debrisRef}
        args={[SD_debrisGeo, SD_debrisMat, SD_COUNT_DEBRIS]}
        frustumCulled={false}
        renderOrder={21}
      />
      {/* fireball core 24 — additive HDR */}
      <instancedMesh
        ref={fbCoreRef}
        args={[fbCoreGeo, fbCoreMat, FB_CORE_PUFFS]}
        frustumCulled={false}
        renderOrder={24}
      />
      {/* shockwave 26 */}
      <mesh
        ref={swShockRef}
        geometry={swPlaneGeo}
        material={swShockMat}
        scale={[80, 80, 1]}
        frustumCulled={false}
        renderOrder={26}
      />
      {/* rim flash 27 */}
      <mesh
        ref={swRimRef}
        geometry={swPlaneGeo}
        material={swRimMat}
        scale={[18, 18, 1]}
        frustumCulled={false}
        renderOrder={27}
      />
      {/* streak sparks 28 */}
      <instancedMesh
        ref={SD_sparkRef}
        args={[SD_sparkGeo, SD_sparkMat, SD_COUNT_SPARK]}
        frustumCulled={false}
        renderOrder={28}
      />
      {/* core flash 30 — white-hot blowout + star spikes */}
      <mesh
        ref={swFlashRef}
        geometry={swPlaneGeo}
        material={swFlashMat}
        frustumCulled={false}
        renderOrder={30}
      />
      {/* horizontal anamorphic streak 32 */}
      <mesh
        ref={swStreakRef}
        geometry={swPlaneGeo}
        material={swStreakMat}
        frustumCulled={false}
        renderOrder={32}
      />
    </group>
  );
}
