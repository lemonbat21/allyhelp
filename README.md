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

The app is plain static files, so any static host works. The simplest is **GitHub Pages**:
repo **Settings → Pages → Deploy from branch → `main` / root**.

The AI helper needs a tiny private server, so your OpenAI key never ends up in the app:

```bash
cd server
npx wrangler deploy
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put APP_PASSCODE
```

Then, in the app, go to **Settings → AI helper**: paste the Worker address (`https://cloud-cat-helper.<you>.workers.dev`)
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
