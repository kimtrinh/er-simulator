<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MediSim: ER CME Simulator (Claude edition)

Interactive clinical case simulator that transforms a medical guideline PDF into a high-stakes ER scenario. Vitals, bedside dialogue, and debrief analytics are driven by Claude.

This branch swaps the original Gemini integration for the Anthropic API:

- **Case generation & per-turn simulation**: Claude Opus 4.7 via `@anthropic-ai/sdk` (browser, with `dangerouslyAllowBrowser: true`).
- **Structured output**: `output_config.format` with JSON schema + Zod runtime validation.
- **Prompt caching**: hidden case context cached on every turn via `cache_control: { type: "ephemeral" }`.
- **Clinical voice (TTS)**: browser-native `window.speechSynthesis` — no extra API, no extra key, free and offline.
- **Clinical images**: still extracted from the uploaded PDF via `pdf.js`. AI image generation is not used.

## Run locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```
   npm install
   ```
2. Provide an Anthropic API key. Two ways:
   - Create `.env.local` with `ANTHROPIC_API_KEY=sk-ant-...` (Vite picks it up at build time), **or**
   - Paste your key into the input on the upload screen — it's stored in `localStorage`.

   Get a key at https://console.anthropic.com/settings/keys.
3. Start the dev server:
   ```
   npm run dev
   ```

## How it works

1. Upload a clinical guideline PDF.
2. `pdf.js` extracts up to 10 clinically meaningful images.
3. The PDF + extracted images are sent to Claude, which produces a hidden diagnosis, opening bedside scene, initial vitals, and a visual catalog.
4. Each user action triggers a per-turn call where Claude updates vitals, narrates the bedside response, and optionally surfaces a relevant image from the catalog.
5. When the case ends, Claude returns a structured debrief (score, performance breakdown, critical events, missed opportunities, learning points).

Prior Gemini implementation lives on the `main` branch.
