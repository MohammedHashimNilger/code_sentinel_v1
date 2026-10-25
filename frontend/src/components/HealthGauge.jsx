import { getScoreColor } from "../utils/score.js";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const HealthGauge = ({ score }) => {
  const hasScore = score !== null && score !== undefined;
  const color = getScoreColor(score);
  const progress = hasScore ? (score / 100) * CIRCUMFERENCE : 0;

  return (
    <div className="relative w-36 h-36 shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#2A2F3A" strokeWidth="10" />
        {hasScore && (
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${CIRCUMFERENCE}`}
            className="transition-all duration-500"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold font-mono" style={{ color }}>
          {hasScore ? score : "—"}
        </span>
        <span className="text-muted text-xs mt-0.5">health score</span>
      </div>
    </div>
  );
};

export default HealthGauge;
