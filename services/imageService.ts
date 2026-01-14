
import { GoogleGenAI } from "@google/genai";

const getAI = (apiKey: string) => new GoogleGenAI({ apiKey });

export const generateClinicalImage = async (apiKey: string, prompt: string): Promise<string> => {
  const ai = getAI(apiKey);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Professional medical-grade clinical finding image: ${prompt}. 
            High resolution, realistic, hospital monitor or paper printout style. 
            No text labels that reveal a diagnosis. Grayscale or medical color palette.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from Gemini");
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};
