import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";
import type { BloomEffect, ChromaticAberrationEffect } from "postprocessing";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { FlightContent } from "@/lib/data";
import { scrollState } from "@/lib/scroll";
import { useUIStore } from "@/lib/store";
import CameraRig from "./CameraRig";
import Rocket from "./Rocket";
import Planets from "./Planets";
import SpaceEnvironment from "./SpaceEnvironment";
import SkillCards from "./SkillCards";
import ProjectOrbit from "./ProjectOrbit";
import SetDressing from "./SetDressing";
import SunImpact from "./SunImpact";

/**
 * Primes the GPU behind the loading screen: compiles every shader program
 * and uploads every texture before the loader lifts. Without this, gated
 * objects (ISS, skill cards, project cards) compile/upload on the frame
 * they first appear — a visible hitch mid-scroll.
 */
function SceneReady() {
  const setReady = useUIStore((s) => s.setReady);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    let alive = true;

    const collectTextures = (mat: THREE.Material): THREE.Texture[] => {
      const out: THREE.Texture[] = [];
      for (const value of Object.values(mat)) {
        if ((value as THREE.Texture)?.isTexture) out.push(value as THREE.Texture);
      }
      const uniforms = (mat as THREE.ShaderMaterial).uniforms;
      if (uniforms) {
        for (const u of Object.values(uniforms)) {
          if ((u?.value as THREE.Texture)?.isTexture) out.push(u.value as THREE.Texture);
        }
      }
      return out;
    };

    const prime = async () => {
      try {
        await gl.compileAsync(scene, camera);
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh && !(o as THREE.Sprite).isSprite) return;
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          for (const mat of mats) {
            if (!mat) continue;
            for (const tex of collectTextures(mat)) gl.initTexture(tex);
          }
        });
      } catch {
        // Priming is best-effort — never block the site on it
      }
      if (alive) setReady(true);
    };

    prime();
    return () => {
      alive = false;
    };
  }, [gl, scene, camera, setReady]);

  return null;
}

/**
 * Once a deferred subtree has resolved (its models/HDR downloaded), compile
 * its programs so the first time it scrolls into view there's no hitch.
 */
function DeferredPrecompile() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    gl.compileAsync(scene, camera).catch(() => {});
  }, [gl, scene, camera]);
  return null;
}

/**
 * The heavy, off-hero GLB models (ISS 4.4 MB, astronaut, spaceship — none
 * appear in the hero) — mounted only AFTER the hero is on screen and
 * interactive (ready === true), so first paint never waits on them. They
 * stream in the background, then precompile (env already set) so scrolling
 * to the Work/About/Skills sections never hitches.
 */
function DeferredScene() {
  const ready = useUIStore((s) => s.ready);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <SetDressing />
      <DeferredPrecompile />
    </Suspense>
  );
}

/**
 * Surges bloom + chromatic aberration at the moment of the sun impact —
 * the "the lens can't handle it" flare that sells a cinematic blast.
 * Restores the calm baseline everywhere else.
 */
function ImpactPostSurge({
  bloom,
  chroma,
}: {
  bloom: React.RefObject<BloomEffect | null>;
  chroma: React.RefObject<ChromaticAberrationEffect | null>;
}) {
  useFrame(() => {
    const e = scrollState.impact;
    const surge = e * (1 - e) * 4; // peaks mid-blast, zero at rest
    if (bloom.current) bloom.current.intensity = 0.95 + surge * 1.4;
    // ChromaticAberration.offset may be a Vector2 or the raw [x,y] array
    // depending on how the prop was supplied — mutate whichever it is.
    const off = chroma.current?.offset as
      | THREE.Vector2
      | [number, number]
      | undefined;
    if (off) {
      const o = 0.0004 + surge * 0.006;
      if (Array.isArray(off)) {
        off[0] = o;
        off[1] = o;
      } else {
        off.x = o;
        off.y = o;
      }
    }
  });
  return null;
}

export default function Experience({
  content,
  paused = false,
}: {
  content: FlightContent;
  /** LearningQuest: the reader/quiz covers the flight — stop rendering. */
  paused?: boolean;
}) {
  const bloomRef = useRef<BloomEffect | null>(null);
  const chromaRef = useRef<ChromaticAberrationEffect | null>(null);
  // Phones can't sustain full DPR + MSAA + postprocessing — the GPU drops the
  // context and the scene flashes. Detect coarse pointers and trim the load.
  const [isMobile] = useState(() => window.matchMedia("(pointer: coarse)").matches);

  return (
    <div className="tw:fixed tw:inset-0 tw:z-0" aria-hidden>
      <Canvas
        frameloop={paused ? "never" : "always"}
        dpr={isMobile ? [1, 1.25] : [1, 1.75]}
        gl={{
          // The EffectComposer renders via its own targets — canvas MSAA
          // would only burn memory without touching the composed output
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          // "high-performance" can be *refused* by mobile browsers → no context
          powerPreference: isMobile ? "default" : "high-performance",
        }}
        camera={{ position: [0, 0.4, 10], fov: 45, near: 0.1, far: 400 }}
        onCreated={(state) => {
          state.scene.fog = new THREE.FogExp2("#0a0618", 0.0035);
          // Handle for console debugging / tests
          (window as unknown as { __r3f: typeof state }).__r3f = state;
          // LearningQuest: a page reload would throw away reader/navigation
          // state, so a lost context goes straight to the retryable fallback
          // (FlightJourney remounts the canvas on Retry).
          state.gl.domElement.addEventListener(
            "webglcontextlost",
            (e) => {
              e.preventDefault();
              window.dispatchEvent(new Event("gl-fatal"));
            },
            { once: true }
          );
        }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={["#050310"]} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[30, 20, 10]} intensity={1.1} color="#dfe8ff" />

          {/* HDRI reflections stay in the hero load — set before materials
              compile, so no later shader recompile when models stream in. */}
          <Environment
            files="/hdri/dikhololo_night_1k.hdr"
            environmentIntensity={0.5}
          />

          <CameraRig />
          <SpaceEnvironment />
          <Rocket />
          <Planets />
          <SkillCards skills={content.skills} />
          <ProjectOrbit projects={content.projects} />
          <SunImpact />

          {/* Postprocessing (MSAA float targets + mipmap bloom) is the main
              GPU-memory hog that triggers context loss on phones — skip it on
              mobile and render the scene directly. */}
          {!isMobile && (
            <EffectComposer multisampling={4}>
              <Bloom
                ref={bloomRef}
                intensity={0.95}
                luminanceThreshold={0.22}
                luminanceSmoothing={0.9}
                mipmapBlur
              />
              <ChromaticAberration ref={chromaRef} offset={[0.0004, 0.0004]} />
              <Vignette eskil={false} offset={0.18} darkness={0.82} />
            </EffectComposer>
          )}

          {!isMobile && <ImpactPostSurge bloom={bloomRef} chroma={chromaRef} />}
          <SceneReady />
        </Suspense>

        {/* Deferred layer: the HDRI (reflections) and the heavy off-hero
            GLB models (ISS, astronaut, spaceship — none appear in the hero)
            stream in AFTER first paint, then precompile so scrolling to
            them never hitches. This is what makes the hero appear fast. */}
        <DeferredScene />
      </Canvas>
    </div>
  );
}
