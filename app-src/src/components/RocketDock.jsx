import SpaceArtifact from './SpaceArtifact';
import { savedReadingPercent } from '../data/spaceExperiences';

export default function RocketDock({ next, onReturn }) {
  const percent = savedReadingPercent(next?.topic);
  return <div className="rocket-dock">
    <SpaceArtifact kind="rocket" label="Docked learning rocket" />
    <div className="dock-manifest"><strong>{next ? 'Ready to resume' : 'All chapters explored'}</strong>{next && <><label>Saved reading position <span>{percent}%</span><progress max="100" value={percent} /></label><small>Position in this chapter, not completion.</small></>}<button onClick={onReturn}>Return to the flight →</button></div>
  </div>;
}
