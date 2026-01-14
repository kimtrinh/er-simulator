
import { GoogleGenAI, Modality } from "@google/genai";

const getAI = (apiKey: string) => new GoogleGenAI({ apiKey });

// Custom decoding functions for raw PCM audio from Gemini
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const speakClinicalNarrative = async (apiKey: string, text: string, audioContext: AudioContext): Promise<void> => {
  const ai = getAI(apiKey);
  
  // Detect if there's a dialogue structure to use multi-speaker mode
  // This is a simplified heuristic: look for "Name: Dialogue"
  const lines = text.split('\n').filter(l => l.includes(':'));
  const isMultiSpeaker = lines.length >= 2;

  let prompt = text;
  let config: any = {
    responseModalities: [Modality.AUDIO],
  };

  if (isMultiSpeaker) {
    // Multi-speaker configuration for better immersion
    // We map generic roles to specific high-quality voices
    config.speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          {
            speaker: 'Staff',
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } // Professional, neutral
          },
          {
            speaker: 'Patient',
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } // More emotive
          }
        ]
      }
    };
    prompt = `TTS the following clinical simulation dialogue. Use 'Staff' voice for Narrator, Nurses, and Doctors. Use 'Patient' voice for the patient:
    ${text}`;
  } else {
    // Single speaker configuration
    config.speechConfig = {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: 'Kore' } // Clear and educational
      }
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config,
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    const audioBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (error) {
    console.error("TTS Generation Error:", error);
    throw error;
  }
};
