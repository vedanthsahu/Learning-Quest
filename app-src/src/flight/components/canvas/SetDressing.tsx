import { Float, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SCENE_LABELS } from "@/lib/data";
import { STATION, sectionProgress } from "@/lib/journey";
import { scrollState } from "@/lib/scroll";
import { makeGlowTexture, makeTextTexture } from "@/lib/textures";

/**
 * SetDressing — downloaded GLB models (Quaternius Ultimate Space Kit, CC0)
 * placed as distant living details along the voyage: a stranded astronaut
 * drifting near the about planet and a far-off ship crossing the skills
 * corridor. They read as silhouettes, keeping the art style coherent.
 */

// LearningQuest runs offline: decode Draco with the decoder bundled from
// three/examples (public/draco) instead of drei's default CDN download.
const DRACO = "/draco/";
useGLTF.preload("/models/astronaut.glb", DRACO);
useGLTF.preload("/models/spaceship.glb", DRACO);
// NASA ISS — Draco + quantized; same local decoder
useGLTF.preload("/models/iss.glb", DRACO);

/* Spaceship flyby path (world space) — stays far from the camera corridor */
const SHIP_FROM = new THREE.Vector3(70, 18, -190);
const SHIP_TO = new THREE.Vector3(-65, 2, -150);
const SHIP_DIR = SHIP_TO.clone().sub(SHIP_FROM).normalize();
const SHIP_QUAT = (() => {
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1), // GLB forward
    SHIP_DIR
  );
  const bank = new THREE.Quaternion().setFromAxisAngle(SHIP_DIR, -0.35);
  return bank.multiply(q);
})();

const _pos = new THREE.Vector3();

function prepScene(scene: THREE.Group) {
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      mesh.frustumCulled = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.isMeshStandardMaterial) mat.envMapIntensity = 0.7;
    }
  });
  return scene;
}

function Astronaut() {
  const groupRef = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/models/astronaut.glb", DRACO);
  const prepped = useMemo(() => prepScene(scene), [scene]);

  const glowMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: makeGlowTexture("rgba(76,201,240,0.8)"),
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    const p = scrollState.progress;
    g.visible = p > 0.17 && p < 0.38;
    if (!g.visible) return;
    if (inner.current) {
      inner.current.rotation.z += dt * 0.1;
      inner.current.rotation.x += dt * 0.06;
    }
  });

  return (
    <group ref={groupRef} position={[-10, -2.5, -57]} visible={false}>
      <sprite material={glowMat} scale={[3, 3, 1]} position={[0, 0, -0.5]} />
      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={1.5}>
        <group ref={inner} rotation={[0.4, -0.6, 0.5]}>
          <primitive object={prepped} scale={1.1} />
        </group>
      </Float>
    </group>
  );
}

function ShipFlyby() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/models/spaceship.glb", DRACO);
  const prepped = useMemo(() => prepScene(scene), [scene]);

  const { glowMat, trailMat } = useMemo(() => {
    const glowMat = new THREE.SpriteMaterial({
      map: makeGlowTexture("rgba(125,249,255,0.9)"),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const trailMat = new THREE.MeshBasicMaterial({
      map: makeGlowTexture("rgba(125,249,255,0.7)"),
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return { glowMat, trailMat };
  }, []);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const sp = sectionProgress(scrollState.progress, "skills");
    const t = THREE.MathUtils.smoothstep(sp, 0.05, 0.95);
    g.visible = sp > 0.001 && sp < 0.999;
    if (!g.visible) return;
    _pos.copy(SHIP_FROM).lerp(SHIP_TO, t);
    g.position.copy(_pos);
  });

  return (
    <group ref={groupRef} visible={false}>
      <group quaternion={SHIP_QUAT} scale={1.3}>
        <primitive object={prepped} />
        {/* Engine glow + short trail at the tail */}
        <sprite material={glowMat} scale={[1.4, 1.4, 1]} position={[0, 0.1, -1.6]} />
        <mesh material={trailMat} position={[0, 0.1, -3.4]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.5, 3.6]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * The work-log station for the experience section — NASA's ISS model
 * (public domain, NASA 3D Resources), recentered and materials tuned
 * for the scene lighting.
 */
function WorkStation({ labelText }: { labelText: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const { scene: issScene } = useGLTF("/models/iss.glb", DRACO);

  // Compute the recenter offset without mutating or reparenting the GLTF
  // scene (both break under Strict Mode's double-invoked memos). The
  // model ships proper PBR maps — only env intensity needs tuning.
  const center = useMemo(() => {
    issScene.position.set(0, 0, 0);
    const box = new THREE.Box3().setFromObject(issScene);
    const c = box.getCenter(new THREE.Vector3());
    issScene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh;
        mesh.frustumCulled = true;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          mat.envMapIntensity = 1.1;
        }
      }
    });
    return c;
  }, [issScene]);

  const label = useMemo(() => {
    const { texture, aspect } = makeTextTexture(labelText, { size: 120 });
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    return { mat, aspect };
  }, [labelText]);

  const labelRef = useRef<THREE.Mesh>(null);

  useFrame((state, dt) => {
    const g = groupRef.current;
    if (!g) return;
    const p = scrollState.progress;
    g.visible = p > 0.3 && p < 0.54;
    if (!g.visible) return;
    if (spinRef.current) spinRef.current.rotation.y += dt * 0.025;
    const sp = sectionProgress(p, "experience");
    const alpha =
      THREE.MathUtils.smoothstep(sp, 0.05, 0.3) *
      (1 - THREE.MathUtils.smoothstep(sp, 0.85, 1));
    label.mat.opacity = alpha * 0.9;
    if (labelRef.current) labelRef.current.quaternion.copy(state.camera.quaternion);
  });

  return (
    <group ref={groupRef} position={STATION.position} visible={false}>
      <Float speed={0.8} rotationIntensity={0.06} floatIntensity={0.4}>
        {/* Truss runs along source Z — angle it toward the flight path */}
        <group ref={spinRef} rotation={[0.12, 0.55, -0.06]}>
          <group scale={1.25}>
            <group position={[-center.x, -center.y, -center.z]}>
              <primitive object={issScene} />
            </group>
          </group>
        </group>
      </Float>
      {/* Blinking beacon */}
      <pointLight color="#4cc9f0" intensity={4} distance={14} decay={2} />
      <mesh ref={labelRef} position={[0, 4.6, 0]} renderOrder={20}>
        <planeGeometry args={[4.2, 4.2 / label.aspect]} />
        <primitive object={label.mat} attach="material" />
      </mesh>
    </group>
  );
}

export default function SetDressing() {
  const ui = { scene: SCENE_LABELS };
  return (
    <>
      <Astronaut />
      <ShipFlyby />
      <WorkStation labelText={ui.scene.workLog} />
    </>
  );
}
