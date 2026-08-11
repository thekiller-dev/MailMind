import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserPlan } from "./plan.server";
import { isOpenWaConfigured } from "./openwa.server";
import { isKappelasConfigured } from "./kappelas.server";

export type ChannelNotifyDiagnostics = {
  plan: "free" | "pro";
  telegramBotConfigured: boolean;
  openWaConfigured: boolean;
  kappelasConfigured: boolean;
  telegram: {
    linked: boolean;
    urgentAlerts: boolean;
    phishingAlerts: boolean;
    summaryAlerts: boolean;
  };
  whatsapp: {
    linked: boolean;
    urgentAlerts: boolean;
    phishingAlerts: boolean;
    summaryAlerts: boolean;
  };
  kappelas: {
    linked: boolean;
    urgentAlerts: boolean;
    phishingAlerts: boolean;
    summaryAlerts: boolean;
  };
  /** Reasons that would block channel alerts right now. */
  blockers: string[];
};

export async function getChannelNotifyDiagnostics(
  supabase: SupabaseClient,
  userId: string,
): Promise<ChannelNotifyDiagnostics> {
  const plan = await getUserPlan(supabase, userId);
  const [{ data: telegram }, { data: whatsapp }, { data: kappelas }] = await Promise.all([
    supabase
      .from("telegram_connections")
      .select("chat_id,urgent_alerts,phishing_alerts,summary_alerts,status")
      .eq("user_id", userId)
      .eq("status", "linked")
      .maybeSingle(),
    supabase
      .from("whatsapp_connections")
      .select("chat_id,urgent_alerts,phishing_alerts,summary_alerts,status")
      .eq("user_id", userId)
      .eq("status", "linked")
      .maybeSingle(),
    supabase
      .from("kappelas_connections")
      .select("chat_id,urgent_alerts,phishing_alerts,summary_alerts,status")
      .eq("user_id", userId)
      .eq("status", "linked")
      .maybeSingle(),
  ]);

  const telegramBotConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
  const openWaConfigured = isOpenWaConfigured();
  const kappelasConfigured = isKappelasConfigured();

  const blockers: string[] = [];
  if (plan !== "pro") {
    blockers.push(
      "profiles.plan n'est pas « pro » — Telegram, WhatsApp et Kappelas sont coupés.",
    );
  }
  if (!telegram?.chat_id && !whatsapp?.chat_id && kappelas?.chat_id == null) {
    blockers.push("Aucun canal lié (Telegram / WhatsApp / Kappelas).");
  }
  if (telegram?.chat_id && !telegramBotConfigured) {
    blockers.push("TELEGRAM_BOT_TOKEN manquant sur ce runtime (Vercel pour sync Gmail).");
  }
  if (whatsapp?.chat_id && !openWaConfigured) {
    blockers.push("OPENWA_BASE_URL / OPENWA_API_KEY / OPENWA_SESSION_ID manquants sur ce runtime.");
  }
  if (kappelas?.chat_id != null && !kappelasConfigured) {
    blockers.push("KAPPELAS_BOT_TOKEN manquant sur ce runtime.");
  }

  return {
    plan,
    telegramBotConfigured,
    openWaConfigured,
    kappelasConfigured,
    telegram: {
      linked: Boolean(telegram?.chat_id),
      urgentAlerts: Boolean(telegram?.urgent_alerts),
      phishingAlerts: Boolean(telegram?.phishing_alerts),
      summaryAlerts: telegram?.summary_alerts !== false,
    },
    whatsapp: {
      linked: Boolean(whatsapp?.chat_id),
      urgentAlerts: Boolean(whatsapp?.urgent_alerts),
      phishingAlerts: Boolean(whatsapp?.phishing_alerts),
      summaryAlerts: whatsapp?.summary_alerts !== false,
    },
    kappelas: {
      linked: kappelas?.chat_id != null,
      urgentAlerts: Boolean(kappelas?.urgent_alerts),
      phishingAlerts: Boolean(kappelas?.phishing_alerts),
      summaryAlerts: kappelas?.summary_alerts !== false,
    },
    blockers,
  };
}
