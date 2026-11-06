import { SECTIONS, PRAISE, GROUP_DONE, PET_LINES, OVERWHELM, isCheck } from './data.js';
import * as store from './storage.js';
import * as sfx from './audio.js';
import { askCat, offlineReply, status as aiStatus, CONNECTOR } from './ai.js';

// ═════════════════════════ helpers ═════════════════════════
const $ = (sel, root = document) => root.querySelector(sel);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v; // only ever used with our own static markup
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}
const hash = (s) => { let x = 2166136261; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmt = (d, tz) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(d);
const dayIn = (d, tz = 'Europe/Stockholm') => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
const fmtWhen = (ts) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));

// ═════════════════════════ state ═════════════════════════
const state = store.load();
state.celebrated ||= {};
let tab = 'today';
const ui = { showDone: false, ifOpen: false, timesOpen: false, shown: new Set(), tickCount: 0, nextBubbleAt: 3, finOpen: {} };
const save = () => store.save(state);

const SVG = {};
async function loadAssets() {
  const names = ['cloud-cat', 'running-cat', 'scene-suitcase', 'scene-train', 'scene-airport', 'star'];
  await Promise.all(names.map(async (n) => {
    try { SVG[n] = window.__INLINE_SVG?.[n] ?? await (await fetch(`assets/${n}.svg`)).text(); } catch { SVG[n] = '<svg xmlns="http://www.w3.org/2000/svg"/>'; }
  }));
  // Star → reusable <symbol>, recoloured with currentColor.
  const doc = new DOMParser().parseFromString(SVG.star, 'image/svg+xml').documentElement;
  const vb = doc.getAttribute('viewBox') || '0 0 64 64';
  $('#sprite').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><symbol id="star-sym" viewBox="${vb}">${doc.innerHTML}</symbol></svg>`;
}
function svgEl(name) {
  const doc = new DOMParser().parseFromString(SVG[name], 'image/svg+xml');
  const el = document.importNode(doc.documentElement, true);
  el.removeAttribute('width'); el.removeAttribute('height');
  el.setAttribute('aria-hidden', 'true');
  return el;
}
const starSvg = (color) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 64 64'); s.style.color = color;
  const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  u.setAttribute('href', '#star-sym'); s.append(u); return s;
};

// ═════════════════════════ derived data ═════════════════════════
const sec = () => SECTIONS.find((s) => s.id === state.section) || SECTIONS[0];
const groupsOf = (s, partId) => s.groups.filter((g) => !partId || g.part === partId);
const checks = (g) => g.steps.filter(isCheck);
const isTicked = (st) => !!state.ticks[st.id];
const groupDone = (g) => checks(g).every(isTicked);
const findGroup = (id) => { for (const s of SECTIONS) for (const g of s.groups) if (g.id === id) return [s, g]; return []; };
function sectionProgress(s) {
  const all = s.groups.flatMap(checks);
  const done = all.filter(isTicked).length;
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
}
function currentPart(s) {
  if (s.parts.length === 1) return s.parts[0];
  const chosen = s.parts.find((p) => p.id === state.part[s.id]);
  if (chosen) return chosen;
  const first = s.parts[0];
  const firstDone = groupsOf(s, first.id).every((g) => groupDone(g) || state.skipped[g.id]);
  return (firstDone || dayIn(new Date()) >= '2026-11-24') ? s.parts[1] : first;
}
function currentStage(s, part) {
  const gs = groupsOf(s, part.id);
  const manual = gs.find((g) => g.id === state.stage[part.id]);
  if (manual && !groupDone(manual)) return manual;
  return gs.find((g) => !groupDone(g)) || null;
}
function currentGroup() {
  const s = sec(); const part = currentPart(s);
  if (part.mode === 'journey') return currentStage(s, part);
  return s.groups.find((g) => g.id === state.active[s.id]) || null;
}
const isLocked = (st) => !!st.opensAt && !isTicked(st) && Date.now() < new Date(st.opensAt).getTime();
const nextStep = (g) => checks(g).find((x) => !isTicked(x));
// The most sensible group to do next: follows the part's `order`, skips finished,
// skipped-for-later and "can't do this yet" (time-locked) groups.
function nextLogical(s, part, excludeId) {
  const ids = part.order || groupsOf(s, part.id).map((g) => g.id);
  const gs = ids.map((id) => s.groups.find((g) => g.id === id)).filter(Boolean);
  const open = gs.filter((g) => g.id !== excludeId && !groupDone(g) && !state.skipped[g.id]);
  return open.find((g) => !isLocked(nextStep(g))) || open[0] || null;
}
const partStarted = (s, part) => groupsOf(s, part.id).some((g) => state.groupDone[g.id] || checks(g).some(isTicked));
function startGroup(s, g) {
  state.active[s.id] = g.id; ui.showDone = false; ui.ifOpen = false; ui.shown.clear(); save();
}

function suggestedSection() {
  const d = dayIn(new Date());
  if (d >= '2026-11-23') return 'home';
  if (d >= '2026-11-10') return 'flight';
  return 'prep';
}

// ═════════════════════════ sky, cat & progress ═════════════════════════
let catSvg;
function renderHeader() {
  const s = sec();
  $('#title').textContent = s.title;
  $('#subtitle').textContent = s.date;
  $('#progressWrap').hidden = tab !== 'today';
  const pills = $('#sectionPills');
  pills.replaceChildren(...SECTIONS.map((x) => h('button', {
    class: x.id === s.id ? 'on' : '', 'aria-pressed': String(x.id === s.id),
    onclick: () => { if (state.section === x.id) return; sfx.softTap(); state.section = x.id; ui.shown.clear(); save(); renderAll(); },
  }, `${x.emoji} ${x.short}`)));
  renderStars();
  updateProgress(false);
}

function starPos(id, big) {
  const v = hash(id + (big ? '*' : ''));
  const side = v & 1;
  const x = side ? 68 + ((v >> 1) % 28) : 4 + ((v >> 1) % 28);
  const y = 48 + ((v >> 7) % (big ? 70 : 92));
  return { x, y };
}
function addStar(id, color, big, animate) {
  const layer = $('#stars');
  const { x, y } = starPos(id, big);
  const el = h('span', { class: `star${big ? ' big' : ''}`, 'data-id': id, style: { left: `${x}%`, top: `${y}px`, animationDelay: `${(hash(id) % 3000) / 1000}s` } });
  el.append(starSvg(color));
  layer.append(el);
  if (!animate || document.body.classList.contains('reduce-motion')) { el.classList.add('settled'); return; }
  const sky = $('#sky').getBoundingClientRect();
  const cat = $('#cloudcat').getBoundingClientRect();
  const sx = cat.left + cat.width * 0.47 - sky.left; const sy = cat.top + cat.height * 0.5 - sky.top;
  const tx = (x / 100) * sky.width; const ty = y;
  const dx = sx - tx; const dy = sy - ty;
  el.animate([
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.2)`, opacity: 0 },
    { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 40}px)) scale(${big ? 1.8 : 1.4})`, opacity: 1, offset: 0.55 },
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
  ], { duration: big ? 1300 : 900, easing: 'cubic-bezier(.3,.9,.4,1)' }).onfinish = () => el.classList.add('settled');
}
function renderStars() {
  const layer = $('#stars'); layer.replaceChildren();
  const s = sec();
  for (const g of s.groups) {
    for (const st of checks(g)) if (isTicked(st)) addStar(st.id, g.color, false, false);
    if (state.groupDone[g.id]) addStar(g.id, g.color, true, false);
  }
}

function updateProgress() {
  const { pct } = sectionProgress(sec());
  $('#fill').style.width = `${pct}%`;
  $('#pct').textContent = `${pct}%`;
  $('#progress').setAttribute('aria-valuenow', pct);
  $('#progress').setAttribute('aria-label', `${sec().title}: ${pct}% done`);
  $('#runner').style.left = `max(20px, calc((100% - 46px) * ${pct / 100}))`;
}
function sprint() {
  const r = $('#runner');
  r.classList.add('sprint');
  clearTimeout(sprint.t); sprint.t = setTimeout(() => r.classList.remove('sprint'), 1500);
}
function meowAnim() {
  catSvg.classList.add('meow');
  clearTimeout(meowAnim.t); meowAnim.t = setTimeout(() => catSvg.classList.remove('meow'), 800);
}
function bubble(text, ms = 3200) {
  const b = $('#bubble');
  b.textContent = text.replaceAll('{name}', state.settings.name || 'baby');
  b.classList.add('show');
  clearTimeout(bubble.t); bubble.t = setTimeout(() => b.classList.remove('show'), ms);
}
let lastPraise = '';
function maybePraise() {
  const f = state.settings.bubbles;
  if (f === 'off') return;
  ui.tickCount++;
  if (ui.tickCount < ui.nextBubbleAt) return;
  const gap = { often: 2, sometimes: 3 + Math.round(Math.random()), rarely: 8 }[f] || 4;
  ui.nextBubbleAt = ui.tickCount + gap;
  let line; do { line = pick(PRAISE); } while (line === lastPraise);
  lastPraise = line; bubble(line);
}

// ═════════════════════════ ticking ═════════════════════════
function toggleStep(s, g, st, checkBtn) {
  sfx.unlock();
  if (isTicked(st)) {
    delete state.ticks[st.id];
    delete state.groupDone[g.id];
    save(); renderStars(); updateProgress(); renderView();
    return;
  }
  state.ticks[st.id] = Date.now();
  save();
  checkBtn?.classList.add('squish');
  checkBtn?.closest('.step')?.classList.add('done');
  checkBtn?.setAttribute('aria-pressed', 'true');
  sfx.tick();
  sprint();
  updateProgress();
  setTimeout(() => { meowAnim(); sfx.meow(); }, 140);
  setTimeout(() => { sfx.burp(); addStar(st.id, g.color, false, true); }, 420);

  const finishedGroup = groupDone(g) && !state.groupDone[g.id];
  if (finishedGroup) {
    state.groupDone[g.id] = Date.now();
    delete state.skipped[g.id];
    save();
    setTimeout(() => { sfx.chime(); addStar(g.id, g.color, true, true); if (state.settings.bubbles !== 'off') bubble(pick(GROUP_DONE), 3800); }, 1000);
    setTimeout(() => {
      const part = currentPart(s);
      if (part.mode === 'prep') state.active[s.id] = null; else state.stage[part.id] = null;
      ui.showDone = false; ui.ifOpen = false;
      save(); renderView(); window.scrollTo({ top: 0, behavior: 'smooth' });
      maybeCelebrate(s);
    }, 2300);
  } else {
    maybePraise();
    setTimeout(renderView, 520);
  }
}
function maybeCelebrate(s) {
  if (state.celebrated[s.id] || !s.groups.every(groupDone)) return;
  state.celebrated[s.id] = true; save();
  sfx.chime();
  const node = h('div', { class: 'celebrate' },
    h('div', { class: 'constellation' }, s.groups.map((g, i) => { const sp = h('span', { style: { animationDelay: `${i * 0.08}s` } }); sp.append(starSvg(g.color)); return sp; })),
    h('h2', {}, s.done.title), h('p', {}, s.done.text),
    h('button', { class: 'btn primary', onclick: closeOverlay }, '💜 Thank you'));
  openOverlay(node, 'center');
}

// ═════════════════════════ views ═════════════════════════
function renderAll() { renderHeader(); renderView(); }
function renderView() {
  const view = $('#view');
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('#progressWrap').hidden = tab !== 'today';
  const content = { today: viewToday, finished: viewFinished, wallet: viewWallet, settings: viewSettings }[tab]();
  view.replaceChildren(...[content].flat());
}

function viewToday() {
  const s = sec(); const part = currentPart(s);
  const out = [];
  if (s.parts.length > 1) {
    out.push(h('div', { class: 'parts', role: 'tablist' }, s.parts.map((p) => h('button', {
      class: p.id === part.id ? 'on' : '', role: 'tab', 'aria-selected': String(p.id === part.id),
      onclick: () => { sfx.softTap(); state.part[s.id] = p.id; save(); renderView(); },
    }, p.label))));
  }
  if (part.mode === 'prep') {
    let g = s.groups.find((x) => x.id === state.active[s.id] && x.part === part.id);
    if (!g && !partStarted(s, part)) { g = nextLogical(s, part); if (g) startGroup(s, g); }
    out.push(...(g ? viewGroup(s, part, g, false) : viewPicker(s, part)));
  } else {
    out.push(viewTimes(part));
    const g = currentStage(s, part);
    if (g) {
      out.push(...viewGroup(s, part, g, true));
      out.push(h('button', { class: 'calm-pill', onclick: openOverwhelm }, '💜 I’m overwhelmed'));
    } else out.push(viewDoneCard(s, groupsOf(s, part.id)));
  }
  return out;
}

function viewPicker(s, part) {
  const gs = groupsOf(s, part.id);
  const active = gs.filter((g) => !state.skipped[g.id] || groupDone(g));
  const later = gs.filter((g) => state.skipped[g.id] && !groupDone(g));
  const anyDone = gs.some(groupDone);
  const remaining = active.filter((g) => !groupDone(g));
  const out = [];
  if (!remaining.length) {
    out.push(viewDoneCard(s, gs));
  } else {
    out.push(h('div', { class: 'picker-ask' }, 'What next?'));
  }
  const grid = h('div', { class: 'picker' });
  let lastHeading = null; let i = 0;
  const ordered = [...active.filter((g) => g.badge === 'first' && !groupDone(g)), ...active.filter((g) => !(g.badge === 'first' && !groupDone(g)))];
  for (const g of ordered) {
    if (g.heading && g.heading !== lastHeading) { grid.append(h('div', { class: 'h3', style: { gridColumn: '1 / -1', margin: '8px 4px 0' } }, `${g.heading} · bonus`)); }
    lastHeading = g.heading || null;
    grid.append(groupCard(s, g, i++));
  }
  if (remaining.length || active.length) out.push(grid);
  if (later.length) {
    out.push(h('div', { class: 'h3' }, 'Later · no rush'));
    const lg = h('div', { class: 'picker' });
    later.forEach((g) => lg.append(groupCard(s, g, i++)));
    out.push(lg);
  }
  return out;
}
function groupCard(s, g, i) {
  const n = checks(g).length; const d = checks(g).filter(isTicked).length; const done = groupDone(g);
  const dot = h('span', { class: 'gdot' });
  if (done) dot.append(starSvg(g.color)); else dot.innerHTML = `<svg viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" fill="${g.color}" stroke="#3D2B66" stroke-width="2.5"/></svg>`;
  const cls = ['gcard', g.badge === 'first' && !done ? 'first' : '', g.badge === 'bonus' ? 'bonus' : '', done ? 'done' : ''].join(' ');
  return h('button', {
    class: cls, style: { animationDelay: `${i * 0.04}s` },
    'aria-label': `${g.name}, ${done ? 'finished' : `${d} of ${n} done`}`,
    onclick: () => { sfx.softTap(); delete state.skipped[g.id]; state.active[s.id] = g.id; ui.showDone = false; ui.ifOpen = false; ui.shown.clear(); save(); renderView(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  },
  h('span', { class: 'gicon' }, g.icon),
  h('span', {},
    g.badge === 'first' && !done ? h('span', { class: 'badge' }, 'DO FIRST') : null,
    h('span', { class: 'gname', style: { display: 'block' } }, g.name),
    h('span', { class: 'gmeta' }, done ? 'Finished ✓' : d ? `${d} of ${n} done` : `${n} little step${n > 1 ? 's' : ''}`)),
  dot);
}

function viewScene(g) {
  const wrap = h('div', { class: 'scene' });
  const el = svgEl(`scene-${g.scene}`);
  const t = el.querySelector('#sign-text');
  if (t) {
    t.textContent = g.sign || g.name;
    requestAnimationFrame(() => { // squeeze long signs to fit
      try {
        const max = g.scene === 'airport' ? 168 : 184;
        if (t.getComputedTextLength() > max) { t.setAttribute('textLength', max); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      } catch { /* not rendered yet */ }
    });
  }
  wrap.append(el);
  return wrap;
}

function viewGroup(s, part, g, journey) {
  const out = [];
  const cs = checks(g); const doneN = cs.filter(isTicked).length; const done = doneN === cs.length;
  if (!journey) {
    const canChoose = groupsOf(s, part.id).some((x) => state.groupDone[x.id]);
    out.push(h('div', { class: 'topbar' },
      canChoose ? h('button', { class: 'link', onclick: () => { sfx.softTap(); state.active[s.id] = null; save(); renderView(); } }, '← Choose a different one') : h('span'),
      !done && g.badge !== 'first' ? h('button', { class: 'link', onclick: () => {
        sfx.softTap(); state.skipped[g.id] = true; state.active[s.id] = null; save(); renderView();
        bubble('That’s okay, we can come back to it 💜');
      } }, 'Skip for now') : null));
  } else {
    const gs = groupsOf(s, part.id); const idx = gs.indexOf(g);
    out.push(h('div', { class: 'topbar' },
      h('span', { class: 'nextup' }, `Next up · Stage ${idx + 1} of ${gs.length}`),
      h('button', { class: 'link', onclick: () => openStages(s, part) }, 'All stages ▾')));
  }
  out.push(viewScene(g));
  const stepNo = Math.min(doneN + 1, cs.length);
  out.push(h('div', { class: 'gtitle' },
    h('h2', {}, `${g.icon} ${g.name}`),
    h('span', { class: 'of' }, done ? 'All done ✓' : `Step ${stepNo} of ${cs.length}`)));
  if (g.time) out.push(h('p', { class: 'gintro' }, `🕐 ${g.time}`));
  if (g.intro) out.push(h('p', { class: 'gintro' }, g.intro));

  // which steps are visible
  const N = Number(state.settings.stepsVisible) || 0;
  const unticked = cs.filter((st) => !isTicked(st));
  const visible = new Set(N ? unticked.slice(0, N).map((x) => x.id) : unticked.map((x) => x.id));
  const lastVisIdx = Math.max(-1, ...g.steps.map((st, i) => (visible.has(st.id) ? i : -1)));
  const showAllTicked = ui.showDone || N === 0;

  if (doneN && N !== 0) {
    out.push(h('div', { class: 'donebar' },
      h('span', {}, `✓ ${doneN} done`),
      h('button', { class: 'link', onclick: () => { ui.showDone = !ui.showDone; renderView(); } }, ui.showDone ? 'Hide' : 'Show')));
  }
  const list = h('ul', { class: 'steps' });
  g.steps.forEach((st, i) => {
    if (st.t === 'if') return;
    if (st.t === 'info') {
      if (i <= lastVisIdx || (!unticked.length)) list.append(h('li', { class: 'note' }, st.text));
      return;
    }
    const ticked = isTicked(st);
    if (ticked ? !showAllTicked : !visible.has(st.id)) return;
    list.append(stepItem(s, g, st));
  });
  out.push(list);
  if (!journey) {
    const nx = nextStep(g);
    if (nx && isLocked(nx)) {
      const alt = nextLogical(s, part, g.id);
      out.push(h('div', { class: 'card', style: { textAlign: 'center' } },
        h('p', { style: { fontWeight: 800, margin: '2px 0 12px' } }, `🕐 This one ${nx.opensLabel}.`),
        alt ? h('button', { class: 'btn primary', onclick: () => { sfx.softTap(); startGroup(s, alt); renderView(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, `Do ${alt.icon} ${alt.name} until then`) : null));
    }
  }
  if (!unticked.length && !journey) {
    out.push(h('div', { class: 'card', style: { textAlign: 'center' } },
      h('p', { style: { fontWeight: 900, fontSize: '1.15rem', margin: '4px 0 12px' } }, 'This group is finished ⭐'),
      h('button', { class: 'btn primary', onclick: () => { state.active[s.id] = null; save(); renderView(); } }, 'Choose the next one')));
  }

  const ifs = g.steps.filter((st) => st.t === 'if');
  if (ifs.length) {
    out.push(h('div', { class: 'ifbox' },
      h('button', { 'aria-expanded': String(ui.ifOpen), onclick: () => { sfx.softTap(); ui.ifOpen = !ui.ifOpen; renderView(); } },
        h('span', {}, 'If something goes differently'), h('span', {}, ui.ifOpen ? '▴' : '▾')),
      ui.ifOpen ? h('div', { class: 'ifs' }, ifs.map((x) => h('div', { class: 'ifitem' }, h('b', {}, x.q), x.a, x.say ? sayCard(x.say) : null))) : null));
  }
  if (journey) {
    const gs = groupsOf(s, part.id); const nxt = gs.slice(gs.indexOf(g) + 1).find((x) => !groupDone(x));
    out.push(h('p', { class: 'after' }, nxt ? `After this: ${nxt.icon} ${nxt.name}` : 'This is the last stage 💜'));
  }
  return out;
}

function stepItem(s, g, st) {
  const ticked = isTicked(st);
  const isNew = !ui.shown.has(st.id); ui.shown.add(st.id);
  const btn = h('button', { class: 'check', 'aria-pressed': String(ticked), 'aria-label': `${ticked ? 'Done' : 'Mark done'}: ${st.text}` });
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  btn.addEventListener('click', () => toggleStep(s, g, st, btn));
  const txt = h('div', { class: 'txt' }, h('div', { class: 'main' }, st.text));
  if (st.chips) txt.append(h('div', { class: 'chips' }, st.chips.map((c) => h('span', { class: 'chip' }, `⏰ ${c}`))));
  if (st.detail) txt.append(h('div', { class: 'detail' }, st.detail));
  if (st.opensAt && !ticked && Date.now() < new Date(st.opensAt).getTime()) txt.append(h('span', { class: 'opens' }, `🕐 ${st.opensLabel}`));
  if (st.say) txt.append(sayCard(st.say));
  if (st.action === 'wallet') txt.append(h('div', { class: 'mini-actions' }, h('button', { class: 'btn small soft', onclick: () => go('wallet') }, '🎫 Open Wallet')));
  if (st.action === 'address') txt.append(h('div', { class: 'mini-actions' }, h('button', { class: 'btn small soft', onclick: () => state.info.address ? bigSay(state.info.address, 'My address in the UK') : go('wallet') }, '🏠 Show my address big')));
  if (st.action === 'meeting' && state.info.meeting) txt.append(h('div', { class: 'detail' }, `📍 ${state.info.meeting}`));
  if (st.action === 'trainInfo') {
    txt.append(h('div', { class: 'inline-fields' },
      h('input', { type: 'text', placeholder: 'Train time', value: state.info.trainTime, 'aria-label': 'Train time', oninput: (e) => { state.info.trainTime = e.target.value; save(); } }),
      h('input', { type: 'text', placeholder: 'Platform', value: state.info.platform, 'aria-label': 'Platform', oninput: (e) => { state.info.platform = e.target.value; save(); } })));
  }
  if (g.id === 'f-lund' && st.id === 'f-lu-2' && (state.info.trainTime || state.info.platform)) {
    txt.append(h('div', { class: 'detail' }, `🚆 ${state.info.trainTime || ''}  ·  Platform ${state.info.platform || '?'}`));
  }
  return h('li', { class: `step t-${st.t}${ticked ? ' done' : ''}${isNew ? ' enter' : ''}` }, btn, txt);
}

function sayCard(text) {
  return h('button', { class: 'say', onclick: () => bigSay(text) },
    h('span', {}, '💬'), h('span', {}, h('span', { class: 'lbl' }, 'Say this · tap to make big'), `“${text}”`));
}

function viewTimes(part) {
  const now = Date.now();
  const nextIdx = part.timesAt.findIndex((t) => new Date(t).getTime() > now);
  const se = fmt(new Date(), 'Europe/Stockholm'); const uk = fmt(new Date(), 'Europe/London');
  const g = currentGroup();
  const clock = (part.uk || g?.ukTime) && !(g?.id === 'h-cph') ? `🇬🇧 ${uk} · 🇸🇪 ${se}` : `🇸🇪 ${se} · 🇬🇧 ${uk}`;
  const head = nextIdx >= 0 ? `${part.times[nextIdx][0]} ${part.times[nextIdx][1]} ${part.times[nextIdx][2]}` : 'All key times done';
  const box = h('div', { class: 'timestrip', id: 'timestrip' },
    h('button', { 'aria-expanded': String(ui.timesOpen), onclick: () => { ui.timesOpen = !ui.timesOpen; sfx.softTap(); renderView(); } },
      h('span', {}, ui.timesOpen ? 'The times that matter' : head), h('span', { class: 'clock' }, `${clock} ${ui.timesOpen ? '▴' : '▾'}`)));
  if (ui.timesOpen) {
    box.append(h('ul', {}, part.times.map(([e, t, l], i) => h('li', { class: new Date(part.timesAt[i]).getTime() < now ? 'past' : '' }, h('span', {}, e), h('b', {}, t), h('span', {}, l)))));
  }
  if (state.settings.countdowns && nextIdx >= 0) {
    const mins = Math.round((new Date(part.timesAt[nextIdx]).getTime() - now) / 60000);
    const hh = Math.floor(mins / 60); const mm = mins % 60;
    box.append(h('div', { class: 'countdown' }, `${part.times[nextIdx][2]} in ${hh ? `${hh} h ` : ''}${mm} min`));
  }
  return box;
}

function viewDoneCard(s, gs) {
  const card = h('div', { class: 'card donecard' },
    h('div', { class: 'constellation' }, gs.filter(groupDone).map((g, i) => { const sp = h('span', { style: { animationDelay: `${i * 0.06}s` } }); sp.append(starSvg(g.color)); return sp; })),
    h('div', { class: 'big' }, s.done.title), h('p', { class: 'muted' }, s.done.text));
  const later = gs.filter((g) => state.skipped[g.id] && !groupDone(g));
  if (later.length) card.append(h('p', { class: 'muted', style: { fontSize: '.92rem' } }, `${later.length} bonus group${later.length > 1 ? 's are' : ' is'} waiting under “Later” if you ever want them. No pressure.`));
  return card;
}

function openStages(s, part) {
  const gs = groupsOf(s, part.id); const cur = currentStage(s, part);
  const list = h('div', { class: 'helplist' }, gs.map((g, i) => h('button', {
    class: `helpbtn${g === cur ? ' calm' : ''}`,
    onclick: () => { state.stage[part.id] = g.id; ui.ifOpen = false; ui.shown.clear(); save(); closeOverlay(); renderView(); window.scrollTo({ top: 0 }); },
  }, `${groupDone(g) ? '⭐' : g === cur ? '👉' : '○'}  ${i + 1}. ${g.icon} ${g.name}${g.time ? ` · ${g.time}` : ''}`)));
  openSheet('All stages', list);
}

// ═════════════════════════ Finished tab ═════════════════════════
function viewFinished() {
  const totalSteps = Object.keys(state.ticks).length;
  const big = Object.keys(state.groupDone).length;
  const out = [
    h('p', { class: 'h2' }, totalSteps ? `You’ve done ${totalSteps} thing${totalSteps > 1 ? 's' : ''} 💜` : 'Your finished things will live here 💜'),
    h('div', { class: 'stat' }, h('div', {}, h('b', {}, totalSteps), 'little stars'), h('div', {}, h('b', {}, big), 'big stars'), h('div', {}, h('b', {}, `${sectionProgress(sec()).pct}%`), sec().short)),
  ];
  for (const s of SECTIONS) {
    const done = s.groups.filter((g) => state.groupDone[g.id] && groupDone(g));
    const partial = s.groups.filter((g) => !groupDone(g) && checks(g).some(isTicked));
    const box = h('div', { class: 'fin-section' }, h('div', { class: 'h3' }, `${s.emoji} ${s.title} · ${sectionProgress(s).pct}%`));
    if (!done.length && !partial.length) { box.append(h('p', { class: 'muted', style: { margin: '4px' } }, 'Nothing here yet, and that’s okay.')); out.push(box); continue; }
    if (done.length) box.append(h('div', { class: 'constellation', style: { justifyContent: 'flex-start' } }, done.map((g) => { const sp = h('span'); sp.append(starSvg(g.color)); return sp; })));
    for (const g of [...done, ...partial]) {
      const st = h('span', { class: 's' }); st.append(starSvg(groupDone(g) ? g.color : '#E3D9FA'));
      const open = ui.finOpen[g.id];
      box.append(h('button', { class: 'fin-group', 'aria-expanded': String(!!open), onclick: () => { ui.finOpen[g.id] = !open; renderView(); } },
        st, h('span', { style: { flex: 1 } }, h('b', {}, `${g.icon} ${g.name}`), h('br'), h('small', { class: 'muted' }, groupDone(g) ? `Finished ${fmtWhen(state.groupDone[g.id])}` : `${checks(g).filter(isTicked).length} of ${checks(g).length} done`)), open ? '▴' : '▾'));
      if (open) {
        box.append(h('ul', { class: 'fin-steps' }, checks(g).map((x) => h('li', {},
          h('button', { class: 'chip', onclick: () => { if (isTicked(x)) { delete state.ticks[x.id]; delete state.groupDone[g.id]; } else state.ticks[x.id] = Date.now(); save(); renderStars(); updateProgress(); renderView(); } }, isTicked(x) ? '✓' : '○'),
          h('span', { class: isTicked(x) ? '' : 'muted' }, x.text)))));
        box.append(h('button', { class: 'btn small soft', style: { marginBottom: '8px' }, onclick: () => {
          state.section = s.id; const part = s.parts.find((p) => p.id === g.part);
          state.part[s.id] = part.id;
          if (part.mode === 'prep') state.active[s.id] = g.id; else state.stage[part.id] = g.id;
          save(); go('today'); renderHeader();
        } }, '↺ Open this group'));
      }
    }
    out.push(box);
  }
  return out;
}

// ═════════════════════════ Wallet tab ═════════════════════════
let objectUrls = [];
function viewWallet() {
  objectUrls.forEach(URL.revokeObjectURL); objectUrls = [];
  const grid = h('div', { class: 'tickets' });
  for (const f of state.files) {
    const thumb = h('div', { class: 'thumb' }, f.type.startsWith('image/') ? '' : '📄');
    if (f.type.startsWith('image/')) store.getFile(f.id).catch(() => null).then((blob) => { if (!blob) return; const u = URL.createObjectURL(blob); objectUrls.push(u); thumb.append(h('img', { src: u, alt: '' })); });
    grid.append(h('div', { class: 'ticket' },
      h('button', { onclick: () => openFile(f), 'aria-label': `Open ${f.label}` }, thumb),
      h('div', { class: 'tl' }, h('input', { type: 'text', value: f.label, 'aria-label': 'Ticket name', oninput: (e) => { f.label = e.target.value; save(); } })),
      h('div', { class: 'tact' },
        h('button', { class: 'link', onclick: () => openFile(f) }, 'Open'),
        h('button', { class: 'link', onclick: () => confirmSheet(`Remove “${f.label}”?`, 'Remove', async () => { await store.delFile(f.id).catch(() => {}); state.files = state.files.filter((x) => x !== f); save(); renderView(); }) }, 'Remove'))));
  }
  const input = h('input', { type: 'file', accept: 'image/*,application/pdf', hidden: true, onchange: async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const id = `f${Date.now()}`;
    try {
      await store.putFile(id, file);
      state.files.push({ id, label: file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Ticket', type: file.type || 'application/octet-stream', addedAt: Date.now() });
      save(); renderView(); toast('Saved on this phone ✓ Works offline too');
    } catch { toast('Sorry, that file couldn’t be saved.'); }
  } });
  grid.append(h('button', { class: 'addticket', onclick: () => input.click() }, h('span', {}, '＋', h('br'), 'Add a ticket', h('br'), h('small', { class: 'muted' }, 'photo, screenshot or PDF'))));

  const i = state.info;
  const field = (label, key, attrs = {}) => h('label', { class: 'field' }, h('span', {}, label),
    h(attrs.textarea ? 'textarea' : 'input', { type: attrs.type || 'text', rows: 3, placeholder: attrs.ph || '', oninput: (e) => { i[key] = e.target.value; save(); }, ...(attrs.textarea ? {} : { value: i[key] }) }, attrs.textarea ? i[key] : null));
  return [
    h('p', { class: 'h2' }, '🎫 Tickets'),
    h('p', { class: 'muted', style: { margin: '0 2px 10px' } }, 'Everything here stays on this phone and works without internet.'),
    grid, input,
    h('p', { class: 'h2' }, '💜 Key info'),
    h('div', { class: 'infocard' }, field('Jan’s number', 'jan', { type: 'tel', ph: '+44 …' }),
      h('div', { class: 'mini-actions' },
        i.jan ? h('a', { class: 'btn small soft', href: `tel:${i.jan.replace(/[^\d+]/g, '')}` }, '📞 Call') : null,
        h('button', { class: 'btn small soft', onclick: () => copy(i.jan) }, '📋 Copy'),
        h('button', { class: 'btn small soft', onclick: () => i.jan && bigSay(i.jan, 'Jan’s number') }, '🔎 Big'))),
    h('div', { class: 'infocard' }, field('My UK address', 'address', { textarea: true, ph: 'House, street, town, postcode' }),
      h('div', { class: 'mini-actions' }, h('button', { class: 'btn small soft', onclick: () => i.address && bigSay(i.address, 'My address in the UK') }, '🛂 Show to officer'))),
    h('div', { class: 'infocard' }, field('Meeting spot with Jan', 'meeting', { ph: 'e.g. by the Costa in arrivals' })),
    h('div', { class: 'infocard' }, h('div', { class: 'inline-fields', style: { marginTop: 0 } },
      field('Train time', 'trainTime', { ph: '08:45' }), field('Platform', 'platform', { ph: '1' })),
    field('Seat', 'seat', { ph: '14C' })),
  ];
}
async function openFile(f) {
  const blob = await store.getFile(f.id).catch(() => null);
  if (!blob) return toast('That file couldn’t be opened. Try adding it again.');
  const url = URL.createObjectURL(blob);
  const body = f.type.startsWith('image/') ? h('img', { src: url, alt: f.label }) : h('iframe', { src: url, title: f.label });
  const v = h('div', { class: 'viewer', role: 'dialog', 'aria-label': f.label },
    h('div', { class: 'vbar' }, h('span', {}, `☀️ Turn your brightness up · ${f.label}`),
      h('span', { class: 'row' }, f.type.startsWith('image/') ? null : h('a', { class: 'btn small soft', href: url, target: '_blank', rel: 'noopener' }, 'Open'),
        h('button', { class: 'x', 'aria-label': 'Close', onclick: () => { v.remove(); URL.revokeObjectURL(url); } }, '✕'))),
    h('div', { class: 'vbody' }, body));
  document.body.append(v);
}

// ═════════════════════════ Settings tab ═════════════════════════
function viewSettings() {
  const st = state.settings;
  const set = (k, v) => { st[k] = v; save(); applySettings(); renderView(); };
  const seg = (k, opts) => h('div', { class: 'seg' }, opts.map(([v, l]) => h('button', { class: String(st[k]) === String(v) ? 'on' : '', onclick: () => { sfx.softTap(); set(k, v); } }, l)));
  const tog = (k, l) => h('button', { class: 'toggle', role: 'switch', 'aria-checked': String(!!st[k]), onclick: () => { set(k, !st[k]); sfx.softTap(); } }, h('span', {}, l), h('span', { class: `switch${st[k] ? ' on' : ''}` }));
  const isCustom = ![1, 3, 0].includes(Number(st.stepsVisible));
  return [
    h('p', { class: 'h2' }, '⚙️ Settings'),
    h('div', { class: 'card' },
      h('b', {}, 'Show me'),
      h('div', { class: 'seg', style: { marginTop: '8px' } },
        [[1, '1 step'], [3, '3 steps'], [0, 'Whole group']].map(([v, l]) => h('button', { class: Number(st.stepsVisible) === v && !isCustom ? 'on' : '', onclick: () => set('stepsVisible', v) }, l)),
        h('button', { class: isCustom ? 'on' : '', onclick: () => set('stepsVisible', 5) }, 'Custom')),
      isCustom ? h('label', { class: 'field' }, h('span', {}, `${st.stepsVisible} steps at a time`),
        h('input', { type: 'range', min: 1, max: 10, value: st.stepsVisible, oninput: (e) => { st.stepsVisible = Number(e.target.value); save(); e.target.previousSibling.textContent = `${st.stepsVisible} steps at a time`; } })) : null),
    h('div', { class: 'card' },
      h('b', {}, 'Sound'),
      h('label', { class: 'field' }, h('span', {}, 'Volume'), h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: st.volume, onchange: (e) => { st.volume = Number(e.target.value); save(); applySettings(); sfx.tick(); } })),
      tog('sTick', 'Tick sound'), tog('sMeow', 'Meows'), tog('sPurr', 'Purring'), tog('sChime', 'Big-star chime'), tog('haptics', 'Little vibrations')),
    h('div', { class: 'card' },
      h('b', {}, 'The cat'),
      h('label', { class: 'field' }, h('span', {}, 'Speech bubbles')),
      seg('bubbles', [['often', 'Often'], ['sometimes', 'Sometimes'], ['rarely', 'Rarely'], ['off', 'Off']]),
      h('label', { class: 'field' }, h('span', {}, 'What the cat calls you'), h('input', { type: 'text', value: st.name, oninput: (e) => { st.name = e.target.value; save(); } }))),
    h('div', { class: 'card' },
      h('b', {}, 'Look & feel'),
      tog('reduceMotion', 'Reduce motion'), tog('countdowns', 'Show countdowns on travel days'),
      h('label', { class: 'field' }, h('span', {}, 'Theme')), seg('theme', [['auto', '📱 Match phone'], ['day', '☁️ Day sky'], ['night', '🌙 Night sky']]),
      h('label', { class: 'field' }, h('span', {}, 'Text size')), seg('textSize', [[0.9, 'A−'], [1, 'A'], [1.15, 'A+'], [1.3, 'A++']])),
    h('div', { class: 'card' },
      h('b', {}, '💜 AI helper'),
      h('p', { class: 'muted', style: { fontSize: '.9rem' } }, window.__ARTIFACT ? `On this page the cat talks through your ChatGPT API using the “${CONNECTOR}” connector. Until that connector is added in claude.ai Settings → Connectors, Claude answers instead.` : 'Where the app reaches your GPT helper. Leave as /api/chat if you use the included server.'),
      window.__ARTIFACT ? null : h('label', { class: 'field' }, h('span', {}, 'Helper address'), h('input', { type: 'url', value: st.aiUrl, oninput: (e) => { st.aiUrl = e.target.value.trim(); save(); } })),
      window.__ARTIFACT ? null : h('label', { class: 'field' }, h('span', {}, 'Passcode'), h('input', { type: 'password', value: st.aiPass, oninput: (e) => { st.aiPass = e.target.value; save(); } })),
      h('button', { class: 'btn small soft', onclick: async (e) => {
        e.target.textContent = 'Checking…';
        try {
          await askCat([{ role: 'user', content: 'Say hi in five words.' }], buildContext(), st);
          e.target.textContent = !window.__ARTIFACT ? 'Connected ✓' : aiStatus.route === 'gpt' ? 'ChatGPT connected ✓' : `Claude answered (ChatGPT connector: ${aiStatus.reason || 'not set up'})`;
        } catch (err) { e.target.textContent = `Couldn’t connect (${err.message})`; }
      } }, 'Test connection')),
    h('div', { class: 'card' },
      h('b', {}, 'Backup'),
      h('p', { class: 'muted', style: { fontSize: '.9rem' } }, window.__ARTIFACT ? 'Progress saves by itself in this browser.' : 'Progress saves by itself. A backup file is extra safety (tickets aren’t included).'),
      h('div', { class: 'mini-actions' },
        window.__ARTIFACT ? null : h('button', { class: 'btn small soft', onclick: exportBackup }, '⬇️ Save backup'),
        h('button', { class: 'btn small soft', onclick: importBackup }, '⬆️ Load backup'))),
    h('div', { class: 'card' },
      h('b', {}, 'Start again'),
      h('div', { class: 'mini-actions' },
        h('button', { class: 'btn small soft', onclick: () => confirmSheet(`Untick everything in “${sec().title}”?`, 'Yes, reset it', () => resetSection(sec())) }, `Reset ${sec().short}`),
        h('button', { class: 'btn small soft', onclick: () => confirmSheet('Reset everything? Your tickets and key info stay.', 'Yes, reset all', () => SECTIONS.forEach(resetSection)) }, 'Reset all'))),
    h('p', { class: 'muted', style: { textAlign: 'center', fontSize: '.8rem' } }, 'Made with 💜 for one brave traveller.'),
  ];
}
function resetSection(s) {
  for (const g of s.groups) { g.steps.forEach((x) => delete state.ticks[x.id]); delete state.groupDone[g.id]; delete state.skipped[g.id]; }
  state.active[s.id] = null; s.parts.forEach((p) => { state.stage[p.id] = null; }); delete state.celebrated[s.id];
  save(); renderAll();
}
function exportBackup() {
  const { chats, ...rest } = state;
  const blob = new Blob([JSON.stringify(rest, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `cloud-cat-backup-${dayIn(new Date())}.json` });
  document.body.append(a); a.click(); a.remove();
}
function importBackup() {
  const inp = h('input', { type: 'file', accept: 'application/json', onchange: async (e) => {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      for (const k of ['ticks', 'groupDone', 'skipped', 'active', 'stage', 'part', 'info', 'settings', 'celebrated']) if (data[k]) state[k] = { ...state[k], ...data[k] };
      store.saveNow(state); applySettings(); renderAll(); toast('Backup loaded ✓');
    } catch { toast('That file didn’t look like a backup.'); }
  } });
  inp.click();
}
function applySettings() {
  const st = state.settings;
  sfx.configure(st);
  if (st.theme === 'day' || st.theme === 'night') document.documentElement.dataset.sky = st.theme;
  else delete document.documentElement.dataset.sky;
  document.documentElement.style.setProperty('--fs', st.textSize);
  document.body.classList.toggle('reduce-motion', !!st.reduceMotion);
  $('meta[name="theme-color"]')?.setAttribute('content', st.theme === 'night' ? '#2A2150' : '#EDE6FF');
}

// ═════════════════════════ overlays ═════════════════════════
function openOverlay(node, cls = '') {
  const o = $('#overlay');
  o.className = `overlay ${cls}`; o.hidden = false;
  o.replaceChildren(node);
  o.onclick = (e) => { if (e.target === o) closeOverlay(); };
}
function closeOverlay() {
  const o = $('#overlay'); if (o.hidden) return;
  sfx.purrStop();
  o.classList.add('closing');
  setTimeout(() => { o.hidden = true; o.classList.remove('closing'); o.replaceChildren(); }, 200);
}
function openSheet(title, body, { tall = false } = {}) {
  const sheet = h('div', { class: `sheet${tall ? ' tall' : ''}`, role: 'dialog', 'aria-label': title },
    h('div', { class: 'sheet-head' }, h('h3', {}, title), h('button', { class: 'x', 'aria-label': 'Close', onclick: closeOverlay }, '✕')), body);
  openOverlay(sheet);
  return sheet;
}
function confirmSheet(q, yes, fn) {
  openSheet(q, h('div', { class: 'mini-actions' },
    h('button', { class: 'btn primary', onclick: () => { closeOverlay(); fn(); } }, yes),
    h('button', { class: 'btn soft', onclick: closeOverlay }, 'No, keep it')));
}
function bigSay(text, label = 'Tap anywhere to close') {
  const el = h('div', { class: 'bigsay', role: 'dialog', onclick: () => el.remove() }, h('p', {}, text), h('small', {}, label === 'Tap anywhere to close' ? label : `${label} · tap to close`));
  document.body.append(el);
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
}
function copy(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text).then(() => toast('Copied ✓'), () => toast('Couldn’t copy, sorry.'));
}
function go(t) { tab = t; renderHeader(); renderView(); window.scrollTo({ top: 0 }); }

// ── Tap the cat: pet or help ──
function openCatMenu() {
  sfx.unlock(); sfx.softTap();
  const cat = svgEl('cloud-cat');
  const petcat = h('div', { class: 'petcat', 'aria-label': 'Stroke the cat' }, cat);
  const hint = h('div', { class: 'pethint' }, 'Hi 💜');
  let idle; let lastHeart = 0; let lastLine = 0;
  const pet = (x, y) => {
    sfx.purrStart(); petcat.classList.add('petting'); cat.classList.remove('meow');
    const now = Date.now();
    if (now - lastHeart > 140 && x != null) {
      lastHeart = now;
      document.body.append(Object.assign(h('span', { class: 'heart', style: { left: `${x}px`, top: `${y - 20}px`, '--dx': `${(Math.random() - 0.5) * 60}px` } }, pick(['💜', '🤍', '🩷'])), {}));
      setTimeout(() => document.querySelectorAll('.heart').forEach((el) => { if (Date.now() - lastHeart > 1300) el.remove(); }), 1500);
    }
    if (now - lastLine > 2600) { lastLine = now; hint.textContent = pick(PET_LINES); }
    clearTimeout(idle); idle = setTimeout(() => { sfx.purrStop(); petcat.classList.remove('petting'); }, 650);
  };
  let down = false;
  petcat.addEventListener('pointerdown', (e) => { down = true; petcat.setPointerCapture(e.pointerId); pet(e.clientX, e.clientY); });
  petcat.addEventListener('pointermove', (e) => { if (down || e.pointerType === 'mouse') pet(e.clientX, e.clientY); });
  petcat.addEventListener('pointerup', () => { down = false; });
  const node = h('div', { class: 'petstage' }, petcat, hint,
    h('div', { class: 'petbtns' },
      h('button', { class: 'btn', onclick: () => {
        hint.textContent = 'Stroke him gently with your finger 🤍';
        const r = petcat.getBoundingClientRect();
        for (let i = 0; i < 4; i++) setTimeout(() => pet(r.left + r.width * (0.35 + Math.random() * 0.3), r.top + r.height * 0.35), i * 160);
      } }, '🤍 Pet'),
      h('button', { class: 'btn primary', onclick: openHelp }, '🆘 Help')));
  openOverlay(node, 'center');
}

// ── Help ──
function openHelp() {
  sfx.softTap();
  const s = sec(); const g = currentGroup();
  const items = [];
  if (g) g.steps.filter((x) => x.t === 'if').forEach((x) => items.push({ ...x, cls: 'if' }));
  s.help.forEach((x) => items.push({ ...x, cls: s.id === 'prep' ? '' : 'if' }));
  items.push({ ...OVERWHELM, cls: 'calm', overwhelm: true });
  const body = h('div', {},
    g ? h('p', { class: 'muted', style: { margin: '0 2px 10px' } }, `You’re on: ${g.icon} ${g.name}`) : null,
    h('div', { class: 'helplist' },
      items.map((it) => h('button', { class: `helpbtn ${it.cls}`, onclick: () => (it.overwhelm ? openOverwhelm() : showAnswer(it)) }, it.q)),
      h('div', { class: 'h3' }, 'Or talk to me'),
      h('button', { class: 'helpbtn', onclick: () => openChat('something') }, '✏️ Something else'),
      h('button', { class: 'helpbtn heart-btn', onclick: () => openChat('support') }, '💜 Reassurance and support')));
  openSheet('What’s happening?', body);
}
function showAnswer(it) {
  sfx.softTap();
  let answer = it.a; let action = null;
  if (answer === '__pick__') {
    const s = sec(); const part = currentPart(s);
    const cand = groupsOf(s, part.id).filter((g) => !groupDone(g) && g.badge !== 'bonus').sort((a, b) => checks(a).filter((x) => !isTicked(x)).length - checks(b).filter((x) => !isTicked(x)).length)[0]
      || groupsOf(s, part.id).find((g) => !groupDone(g));
    if (cand) {
      const n = checks(cand).filter((x) => !isTicked(x)).length;
      answer = `How about ${cand.icon} ${cand.name}? It’s only ${n} little step${n > 1 ? 's' : ''}.`;
      action = h('button', { class: 'btn primary', onclick: () => { state.active[s.id] = cand.id; save(); closeOverlay(); go('today'); } }, 'Start it');
    } else answer = 'Everything here is done already. You can rest 💜';
  }
  const body = h('div', {},
    h('p', { class: 'answer' }, answer),
    it.say ? sayCard(it.say) : null,
    h('div', { class: 'mini-actions', style: { marginTop: '16px' } }, action,
      h('button', { class: 'btn soft', onclick: openHelp }, '← Back'),
      h('button', { class: 'btn soft', onclick: () => openChat('something', it.q) }, '💜 Talk to me about it')));
  openSheet(it.q, body);
}
function openOverwhelm() {
  sfx.unlock(); sfx.softTap();
  const node = h('div', { class: 'card', style: { width: 'min(440px, calc(100% - 32px))', textAlign: 'center' }, role: 'dialog', 'aria-label': 'Overwhelmed' },
    h('div', { class: 'breathe', 'aria-hidden': 'true' }, 'breathe'),
    h('p', { class: 'answer', style: { fontSize: '1.1rem' } }, OVERWHELM.a),
    sayCard(OVERWHELM.say),
    h('p', { class: 'muted', style: { marginTop: '14px' } }, nextStepText() ? `When you’re ready, the next step is: ${nextStepText()}` : ''),
    h('div', { class: 'mini-actions', style: { justifyContent: 'center' } },
      h('button', { class: 'btn soft', onclick: closeOverlay }, 'I’m okay now'),
      h('button', { class: 'btn primary', onclick: () => openChat('support') }, '💜 Talk to me')));
  openOverlay(node, 'center');
}

// ── AI chat ──
function nextStepText() {
  const g = currentGroup();
  if (!g) { const s = sec(); const part = currentPart(s); if (part.mode === 'prep') return 'pick any group you like from the list.'; return ''; }
  const st = checks(g).find((x) => !isTicked(x));
  return st ? st.text : '';
}
function buildContext() {
  const s = sec(); const part = currentPart(s); const g = currentGroup();
  const now = new Date();
  const gs = groupsOf(s, part.id);
  const nextGroup = part.mode === 'journey' && g ? gs.slice(gs.indexOf(g) + 1).find((x) => !groupDone(x)) : null;
  return {
    now: `Sweden/Denmark ${fmt(now, 'Europe/Stockholm')}, UK ${fmt(now, 'Europe/London')}, date ${dayIn(now)}`,
    pet_name: state.settings.name || 'baby',
    section: `${s.title} (${s.date})${s.parts.length > 1 ? ` – ${part.label}` : ''}`,
    mode: part.mode === 'prep' ? 'free-order prep checklist' : 'journey, stages in order',
    current_group_or_stage: g ? `${g.name}${g.time ? ` (${g.time})` : ''}` : (part.mode === 'prep' ? 'choosing which group to do next' : 'all stages done'),
    remaining_in_current: g ? checks(g).filter((x) => !isTicked(x)).map((x) => x.text) : [],
    done_in_current: g ? checks(g).filter(isTicked).map((x) => x.text) : [],
    if_things_go_differently_here: g ? g.steps.filter((x) => x.t === 'if').map((x) => `${x.q} → ${x.a}${x.say ? ` Say: "${x.say}"` : ''}`) : [],
    next_up: nextGroup ? nextGroup.name : null,
    finished_groups_this_section: s.groups.filter(groupDone).map((x) => x.name),
    not_finished_groups_this_section: s.groups.filter((x) => !groupDone(x)).map((x) => x.name + (state.skipped[x.id] ? ' (skipped for later, bonus)' : '')),
    section_progress_percent: sectionProgress(s).pct,
    key_times: part.times ? part.times.map((t) => `${t[1]} ${t[2]}`) : null,
    other_sections_progress: SECTIONS.filter((x) => x !== s).map((x) => `${x.title}: ${sectionProgress(x).pct}%`),
    trip: {
      outbound: 'Tue 10 Nov: Lund C → train → Copenhagen Airport (Kastrup) → Ryanair FR746 11:50 to Bristol, seat 14C, lands 12:55 UK time. Gate closes 11:20.',
      return: 'Tue 24 Nov: Ryanair FR745 Bristol 13:25 → Copenhagen 16:25, then train to Lund. Gate closes 12:55 UK time.',
      meeting: 'Boyfriend Jan meets them at Bristol arrivals.',
      luggage: 'Cabin bag only, comfort plush toy, headphones, medicines with doctor’s letter and Schengen certificate.',
    },
  };
}
function openChat(mode, topic) {
  sfx.softTap();
  const s = sec();
  const hist = (state.chats[s.id] ||= []);
  const list = h('div', { class: 'chat', 'aria-live': 'polite' });
  const ta = h('textarea', { rows: 1, placeholder: mode === 'support' ? 'Tell me how you feel…' : 'What’s happening?', 'aria-label': 'Your message' });
  const sendBtn = h('button', { class: 'btn primary', 'aria-label': 'Send' }, 'Send');
  const draw = () => {
    list.replaceChildren(...hist.map((m) => h('div', { class: `msg ${m.role}` }, m.content)));
    list.scrollTop = list.scrollHeight;
  };
  const typing = () => { const t = h('div', { class: 'msg assistant typing' }, h('span'), h('span'), h('span')); list.append(t); list.scrollTop = list.scrollHeight; return t; };
  const ask = async (msgs) => {
    const t = typing(); sendBtn.disabled = true;
    let reply;
    try { reply = await askCat(msgs, buildContext(), state.settings); } catch (e) { reply = offlineReply(nextStepText(), !navigator.onLine); }
    t.remove(); sendBtn.disabled = false;
    hist.push({ role: 'assistant', content: reply }); state.chats[s.id] = hist.slice(-30); save(); draw(); sfx.softTap();
  };
  const send = () => {
    const text = ta.value.trim(); if (!text) return;
    ta.value = ''; hist.push({ role: 'user', content: text }); save(); draw();
    ask(hist.slice(-20));
  };
  sendBtn.onclick = send;
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  const body = h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
    list, h('div', { class: 'composer' }, ta, sendBtn),
    h('button', { class: 'link', style: { alignSelf: 'center' }, onclick: () => confirmSheet('Clear this chat?', 'Clear it', () => { state.chats[s.id] = []; save(); }) }, 'Clear chat'));
  openSheet(mode === 'support' ? '💜 Reassurance & support' : '✏️ Talk to me', body, { tall: true });
  draw();
  if (mode === 'support') {
    ask([...hist.slice(-16), { role: 'user', content: '(I tapped "Reassurance and support" in the app and haven’t typed anything yet. Please gently open the conversation: reassure me first, then ask softly how I’m doing.)' }]);
  } else if (topic) {
    ta.value = `${topic}. `; setTimeout(() => ta.focus(), 300);
  } else setTimeout(() => ta.focus(), 300);
}

// ── Welcome ──
function welcome() {
  const cat = svgEl('cloud-cat'); cat.style.width = '170px';
  const node = h('div', { class: 'card', style: { width: 'min(440px, calc(100% - 32px))', textAlign: 'center' } },
    h('div', { style: { display: 'flex', justifyContent: 'center' } }, cat),
    h('p', { style: { fontSize: '1.3rem', fontWeight: 900, margin: '6px 0' } }, 'Hi, I’m your cloud cat 💜'),
    h('p', { class: 'muted' }, 'Tap me if you need me.'),
    h('button', { class: 'btn primary block', onclick: () => { state.welcomed = true; save(); sfx.unlock(); sfx.chime(); closeOverlay(); } }, 'Let’s go ✨'));
  openOverlay(node, 'center');
}

// ═════════════════════════ boot ═════════════════════════
async function boot() {
  applySettings();
  await loadAssets();
  const today = dayIn(new Date());
  if (state.lastDay !== today || !state.section) { state.section = suggestedSection(); state.lastDay = today; save(); }

  catSvg = svgEl('cloud-cat');
  $('#cloudcat').append(catSvg);
  const runner = svgEl('running-cat');
  $('#runner').append(runner, h('span', { class: 'dust' }));
  $('#cloudcat').addEventListener('click', openCatMenu);
  document.querySelectorAll('.tabbar button').forEach((b) => b.addEventListener('click', () => { sfx.softTap(); go(b.dataset.tab); }));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const top = document.querySelector('.bigsay, .viewer'); if (top) top.remove(); else closeOverlay();
  });
  renderAll();
  if (!state.welcomed) welcome();
  else setTimeout(() => bubble(pick(['Hi {name} 💜', 'I’m here with you.', 'Ready when you are.'])), 700);

  setInterval(() => {
    const ts = $('#timestrip');
    if (ts && tab === 'today' && !document.querySelector('.overlay:not([hidden])')) ts.replaceWith(viewTimes(currentPart(sec())));
  }, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') store.saveNow(state); });
  store.persist();
  if (!window.__ARTIFACT && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
