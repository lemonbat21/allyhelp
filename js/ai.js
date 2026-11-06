// Talks to the private helper (server/worker.js or server/dev-server.mjs), which talks to OpenAI.
export async function askCat(messages, context, settings) {
  if (!navigator.onLine) throw new Error('offline');
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
