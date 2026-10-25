const SEVERITY_CONFIG = [
  { key: "critical", label: "Critical", color: "bg-critical", text: "text-critical" },
  { key: "high", label: "High", color: "bg-high", text: "text-high" },
  { key: "medium", label: "Medium", color: "bg-medium", text: "text-medium" },
  { key: "low", label: "Low", color: "bg-line", text: "text-muted" },
];

const SeverityBreakdown = ({ breakdown }) => {
  const total = breakdown.critical + breakdown.high + breakdown.medium + breakdown.low;

  return (
    <div>
      {total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden mb-4">
          {SEVERITY_CONFIG.map(
            (tier) =>
              breakdown[tier.key] > 0 && (
                <div
                  key={tier.key}
                  className={tier.color}
                  style={{ width: `${(breakdown[tier.key] / total) * 100}%` }}
                />
              )
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {SEVERITY_CONFIG.map((tier) => (
          <div key={tier.key} className="flex items-center justify-between text-sm">
            <span className="text-muted">{tier.label}</span>
            <span className={`font-mono ${tier.text}`}>{breakdown[tier.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeverityBreakdown;
