import { useState } from 'react';
import SpaceArtifact from './SpaceArtifact';
import { ACHIEVEMENTS } from '../data/achievements';

const colors = ['#9dd8ef', '#f4a077', '#a8d6c1', '#bbc0ed'];
export default function AstronautBay({ data, stats }) {
  const [selection, setSelection] = useState(() => ACHIEVEMENTS.find(item => data.achievementState?.[item.id]?.unlocked)?.id || ACHIEVEMENTS[0].id);
  const badge = ACHIEVEMENTS.find(item => item.id === selection) || ACHIEVEMENTS[0];
  const state = data.achievementState?.[badge.id];
  const earned = !!state?.unlocked;
  const date = state?.unlockedAt && new Date(state.unlockedAt);
  const color = colors[ACHIEVEMENTS.indexOf(badge) % colors.length];
  return <section className="astronaut-bay" aria-label="Astronaut equipment bay">
    <div className="section-heading"><div><h2>Your astronaut equipment bay</h2><p>A mission patch for each milestone. Inspect what you have earned and what comes next.</p></div></div>
    <div className="space-experience">
      <div className="artifact-side"><SpaceArtifact kind="astronaut" label="Astronaut equipment preview" earned={earned} patchColor={color} /><p className="artifact-caption">Standard astronaut · personal likeness not configured. The floating patch previews your selected milestone.</p></div>
      <div className="artifact-inspector">
        <label className="explorer-select">Inspect a mission patch<select value={badge.id} onChange={event => setSelection(event.target.value)}>{ACHIEVEMENTS.map(item => <option value={item.id} key={item.id}>{data.achievementState?.[item.id]?.unlocked ? 'Earned' : 'Locked'} · {item.name}</option>)}</select></label>
        <div className="patch-inspection" aria-live="polite"><svg viewBox="0 0 100 100" width="88" height="88" fill="none" stroke={earned ? color : '#99abc0'} strokeWidth="2" aria-hidden="true"><path d="M50 5 89 27v46L50 95 11 73V27Z" /><circle cx="50" cy="46" r="21" />{earned ? <path d="m38 46 9 9 17-19M34 80h32" /> : <><rect x="40" y="43" width="20" height="17" rx="2" /><path d="M44 43v-7a6 6 0 0 1 12 0v7" /></>}</svg><h3>{badge.name}</h3><p>{earned ? 'Earned mission patch' : 'Locked mission patch'}</p><p>{badge.description}</p><p>{badge.progress(stats, data)}</p>{earned && <p>{date && Number.isFinite(date.getTime()) ? `Earned ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Earned · date unavailable'}</p>}</div>
        <p className="artifact-caption">Patches follow your saved achievements. Inspecting or rotating the model does not unlock them.</p>
      </div>
    </div>
  </section>;
}
