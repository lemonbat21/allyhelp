// Cloudflare Worker: a tiny private bridge between the app and OpenAI.
// The OpenAI key lives here as a secret and never reaches the browser.
//
// Deploy:  npx wrangler deploy   (see wrangler.toml and README)
// Secrets: npx wrangler secret put OPENAI_API_KEY
//          npx wrangler secret put APP_PASSCODE
import { handleChat } from './prompt.js';

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Passcode',
});

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
    if (request.method !== 'POST') return new Response('Not found', { status: 404 });
    if (env.APP_PASSCODE && request.headers.get('X-App-Passcode') !== env.APP_PASSCODE) {
      return new Response(JSON.stringify({ error: 'bad passcode' }), { status: 401, headers: cors(origin) });
    }
    try {
      const body = await request.json();
      const reply = await handleChat(body, { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-5.5' });
      return new Response(JSON.stringify({ reply }), { headers: { ...cors(origin), 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 502, headers: cors(origin) });
    }
  },
};
