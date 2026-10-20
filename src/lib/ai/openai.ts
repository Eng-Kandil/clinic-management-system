import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("[AI] OPENAI_API_KEY not set — AI features will fail.");
}

// The SDK throws at construction when the key is missing, which would crash
// `next build` while collecting page data. Use a placeholder so the app still
// builds/runs without AI; requests then fail with a 401 instead.
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "missing-openai-api-key",
});
