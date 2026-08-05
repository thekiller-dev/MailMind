import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getWhatsAppMetrics } from "@/lib/whatsapp-metrics.functions";

export function WhatsAppMetricsChart({ compact = false }: { compact?: boolean }) {
  const loadMetrics = useServerFn(getWhatsAppMetrics);
  const [metricDays, setMetricDays] = useState<7 | 30>(7);
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof loadMetrics>> | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  useEffect(() => {
    setMetricsLoading(true);
    void loadMetrics({ data: { days: metricDays } })
      .then(setMetrics)
      .catch(() => setMetrics(null))
      .finally(() => setMetricsLoading(false));
  }, [loadMetrics, metricDays]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Activité WhatsApp</p>
          <p className="mt-1 text-xs text-muted-foreground">Alertes, récaps, commandes et digest</p>
        </div>
        <div className="flex rounded-lg border border-border p-1">
          {([7, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setMetricDays(days)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                metricDays === days ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {days} j
            </button>
          ))}
        </div>
      </div>
      <div className={`mt-4 ${compact ? "h-48" : "h-56"}`}>
        {metricsLoading ? (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            Chargement des métriques…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={metrics?.days ?? []}
              margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                tickFormatter={(day: string) => day.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
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
              <Bar
                dataKey="urgent"
                name="Urgences"
                stackId="whatsapp"
                fill="#ef4444"
                radius={[3, 3, 0, 0]}
              />
              <Bar dataKey="phishing" name="Phishing" stackId="whatsapp" fill="#f59e0b" />
              <Bar dataKey="recap" name="Récaps" stackId="whatsapp" fill="#8b5cf6" />
              <Bar dataKey="digest" name="Digest" stackId="whatsapp" fill="#2563eb" />
              <Bar dataKey="command" name="Commandes" stackId="whatsapp" fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-2 text-right font-mono text-[10px] text-muted-foreground">
        {metrics?.total ?? 0} événements sur {metricDays} jours
      </p>
    </div>
  );
}
