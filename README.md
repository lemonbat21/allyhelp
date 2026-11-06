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

### Easiest: one HTML file

[`cloud-cat.html`](cloud-cat.html) is the whole app in a single file. Open it in a browser (Chrome or Safari),
then go to **Settings → AI helper**, paste your OpenAI API key and tap **Test connection**.
The key is saved only in that browser on that phone; it is never written into the file, so the file is safe to share.
Progress also saves in that browser. Rebuild it after any change with `python3 tools/build_artifact.py`.

There are two ways. Both keep your progress in the phone's browser.

### A. The claude.ai page (easiest)

`dist/cloud-cat.html` is the whole app packed into one file, published as a claude.ai page.
Rebuild it after changing anything:

```bash
python3 tools/build_artifact.py
```

On that page the cat's chat uses **the viewer's own Claude** (medium reasoning). Nothing to set up:
the first time, Claude asks to allow it.

(`server/worker.js` also exposes an MCP endpoint, `/mcp/<MCP_SECRET>`, with an `ask_cat` tool, in case you
ever want to route the chat through your OpenAI key as a custom connector instead.)

### B. GitHub Pages

Repo **Settings → Pages → Deploy from branch** → pick this branch and `/ (root)`.

The AI helper there uses your OpenAI key through the worker: `cd server`, `npx wrangler deploy`, then
`npx wrangler secret put OPENAI_API_KEY` and `npx wrangler secret put APP_PASSCODE`.
In the app, go to **Settings → AI helper**, paste the worker address (`https://cloud-cat-helper.<you>.workers.dev/api/chat`)
and the passcode, then tap **Test connection**.

On iPhone, open the site in Safari, tap **Share → Add to Home Screen**, and open it once while online so it's saved for offline use.

## Artwork

Icons (`assets/icons/`) are one-colour glyphs made with `gpt-image-2.6-flare` (medium) by
`tools/generate_icons.py`; the app tints them to the theme colour.


The SVG illustrations in `assets/` were generated with OpenAI `gpt-6.1-sol` using the reference screenshots in
`tools/reference/`. To regenerate one you don't like:

```bash
OPENAI_API_KEY=sk-... python3 tools/generate_svgs.py scene-train
```

Assets: `cloud-cat` (animated eyes/mouth/tail), `running-cat` (animated legs), `scene-suitcase` (prep),
`scene-train` (train), `scene-airport` (airport stages; the sign text changes per stage), `star`, `icon`.
