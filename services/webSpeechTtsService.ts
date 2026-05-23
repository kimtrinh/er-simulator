/**
 * Browser-native TTS via Web Speech API. No external API, no API key required.
 * Detects "Speaker: dialogue" lines and alternates a Patient voice vs a Staff voice
 * when both are available on the platform.
 */

type VoicePick = { staff: SpeechSynthesisVoice | null; patient: SpeechSynthesisVoice | null };

let cachedPick: VoicePick | null = null;

function pickVoices(): VoicePick {
  if (cachedPick) return cachedPick;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return { staff: null, patient: null };

  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;

  const findByHint = (hints: string[]) =>
    pool.find((v) => hints.some((h) => v.name.toLowerCase().includes(h)));

  const staff =
    findByHint(["male", "daniel", "alex", "fred", "google uk english male"]) ||
    pool[0] ||
    null;
  const patient =
    findByHint(["female", "samantha", "victoria", "google uk english female"]) ||
    pool.find((v) => v !== staff) ||
    pool[0] ||
    null;

  cachedPick = { staff, patient };
  return cachedPick;
}

// Voices populate asynchronously on some browsers — prime them.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      () => {
        cachedPick = null;
        pickVoices();
      },
      { once: true }
    );
  } else {
    pickVoices();
  }
}

type Segment = { speaker: "patient" | "staff"; text: string };

function parseSegments(text: string): Segment[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const segments: Segment[] = [];
  const speakerLine = /^([A-Za-z][A-Za-z .'-]{1,30}):\s*(.+)$/;

  for (const line of lines) {
    const m = line.match(speakerLine);
    if (m) {
      const speaker = m[1].toLowerCase().includes("patient") ? "patient" : "staff";
      segments.push({ speaker, text: m[2] });
    } else {
      segments.push({ speaker: "staff", text: line });
    }
  }
  return segments;
}

export const isSpeechSynthesisSupported = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window;

export const cancelSpeech = (): void => {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
};

export const speakClinicalNarrative = async (text: string): Promise<void> => {
  if (!isSpeechSynthesisSupported()) {
    throw new Error("This browser does not support Web Speech synthesis.");
  }

  const synth = window.speechSynthesis;
  synth.cancel(); // stop anything currently playing

  const segments = parseSegments(text);
  if (!segments.length) return;

  const voices = pickVoices();

  await new Promise<void>((resolve, reject) => {
    let cursor = 0;
    const speakNext = () => {
      if (cursor >= segments.length) {
        resolve();
        return;
      }
      const seg = segments[cursor++];
      const utter = new SpeechSynthesisUtterance(seg.text);
      const v = seg.speaker === "patient" ? voices.patient : voices.staff;
      if (v) utter.voice = v;
      utter.rate = seg.speaker === "patient" ? 0.95 : 1.0;
      utter.pitch = seg.speaker === "patient" ? 0.9 : 1.0;
      utter.onend = speakNext;
      utter.onerror = (ev) => reject(new Error(`TTS error: ${ev.error}`));
      synth.speak(utter);
    };
    speakNext();
  });
};
