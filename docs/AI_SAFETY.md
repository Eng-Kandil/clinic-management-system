# AI Safety

ClinicOS uses OpenAI for AI diagnosis hints, prescription drafts, SOAP report drafts, and patient chat. **No AI output is ever a final clinical decision.** Every AI surface renders the disclaimer exported from `src/lib/ai/safety.ts` as `MEDICAL_DISCLAIMER`.

## Models

Defined in `src/lib/ai/models.ts`:

| Alias | Model | Used for |
| --- | --- | --- |
| `MODELS.chat` | `gpt-4o-mini` | Patient/doctor chat assist |
| `MODELS.reasoning` | `gpt-4o` | Diagnosis hints, SOAP drafts |
| `MODELS.fast` | `gpt-4o-mini` | Lightweight summarization |

## Rate limits

Enforced by `assertWithinLimit(userId, feature)` in `src/lib/ai/rate-limit.ts`:

| Feature | Limit |
| --- | --- |
| `chat` | 30 / hour |
| `diagnosis` | 10 / day |
| `prescription-draft` | 50 / day |
| `report-draft` | 50 / day |
| _default fallback_ | 100 / hour |

Exceeding the limit throws `RateLimitExceededError` and the route returns HTTP `429`.

## Budget guard

`checkBudget()` in `src/lib/ai/telemetry.ts` sums month-to-date token spend against `OPENAI_MONTHLY_BUDGET_USD` (default `50`). When exceeded the route returns HTTP `503` with `{ error: "AI service unavailable" }` and `BudgetExceededError` is thrown internally.

## PHI redaction

`src/lib/ai/redact.ts` strips obvious PHI **before** sending to OpenAI:

- US SSNs (`XXX-XX-XXXX`)
- Phone numbers
- Email addresses
- Medical record numbers (`MRN: ...`)
- Dates of birth

`wrapUserInput(text)` redacts the text and wraps it in `<<USER INPUT START>> ... <<USER INPUT END>>` markers. The system prompt instructs the model to treat anything between the markers as untrusted data, mitigating prompt-injection.

## Red-flag override

`applyRedFlagOverride(result, userText)` in `src/lib/ai/safety.ts` scans for emergency terms (chest pain, suicide, stroke, severe bleeding, etc.). On a hit it forces the response to `urgency: "emergency"` and sets `safetyOverride: true` regardless of what the model returned. The UI shows a prominent "Seek emergency care now" banner.

## Telemetry

After every successful AI call, `writeUsage({ userId, feature, model, tokensIn, tokensOut, latencyMs })` records usage. This feeds the budget guard and provides audit evidence for clinical review.

## What AI does NOT do

- It does not auto-prescribe. Drafts are saved as `status: "draft"` and require a doctor's explicit sign-off.
- It does not auto-diagnose. The diagnosis route returns suggestions ranked by confidence; the doctor must enter the final assessment.
- It does not see patient identifiers — all input goes through `wrapUserInput()`.
