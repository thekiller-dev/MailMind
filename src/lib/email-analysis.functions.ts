import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { analyzeEmailContent } from "./email-analysis.server";
import { areAiRepliesEnabled } from "./analysis-settings";

// Auth-guarded RPC boundary around the shared analysis logic in email-analysis.server.ts.
// The schema/prompt/model live there so there is a single source of truth.
const InputSchema = z.object({
  sender: z.string().min(1).max(200),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(8000),
});

async function getAiContext(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_settings")
    .select("settings")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    settings: data?.settings,
    source: "rpc" as const,
    supabase: supabaseAdmin,
    userId,
  };
}

export const analyzeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ context, data }) =>
    analyzeEmailContent(data, await getAiContext(context.userId)),
  );

export const generateEmailReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { generateEmailReply: generate } = await import("./email-analysis.server");
    const aiContext = await getAiContext(context.userId);
    if (!areAiRepliesEnabled(aiContext.settings)) {
      throw new Error("Les réponses IA sont désactivées dans vos réglages.");
    }
    return { text: await generate(data, aiContext) };
  });
