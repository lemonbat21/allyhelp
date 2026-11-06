// All trip content lives here. Edit freely: ids must stay unique.
// Step types: do = action checkbox, calm = comfort checkbox, info = note (no checkbox),
//             if = "If something goes differently" (no checkbox, also a Help preset).
// `say` = a "Say this" phrase card.

export const STAR = {
  mint: '#7DDBB4', sky: '#8CC4FF', lavender: '#B59BF3', peach: '#FFBE95', butter: '#FFDD7A',
  coral: '#FF9C9C', rose: '#FFA6CB', teal: '#78D5CF', lilac: '#D6A3F5', gold: '#FFC94D',
};

const step = (id, t, text, extra = {}) => ({ id, t, text, ...extra });
const iff = (id, q, a, say) => ({ id, t: 'if', q, a, say });

export const OVERWHELM = {
  q: "I'm overwhelmed",
  a: 'Go to a wall or a seat. Headphones on. Hold your plush. Breathe slowly. Read only the next step.',
  say: "I'm overwhelmed. Can I sit somewhere quiet?",
};

export const SECTIONS = [
  // ───────────────────────────── SECTION 1 ─────────────────────────────
  {
    id: 'prep', emoji: '📅', title: 'Day before prep', date: 'Mon 9 Nov', short: 'Prep',
    done: { title: 'Done = rest 💜', text: "Tomorrow's you has everything ready." },
    parts: [{ id: 'prep-a', mode: 'prep', label: 'Mon 9 Nov',
      order: ['p-checkin', 'p-phone', 'p-pouch', 'p-train', 'p-backup', 'p-bag', 'p-me', 'p-harry', 'p-bed', 'p-tidy'] }],
    groups: [
      { id: 'p-checkin', part: 'prep-a', icon: '✈️', name: 'Check in', color: STAR.mint, badge: 'first', scene: 'suitcase', sign: 'Check in',
        steps: [
          step('p-ci-1', 'do', 'Set an alarm for 11:45 so you don’t miss check-in'),
          step('p-ci-2', 'do', 'At 11:50, check in on the Ryanair app', { opensAt: '2026-11-09T11:50:00+01:00', opensLabel: 'opens at 11:50' }),
          step('p-ci-3', 'do', 'Screenshot your boarding pass'),
          step('p-ci-4', 'do', 'Add it to your Wallet in this app', { action: 'wallet' }),
        ] },
      { id: 'p-train', part: 'prep-a', icon: '🚆', name: 'Train ticket', color: STAR.sky, scene: 'suitcase', sign: 'Train ticket',
        steps: [
          step('p-tr-1', 'do', 'Buy train ticket: Lund → Copenhagen Airport (Skånetrafiken app)'),
          step('p-tr-2', 'do', 'Write down the train time and platform', { action: 'trainInfo' }),
        ] },
      { id: 'p-phone', part: 'prep-a', icon: '📱', name: 'Phone setup', color: STAR.lavender, scene: 'suitcase', sign: 'Phone setup',
        steps: [
          step('p-ph-1', 'do', 'Turn data roaming off', { detail: 'iPhone: Settings → Mobile Service → Mobile Data Options\nAndroid: Settings → Connections → Mobile networks' }),
          step('p-ph-2', 'do', 'Charge phone and headphones'),
          step('p-ph-3', 'do', 'Set alarms', { chips: ['07:00', '07:45', '10:45', '11:00'] }),
        ] },
      { id: 'p-backup', part: 'prep-a', icon: '📸', name: 'Backup info', color: STAR.peach, scene: 'suitcase', sign: 'Backup info',
        steps: [
          step('p-bk-1', 'do', 'Screenshot your return booking'),
          step('p-bk-2', 'do', 'Screenshot your UK address'),
          step('p-bk-3', 'do', 'Screenshot Jan’s number'),
          step('p-bk-4', 'do', 'Write Jan’s number on paper'),
        ] },
      { id: 'p-pouch', part: 'prep-a', icon: '🛂', name: 'Documents pouch', color: STAR.butter, scene: 'suitcase', sign: 'Documents',
        steps: [
          step('p-po-1', 'do', 'Passport'),
          step('p-po-2', 'do', 'Mastercard'),
          step('p-po-3', 'do', 'Doctor’s letter'),
          step('p-po-4', 'do', 'Schengen certificate'),
          step('p-po-5', 'do', 'Medicines, in their original boxes'),
          step('p-po-6', 'do', 'Everything in one pouch'),
        ] },
      { id: 'p-bag', part: 'prep-a', icon: '🎒', name: 'Bag bits', color: STAR.coral, scene: 'suitcase', sign: 'Bag bits',
        steps: [
          step('p-bg-1', 'do', 'Liquids: max 100 ml each'),
          step('p-bg-2', 'do', 'All liquids in one clear 1-litre bag'),
          step('p-bg-3', 'do', 'Chewing gum (for the plane, helps your ears)'),
          step('p-bg-4', 'do', 'Travel plush ready'),
        ] },
      { id: 'p-me', part: 'prep-a', icon: '🛁', name: 'Me', color: STAR.rose, scene: 'suitcase', sign: 'Me time',
        steps: [
          step('p-me-1', 'calm', 'Shower'),
          step('p-me-2', 'do', 'Choose travel outfit'),
        ] },
      { id: 'p-harry', part: 'prep-a', icon: '🐾', name: 'Harry', color: STAR.teal, badge: 'bonus', heading: 'Room reset', scene: 'suitcase', sign: 'Harry',
        steps: [
          step('p-ha-1', 'do', 'Clip Harry’s nails'),
          step('p-ha-2', 'do', 'Empty Harry level shelf by bed'),
        ] },
      { id: 'p-bed', part: 'prep-a', icon: '🛏️', name: 'Bed', color: STAR.lilac, badge: 'bonus', heading: 'Room reset', scene: 'suitcase', sign: 'Bed',
        steps: [
          step('p-be-1', 'do', 'Change bedsheets'),
          step('p-be-2', 'do', 'Make the bed'),
          step('p-be-3', 'do', 'Put plushies away (keep your travel plush out)'),
        ] },
      { id: 'p-tidy', part: 'prep-a', icon: '🧹', name: 'Tidy up', color: STAR.gold, badge: 'bonus', heading: 'Room reset', scene: 'suitcase', sign: 'Tidy up',
        steps: [
          step('p-ti-1', 'do', 'Empty trash'),
          step('p-ti-2', 'do', 'Clear TV bench'),
          step('p-ti-3', 'do', 'Chair away from desk'),
          step('p-ti-4', 'do', 'Foot stool to the right'),
        ] },
    ],
    help: [
      { q: 'Check-in isn’t working', a: 'That’s okay. Check it’s after 11:50. Close and reopen the Ryanair app, and check you’re on Wi-Fi. Online check-in stays open until 2 hours before the flight, so you have lots of time. You can also ask Jan to help.' },
      { q: 'I’m too tired to do everything', a: 'You’ve already done a lot. The must-dos are: Check in, Documents pouch and Phone setup. Everything in Room reset is a bonus and can wait.' },
      { q: 'I can’t find something', a: 'Pause and take a breath. Check your bag, jacket pockets, desk and bedside. If it’s a document, message Jan and we’ll work it out together.' },
      { q: 'I don’t know where to start', a: '__pick__' },
    ],
  },

  // ───────────────────────────── SECTION 2 ─────────────────────────────
  {
    id: 'flight', emoji: '✈️', title: 'Flight day', date: 'Tue 10 Nov', short: 'Flight',
    done: { title: 'You did it 💜', text: 'You actually did it. I’m so proud of you.' },
    parts: [{ id: 'flight-a', mode: 'journey', label: 'Tue 10 Nov',
      times: [['🕖', '07:45', 'leave home'], ['🕚', '11:00', 'sit at the gate'], ['🚪', '11:20', 'gate closes (final!)'], ['✈️', '11:50', 'flight FR746']],
      timesAt: ['2026-11-10T07:45:00+01:00', '2026-11-10T11:00:00+01:00', '2026-11-10T11:20:00+01:00', '2026-11-10T11:50:00+01:00'] }],
    groups: [
      { id: 'f-lund', part: 'flight-a', icon: '🚗', name: 'Get to Lund C', time: '07:45', color: STAR.mint, scene: 'train', sign: 'Lund C',
        steps: [
          step('f-lu-1', 'do', 'Your driver takes you'),
          step('f-lu-2', 'do', 'Find the platform for Copenhagen Airport'),
        ] },
      { id: 'f-train', part: 'flight-a', icon: '🚆', name: 'Train', time: '~08:45', color: STAR.sky, scene: 'train', sign: 'To the airport',
        steps: [
          step('f-tr-1', 'do', 'Check the time in the app'),
          step('f-tr-i', 'info', 'Sometimes there are ID checks on the train into Denmark. Just show your passport. Totally normal.'),
          step('f-tr-2', 'do', 'Get off at Københavns Lufthavn'),
          iff('f-tr-x1', 'Missed the train?', 'That’s okay. The next train is about 20 minutes later.'),
          iff('f-tr-x2', 'Train ends in Malmö?', 'Get off and change there. Ask staff or check the screens for the next train to Copenhagen Airport.', 'Which train goes to Copenhagen Airport?'),
          iff('f-tr-x3', 'Not sure which train?', 'Ask anyone in uniform.', 'Which train goes to Copenhagen Airport?'),
        ] },
      { id: 'f-terminal', part: 'flight-a', icon: '🛗', name: 'Up to the terminal', time: '~09:25', color: STAR.lavender, scene: 'airport', sign: 'Terminal 3',
        steps: [
          step('f-te-1', 'do', 'Escalator or lift, follow Security'),
        ] },
      { id: 'f-security', part: 'flight-a', icon: '🛃', name: 'Security', time: '09:30–10:15', color: STAR.peach, scene: 'airport', sign: 'Security',
        steps: [
          step('f-se-1', 'do', 'In the queue: passport and boarding pass in one pocket, liquid bag on top, jacket off, pockets empty'),
          step('f-se-2', 'do', 'In the trays: jacket, phone, keys, liquid bag. Suitcase on the belt'),
          step('f-se-3', 'do', 'Ask about your plush', { say: 'This is my comfort toy. Please can he go through gently?' }),
          step('f-se-4', 'do', 'Grab passport and phone first, repack on a bench'),
          iff('f-se-x1', 'They want to check my bag', 'That’s normal. It happens to lots of people and doesn’t mean you did anything wrong.', 'I’m autistic and find this stressful. Please explain each step.'),
        ] },
      { id: 'f-passport', part: 'flight-a', icon: '🛂', name: 'Passport control', time: '10:15–10:45', color: STAR.butter, scene: 'airport', sign: 'Passport control',
        steps: [
          step('f-pa-1', 'do', 'Follow Gates / Passport Control signs'),
          step('f-pa-2', 'do', 'Do this before shops or food'),
          step('f-pa-3', 'do', 'Hold passport open at the photo page'),
          step('f-pa-4', 'calm', 'Toilet if needed'),
        ] },
      { id: 'f-gate', part: 'flight-a', icon: '🔎', name: 'Find your gate', time: '10:45', color: STAR.coral, scene: 'airport', sign: 'Find your gate',
        steps: [
          step('f-ga-1', 'do', 'Find a screen: FR746 / Bristol / 11:50'),
          step('f-ga-2', 'do', 'Walk to the gate it shows'),
          iff('f-ga-x1', 'No gate shown yet?', 'That’s normal. Sit nearby and check again in 10–15 minutes.'),
          iff('f-ga-x2', 'I’m lost', 'Ask anyone in uniform.', 'Excuse me, where is the gate for Bristol?'),
        ] },
      { id: 'f-wait', part: 'flight-a', icon: '🪑', name: 'Wait at the gate', time: 'by 11:00', color: STAR.rose, scene: 'airport', sign: 'Gate',
        steps: [
          step('f-wa-1', 'calm', 'Back to a wall, headphones on, plush in your arms'),
          step('f-wa-2', 'do', 'When staff start boarding, join the non-priority line'),
          step('f-wa-3', 'do', 'Boarding pass on phone, passport in hand', { action: 'wallet' }),
          iff('f-wa-x1', 'Boarding pass won’t load?', 'Open your screenshot, or the copy in your Wallet tab.'),
          iff('f-wa-x2', 'The gate changed?', 'Check the screens again for FR746, or ask staff.', 'Is this the gate for Bristol?'),
        ] },
      { id: 'f-plane', part: 'flight-a', icon: '💺', name: 'On the plane', color: STAR.teal, scene: 'airport', sign: 'On the plane',
        steps: [
          step('f-pl-1', 'do', 'Seat 14C = row 14, seat C'),
          step('f-pl-2', 'do', 'Suitcase under the seat in front, plush on your lap, seatbelt tight'),
          step('f-pl-3', 'do', 'Chew gum during take-off and landing (stops blocked ears)'),
          step('f-pl-4', 'calm', 'Headphones on before take-off (loud for ~30 seconds)'),
          step('f-pl-i1', 'info', 'Ears still hurt? Swallow or sip water.'),
          step('f-pl-i2', 'info', 'Shaking = turbulence. Totally normal.'),
          step('f-pl-5', 'do', 'Stay seated until the seatbelt sign is off'),
          iff('f-pl-x1', 'I’m panicking', 'Press the call button above your seat. Hold your plush and breathe slowly.', 'I’m feeling very anxious. Could you help me, please?'),
        ] },
      { id: 'f-bristol', part: 'flight-a', icon: '🇬🇧', name: 'Bristol', time: 'lands 12:55 UK', color: STAR.lilac, scene: 'airport', sign: 'Bristol Arrivals', ukTime: true,
        intro: 'Welcome to the UK 🇬🇧 It’s an hour earlier here.',
        steps: [
          step('f-br-1', 'do', 'Follow Arrivals → Passport Control'),
          step('f-br-2', 'do', 'Go to the disability line, not the main line'),
          step('f-br-3', 'do', 'Answers for the officer', { say: 'Visiting my boyfriend · two weeks · flying back 24 November' }),
          step('f-br-4', 'do', 'Read your address from your phone', { action: 'address' }),
          step('f-br-5', 'do', 'Skip baggage reclaim'),
          step('f-br-6', 'do', 'Green channel, doctor’s letter in your hand'),
          step('f-br-7', 'do', 'Go to the meeting spot you agreed with Jan', { action: 'meeting' }),
          iff('f-br-x1', 'Can’t see the disability line?', 'Ask staff.', 'Where is the disability line?'),
          iff('f-br-x2', 'I don’t understand the officer', 'That’s okay, it happens to everyone.', 'Sorry, could you say that again more slowly?'),
          iff('f-br-x3', 'No disability line?', 'Use the ePassport gate: photo page face down on the scanner, look at the camera.'),
          iff('f-br-x4', 'Can’t find Jan?', 'Stay in arrivals. Message him on the airport Wi-Fi, or ask the information desk.'),
        ] },
    ],
    help: [
      { q: 'I’m running late', a: 'Go straight to security and ask staff for help.' },
      { q: 'My phone is dying', a: 'Use the paper with Jan’s number. Ask the information desk to help you charge.' },
      { q: 'I missed boarding', a: 'Go to the Ryanair desk, then message Jan. It will be okay.' },
      { q: 'Delayed or cancelled', a: 'Check the Ryanair app and the screens. Ask staff about rebooking. Keep any receipts.' },
      { q: 'Emergency', a: 'Call 112 in Sweden or Denmark. Call 999 in the UK. Tell the nearest staff member.' },
    ],
  },

  // ───────────────────────────── SECTION 3 ─────────────────────────────
  {
    id: 'home', emoji: '🔁', title: 'Flight back', date: 'Mon 23 & Tue 24 Nov', short: 'Flight back',
    done: { title: 'Home sweet home 💜', text: 'You did the whole trip. Rest now, you earned it.' },
    parts: [
      { id: 'home-a', mode: 'prep', label: 'Mon 23 · Day before', order: ['h-checkin', 'h-pack', 'h-plan'] },
      { id: 'home-b', mode: 'journey', label: 'Tue 24 · Travel day', uk: true,
        times: [['🕚', '11:15', 'be at Bristol Airport'], ['🚪', '12:55', 'gate closes'], ['✈️', '13:25', 'flight FR745'], ['🛬', '16:25', 'land in Copenhagen']],
        timesAt: ['2026-11-24T11:15:00Z', '2026-11-24T12:55:00Z', '2026-11-24T13:25:00Z', '2026-11-24T16:25:00+01:00'] },
    ],
    groups: [
      { id: 'h-checkin', part: 'home-a', icon: '✈️', name: 'Check in', color: STAR.mint, badge: 'first', scene: 'suitcase', sign: 'Check in',
        steps: [
          step('h-ci-1', 'do', 'Set an alarm for 13:20'),
          step('h-ci-2', 'do', 'From about 13:25, check in on the Ryanair app', { opensAt: '2026-11-23T13:25:00Z', opensLabel: 'opens at 13:25 UK time' }),
          step('h-ci-3', 'do', 'Screenshot your boarding pass'),
          step('h-ci-4', 'do', 'Add it to your Wallet', { action: 'wallet' }),
        ] },
      { id: 'h-pack', part: 'home-a', icon: '🎒', name: 'Pack', color: STAR.coral, scene: 'suitcase', sign: 'Packing',
        steps: [
          step('h-pa-1', 'do', 'Documents pouch: passport, Mastercard, doctor’s letter, Schengen certificate, medicines in original boxes'),
          step('h-pa-2', 'do', 'Liquids in one clear 1-litre bag'),
          step('h-pa-3', 'do', 'Pack chewing gum'),
          step('h-pa-4', 'do', 'Travel plush ready'),
          step('h-pa-5', 'do', 'Charge phone and headphones'),
        ] },
      { id: 'h-plan', part: 'home-a', icon: '⏰', name: 'Plan tomorrow', color: STAR.lavender, scene: 'suitcase', sign: 'Tomorrow',
        steps: [
          step('h-pl-1', 'do', 'Agree with Jan what time you leave for the airport'),
          step('h-pl-2', 'do', 'Set alarms for the morning'),
        ] },
      { id: 'h-tobristol', part: 'home-b', icon: '🚗', name: 'Get to Bristol Airport', time: 'by 11:15', color: STAR.sky, scene: 'airport', sign: 'Bristol Airport',
        steps: [
          step('h-tb-1', 'do', 'Leave at the time you agreed with Jan'),
          step('h-tb-2', 'do', 'You already checked in on the app ✓ Go to Security'),
        ] },
      { id: 'h-atbristol', part: 'home-b', icon: '🛃', name: 'At Bristol', color: STAR.peach, scene: 'airport', sign: 'Security',
        steps: [
          step('h-ab-1', 'do', 'Security: liquid bag on top, jacket off, pockets empty'),
          step('h-ab-2', 'do', 'Ask about your plush', { say: 'This is my comfort toy. Please can he go through gently?' }),
          step('h-ab-3', 'do', 'Find a screen: FR745 / Copenhagen / 13:25'),
          step('h-ab-4', 'do', 'Walk to the gate it shows'),
          step('h-ab-5', 'calm', 'Wait at the gate: back to a wall, headphones on, plush in your arms'),
          step('h-ab-6', 'do', 'Boarding pass on phone, passport in hand', { action: 'wallet' }),
          iff('h-ab-x1', 'I need help at Bristol', 'Go to OCS reception, opposite Ritazza in the departure concourse.'),
          iff('h-ab-x2', 'I’m lost', 'Ask anyone in uniform.', 'Excuse me, where is the gate for Copenhagen?'),
          iff('h-ab-x3', 'They want to check my bag', 'That’s normal. It doesn’t mean you did anything wrong.', 'I’m autistic and find this stressful. Please explain each step.'),
        ] },
      { id: 'h-plane', part: 'home-b', icon: '💺', name: 'On the plane', color: STAR.teal, scene: 'airport', sign: 'On the plane',
        steps: [
          step('h-pl2-1', 'do', 'Chew gum during take-off and landing'),
          step('h-pl2-2', 'calm', 'Headphones on, plush on your lap'),
          step('h-pl2-i', 'info', 'UK → Denmark: clocks go 1 hour forward.'),
          iff('h-pl2-x1', 'I’m panicking', 'Press the call button above your seat. Hold your plush and breathe slowly.', 'I’m feeling very anxious. Could you help me, please?'),
        ] },
      { id: 'h-cph', part: 'home-b', icon: '🇩🇰', name: 'At Copenhagen', time: '16:25', color: STAR.butter, scene: 'train', sign: 'To Lund',
        steps: [
          step('h-cp-1', 'do', 'Follow Arrivals → Passport Control'),
          step('h-cp-2', 'do', 'Nothing to collect at baggage, walk through the exit'),
          step('h-cp-3', 'do', 'Follow signs to the train station (basement of Terminal 3)'),
          step('h-cp-4', 'do', 'Buy a ticket to Lund (Skånetrafiken app on airport Wi-Fi, or the ticket machine)'),
          step('h-cp-5', 'do', 'Take a train towards Lund (check the screen says it stops at Lund C)'),
          iff('h-cp-x1', 'Not sure which train?', 'Ask anyone in uniform.', 'Which train goes to Lund?'),
        ] },
      { id: 'h-home', part: 'home-b', icon: '🏡', name: 'Home', color: STAR.rose, scene: 'suitcase', sign: 'Home',
        steps: [
          step('h-ho-1', 'calm', 'You’re home. Rest. 💜'),
        ] },
    ],
    help: [
      { q: 'I’m running late', a: 'Go straight to security and ask staff for help.' },
      { q: 'My phone is dying', a: 'Use the paper with Jan’s number. Ask the information desk to help you charge.' },
      { q: 'I missed boarding', a: 'Go to the Ryanair desk, then message Jan. It will be okay.' },
      { q: 'Delayed or cancelled', a: 'Check the Ryanair app and the screens. Ask staff about rebooking. Keep any receipts.' },
      { q: 'Emergency', a: 'Call 999 in the UK. Call 112 in Denmark or Sweden. Tell the nearest staff member.' },
    ],
  },
];

export const PRAISE = [
  'You’re doing amazing, {name}.',
  'I’m proud of you.',
  'Well done :)',
  'Look at all these stars!',
  'One step at a time. You’re doing it.',
  'That’s another one done 💜',
  'Tiny steps still count.',
  'You’re so brave.',
  'Look at you go!',
  'I’m right here with you.',
];

export const GROUP_DONE = [
  'A big star! I’m so proud of you, {name} 💜',
  'That whole group is done. Amazing!',
  'You finished it! Well done :)',
  'Look how far you’ve come.',
];

export const PET_LINES = ['That’s nice.', 'I’m right here.', 'Purrrr…', 'Thank you 💜', 'You’re my favourite.'];

export const isCheck = (s) => s.t === 'do' || s.t === 'calm';
