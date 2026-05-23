import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The Anthropic SDK's Beta.Environments.Work resource statically imports
// node-only helpers (tools/agent-toolset/{node,skills,fs-util}.mjs) that
// touch node:fs / node:crypto. We never use that worker from the browser,
// so stub the whole agent-toolset subtree out of the bundle.
const stubAnthropicNodeTools = (): Plugin => ({
  name: 'stub-anthropic-node-tools',
  enforce: 'pre',
  resolveId(source) {
    if (/(^|\/)@anthropic-ai\/sdk\/tools\/agent-toolset\//.test(source)) {
      return { id: '\0anthropic-agent-toolset-stub' };
    }
    if (/tools\/agent-toolset\/(node|skills|fs-util)\.m?js$/.test(source)) {
      return { id: '\0anthropic-agent-toolset-stub' };
    }
    return null;
  },
  load(id) {
    if (id === '\0anthropic-agent-toolset-stub') {
      return 'export default {}; export const betaAgentToolset20260401 = () => { throw new Error("agent-toolset is not available in the browser"); };';
    }
    return null;
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react(), tailwindcss(), stubAnthropicNodeTools()],
    define: {
      // Replaces `process.env.ANTHROPIC_API_KEY` at build time with the value
      // from `.env.local` (local dev) or the host environment (CI/Vercel).
      // If unset, the app falls back to the in-browser key input.
      'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY ?? ''),
    },
  };
});