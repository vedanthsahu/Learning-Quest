import { Float } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { type Skill } from "@/lib/data";
import { scrollState } from "@/lib/scroll";
import { makeGlowTexture, makeSkillCardTexture } from "@/lib/textures";

/**
 * SkillCards — six holographic telemetry panels floating along the skills
 * corridor (z -100..-142). The rocket threads between them; each card lazily
 * billboards toward the camera and fades in/out based on flight distance.
 */

/* ------------------------------------------------------------------ */
/* Layout — absolute positions straddling the camera's diagonal path   */
/* through the corridor (spine runs (3,-1,-96) -> (8.5,-2,-127); cards */
/* alternate ~6 units either side of it so each one sweeps past the    */
/* edge of frame like the reference video).                            */
/* ------------------------------------------------------------------ */

type Slot = { x: number; y: number; z: number; side: 1 | -1 };

const LAYOUT: Slot[] = [
  { x: -1.6, y: 0.9, z: -109, side: -1 },
  { x: 11.3, y: -3.7, z: -117, side: 1 },
  { x: 0.5, y: -2.4, z: -125, side: -1 },
  { x: 13.8, y: 1.3, z: -133, side: 1 },
  { x: 3.6, y: -4.8, z: -141, side: -1 },
  { x: 17.4, y: -0.6, z: -149, side: 1 },
];

// Cluster center x (= journey.ts SKILLS_CENTER.x). The layout spans x -1.6..17.4,
// authored to sweep past the edge of a landscape frame. On a narrow portrait
// screen three's horizontal FOV collapses and the side cards clip off-screen, so
// we pull them toward this center. ponytail: PORTRAIT_KX tuned on-device.
const CLUSTER_X = 9;
const PORTRAIT_KX = 0.5;

/* Scratch — zero per-frame allocations */
const UP = new THREE.Vector3(0, 1, 0);
const _mat4 = new THREE.Matrix4();
const _qTarget = new THREE.Quaternion();
const _wPos = new THREE.Vector3();

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

type CardProps = {
  skill: Skill;
  position: [number, number, number];
  /** +1 card sits right of the flight path, -1 left. */
  side: 1 | -1;
  plane: THREE.PlaneGeometry;
  glowTex: THREE.CanvasTexture;
};

function Card({ skill, position, side, plane, glowTex }: CardProps) {
  const inner = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const hoverScale = useRef(1);
  const glowBase = useRef(0.35);

  const cardMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      map: makeSkillCardTexture(skill),
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    m.toneMapped = false;
    m.fog = false;
    return m;
  }, [skill]);

  const glowMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    });
    m.toneMapped = false;
    m.fog = false;
    return m;
  }, [glowTex]);

  const tickMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    });
    m.toneMapped = false;
    m.fog = false;
    return m;
  }, [glowTex]);

  useEffect(() => {
    return () => {
      cardMat.map?.dispose();
      cardMat.dispose();
      glowMat.dispose();
      tickMat.dispose();
    };
  }, [cardMat, glowMat, tickMat]);

  useFrame((state, delta) => {
    const g = inner.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);

    // Distance-based reveal gated to the skills section, so cards never
    // bleed into the experience panel's window
    const dz = position[2] - state.camera.position.z;
    const p = scrollState.progress;
    const alpha =
      THREE.MathUtils.smoothstep(dz, -46, -20) *
      (1 - THREE.MathUtils.smoothstep(dz, 4, 12)) *
      THREE.MathUtils.smoothstep(p, 0.48, 0.52);

    const visible = alpha > 0.004;
    g.visible = visible;

    // Hover response — damped, no react state
    hoverScale.current = THREE.MathUtils.damp(
      hoverScale.current,
      hovered.current ? 1.06 : 1,
      8,
      dt
    );
    glowBase.current = THREE.MathUtils.damp(
      glowBase.current,
      hovered.current ? 0.55 : 0.35,
      8,
      dt
    );

    cardMat.opacity = alpha;
    glowMat.opacity = glowBase.current * alpha;
    tickMat.opacity = 0.5 * alpha;

    g.scale.setScalar((0.85 + 0.15 * alpha) * hoverScale.current);

    if (!visible) return;

    // Billboard: track camera-facing tightly so the panel is never read
    // at a glancing (blurring) angle
    g.getWorldPosition(_wPos);
    _mat4.lookAt(state.camera.position, _wPos, UP);
    _qTarget.setFromRotationMatrix(_mat4);
    g.quaternion.slerp(_qTarget, 1 - Math.exp(-10 * dt));
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hovered.current = true;
  };
  const onOut = () => {
    hovered.current = false;
  };

  return (
    <group position={position}>
      <Float speed={1.6} rotationIntensity={0.1} floatIntensity={0.9}>
        <group ref={inner}>
          {/* Soft additive backlight */}
          <mesh
            geometry={plane}
            material={glowMat}
            position={[0, 0, -0.06]}
            scale={[5.0, 2.9, 1]}
            renderOrder={14}
          />
          {/* Main HUD panel */}
          <mesh
            geometry={plane}
            material={cardMat}
            scale={[4.8, 2.7, 1]}
            renderOrder={15}
            onPointerOver={onOver}
            onPointerOut={onOut}
          />
          {/* Connector tick angled toward the flight path */}
          <mesh
            geometry={plane}
            material={tickMat}
            position={[-side * 0.5, -2.1, 0]}
            rotation={[0, 0, -side * 0.42]}
            scale={[0.07, 1.35, 1]}
            renderOrder={14}
          />
        </group>
      </Float>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* SkillCards                                                          */
/* ------------------------------------------------------------------ */

export default function SkillCards({ skills }: { skills: Skill[] }) {
  const shared = useMemo(() => {
    return {
      plane: new THREE.PlaneGeometry(1, 1),
      glowTex: makeGlowTexture("rgba(76,201,240,0.55)"),
    };
  }, []);

  useEffect(() => {
    return () => {
      shared.plane.dispose();
      shared.glowTex.dispose();
    };
  }, [shared]);

  // Portrait: compress the wide card spread toward the cluster center so the
  // side cards stay on-screen (narrow viewport = collapsed horizontal FOV).
  const { width, height } = useThree((s) => s.size);
  const kx = width < height ? PORTRAIT_KX : 1;

  return (
    <group>
      {skills.map((skill, i) => {
        const slot = LAYOUT[i % LAYOUT.length];
        return (
          <Card
            key={skill.num}
            skill={skill}
            position={[CLUSTER_X + (slot.x - CLUSTER_X) * kx, slot.y, slot.z]}
            side={slot.side}
            plane={shared.plane}
            glowTex={shared.glowTex}
          />
        );
      })}
    </group>
  );
}
