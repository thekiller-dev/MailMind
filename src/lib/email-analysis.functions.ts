import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { analyzeEmailContent } from "./email-analysis.server";

// Auth-guarded RPC boundary around the shared analysis logic in email-analysis.server.ts.
// The schema/prompt/model live there so there is a single source of truth.
const InputSchema = z.object({
  sender: z.string().min(1).max(200),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(8000),
});

export const analyzeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => analyzeEmailContent(data));

export const generateEmailReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const { generateEmailReply: generate } = await import("./email-analysis.server");
    return { text: await generate(data) };
  });
