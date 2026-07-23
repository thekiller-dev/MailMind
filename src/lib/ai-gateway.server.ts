import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createAiProvider() {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL?.replace(/\/$/, "");
  if (!apiKey) throw new Error("Missing AI_API_KEY");
  if (!baseURL) throw new Error("Missing AI_BASE_URL");

  const authHeader = process.env.AI_AUTH_HEADER ?? "Authorization";
  const authPrefix = process.env.AI_AUTH_PREFIX ?? "Bearer";
  const authorization = authPrefix ? `${authPrefix} ${apiKey}` : apiKey;

  return createOpenAICompatible({
    name: "external-ai",
    baseURL,
    headers: {
      [authHeader]: authorization,
    },
  });
}
