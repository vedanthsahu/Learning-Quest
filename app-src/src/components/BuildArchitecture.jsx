import { useEffect, useRef, useState } from 'react';
import { usePreferences } from '../utils/preferences';

const layers = [
  ['React workspace', 'See incidents, evidence, approvals and verified recovery.', '#c4ed9b'],
  ['Spring Boot', 'Own identity, incident state, human approvals and write actions.', '#91dcdc'],
  ['Python AI engine', 'Gather evidence and compare local Ollama with free OpenRouter models.', '#b9acf0'],
  ['Simulator + data', 'Reproduce failures; store reviewed outcomes in PostgreSQL and MinIO.', '#f0bd91'],
];

export default function BuildArchitecture() {
  const host = useRef(null);
  const selected = useRef(0);
  const redraw = useRef(() => {});
  const [active, setActive] = useState(0);
  const [available, setAvailable] = useState(true);
  const { reduced } = usePreferences();
  useEffect(() => { selected.current = active; redraw.current(); }, [active]);
  useEffect(() => {
    const node = host.current;
    let disposed = false, cleanup = () => {};
    import('three').then(THREE => {
      if (disposed) return;
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
      catch { setAvailable(false); return; }
      setAvailable(true);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.domElement.setAttribute('aria-hidden', 'true');
      node.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(5, 4, 7); camera.lookAt(0, 0, 0);
      scene.add(new THREE.AmbientLight(0xffffff, 2));
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(3, 6, 4); scene.add(light);
      const group = new THREE.Group(); scene.add(group);
      const geometry = new THREE.BoxGeometry(2.7, 0.22, 1.8);
      const materials = layers.map(l => new THREE.MeshStandardMaterial({ color: l[2], metalness: 0.25, roughness: 0.4 }));
      const meshes = materials.map((material, i) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 1.35 - i * 0.9; group.add(mesh); return mesh;
      });
      let frame = 0, visible = true, targetX = 0, targetY = 0;
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
      function requestDraw() {
        if (!disposed && !frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
      }
      redraw.current = requestDraw;
      function resize() {
        const width = node.clientWidth, height = node.clientHeight;
        renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix();
        requestDraw();
      }
      function move(e) {
        if (reduced || !finePointer.matches || e.pointerType === 'touch') return;
        const box = node.getBoundingClientRect();
        targetY = ((e.clientX - box.left) / box.width - 0.5) * 0.9;
        targetX = ((e.clientY - box.top) / box.height - 0.5) * 0.25;
        requestDraw();
      }
      function leave() { targetX = targetY = 0; requestDraw(); }
      function choose(event) {
        const box = node.getBoundingClientRect();
        const pointer = new THREE.Vector2((event.clientX - box.left) / box.width * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
        const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, camera);
        const hit = ray.intersectObjects(meshes)[0];
        if (hit) setActive(meshes.indexOf(hit.object));
      }
      function draw() {
        frame = 0;
        if (disposed) return;
        if (visible && !document.hidden) {
          let settling = Math.abs(targetY - group.rotation.y) + Math.abs(targetX - group.rotation.x) > .001;
          group.rotation.y += (targetY - group.rotation.y) * 0.08;
          group.rotation.x += (targetX - group.rotation.x) * 0.08;
          meshes.forEach((mesh, i) => {
            const scale = i === selected.current ? 1.12 : 1;
            if (Math.abs(scale - mesh.scale.x) > .001) settling = true;
            mesh.scale.setScalar(reduced ? scale : mesh.scale.x + (scale - mesh.scale.x) * 0.1);
          });
          renderer.render(scene, camera);
          if (settling && !reduced) requestDraw();
        }
      }
      const observer = new ResizeObserver(resize); observer.observe(node);
      const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; requestDraw(); }); visibility.observe(node);
      node.addEventListener('pointermove', move); node.addEventListener('pointerleave', leave);
      node.addEventListener('click', choose);
      document.addEventListener('visibilitychange', requestDraw);
      resize();
      cleanup = () => {
        cancelAnimationFrame(frame); observer.disconnect(); visibility.disconnect();
        node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', leave);
        node.removeEventListener('click', choose); document.removeEventListener('visibilitychange', requestDraw);
        redraw.current = () => {};
        geometry.dispose(); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => { if (!disposed) setAvailable(false); });
    return () => { disposed = true; cleanup(); };
  }, [reduced]);
  return <section className="build-architecture" aria-label="Explore the application architecture">
    <div ref={host} className="build-model">{!available && <div className="build-model-fallback" aria-hidden="true">◇<br/>◇<br/>◇</div>}</div>
    <div className="build-layer-buttons" aria-label="Architecture layers">{layers.map(([title, , color], i) => <button key={title} aria-pressed={active === i} onClick={() => setActive(i)} style={{ '--layer': color }}>{title}</button>)}</div>
    <p aria-live="polite">{layers[active][1]}</p>
    <small>{reduced ? 'Quiet motion · select a layer to explore' : 'Move your cursor over the model · select a layer'}</small>
  </section>;
}
