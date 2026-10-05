import { useEffect, useState } from 'react';
import { initialLab, stepLab } from '../data/spaceExperiences';
import { usePreferences } from '../utils/preferences';

export default function FailureLab() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(initialLab);
  const [controls, setControls] = useState({ cache: true, connected: true, burst: false });
  const [running, setRunning] = useState(false);
  const { reduced } = usePreferences();
  const advance = () => setState(value => stepLab(value, controls));
  useEffect(() => {
    if (!running || !open) return;
    const timer = setInterval(() => { if (!document.hidden) setState(value => stepLab(value, controls)); }, 1200);
    const pauseHidden = () => { if (document.hidden) setRunning(false); };
    document.addEventListener('visibilitychange', pauseHidden);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', pauseHidden); };
  }, [running, open, controls]);
  const toggle = key => setControls(value => ({ ...value, [key]: !value[key] }));
  const condition = !controls.connected ? 'Service disconnected. Cache hits can still finish; other requests wait.' : state.queued ? 'The queue is absorbing excess requests. Restore capacity by removing the burst or enabling cache.' : 'Requests are flowing within this simulated capacity.';
  return <section className="failure-lab" aria-label="Failure simulator">
    <div className="section-heading"><div><h2>Break the system. See why.</h2><p>A small, reversible experiment before the real challenges.</p></div><button className="btn-primary" onClick={() => { setOpen(value => !value); setRunning(false); }} aria-expanded={open} aria-controls="failure-lab-panel">{open ? 'Close simulator' : 'Open failure simulator'}</button></div>
    {open && <div id="failure-lab-panel">
      <p className="simulation-notice">Educational simulation · illustrative requests per tick, not live telemetry. This never changes your challenge or build progress.</p>
      <div className="lab-controls">{[['cache', 'Cache enabled'], ['connected', 'Service connected'], ['burst', 'Traffic burst']].map(([key, title]) => <label key={key}><input type="checkbox" checked={controls[key]} onChange={() => toggle(key)} />{title}</label>)}</div>
      <div className="request-flow" data-flowing={running && !reduced} aria-label="Request flow: ingress, cache, queue, service">
        <div><span>Ingress</span><strong>{controls.burst ? 18 : 6}</strong><small>requests / tick</small></div><span className="flow-pipe" aria-hidden="true" />
        <div><span>Cache</span><strong>{controls.cache ? '50%' : 'Off'}</strong><small>{state.cached} served</small></div><span className="flow-pipe" aria-hidden="true" />
        <div data-warning={state.queued >= 20}><span>Queue</span><strong>{state.queued}<small> / 24</small></strong><small>waiting requests</small><meter aria-label="Queue occupancy" min="0" max="24" value={state.queued} /></div><span className="flow-pipe" aria-hidden="true" />
        <div data-warning={!controls.connected}><span>Service</span><strong>{controls.connected ? '4 / tick' : 'Offline'}</strong><small>{state.completed} processed</small></div>
      </div>
      <div className="lab-actions"><button className="btn-primary" onClick={() => setRunning(value => !value)}>{running ? 'Pause simulation' : 'Run simulation'}</button><button onClick={advance} disabled={running}>Advance one tick</button><button onClick={() => { setRunning(false); setState(initialLab()); setControls({ cache: true, connected: true, burst: false }); }}>Reset experiment</button></div>
      <div className="lab-result" role="status" aria-live={running ? 'off' : 'polite'}><strong>Tick {state.tick} · {state.received} received · {state.dropped} dropped</strong><p>{condition}</p>{state.last && <p>Last tick: {state.last.hits} cache hits, {state.last.processed} processed, {state.last.dropped} dropped at the full queue.</p>}</div>
      <details><summary>How this model works</summary><p>Each tick adds 6 requests, or 18 during a burst. An enabled cache serves half of new requests. A connected service handles up to 4 queued requests. The queue holds 24; overflow is dropped. All requests are accounted for: cache hits + processed + waiting + dropped = received. These fixed teaching assumptions do not predict a real deployment.</p></details>
    </div>}
  </section>;
}
