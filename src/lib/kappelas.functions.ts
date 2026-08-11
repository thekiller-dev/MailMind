import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const connectionFields =
  "id,user_id,chat_id,kappelas_user_id,username,display_name,status,link_token_expires_at,linked_at,urgent_alerts,phishing_alerts,summary_alerts,summary_digest,command_access,last_seen_at,created_at,updated_at";

export type KappelasConnection = {
  id: string;
  user_id: string;
  chat_id: number | null;
  kappelas_user_id: string | null;
  username: string | null;
  display_name: string | null;
  status: string;
  link_token_expires_at: string | null;
  linked_at: string | null;
  urgent_alerts: boolean;
  phishing_alerts: boolean;
  summary_alerts: boolean;
  summary_digest: boolean;
  command_access: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getKappelasConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await getAdmin();
    const { data, error } = await supabaseAdmin
      .from("kappelas_connections")
      .select(connectionFields)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data as KappelasConnection | null;
  });

export const createKappelasLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isKappelasConfigured, buildKappelasBotLink, getKappelasBotUsername } =
      await import("./kappelas.server");
    if (!isKappelasConfigured() || !getKappelasBotUsername()) {
      throw new Error("Kappelas n'est pas encore configuré.");
    }

    const supabaseAdmin = await getAdmin();
    const { assertProMessaging } = await import("./plan.server");
    await assertProMessaging(supabaseAdmin, context.userId);

    const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin.from("kappelas_connections").upsert(
      {
        user_id: context.userId,
        chat_id: null,
        kappelas_user_id: null,
        username: null,
        display_name: null,
        status: "pending",
        link_token_hash: tokenHash,
        link_token_expires_at: expiresAt,
        linked_at: null,
        last_seen_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;

    const botLink = buildKappelasBotLink(token);
    return {
      token,
      botLink,
      prefill: `LIEN ${token}`,
      expiresAt,
    };
  });

export const updateKappelasPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        urgentAlerts: z.boolean().optional(),
        phishingAlerts: z.boolean().optional(),
        summaryAlerts: z.boolean().optional(),
        summaryDigest: z.boolean().optional(),
        commandAccess: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await getAdmin();
    const update = {
      ...(data.urgentAlerts === undefined ? {} : { urgent_alerts: data.urgentAlerts }),
      ...(data.phishingAlerts === undefined ? {} : { phishing_alerts: data.phishingAlerts }),
      ...(data.summaryAlerts === undefined ? {} : { summary_alerts: data.summaryAlerts }),
      ...(data.summaryDigest === undefined ? {} : { summary_digest: data.summaryDigest }),
      ...(data.commandAccess === undefined ? {} : { command_access: data.commandAccess }),
      updated_at: new Date().toISOString(),
    };
    const { data: connection, error } = await supabaseAdmin
      .from("kappelas_connections")
      .update(update)
      .eq("user_id", context.userId)
      .select(connectionFields)
      .single();
    if (error) throw error;
    return connection as KappelasConnection;
  });

export const unlinkKappelas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from("kappelas_connections")
      .update({
        chat_id: null,
        kappelas_user_id: null,
        username: null,
        display_name: null,
        status: "revoked",
        link_token_hash: null,
        link_token_expires_at: null,
        linked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
