// Cloudflare Worker: a tiny private bridge between the app and OpenAI.
// The OpenAI key lives here as a secret and never reaches the browser.
//
// Two doors, same brain:
//   POST /api/chat           → for the normal website (index.html). Checks X-App-Passcode.
//   POST /mcp/<MCP_SECRET>   → an MCP server, so claude.ai can use it as a custom connector.
//                              The claude.ai page calls its `ask_cat` tool.
//
// Deploy:  npx wrangler deploy   (see wrangler.toml and README)
// Secrets: npx wrangler secret put OPENAI_API_KEY
//          npx wrangler secret put APP_PASSCODE
//          npx wrangler secret put MCP_SECRET     (any long random text; it becomes part of the connector URL)
import { handleChat } from './prompt.js';

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Passcode, Mcp-Session-Id, Mcp-Protocol-Version',
});
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const ASK_CAT_TOOL = {
  name: 'ask_cat',
  title: 'Ask the cloud cat',
  description: 'Sends the traveller’s chat to the cloud cat helper (OpenAI GPT) and returns the cat’s gentle reply. Input: the recent chat turns and the app’s current trip context.',
  inputSchema: {
    type: 'object',
    properties: {
      messages: {
        type: 'array',
        description: 'Chat turns, oldest first, ending with the traveller’s latest message.',
        items: {
          type: 'object',
          properties: { role: { type: 'string', enum: ['user', 'assistant'] }, content: { type: 'string' } },
          required: ['role', 'content'],
        },
      },
      context: { type: 'object', description: 'What the app knows: section, current step, what is done, key times.' },
    },
    required: ['messages'],
  },
  outputSchema: { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'] },
  annotations: { readOnlyHint: true, openWorldHint: true },
};

async function handleMcp(request, env) {
  let msg;
  try { msg = await request.json(); } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400); }
  if (Array.isArray(msg)) return json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Batches not supported' } }, 400);
  const { id, method, params } = msg;
  if (id === undefined || id === null) return new Response(null, { status: 202 }); // notification

  const ok = (result) => json({ jsonrpc: '2.0', id, result });
  switch (method) {
    case 'initialize':
      return ok({
        protocolVersion: params?.protocolVersion || '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'cloud-cat-gpt', version: '1.0.0' },
        instructions: 'Use ask_cat to get the cloud cat’s reassuring reply for the Cloud Cat travel app.',
      });
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: [ASK_CAT_TOOL] });
    case 'tools/call': {
      if (params?.name !== 'ask_cat') return json({ jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${params?.name}` } });
      try {
        const reply = await handleChat(params.arguments || {}, { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-5.5' });
        return ok({ content: [{ type: 'text', text: JSON.stringify({ reply }) }], structuredContent: { reply } });
      } catch (e) {
        return ok({ content: [{ type: 'text', text: `The helper couldn’t answer: ${String(e.message || e).slice(0, 200)}` }], isError: true });
      }
    }
    default:
      return json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || '*';

    if (url.pathname.startsWith('/mcp/')) {
      if (!env.MCP_SECRET || url.pathname !== `/mcp/${env.MCP_SECRET}`) return new Response('Not found', { status: 404 });
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
      return handleMcp(request, env);
    }

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
    if (url.pathname !== '/api/chat' && url.pathname !== '/') return new Response('Not found', { status: 404 });
    if (request.method !== 'POST') return new Response('Not found', { status: 404 });
    if (env.APP_PASSCODE && request.headers.get('X-App-Passcode') !== env.APP_PASSCODE) {
      return json({ error: 'bad passcode' }, 401, cors(origin));
    }
    try {
      const body = await request.json();
      const reply = await handleChat(body, { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-5.5' });
      return json({ reply }, 200, cors(origin));
    } catch (e) {
      return json({ error: String(e.message || e) }, 502, cors(origin));
    }
  },
};
