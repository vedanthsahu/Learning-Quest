import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { AnimationMixer, Box3, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import Rocket from '../flight/components/canvas/Rocket';
import { STATION_MODULES } from '../data/spaceExperiences';

function Asset({ kind, onReady }) {
  const { scene, animations } = useGLTF(`/models/${kind === 'station' ? 'iss' : 'astronaut'}.glb`, '/draco/');
  const model = useMemo(() => {
    // A separate hierarchy prevents stealing the object from the original flight.
    const object = clone(scene);
    const idle = animations.find(clip => clip.name.endsWith('|Idle'));
    if (idle) { const mixer = new AnimationMixer(object); mixer.clipAction(idle).play(); mixer.update(0); }
    // Skinned bounds must be measured after all bone world matrices and bind
    // inverses are current. Otherwise this asset's 100x rig produces false bounds.
    object.updateMatrixWorld(true);
    object.traverse(child => { if (child.isSkinnedMesh) { child.computeBoundingBox(); child.computeBoundingSphere(); } });
    const box = new Box3().setFromObject(object, true);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = (kind === 'station' ? 4.8 : 3.5) / Math.max(size.x, size.y, size.z);
    return { object, scale, offset: center.multiplyScalar(-scale).toArray() };
  }, [scene, animations, kind]);
  useEffect(() => { onReady(); }, [onReady]);
  return <group position={model.offset}><primitive object={model.object} scale={model.scale} dispose={null} /></group>;
}

function StationMarkers({ selected, onSelect }) {
  return STATION_MODULES.map(module => <group key={module.id} position={module.position}>
    <mesh onClick={event => { event.stopPropagation(); onSelect?.(module.id); }}>
      <sphereGeometry args={[selected === module.id ? .17 : .11, 20, 12]} />
      <meshStandardMaterial color={module.color} emissive={module.color} emissiveIntensity={selected === module.id ? 1 : .25} />
    </mesh>
    {selected === module.id && <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.26, .016, 8, 36]} /><meshBasicMaterial color={module.color} /></mesh>}
  </group>);
}

export default function SpaceArtifactScene({ kind, turn, selected, onSelect, patchColor, earned, fallback }) {
  const [lost, setLost] = useState(false);
  const [ready, setReady] = useState(false);
  const readyCallback = useMemo(() => () => setReady(true), []);
  if (lost) return fallback;
  return <div className="artifact-render" data-ready={ready} data-model={kind}>
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, .15, kind === 'station' ? 8.4 : 6.8], fov: 40 }} gl={{ alpha: true, antialias: true }} fallback={fallback}
      onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', () => setLost(true), { once: true }); if (kind === 'rocket') setReady(true); }}>
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 4, 5]} intensity={3.5} color="#e2f3ff" />
      <directionalLight position={[-3, 1, 2]} intensity={2} color="#a9bfff" />
      <group rotation={[kind === 'station' ? .28 : 0, turn + (kind === 'station' ? -.3 : -.2), kind === 'rocket' ? -.12 : 0]}>
        {kind === 'rocket' ? <Rocket preview /> : <Suspense fallback={null}><Asset kind={kind} onReady={readyCallback} /></Suspense>}
        {kind === 'station' && <StationMarkers selected={selected} onSelect={onSelect} />}
        {kind === 'astronaut' && <group position={[.9, .35, .6]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.3, .3, .045, 6]} /><meshStandardMaterial color={earned ? patchColor : '#526478'} metalness={.5} roughness={.35} /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.35, .02, 8, 48]} /><meshBasicMaterial color={earned ? patchColor : '#8295a8'} /></mesh>
        </group>}
      </group>
    </Canvas>
    {!ready && <span className="artifact-loading" role="status">Loading model…</span>}
  </div>;
}
