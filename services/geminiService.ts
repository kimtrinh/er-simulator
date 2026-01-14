
import { GoogleGenAI, Type } from "@google/genai";
import { Vitals, SimulationResponse, ExtractedImage } from "../types";
import { generateClinicalImage } from "./imageService";

const getAI = (apiKey: string) => new GoogleGenAI({ apiKey });

const PRO_MODEL = "gemini-3-pro-preview"; 
const FLASH_MODEL = "gemini-3-flash-preview"; 

/**
 * Utility to robustly extract JSON from model responses that might contain markdown or conversational filler.
 */
function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return text.substring(start, end + 1);
  }
  return text.trim();
}

export const analyzePDFAndStartCase = async (
  apiKey: string,
  pdfBase64: string,
  extractedImages: string[]
): Promise<{ 
  intro: string; 
  vitals: Vitals; 
  context: string; 
  learningPoints: string[]; 
  diagnosis: string;
  visualCatalog: ExtractedImage[];
}> => {
  const ai = getAI(apiKey);
  
  const systemInstruction = `You are a Clinical Simulation Architect. 
  Your goal is to transform a medical document into a high-fidelity, difficult ER simulation. 
  
  CRITICAL RULES:
  1. NEVER reveal the diagnosis in the 'intro' or initial bedside report.
  2. The 'intro' MUST be a bedside scene with character dialogue.
  3. The 'rhythm' in vitals must be one of: "Sinus Rhythm", "Sinus Tachycardia", "Sinus Bradycardia", "Peaked T-Waves", "ST Elevation", "Atrial Fibrillation".
  4. NO SPOILERS: If the case involves Addison's, don't mention "low cortisol" or "adrenal" in the intro.
  5. OUTPUT VALID JSON ONLY. Escape all double quotes inside strings.`;

  const prompt = `
    Analyze the attached PDF. Create a simulation case.
    
    We have ${extractedImages.length} images. Map them to findings.
    
    The 'intro' MUST be written as a scene:
    Nurse: "Doctor, glad you're here. This is Bed 4..."
    Patient: "(Weakly) I... I don't feel right..."

    OUTPUT FORMAT:
    {
      "intro": "Bedside dialogue...",
      "vitals": { "hr": 90, "bpSystolic": 120, "bpDiastolic": 80, "rr": 16, "o2": 98, "temp": 37.0, "rhythm": "Sinus Rhythm" },
      "context": "Secret clinical truth and image mapping.",
      "learningPoints": ["..."],
      "diagnosis": "The hidden diagnosis",
      "visualCatalog": [ { "id": "0", "label": "Initial EKG" } ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
          { text: prompt },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intro: { type: Type.STRING },
            vitals: {
              type: Type.OBJECT,
              properties: {
                hr: { type: Type.NUMBER },
                bpSystolic: { type: Type.NUMBER },
                bpDiastolic: { type: Type.NUMBER },
                rr: { type: Type.NUMBER },
                o2: { type: Type.NUMBER },
                temp: { type: Type.NUMBER },
                rhythm: { type: Type.STRING },
              },
              required: ["hr", "bpSystolic", "bpDiastolic", "rr", "o2", "temp", "rhythm"],
            },
            context: { type: Type.STRING },
            learningPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            diagnosis: { type: Type.STRING },
            visualCatalog: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                },
                required: ["id", "label"],
              }
            }
          },
        },
      },
    });

    const cleanText = extractJson(response.text);
    const result = JSON.parse(cleanText);
    
    const finalVisuals: ExtractedImage[] = (result.visualCatalog || []).map((item: any) => ({
      ...item,
      data: extractedImages[parseInt(item.id)] || ""
    })).filter((v: any) => v.data !== "");

    return { ...result, visualCatalog: finalVisuals };
  } catch (error) {
    console.error("Error starting case:", error);
    throw error;
  }
};

export const progressSimulation = async (
  apiKey: string,
  context: string,
  history: string[],
  userAction: string,
  visuals: ExtractedImage[]
): Promise<SimulationResponse> => {
  const ai = getAI(apiKey);
  
  const systemInstruction = `You are the Bedside Simulation Engine. 
  
  STRICT RULES FOR NARRATIVE:
  1. USE FIRST-PERSON DIALOGUE: Use "Nurse:", "Patient:", "Consultant:" etc.
  2. STRICT ANTI-SPOILER: DO NOT GIVE CLUES. If a user orders a vague test, the Nurse MUST question it. If it's a "Cortisol stress test", the Nurse says: "The lab is calling, they need to know if you mean a random cortisol or a stimulation test? We don't have a 'stress test' listed."
  3. NO CONFIRMATORY FEEDBACK: Even if they order the right thing, don't say "Good idea." Just say "Ordered."
  4. TELEMETRY: The 'rhythm' in updatedVitals must reflect pathophysiology. Use: "Sinus Rhythm", "Sinus Tachycardia", "Sinus Bradycardia", "Peaked T-Waves", "ST Elevation", "Atrial Fibrillation", "Ventricular Tachycardia", "Ventricular Fibrillation".
  5. OUTPUT VALID JSON ONLY.`;

  const visualInventory = visuals.map(v => `ID ${v.id}: ${v.label}`).join(", ");
  
  const prompt = `
    CLINICAL TRUTH: ${context}
    HISTORY: ${history.slice(-5).join("\n")}
    USER ACTION: ${userAction}
    VISUALS: ${visualInventory}
    
    Respond with simulation update in JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
         responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            updatedVitals: {
              type: Type.OBJECT,
              properties: {
                hr: { type: Type.NUMBER },
                bpSystolic: { type: Type.NUMBER },
                bpDiastolic: { type: Type.NUMBER },
                rr: { type: Type.NUMBER },
                o2: { type: Type.NUMBER },
                temp: { type: Type.NUMBER },
                rhythm: { type: Type.STRING },
              },
              required: ["hr", "bpSystolic", "bpDiastolic", "rr", "o2", "temp", "rhythm"],
            },
            isCaseOver: { type: Type.BOOLEAN },
            imageIdToDisplay: { type: Type.STRING, nullable: true },
            debriefData: {
                type: Type.OBJECT,
                properties: {
                    outcome: { type: Type.STRING },
                    score: { type: Type.INTEGER },
                    summary: { type: Type.STRING },
                    performanceBreakdown: {
                        type: Type.OBJECT,
                        properties: {
                            historyDataCollection: { type: Type.INTEGER },
                            differentialDiagnosis: { type: Type.INTEGER },
                            medicalManagement: { type: Type.INTEGER },
                            communicationEfficiency: { type: Type.INTEGER },
                        }
                    },
                    criticalEvents: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                event: { type: Type.STRING },
                                userAction: { type: Type.STRING },
                                optimalAction: { type: Type.STRING },
                                feedback: { type: Type.STRING },
                                type: { type: Type.STRING }
                            }
                        }
                    },
                    missedOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    cmeLearningPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
          },
        },
      },
    });

    const cleanText = extractJson(response.text);
    const parsed = JSON.parse(cleanText);

    if (parsed.imageIdToDisplay && parsed.imageIdToDisplay.startsWith("GENERATE_")) {
        const genPrompt = parsed.imageIdToDisplay.split(":")[1] || "Clinical EKG tracing";
        const generatedUrl = await generateClinicalImage(apiKey, genPrompt);
        parsed._generatedImageUrl = generatedUrl;
    }

    return parsed;
  } catch (error) {
    console.error("Error progressing simulation:", error);
    throw error;
  }
};
