import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const metricTypes = ["urgent", "phishing", "digest", "recap", "received", "command"] as const;
type MetricType = (typeof metricTypes)[number];

function dayKey(value: string) {
  return value.slice(0, 10);
}

export const getWhatsAppMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ days: z.number().int().min(7).max(30).default(7) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("chat_id")
      .eq("user_id", context.userId)
      .eq("status", "linked")
      .maybeSingle();

    if (connectionError) throw connectionError;
    const end = new Date();
    const start = new Date(end.getTime() - data.days * 86_400_000);
    const emptyDays = Array.from({ length: data.days }, (_, index) => {
      const date = new Date(start.getTime() + index * 86_400_000);
      return {
        day: date.toISOString().slice(0, 10),
        urgent: 0,
        phishing: 0,
        digest: 0,
        recap: 0,
        received: 0,
        command: 0,
      };
    });

    if (!connection?.chat_id) {
      return { days: emptyDays, total: 0 };
    }

    const { data: events, error: eventsError } = await supabaseAdmin
      .from("whatsapp_delivery_events")
      .select("event_type,created_at")
      .eq("chat_id", connection.chat_id)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    if (eventsError) throw eventsError;

    const byDay = new Map(emptyDays.map((item) => [item.day, item]));
    for (const event of events ?? []) {
      const item = byDay.get(dayKey(event.created_at));
      if (!item) continue;
      const type = event.event_type as MetricType;
      if (metricTypes.includes(type)) item[type] += 1;
    }

    return {
      days: emptyDays,
      total: (events ?? []).length,
    };
  });
