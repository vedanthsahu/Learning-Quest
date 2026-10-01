import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sampleRocket } from "@/lib/journey";
import { scrollState } from "@/lib/scroll";
import { makeGlowTexture } from "@/lib/textures";

/* ------------------------------------------------------------------ */
/* Constants + preallocated scratch (no per-frame allocations)         */
/* ------------------------------------------------------------------ */

const TRAIL_N = 80;
const TRAIL_LIFE = 1.2;

const BOOSTER_ANGLES = [Math.PI / 2, (Math.PI * 7) / 6, (Math.PI * 11) / 6];
const FIN_ANGLES = [Math.PI / 6, (Math.PI * 5) / 6, (Math.PI * 3) / 2];

/** Nozzle assemblies in rocket-local space: main + 3 boosters. */
const EXHAUSTS: { pos: [number, number, number]; s: number }[] = [
  { pos: [0, -1.44, 0], s: 1 },
  { pos: [0, -1.08, -0.55], s: 0.5 },
  { pos: [-0.476, -1.08, 0.275], s: 0.5 },
  { pos: [0.476, -1.08, 0.275], s: 0.5 },
];

const NOZZLE_OFFSETS = EXHAUSTS.map((e) => new THREE.Vector3(...e.pos));

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _qIdle = new THREE.Quaternion();
const _qIdentity = new THREE.Quaternion();
const _eul = new THREE.Euler();
const _mat = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _back = new THREE.Vector3();
const _col = new THREE.Color();

/* ------------------------------------------------------------------ */
/* Exhaust plume shader — white-hot core -> cyan -> violet edge        */
/* ------------------------------------------------------------------ */

const PLUME_VERT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vFres;
  void main() {
    vUv = uv;
    vec3 p = position;
    float tail = uv.y; // 0 at nozzle -> 1 at plume tip
    float wob =
      sin(uv.x * 18.849 + uTime * 9.0 + tail * 8.0) +
      0.5 * sin(uv.x * 31.415 - uTime * 14.0 + tail * 12.0);
    p.x += normal.x * wob * 0.05 * tail;
    p.z += normal.z * wob * 0.05 * tail;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vec3 v = normalize(-mv.xyz);
    vFres = pow(abs(dot(n, v)), 1.35);
    gl_Position = projectionMatrix * mv;
  }
`;

const PLUME_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uThrust;
  uniform float uAlpha;
  uniform vec3 uCore;
  uniform vec3 uMid;
  uniform vec3 uEdge;
  varying vec2 vUv;
  varying float vFres;
  void main() {
    float tail = vUv.y;
    float flick = 0.82 + 0.18 *
      sin(uTime * 21.0 + vUv.x * 12.566) *
      sin(uTime * 15.0 - tail * 10.0);
    vec3 col = mix(uCore, uMid, smoothstep(0.02, 0.38, tail));
    col = mix(col, uEdge, smoothstep(0.42, 0.95, tail));
    float alpha = 1.0 - smoothstep(0.12, 1.0, tail);
    alpha *= vFres * flick * uAlpha * clamp(uThrust, 0.0, 1.0);
    gl_FragColor = vec4(col * flick, alpha);
  }
`;

function makePlumeMaterial(
  core: THREE.Color,
  mid: THREE.Color,
  edge: THREE.Color,
  alpha: number
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: PLUME_VERT,
    fragmentShader: PLUME_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uThrust: { value: 0 },
      uAlpha: { value: alpha },
      uCore: { value: core },
      uMid: { value: mid },
      uEdge: { value: edge },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/* ------------------------------------------------------------------ */
/* Livery — painted hull texture: accent stripes, callsign, panel seams */
/* (LatheGeometry UVs: u wraps around the axis, v runs tail -> nose, so */
/* horizontal canvas bands become rings around the hull.)               */
/* ------------------------------------------------------------------ */

function makeLiveryTexture(): THREE.CanvasTexture {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;

  // Base paint
  ctx.fillStyle = "#f2f3f7";
  ctx.fillRect(0, 0, S, S);

  // Vertical panel seams + rivets
  ctx.strokeStyle = "rgba(10,14,26,0.055)";
  ctx.lineWidth = 2;
  for (let x = 64; x < S; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, S);
    ctx.stroke();
    ctx.fillStyle = "rgba(10,14,26,0.07)";
    for (let y = 300; y < S - 60; y += 90) {
      ctx.beginPath();
      ctx.arc(x + 8, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Horizontal seams on the lower hull
  ctx.strokeStyle = "rgba(10,14,26,0.045)";
  for (const y of [560, 700, 860]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(S, y);
    ctx.stroke();
  }

  // Accent stripes near the top third (v≈0.8 -> canvas y≈205)
  ctx.fillStyle = "#4cc9f0";
  ctx.fillRect(0, 196, S, 34);
  ctx.fillStyle = "#7c3aed";
  ctx.fillRect(0, 248, S, 8);

  // Callsign + tiny logo mark, repeated on opposite sides of the hull
  ctx.fillStyle = "#14161f";
  ctx.font = "700 44px 'JetBrains Mono', 'Menlo', monospace";
  ctx.textAlign = "center";
  for (const x of [S * 0.25, S * 0.75]) {
    ctx.fillText("LQ-01", x, 340);
    ctx.save();
    ctx.translate(x, 400);
    ctx.rotate(Math.PI / 4);
    const g = ctx.createLinearGradient(-16, -16, 16, 16);
    g.addColorStop(0, "#4cc9f0");
    g.addColorStop(1, "#7c3aed");
    ctx.fillStyle = g;
    ctx.fillRect(-14, -14, 28, 28);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/* ------------------------------------------------------------------ */

export default function Rocket() {
  const rootRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const trailRef = useRef<THREE.InstancedMesh>(null);
  const plumesOuter = useRef<(THREE.Mesh | null)[]>([]);
  const plumesInner = useRef<(THREE.Mesh | null)[]>([]);
  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  // LearningQuest: start where the flight resumes, not back on the pad.
  const smoothP = useRef(scrollState.progress);
  const yaw = useRef(0);

  const trail = useRef({
    pos: new Float32Array(TRAIL_N * 3),
    vel: new Float32Array(TRAIL_N * 3),
    age: new Float32Array(TRAIL_N).fill(TRAIL_LIFE + 1),
    cursor: 0,
    acc: 0,
  });

  /* ---------------------------- geometry --------------------------- */

  const geo = useMemo(() => {
    // White hull — smooth ogive shoulder, subtle waist, flared base skirt
    const bodyPts = [
      new THREE.Vector2(0.001, -1.18),
      new THREE.Vector2(0.26, -1.18),
      new THREE.Vector2(0.315, -1.13),
      new THREE.Vector2(0.34, -1.06),
      new THREE.Vector2(0.35, -0.98),
      new THREE.Vector2(0.365, -0.8),
      new THREE.Vector2(0.385, -0.62),
      new THREE.Vector2(0.402, -0.45),
      new THREE.Vector2(0.413, -0.3),
      new THREE.Vector2(0.419, -0.16),
      new THREE.Vector2(0.42, -0.02),
      new THREE.Vector2(0.418, 0.12),
      new THREE.Vector2(0.412, 0.26),
      new THREE.Vector2(0.402, 0.4),
      new THREE.Vector2(0.386, 0.54),
      new THREE.Vector2(0.362, 0.68),
      new THREE.Vector2(0.335, 0.8),
      new THREE.Vector2(0.315, 0.87),
      new THREE.Vector2(0.3, 0.9),
    ];
    const body = new THREE.LatheGeometry(bodyPts, 96);

    // Dark nose cone — smooth ogive blend to a rounded tip (~y 1.42)
    const nosePts = [
      new THREE.Vector2(0.305, 0.86),
      new THREE.Vector2(0.295, 0.94),
      new THREE.Vector2(0.275, 1.03),
      new THREE.Vector2(0.245, 1.12),
      new THREE.Vector2(0.205, 1.2),
      new THREE.Vector2(0.16, 1.27),
      new THREE.Vector2(0.11, 1.33),
      new THREE.Vector2(0.06, 1.38),
      new THREE.Vector2(0.025, 1.41),
      new THREE.Vector2(0.001, 1.42),
    ];
    const nose = new THREE.LatheGeometry(nosePts, 96);

    // Antenna spike above the nose, carrying the beacon
    const antenna = new THREE.CylinderGeometry(0.008, 0.014, 0.16, 10);

    // Tail greebles: small conduit boxes + a service pipe
    const greeble = new THREE.BoxGeometry(0.09, 0.14, 0.05);
    const pipe = new THREE.CylinderGeometry(0.016, 0.016, 0.5, 10);

    // Booster accent rings
    const boosterRing = new THREE.TorusGeometry(0.133, 0.011, 8, 28);

    const rim = new THREE.TorusGeometry(0.155, 0.032, 12, 40);
    const rimSmall = new THREE.TorusGeometry(0.082, 0.02, 10, 28);
    const glass = new THREE.SphereGeometry(0.15, 24, 16);
    const glassSmall = new THREE.SphereGeometry(0.08, 18, 12);

    const booster = new THREE.CapsuleGeometry(0.13, 0.6, 6, 18);
    const boosterTip = new THREE.SphereGeometry(0.128, 18, 14);
    const strut = new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8);

    // Swept fin — extruded profile, x = outward, y = up
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0.18);
    finShape.quadraticCurveTo(0.42, 0.06, 0.62, -0.42);
    finShape.quadraticCurveTo(0.69, -0.6, 0.55, -0.62);
    finShape.quadraticCurveTo(0.26, -0.56, 0.02, -0.34);
    finShape.lineTo(0, 0.18);
    const fin = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.02,
      bevelSegments: 2,
      curveSegments: 16,
    });
    fin.translate(0, 0, -0.025);

    // Main engine: proper flared bell (throat -> flare) + inner surface
    const bellPts = [
      new THREE.Vector2(0.1, 0),
      new THREE.Vector2(0.092, -0.05),
      new THREE.Vector2(0.098, -0.1),
      new THREE.Vector2(0.125, -0.16),
      new THREE.Vector2(0.165, -0.22),
      new THREE.Vector2(0.205, -0.27),
      new THREE.Vector2(0.215, -0.29),
    ];
    const bell = new THREE.LatheGeometry(bellPts, 48);
    const bellInner = new THREE.LatheGeometry(
      bellPts.map((p) => new THREE.Vector2(p.x * 0.93, p.y)),
      48
    );
    const nozzleBooster = new THREE.CylinderGeometry(0.07, 0.105, 0.14, 24);
    const band = new THREE.CylinderGeometry(0.402, 0.412, 0.09, 48);
    const collar = new THREE.TorusGeometry(0.303, 0.012, 8, 48);
    const beacon = new THREE.SphereGeometry(0.035, 12, 10);

    // Teardrop exhaust plume, nozzle at y=0 tapering to tip at y=-1
    const plumePts = [
      new THREE.Vector2(0.02, 0),
      new THREE.Vector2(0.13, -0.03),
      new THREE.Vector2(0.185, -0.12),
      new THREE.Vector2(0.21, -0.26),
      new THREE.Vector2(0.19, -0.42),
      new THREE.Vector2(0.14, -0.6),
      new THREE.Vector2(0.08, -0.78),
      new THREE.Vector2(0.03, -0.92),
      new THREE.Vector2(0.001, -1),
    ];
    const plume = new THREE.LatheGeometry(plumePts, 28);

    const quad = new THREE.PlaneGeometry(0.1, 0.1);

    return {
      body,
      nose,
      antenna,
      greeble,
      pipe,
      boosterRing,
      rim,
      rimSmall,
      glass,
      glassSmall,
      booster,
      boosterTip,
      strut,
      fin,
      bell,
      bellInner,
      nozzleBooster,
      band,
      collar,
      beacon,
      plume,
      quad,
    };
  }, []);

  /* ---------------------------- materials -------------------------- */

  const mats = useMemo(() => {
    // Glossy aerospace paint with clearcoat + livery decals — reflects the
    // HDRI environment for a premium finish.
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      map: makeLiveryTexture(),
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.1,
    });
    // Plain paint (no decals) for boosters/small parts
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: "#f2f3f7",
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.1,
    });
    // Glossy dark carbon/gunmetal
    const darkMat = new THREE.MeshPhysicalMaterial({
      color: "#14161f",
      metalness: 0.85,
      roughness: 0.32,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.0,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: "#b9c2d4",
      metalness: 1.0,
      roughness: 0.35,
      envMapIntensity: 1.3,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: "#0e1e3d",
      roughness: 0.05,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.6,
      emissive: "#1a3a6e",
      emissiveIntensity: 0.35,
    });
    // Faint hot glow deep inside the engine bells
    const bellInnerMat = new THREE.MeshStandardMaterial({
      color: "#181410",
      roughness: 0.6,
      metalness: 0.4,
      emissive: "#ff6a00",
      emissiveIntensity: 0.25,
      side: THREE.BackSide,
    });
    const collarMat = new THREE.MeshStandardMaterial({
      color: "#0a1420",
      emissive: "#4cc9f0",
      emissiveIntensity: 1.4,
      roughness: 0.4,
      metalness: 0.2,
    });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: "#f0abfc",
      emissive: "#f0abfc",
      emissiveIntensity: 1.6,
      roughness: 0.3,
      metalness: 0,
    });

    const plumeOuter = makePlumeMaterial(
      new THREE.Color(1.4, 1.8, 2.0),
      new THREE.Color(0.78, 1.56, 1.6), // #7df9ff boosted for bloom
      new THREE.Color(0.59, 0.49, 0.88), // violet edge
      0.85
    );
    const plumeInner = makePlumeMaterial(
      new THREE.Color(2.4, 2.5, 2.6), // white-hot
      new THREE.Color(1.2, 2.0, 2.1),
      new THREE.Color(0.7, 1.4, 1.5),
      1
    );

    const glowTex = makeGlowTexture("rgba(125,249,255,1)");
    const spriteMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const trailMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    return {
      bodyMat,
      paintMat,
      darkMat,
      rimMat,
      glassMat,
      bellInnerMat,
      collarMat,
      beaconMat,
      plumeOuter,
      plumeInner,
      spriteMat,
      trailMat,
      glowTex,
    };
  }, []);

  // Init trail instance colors to black + dispose GPU resources on unmount
  useEffect(() => {
    const m = trailRef.current;
    if (m) {
      for (let i = 0; i < TRAIL_N; i++) m.setColorAt(i, _col.setRGB(0, 0, 0));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    return () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((x) => x.dispose());
    };
  }, [geo, mats]);

  /* ---------------------------- animation -------------------------- */

  useFrame((state, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // Smoothed scroll progress — same damping as the camera rig
    smoothP.current = THREE.MathUtils.damp(
      smoothP.current,
      scrollState.progress,
      3.2,
      d
    );
    const p = smoothP.current;

    const thrust = sampleRocket(p, _pos, _quat);
    root.position.copy(_pos);
    root.quaternion.copy(_quat);

    // Idle hover on the hero pad, faded out through launch
    const w = 1 - THREE.MathUtils.smoothstep(p, 0.1, 0.2);
    if (w > 0.001) {
      root.position.y += Math.sin(t * 1.2) * 0.18 * w;
      yaw.current += 0.1 * d * w;
      _eul.set(Math.sin(t * 0.7) * 0.03, yaw.current, Math.cos(t * 0.9) * 0.03);
      _qIdle.setFromEuler(_eul);
      _qIdle.slerp(_qIdentity, 1 - w);
      root.quaternion.multiply(_qIdle);
    }

    // Tiny engine turbulence while under thrust
    if (thrust > 0.001) {
      root.position.x += Math.sin(t * 23.7) * 0.02 * thrust;
      root.position.y += Math.cos(t * 31.3) * 0.02 * thrust;
      root.position.z += Math.sin(t * 27.9 + 1.3) * 0.02 * thrust;
    }

    // Finale: the sun swallows the rocket — shrink it to nothing as it
    // plunges in (the explosion, mounted separately, takes over). Uses raw
    // progress so it stays locked to the blast, not the damped follow.
    const impact = scrollState.impact;
    const consume = 1 - THREE.MathUtils.smoothstep(impact, 0.4, 0.8);
    root.scale.setScalar(consume);
    // Violent shudder in the last instant before it's torn apart
    if (impact > 0.001 && consume > 0.001) {
      const shudder = impact * (1 - impact) * 0.9;
      root.position.x += Math.sin(t * 71) * shudder;
      root.position.y += Math.cos(t * 63) * shudder;
    }
    root.updateMatrixWorld();

    // ------------------------- exhaust ------------------------------
    const hot = thrust > 0.02;
    const plumeLen = 0.25 + thrust * 2.6;
    for (let i = 0; i < plumesOuter.current.length; i++) {
      const m = plumesOuter.current[i];
      if (m) {
        m.visible = hot;
        m.scale.y = plumeLen;
      }
      const inner = plumesInner.current[i];
      if (inner) {
        inner.visible = hot;
        inner.scale.y = plumeLen * 0.72;
      }
      const s = sprites.current[i];
      if (s) {
        s.visible = hot;
        const g = 0.45 + thrust * 1.1;
        s.scale.set(g, g, 1);
      }
    }
    mats.plumeOuter.uniforms.uTime.value = t;
    mats.plumeOuter.uniforms.uThrust.value = thrust;
    mats.plumeInner.uniforms.uTime.value = t;
    mats.plumeInner.uniforms.uThrust.value = thrust;
    mats.spriteMat.opacity = THREE.MathUtils.clamp(thrust * 0.75, 0, 1);
    mats.beaconMat.emissiveIntensity = 1.4 + Math.sin(t * 2.6) * 0.9;

    const light = lightRef.current;
    if (light) {
      light.intensity =
        thrust * 14 * (0.9 + 0.1 * Math.sin(t * 41.0) * Math.sin(t * 27.0));
    }

    // ------------------------ particle trail ------------------------
    const tr = trail.current;
    const mesh = trailRef.current;
    if (mesh) {
      // Spawn: respawn oldest instances at a nozzle, kicked backwards
      if (thrust > 0.15) {
        tr.acc += d * (20 + 45 * thrust);
        _back.set(0, -1, 0).applyQuaternion(root.quaternion);
        while (tr.acc >= 1) {
          tr.acc -= 1;
          const i = tr.cursor;
          tr.cursor = (tr.cursor + 1) % TRAIL_N;
          const nz = NOZZLE_OFFSETS[(Math.random() * NOZZLE_OFFSETS.length) | 0];
          _p.copy(nz).applyMatrix4(root.matrixWorld);
          tr.pos[i * 3] = _p.x + (Math.random() - 0.5) * 0.06;
          tr.pos[i * 3 + 1] = _p.y + (Math.random() - 0.5) * 0.06;
          tr.pos[i * 3 + 2] = _p.z + (Math.random() - 0.5) * 0.06;
          const sp = 2.2 + Math.random() * 1.4;
          tr.vel[i * 3] = _back.x * sp + (Math.random() - 0.5) * 0.5;
          tr.vel[i * 3 + 1] = _back.y * sp + (Math.random() - 0.5) * 0.5;
          tr.vel[i * 3 + 2] = _back.z * sp + (Math.random() - 0.5) * 0.5;
          tr.age[i] = 0;
        }
      } else {
        tr.acc = 0;
      }

      // Drift, shrink, fade — billboarded to the camera
      const camQ = state.camera.quaternion;
      const damping = Math.max(0, 1 - 1.5 * d);
      for (let i = 0; i < TRAIL_N; i++) {
        tr.age[i] += d;
        const a = tr.age[i];
        if (a >= TRAIL_LIFE) {
          _p.set(0, -9999, 0);
          _scl.setScalar(0.0001);
          _mat.compose(_p, camQ, _scl);
          mesh.setMatrixAt(i, _mat);
          continue;
        }
        tr.vel[i * 3] *= damping;
        tr.vel[i * 3 + 1] *= damping;
        tr.vel[i * 3 + 2] *= damping;
        tr.pos[i * 3] += tr.vel[i * 3] * d;
        tr.pos[i * 3 + 1] += tr.vel[i * 3 + 1] * d;
        tr.pos[i * 3 + 2] += tr.vel[i * 3 + 2] * d;
        const k = 1 - a / TRAIL_LIFE;
        _p.set(tr.pos[i * 3], tr.pos[i * 3 + 1], tr.pos[i * 3 + 2]);
        _scl.setScalar(0.45 + 1.35 * k);
        _mat.compose(_p, camQ, _scl);
        mesh.setMatrixAt(i, _mat);
        const b = k * k * 1.6;
        mesh.setColorAt(i, _col.setRGB(0.49 * b, 0.976 * b, b));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  /* ----------------------------- scene ----------------------------- */

  return (
    <>
      <group ref={rootRef}>
        {/* Hull */}
        <mesh geometry={geo.body} material={mats.bodyMat} />
        <mesh geometry={geo.nose} material={mats.darkMat} />
        <mesh geometry={geo.band} material={mats.darkMat} position={[0, -0.62, 0]} />
        <mesh
          geometry={geo.collar}
          material={mats.collarMat}
          position={[0, 0.88, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <mesh geometry={geo.antenna} material={mats.rimMat} position={[0, 1.48, 0]} />
        <mesh geometry={geo.beacon} material={mats.beaconMat} position={[0, 1.57, 0]} />

        {/* Tail service details */}
        <mesh
          geometry={geo.greeble}
          material={mats.darkMat}
          position={[0.3, -0.92, 0.22]}
          rotation={[0, 0.63, 0]}
        />
        <mesh
          geometry={geo.greeble}
          material={mats.rimMat}
          position={[-0.33, -0.98, -0.14]}
          rotation={[0, -0.4, 0]}
          scale={[0.8, 0.7, 0.8]}
        />
        <mesh
          geometry={geo.pipe}
          material={mats.rimMat}
          position={[0.07, -0.78, -0.39]}
          rotation={[0.08, 0, 0]}
        />

        {/* Portholes */}
        <group position={[0, 0.46, 0.385]} rotation={[-0.18, 0, 0]}>
          <mesh geometry={geo.rim} material={mats.rimMat} />
          <mesh geometry={geo.glass} material={mats.glassMat} scale={[1, 1, 0.45]} />
        </group>
        <group position={[0, -0.02, 0.41]} rotation={[-0.02, 0, 0]}>
          <mesh geometry={geo.rimSmall} material={mats.rimMat} />
          <mesh geometry={geo.glassSmall} material={mats.glassMat} scale={[1, 1, 0.5]} />
        </group>

        {/* Side boosters — 120° apart, front kept clear for the window */}
        {BOOSTER_ANGLES.map((a, i) => (
          <group key={`booster-${i}`} rotation={[0, a, 0]}>
            <mesh geometry={geo.booster} material={mats.paintMat} position={[0.55, -0.55, 0]} />
            <mesh
              geometry={geo.boosterTip}
              material={mats.darkMat}
              position={[0.55, -0.14, 0]}
              scale={[1, 1.9, 1]}
            />
            <mesh
              geometry={geo.boosterRing}
              material={mats.rimMat}
              position={[0.55, -0.44, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />
            <mesh
              geometry={geo.boosterRing}
              material={mats.rimMat}
              position={[0.55, -0.72, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />
            <mesh geometry={geo.nozzleBooster} material={mats.darkMat} position={[0.55, -1.0, 0]} />
            <mesh
              geometry={geo.strut}
              material={mats.rimMat}
              position={[0.44, -0.3, 0]}
              rotation={[0, 0, Math.PI / 2]}
            />
            <mesh
              geometry={geo.strut}
              material={mats.rimMat}
              position={[0.42, -0.82, 0]}
              rotation={[0, 0, Math.PI / 2]}
            />
          </group>
        ))}

        {/* Swept fins, interleaved between the boosters */}
        {FIN_ANGLES.map((a, i) => (
          <group key={`fin-${i}`} rotation={[0, a, 0]}>
            <mesh geometry={geo.fin} material={mats.darkMat} position={[0.28, -0.72, 0]} />
          </group>
        ))}

        {/* Main engine bell — flared, with a hot inner surface */}
        <group position={[0, -1.16, 0]}>
          <mesh geometry={geo.bell} material={mats.darkMat} />
          <mesh geometry={geo.bellInner} material={mats.bellInnerMat} />
        </group>

        {/* Exhaust: plumes + glow sprites per nozzle */}
        {EXHAUSTS.map((e, i) => (
          <group key={`exhaust-${i}`} position={e.pos} scale={e.s}>
            <mesh
              ref={(m) => {
                plumesOuter.current[i] = m;
              }}
              geometry={geo.plume}
              material={mats.plumeOuter}
              renderOrder={10}
              visible={false}
            />
            <mesh
              ref={(m) => {
                plumesInner.current[i] = m;
              }}
              geometry={geo.plume}
              material={mats.plumeInner}
              scale={[0.5, 0.5, 0.5]}
              renderOrder={10}
              visible={false}
            />
            <sprite
              ref={(s) => {
                sprites.current[i] = s;
              }}
              material={mats.spriteMat}
              position={[0, -0.08, 0]}
              scale={[0.8, 0.8, 1]}
              renderOrder={11}
              visible={false}
            />
          </group>
        ))}

        {/* Shared engine light */}
        <pointLight
          ref={lightRef}
          position={[0, -1.9, 0]}
          color="#7df9ff"
          intensity={0}
          distance={18}
          decay={2}
        />
      </group>

      {/* Particle trail lives in world space so it lags behind the ship */}
      <instancedMesh
        ref={trailRef}
        args={[geo.quad, mats.trailMat, TRAIL_N]}
        frustumCulled={false}
        renderOrder={9}
      />
    </>
  );
}
