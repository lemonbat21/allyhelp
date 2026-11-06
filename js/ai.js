// The cat's helper. Routes, in order:
//  • On a claude.ai page: your ChatGPT API through the "Cloud Cat GPT" custom connector
//    (server/worker.js, tool `ask_cat`). If that connector isn't added yet, Claude answers instead
//    (the `sample` capability) so the chat never goes silent.
//  • Anywhere else: the private GPT helper (server/worker.js or server/dev-server.mjs) at /api/chat.
import { SYSTEM_PROMPT } from './persona.js';

export const CONNECTOR = 'Cloud Cat GPT';
export const CONNECTOR_TOOL = 'ask_cat';

const caps = {}; // name -> namespace | null
async function cap(name) {
  if (!(name in caps)) caps[name] = window.claude?.use ? await window.claude.use(name).catch(() => null) : null;
  return caps[name];
}

// Remembers why GPT wasn't used, so Settings can explain it.
export const status = { route: null, reason: null };

async function viaConnector(messages, context) {
  const mcp = await cap('mcp');
  if (!mcp) { status.reason = 'not_available'; return null; }
  try {
    const res = await mcp.callTool(CONNECTOR, CONNECTOR_TOOL, { messages: messages.slice(-16), context }, { cache: false });
    const reply = res?.payload?.reply ?? (typeof res?.payload === 'string' ? res.payload : null);
    if (!reply) { status.reason = 'empty_reply'; return null; }
    status.route = 'gpt'; status.reason = null;
    return String(reply).trim();
  } catch (e) {
    status.reason = e?.code || 'upstream_error'; // server_not_connected, needs_reauth, not_in_manifest, tool_error…
    return null;
  }
}

export async function askCat(messages, context, settings) {
  if (!navigator.onLine) throw new Error('offline');
  if (window.__ARTIFACT) {
    const gpt = await viaConnector(messages, context);
    if (gpt) return gpt;
  }
  const sample = await cap('sample');
  if (sample) {
    const rules = `${SYSTEM_PROMPT}\n\nCONTEXT (from the app, not from the user):\n${JSON.stringify(context)}\n\nReply only with your message to the traveller.`;
    const turns = messages.filter((m) => m.content && (m.role === 'user' || m.role === 'assistant')).slice(-16);
    while (turns.length && turns[0].role !== 'user') turns.shift();
    try {
      const { text } = await sample([{ role: 'user', content: rules }, ...turns], { cache: false, modelTier: 'quick' });
      status.route = 'claude';
      return text.trim();
    } catch (e) {
      throw new Error(e?.code || 'claude_error');
    }
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const r = await fetch(settings.aiUrl || '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Passcode': settings.aiPass || '' },
      body: JSON.stringify({ messages, context }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data = await r.json();
    if (!data.reply) throw new Error('empty reply');
    return data.reply;
  } finally {
    clearTimeout(timer);
  }
}

export function offlineReply(nextStep, offline) {
  const start = offline
    ? 'I can’t reach the internet right now. That’s okay, your roaming is off on purpose. Airport Wi-Fi is free if you want to talk to me properly.'
    : 'I can’t reach my helper right now. That’s okay, it’s not something you did.';
  const next = nextStep ? `\n\nFor now, your next step is:\n${nextStep}` : '';
  return `${start}${next}\n\nIf it feels like a lot: find a wall or a seat, headphones on, hold your plush and breathe slowly. You can tap “Help” for the ready-made answers, they always work. I’m right here 💜`;
}
