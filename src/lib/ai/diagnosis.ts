import { openai } from "./openai";
import connectDB from "@/lib/db/connect";
import { Subscription } from "@/lib/db/models/Subscription";
import { Patient } from "@/lib/db/models/Patient";
import type { IDiagnosisResult } from "@/lib/db/models/AIDiagnosis";

// ── Subscription plan limits ─────────────────────────────────────────────────

const PLAN_LIMITS: Record<string, number> = {
  free: 0,
  basic: 5,
  premium: Infinity,
};

// ── Check subscription limits ────────────────────────────────────────────────

export interface SubscriptionCheckResult {
  allowed: boolean;
  plan: string;
  used: number;
  limit: number;
  message?: string;
}

export async function checkSubscriptionLimit(
  userId: string
): Promise<SubscriptionCheckResult> {
  await connectDB();

  // Look up the Patient document for this user
  const patient = await Patient.findOne({ userId }).select("_id").lean();

  // Find the user's active subscription via the Patient record
  const subscription = patient
    ? await Subscription.findOne({
        patientId: patient._id,
        isActive: true,
        endDate: { $gte: new Date() },
      })
        .sort({ endDate: -1 })
        .lean()
    : null;

  const plan = subscription?.plan ?? "free";
  const limit = PLAN_LIMITS[plan] ?? 0;

  if (limit === 0) {
    return {
      allowed: false,
      plan,
      used: 0,
      limit: 0,
      message:
        "AI diagnosis is not available on the free plan. Please upgrade to Basic or Premium.",
    };
  }

  // Count diagnoses this month for this user
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Import here to avoid circular deps at module level
  const { AIDiagnosisModel } = await import("@/lib/db/models/AIDiagnosis");

  const usedThisMonth = await AIDiagnosisModel.countDocuments({
    patientId: userId,
    createdAt: { $gte: monthStart },
  });

  if (limit !== Infinity && usedThisMonth >= limit) {
    return {
      allowed: false,
      plan,
      used: usedThisMonth,
      limit,
      message: `You have used all ${limit} AI diagnoses for this month. Upgrade to Premium for unlimited access.`,
    };
  }

  return {
    allowed: true,
    plan,
    used: usedThisMonth,
    limit: limit === Infinity ? -1 : limit, // -1 = unlimited
  };
}

// ── Mock diagnosis data ──────────────────────────────────────────────────────

const MOCK_CONDITIONS_DB: Record<
  string,
  { name: string; probability: number; description: string }[]
> = {
  headache: [
    {
      name: "Tension Headache",
      probability: 0.72,
      description:
        "A common headache characterized by dull, aching head pain and a sensation of tightness across the forehead. Often triggered by stress, poor posture, or eye strain.",
    },
    {
      name: "Migraine",
      probability: 0.45,
      description:
        "A neurological condition causing intense, throbbing headaches often on one side of the head, sometimes accompanied by nausea, light sensitivity, and visual disturbances.",
    },
    {
      name: "Sinusitis",
      probability: 0.28,
      description:
        "Inflammation of the sinuses causing pressure and pain in the forehead, cheeks, and around the eyes, often following a cold or allergies.",
    },
  ],
  fever: [
    {
      name: "Viral Infection",
      probability: 0.68,
      description:
        "A general viral infection causing elevated body temperature as the immune system responds. Common causes include influenza and upper respiratory infections.",
    },
    {
      name: "Bacterial Infection",
      probability: 0.35,
      description:
        "A bacterial pathogen triggering the body's immune response with fever. May require antibiotics and proper medical evaluation to identify the source.",
    },
  ],
  cough: [
    {
      name: "Upper Respiratory Infection",
      probability: 0.65,
      description:
        "An infection affecting the nose, throat, and airways. Usually viral and self-limiting, lasting 7-10 days with supportive care.",
    },
    {
      name: "Acute Bronchitis",
      probability: 0.4,
      description:
        "Inflammation of the bronchial tubes causing a persistent cough, often with mucus. Usually follows a cold or respiratory infection.",
    },
    {
      name: "Allergic Rhinitis",
      probability: 0.3,
      description:
        "An allergic reaction causing cough, sneezing, and nasal congestion triggered by environmental allergens such as pollen, dust, or pet dander.",
    },
  ],
  fatigue: [
    {
      name: "Iron Deficiency Anemia",
      probability: 0.42,
      description:
        "A condition where lack of iron leads to insufficient healthy red blood cells, causing persistent tiredness, weakness, and pale skin.",
    },
    {
      name: "Hypothyroidism",
      probability: 0.3,
      description:
        "An underactive thyroid gland that doesn't produce enough hormones, leading to fatigue, weight gain, and cold sensitivity.",
    },
    {
      name: "Chronic Fatigue Syndrome",
      probability: 0.2,
      description:
        "A complex disorder characterized by extreme fatigue that doesn't improve with rest and may worsen with physical or mental activity.",
    },
  ],
  nausea: [
    {
      name: "Gastroenteritis",
      probability: 0.6,
      description:
        "Inflammation of the stomach and intestines, commonly caused by viral or bacterial infection, leading to nausea, vomiting, and diarrhea.",
    },
    {
      name: "Gastroesophageal Reflux (GERD)",
      probability: 0.35,
      description:
        "A chronic digestive condition where stomach acid flows back into the esophagus, causing nausea, heartburn, and discomfort.",
    },
  ],
  "chest pain": [
    {
      name: "Costochondritis",
      probability: 0.5,
      description:
        "Inflammation of the cartilage connecting the ribs to the breastbone, causing sharp chest pain that may mimic heart-related conditions.",
    },
    {
      name: "Acid Reflux (GERD)",
      probability: 0.4,
      description:
        "Stomach acid flowing back into the esophagus can cause burning chest pain often mistaken for cardiac issues.",
    },
    {
      name: "Angina Pectoris",
      probability: 0.25,
      description:
        "Chest pain caused by reduced blood flow to the heart muscle. Requires prompt medical evaluation to rule out serious cardiac conditions.",
    },
  ],
  "sore throat": [
    {
      name: "Pharyngitis",
      probability: 0.7,
      description:
        "Inflammation of the pharynx causing sore throat, pain when swallowing, and sometimes fever. Most cases are viral.",
    },
    {
      name: "Streptococcal Infection",
      probability: 0.35,
      description:
        "A bacterial infection caused by Group A Streptococcus resulting in severe sore throat, fever, and swollen lymph nodes. Requires antibiotic treatment.",
    },
  ],
  "shortness of breath": [
    {
      name: "Asthma",
      probability: 0.55,
      description:
        "A chronic condition where airways narrow and swell, producing extra mucus, making breathing difficult. Often triggered by exercise, allergens, or cold air.",
    },
    {
      name: "Anxiety/Panic Disorder",
      probability: 0.4,
      description:
        "Acute anxiety can trigger hyperventilation and a subjective feeling of breathlessness without an underlying pulmonary cause.",
    },
  ],
};

function generateMockDiagnosis(
  symptoms: string[],
  additionalInfo?: string,
  patientAge?: number
): IDiagnosisResult {
  // Gather conditions based on symptoms
  const allConditions: { name: string; probability: number; description: string }[] = [];
  const seen = new Set<string>();

  for (const symptom of symptoms) {
    const key = symptom.toLowerCase().trim();
    const matches = MOCK_CONDITIONS_DB[key];
    if (matches) {
      for (const c of matches) {
        if (!seen.has(c.name)) {
          seen.add(c.name);
          allConditions.push({ ...c });
        }
      }
    }
  }

  // If no specific matches, provide generic conditions
  if (allConditions.length === 0) {
    allConditions.push(
      {
        name: "Viral Infection",
        probability: 0.55,
        description:
          "A general viral infection that could explain the reported symptoms. Most viral infections are self-limiting.",
      },
      {
        name: "Stress-Related Symptoms",
        probability: 0.35,
        description:
          "Physical symptoms manifested from psychological stress or anxiety. Can affect multiple body systems.",
      },
      {
        name: "Nutritional Deficiency",
        probability: 0.2,
        description:
          "Inadequate intake of essential vitamins or minerals, which can cause a wide range of symptoms.",
      }
    );
  }

  // Adjust probabilities slightly based on additional info length / age
  if (additionalInfo && additionalInfo.length > 50) {
    allConditions.forEach((c) => {
      c.probability = Math.min(1, c.probability + 0.03);
    });
  }
  if (patientAge && patientAge > 60) {
    allConditions.forEach((c) => {
      c.probability = Math.min(1, c.probability + 0.05);
    });
  }

  // Sort by probability descending
  allConditions.sort((a, b) => b.probability - a.probability);

  // Determine urgency
  const hasEmergencySymptom = symptoms.some((s) => {
    const lower = s.toLowerCase();
    return (
      lower.includes("chest pain") ||
      lower.includes("difficulty breathing") ||
      lower.includes("severe bleeding") ||
      lower.includes("unconscious")
    );
  });

  const maxProb = allConditions[0]?.probability ?? 0;
  let urgencyLevel: IDiagnosisResult["urgencyLevel"] = "low";
  if (hasEmergencySymptom) urgencyLevel = "emergency";
  else if (maxProb > 0.7 || symptoms.length >= 5) urgencyLevel = "high";
  else if (maxProb > 0.45 || symptoms.length >= 3) urgencyLevel = "medium";

  // Recommendations based on urgency
  const recommendations: string[] = [];
  if (urgencyLevel === "emergency") {
    recommendations.push(
      "Seek immediate emergency medical attention or call emergency services.",
      "Do not delay — these symptoms require urgent evaluation.",
      "If possible, have someone accompany you to the emergency room."
    );
  } else if (urgencyLevel === "high") {
    recommendations.push(
      "Schedule an appointment with your doctor within the next 24-48 hours.",
      "Monitor your symptoms closely and seek emergency care if they worsen.",
      "Keep a detailed log of when symptoms occur and their severity.",
      "Stay well hydrated and get adequate rest."
    );
  } else if (urgencyLevel === "medium") {
    recommendations.push(
      "Consider scheduling a medical appointment within the next week.",
      "Monitor symptoms and note any changes or patterns.",
      "Maintain adequate hydration and a balanced diet.",
      "Over-the-counter medications may help with symptom management — consult a pharmacist."
    );
  } else {
    recommendations.push(
      "Continue monitoring your symptoms over the next few days.",
      "Ensure adequate rest, hydration, and balanced nutrition.",
      "If symptoms persist beyond 7 days or worsen, schedule a medical appointment.",
      "Practice good hygiene to prevent spreading potential infections."
    );
  }

  return {
    conditions: allConditions.slice(0, 5),
    recommendations,
    urgencyLevel,
    disclaimer:
      "This AI-generated analysis is for informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for proper medical evaluation. If you are experiencing a medical emergency, call emergency services immediately.",
  };
}

// ── Analyze symptoms with AI ─────────────────────────────────────────────────

export async function analyzeSymptomsWithAI(
  symptoms: string[],
  additionalInfo?: string,
  patientAge?: number,
  patientGender?: string
): Promise<IDiagnosisResult> {

  const systemPrompt = `You are a medical symptom analysis assistant. Analyze the provided symptoms and return a structured JSON diagnosis.

IMPORTANT RULES:
- You are NOT a doctor and this is NOT a medical diagnosis
- Provide possible conditions with probability estimates
- Always include a medical disclaimer
- Be conservative with probabilities
- Consider patient demographics when provided
- Return ONLY valid JSON matching the exact schema below

JSON SCHEMA:
{
  "conditions": [
    {
      "name": "Condition Name",
      "probability": 0.0 to 1.0,
      "description": "Brief description of the condition and how it relates to the symptoms"
    }
  ],
  "recommendations": ["Array of actionable recommendations"],
  "urgencyLevel": "low" | "medium" | "high" | "emergency",
  "disclaimer": "Medical disclaimer text"
}

URGENCY GUIDELINES:
- "emergency": Symptoms suggesting life-threatening conditions (chest pain + shortness of breath, severe bleeding, loss of consciousness)
- "high": Symptoms that need prompt medical attention within 24-48 hours
- "medium": Symptoms that should be evaluated by a doctor within a week
- "low": Mild symptoms that can be monitored at home

Return 2-5 conditions sorted by probability (highest first). Probabilities should sum to no more than 1.5.`;

  const userMessage = [
    `SYMPTOMS: ${symptoms.join(", ")}`,
    additionalInfo ? `ADDITIONAL INFORMATION: ${additionalInfo}` : "",
    patientAge ? `PATIENT AGE: ${patientAge}` : "",
    patientGender ? `PATIENT GENDER: ${patientGender}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-nano",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    max_completion_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response received from AI");
  }

  const parsed = JSON.parse(content) as IDiagnosisResult;

  // Validate structure
  if (!parsed.conditions || !Array.isArray(parsed.conditions)) {
    throw new Error("Invalid AI response structure");
  }

  // Ensure disclaimer is present
  if (!parsed.disclaimer) {
    parsed.disclaimer =
      "This AI-generated analysis is for informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for proper medical evaluation.";
  }

  return parsed;
}
