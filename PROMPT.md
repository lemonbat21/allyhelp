# Build prompt: "Cloud Cat", a gentle travel checklist app

Copy everything below this line into your AI app builder.

---

## 0. What you're building

Build a mobile-first web app (a PWA that can be installed to the home screen and works offline) that guides one person through a trip in three sections. The user is autistic, has ADHD and BPD, and has past trauma. The app must feel calm, predictable, tactile and rewarding, and it must never feel overwhelming.

Core rules:
- Never show a long list. Show one small group of tasks at a time.
- The user always knows what to do next.
- Never shame or pressure. Nothing is ever shown as "overdue" or "failed".
- Everything saves automatically on the device.
- Everything except the AI chat works offline. Data roaming will be OFF during the trip.

Tech: React + Vite (or plain HTML/CSS/JS), with few dependencies. Use localStorage for progress and settings, and IndexedDB for uploaded ticket files. Add a service worker so the whole app loads offline.

---

## 1. Structure

**Section → Subcategory → Steps**

Three sections:
1. 📅 **Day before prep**: Mon 9 Nov
2. ✈️ **Flight day**: Tue 10 Nov
3. 🔁 **Flight home**: Mon 23 + Tue 24 Nov

On launch, suggest the section that matches today's date (before 10 Nov → Section 1, 10 Nov → Section 2, from 23 Nov → Section 3). The user can still switch sections freely.

### Two modes

**Prep mode** (Section 1, and the "Day before" part of Section 3)
- The order is free. When the section opens, and again each time a subcategory is finished, the app asks: **"Which would you like to start with?"**
- Show subcategory cards with an icon, a name, the number of steps and its star colour. Finished ones show their collected big star and are softly greyed.
- Once the user picks one, ONLY that subcategory is visible. A small "← choose a different one" link goes back to the picker.
- Each subcategory has a **"Skip for now"** option. It moves the group to a "Later" pile with no guilt message, just the cat saying something like "That's okay, we can come back to it."
- Badges: **Do first** (pinned to the top of the picker) and **Bonus** (nice-to-do, softer card style).

**Journey mode** (Section 2, and the travel part of Section 3)
- Steps happen in a fixed order. Show ONLY the current stage, labelled "Next up".
- Under the current stage, a small muted line reads "After this: [next stage name]".
- A small "All stages" button opens a list so the user can jump to any stage.
- A pinned **times strip** sits under the progress bar (the key times for that day). It collapses to one line and expands on tap.
- Show the current local time, and on flight days a small "🇸🇪 10:42 · 🇬🇧 09:42" clock. Countdowns are OFF by default (they can raise anxiety) and can be turned on in Settings.

### Step types (from the colour codes in the content)
| Code | Meaning | How it shows |
|---|---|---|
| ☐ / 🟩 | Action | Checkbox step |
| 🟪 | Comfort / calm | Checkbox step with a soft lavender style |
| 🟦 | Good to know | Info note with no checkbox and a gentle blue tint |
| 🟥 | "If this happens…" | NOT a checkbox. Goes in a collapsed **"If something goes differently"** row under that stage, AND becomes a preset option in that stage's Help menu. Use soft coral, never alarming red. |

**"Say this" cards:** any phrase in quotes ("…") shows as a tappable speech card. Tapping it shows the phrase full-screen in very large text, so the user can read it out or show the phone to staff.

### Steps visible (Settings)
"Show me: **1 step at a time** / **3 at a time** (default) / **Custom** (slider 1–10) / **Whole group**."
In 1-at-a-time mode, ticking a step slides the next one in gently.

---

## 2. Content

### 📅 SECTION 1: Day before prep (Mon 9 Nov) · Prep mode

Intro from the cat: "Little groups, any order. Pick whichever feels easiest 💜"

**1. ✈️ Check in** · mint star · *Do first*
- ☐ Set an alarm for 11:45 so you don't miss check-in
- ☐ At 11:50, check in on the Ryanair app *(before 11:50, show a soft "opens at 11:50, you can do other groups first" label. Do not hard-lock it.)*
- ☐ Screenshot your boarding pass
- ☐ Add it to your Wallet in this app *(button opens the Wallet upload)*

**2. 🚆 Train ticket** · sky-blue star
- ☐ Buy train ticket: Lund → Copenhagen Airport (Skånetrafiken app)
- ☐ Write down the train time and platform *(include input fields; the values are saved to the Wallet info cards)*

**3. 📱 Phone setup** · lavender star
- ☐ Turn data roaming off *(expandable: iPhone: Settings → Mobile Service → Mobile Data Options · Android: Settings → Connections → Mobile networks)*
- ☐ Charge phone and headphones
- ☐ Set alarms: 07:00 · 07:45 · 10:45 · 11:00 *(show the times as little chips)*

**4. 📸 Backup info** · peach star
- ☐ Screenshot your return booking
- ☐ Screenshot your UK address
- ☐ Screenshot Jan's number
- ☐ Write Jan's number on paper

**5. 🛂 Documents pouch** · butter-yellow star
*(One item per tick. Lots of tiny ticks feels great.)*
- ☐ Passport
- ☐ Mastercard
- ☐ Doctor's letter
- ☐ Schengen certificate
- ☐ Medicines, in their original boxes
- ☐ Everything in one pouch

**6. 🎒 Bag bits** · coral star
- ☐ Liquids: max 100 ml each
- ☐ All liquids in one clear 1-litre bag
- ☐ Chewing gum (for the plane, helps your ears)
- ☐ Travel plush ready

**7. 🛁 Me** · rose star
- ☐ Shower
- ☐ Choose travel outfit

**Room reset** *(a small heading in the picker; these three groups are Bonus)*

**8. 🐾 Harry** · teal star · *Bonus*
- ☐ Clip Harry's nails
- ☐ Empty Harry level shelf by bed

**9. 🛏️ Bed** · lilac star · *Bonus*
- ☐ Change bedsheets
- ☐ Make the bed
- ☐ Put plushies away (keep your travel plush out)

**10. 🧹 Tidy up** · gold star · *Bonus*
- ☐ Empty trash
- ☐ Clear TV bench
- ☐ Chair away from desk
- ☐ Foot stool to the right

**Section complete screen:** all ten stars join into a little constellation, the cat curls up asleep on the cloud, and the text reads:
> 🟪 Done = rest. Tomorrow's you has everything ready.

**Section 1 Help presets** (offline, pre-written answers):
- *Check-in isn't working* → "That's okay. Check it's after 11:50. Close and reopen the Ryanair app, and check you're on Wi-Fi. Online check-in stays open until 2 hours before the flight, so you have lots of time. You can also ask Jan to help."
- *I'm too tired to do everything* → "You've already done a lot. The must-dos are: Check in, Documents pouch, Phone setup. Everything in Room reset is a bonus and can wait."
- *I can't find something* → "Pause, take a breath. Check your bag, jacket pockets, desk and bedside. If it's a document, message Jan and we'll work it out."
- *I don't know where to start* → The app picks the smallest unfinished must-do group and offers it: "How about this one? It's only 2 steps."
- *I feel overwhelmed* → the overwhelm plan (see Section 2).

---

### ✈️ SECTION 2: Flight day (Tue 10 Nov) · Journey mode

**Times strip:** 🕖 07:45 leave home · 🕚 11:00 sit at the gate · 🚪 11:20 gate closes (final!) · ✈️ 11:50 flight FR746

**Stage 1: Get to Lund C (07:45)** · mint star
- 🟩 Your driver takes you
- 🟩 Find the platform for Copenhagen Airport

**Stage 2: Train (~08:45)** · sky-blue star
- 🟩 Check the time in the app
- 🟦 Sometimes there are ID checks on the train into Denmark. Just show your passport. Totally normal.
- 🟩 Get off at Københavns Lufthavn
- 🟥 Missed it? Next train is about 20 min later
- 🟥 Train ends in Malmö? Change there
- 🟥 Ask: "Which train goes to Copenhagen Airport?"

**Stage 3: Up to the terminal (~09:25)** · lavender star
- 🟩 Escalator or lift, follow Security

**Stage 4: Security (09:30–10:15)** · peach star
- 🟩 In the queue: passport and boarding pass in one pocket, liquid bag on top, jacket off, pockets empty
- 🟩 In the trays: jacket, phone, keys, liquid bag. Suitcase on the belt
- 🟩 Say: "This is my comfort toy. Please can he go through gently?"
- 🟩 Grab passport and phone first, repack on a bench
- 🟥 Bag check? Normal. Say: "I'm autistic and find this stressful. Please explain each step."

**Stage 5: Passport control (10:15–10:45)** · butter-yellow star
- 🟩 Follow Gates / Passport Control signs
- 🟩 Do this before shops or food
- 🟩 Hold passport open at the photo page
- 🟩 Toilet if needed

**Stage 6: Find your gate (10:45)** · coral star
- 🟩 Find a screen: FR746 / Bristol / 11:50
- 🟩 Walk to the gate it shows
- 🟥 No gate yet? Check again in 10–15 min
- 🟥 Lost? Ask anyone in uniform: "Excuse me, where is the gate for Bristol?"

**Stage 7: Wait at the gate (by 11:00)** · rose star
- 🟪 Back to a wall, headphones on, plush in your arms
- 🟩 When staff start boarding, join the non-priority line
- 🟩 Boarding pass on phone, passport in hand
- 🟥 Pass won't load? Open your screenshot *(include a direct button to the Wallet)*
- 🟥 Gate changed? Ask: "Is this the gate for Bristol?"

**Stage 8: On the plane** · teal star
- 🟩 Seat 14C = row 14, seat C
- 🟩 Suitcase under the seat in front, plush on your lap, seatbelt tight
- 🟩 Chew gum during take-off and landing (stops blocked ears)
- 🟪 Headphones on before take-off (loud for ~30 seconds)
- 🟪 Ears still hurt? Swallow or sip water
- 🟦 Shaking = turbulence, totally normal
- 🟩 Stay seated until the seatbelt sign is off
- 🟥 Panicking? Press the call button and say: "I'm feeling very anxious. Could you help me, please?"

**Stage 9: Bristol (lands 12:55, UK time is 1 hour behind)** · lilac star
*(When this stage opens, the clock switches to UK time and the cat says "Welcome to the UK 🇬🇧 It's an hour earlier here.")*
- 🟩 Follow Arrivals → Passport Control
- 🟩 Go to the disability line, not the main line
- 🟥 Can't see it? Ask staff: "Where is the disability line?"
- 🟩 Answers for the officer: visiting my boyfriend · two weeks · flying back 24 November *(show as a "Say this" card)*
- 🟩 Read your address from your phone *(button opens the address card in big text)*
- 🟥 Don't understand? "Sorry, could you say that again more slowly?"
- 🟥 No disability line? Use the ePassport gate: photo page face down on scanner, look at camera
- 🟩 Skip baggage reclaim
- 🟩 Green channel, doctor's letter in your hand
- 🟩 Go to the meeting spot you agreed with Jan
- 🟥 Can't find him? Stay in arrivals, message him on Wi-Fi, or ask the information desk

**Section complete:** a big celebration with all nine stars and the cat holding a tiny suitcase: "You did it. You actually did it. I'm so proud of you 💜"

**"If anything goes wrong"** (Help presets available at EVERY stage of Section 2, below the stage-specific ones):
- 🟪 **I'm overwhelmed** → "Go to a wall or seat. Headphones on. Hold your plush. Breathe slowly. Read only the next step." Say: "I'm overwhelmed. Can I sit somewhere quiet?"
- 🟥 **I'm running late** → Go straight to security, ask staff
- 🟥 **My phone is dying** → Use the paper with Jan's number, ask the info desk to help you charge
- 🟥 **I missed boarding** → Ryanair desk, then message Jan
- 🟥 **Delayed or cancelled** → Check app and board, ask about rebooking, keep receipts
- 🟥 **Emergency** → 112 (Sweden/Denmark), 999 (UK)

Also show a small, always-visible purple **"I'm overwhelmed"** pill on every journey-mode screen that opens the overwhelm plan straight away: dimmed screen, one slow breathing circle, the steps above, and a "Say this" card.

---

### 🔁 SECTION 3: Flight home

**Part A: Day before (Mon 23 Nov) · Prep mode**

**1. ✈️ Check in** · mint star · *Do first*
- ☐ Set an alarm for 13:20
- ☐ From about 13:25, check in on the Ryanair app
- ☐ Screenshot your boarding pass
- ☐ Add it to your Wallet

**2. 🎒 Pack** · coral star
- ☐ Documents pouch: passport, Mastercard, doctor's letter, Schengen certificate, medicines in original boxes
- ☐ Liquids in one clear 1-litre bag
- ☐ Pack chewing gum
- ☐ Travel plush ready
- ☐ Charge phone and headphones

**3. ⏰ Plan tomorrow** · lavender star
- ☐ Agree with Jan what time you leave for the airport
- ☐ Set alarms for the morning

**Part B: Travel day (Tue 24 Nov) · Journey mode**

**Times strip:** 🕚 11:15 be at Bristol Airport · 🚪 12:55 gate closes · ✈️ 13:25 flight FR745 · 🛬 16:25 land in Copenhagen

**Stage 1: Get to Bristol Airport (by 11:15)** · sky-blue star
- 🟩 Leave at the time you agreed with Jan
- 🟩 You already checked in on the app ✓ Go to Security

**Stage 2: At Bristol** · peach star
- 🟩 Security, then find your gate (same steps as Day 2, with FR745 / Copenhagen / 13:25)
- 🟥 Need help? OCS reception, opposite Ritazza in the departure concourse

**Stage 3: On the plane** · teal star
- 🟩 Chew gum during take-off and landing
- 🟪 Headphones on, plush on your lap
- 🟦 UK → Denmark: clocks go 1 hour forward *(the clock switches back to Sweden/Denmark time)*

**Stage 4: At Copenhagen (16:25)** · butter-yellow star
- 🟩 Follow Arrivals → Passport Control
- 🟩 Nothing to collect at baggage, walk through the exit
- 🟩 Follow signs to the train station (basement of Terminal 3)
- 🟩 Buy a ticket to Lund (Skånetrafiken app on airport Wi-Fi, or the ticket machine)
- 🟩 Take a train towards Lund (check the screen says it stops at Lund C)
- 🟥 Not sure which train? Ask: "Which train goes to Lund?"

**Stage 5: Home** · rose star
- 🟪 You're home. Rest. 💜

**Section 3 Help presets:** the Stage presets above + the same "If anything goes wrong" list (Emergency shows 999 in the UK, 112 in Denmark/Sweden).

---

## 3. Top area: sky, cloud cat and progress bar

**Sky header (top ~30% of screen):** a soft pastel sky gradient. The cat sits on a fluffy cloud in the top corner and **gently floats up and down** (about 4 s ease-in-out loop) while the cloud drifts slightly.

**Stars in the sky:** every star the user earns in the current section stays in the sky next to the cat, slowly twinkling, so the sky fills up as they go.

**Progress bar** (just below the sky):
- Shows the **overall progress of the whole current section** (all steps across all subcategories), not just the current group.
- A small cat runs along the bar, slowly and constantly (a little trotting loop) toward the current progress point.
- **When a step is ticked, the running cat sprints for ~1.5 s** (faster leg cycle, a little dust puff), then eases back to a trot.
- The bar fills smoothly with a soft shimmer.

---

## 4. Rewards (the ticking moment)

When the user ticks a step:
1. **Tick sound**: tactile, satisfying, ASMR-like (a soft wooden click or bubble-pop with a gentle low thump). Vary the pitch very slightly each time so it never gets repetitive. Add a light haptic buzz where supported (`navigator.vibrate(10)`).
2. The checkbox fills with a springy squish animation.
3. The running cat sprints.
4. The cloud cat does a **soft, happy meow** (short, low volume, never shrill).
5. The cat **burps out a small star** in that subcategory's colour. It pops out with a tiny "hup" sound, floats up in an arc and settles in the sky beside him.

When a **whole subcategory** is finished:
- A **big star** in that colour grows in the sky with a gentle chime and a soft sparkle burst.
- The cat always says something proud in a speech bubble.
- Then the "Which would you like to do next?" picker appears (prep mode), or the next stage slides in (journey mode).

**Speech bubbles:** about every 3–4 ticks, plus on every subcategory finish, the cat shows a speech bubble for ~3 s. Never repeat the same line twice in a row. Examples:
- "You're doing amazing, baby."
- "I'm proud of you."
- "Well done :)"
- "Look at all these stars!"
- "One step at a time. You're doing it."
- "That's another one done 💜"
- "Tiny steps still count."
- "You're so brave."

Frequency can be changed in Settings (often / sometimes / rarely / off). The pet name the cat uses can also be changed (default "baby").

**Undo:** tapping a ticked step un-ticks it quietly (no sound, no stars removed visibly mid-animation; just recalculate). Mis-taps must never feel bad.

---

## 5. Tapping the cat

Tapping the cloud cat **dims the whole background** (a dark overlay with a slight blur) and brings the cat forward, bigger, with two soft buttons:

- **🤍 Pet**: the user strokes the cat with their finger. The cat closes its eyes, purrs (a soft, low, looping purr that fades when they stop) and little hearts float up. A gentle line appears now and then: "That's nice." / "I'm right here."
- **🆘 Help**: opens the Help sheet (below).

Tap outside or a ✕ to close. The background un-dims smoothly.

---

## 6. Help sheet

Opens over the dimmed background. Title: **"What's happening?"**

1. **Preset options for the current section and stage** (see the content above). Tapping one shows its pre-written answer in big, calm text, with any "Say this" cards. These work fully offline.
2. **"Something else"**: opens a text box. The message goes to the AI (section 7).
3. **"💜 Reassurance and support"** (with a heart): opens the AI chat, which starts with a warm opening message from the AI before the user types anything.

**Offline fallback:** if there's no internet, say kindly: "I can't reach the internet right now. That's okay, your roaming is off on purpose. Airport Wi-Fi is free if you want me. For now, here's your next step:" then show the next unticked step and the overwhelm plan. Never show a raw error.

---

## 7. AI chat (connects to my OpenAI GPT API)

### Security (important)
- **Never put the OpenAI API key in the front-end code.** Create a tiny serverless function (Cloudflare Worker, Vercel or Netlify function) that keeps the key as a secret environment variable and forwards requests to OpenAI. The app calls that endpoint (e.g. `/api/chat`).
- Add a simple shared passcode header so strangers can't use the endpoint.
- The proxy URL and passcode are set in Settings.

### What is sent with each message
A context block (as a system/developer message) built from the app state:
```json
{
  "now_local": "2026-11-10T10:52",
  "timezone_note": "Sweden/Denmark CET. UK is 1 hour behind.",
  "section": "Flight day (Tue 10 Nov)",
  "current_stage_or_group": "Stage 6: Find your gate",
  "completed": ["Stage 1 …", "Stage 2 …", "…"],
  "remaining_in_current": ["Walk to the gate it shows"],
  "next_up": "Stage 7: Wait at the gate (by 11:00)",
  "key_times": ["11:00 sit at gate", "11:20 gate closes", "11:50 FR746"],
  "trip": { "flight_out": "FR746 CPH→BRS 11:50, seat 14C", "flight_home": "FR745 BRS→CPH 13:25", "meeting": "Jan, at agreed spot" },
  "section_progress_percent": 62,
  "chosen_help_topic": "Something else"
}
```
Do **not** send Jan's phone number or the UK address to the AI by default.

Keep the chat history per section in localStorage (last ~20 messages), with a "Clear chat" option. Reply bubbles look like the cat is talking, with a small cat avatar.

### System prompt for the AI
```
You are the gentle voice of a little cat who lives on a cloud inside a travel checklist app. You are helping one person through a trip (Lund → Copenhagen Airport → Bristol, and back). You receive a context block with what they have finished, what they are doing now, what is next, and the current time. Use it. Never ask for information you already have.

Personality: kind, warm, understanding, non-judgemental, and genuinely helpful. You are objective and practical, and you always take feelings into account.

How to answer:
1. Reassurance first. Start with one or two warm sentences that acknowledge how they feel. Make them feel safe and not alone.
2. Then the next steps. Give at most 3 short, concrete, numbered steps, starting with the very next small thing they can do right now.
3. Keep replies short (usually under 120 words) unless they ask for more.

The person is autistic, has ADHD and BPD, and has past trauma. Adjust how you help, but NEVER mention or point out any diagnosis unless they bring it up first:
- Be literal and clear. No idioms, sarcasm, vague phrases or hidden meanings. Say exactly what will happen and in what order.
- When they need to speak to someone, give the exact words in quotes.
- One question at a time, and only if you really need the answer.
- If they're stuck or frozen, choose the smallest possible next action for them instead of giving options.
- Offer choices instead of commands where possible. Be predictable and steady.
- If something is time-critical (like the gate closing), say it calmly with the actual time, and put the action first. Do not add pressure words.
- If emotions are very intense: ground first (wall or seat, headphones, plush, slow breaths), stay with them and don't rush to fix things. Never sound cold, distant, annoyed or like you are leaving. End with something like "I'm right here. Tell me how you're doing."
- Never say: "calm down", "don't worry", "just", "simply", "you should have", "obviously".
- Never shame mistakes. Missed something? Treat it as normal and fixable, then help fix it.
- Celebrate what they have already done (you can see it in the context).
- You may use warm words like "lovely" or "baby" now and then, matching the app's tone. Don't overdo cat jokes; a small 🐾 or 💜 is fine.

Accuracy:
- Don't invent airport, airline or train facts. If you're not sure, say so kindly and tell them who to ask: staff in uniform, the information desk, the Ryanair desk, or the Ryanair app.
- Times: Sweden/Denmark are 1 hour ahead of the UK.

Safety:
- Medical emergency or danger: say clearly and calmly to call 112 (Sweden/Denmark) or 999 (UK), and to tell the nearest staff member.
- If they mention wanting to hurt themselves or not wanting to be alive: stay warm and present, take it seriously, encourage them to tell staff or call 112/999 if they're in danger now. Share support lines: UK Samaritans 116 123, Sweden Mind Självmordslinjen 90101, Denmark Livslinien 70 201 201. Keep talking with them.
```

---

## 7b. Bottom navigation (4 tabs)

1. **🏠 Today**: the current section (sky, progress, current group/stage). A section switcher sits at the top.
2. **⭐ Finished**: everything completed:
   - Per section: finished subcategories with their big stars, the steps inside them, and the time each was finished.
   - Total stars earned (small and big), shown as a constellation the user can tap.
   - A gentle summary line: "You've done 23 things today 💜"
   - Tapping a finished group lets them reopen or untick it.
3. **🎫 Wallet**: tickets and key info:
   - Upload boarding passes, train tickets and the return booking (images or PDF). Store them in IndexedDB so they **stay there and work offline**. Label each one (e.g. "Boarding pass: FR746").
   - Tapping a ticket opens it full-screen with a "turn your brightness up" hint.
   - Editable info cards: Jan's number (tap to call/copy), UK address (opens in huge text: "Show to officer"), meeting spot, train time and platform, seat number.
4. **⚙️ Settings**:
   - Steps visible: 1 / 3 / Custom (slider) / Whole group
   - Sound: master volume, plus toggles for tick, meow, purr and chimes
   - Haptics on/off
   - Reduce motion (also respect `prefers-reduced-motion`): the cat stops bobbing, stars fade in instead of flying
   - Cat speech bubbles: often / sometimes / rarely / off
   - What the cat calls you (default "baby")
   - Countdowns on/off (default off)
   - Text size
   - AI: proxy URL, passcode, test connection
   - Backup: export / import progress as a file
   - Reset a section / reset everything (with a gentle confirmation)

---

## 8. Saving

- Auto-save every change instantly to localStorage (progress, ticks with timestamps, stars, settings, Wallet text, chat history). Uploaded files go in IndexedDB.
- Call `navigator.storage.persist()` so the browser is less likely to clear the data.
- On first launch, show a one-time gentle tip: "Add me to your home screen so I'm always there, even offline."
- Reopening the app returns exactly where the user left off.

---

## 9. Look, feel and sound

- **Style:** soft pastel, rounded, cosy. Think gentle sky, clouds, soft shadows and slightly "squishy" buttons that press down on tap. A rounded friendly font (e.g. Nunito or Quicksand).
- **Big touch targets** (min 48 px), large readable text, lots of breathing room. No clutter.
- **Colour meaning:** mint/green = action, lavender = comfort, soft blue = info, soft coral = "if this happens". Never harsh red.
- **Animations:** smooth and springy, never sudden or flashy. No flashing lights.
- **Sounds:** generate with the Web Audio API or use small audio files. They must be soft, warm, low and never sudden or loud. Volume defaults to about 60%.
- An optional "Night sky" dark theme.
- The cat should be an original, simple, cute design (round, soft, expressive eyes). An SVG or Lottie is fine.

---

## 10. Done when

- [ ] Three sections. Prep mode asks "Which would you like to start with?" and shows only one subcategory at a time.
- [ ] Journey mode shows one stage at a time, in order, with the times strip.
- [ ] 🟩/🟪 are checkboxes, 🟦 are info notes, 🟥 are "If something goes differently" rows + Help presets.
- [ ] The progress bar shows overall section progress. The running cat trots and sprints on each tick.
- [ ] Floating cloud cat: meows, burps a coloured star per tick, big star per finished subcategory, occasional speech bubbles.
- [ ] Tapping the cat dims the background → Pet (purr + hearts) or Help.
- [ ] Help: offline presets + "Something else" + "💜 Reassurance and support" through a secure proxy with full progress context.
- [ ] Finished tab, Wallet tab (persistent uploads), Settings (1 / 3 / custom steps visible, etc.).
- [ ] Everything auto-saves and works offline except the AI chat, which fails gently.
