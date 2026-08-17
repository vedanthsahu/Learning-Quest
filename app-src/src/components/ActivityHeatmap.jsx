import { motion } from "framer-motion";

const WEEKS = 18;
const DAYS = WEEKS * 7;

function levelFor(seconds) {
  if (!seconds) return 0;
  const minutes = seconds / 60;
  if (minutes < 10) return 1;
  if (minutes < 25) return 2;
  if (minutes < 50) return 3;
  return 4;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

export default function ActivityHeatmap({ dailyLog }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (DAYS - 1));
  // align start to a Sunday so the grid reads like a real calendar
  const startDow = start.getDay();
  start.setDate(start.getDate() - startDow);

  const cells = [];
  for (let i = 0; i < DAYS + 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d > today) break;
    const key = toDateStr(d);
    const seconds = dailyLog[key]?.seconds || 0;
    cells.push({ date: d, key, seconds, level: levelFor(seconds), dow: d.getDay() });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="heatmap">
      <div className="heatmap-grid">
        {weeks.map((week, wi) => (
          <div className="heatmap-col" key={wi}>
            {week.map((cell) => (
              <motion.div
                key={cell.key}
                className={`heatmap-cell level-${cell.level}`}
                title={`${cell.key}: ${Math.round(cell.seconds / 60)} min${cell.seconds ? "" : " (no activity)"}`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`heatmap-cell level-${l}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
