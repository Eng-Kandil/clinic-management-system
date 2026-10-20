import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("[AI] OPENAI_API_KEY not set — AI features will fail.");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
