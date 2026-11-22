import { useState } from 'react';
import SpaceArtifact from './SpaceArtifact';
import { STATION_MODULES } from '../data/spaceExperiences';
import { allTasks, taskComplete } from '../data/incidentProject';

export default function StationArchitecture({ progress = {}, onSelectTask, onOpenDocument }) {
  const [selected, setSelected] = useState(STATION_MODULES[0].id);
  const module = STATION_MODULES.find(item => item.id === selected);
  const tasks = module.tasks.map(id => allTasks.find(task => task.id === id));
  const remaining = tasks.filter(task => !taskComplete(task, progress[task.id]));
  const documents = [...new Set(tasks.flatMap(task => task.docs))];
  return <section className="space-experience station-experience" aria-label="Architecture station">
    <div className="artifact-side"><SpaceArtifact kind="station" label="Architecture station model" selected={selected} onSelect={setSelected} /><p className="artifact-caption">Select a beacon or subsystem. Station locations are a conceptual map, not live service health.</p></div>
    <div className="artifact-inspector">
      <div className="station-modules" role="group" aria-label="Station subsystems">{STATION_MODULES.map(item => <button key={item.id} onClick={() => setSelected(item.id)} aria-pressed={selected === item.id}><i style={{ background: item.color }} />{item.name}</button>)}</div>
      <div aria-live="polite"><h3>{module.name}</h3><p>{module.description}</p><p>{tasks.length - remaining.length} of {tasks.length} linked steps verified</p></div>
      <h4>{remaining.length ? 'Next build steps' : 'Verified steps'}</h4>
      <ul className="station-task-list">{(remaining.length ? remaining : tasks).map(task => <li key={task.id}><button onClick={() => onSelectTask(task.id)}>{task.title}<span>{taskComplete(task, progress[task.id]) ? 'Verified' : progress[task.id]?.status === 'blocked' ? 'Blocked' : 'Open step'} →</span></button></li>)}</ul>
      <details className="station-documents"><summary>Source documents ({documents.length})</summary><ul>{documents.map(path => <li key={path}><button onClick={() => onOpenDocument(path)}>{path.replace('.md', '').replaceAll('-', ' ')}</button></li>)}</ul></details>
    </div>
  </section>;
}
