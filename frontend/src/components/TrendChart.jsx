import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const TrendChart = ({ scans }) => {
  // scans arrive newest-first from the API (matches how the scan list is
  // most useful elsewhere) - a trend chart reads left-to-right as time
  // moving forward, so reverse it just for this view.
  const chartData = [...scans]
    .filter((scan) => scan.healthScore !== null && scan.healthScore !== undefined)
    .reverse()
    .map((scan) => ({
      date: new Date(scan.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: scan.healthScore,
    }));

  if (chartData.length < 2) {
    return (
      <p className="text-muted text-sm py-8 text-center">
        Not enough completed scans yet to show a trend.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#2A2F3A" vertical={false} />
        <XAxis dataKey="date" stroke="#9AA1AC" fontSize={12} tickLine={false} />
        <YAxis domain={[0, 100]} stroke="#9AA1AC" fontSize={12} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#1B1F27", border: "1px solid #2A2F3A", borderRadius: 6 }}
          labelStyle={{ color: "#E8EAED" }}
        />
        <Line type="monotone" dataKey="score" stroke="#D9A441" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TrendChart;
