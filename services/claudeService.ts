import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { SimulationResponse, ExtractedImage } from "../types";

const CASE_MODEL = "claude-opus-4-7";
const TURN_MODEL = "claude-sonnet-4-6";

const getClient = (apiKey: string) =>
  new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

const VitalsSchema = z.object({
  hr: z.number(),
  bpSystolic: z.number(),
  bpDiastolic: z.number(),
  rr: z.number(),
  o2: z.number(),
  temp: z.number(),
  rhythm: z.string(),
});

const InitialCaseSchema = z.object({
  intro: z.string(),
  vitals: VitalsSchema,
  context: z.string(),
  learningPoints: z.array(z.string()),
  diagnosis: z.string(),
  visualCatalog: z.array(z.object({ id: z.string(), label: z.string() })),
});

const SimulationResponseSchema = z.object({
  narrative: z.string(),
  updatedVitals: VitalsSchema,
  isCaseOver: z.boolean(),
  imageIdToDisplay: z.string().nullable().optional(),
  debriefData: z
    .object({
      outcome: z.string(),
      score: z.number(),
      summary: z.string(),
      performanceBreakdown: z.object({
        historyDataCollection: z.number(),
        differentialDiagnosis: z.number(),
        medicalManagement: z.number(),
        communicationEfficiency: z.number(),
      }),
      criticalEvents: z.array(
        z.object({
          event: z.string(),
          userAction: z.string(),
          optimalAction: z.string(),
          feedback: z.string(),
          type: z.enum(["positive", "negative", "neutral"]),
        })
      ),
      missedOpportunities: z.array(z.string()),
      cmeLearningPoints: z.array(z.string()),
    })
    .nullable()
    .optional(),
});

const vitalsJsonSchema = {
  type: "object",
  properties: {
    hr: { type: "number" },
    bpSystolic: { type: "number" },
    bpDiastolic: { type: "number" },
    rr: { type: "number" },
    o2: { type: "number" },
    temp: { type: "number" },
    rhythm: { type: "string" },
  },
  required: ["hr", "bpSystolic", "bpDiastolic", "rr", "o2", "temp", "rhythm"],
  additionalProperties: false,
} as const;

const initialCaseJsonSchema = {
  type: "object",
  properties: {
    intro: { type: "string" },
    vitals: vitalsJsonSchema,
    context: { type: "string" },
    learningPoints: { type: "array", items: { type: "string" } },
    diagnosis: { type: "string" },
    visualCatalog: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
        },
        required: ["id", "label"],
        additionalProperties: false,
      },
    },
  },
  required: ["intro", "vitals", "context", "learningPoints", "diagnosis", "visualCatalog"],
  additionalProperties: false,
};

const simulationResponseJsonSchema = {
  type: "object",
  properties: {
    narrative: { type: "string" },
    updatedVitals: vitalsJsonSchema,
    isCaseOver: { type: "boolean" },
    imageIdToDisplay: { type: ["string", "null"] },
    debriefData: {
      type: ["object", "null"],
      properties: {
        outcome: { type: "string" },
        score: { type: "number" },
        summary: { type: "string" },
        performanceBreakdown: {
          type: "object",
          properties: {
            historyDataCollection: { type: "number" },
            differentialDiagnosis: { type: "number" },
            medicalManagement: { type: "number" },
            communicationEfficiency: { type: "number" },
          },
          required: [
            "historyDataCollection",
            "differentialDiagnosis",
            "medicalManagement",
            "communicationEfficiency",
          ],
          additionalProperties: false,
        },
        criticalEvents: {
          type: "array",
          items: {
            type: "object",
            properties: {
              event: { type: "string" },
              userAction: { type: "string" },
              optimalAction: { type: "string" },
              feedback: { type: "string" },
              type: { type: "string", enum: ["positive", "negative", "neutral"] },
            },
            required: ["event", "userAction", "optimalAction", "feedback", "type"],
            additionalProperties: false,
          },
        },
        missedOpportunities: { type: "array", items: { type: "string" } },
        cmeLearningPoints: { type: "array", items: { type: "string" } },
      },
      required: [
        "outcome",
        "score",
        "summary",
        "performanceBreakdown",
        "criticalEvents",
        "missedOpportunities",
        "cmeLearningPoints",
      ],
      additionalProperties: false,
    },
  },
  required: ["narrative", "updatedVitals", "isCaseOver"],
  additionalProperties: false,
};

const CASE_ARCHITECT_SYSTEM = `You are a Clinical Simulation Architect.
Your goal is to transform a medical document into a high-fidelity, difficult ER simulation.

CRITICAL RULES:
1. NEVER reveal the diagnosis in the 'intro' or initial bedside report.
2. The 'intro' MUST be a bedside scene with character dialogue (Nurse:, Patient:, etc.).
3. The 'rhythm' field must be one of: "Sinus Rhythm", "Sinus Tachycardia", "Sinus Bradycardia", "Peaked T-Waves", "ST Elevation", "Atrial Fibrillation".
4. NO SPOILERS: If the case involves Addison's, don't mention "low cortisol" or "adrenal" in the intro.
5. The 'context' field is internal clinical truth (the hidden diagnosis with reasoning) used by the simulation engine — be thorough here, it won't be shown to the trainee.
6. Map each extracted image to a clinical finding by its zero-indexed string id.`;

const SIM_ENGINE_SYSTEM = `You are the Bedside Simulation Engine.

STRICT RULES FOR NARRATIVE:
1. USE FIRST-PERSON DIALOGUE: "Nurse:", "Patient:", "Consultant:" etc.
2. STRICT ANTI-SPOILER: DO NOT GIVE CLUES. If a user orders a vague test, the Nurse questions it. If it's a "Cortisol stress test", the Nurse says: "The lab is calling, they need to know if you mean a random cortisol or a stimulation test? We don't have a 'stress test' listed."
3. NO CONFIRMATORY FEEDBACK: Even if they order the right thing, don't say "Good idea." Just say "Ordered."
4. TELEMETRY: 'updatedVitals.rhythm' must reflect pathophysiology. Use one of: "Sinus Rhythm", "Sinus Tachycardia", "Sinus Bradycardia", "Peaked T-Waves", "ST Elevation", "Atrial Fibrillation", "Ventricular Tachycardia", "Ventricular Fibrillation".
5. Set 'imageIdToDisplay' only when an action explicitly produces a finding mapped in the visual catalog. Use the exact id string from the catalog, or null.
6. Set 'isCaseOver' to true and populate 'debriefData' only when the case has reached a natural endpoint (patient stabilized, transferred, or died). Otherwise leave 'debriefData' null.`;

function extractJsonText(message: Anthropic.Messages.Message): string {
  for (const block of message.content) {
    if (block.type === "text") return block.text;
  }
  throw new Error("Claude response contained no text block");
}

export const analyzePDFAndStartCase = async (
  apiKey: string,
  pdfBase64: string,
  extractedImages: string[]
): Promise<{
  intro: string;
  vitals: z.infer<typeof VitalsSchema>;
  context: string;
  learningPoints: string[];
  diagnosis: string;
  visualCatalog: ExtractedImage[];
}> => {
  const client = getClient(apiKey);

  const userPrompt = `Analyze the attached PDF guideline and build a difficult ER simulation case based on it.

We extracted ${extractedImages.length} image(s) from the PDF, addressable by zero-indexed string id ("0", "1", ...). For each clinically meaningful image, add an entry to 'visualCatalog' with the id and a concise label (e.g., "Initial EKG", "Chest X-Ray", "Skin Lesion"). Leave out images that are not clinically relevant.

The 'intro' MUST be a scripted bedside scene, e.g.:
  Nurse: "Doctor, glad you're here. This is Bed 4..."
  Patient: "(Weakly) I... I don't feel right..."

Do not name or hint at the diagnosis in 'intro'. Put the clinical truth and reasoning in 'context' — that field is for the simulation engine, not the trainee.`;

  const response = await client.messages.create({
    model: CASE_MODEL,
    max_tokens: 8000,
    system: CASE_ARCHITECT_SYSTEM,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: initialCaseJsonSchema },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          { type: "text", text: userPrompt },
        ],
      },
    ],
  });

  const text = extractJsonText(response);
  const parsed = InitialCaseSchema.parse(JSON.parse(text));

  const finalVisuals: ExtractedImage[] = parsed.visualCatalog
    .map((item) => ({
      id: item.id,
      label: item.label,
      data: extractedImages[parseInt(item.id, 10)] || "",
    }))
    .filter((v) => v.data !== "");

  return { ...parsed, visualCatalog: finalVisuals };
};

const simulationTool: Anthropic.Messages.Tool = {
  name: "simulation_response",
  description: "Submit the simulation response with narrative, updated vitals, and case state.",
  input_schema: simulationResponseJsonSchema as Anthropic.Messages.Tool.InputSchema,
};

export const progressSimulation = async (
  apiKey: string,
  context: string,
  history: string[],
  userAction: string,
  visuals: ExtractedImage[],
  onNarrativeUpdate?: (text: string) => void
): Promise<SimulationResponse> => {
  const client = getClient(apiKey);

  const visualInventory = visuals.length
    ? visuals.map((v) => `id "${v.id}": ${v.label}`).join("\n")
    : "(no visual catalog for this case)";

  const cachedCaseContext = `CLINICAL TRUTH (hidden from trainee, drives the simulation):
${context}

VISUAL CATALOG (only these ids may be returned in imageIdToDisplay):
${visualInventory}`;

  const recentHistory = history.slice(-10).join("\n");
  const turnPrompt = `Recent simulation history:
${recentHistory || "(no prior turns)"}

Trainee action this turn:
${userAction}

Respond by calling the simulation_response tool.`;

  const stream = client.messages.stream({
    model: TURN_MODEL,
    max_tokens: 4000,
    system: [
      { type: "text", text: SIM_ENGINE_SYSTEM },
      {
        type: "text",
        text: cachedCaseContext,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: { effort: "medium" },
    tools: [simulationTool],
    tool_choice: { type: "tool", name: "simulation_response" },
    messages: [{ role: "user", content: turnPrompt }],
  });

  if (onNarrativeUpdate) {
    let lastNarrative = "";
    stream.on("inputJson", (_delta, snapshot) => {
      if (snapshot && typeof snapshot === "object") {
        const s = snapshot as Record<string, unknown>;
        if (typeof s.narrative === "string" && s.narrative !== lastNarrative) {
          lastNarrative = s.narrative;
          onNarrativeUpdate(s.narrative);
        }
      }
    });
  }

  const finalMsg = await stream.finalMessage();

  const toolBlock = finalMsg.content.find(
    (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolBlock) throw new Error("Claude response contained no tool_use block");

  const parsed = SimulationResponseSchema.parse(toolBlock.input);

  let validImageId: string | undefined;
  if (parsed.imageIdToDisplay && visuals.some((v) => v.id === parsed.imageIdToDisplay)) {
    validImageId = parsed.imageIdToDisplay;
  }

  return {
    narrative: parsed.narrative,
    updatedVitals: parsed.updatedVitals,
    isCaseOver: parsed.isCaseOver,
    imageIdToDisplay: validImageId,
    debriefData: parsed.debriefData ?? undefined,
  };
};
