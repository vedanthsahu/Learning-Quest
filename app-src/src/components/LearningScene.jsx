import { Component, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { DoubleSide, Vector3 } from 'three';
import { Line } from '@react-three/drei';
import { facingRotation } from '../utils/chapterNavigation';

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Geometry({ nodes, selectedId, onSelect, orbit, rotation, routeIds }) {
  const route = useMemo(() => routeIds.map(id => nodes.find(node => node.id === id)).filter(Boolean), [routeIds, nodes]);
  const arcs = useMemo(() => route.slice(1).map((node, i) => {
    const from = new Vector3(...route[i].position), to = new Vector3(...node.position);
    return Array.from({ length: 17 }, (_, step) => from.clone().lerp(to, step / 16).normalize().multiplyScalar(1.73 + .1 * Math.sin(Math.PI * step / 16)).toArray());
  }), [route]);
  return <group rotation={rotation}>
    {!orbit && arcs.map((points, i) => <Line key={route[i].id} points={points} color="#f4a077" lineWidth={1.4} />)}
    <mesh onClick={event => event.stopPropagation()}>
      <sphereGeometry args={[orbit ? .85 : 1.61, 48, 32]} />
      <meshStandardMaterial color={orbit ? '#253d58' : '#10293e'} roughness={.72} metalness={.25} />
    </mesh>
    {!orbit && <mesh>
      <sphereGeometry args={[1.625, 32, 18]} />
      <meshBasicMaterial color="#46738b" wireframe transparent opacity={.33} />
    </mesh>}
    {orbit && <group rotation={[.34, 0, -.24]}>
      {[1.18, 1.32, 1.51].map((radius, i) => <mesh key={radius} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius, radius + .06 + i * .025, 100]} />
        <meshBasicMaterial color={i === 1 ? '#eed1a5' : '#8ebdcf'} side={DoubleSide} transparent opacity={.8 - i * .13} />
      </mesh>)}
    </group>}
    {nodes.map(node => <group key={node.id} position={node.position}>
      <mesh onClick={event => { event.stopPropagation(); if (event.delta < 6) onSelect(node.id); }}>
        <sphereGeometry args={[orbit ? (selectedId === node.id ? .26 : .18) : (selectedId === node.id ? .09 : .052), 16, 12]} />
        <meshStandardMaterial color={selectedId === node.id ? '#fff1d9' : node.color} emissive={node.color} emissiveIntensity={selectedId === node.id ? .9 : .3} roughness={.45} />
      </mesh>
    </group>)}
  </group>;
}

const NO_ROUTE = [];
export default function LearningScene({ nodes, selectedId, onSelect, orbit = false, angle = 0, routeIds = NO_ROUTE }) {
  const [lost, setLost] = useState(false);
  const [ready, setReady] = useState(false);
  const [dragState, setDrag] = useState({ id: selectedId, angles: [0, 0] });
  const drag = dragState.id === selectedId ? dragState.angles : [0, 0];
  const [gesture, setGesture] = useState(null);
  const selected = nodes.find(node => node.id === selectedId);
  const facing = orbit ? [.26, angle, 0] : facingRotation(selected?.position || [0, 0, 1]);
  const rotation = [facing[0] + drag[0], facing[1] + drag[1], 0];
  const fallback = <div className="learning-scene-fallback"><strong>3D view unavailable</strong><p>Use the chapter or book selector alongside this view. Your progress is unchanged.</p></div>;
  if (lost) return fallback;
  return <SceneBoundary fallback={fallback}>
    <div className={`learning-scene ${orbit ? 'is-orbit' : ''}`} data-ready={ready} role="img" aria-label={orbit ? 'Books orbit a ringed planet. Select a book with the controls.' : 'Chapter globe. Drag horizontally to rotate; use the chapter selector for keyboard access.'}
      onPointerDown={event => {
        if (orbit || event.button !== 0) return;
        setGesture({ x: event.clientX, y: event.clientY, drag });
      }}
      onPointerMove={event => {
        if (!gesture || orbit) return;
        setDrag({ id: selectedId, angles: [Math.min(.9, Math.max(-.9, gesture.drag[0] + (event.clientY - gesture.y) * .004)), gesture.drag[1] + (event.clientX - gesture.x) * .008] });
      }} onPointerUp={() => setGesture(null)} onPointerCancel={() => setGesture(null)} onPointerLeave={() => setGesture(null)}>
      <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, orbit ? 7.5 : 5.6], fov: 44 }}
        gl={{ antialias: true, alpha: true }} fallback={fallback}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', () => setLost(true), { once: true });
          setReady(true);
        }}>
        <ambientLight intensity={1.4} />
        <directionalLight position={[3, 4, 5]} intensity={3} color="#dcf2ff" />
        <directionalLight position={[-3, -2, -2]} intensity={1.2} color="#5b8bad" />
        <Geometry nodes={nodes} selectedId={selectedId} orbit={orbit} rotation={rotation} routeIds={routeIds} onSelect={id => { setDrag({ id, angles: [0, 0] }); onSelect(id); }} />
      </Canvas>
    </div>
    {!orbit && <button className="globe-reset" onClick={() => setDrag({ id: selectedId, angles: [0, 0] })}>Centre selected chapter</button>}
  </SceneBoundary>;
}
