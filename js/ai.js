// The cat's helper.
//  • On the claude.ai page: the viewer's own Claude (the `sample` capability), medium reasoning.
//  • Anywhere else, if an OpenAI key is saved in Settings: OpenAI directly from the browser.
//  • Otherwise: the private GPT helper at /api/chat (server/).
import { SYSTEM_PROMPT } from './persona.js';

let sampleFn; // undefined = not checked yet, null = not available
async function getClaude() {
  if (sampleFn === undefined) sampleFn = window.claude?.use ? await window.claude.use('sample').catch(() => null) : null;
  return sampleFn;
}

const cleanTurns = (messages) => {
  const turns = messages.filter((m) => m.content && (m.role === 'user' || m.role === 'assistant')).slice(-16);
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns;
};

async function viaOpenAI(messages, context, settings) {
  const model = settings.openaiModel || 'gpt-5.5';
  const reasoning = /^(gpt-5|gpt-6|o\d)/.test(model) ? { reasoning: { effort: 'medium' } } : {};
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  let r;
  try {
    r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.openaiKey}` },
      body: JSON.stringify({
        model,
        instructions: `${SYSTEM_PROMPT}\n\nCONTEXT (from the app, not from the user):\n${JSON.stringify(context)}`,
        input: cleanTurns(messages),
        max_output_tokens: 4000,
        ...reasoning,
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'it took too long' : 'couldn’t reach OpenAI');
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) {
    let msg = '';
    try { msg = (await r.json())?.error?.message || ''; } catch { /* not JSON */ }
    if (r.status === 401) throw new Error('the key wasn’t accepted');
    if (r.status === 429) throw new Error('OpenAI says too many requests, or no credit left');
    if (r.status === 404) throw new Error(`model “${model}” not found`);
    throw new Error(msg ? msg.slice(0, 120) : `OpenAI error ${r.status}`);
  }
  const data = await r.json();
  let text = data.output_text || '';
  if (!text) for (const item of data.output || []) for (const c of item.content || []) if (c.type === 'output_text') text += c.text;
  if (!text.trim()) throw new Error('empty reply');
  return text.trim();
}

export async function askCat(messages, context, settings) {
  if (!navigator.onLine) throw new Error('offline');
  if (!window.__ARTIFACT && settings.openaiKey) return viaOpenAI(messages, context, settings);
  const sample = await getClaude();
  if (sample) {
    const rules = `${SYSTEM_PROMPT}\n\nCONTEXT (from the app, not from the user):\n${JSON.stringify(context)}\n\nReply only with your message to the traveller.`;
    const turns = cleanTurns(messages);
    try {
      const { text } = await sample([{ role: 'user', content: rules }, ...turns], { cache: false, modelTier: 'default', effort: 'medium' });
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

export function offlineReply(nextStep, offline, reason) {
  const start = offline
    ? 'I can’t reach the internet right now. That’s okay, your roaming is off on purpose. Airport Wi-Fi is free if you want to talk to me properly.'
    : `I can’t reach my helper right now${reason && reason !== 'offline' ? ` (${reason})` : ''}. That’s okay, it’s not something you did.`;
  const next = nextStep ? `\n\nFor now, your next step is:\n${nextStep}` : '';
  return `${start}${next}\n\nIf it feels like a lot: find a wall or a seat, headphones on, hold your plush and breathe slowly. You can tap “Help” for the ready-made answers, they always work. I’m right here 💜`;
}
