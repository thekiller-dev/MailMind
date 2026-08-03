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

const DASHBOARD_CATEGORY_COLORS = ["#60a5fa", "#42d392", "#f87171", "#a78bfa", "#737373"];

export function DashboardFlowChart({ data }: { data: { day: string; messages: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="dashboardFlow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          tick={{ fill: "#737373", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "#737373", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: "#0a0a0a",
            border: "1px solid #292929",
            borderRadius: 10,
            fontSize: 11,
          }}
        />
        <Area
          type="monotone"
          dataKey="messages"
          name="Messages"
          stroke="#22d3ee"
          strokeWidth={2.5}
          fill="url(#dashboardFlow)"
          dot={{ r: 3, fill: "#22d3ee", strokeWidth: 0 }}
          activeDot={{
            r: 5,
            fill: "#0a0a0a",
            stroke: "#22d3ee",
            strokeWidth: 2,
          }}
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DashboardDistributionChart({ data }: { data: { count: number; name: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          innerRadius={55}
          outerRadius={82}
          paddingAngle={3}
          stroke="none"
          animationDuration={1200}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={DASHBOARD_CATEGORY_COLORS[index % DASHBOARD_CATEGORY_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            fontSize: 11,
          }}
          labelStyle={{ color: "var(--foreground)" }}
          itemStyle={{ color: "var(--foreground)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
