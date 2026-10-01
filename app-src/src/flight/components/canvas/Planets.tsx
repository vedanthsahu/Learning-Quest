import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
  ABOUT_PLANET,
  CONTACT_SUN,
  PROJECTS_PLANET,
  PROJECTS_RING_TILT,
  sectionProgress,
} from "@/lib/journey";
import { SCENE_LABELS } from "@/lib/data";
import { scrollState } from "@/lib/scroll";
import { makeGlowTexture, makeTextTexture } from "@/lib/textures";

/* ------------------------------------------------------------------ */
/* Shared GLSL                                                         */
/* ------------------------------------------------------------------ */

const NOISE_GLSL = /* glsl */ `
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i + vec3(0.0, 0.0, 0.0)), hash3(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p = p * 2.02 + vec3(13.7, 7.3, 3.1);
      a *= 0.5;
    }
    return v;
  }
`;

/** Object-space position + world-space normal/pos for stable noise + fixed sun. */
const PLANET_VERT = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vPos = position;
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const ATMO_VERT = PLANET_VERT;

/** BackSide halo: brightest at the planet limb, fading outward. */
const ATMO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 v = normalize(cameraPosition - vWorldPos);
    float d = dot(normalize(vWorldNormal), v);
    float glow = pow(clamp(-d * 3.2, 0.0, 1.0), 1.6);
    gl_FragColor = vec4(uColor * uIntensity, glow);
  }
`;

/** Photoreal Earth: day/night blend, warm terminator, city lights. */
const EARTH_FRAG = /* glsl */ `
  uniform vec3 uLightDir;
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  varying vec3 vPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 v = normalize(cameraPosition - vWorldPos);
    float lambert = dot(n, uLightDir);

    vec3 day = texture2D(uDayMap, vUv).rgb;
    vec3 nightTex = texture2D(uNightMap, vUv).rgb;

    // Day side with softly falling terminator
    float diff = pow(clamp(lambert, 0.0, 1.0), 0.9);
    vec3 col = day * (0.012 + diff * 1.5);

    // Warm sunset band along the terminator
    float term = 1.0 - smoothstep(0.0, 0.35, abs(lambert - 0.05));
    col *= mix(vec3(1.0), vec3(1.12, 0.86, 0.68), term * 0.55);

    // City lights emerge on the night side (natural sodium color)
    float night = 1.0 - smoothstep(-0.12, 0.1, lambert);
    vec3 lights = pow(nightTex, vec3(1.35)) * vec3(1.0, 0.82, 0.58);
    col += lights * night * 2.0;

    // Faint blue atmospheric haze toward the limb (day side only)
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.4);
    col += vec3(0.32, 0.56, 1.0) * fres * clamp(lambert, 0.0, 1.0) * 0.35;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Cloud shell: lit white clouds, transparent over ocean/land. */
const CLOUD_FRAG = /* glsl */ `
  uniform vec3 uLightDir;
  uniform sampler2D uCloudMap;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vWorldNormal);
    float lambert = dot(n, uLightDir);
    float cloud = texture2D(uCloudMap, vUv).r;
    float lit = 0.03 + pow(clamp(lambert, 0.0, 1.0), 0.85) * 1.35;
    // Warm the clouds at the terminator too
    float term = 1.0 - smoothstep(0.0, 0.3, abs(lambert - 0.05));
    vec3 col = vec3(lit) * mix(vec3(1.0), vec3(1.1, 0.85, 0.7), term * 0.5);
    gl_FragColor = vec4(col, cloud * 0.92);
  }
`;

const GAS_FRAG = /* glsl */ `
  uniform vec3 uLightDir;
  uniform float uTime;
  uniform vec3 uColHigh;
  uniform sampler2D uMap;
  varying vec3 vPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    vec3 n = normalize(vWorldNormal);

    // Real Neptune albedo with slow band drift + counter-drifting shimmer
    vec3 texA = texture2D(uMap, vec2(vUv.x + uTime * 0.004, vUv.y)).rgb;
    vec3 texB = texture2D(uMap, vec2(vUv.x * 1.0 + 0.5 - uTime * 0.002, vUv.y)).rgb;
    vec3 col = mix(texA, texB, 0.15);

    // Gentle living turbulence so the surface never reads as a static JPEG
    float storm = fbm(vPos * 0.6 + vec3(0.0, uTime * 0.02, 0.0));
    col = mix(col, vec3(0.88, 0.97, 1.0), smoothstep(0.78, 0.95, storm) * 0.18);

    float lambert = dot(n, uLightDir);
    col *= 0.05 + max(lambert, 0.0) * 1.3;

    vec3 v = normalize(cameraPosition - vWorldPos);
    float nv = max(dot(n, v), 0.0);

    // Gas-giant limb darkening — brighter disc centre, dimmer edges
    col *= 0.45 + 0.55 * pow(nv, 0.55);

    // Soft blue haze at the limb instead of a hard neon rim
    float fres = pow(1.0 - nv, 3.2);
    col += uColHigh * fres * 0.45 * (0.25 + max(lambert, 0.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

const RING_VERT = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RING_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uInner;
  uniform float uOuter;
  uniform float uReveal;
  uniform vec3 uColor;
  varying vec3 vLocal;
  ${NOISE_GLSL}
  void main() {
    float r = length(vLocal.xy);
    float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
    float a = atan(vLocal.y, vLocal.x) - uTime * 0.02;

    // Concentric streaks (radius-driven) + seamless angular variation
    float fine = vnoise(vec3(r * 3.4, 17.0, 0.0));
    float fine2 = vnoise(vec3(r * 9.0, 4.2, 0.0));
    float az = vnoise(vec3(cos(a) * 2.4 + 4.0, sin(a) * 2.4, r * 0.5));
    float streak = fine * 0.65 + fine2 * 0.55;
    streak *= 0.7 + az * 0.55;

    // Density falloff toward inner/outer edges + a Cassini-style gap
    float edge = smoothstep(0.0, 0.14, t) * (1.0 - smoothstep(0.78, 1.0, t));
    float gap = 1.0 - 0.8 * (1.0 - smoothstep(0.0, 0.05, abs(t - 0.38)));
    float density = streak * edge * gap * uReveal;

    vec3 col = mix(uColor, vec3(1.0), vnoise(vec3(r * 5.5, 9.3, 0.0)) * 0.35) * 1.15;
    gl_FragColor = vec4(col, density);
  }
`;

const SUN_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uImpact;
  uniform sampler2D uMap;
  varying vec3 vPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    // Real solar surface, slowly rotating, with animated churn on top
    vec3 tex = texture2D(uMap, vec2(vUv.x + uTime * 0.006, vUv.y)).rgb;
    float flicker = fbm(vPos * 0.8 + vec3(uTime * 0.12, 0.0, uTime * 0.07));
    vec3 col = tex * (1.7 + (flicker - 0.5) * 0.7);

    // Solar limb darkening — the photosphere dims and reddens at the edge
    vec3 n = normalize(vWorldNormal);
    vec3 v = normalize(cameraPosition - vWorldPos);
    float nv = max(dot(n, v), 0.0);
    float limb = 0.35 + 0.65 * pow(nv, 0.6);
    col *= limb;
    col.b *= 0.75 + 0.25 * limb;

    col *= (0.45 + 0.55 * uReveal); // swells on approach (bloom picks up >1)
    col *= 1.0 + uImpact * 0.7;     // flares white-hot when the rocket hits
    col = mix(col, col + vec3(0.5, 0.35, 0.1), uImpact * 0.5);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ------------------------------------------------------------------ */
/* Shared constants / helpers                                          */
/* ------------------------------------------------------------------ */

const LIGHT_DIR = new THREE.Vector3(1, 0.4, 0.6).normalize();

/** Albedo texture setup shared by every planet map. */
function prepAlbedo(tex: THREE.Texture | THREE.Texture[]) {
  for (const t of Array.isArray(tex) ? tex : [tex]) {
    t.colorSpace = THREE.SRGBColorSpace;
    // Max anisotropy: kills the mip shimmer at grazing angles on the
    // planet limbs (drivers clamp to the hardware cap)
    t.anisotropy = 16;
    t.wrapS = THREE.RepeatWrapping;
    t.needsUpdate = true;
  }
}

useTexture.preload("/textures/4k_earth_daymap.webp");
useTexture.preload("/textures/4k_earth_nightmap.webp");
useTexture.preload("/textures/4k_earth_clouds.webp");
useTexture.preload("/textures/2k_mars.webp");
useTexture.preload("/textures/2k_neptune.webp");
useTexture.preload("/textures/4k_sun.webp");
useTexture.preload("/textures/2k_saturn.webp");
useTexture.preload("/textures/2k_saturn_ring_alpha.png");
useTexture.preload("/textures/2k_jupiter.webp");
useTexture.preload("/textures/2k_moon.webp");

const smoothstep = THREE.MathUtils.smoothstep;

const fadeEnvelope = (sp: number) =>
  smoothstep(sp, 0.05, 0.25) * (1 - smoothstep(sp, 0.8, 1));
const fadeAbout = (p: number) => fadeEnvelope(sectionProgress(p, "about"));
const fadeProjects = (p: number) => fadeEnvelope(sectionProgress(p, "projects"));
const fadeContact = (p: number) =>
  smoothstep(sectionProgress(p, "contact"), 0.05, 0.3);

const ABOUT_LABEL_POS: [number, number, number] = [
  ABOUT_PLANET.position.x + ABOUT_PLANET.radius * 0.15,
  ABOUT_PLANET.position.y + ABOUT_PLANET.radius * 0.9,
  ABOUT_PLANET.position.z + ABOUT_PLANET.radius * 0.55,
];

// Floats just off the planet's face, like the reference video
const PROJECTS_LABEL_POS: [number, number, number] = [
  PROJECTS_PLANET.position.x,
  PROJECTS_PLANET.position.y + PROJECTS_PLANET.radius * 0.15,
  PROJECTS_PLANET.position.z + PROJECTS_PLANET.radius * 1.05,
];

const CONTACT_LABEL_POS: [number, number, number] = [
  CONTACT_SUN.position.x - CONTACT_SUN.radius * 0.6,
  CONTACT_SUN.position.y + CONTACT_SUN.radius * 1.45,
  CONTACT_SUN.position.z + CONTACT_SUN.radius * 0.4,
];

const ASTEROID_TILT = new THREE.Euler(1.15, 0, 0.2);

function createAtmosphereMaterial(color: string, intensity: number) {
  return new THREE.ShaderMaterial({
    vertexShader: ATMO_VERT,
    fragmentShader: ATMO_FRAG,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
    },
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/** Deterministic LCG so the asteroid belt is identical every mount. */
function makeRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/* ------------------------------------------------------------------ */
/* BillboardLabel                                                      */
/* ------------------------------------------------------------------ */

type BillboardLabelProps = {
  text: string;
  fontSize: number;
  width: number;
  position: [number, number, number];
  fade: (progress: number) => number;
  renderOrder?: number;
};

function BillboardLabel({
  text,
  fontSize,
  width,
  position,
  fade,
  renderOrder = 20,
}: BillboardLabelProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { material, aspect } = useMemo(() => {
    const { texture, aspect } = makeTextTexture(text, { size: fontSize });
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      opacity: 0,
      fog: false,
    });
    return { material, aspect };
  }, [text, fontSize]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.quaternion.copy(state.camera.quaternion);
    const alpha = fade(scrollState.progress);
    material.opacity = alpha;
    mesh.visible = alpha > 0.003;
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      material={material}
      renderOrder={renderOrder}
      visible={false}
    >
      <planeGeometry args={[width, width / aspect]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* About planet — rocky, city lights on the night side                 */
/* ------------------------------------------------------------------ */

function AboutPlanet({ label }: { label: string }) {
  const planetRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const beltRef = useRef<THREE.Points>(null);

  const [dayMap, nightMap, cloudMap] = useTexture(
    [
      "/textures/4k_earth_daymap.webp",
      "/textures/4k_earth_nightmap.webp",
      "/textures/4k_earth_clouds.webp",
    ],
    prepAlbedo
  );

  const surfaceMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PLANET_VERT,
        fragmentShader: EARTH_FRAG,
        uniforms: {
          uLightDir: { value: LIGHT_DIR },
          uDayMap: { value: dayMap },
          uNightMap: { value: nightMap },
        },
      }),
    [dayMap, nightMap]
  );

  const cloudMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PLANET_VERT,
        fragmentShader: CLOUD_FRAG,
        uniforms: {
          uLightDir: { value: LIGHT_DIR },
          uCloudMap: { value: cloudMap },
        },
        transparent: true,
        depthWrite: false,
      }),
    [cloudMap]
  );

  const atmoMat = useMemo(() => createAtmosphereMaterial("#5da9ff", 1.15), []);

  const belt = useMemo(() => {
    const count = 600;
    const arr = new Float32Array(count * 3);
    const inner = ABOUT_PLANET.radius * 1.35;
    const outer = ABOUT_PLANET.radius * 1.9;
    const rand = makeRand(48271);
    for (let i = 0; i < count; i++) {
      const ang = rand() * Math.PI * 2;
      const rad = inner + rand() * (outer - inner);
      arr[i * 3] = Math.cos(ang) * rad;
      arr[i * 3 + 1] = (rand() - 0.5) * 0.7;
      arr[i * 3 + 2] = Math.sin(ang) * rad;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const material = new THREE.PointsMaterial({
      color: "#9c8b7a",
      size: 0.12,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { geometry, material };
  }, []);

  useFrame((_, dt) => {
    if (planetRef.current) planetRef.current.rotation.y += dt * 0.008;
    if (cloudsRef.current) cloudsRef.current.rotation.y += dt * 0.012;
    if (beltRef.current) beltRef.current.rotation.y += dt * 0.012;
  });

  return (
    <>
      <group position={ABOUT_PLANET.position} rotation={[0, 0, 0.41]}>
        {/* Initial spin puts India (≈78.9°E) at the sub-camera point of the
            hero view — raycast-solved against the live transform chain. */}
        <mesh ref={planetRef} material={surfaceMat} rotation={[0, 3.5823, 0]}>
          <sphereGeometry args={[ABOUT_PLANET.radius, 96, 96]} />
        </mesh>
        <mesh ref={cloudsRef} material={cloudMat} renderOrder={2}>
          <sphereGeometry args={[ABOUT_PLANET.radius * 1.012, 96, 96]} />
        </mesh>
        <mesh material={atmoMat} renderOrder={3}>
          <sphereGeometry args={[ABOUT_PLANET.radius * 1.055, 48, 48]} />
        </mesh>
        <group rotation={ASTEROID_TILT}>
          <points
            ref={beltRef}
            geometry={belt.geometry}
            material={belt.material}
            renderOrder={4}
          />
        </group>
      </group>
      <BillboardLabel
        text={label}
        fontSize={200}
        width={11}
        position={ABOUT_LABEL_POS}
        fade={fadeAbout}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Projects planet — gas giant with the signature ring                 */
/* ------------------------------------------------------------------ */

function ProjectsPlanet({ label }: { label: string }) {
  const planetRef = useRef<THREE.Mesh>(null);

  const neptuneMap = useTexture("/textures/2k_neptune.webp", prepAlbedo);

  const surfaceMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PLANET_VERT,
        fragmentShader: GAS_FRAG,
        uniforms: {
          uLightDir: { value: LIGHT_DIR },
          uTime: { value: 0 },
          uColHigh: { value: new THREE.Color("#4cc9f0") },
          uMap: { value: neptuneMap },
        },
      }),
    [neptuneMap]
  );

  const atmoMat = useMemo(() => createAtmosphereMaterial("#4cc9f0", 1.2), []);

  const ringMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uInner: { value: PROJECTS_PLANET.ringInner },
          uOuter: { value: PROJECTS_PLANET.ringOuter },
          uReveal: { value: 0 },
          uColor: { value: new THREE.Color("#4cc9f0") },
        },
        side: THREE.DoubleSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  useFrame((state, dt) => {
    if (planetRef.current) planetRef.current.rotation.y += dt * 0.02;
    const t = state.clock.elapsedTime;
    surfaceMat.uniforms.uTime.value = t;
    ringMat.uniforms.uTime.value = t;
    // Ring + atmosphere glow stay quiet until the voyage nears the reveal
    const reveal = smoothstep(scrollState.progress, 0.5, 0.64);
    ringMat.uniforms.uReveal.value = reveal;
    atmoMat.uniforms.uIntensity.value = 1.2 * (0.22 + 0.78 * reveal);
  });

  return (
    <>
      <group position={PROJECTS_PLANET.position}>
        <mesh ref={planetRef} material={surfaceMat}>
          <sphereGeometry args={[PROJECTS_PLANET.radius, 64, 64]} />
        </mesh>
        <mesh material={atmoMat} renderOrder={3}>
          <sphereGeometry args={[PROJECTS_PLANET.radius * 1.06, 48, 48]} />
        </mesh>
        {/* Ring plane: XZ annulus rotated by the shared PROJECTS_RING_TILT —
            project cards orbit in this exact plane. */}
        <group rotation={PROJECTS_RING_TILT}>
          <mesh rotation-x={-Math.PI / 2} material={ringMat} renderOrder={6}>
            <ringGeometry
              args={[PROJECTS_PLANET.ringInner, PROJECTS_PLANET.ringOuter, 180, 8]}
            />
          </mesh>
        </group>
      </group>
      <BillboardLabel
        text={label}
        fontSize={200}
        width={9}
        position={PROJECTS_LABEL_POS}
        fade={fadeProjects}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Contact sun                                                         */
/* ------------------------------------------------------------------ */

function ContactSun({ label }: { label: string }) {
  const sunTex = useTexture("/textures/4k_sun.webp", prepAlbedo);

  const sunMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PLANET_VERT,
        fragmentShader: SUN_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uReveal: { value: 0 },
          uImpact: { value: 0 },
          uMap: { value: sunTex },
        },
      }),
    [sunTex]
  );

  const glowMats = useMemo(() => {
    const specs: Array<[string, number]> = [
      ["rgba(255,246,213,0.9)", 0.5],
      ["rgba(255,157,46,0.85)", 0.3],
      ["rgba(255,179,71,0.8)", 0.18],
    ];
    return specs.map(([color, opacity]) => {
      const m = new THREE.SpriteMaterial({
        map: makeGlowTexture(color),
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      m.toneMapped = false;
      return m;
    });
  }, []);

  const connector = useMemo(() => {
    const start = new THREE.Vector3(...CONTACT_LABEL_POS);
    const dir = start.clone().sub(CONTACT_SUN.position).normalize();
    const a = start.clone().addScaledVector(dir, -1.8);
    const b = CONTACT_SUN.position
      .clone()
      .addScaledVector(dir, CONTACT_SUN.radius * 1.15);
    const geometry = new THREE.BufferGeometry().setFromPoints([a, b]);
    const material = new THREE.LineBasicMaterial({
      color: "#ffd9a0",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 19;
    line.frustumCulled = false;
    return { line, material };
  }, []);

  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    sunMat.uniforms.uTime.value = state.clock.elapsedTime;
    connector.material.opacity = fadeContact(scrollState.progress) * 0.7;
    // Halo + light swell only as the voyage approaches the finale
    const rv = 0.12 + 0.88 * smoothstep(scrollState.progress, 0.62, 0.78);
    // Impact flare: the sun brightens and its halo swells when rammed
    const imp = scrollState.impact;
    sunMat.uniforms.uReveal.value = rv;
    sunMat.uniforms.uImpact.value = imp;
    const flare = 1 + imp * 0.9;
    glowMats[0].opacity = 0.5 * rv * flare;
    glowMats[1].opacity = 0.3 * rv * flare;
    glowMats[2].opacity = 0.18 * rv * flare;
    if (lightRef.current) lightRef.current.intensity = 900 * rv * flare;
  });

  const r = CONTACT_SUN.radius;

  return (
    <>
      <group position={CONTACT_SUN.position}>
        <mesh material={sunMat}>
          <sphereGeometry args={[r, 48, 48]} />
        </mesh>
        <sprite material={glowMats[0]} scale={[r * 5, r * 5, 1]} renderOrder={8} />
        <sprite material={glowMats[1]} scale={[r * 8, r * 8, 1]} renderOrder={9} />
        <sprite material={glowMats[2]} scale={[r * 13, r * 13, 1]} renderOrder={10} />
        <pointLight
          ref={lightRef}
          color="#ffb347"
          intensity={900}
          distance={260}
          decay={1.6}
        />
      </group>
      <primitive object={connector.line} />
      <BillboardLabel
        text={label}
        fontSize={140}
        width={7}
        position={CONTACT_LABEL_POS}
        fade={fadeContact}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Background dressing — distant inert planets for parallax depth      */
/* ------------------------------------------------------------------ */

function BackgroundPlanets() {
  const sphereGeom = useMemo(() => new THREE.SphereGeometry(1, 48, 48), []);

  const [saturnMap, saturnRingMap, jupiterMap, moonMap, marsMap] = useTexture(
    [
      "/textures/2k_saturn.webp",
      "/textures/2k_saturn_ring_alpha.png",
      "/textures/2k_jupiter.webp",
      "/textures/2k_moon.webp",
      "/textures/2k_mars.webp",
    ],
    prepAlbedo
  );

  const mats = useMemo(() => {
    const std = (color: string) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.92,
        metalness: 0.05,
      });
    const textured = (map: THREE.Texture, roughness = 0.95) =>
      new THREE.MeshStandardMaterial({ map, roughness, metalness: 0 });
    const ring = new THREE.MeshBasicMaterial({
      map: saturnRingMap,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    return {
      mars: textured(marsMap),
      saturn: textured(saturnMap),
      jupiter: textured(jupiterMap),
      gray: std("#3a3f4d"),
      moon: textured(moonMap, 1),
      ring,
    };
  }, [saturnMap, saturnRingMap, jupiterMap, moonMap, marsMap]);

  // Saturn's ring texture is a radial strip — remap ring UVs so u runs
  // from the inner edge to the outer edge.
  const saturnRingGeom = useMemo(() => {
    const inner = 12.5;
    const outer = 21;
    const geo = new THREE.RingGeometry(inner, outer, 96, 1);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const r = Math.hypot(v.x, v.y);
      uv.setXY(i, (r - inner) / (outer - inner), 0.5);
    }
    return geo;
  }, []);

  return (
    <group>
      <mesh
        geometry={sphereGeom}
        material={mats.mars}
        position={[86, 38, -158]}
        scale={10}
        rotation={[0.1, 1.4, 0.05]}
      />
      {/* Saturn with its real ring — well clear of Earth from the hero view */}
      <group position={[-112, -34, -200]} rotation={[1.05, 0.2, 0.35]}>
        <mesh geometry={sphereGeom} material={mats.saturn} scale={9} />
        <mesh
          geometry={saturnRingGeom}
          material={mats.ring}
          rotation-x={-Math.PI / 2}
          renderOrder={2}
        />
      </group>
      <mesh
        geometry={sphereGeom}
        material={mats.jupiter}
        position={[58, -26, -248]}
        scale={8}
      />
      <mesh
        geometry={sphereGeom}
        material={mats.gray}
        position={[-70, 38, -280]}
        scale={14}
      />
      {/* Foreground moon in the hero corridor */}
      <mesh
        geometry={sphereGeom}
        material={mats.moon}
        position={[19, -8.5, -26]}
        scale={1.1}
        rotation={[0.3, 2.1, 0]}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */

export default function Planets() {
  const ui = { scene: SCENE_LABELS };
  return (
    <group>
      <AboutPlanet label={ui.scene.about} />
      <ProjectsPlanet label={ui.scene.projects} />
      <ContactSun label={ui.scene.contact} />
      <BackgroundPlanets />
    </group>
  );
}
