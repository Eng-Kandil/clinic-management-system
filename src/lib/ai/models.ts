export const MODELS = {
  chat: "gpt-5.4-nano",
  reasoning: "gpt-4o",
  fast: "gpt-5.4-nano",
} as const;

export type ModelKey = keyof typeof MODELS;

// Price per 1K tokens (USD) — update when OpenAI changes pricing
export const PRICE_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
};

export function computeCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const prices = PRICE_PER_1K_TOKENS[model] ?? { input: 0.005, output: 0.015 };
  return (tokensIn / 1000) * prices.input + (tokensOut / 1000) * prices.output;
}
