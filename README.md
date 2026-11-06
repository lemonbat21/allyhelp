# ☁️🐱 Cloud Cat: a gentle travel checklist

A calm, tactile, step-by-step travel app with a little cloud cat. It covers three sections:
**📅 Day before prep**, **✈️ Flight day** and **🔁 Flight home**.

- Prep days: pick any small group of tasks; only one group is visible at a time.
- Travel days: one stage at a time, in order, with the key times pinned at the top.
- Every tick plays a soft ASMR click, makes the running cat sprint, and makes the cloud cat meow and burp out a star.
  Finishing a whole group earns a big star.
- Tap the cat to **pet** him (he purrs) or get **help**: ready-made answers that work offline, plus
  "Something else" and "💜 Reassurance and support", which talk to a GPT helper.
- **Finished** tab, **Wallet** for tickets (saved on the phone and available offline) and key info, and **Settings**
  (1 / 3 / custom steps visible, sounds, motion, theme, text size…).
- Progress saves automatically on the device. The app installs to the home screen and works offline.

All trip content is in [`js/data.js`](js/data.js). The original spec is in [`PROMPT.md`](PROMPT.md).

## Run it on your computer

```bash
OPENAI_API_KEY=sk-... node server/dev-server.mjs
```

Open http://localhost:8787. (No install step needed; it just uses Node 18+.)

## Put it on your phone

There are two ways. Both keep your progress in the phone's browser.

### A. The claude.ai page (easiest)

`dist/cloud-cat.html` is the whole app packed into one file, published as a claude.ai page.
Rebuild it after changing anything:

```bash
python3 tools/build_artifact.py
```

On that page the cat's chat uses **your ChatGPT API through a custom connector**.
Until you add the connector, Claude answers instead, so the chat always works.

**Set up the "Cloud Cat GPT" connector (one time):**

1. Deploy the worker (free Cloudflare account):
   ```bash
   cd server
   npx wrangler deploy
   npx wrangler secret put OPENAI_API_KEY
   npx wrangler secret put MCP_SECRET
   ```
   For `MCP_SECRET`, type any long random text (for example 30 letters and numbers). Keep it private:
   anyone with the full connector address could use your OpenAI key.
2. In claude.ai, go to **Settings → Connectors → Add custom connector**.
   - Name: **Cloud Cat GPT** (exactly this, the page looks for this name)
   - URL: `https://cloud-cat-helper.<your-workers-subdomain>.workers.dev/mcp/<your MCP_SECRET>`
3. Open the page, tap the cat → **Help** → **💜 Reassurance and support**, and allow the connector when asked.
   In **Settings → AI helper**, **Test connection** should say "ChatGPT connected ✓".

### B. GitHub Pages

Repo **Settings → Pages → Deploy from branch** → pick this branch and `/ (root)`.

The AI helper there needs the same worker (step 1 above, plus `npx wrangler secret put APP_PASSCODE`).
In the app, go to **Settings → AI helper**, paste the worker address (`https://cloud-cat-helper.<you>.workers.dev/api/chat`)
and the passcode, then tap **Test connection**.

On iPhone, open the site in Safari, tap **Share → Add to Home Screen**, and open it once while online so it's saved for offline use.

## Artwork

The SVG illustrations in `assets/` were generated with OpenAI `gpt-6.1-sol` using the reference screenshots in
`tools/reference/`. To regenerate one you don't like:

```bash
OPENAI_API_KEY=sk-... python3 tools/generate_svgs.py scene-train
```

Assets: `cloud-cat` (animated eyes/mouth/tail), `running-cat` (animated legs), `scene-suitcase` (prep),
`scene-train` (train), `scene-airport` (airport stages; the sign text changes per stage), `star`, `icon`.
