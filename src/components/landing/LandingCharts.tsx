import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const heroFlowData = [
  { day: "Lun", messages: 42 },
  { day: "Mar", messages: 58 },
  { day: "Mer", messages: 49 },
  { day: "Jeu", messages: 78 },
  { day: "Ven", messages: 63 },
  { day: "Sam", messages: 70 },
  { day: "Dim", messages: 84 },
];

const heroCategoryData = [
  { name: "Finance", value: 42, color: "#60a5fa" },
  { name: "Collaboration", value: 31, color: "#42d392" },
  { name: "Sécurité", value: 12, color: "#f87171" },
  { name: "Autres", value: 15, color: "#737373" },
];

export function HeroFlowChart() {
  return (
    <div
      className="h-full w-full"
      role="img"
      aria-label="Messages reçus et analysés sur sept jours"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={heroFlowData} margin={{ top: 4, right: 2, left: -26, bottom: 0 }}>
          <defs>
            <linearGradient id="heroAreaFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tick={{ fill: "#737373", fontSize: 8 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            cursor={{ stroke: "#525252", strokeDasharray: "3 3" }}
            contentStyle={{
              background: "#0a0a0a",
              border: "1px solid #292929",
              borderRadius: 8,
              fontSize: 10,
            }}
            labelStyle={{ color: "#a3a3a3" }}
          />
          <Area
            type="monotone"
            dataKey="messages"
            stroke="#22d3ee"
            strokeWidth={2}
            fill="url(#heroAreaFill)"
            dot={{ r: 2, fill: "#22d3ee", strokeWidth: 0 }}
            activeDot={{ r: 4, fill: "#0a0a0a", stroke: "#22d3ee", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={1800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HeroCategoryChart() {
  return (
    <div className="h-full w-full" role="img" aria-label="Répartition des messages par catégorie">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={heroCategoryData}
            dataKey="value"
            nameKey="name"
            innerRadius={30}
            outerRadius={42}
            paddingAngle={3}
            stroke="none"
            isAnimationActive
            animationDuration={1400}
          >
            {heroCategoryData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#0a0a0a",
              border: "1px solid #292929",
              borderRadius: 8,
              fontSize: 10,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
