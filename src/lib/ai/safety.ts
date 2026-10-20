export const MEDICAL_DISCLAIMER =
  "⚠️ I am an AI assistant and not a substitute for a licensed clinician. " +
  "Always consult a qualified healthcare professional for medical decisions.";

const RED_FLAG_TERMS = [
  "chest pain",
  "chest tightness",
  "shortness of breath",
  "difficulty breathing",
  "dyspnea",
  "suicidal",
  "suicide",
  "self harm",
  "self-harm",
  "syncope",
  "fainted",
  "unconscious",
  "severe headache",
  "worst headache",
  "anaphylaxis",
  "anaphylactic",
  "allergic reaction",
  "stroke",
  "heart attack",
  "crushing pain",
];

export function containsRedFlags(text: string): boolean {
  const lowerText = text.toLowerCase();
  return RED_FLAG_TERMS.some((term) => lowerText.includes(term));
}

export function applyRedFlagOverride<T extends { urgency?: string; safetyOverride?: boolean }>(
  result: T,
  symptoms: string
): T {
  if (containsRedFlags(symptoms)) {
    return {
      ...result,
      urgency: "emergency",
      safetyOverride: true,
    };
  }
  return result;
}

export const REFUSAL_TEMPLATES = {
  definiteDiagnosis: "I cannot provide a definitive diagnosis. Please consult your doctor.",
  drugInteraction:
    "For drug interaction information, please consult your pharmacist or prescribing physician.",
  pediatricDosing:
    "Pediatric dosing requires supervision by a licensed healthcare provider.",
};
