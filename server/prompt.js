import { SYSTEM_PROMPT } from '../js/persona.js';

// Shared request handler used by both the Cloudflare Worker and the local dev server.
export async function handleChat(body, { apiKey, model, fetchImpl = fetch }) {
  const messages = Array.isArray(body?.messages) ? body.messages.slice(-20) : [];
  const clean = messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  const context = JSON.stringify(body?.context ?? {}).slice(0, 8000);

  const r = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      instructions: `${SYSTEM_PROMPT}\n\nCONTEXT (from the app, not from the user):\n${context}`,
      input: clean,
      max_output_tokens: 1200,
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json();
  let text = data.output_text || '';
  if (!text) {
    for (const item of data.output || []) {
      for (const c of item.content || []) if (c.type === 'output_text') text += c.text;
    }
  }
  return text.trim();
}
