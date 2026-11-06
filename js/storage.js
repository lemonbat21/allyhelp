// Progress + settings → localStorage. Uploaded ticket files → IndexedDB.
const KEY = 'cloudcat.v1';

export const DEFAULT_SETTINGS = {
  stepsVisible: 3,          // 1, 3, custom number, or 0 = whole group
  volume: 0.6,
  sTick: true, sMeow: true, sPurr: true, sChime: true,
  haptics: true,
  reduceMotion: false,
  bubbles: 'sometimes',     // often | sometimes | rarely | off
  name: 'baby',
  countdowns: false,
  textSize: 1,              // 0.9 – 1.3
  aiUrl: '/api/chat',
  aiPass: '',
};

export function defaultState() {
  return {
    ticks: {},              // stepId -> timestamp
    groupDone: {},          // groupId -> timestamp
    skipped: {},            // groupId -> true
    active: {},             // sectionId -> groupId (prep mode) | null
    stage: {},              // partId -> groupId (journey mode, manual jump)
    part: {},               // sectionId -> partId
    section: null,
    lastDay: null,
    info: { jan: '', address: '', meeting: '', trainTime: '', platform: '', seat: '14C' },
    files: [],              // [{id, label, type, name, addedAt}]
    chats: {},              // sectionId -> [{role, content}]
    settings: { ...DEFAULT_SETTINGS },
    welcomed: false,
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    const d = defaultState();
    return { ...d, ...s, info: { ...d.info, ...s.info }, settings: { ...d.settings, ...s.settings } };
  } catch {
    return defaultState();
  }
}

let timer;
export function save(state) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
  }, 60);
}
export function saveNow(state) {
  clearTimeout(timer);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export async function persist() {
  try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch { /* ignore */ }
}

// ── IndexedDB for files ──
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('cloudcat-files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction('files', mode);
    const out = fn(t.objectStore('files'));
    t.oncomplete = () => res(out?.result);
    t.onerror = () => rej(t.error);
  });
}
export const putFile = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
export const getFile = (id) => tx('readonly', (s) => s.get(id));
export const delFile = (id) => tx('readwrite', (s) => s.delete(id));
