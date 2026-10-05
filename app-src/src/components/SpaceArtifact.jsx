import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';

const Scene = lazy(() => import('./SpaceArtifactScene'));
class ArtifactBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function SpaceArtifact({ kind, label, ...props }) {
  const host = useRef(null);
  const [visible, setVisible] = useState(false);
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    // Mount once on approach. Demand rendering remains idle offscreen; retaining
    // the canvas avoids losing a loaded model while inspecting a tall panel.
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: '100px' });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const fallback = <div className="artifact-fallback"><strong>3D preview unavailable</strong><p>All the controls and details still work. Reload to retry the preview.</p></div>;
  return <div className={`space-artifact artifact-${kind}`} ref={host}>
    <div className="artifact-canvas" role="img" aria-label={label}>
      {visible ? <ArtifactBoundary fallback={fallback}><Suspense fallback={<div className="artifact-fallback" role="status">Loading {label.toLowerCase()}…</div>}><Scene {...props} kind={kind} turn={turn} fallback={fallback} /></Suspense></ArtifactBoundary> : <div className="artifact-fallback">{label}</div>}
    </div>
    <div className="artifact-turn" role="group" aria-label={`Rotate ${label.toLowerCase()}`}><button onClick={() => setTurn(value => value - Math.PI / 6)} aria-label="Rotate model left"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /></svg></button><span>Inspect model</span><button onClick={() => setTurn(value => value + Math.PI / 6)} aria-label="Rotate model right"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 10a8 8 0 1 0-1 8M20 4v6h-6" /></svg></button><button onClick={() => setTurn(0)}>Reset view</button></div>
  </div>;
}
