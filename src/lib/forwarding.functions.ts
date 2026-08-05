import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? "mailmind.me";

function createAlias(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `mm_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function publicInbox(account: {
  id: string;
  email: string;
  status: string;
  inbound_alias: string | null;
  forwarding_confirmation_code: string | null;
  forwarding_confirmation_url: string | null;
  last_forwarded_at: string | null;
}) {
  return {
    id: account.id,
    sourceEmail: account.email,
    status: account.status,
    address: account.inbound_alias ? `${account.inbound_alias}@${INBOUND_DOMAIN}` : null,
    confirmationCode: account.forwarding_confirmation_code,
    confirmationUrl: account.forwarding_confirmation_url,
    lastForwardedAt: account.last_forwarded_at,
  };
}

export const getForwardingInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("email_accounts")
      .select(
        "id,email,status,inbound_alias,forwarding_confirmation_code,forwarding_confirmation_url,last_forwarded_at",
      )
      .eq("user_id", context.userId)
      .eq("provider", "forwarding")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(publicInbox);
  });

export const createForwardingInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ sourceEmail: z.string().trim().toLowerCase().email() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("email_accounts")
      .select(
        "id,email,status,inbound_alias,forwarding_confirmation_code,forwarding_confirmation_url,last_forwarded_at",
      )
      .eq("user_id", context.userId)
      .eq("provider", "forwarding")
      .eq("email", data.sourceEmail)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return publicInbox(existing);

    const { assertCanAddEmailAccount } = await import("./plan.server");
    await assertCanAddEmailAccount(supabaseAdmin, context.userId);

    const alias = createAlias();
    const { data: created, error } = await supabaseAdmin
      .from("email_accounts")
      .insert({
        user_id: context.userId,
        provider: "forwarding",
        provider_account_id: alias,
        email: data.sourceEmail,
        display_name: "Transfert Gmail",
        inbound_alias: alias,
        status: "awaiting_confirmation",
      })
      .select(
        "id,email,status,inbound_alias,forwarding_confirmation_code,forwarding_confirmation_url,last_forwarded_at",
      )
      .single();
    if (error) throw error;
    return publicInbox(created);
  });
