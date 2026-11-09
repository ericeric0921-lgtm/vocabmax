'use strict';
/* =====================================================================
   VocabMax — 本地儲存的背單字 PWA
   學習集 / 資料夾 / 字卡 / 學習 / 測驗 / 配對 / 拼寫 / 重力 /
   FSRS-5 間隔重複（記憶複習）/ 統計 / 備份
   ===================================================================== */

/* ---------- 工具 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => esc(s).replace(/\n/g, '<br>');
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.random() * a.length | 0];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const MIN = 6e4, HOUR = 36e5, DAY = 864e5, ROLL = 4 * HOUR; // 每日於凌晨 4 點換日（同 Anki）
const dayKey = (t = Date.now()) => { const d = new Date(t - ROLL); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dayStart = (t = Date.now()) => { const d = new Date(t - ROLL); d.setHours(0, 0, 0, 0); return d.getTime() + ROLL; };
const dayEnd = (t = Date.now()) => dayStart(t) + DAY;
const sz = t => { const n = (t || '').length; return n > 220 ? 'xs' : n > 100 ? 's' : n > 35 ? 'm' : 'l'; };
function fmtIvl(ms) {
  if (ms < MIN) return '<1分';
  if (ms < HOUR) return Math.round(ms / MIN) + '分';
  if (ms < DAY) return Math.round(ms / HOUR) + '小時';
  const d = ms / DAY;
  if (d < 30) return Math.round(d) + '天';
  if (d < 365) return (+(d / 30).toFixed(1)) + '個月';
  return (+(d / 365).toFixed(1)) + '年';
}
const PRAISE = ['做得好！', '太棒了！', '完全正確！', '繼續保持！', '你真厲害！', '答對了！'];
const ENCOURAGE = ['沒關係，再學一次！', '別灰心，學習就是這樣進步的！', '差一點點，再接再厲！', '記住它，下次就會了！'];

/* ---------- 答案比對 ---------- */
const baseNorm = s => String(s ?? '').normalize('NFKC').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
const cleanP = s => s.replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/g, ' ').trim();
const norm = s => cleanP(baseNorm(s));
const normStrip = s => cleanP(baseNorm(s).replace(/[(（\[【][^)）\]】]*[)）\]】]/g, ' '));
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
function check(input, answer) {
  const u = norm(input);
  if (!u) return { ok: false };
  const vs = new Set();
  const add = s => { const a = norm(s), b = normStrip(s); if (a) vs.add(a); if (b) vs.add(b); };
  add(answer);
  String(answer).split(/[,;/、，；|\n]/).forEach(p => p.trim() && add(p));
  if (vs.has(u)) return { ok: true };
  for (const v of vs) if (v.length >= 5 && lev(u, v) <= 1) return { ok: true, close: true };
  return { ok: false };
}

/* ---------- 圖示 ---------- */
const I = {
  back: '<path d="M15 18l-6-6 6-6"/>', close: '<path d="M18 6L6 18M6 6l12 12"/>',
  star: '<path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.4l-5.7 3 1.1-6.4-4.6-4.5 6.4-.9z"/>',
  sound: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  lib: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="16" rx="1"/><path d="M17 5.2l2.9-.8 3.1 15-2.9.8z"/>',
  review: '<path d="M21 12a9 9 0 11-2.6-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M12 8v4l3 2"/>',
  shuffle: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  play: '<path d="M7 4l13 8-13 8z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 18l6-6-6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 3-5 5-5 8 0 4 3 7 7 7z"/>',
  cards: '<rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 012 2v12"/>',
  learn: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c2.5 2.5 9.5 2.5 12 0v-5M22 9v6"/>',
  test: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  match: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M14 6.5h3.5a2 2 0 012 2V11M10 17.5H6.5a2 2 0 01-2-2V13"/>',
  spell: '<path d="M3 19l4.5-13L12 19M4.8 14.5h5.4"/><path d="M15 8v11M15 15a3 3 0 106 0 3 3 0 10-6 0"/>',
  gravity: '<circle cx="12" cy="12" r="5"/><path d="M3.5 16.5C2 14 9 9 14 7.5s7.5-1 6.5 1.5"/>',
  folder: '<path d="M3 6.5A2.5 2.5 0 015.5 4H9l2 2.5h7.5A2.5 2.5 0 0121 9v8.5a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5z"/>',
  chart: '<path d="M4 20V11M10 20V4M16 20v-7M2 20h20"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5M5 21h14"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h3"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  reset: '<path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8"/><path d="M3 3v5h5"/>',
  pause2: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
};
const ic = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;
const LOGO = '<svg class="logo" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#4255ff"/><rect x="150" y="104" width="240" height="304" rx="40" fill="#a8b1ff" transform="rotate(10 256 256)"/><rect x="116" y="118" width="240" height="304" rx="40" fill="#fff"/><path d="M172 206l64 128 64-128" stroke="#4255ff" stroke-width="38" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------- 資料與儲存 ---------- */
const LANGS = [['auto', '自動偵測'], ['en-US', '英文'], ['zh-TW', '中文（繁體）'], ['zh-CN', '中文（簡體）'], ['ja-JP', '日文'], ['ko-KR', '韓文'], ['fr-FR', '法文'], ['de-DE', '德文'], ['es-ES', '西班牙文'], ['it-IT', '義大利文'], ['pt-BR', '葡萄牙文'], ['ru-RU', '俄文'], ['vi-VN', '越南文'], ['th-TH', '泰文'], ['id-ID', '印尼文']];
const langOpts = v => LANGS.map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${l}</option>`).join('');
const DEF_SETTINGS = { theme: 'auto', retention: 0.9, newPerDay: 20, maxReviews: 200, learnSteps: [1, 10], relearnSteps: [10], maxIvl: 36500, srsFront: 'term', ttsRate: 1, autoSpeak: false, sort: 'orig' };
let S = null;
const blank = () => ({ id: uid(), term: '', def: '', img: '', star: false, lv: 0, srs: null });

const DB = {
  db: null,
  open() { return new Promise((res, rej) => { const r = indexedDB.open('vocabmax', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  get(k) { return new Promise((res, rej) => { const r = this.db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  set(k, v) { return new Promise((res, rej) => { const tx = this.db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); },
};
function migrate(s) {
  s = s && typeof s === 'object' ? s : {};
  s.v = 1;
  s.settings = { ...DEF_SETTINGS, ...(s.settings || {}) };
  s.sets = s.sets || {}; s.folders = s.folders || {}; s.log = s.log || {}; s.best = s.best || {};
  for (const [id, set] of Object.entries(s.sets)) {
    set.id = set.id || id; set.title = set.title || '未命名學習集'; set.desc = set.desc || '';
    set.termLang = set.termLang || 'auto'; set.defLang = set.defLang || 'auto';
    set.created = set.created || Date.now(); set.updated = set.updated || set.created;
    set.cards = (set.cards || []).map(c => ({ id: c.id || uid(), term: String(c.term ?? ''), def: String(c.def ?? ''), img: c.img || '', star: !!c.star, lv: c.lv || 0, srs: c.srs || null, bury: c.bury }));
  }
  for (const [id, f] of Object.entries(s.folders)) { f.id = f.id || id; f.name = f.name || '資料夾'; f.setIds = (f.setIds || []).filter(x => s.sets[x]); }
  return s;
}
async function load() {
  let data = null;
  try { DB.db = await DB.open(); data = await DB.get('state'); } catch (e) { DB.db = null; }
  if (!data) { try { data = JSON.parse(localStorage.getItem('vocabmax') || 'null'); } catch (e) { } }
  S = migrate(data);
}
let saveTimer = 0;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 300); }
async function persist() {
  clearTimeout(saveTimer);
  if (!S) return;
  try {
    if (DB.db) await DB.set('state', S); else localStorage.setItem('vocabmax', JSON.stringify(S));
  } catch (e) {
    try { localStorage.setItem('vocabmax', JSON.stringify(S)); } catch (e2) { toast('⚠️ 儲存失敗：空間可能不足'); }
  }
}
function seed() {
  const words = [['abundant', '豐富的；充足的'], ['benevolent', '仁慈的；善意的'], ['candid', '坦率的；直言的'], ['diligent', '勤奮的'], ['eloquent', '有口才的；雄辯的'], ['frugal', '節儉的'], ['gregarious', '愛交際的；群居的'], ['hypothesis', '假設；假說'], ['inevitable', '不可避免的'], ['meticulous', '一絲不苟的；極仔細的'], ['notorious', '惡名昭彰的'], ['pragmatic', '務實的']];
  const id = uid();
  S.sets[id] = { id, title: '範例：英文進階單字', desc: '試試字卡、學習、測驗、配對與記憶複習！可在「編輯」中修改或刪除這個學習集。', termLang: 'en-US', defLang: 'zh-TW', cards: words.map(([term, def]) => ({ ...blank(), term, def })), created: Date.now(), updated: Date.now() };
}
const setsArr = () => Object.values(S.sets).sort((a, b) => (b.opened || b.updated) - (a.opened || a.updated));
const usable = set => set.cards.filter(c => c.term.trim() && c.def.trim());
function setStats(set) { let ns = 0, lr = 0, ms = 0; for (const c of set.cards) { if (c.lv >= 3) ms++; else if (c.lv > 0) lr++; else ns++; } return { ns, lr, ms }; }
function logDay(k = dayKey()) { return S.log[k] || (S.log[k] = { n: 0, new: 0, rev: 0, pass: 0, fail: 0, extra: 0 }); }
function act(n = 1) { logDay().n += n; save(); }
function calcStreak() {
  let s = 0, t = Date.now();
  if (!(S.log[dayKey(t)] && S.log[dayKey(t)].n)) t -= DAY;
  while (S.log[dayKey(t)] && S.log[dayKey(t)].n) { s++; t -= DAY; }
  return s;
}

/* ---------- 語音 ---------- */
const TTS = {
  voices: [],
  ok: 'speechSynthesis' in window,
  init() { if (!this.ok) return; const l = () => { this.voices = speechSynthesis.getVoices(); }; l(); speechSynthesis.onvoiceschanged = l; },
  detect(t) {
    if (/[぀-ヿ]/.test(t)) return 'ja-JP';
    if (/[가-힯]/.test(t)) return 'ko-KR';
    if (/[一-鿿]/.test(t)) return 'zh-TW';
    if (/[Ѐ-ӿ]/.test(t)) return 'ru-RU';
    if (/[฀-๿]/.test(t)) return 'th-TH';
    return 'en-US';
  },
  speak(text, lang = 'auto', rate) {
    if (!this.ok || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/\n/g, '. '));
      const L = !lang || lang === 'auto' ? this.detect(text) : lang;
      u.lang = L;
      const vs = this.voices.length ? this.voices : speechSynthesis.getVoices();
      const v = vs.find(v => v.lang.replace('_', '-') === L) || vs.find(v => v.lang.replace('_', '-').startsWith(L.slice(0, 2)));
      if (v) u.voice = v;
      u.rate = rate ?? S.settings.ttsRate;
      speechSynthesis.speak(u);
    } catch (e) { }
  },
  stop() { try { this.ok && speechSynthesis.cancel(); } catch (e) { } },
};

/* ---------- FSRS-5 間隔重複演算法 ---------- */
const FSRS = (() => {
  const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  const DECAY = -0.5, FACTOR = 19 / 81;
  const cD = d => clamp(d, 1, 10);
  const initS = g => Math.max(W[g - 1], 0.1);
  const initD = g => cD(W[4] - Math.exp(W[5] * (g - 1)) + 1);
  const nextD = (d, g) => { const dp = d - W[6] * (g - 3) * (10 - d) / 9; return cD(W[7] * initD(4) + (1 - W[7]) * dp); };
  const R = (t, s) => Math.pow(1 + FACTOR * t / s, DECAY);
  const recallS = (d, s, r, g) => s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1));
  const forgetS = (d, s, r) => Math.min(W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)), s);
  const shortS = (s, g) => s * Math.exp(W[17] * (g - 3 + W[18]));
  const ivlOf = (s, st) => clamp(Math.round(s / FACTOR * (Math.pow(st.retention, 1 / DECAY) - 1)), 1, st.maxIvl || 36500);

  /** state: 0 新卡 / 1 學習中 / 2 複習 / 3 重新學習；g: 1 重來 2 困難 3 良好 4 簡單 */
  function next(prev, g, now, st) {
    const c = prev ? { ...prev } : { state: 0, reps: 0, lapses: 0, step: 0 };
    const L = (st.learnSteps || []).map(m => m * MIN), RL = (st.relearnSteps || []).map(m => m * MIN);
    const t = c.last ? Math.max(0, (now - c.last) / DAY) : 0;
    const grad = ivl => { c.state = 2; c.step = 0; c.ivl = ivl; c.due = now + ivl * DAY; };
    const stepIvl = steps => {
      if (g === 1) { c.step = 0; return steps[0]; }
      if (g === 2) { if (steps.length === 1) return steps[0] * 1.5; if (c.step === 0) return (steps[0] + steps[1]) / 2; return steps[c.step]; }
      if (g === 3) { if (c.step + 1 < steps.length) { c.step++; return steps[c.step]; } return null; }
      return null;
    };
    if (!c.state) {
      c.s = initS(g); c.d = initD(g); c.step = 0;
      const ms = !L.length || g === 4 ? null : stepIvl(L);
      if (ms == null) grad(ivlOf(c.s, st)); else { c.state = 1; c.due = now + ms; }
    } else if (c.state === 1 || c.state === 3) {
      if (t >= 1) { const r = R(t, c.s); c.s = g === 1 ? forgetS(c.d, c.s, r) : recallS(c.d, c.s, r, g); }
      else c.s = shortS(c.s, g);
      c.d = nextD(c.d, g);
      const steps = c.state === 1 ? L : RL;
      const ms = !steps.length || g === 4 ? null : stepIvl(steps);
      if (ms == null) grad(ivlOf(c.s, st)); else c.due = now + ms;
    } else {
      const r = R(t, c.s);
      if (g === 1) {
        c.s = forgetS(c.d, c.s, r); c.d = nextD(c.d, 1); c.lapses = (c.lapses || 0) + 1;
        if (RL.length) { c.state = 3; c.step = 0; c.due = now + RL[0]; } else grad(ivlOf(c.s, st));
      } else {
        const sH = recallS(c.d, c.s, r, 2), sG = recallS(c.d, c.s, r, 3), sE = recallS(c.d, c.s, r, 4);
        let iH = ivlOf(sH, st), iG = ivlOf(sG, st), iE = ivlOf(sE, st);
        iH = Math.min(iH, iG); iG = Math.max(iG, iH + 1); iE = Math.max(iE, iG + 1);
        c.s = g === 2 ? sH : g === 3 ? sG : sE; c.d = nextD(c.d, g);
        grad(g === 2 ? iH : g === 3 ? iG : iE);
      }
    }
    c.s = Math.max(0.01, c.s);
    c.reps = (c.reps || 0) + 1; c.last = now;
    return c;
  }
  const retr = (q, now = Date.now()) => q && q.state ? R(Math.max(0, (now - q.last) / DAY), q.s) : 0;
  return { next, retr };
})();

function poolFor(scope) {
  let sets;
  if (scope === 'all') sets = Object.values(S.sets);
  else if (scope.startsWith('s:')) sets = [S.sets[scope.slice(2)]].filter(Boolean);
  else { const f = S.folders[scope.slice(2)]; sets = f ? f.setIds.map(id => S.sets[id]).filter(Boolean) : []; }
  const out = [];
  sets = sets.filter(s => s.srs !== false); // 未加入間隔重複的學習集不參與
  for (const s of sets) for (const c of s.cards) if (c.term.trim() || c.def.trim() || c.img) out.push({ s, c });
  return out;
}
function srsLimits() { const L = logDay(); return { newLeft: Math.max(0, S.settings.newPerDay + (L.extra || 0) - L.new), revLeft: Math.max(0, S.settings.maxReviews - L.rev) }; }
function srsCounts(scope, now = Date.now()) {
  const end = dayEnd(now), today = dayKey(now); let n = 0, l = 0, r = 0;
  for (const { c } of poolFor(scope)) {
    if (c.bury === today) continue;
    const q = c.srs;
    if (!q || !q.state) n++; else if (q.state === 2) { if (q.due < end) r++; } else if (q.due < end) l++;
  }
  const { newLeft, revLeft } = srsLimits();
  const out = { new: Math.min(n, newLeft), learn: l, rev: Math.min(r, revLeft) };
  out.total = out.new + out.learn + out.rev;
  return out;
}

/* ---------- 介面基礎 ---------- */
const view = $('#view'), tabbar = $('#tabbar');
let H = {}, RT = 0, cleanups = [];
const go = h => { location.hash = h; };
const onCleanup = f => cleanups.push(f);
const later = (fn, ms) => { const t = RT; return setTimeout(() => { if (t === RT) fn(); }, ms); };

view.addEventListener('click', e => {
  const t = e.target.closest('[data-a]');
  if (t && !t.disabled && H[t.dataset.a]) { e.preventDefault(); H[t.dataset.a](t, e); }
});
view.addEventListener('input', e => H.$input && H.$input(e));
view.addEventListener('change', e => H.$change && H.$change(e));
view.addEventListener('submit', e => { e.preventDefault(); H.$submit && H.$submit(e); });
document.addEventListener('keydown', e => {
  if (document.querySelector('.sheet-wrap')) return;
  H.$keydown && H.$keydown(e);
});
const typing = e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

function render(html, { nav = true, cls = '' } = {}) {
  view.className = cls;
  view.innerHTML = html;
  document.body.classList.toggle('nonav', !nav);
  document.body.classList.toggle('lock', cls.includes('full'));
  renderTabs();
  window.scrollTo(0, 0);
}
function renderTabs() {
  const h = location.hash || '#/';
  const due = S ? srsCounts('all').total : 0;
  const tabs = [['#/', 'home', '首頁', /^#\/?$|^#\/stats/], ['#/library', 'lib', '資料庫', /^#\/(library|set|folder|edit)/], ['#/create', 'plus', '建立', /^#\/create/], ['#/review', 'review', '複習', /^#\/review/], ['#/settings', 'gear', '設定', /^#\/settings/]];
  tabbar.innerHTML = tabs.map(([href, icn, label, re]) => `<a href="${href}" class="${re.test(h) ? 'on' : ''} ${icn === 'plus' ? 'create' : ''}">${ic(icn)}<span>${label}</span>${icn === 'review' && due ? `<i class="badge">${due > 99 ? '99+' : due}</i>` : ''}</a>`).join('');
}
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

function sheet(html, handlers = {}, { onClose } = {}) {
  const root = document.createElement('div');
  root.className = 'sheet-wrap';
  root.innerHTML = `<div class="sheet-bg"></div><div class="sheet" role="dialog"><div class="sheet-grip"></div>${html}</div>`;
  document.body.appendChild(root);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
  let closed = false;
  const close = () => { if (closed) return; closed = true; root.classList.remove('open'); setTimeout(() => root.remove(), 280); onClose && onClose(); };
  root.addEventListener('click', e => {
    if (e.target.classList.contains('sheet-bg')) return close();
    const t = e.target.closest('[data-a]');
    if (t && handlers[t.dataset.a]) { e.preventDefault(); handlers[t.dataset.a](t, e, close); }
  });
  root.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  return { root, close };
}
function confirmDlg(msg, { ok = '確定', danger = false, sub = '' } = {}) {
  return new Promise(res => {
    let done = false;
    sheet(`<h3 class="sheet-title">${esc(msg)}</h3>${sub ? `<p class="muted">${esc(sub)}</p>` : ''}<div class="row gap mt"><button class="btn ghost grow" data-a="no">取消</button><button class="btn ${danger ? 'danger' : 'primary'} grow" data-a="yes">${ok}</button></div>`,
      { yes: (t, e, c) => { done = true; res(true); c(); }, no: (t, e, c) => c() }, { onClose: () => { if (!done) res(false); } });
  });
}
function promptDlg(title, val = '', ph = '') {
  return new Promise(res => {
    let done = false;
    const s = sheet(`<h3 class="sheet-title">${esc(title)}</h3><form id="pd-f"><input class="input" id="pd-in" value="${esc(val)}" placeholder="${esc(ph)}" autocomplete="off"></form><div class="row gap mt"><button class="btn ghost grow" data-a="no">取消</button><button class="btn primary grow" data-a="yes">確定</button></div>`,
      { yes: (t, e, c) => { done = true; res($('#pd-in', s.root).value.trim()); c(); }, no: (t, e, c) => c() }, { onClose: () => { if (!done) res(null); } });
    $('#pd-f', s.root).addEventListener('submit', e => { e.preventDefault(); done = true; res($('#pd-in', s.root).value.trim()); s.close(); });
    setTimeout(() => $('#pd-in', s.root).focus(), 60);
  });
}
function menuSheet(title, items) {
  // items: [icon, label, fn, danger]
  const map = {};
  const html = `${title ? `<h3 class="sheet-title">${esc(title)}</h3>` : ''}${items.map(([icn, label, fn, danger], i) => { map['m' + i] = (t, e, c) => { c(); fn(); }; return `<button class="menu-item ${danger ? 'danger' : ''}" data-a="m${i}">${ic(icn)}<span>${label}</span></button>`; }).join('')}`;
  return sheet(html, map);
}
const sw = (k, v, attr = 'o') => `<input type="checkbox" class="switch" data-${attr}="${k}" ${v ? 'checked' : ''}>`;
const swRow = (label, k, v, sub = '', attr = 'o') => `<label class="set-row"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span>${sw(k, v, attr)}</label>`;

function autoGrow(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
function pickImage() {
  return new Promise(res => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return res(null);
      const r = new FileReader();
      r.onload = () => {
        const im = new Image();
        im.onload = () => {
          const m = 520, sc = Math.min(1, m / Math.max(im.width, im.height));
          const cv = document.createElement('canvas'); cv.width = Math.max(1, im.width * sc | 0); cv.height = Math.max(1, im.height * sc | 0);
          const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(im, 0, 0, cv.width, cv.height);
          res(cv.toDataURL('image/jpeg', 0.8));
        };
        im.onerror = () => { toast('無法讀取圖片'); res(null); };
        im.src = r.result;
      };
      r.readAsDataURL(f);
    };
    inp.click();
  });
}
async function shareOrDownload(text, name, type = 'text/plain') {
  const blob = new Blob([text], { type });
  try {
    const file = new File([blob], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('已複製到剪貼簿'); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('已複製到剪貼簿'); } catch (e2) { toast('複製失敗'); } ta.remove(); }
}

/** dir = 要回答的那一面（'def' → 看詞語答定義） */
function qa(set, c, dir) {
  return dir === 'term'
    ? { q: c.def, a: c.term, qLang: set.defLang, aLang: set.termLang, qImg: c.img, qLabel: '定義', aLabel: '詞語' }
    : { q: c.term, a: c.def, qLang: set.termLang, aLang: set.defLang, qImg: '', qLabel: '詞語', aLabel: '定義' };
}
function distractors(cards, c, dir, n) {
  const key = dir === 'term' ? 'term' : 'def';
  const seen = new Set([norm(c[key])]), out = [];
  for (const x of shuffle(cards)) {
    if (x === c) continue;
    const v = x[key]; if (!v || !v.trim()) continue;
    const k = norm(v); if (seen.has(k)) continue;
    seen.add(k); out.push(v);
    if (out.length >= n) break;
  }
  return out;
}
const studyTop = (set, label, extra = '', back) => `<div class="study-top"><a class="icon-btn" href="${back || '#/set/' + set.id}" aria-label="關閉">${ic('close')}</a><div class="study-title"><span class="mode-name">${label}</span><span class="set-name">${esc(set.title)}</span></div>${extra || '<span style="width:42px"></span>'}</div>`;

/* ---------- 首頁 ---------- */
function setTile(s, extra = '') {
  const st = setStats(s), n = s.cards.length, sc = srsCounts('s:' + s.id);
  return `<a class="tile" href="#/set/${s.id}"><div class="tile-title">${esc(s.title)}</div><div class="tile-meta"><span class="pill">${n} 個詞語</span>${sc.total ? `<span class="pill blue">${sc.total} 待複習</span>` : ''}</div><div class="bar ok mini-bar"><i style="width:${n ? st.ms / n * 100 : 0}%"></i></div>${extra}</a>`;
}
const folderTile = f => `<a class="tile folder-tile" href="#/folder/${f.id}">${ic('folder')}<div class="grow"><div class="tile-title">${esc(f.name)}</div><div class="tile-meta"><span class="pill">${f.setIds.length} 個學習集</span></div></div></a>`;

function scrHome() {
  const sets = setsArr(), c = srsCounts('all'), streak = calcStreak(), L = logDay();
  let total = 0, mastered = 0;
  for (const s of sets) for (const x of s.cards) { total++; if (x.lv >= 3) mastered++; }
  const folders = Object.values(S.folders);
  render(`<div class="page">
    <header class="home-head"><div class="brand">${LOGO}<span>VocabMax</span></div><a class="streak-chip" href="#/stats" aria-label="連續學習天數">${ic('flame')}<b>${streak}</b></a></header>
    <section class="panel today">
      <div class="today-main">
        <div class="eyebrow">今日記憶複習 · FSRS</div>
        <div class="today-big">${c.total ? `${c.total} 張卡片等你複習` : '今日任務完成 🎉'}</div>
        <div class="srs-counts"><span>${c.new} 新卡</span><span>${c.learn} 學習中</span><span>${c.rev} 複習</span></div>
      </div>
      <a class="btn primary" href="#/review">${c.total ? '開始' : '查看'}</a>
    </section>
    <div class="stat-row">
      <a class="stat" href="#/stats"><b>${L.n}</b><span>今日作答</span></a>
      <a class="stat" href="#/stats"><b>${total}</b><span>總詞語</span></a>
      <a class="stat" href="#/stats"><b>${mastered}</b><span>已精通</span></a>
    </div>
    <div class="sec-head"><h2>最近的學習集</h2><a href="#/library">查看全部</a></div>
    ${sets.length ? `<div class="tiles">${sets.slice(0, 6).map(s => setTile(s)).join('')}</div>` : `<div class="empty">${ic('cards')}<p>還沒有學習集，建立第一個吧！</p><a class="btn primary" href="#/create">${ic('plus')} 建立學習集</a></div>`}
    ${folders.length ? `<div class="sec-head"><h2>資料夾</h2></div><div class="tiles">${folders.map(folderTile).join('')}</div>` : ''}
  </div>`);
}

/* ---------- 資料庫 ---------- */
let libTab = 'sets';
function scrLibrary() {
  render(`<div class="page">
    <h1 class="page-title">你的資料庫</h1>
    <div class="seg full"><button data-a="tab" data-t="sets" class="${libTab === 'sets' ? 'on' : ''}">學習集</button><button data-a="tab" data-t="folders" class="${libTab === 'folders' ? 'on' : ''}">資料夾</button></div>
    <div class="search">${ic('search')}<input id="q" type="search" placeholder="${libTab === 'sets' ? '搜尋學習集、詞語或定義' : '搜尋資料夾'}" autocomplete="off"></div>
    <div class="row gap" style="margin-bottom:14px">${libTab === 'sets' ? `<a class="btn primary sm" href="#/create">${ic('plus')} 新增學習集</a>` : `<button class="btn primary sm" data-a="newFolder">${ic('plus')} 新增資料夾</button>`}</div>
    <div id="list"></div>
  </div>`);
  const draw = () => {
    const q = baseNorm($('#q').value.trim());
    let html = '';
    if (libTab === 'sets') {
      const list = setsArr().map(s => {
        if (!q) return [s, 0];
        const hitT = baseNorm(s.title + ' ' + s.desc).includes(q);
        const hits = s.cards.filter(c => baseNorm(c.term + ' ' + c.def).includes(q)).length;
        return hitT || hits ? [s, hits] : null;
      }).filter(Boolean);
      html = list.length ? `<div class="tiles">${list.map(([s, h]) => setTile(s, h ? `<div class="muted sm" style="margin-top:6px">${h} 個詞語符合</div>` : '')).join('')}</div>` : `<div class="empty">${q ? '找不到符合的學習集' : '還沒有學習集'}</div>`;
    } else {
      const list = Object.values(S.folders).filter(f => !q || baseNorm(f.name).includes(q));
      html = list.length ? `<div class="tiles">${list.map(folderTile).join('')}</div>` : `<div class="empty">${ic('folder')}<p>${q ? '找不到資料夾' : '用資料夾整理你的學習集'}</p></div>`;
    }
    $('#list').innerHTML = html;
  };
  H = {
    tab: t => { libTab = t.dataset.t; scrLibrary(); },
    newFolder: async () => { const n = await promptDlg('新增資料夾', '', '資料夾名稱'); if (n) { const id = uid(); S.folders[id] = { id, name: n, setIds: [] }; save(); go('#/folder/' + id); } },
    $input: e => { if (e.target.id === 'q') draw(); },
  };
  draw();
}

/* ---------- 資料夾 ---------- */
function scrFolder(id) {
  const f = S.folders[id]; if (!f) return go('#/library');
  const sets = f.setIds.map(i => S.sets[i]).filter(Boolean);
  const sc = srsCounts('f:' + id);
  render(`<div class="page">
    <div class="topbar"><a class="icon-btn" href="#/library">${ic('back')}</a><div class="grow"></div><button class="icon-btn" data-a="more">${ic('more')}</button></div>
    <div class="row gap" style="margin-bottom:6px"><span style="color:var(--primary)">${ic('folder', 'xl')}</span><h1 class="set-title" style="margin:0">${esc(f.name)}</h1></div>
    <p class="muted">${sets.length} 個學習集 · ${sets.reduce((n, s) => n + s.cards.length, 0)} 個詞語</p>
    <div class="row gap wrap"><a class="btn primary grow" href="#/review/f/${id}">${ic('review')} 記憶複習${sc.total ? `（${sc.total}）` : ''}</a><button class="btn outline grow" data-a="add">${ic('plus')} 加入學習集</button></div>
    <div class="tiles" style="margin-top:16px">${sets.map(s => setTile(s, `<button class="icon-btn sm tile-x" data-a="rm" data-id="${s.id}" aria-label="移除">${ic('close')}</button>`)).join('') || '<div class="empty">這個資料夾還是空的</div>'}</div>
  </div>`);
  H = {
    rm: t => { f.setIds = f.setIds.filter(x => x !== t.dataset.id); save(); scrFolder(id); },
    add: () => {
      const all = setsArr();
      if (!all.length) return toast('還沒有學習集');
      const s = sheet(`<h3 class="sheet-title">加入學習集</h3><div class="checklist">${all.map(x => `<label class="chk"><input type="checkbox" value="${x.id}" ${f.setIds.includes(x.id) ? 'checked' : ''}><span>${esc(x.title)}</span></label>`).join('')}</div><button class="btn primary block mt" data-a="ok">完成</button>`,
        { ok: (t, e, c) => { f.setIds = $$('input:checked', s.root).map(i => i.value); save(); c(); scrFolder(id); } });
    },
    more: () => menuSheet(f.name, [
      ['edit', '重新命名', async () => { const n = await promptDlg('重新命名資料夾', f.name); if (n) { f.name = n; save(); scrFolder(id); } }],
      ['trash', '刪除資料夾（不會刪除學習集）', async () => { if (await confirmDlg(`刪除「${f.name}」？`, { ok: '刪除', danger: true })) { delete S.folders[id]; save(); go('#/library'); } }, true],
    ]),
  };
}

/* ---------- 學習集頁面 ---------- */
const MODES = [['flashcards', 'cards', '字卡'], ['learn', 'learn', '學習'], ['test', 'test', '測驗'], ['match', 'match', '配對'], ['review', 'review', '記憶複習'], ['spell', 'spell', '拼寫'], ['gravity', 'gravity', '重力'], ['edit', 'edit', '編輯']];
function scrSet(id) {
  const set = S.sets[id]; if (!set) return go('#/library');
  set.opened = Date.now(); save();
  const st = setStats(set), n = set.cards.length, sc = srsCounts('s:' + id);
  let reviewed = 0; for (const c of set.cards) if (c.srs && c.srs.state) reviewed++;
  const pv = { i: 0 };
  render(`<div class="page">
    <div class="topbar"><a class="icon-btn" href="#/library" aria-label="返回">${ic('back')}</a><div class="grow"></div><button class="icon-btn" data-a="export" aria-label="匯出">${ic('upload')}</button><button class="icon-btn" data-a="more" aria-label="更多">${ic('more')}</button></div>
    <h1 class="set-title">${esc(set.title)}</h1>
    <div class="set-sub"><span class="pill">${n} 個詞語</span>${set.desc ? `<span class="muted sm">${fmt(set.desc)}</span>` : ''}</div>
    <div class="modes">${MODES.map(([m, i, l]) => `<a class="mode" href="${m === 'edit' ? '#/edit/' + id : `#/s/${id}/${m}`}">${ic(i)}<span>${l}</span>${m === 'review' && sc.total ? `<em>${sc.total}</em>` : ''}${m === 'flashcards' && set.fc ? `<em style="background:var(--primary)">${set.fc.pos}/${set.fc.deck.length}</em>` : ''}</a>`).join('')}</div>
    ${n ? `<div class="preview pv-wrap" id="pv"></div>` : `<div class="empty">這個學習集還沒有卡片<br><a class="btn primary mt" href="#/edit/${id}">新增卡片</a></div>`}
    <section class="panel prog-panel">
      <div class="row"><b class="grow">你的進度</b><span class="muted sm">${n ? Math.round(st.ms / n * 100) : 0}% 已精通</span></div>
      <div class="prog-rows">
        <div class="prog-row lv0"><span>未學習</span><div class="bar"><i style="width:${n ? st.ns / n * 100 : 0}%"></i></div><b>${st.ns}</b></div>
        <div class="prog-row lv1"><span>學習中</span><div class="bar"><i style="width:${n ? st.lr / n * 100 : 0}%"></i></div><b>${st.lr}</b></div>
        <div class="prog-row lv3"><span>已精通</span><div class="bar"><i style="width:${n ? st.ms / n * 100 : 0}%"></i></div><b>${st.ms}</b></div>
      </div>
      <div style="margin-top:8px">${swRow('加入記憶複習（間隔重複）', 'srs', set.srs !== false, '關閉後，這個學習集不會出現在待複習清單', 'ss')}</div>
      ${set.srs !== false ? `<div class="srs-line srs-counts"><span class="muted" style="padding-left:0">記憶複習：</span><span class="cn-new">${sc.new} 新卡</span><span class="cn-learn">${sc.learn} 學習中</span><span class="cn-rev">${sc.rev} 到期</span><span class="muted">· 已排程 ${reviewed}/${n}</span></div>` : ''}
    </section>
    <div class="sec-head"><h2>本學習集中的詞語（${n}）</h2><select class="input sm" id="sort"><option value="orig">原始順序</option><option value="alpha">字母順序</option><option value="lv">依熟練度</option><option value="star">星號優先</option></select></div>
    <div id="terms" class="terms"></div>
    <a class="btn outline block mt" href="#/edit/${id}">${ic('edit')} 新增或移除詞語</a>
  </div>`);
  $('#sort').value = S.settings.sort;

  function drawPv() {
    const el = $('#pv'); if (!el) return;
    const c = set.cards[pv.i];
    el.innerHTML = `<div class="fc mini" data-a="pvflip"><div class="fc-inner"><div class="face front"><div class="fc-text ${sz(c.term)}">${fmt(c.term)}</div></div><div class="face back">${c.img ? `<img class="fc-img" src="${c.img}" alt="">` : ''}<div class="fc-text ${sz(c.def)}">${fmt(c.def)}</div></div></div></div>
      <div class="pv-nav"><button class="icon-btn round" data-a="pvprev" ${pv.i ? '' : 'disabled'}>${ic('left')}</button><span>${pv.i + 1} / ${n}</span><button class="icon-btn round" data-a="pvnext" ${pv.i < n - 1 ? '' : 'disabled'}>${ic('right')}</button><a class="icon-btn expand" href="#/s/${id}/flashcards" aria-label="全螢幕">${ic('expand')}</a></div>`;
  }
  const row = c => `<div class="term-row lv${c.lv >= 3 ? 3 : c.lv > 0 ? 1 : 0}"><div class="tr-t" data-a="sayT" data-id="${c.id}">${fmt(c.term)}</div><div class="tr-d" data-a="sayD" data-id="${c.id}">${c.img ? `<img src="${c.img}" alt="">` : ''}<span>${fmt(c.def)}</span></div><div class="tr-a"><button class="icon-btn sm star ${c.star ? 'on' : ''}" data-a="star" data-id="${c.id}" aria-label="星號">${ic('star')}</button><button class="icon-btn sm" data-a="sayT" data-id="${c.id}" aria-label="朗讀">${ic('sound')}</button></div></div>`;
  function drawTerms() {
    const so = S.settings.sort; let cs = [...set.cards], html;
    if (so === 'alpha') cs.sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }));
    if (so === 'star') cs.sort((a, b) => b.star - a.star);
    if (so === 'lv') {
      const g = [['學習中', cs.filter(c => c.lv > 0 && c.lv < 3)], ['未學習', cs.filter(c => !c.lv)], ['已精通', cs.filter(c => c.lv >= 3)]];
      html = g.filter(x => x[1].length).map(([t, l]) => `<div class="term-group">${t}（${l.length}）</div>${l.map(row).join('')}`).join('');
    } else html = cs.map(row).join('');
    $('#terms').innerHTML = html;
  }
  const card = cid => set.cards.find(c => c.id === cid);
  H = {
    pvflip: t => t.classList.toggle('flipped'),
    pvprev: () => { if (pv.i > 0) { pv.i--; drawPv(); } },
    pvnext: () => { if (pv.i < n - 1) { pv.i++; drawPv(); } },
    star: t => { const c = card(t.dataset.id); c.star = !c.star; t.classList.toggle('on', c.star); save(); },
    sayT: t => { const c = card(t.dataset.id); TTS.speak(c.term, set.termLang); },
    sayD: t => { const c = card(t.dataset.id); TTS.speak(c.def, set.defLang); },
    $change: e => {
      if (e.target.id === 'sort') { S.settings.sort = e.target.value; save(); drawTerms(); }
      else if (e.target.dataset.ss) { set.srs = e.target.checked; save(); toast(set.srs ? '已加入記憶複習' : '已從記憶複習移除'); scrSet(id); }
    },
    export: () => exportSet(set),
    more: () => menuSheet(set.title, [
      ['edit', '編輯學習集', () => go('#/edit/' + id)],
      ['folder', '加入資料夾', () => folderPicker(set)],
      ['copy', '複製學習集', () => { const cp = JSON.parse(JSON.stringify(set)); cp.id = uid(); cp.title += '（副本）'; cp.created = cp.updated = Date.now(); delete cp.opened; delete cp.fc; cp.cards.forEach(c => { c.id = uid(); c.lv = 0; c.srs = null; delete c.bury; }); S.sets[cp.id] = cp; save(); toast('已建立副本'); go('#/set/' + cp.id); }],
      ['upload', '匯出 / 分享', () => exportSet(set)],
      ['swap', '互換所有詞語與定義', async () => { if (await confirmDlg('互換所有詞語與定義？', { sub: '語言設定也會一起互換。' })) { set.cards.forEach(c => { [c.term, c.def] = [c.def, c.term]; }); [set.termLang, set.defLang] = [set.defLang, set.termLang]; set.updated = Date.now(); save(); scrSet(id); } }],
      ['reset', '重設學習進度（未學習/學習中/已精通）', async () => { if (await confirmDlg('重設學習進度？', { danger: true, ok: '重設' })) { set.cards.forEach(c => c.lv = 0); set.fc = null; save(); scrSet(id); } }],
      ['review', '重設記憶複習排程', async () => { if (await confirmDlg('重設這個學習集的 FSRS 排程？', { danger: true, ok: '重設', sub: '所有卡片會變回新卡。' })) { set.cards.forEach(c => { c.srs = null; delete c.bury; }); save(); scrSet(id); } }],
      ['trash', '刪除學習集', async () => { if (await confirmDlg(`刪除「${set.title}」？`, { danger: true, ok: '刪除', sub: '此動作無法復原。' })) { delete S.sets[id]; Object.values(S.folders).forEach(f => f.setIds = f.setIds.filter(x => x !== id)); save(); toast('已刪除'); go('#/library'); } }, true],
    ]),
  };
  if (n) drawPv();
  drawTerms();
}
function folderPicker(set) {
  const fs = Object.values(S.folders);
  const s = sheet(`<h3 class="sheet-title">加入資料夾</h3><div class="checklist">${fs.map(f => `<label class="chk"><input type="checkbox" value="${f.id}" ${f.setIds.includes(set.id) ? 'checked' : ''}><span>${esc(f.name)}</span></label>`).join('') || '<p class="muted">還沒有資料夾</p>'}</div><button class="btn ghost block mt" data-a="nf">${ic('plus')} 新增資料夾</button><button class="btn primary block" data-a="ok">完成</button>`, {
    ok: (t, e, c) => { const sel = new Set($$('input:checked', s.root).map(i => i.value)); fs.forEach(f => { const has = f.setIds.includes(set.id); if (sel.has(f.id) && !has) f.setIds.push(set.id); if (!sel.has(f.id) && has) f.setIds = f.setIds.filter(x => x !== set.id); }); save(); c(); toast('已更新資料夾'); },
    nf: async (t, e, c) => { c(); const n = await promptDlg('新增資料夾', '', '資料夾名稱'); if (n) { const fid = uid(); S.folders[fid] = { id: fid, name: n, setIds: [set.id] }; save(); toast(`已加入「${n}」`); } },
  });
}
function exportSet(set) {
  let ts = '\t', cs = '\n';
  const build = () => set.cards.map(c => c.term.replace(/\n/g, ' ') + ts + c.def.replace(/\n/g, ' ')).join(cs);
  const s = sheet(`<h3 class="sheet-title">匯出「${esc(set.title)}」</h3>
    <div class="im-opts"><div><b>詞語與定義之間</b><label><input type="radio" name="ets" value="\t" checked> Tab</label><label><input type="radio" name="ets" value=","> 逗號</label><label><input type="radio" name="ets" value=" - "> 連字號</label></div>
    <div><b>卡片之間</b><label><input type="radio" name="ecs" value="\n" checked> 換行</label><label><input type="radio" name="ecs" value=";"> 分號</label></div></div>
    <textarea class="input mono" id="ex-t" rows="8" readonly></textarea>
    <div class="row gap mt"><button class="btn ghost grow" data-a="copy">${ic('copy')} 複製</button><button class="btn primary grow" data-a="file">${ic('download')} 存成檔案</button></div>`, {
    copy: () => copyText(build()),
    file: () => shareOrDownload(build(), `${set.title.replace(/[\\/:*?"<>|]/g, '_')}.txt`),
  });
  const upd = () => { ts = $('input[name=ets]:checked', s.root).value; cs = $('input[name=ecs]:checked', s.root).value; $('#ex-t', s.root).value = build(); };
  s.root.addEventListener('change', upd); upd();
}

/* ---------- 編輯器 ---------- */
function scrEdit(id) {
  const src = id ? S.sets[id] : null;
  if (id && !src) return go('#/library');
  let d;
  if (S.draft && S.draft.srcId === (id || null)) { d = S.draft; toast('已還原未儲存的草稿'); }
  else { d = src ? JSON.parse(JSON.stringify(src)) : { id: uid(), title: '', desc: '', termLang: 'auto', defLang: 'auto', srs: true, cards: [blank(), blank(), blank(), blank()] }; d.srcId = id || null; }
  const keep = () => { S.draft = d; save(); };
  render(`<div class="page editor">
    <div class="topbar sticky"><button class="icon-btn" data-a="cancel" aria-label="取消">${ic('close')}</button><div class="grow center"><b>${id ? '編輯學習集' : '建立新學習集'}</b></div><button class="btn primary sm" data-a="save">${id ? '完成' : '建立'}</button></div>
    <input class="input title-in" data-f="title" placeholder="輸入標題，例如「多益核心單字」" value="${esc(d.title)}">
    <textarea class="input" data-f="desc" rows="2" placeholder="新增描述…">${esc(d.desc)}</textarea>
    <div class="row gap"><label class="fld grow"><span>詞語語言（朗讀用）</span><select class="input" data-f="termLang">${langOpts(d.termLang)}</select></label><label class="fld grow"><span>定義語言</span><select class="input" data-f="defLang">${langOpts(d.defLang)}</select></label></div>
    ${swRow('加入記憶複習（間隔重複）', 'srs', d.srs !== false, '開啟後，卡片會依 FSRS 演算法排程複習', 'es')}
    <div class="row gap wrap"><button class="btn ghost sm" data-a="import">${ic('download')} 匯入</button><button class="btn ghost sm" data-a="swapAll">${ic('swap')} 互換詞語與定義</button><span class="grow"></span><span class="muted sm" id="cnt"></span></div>
    <div id="ed-cards"></div>
    <button class="add-card" data-a="add">${ic('plus')} 新增卡片</button>
    <button class="btn primary block lg" data-a="save">${id ? '儲存變更' : '建立學習集'}</button>
  </div>`, { nav: false });
  function drawCards(focus) {
    $('#ed-cards').innerHTML = d.cards.map((c, i) => `<div class="ed-card">
      <div class="ed-head"><b>${i + 1}</b><div class="grow"></div><button class="icon-btn sm" data-a="up" data-i="${i}" ${i ? '' : 'disabled'} aria-label="上移">${ic('up')}</button><button class="icon-btn sm" data-a="down" data-i="${i}" ${i < d.cards.length - 1 ? '' : 'disabled'} aria-label="下移">${ic('down')}</button><button class="icon-btn sm" data-a="del" data-i="${i}" aria-label="刪除">${ic('trash')}</button></div>
      <div class="ed-body">
        <label class="ed-fld"><textarea rows="1" data-i="${i}" data-k="term" placeholder="輸入詞語">${esc(c.term)}</textarea><span>詞語</span></label>
        <label class="ed-fld"><textarea rows="1" data-i="${i}" data-k="def" placeholder="輸入定義">${esc(c.def)}</textarea><span>定義</span></label>
        <div class="ed-img">${c.img ? `<img src="${c.img}" alt=""><button class="rm" data-a="rmimg" data-i="${i}">移除</button>` : `<button class="img-btn" data-a="img" data-i="${i}">${ic('image')}<span>圖片</span></button>`}</div>
      </div></div>`).join('');
    $$('#ed-cards textarea').forEach(autoGrow);
    $('#cnt').textContent = `${d.cards.length} 張卡片`;
    if (focus != null) { const el = $(`#ed-cards textarea[data-i="${focus}"][data-k="term"]`); if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
  }
  const finish = () => { delete S.draft; save(); };
  H = {
    $input: e => {
      const t = e.target;
      if (t.dataset.k) { d.cards[+t.dataset.i][t.dataset.k] = t.value; autoGrow(t); }
      else if (t.dataset.f) d[t.dataset.f] = t.value;
      else return;
      keep();
    },
    $change: e => {
      const t = e.target;
      if (t.tagName === 'SELECT' && t.dataset.f) { d[t.dataset.f] = t.value; keep(); }
      else if (t.dataset.es) { d.srs = t.checked; keep(); }
    },
    $keydown: e => {
      const t = e.target;
      if (e.key === 'Tab' && !e.shiftKey && t.dataset.k === 'def' && +t.dataset.i === d.cards.length - 1) { e.preventDefault(); d.cards.push(blank()); keep(); drawCards(d.cards.length - 1); }
    },
    add: () => { d.cards.push(blank()); keep(); drawCards(d.cards.length - 1); },
    del: t => { const i = +t.dataset.i; d.cards.splice(i, 1); if (!d.cards.length) d.cards.push(blank()); keep(); drawCards(); },
    up: t => { const i = +t.dataset.i; [d.cards[i - 1], d.cards[i]] = [d.cards[i], d.cards[i - 1]]; keep(); drawCards(); },
    down: t => { const i = +t.dataset.i; [d.cards[i + 1], d.cards[i]] = [d.cards[i], d.cards[i + 1]]; keep(); drawCards(); },
    img: async t => { const url = await pickImage(); if (url) { d.cards[+t.dataset.i].img = url; keep(); drawCards(); } },
    rmimg: t => { d.cards[+t.dataset.i].img = ''; keep(); drawCards(); },
    swapAll: () => { d.cards.forEach(c => { [c.term, c.def] = [c.def, c.term]; }); [d.termLang, d.defLang] = [d.defLang, d.termLang]; $('[data-f=termLang]').value = d.termLang; $('[data-f=defLang]').value = d.defLang; keep(); drawCards(); toast('已互換'); },
    import: () => importSheet(items => {
      d.cards = d.cards.filter(c => c.term.trim() || c.def.trim() || c.img).concat(items.map(x => ({ ...blank(), ...x })));
      if (!d.cards.length) d.cards.push(blank());
      keep(); drawCards(); toast(`已匯入 ${items.length} 張卡片`);
    }),
    cancel: async () => {
      if (S.draft && !(await confirmDlg('放棄未儲存的變更？', { ok: '放棄', danger: true }))) return;
      finish(); go(id ? '#/set/' + id : '#/library');
    },
    save: () => {
      const cards = d.cards.map(c => ({ ...c, term: c.term.trim(), def: c.def.trim() })).filter(c => c.term || c.def || c.img);
      if (!cards.length) return toast('請至少新增一張卡片');
      const now = Date.now();
      const out = { ...(src || {}), id: d.id, title: d.title.trim() || '未命名學習集', desc: d.desc.trim(), termLang: d.termLang, defLang: d.defLang, srs: d.srs !== false, cards, created: src ? src.created : now, updated: now, opened: now };
      delete out.srcId;
      S.sets[d.id] = out;
      finish();
      toast(id ? '已儲存' : '已建立學習集');
      location.replace('#/set/' + d.id);
    },
  };
  drawCards();
}
function importSheet(onDone) {
  const s = sheet(`<h3 class="sheet-title">匯入資料</h3>
    <p class="muted sm" style="margin-top:-6px">從 Word、Excel、Google 文件或其他字卡 App 複製內容並貼上。</p>
    <textarea class="input mono" id="im-t" rows="7" placeholder="詞語1&#9;定義1&#10;詞語2&#9;定義2"></textarea>
    <div class="im-opts">
      <div><b>詞語與定義之間</b>
        <label><input type="radio" name="ts" value="tab" checked> Tab</label>
        <label><input type="radio" name="ts" value=","> 逗號</label>
        <label><input type="radio" name="ts" value=" - "> 連字號 -</label>
        <label><input type="radio" name="ts" value="custom"> <input class="input xs" id="im-ts" value=":" aria-label="自訂分隔"></label>
      </div>
      <div><b>卡片之間</b>
        <label><input type="radio" name="cs" value="nl" checked> 換行</label>
        <label><input type="radio" name="cs" value=";"> 分號</label>
        <label><input type="radio" name="cs" value="custom"> <input class="input xs" id="im-cs" value="\\n\\n" aria-label="自訂分隔"></label>
      </div>
    </div>
    <div class="im-prev" id="im-p"><span class="muted">預覽會顯示在這裡</span></div>
    <button class="btn primary block" data-a="go">匯入</button>`, {
    go: (t, e, close) => { const items = parse(); if (!items.length) return toast('沒有可匯入的內容'); close(); onDone(items); },
  });
  const unesc = v => v.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  function parse() {
    const text = $('#im-t', s.root).value.replace(/\r\n?/g, '\n');
    let ts = $('input[name=ts]:checked', s.root).value, cs = $('input[name=cs]:checked', s.root).value;
    ts = ts === 'tab' ? '\t' : ts === 'custom' ? unesc($('#im-ts', s.root).value) || '\t' : ts;
    cs = cs === 'nl' ? '\n' : cs === 'custom' ? unesc($('#im-cs', s.root).value) || '\n' : cs;
    return text.split(cs).map(l => l.trim()).filter(Boolean).map(l => {
      const i = l.indexOf(ts);
      return i < 0 ? { term: l, def: '' } : { term: l.slice(0, i).trim(), def: l.slice(i + ts.length).trim() };
    }).filter(x => x.term || x.def);
  }
  const prev = () => {
    const it = parse();
    $('#im-p', s.root).innerHTML = it.length ? `<b>${it.length} 張卡片</b>${it.slice(0, 6).map(x => `<div><span>${esc(x.term)}</span><span>${esc(x.def)}</span></div>`).join('')}${it.length > 6 ? '<span class="muted">…</span>' : ''}` : '<span class="muted">預覽會顯示在這裡</span>';
  };
  s.root.addEventListener('input', prev);
  s.root.addEventListener('change', prev);
  setTimeout(() => $('#im-t', s.root).focus(), 80);
}

/* ---------- 滑動手勢 ---------- */
function bindSwipe(el, { tap, left, right }) {
  let sx = 0, sy = 0, dx = 0, drag = false, moved = false;
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('[data-a]') || e.button > 0) return;
    sx = e.clientX; sy = e.clientY; dx = 0; drag = true; moved = false;
    try { el.setPointerCapture(e.pointerId); } catch (_) { }
    el.style.transition = 'none';
  });
  el.addEventListener('pointermove', e => {
    if (!drag) return;
    dx = e.clientX - sx;
    if (Math.abs(dx) > 8 || Math.abs(e.clientY - sy) > 8) moved = true;
    el.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
    el.classList.toggle('sw-l', dx < -50); el.classList.toggle('sw-r', dx > 50);
  });
  const end = () => {
    if (!drag) return;
    drag = false; el.style.transition = ''; el.classList.remove('sw-l', 'sw-r');
    if (!moved) { el.style.transform = ''; tap(); return; }
    if (dx > 90) right(); else if (dx < -90) left(); else el.style.transform = '';
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => { drag = false; el.style.transition = ''; el.style.transform = ''; el.classList.remove('sw-l', 'sw-r'); });
}

/* ---------- 字卡模式 ---------- */
function modeFlashcards(set) {
  const o = S.settings.fc = Object.assign({ front: 'term', track: true, starred: false, shuffle: false }, S.settings.fc || {});
  let deck = [], pos = 0, flipped = false, know = [], still = [], hist = [], autoT = 0, busy = false;
  const base = () => { const b = set.cards.filter(c => !o.starred || c.star); return b.length ? b : set.cards; };
  const build = cards => { deck = o.shuffle ? shuffle(cards) : [...cards]; pos = 0; flipped = false; know = []; still = []; hist = []; };
  // 進度保存：記錄在 set.fc，刷完後清除（再開就是全新一輪）
  const keepState = () => {
    set.fc = pos >= deck.length ? null : { deck: deck.map(c => c.id), pos, know: know.map(c => c.id), still: still.map(c => c.id), hist: hist.slice(-50).filter(h => h.c).map(h => ({ id: h.c.id, k: h.k, lv: h.lv })) };
    save();
  };
  let resumed = false;
  const restore = () => {
    const s = set.fc; if (!s || !Array.isArray(s.deck)) return false;
    const by = new Map(set.cards.map(c => [c.id, c])), get = ids => (ids || []).map(i => by.get(i)).filter(Boolean);
    const dk = get(s.deck);
    if (!dk.length || !(s.pos < s.deck.length)) return false;
    deck = dk; pos = Math.min(Math.max(0, s.pos | 0), dk.length - 1); flipped = false;
    know = get(s.know); still = get(s.still);
    hist = (s.hist || []).map(h => ({ c: by.get(h.id), k: h.k, lv: h.lv })).filter(h => h.c);
    return true;
  };
  if (restore()) resumed = true; else build(base());
  render(`<div class="study">${studyTop(set, '字卡', `<button class="icon-btn" data-a="opts" aria-label="選項">${ic('sliders')}</button>`)}
    <div class="top-prog"><div class="bar"><i id="fp"></i></div></div>
    <div class="fc-stage" id="stage"></div>
    <div class="fc-ctl" id="ctl"></div></div>`, { nav: false, cls: 'full' });
  onCleanup(() => clearInterval(autoT));

  const face = (c, isTerm) => {
    const txt = isTerm ? c.term : c.def;
    return `<span class="fc-side">${isTerm ? '詞語' : '定義'}</span><div class="fc-tools"><button class="icon-btn sm" data-a="say" data-side="${isTerm ? 't' : 'd'}" aria-label="朗讀">${ic('sound')}</button><button class="icon-btn sm star ${c.star ? 'on' : ''}" data-a="star" aria-label="星號">${ic('star')}</button></div>${!isTerm && c.img ? `<img class="fc-img" src="${c.img}" alt="">` : ''}<div class="fc-text ${sz(txt)}">${txt ? fmt(txt) : '<span class="muted">（空白）</span>'}</div>`;
  };
  function draw() {
    busy = false;
    keepState();
    $('#fp').style.width = (deck.length ? pos / deck.length * 100 : 0) + '%';
    if (pos >= deck.length) return summary();
    const c = deck[pos], fT = o.front === 'term';
    $('#stage').innerHTML = `<div class="fc big ${flipped ? 'flipped' : ''}" id="fc"><div class="fc-inner"><div class="face front">${face(c, fT)}</div><div class="face back">${face(c, !fT)}</div></div><div class="sw-tag l">學習中</div><div class="sw-tag r">知道</div></div>`;
    const autoBtn = `<button class="icon-btn ${autoT ? 'on' : ''}" data-a="auto" aria-label="自動播放">${ic(autoT ? 'pause' : 'play')}</button>`;
    $('#ctl').innerHTML = o.track
      ? `<div class="fc-count"><span class="still"><b>${still.length}</b> 學習中</span><span class="muted">${pos + 1} / ${deck.length}</span><span class="know"><b>${know.length}</b> 知道</span></div>
         <div class="fc-btns"><button class="icon-btn" data-a="undo" ${hist.length ? '' : 'disabled'} aria-label="上一張">${ic('undo')}</button><div class="mid"><button class="circle bad" data-a="no" aria-label="學習中">${ic('close')}</button><button class="circle good" data-a="yes" aria-label="知道">${ic('check')}</button></div>${autoBtn}</div>`
      : `<div class="fc-count"><span></span><span class="muted">${pos + 1} / ${deck.length}</span><span></span></div>
         <div class="fc-btns"><button class="icon-btn ${o.shuffle ? 'on' : ''}" data-a="shuf" aria-label="隨機">${ic('shuffle')}</button><div class="mid"><button class="circle" data-a="prev" ${pos ? '' : 'disabled'} aria-label="上一張">${ic('left')}</button><button class="circle" data-a="next" aria-label="下一張">${ic('right')}</button></div>${autoBtn}</div>`;
    bindSwipe($('#fc'), { tap: flip, left: () => o.track ? mark(false) : step(1, -1), right: () => o.track ? mark(true) : step(-1, 1) });
    if (S.settings.autoSpeak) speakSide(fT);
  }
  function speakSide(isTerm) { const c = deck[pos]; if (c) TTS.speak(isTerm ? c.term : c.def, isTerm ? set.termLang : set.defLang); }
  function flip() { flipped = !flipped; const el = $('#fc'); if (el) el.classList.toggle('flipped', flipped); if (flipped && S.settings.autoSpeak) speakSide(o.front !== 'term'); }
  function fly(dir, then) {
    const el = $('#fc'); busy = true;
    if (!el) return then();
    el.style.transition = 'transform .22s ease-in, opacity .22s';
    el.style.transform = `translateX(${dir * 130}%) rotate(${dir * 14}deg)`; el.style.opacity = '0';
    later(then, 200);
  }
  function mark(k) {
    if (busy || pos >= deck.length) return;
    const c = deck[pos];
    hist.push({ c, k, lv: c.lv });
    if (k) { know.push(c); c.lv = Math.max(c.lv, 2); } else { still.push(c); c.lv = 1; }
    act();
    fly(k ? 1 : -1, () => { pos++; flipped = false; draw(); });
  }
  function step(d, flyDir) {
    if (busy) return;
    const np = pos + d;
    if (np < 0) { const el = $('#fc'); if (el) el.style.transform = ''; return; }
    fly(flyDir ?? -d, () => { pos = np; flipped = false; draw(); });
  }
  function undo() {
    if (busy || !hist.length) return;
    const h = hist.pop(); h.c.lv = h.lv;
    if (h.k === true) know.pop(); else if (h.k === false) still.pop();
    pos--; flipped = false; draw();
  }
  function stopAuto() { clearInterval(autoT); autoT = 0; }
  function toggleAuto() {
    if (autoT) { stopAuto(); draw(); return; }
    autoT = setInterval(() => {
      if (pos >= deck.length) { stopAuto(); return; }
      if (!flipped) flip();
      else { hist.push({ c: deck[pos], k: null, lv: deck[pos].lv }); fly(1, () => { pos++; flipped = false; draw(); }); }
    }, 3200);
    draw();
  }
  function summary() {
    stopAuto();
    const total = deck.length, pct = Math.round(know.length / Math.max(1, total) * 100);
    $('#ctl').innerHTML = '';
    $('#stage').innerHTML = o.track ? `<div class="summary">
        <h2>${still.length ? '做得好！繼續加油 💪' : '太棒了！你全部都知道 🎉'}</h2>
        <div class="sum-grid"><div class="ring" style="--p:${pct}"><span>${pct}%</span></div><div class="sum-legend"><div class="know">知道　${know.length}</div><div class="still">學習中　${still.length}</div><div class="muted">略過　${total - know.length - still.length}</div></div></div>
        ${still.length ? `<button class="btn primary lg block" data-a="again">繼續複習 ${still.length} 個學習中的詞語</button>` : ''}
        <a class="btn outline block" href="#/s/${set.id}/learn">用「學習」模式練習</a>
        <button class="btn ghost block" data-a="restart">重新開始字卡</button>
        ${hist.length ? `<button class="btn ghost block" data-a="undo">${ic('undo')} 回到最後一張</button>` : ''}
      </div>` : `<div class="summary"><h2>你已瀏覽完所有字卡 👏</h2><p class="muted">共 ${total} 張</p><button class="btn primary lg block" data-a="restart">重新開始</button><a class="btn outline block" href="#/s/${set.id}/learn">前往「學習」模式</a></div>`;
  }
  H = {
    yes: () => mark(true), no: () => mark(false), undo,
    prev: () => step(-1, 1), next: () => step(1, -1),
    shuf: () => { o.shuffle = !o.shuffle; save(); build(base()); draw(); toast(o.shuffle ? '已隨機排列' : '已恢復原始順序'); },
    auto: toggleAuto,
    again: () => { const s = [...still]; build(s); draw(); },
    restart: () => { build(base()); draw(); },
    say: t => speakSide(t.dataset.side === 't'),
    star: () => { const c = deck[pos]; c.star = !c.star; $$('#fc .star').forEach(b => b.classList.toggle('on', c.star)); save(); },
    opts: () => {
      const s = sheet(`<h3 class="sheet-title">字卡選項</h3>
        ${swRow('追蹤進度', 'track', o.track, '左滑＝學習中，右滑＝知道')}
        ${swRow('隨機排列', 'shuffle', o.shuffle)}
        ${swRow('只學習星號詞語', 'starred', o.starred)}
        ${swRow('自動朗讀', 'autoSpeak', S.settings.autoSpeak, '', 'g')}
        <div class="set-row"><span>正面顯示</span><div class="seg">${['term', 'def'].map(v => `<button data-a="front" data-v="${v}" class="${o.front === v ? 'on' : ''}">${v === 'term' ? '詞語' : '定義'}</button>`).join('')}</div></div>
        <button class="btn ghost block mt" data-a="reset">${ic('reset')} 重新開始字卡</button>`, {
        front: t => { o.front = t.dataset.v; $$('[data-a=front]', s.root).forEach(b => b.classList.toggle('on', b === t)); save(); flipped = false; draw(); },
        reset: (t, e, c) => { build(base()); draw(); c(); },
      });
      s.root.addEventListener('change', e => {
        const t = e.target;
        if (t.dataset.g) { S.settings[t.dataset.g] = t.checked; save(); return; }
        const k = t.dataset.o; if (!k) return;
        o[k] = t.checked; save();
        if (k === 'starred' && o.starred && !set.cards.some(c => c.star)) toast('這個學習集還沒有加上星號的詞語');
        build(base()); draw();
      });
    },
    $keydown: e => {
      if (typing(e)) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); if (pos < deck.length) flip(); }
      else if (e.key === 'ArrowRight') o.track ? mark(true) : step(1, -1);
      else if (e.key === 'ArrowLeft') o.track ? mark(false) : step(-1, 1);
      else if (e.key.toLowerCase() === 'z') undo();
    },
  };
  draw();
  if (resumed) toast(`已接續上次進度（第 ${pos + 1} / ${deck.length} 張）`);
}

/* ---------- 學習模式 ---------- */
function modeLearn(set) {
  const o = S.settings.learn = Object.assign({ mc: true, wr: true, tf: false, dir: 'def', starred: false, size: 7 }, S.settings.learn || {});
  let pool = [], prog, round = [], ri = 0, seen, roundNo = 0, cur = null, locked = false;
  function init() {
    pool = usable(set).filter(c => !o.starred || c.star);
    if (!pool.length) pool = usable(set);
    prog = new Map(pool.map(c => [c.id, c.lv >= 3 ? 2 : c.lv >= 2 ? 1 : 0]));
  }
  init();
  if (!pool.length) { toast('需要同時有詞語與定義的卡片'); return go('#/set/' + set.id); }
  render(`<div class="study">${studyTop(set, '學習', `<button class="icon-btn" data-a="opts" aria-label="選項">${ic('sliders')}</button>`)}
    <div class="top-prog"><div class="bar ok"><i id="lp"></i></div><span id="lpt"></span></div>
    <div class="learn-body" id="lb"></div></div>`, { nav: false, cls: 'full' });
  const mastered = () => pool.filter(c => prog.get(c.id) >= 2).length;
  const upd = () => { const m = mastered(); $('#lp').style.width = m / pool.length * 100 + '%'; $('#lpt').textContent = `${m} / ${pool.length}`; };
  function newRound() {
    const rem = pool.filter(c => prog.get(c.id) < 2);
    if (!rem.length) return finish();
    const inprog = rem.filter(c => prog.get(c.id) > 0), fresh = rem.filter(c => !prog.get(c.id));
    round = shuffle([...inprog, ...fresh].slice(0, o.size));
    ri = 0; seen = new Set(); roundNo++;
    ask();
  }
  function pickType(p) {
    const rec = [o.mc && 'mc', o.tf && 'tf'].filter(Boolean);
    if (p === 0) return rec.length ? pick(rec) : 'wr';
    return o.wr ? 'wr' : pick(rec);
  }
  function ask() {
    if (ri >= round.length) return checkpoint();
    const c = round[ri]; seen.add(c);
    const p = prog.get(c.id), type = pickType(p);
    const dir = o.dir === 'both' ? pick(['term', 'def']) : o.dir;
    const Q = qa(set, c, dir);
    cur = { c, Q, type, p, lv: c.lv }; locked = false;
    upd();
    let body = '';
    if (type === 'mc') {
      cur.opts = shuffle([Q.a, ...distractors(set.cards, c, dir, 3)]);
      body = `<div class="q-sub">選擇正確的${Q.aLabel}</div><div class="choices">${cur.opts.map((t, i) => `<button class="choice" data-a="pick" data-i="${i}"><span class="kbd">${i + 1}</span><span>${fmt(t)}</span></button>`).join('')}</div>`;
    } else if (type === 'tf') {
      const wrong = distractors(set.cards, c, dir, 1)[0];
      cur.truth = Math.random() < .5 || !wrong; cur.shown = cur.truth ? Q.a : wrong;
      body = `<div class="q-sub">這個${Q.aLabel}正確嗎？</div><div class="tf-shown">${fmt(cur.shown)}</div><div class="choices two"><button class="choice" data-a="tf" data-v="1">對</button><button class="choice" data-a="tf" data-v="0">錯</button></div>`;
    } else {
      body = `<div class="q-sub">輸入${Q.aLabel}</div><form class="wr"><input class="input lg" id="wr-in" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="輸入答案" enterkeyhint="done"><div class="row gap"><button type="button" class="btn ghost" data-a="dk">不知道？</button><button class="btn primary grow" type="submit">回答</button></div></form>`;
    }
    $('#lb').innerHTML = `<div class="q-wrap"><div class="q-card"><div class="q-label"><span>${Q.qLabel}${p > 0 ? ' · <span style="color:var(--ok)">再答對一次就精通</span>' : ''}</span><button class="icon-btn sm" data-a="sayq" aria-label="朗讀">${ic('sound')}</button></div>${Q.qImg ? `<img class="q-img" src="${Q.qImg}" alt="">` : ''}<div class="q-text ${sz(Q.q)}">${fmt(Q.q)}</div></div>${body}<div id="fb"></div></div>`;
    $('#lb').scrollTop = 0;
    if (type === 'wr') setTimeout(() => { const i = $('#wr-in'); if (i) i.focus(); }, 60);
    if (S.settings.autoSpeak) TTS.speak(Q.q, Q.qLang);
  }
  function result(ok, { chosen, typed, close } = {}) {
    if (locked) return; locked = true;
    const { c, Q, type, p } = cur;
    act();
    if (ok) { prog.set(c.id, p + 1); c.lv = p + 1 >= 2 ? 3 : Math.max(c.lv, 2); }
    else { prog.set(c.id, 0); c.lv = 1; if (round.indexOf(c, ri + 1) < 0) { round.push(c); cur.pushed = true; } }
    save(); upd();
    if (type === 'mc') $$('.choice').forEach((b, i) => { b.disabled = true; if (cur.opts[i] === Q.a) b.classList.add('right'); else if (i === chosen) b.classList.add('wrong'); else b.classList.add('dim'); });
    if (type === 'tf') $$('.choice').forEach(b => { b.disabled = true; const v = b.dataset.v === '1'; if (v === cur.truth) b.classList.add('right'); else if (v === chosen) b.classList.add('wrong'); });
    if (type === 'wr') { const i = $('#wr-in'); if (i) { i.disabled = true; i.blur(); } $$('.wr button').forEach(b => b.disabled = true); }
    const fb = $('#fb');
    if (ok) {
      fb.innerHTML = `<div class="fb ok">${ic('check')} ${pick(PRAISE)}${close ? `（正確拼法：${esc(Q.a)}）` : ''}</div>`;
      later(next, close ? 1800 : 900);
    } else {
      fb.innerHTML = `<div class="fb bad">${pick(ENCOURAGE)}</div>
        ${type !== 'mc' ? `<div class="ans-cmp">${type === 'wr' ? `<div class="you"><small>你的答案</small>${typed ? fmt(typed) : '<i>略過</i>'}</div>` : ''}<div class="right"><small>正確答案</small>${fmt(Q.a)}</div></div>` : ''}
        <div class="row gap mt">${type === 'wr' && typed ? '<button class="btn ghost" data-a="override">我答對了</button>' : ''}<button class="btn primary grow" data-a="cont">繼續</button></div>`;
      const b = $('[data-a=cont]'); if (b) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
  function next() { ri++; ask(); }
  function checkpoint() {
    upd();
    const m = mastered();
    if (m >= pool.length) return finish();
    $('#lb').innerHTML = `<div class="checkpoint"><div class="cp-emoji">🎯</div><h2>做得好，你正在進步！</h2><p class="muted">第 ${roundNo} 回合完成 · 已精通 ${m} / ${pool.length}</p>
      <div class="cp-list">${[...seen].map(c => `<div class="cp-row ${prog.get(c.id) >= 2 ? 'ok' : ''}"><b>${fmt(c.term)}</b><span>${fmt(c.def)}</span></div>`).join('')}</div>
      <button class="btn primary block lg" data-a="nextRound">繼續學習</button></div>`;
  }
  function finish() {
    upd();
    $('#lb').innerHTML = `<div class="checkpoint"><div class="cp-emoji">🏆</div><h2>恭喜！你已精通全部 ${pool.length} 個詞語</h2><p class="muted">持續使用「記憶複習」讓它們留在長期記憶中。</p>
      <a class="btn primary block lg" href="#/s/${set.id}/test">進行測驗</a><a class="btn outline block" href="#/s/${set.id}/review">記憶複習</a><button class="btn ghost block" data-a="reset">重新學習全部詞語</button></div>`;
  }
  function resetAll() { pool.forEach(c => { c.lv = 0; }); save(); init(); roundNo = 0; newRound(); }
  H = {
    pick: t => result(cur.opts[+t.dataset.i] === cur.Q.a, { chosen: +t.dataset.i }),
    tf: t => { const v = t.dataset.v === '1'; result(v === cur.truth, { chosen: v }); },
    dk: () => result(false, {}),
    $submit: () => { if (locked || !cur || cur.type !== 'wr') return; const v = $('#wr-in').value; if (!v.trim()) return; const r = check(v, cur.Q.a); result(r.ok, { typed: v, close: r.close }); },
    override: () => {
      const { c, p } = cur; prog.set(c.id, p + 1); c.lv = p + 1 >= 2 ? 3 : Math.max(cur.lv, 2);
      if (cur.pushed) { const k = round.lastIndexOf(c); if (k > ri) round.splice(k, 1); }
      save(); next();
    },
    cont: next, nextRound: newRound, reset: resetAll,
    sayq: () => TTS.speak(cur.Q.q, cur.Q.qLang),
    opts: () => {
      const s = sheet(`<h3 class="sheet-title">學習選項</h3>
        <div class="group-title" style="margin-top:0">題型</div>
        ${swRow('選擇題', 'mc', o.mc)}${swRow('是非題', 'tf', o.tf)}${swRow('填寫題', 'wr', o.wr, '需輸入答案才能精通')}
        <div class="set-row"><span>作答方式</span><div class="seg">${[['def', '定義'], ['term', '詞語'], ['both', '兩者']].map(([v, l]) => `<button data-a="dir" data-v="${v}" class="${o.dir === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        ${swRow('只學習星號詞語', 'starred', o.starred)}
        <div class="set-row"><span>每回合題數</span><select class="input sm" id="lsz">${[5, 7, 10, 15, 20].map(v => `<option ${v === o.size ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <button class="btn primary block mt" data-a="apply">套用</button>
        <button class="btn ghost block" data-a="reset">${ic('reset')} 重設學習進度</button>`, {
        dir: t => { o.dir = t.dataset.v; $$('[data-a=dir]', s.root).forEach(b => b.classList.toggle('on', b === t)); },
        apply: (t, e, c) => {
          $$('[data-o]', s.root).forEach(i => o[i.dataset.o] = i.checked);
          if (!o.mc && !o.tf && !o.wr) { o.mc = true; toast('至少需要一種題型，已啟用選擇題'); }
          o.size = +$('#lsz', s.root).value; save(); c(); init(); roundNo = 0; newRound();
        },
        reset: async (t, e, c) => { c(); if (await confirmDlg('重設這個學習集的學習進度？', { danger: true, ok: '重設' })) resetAll(); },
      });
    },
    $keydown: e => {
      if (!cur) return;
      if (!locked && cur.type === 'mc' && /^[1-4]$/.test(e.key) && !typing(e)) { const i = +e.key - 1; if (cur.opts[i] != null) H.pick({ dataset: { i } }); }
      else if (!locked && cur.type === 'tf' && !typing(e) && (e.key === '1' || e.key === '2')) H.tf({ dataset: { v: e.key === '1' ? '1' : '0' } });
      else if (locked && e.key === 'Enter' && $('[data-a=cont]') && !typing(e)) { e.preventDefault(); next(); }
      else if (e.key === 'Enter' && !typing(e)) { const b = $('[data-a=nextRound]'); if (b) { e.preventDefault(); newRound(); } }
    },
  };
  newRound();
}

/* ---------- 測驗模式 ---------- */
function modeTest(set) {
  const o = S.settings.test = Object.assign({ n: 20, dir: 'def', tf: true, mc: true, match: true, wr: true, starred: false }, S.settings.test || {});
  const all = usable(set);
  if (!all.length) { toast('需要同時有詞語與定義的卡片'); return go('#/set/' + set.id); }
  const base = () => { const b = all.filter(c => !o.starred || c.star); return b.length ? b : all; };
  let qs = [], ans = [], t0 = 0;
  function setup() {
    const max = base().length; o.n = clamp(o.n || 20, 1, max);
    render(`<div class="study">${studyTop(set, '測驗')}<div class="study-body scroll"><div class="panel setup">
      <div class="setup-head"><div><div class="eyebrow">${esc(set.title)}</div><h2>設定你的測驗</h2></div><span style="color:var(--primary)">${ic('test', 'xl')}</span></div>
      <div class="set-row"><span>問題數<small>最多 ${max} 題</small></span><input type="number" inputmode="numeric" class="input xs" data-t="n" min="1" max="${max}" value="${o.n}"></div>
      <div class="set-row"><span>作答方式</span><select class="input sm" data-t="dir"><option value="def" ${o.dir === 'def' ? 'selected' : ''}>定義</option><option value="term" ${o.dir === 'term' ? 'selected' : ''}>詞語</option><option value="both" ${o.dir === 'both' ? 'selected' : ''}>兩者</option></select></div>
      ${swRow('是非題', 'tf', o.tf)}${swRow('選擇題', 'mc', o.mc)}${swRow('配對題', 'match', o.match)}${swRow('填寫題', 'wr', o.wr)}${swRow('只測驗星號詞語', 'starred', o.starred)}
      <button class="btn primary block lg mt" data-a="start">開始測驗</button></div></div></div>`, { nav: false, cls: 'full' });
    H = {
      $change: e => {
        const t = e.target;
        if (t.dataset.o) { o[t.dataset.o] = t.checked; save(); if (t.dataset.o === 'starred') setup(); }
        if (t.dataset.t === 'n') { o.n = clamp(parseInt(t.value) || 1, 1, base().length); t.value = o.n; save(); }
        if (t.dataset.t === 'dir') { o.dir = t.value; save(); }
      },
      start: () => { const inp = $('[data-t=n]'); o.n = clamp(parseInt(inp.value) || 1, 1, base().length); gen(); },
    };
  }
  function gen() {
    const types = ['tf', 'mc', 'match', 'wr'].filter(t => o[t]);
    if (!types.length) return toast('請至少選擇一種題型');
    const cards = shuffle(base()).slice(0, o.n);
    const by = { tf: [], mc: [], match: [], wr: [] };
    cards.forEach((c, i) => by[types[i % types.length]].push(c));
    if (by.match.length === 1 && types.length > 1) { const alt = types.find(t => t !== 'match'); by[alt].push(by.match.pop()); }
    const D = () => o.dir === 'both' ? pick(['term', 'def']) : o.dir;
    qs = [];
    by.tf.forEach(c => { const d = D(), Q = qa(set, c, d); const wrong = distractors(set.cards, c, d, 1)[0]; const truth = Math.random() < .5 || !wrong; qs.push({ t: 'tf', c, Q, truth, shown: truth ? Q.a : wrong }); });
    by.mc.forEach(c => { const d = D(), Q = qa(set, c, d); qs.push({ t: 'mc', c, Q, opts: shuffle([Q.a, ...distractors(set.cards, c, d, 3)]) }); });
    for (let i = 0; i < by.match.length; i += 5) { const d = o.dir === 'both' ? 'def' : o.dir; const items = by.match.slice(i, i + 5).map(c => ({ c, Q: qa(set, c, d) })); qs.push({ t: 'match', items, opts: shuffle(items.map(x => x.Q.a)) }); }
    by.wr.forEach(c => qs.push({ t: 'wr', c, Q: qa(set, c, D()) }));
    ans = qs.map(q => q.t === 'match' ? q.items.map(() => '') : null);
    t0 = Date.now();
    paper();
  }
  function paper() {
    const total = qs.reduce((n, q) => n + (q.t === 'match' ? q.items.length : 1), 0);
    const secT = { tf: '是非題', mc: '選擇題', match: '配對題', wr: '填寫題' };
    let num = 0, lastT = '';
    const html = qs.map((q, i) => {
      let h = '';
      if (q.t !== lastT) { lastT = q.t; h += `<div class="tsec">${secT[q.t]}</div>`; }
      if (q.t === 'match') {
        const st = num + 1; num += q.items.length;
        return h + `<div class="tq"><div class="tq-head"><span>為每個項目選擇對應的${q.items[0].Q.aLabel}</span><span>${st}–${num} / ${total}</span></div>
          <div class="m-opts">${q.opts.map((a, k) => `<div class="m-opt"><b>${String.fromCharCode(65 + k)}</b><span>${fmt(a)}</span></div>`).join('')}</div>
          ${q.items.map((it, j) => `<div class="m-item"><div class="m-q">${it.Q.qImg ? `<img class="thumb" src="${it.Q.qImg}" alt="">` : ''}${fmt(it.Q.q)}</div><select class="input sm" data-q="${i}" data-j="${j}"><option value="">—</option>${q.opts.map((a, k) => `<option value="${k}">${String.fromCharCode(65 + k)}</option>`).join('')}</select></div>`).join('')}</div>`;
      }
      num++;
      h += `<div class="tq"><div class="tq-head"><span>${q.Q.qLabel}</span><span>${num} / ${total}</span></div>${q.Q.qImg ? `<img class="q-img" src="${q.Q.qImg}" alt="">` : ''}<div class="tq-q ${sz(q.Q.q)}">${fmt(q.Q.q)}</div>`;
      if (q.t === 'tf') h += `<div class="tq-shown"><small>${q.Q.aLabel}</small>${fmt(q.shown)}</div><div class="choices two"><button class="choice" data-a="tans" data-q="${i}" data-v="1">對</button><button class="choice" data-a="tans" data-q="${i}" data-v="0">錯</button></div>`;
      if (q.t === 'mc') h += `<div class="tq-sub">選擇${q.Q.aLabel}</div><div class="choices">${q.opts.map((a, k) => `<button class="choice" data-a="tans" data-q="${i}" data-v="${k}"><span class="kbd">${String.fromCharCode(65 + k)}</span><span>${fmt(a)}</span></button>`).join('')}</div>`;
      if (q.t === 'wr') h += `<div class="tq-sub">你的答案（${q.Q.aLabel}）</div><input class="input" data-q="${i}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="輸入答案">`;
      return h + '</div>';
    }).join('');
    render(`<div class="study">${studyTop(set, '測驗', `<span class="pill" style="margin-right:8px">${total} 題</span>`)}<div class="study-body scroll">${html}
      <div class="submit-zone"><div class="muted">全部作答完了嗎？</div><button class="btn primary lg" data-a="submit">提交測驗</button></div></div></div>`, { nav: false, cls: 'full' });
    H = {
      tans: t => { const i = +t.dataset.q; ans[i] = t.dataset.v; $$(`[data-a=tans][data-q="${i}"]`).forEach(b => b.classList.toggle('sel', b === t)); },
      $input: e => { const t = e.target; if (t.tagName === 'INPUT' && t.dataset.q != null) ans[+t.dataset.q] = t.value; },
      $change: e => { const t = e.target; if (t.tagName === 'SELECT' && t.dataset.j != null) ans[+t.dataset.q][+t.dataset.j] = t.value; },
      submit,
    };
  }
  async function submit() {
    let blanks = 0;
    qs.forEach((q, i) => { if (q.t === 'match') blanks += ans[i].filter(x => x === '').length; else if (ans[i] == null || ans[i] === '') blanks++; });
    if (blanks && !(await confirmDlg(`還有 ${blanks} 題未作答，確定要提交嗎？`, { ok: '提交' }))) return;
    let right = 0, total = 0;
    const up = (c, ok) => { c.lv = ok ? Math.max(c.lv, 2) : 1; };
    const res = qs.map((q, i) => {
      if (q.t === 'match') return q.items.map((it, j) => { total++; const v = ans[i][j]; const ok = v !== '' && q.opts[+v] === it.Q.a; if (ok) right++; up(it.c, ok); return ok; });
      total++;
      let ok = false;
      if (q.t === 'tf') ok = ans[i] != null && (ans[i] === '1') === q.truth;
      if (q.t === 'mc') ok = ans[i] != null && q.opts[+ans[i]] === q.Q.a;
      if (q.t === 'wr') ok = check(ans[i] || '', q.Q.a).ok;
      if (ok) right++; up(q.c, ok);
      return ok;
    });
    act(total);
    results(res, right, total);
  }
  function results(res, right, total) {
    const pct = Math.round(right / total * 100), secs = Math.round((Date.now() - t0) / 1000);
    const rrow = (Q, your, ok, extra = '', corr = null) => `<div class="tq res ${ok ? 'ok' : 'bad'}"><div class="tq-head"><span>${ok ? ic('check') + ' 正確' : ic('close') + ' 錯誤'}</span><span>${Q.qLabel}</span></div><div class="tq-q s">${fmt(Q.q)}</div>${extra}<div class="ans-cmp">${ok ? '' : `<div class="you"><small>你的答案</small>${your ? fmt(your) : '<i>未作答</i>'}</div>`}<div class="right"><small>${ok ? '你的答案' : '正確答案'}</small>${fmt(corr ?? Q.a)}</div></div></div>`;
    const rows = qs.map((q, i) => {
      if (q.t === 'match') return q.items.map((it, j) => rrow(it.Q, ans[i][j] !== '' ? q.opts[+ans[i][j]] : '', res[i][j])).join('');
      if (q.t === 'tf') return rrow(q.Q, ans[i] == null ? '' : ans[i] === '1' ? '對' : '錯', res[i], `<div class="tq-shown"><small>題目給的${q.Q.aLabel}</small>${fmt(q.shown)}</div>`, q.truth ? '對' : `錯（正確為：${q.Q.a}）`);
      if (q.t === 'mc') return rrow(q.Q, ans[i] == null ? '' : q.opts[+ans[i]], res[i]);
      return rrow(q.Q, ans[i] || '', res[i], '', res[i] ? ans[i] : null);
    }).join('');
    render(`<div class="study">${studyTop(set, '測驗結果')}<div class="study-body scroll">
      <div class="panel result-head"><div class="ring big" style="--p:${pct}"><span>${pct}%</span></div><div><h2>${pct >= 90 ? '太厲害了！🎉' : pct >= 70 ? '做得不錯！' : '繼續努力，你會進步的！'}</h2><div class="res-meta"><span class="ok-t">答對 ${right}</span><span class="bad-t">答錯 ${total - right}</span><span class="muted">${Math.floor(secs / 60)} 分 ${secs % 60} 秒</span></div></div></div>
      <div class="row gap"><button class="btn primary grow" data-a="retake">再測一次</button><button class="btn outline grow" data-a="setup">更改設定</button></div>
      ${right < total ? `<a class="btn ghost block mt" href="#/s/${set.id}/learn">用「學習」練習答錯的詞語</a>` : ''}
      <div class="tsec">你的答案</div>${rows}</div></div>`, { nav: false, cls: 'full' });
    H = { retake: gen, setup };
  }
  setup();
}

/* ---------- 配對遊戲 ---------- */
function modeMatch(set) {
  const cards = set.cards.filter(c => c.term.trim() && (c.def.trim() || c.img));
  if (cards.length < 2) { toast('配對至少需要 2 張完整的卡片'); return go('#/set/' + set.id); }
  const key = 'm' + set.id;
  let tiles = [], sel = -1, t0 = 0, iv = 0, pen = 0, left = 0;
  onCleanup(() => clearInterval(iv));
  function intro() {
    const best = S.best[key];
    render(`<div class="study">${studyTop(set, '配對')}<div class="study-body centered"><div class="intro">${ic('match')}<h2>準備好開始了嗎？</h2><p class="muted">把所有詞語與定義配對起來，越快越好！<br>配對錯誤會加罰 1 秒。</p>${best ? `<p>最佳紀錄：<b>${(best / 1000).toFixed(1)} 秒</b></p>` : ''}<button class="btn primary lg" data-a="go" style="min-width:200px">開始遊戲</button></div></div></div>`, { nav: false, cls: 'full' });
    H = { go: start };
  }
  function start() {
    const pk = shuffle(cards).slice(0, 6);
    tiles = shuffle(pk.flatMap(c => [{ id: c.id, k: 't', text: c.term }, { id: c.id, k: 'd', text: c.def, img: c.img }]));
    sel = -1; pen = 0; left = pk.length; t0 = performance.now();
    render(`<div class="study">${studyTop(set, '配對', '<div class="timer" id="tm">0.0</div>')}<div class="match-grid" id="mg">${tiles.map((t, i) => `<button class="tile-m ${sz(t.text) === 'l' ? '' : sz(t.text)}" data-a="tap" data-i="${i}">${t.img ? `<img src="${t.img}" alt="">` : ''}<span>${fmt(t.text)}</span></button>`).join('')}</div></div>`, { nav: false, cls: 'full' });
    clearInterval(iv);
    iv = setInterval(() => { const e = $('#tm'); if (e) e.textContent = ((performance.now() - t0 + pen) / 1000).toFixed(1); }, 100);
    H = { tap };
  }
  function tap(el) {
    const i = +el.dataset.i;
    if (el.classList.contains('gone') || el.classList.contains('ok')) return;
    if (sel < 0) { sel = i; el.classList.add('sel'); return; }
    if (sel === i) { el.classList.remove('sel'); sel = -1; return; }
    const a = tiles[sel], b = tiles[i], ea = $(`#mg [data-i="${sel}"]`);
    ea.classList.remove('sel');
    if (a.id === b.id && a.k !== b.k) {
      ea.classList.add('ok'); el.classList.add('ok');
      later(() => { ea.classList.add('gone'); el.classList.add('gone'); }, 220);
      left--; act();
      const c = set.cards.find(x => x.id === a.id); if (c) c.lv = Math.max(c.lv, 1);
      if (!left) { clearInterval(iv); later(finish, 380); }
    } else {
      ea.classList.add('bad'); el.classList.add('bad'); pen += 1000;
      const p = document.createElement('div'); p.className = 'penalty'; p.textContent = '+1 秒'; document.body.appendChild(p); setTimeout(() => p.remove(), 800);
      later(() => { ea.classList.remove('bad'); el.classList.remove('bad'); }, 420);
    }
    sel = -1;
  }
  function finish() {
    const ms = performance.now() - t0 + pen, best = S.best[key], rec = !best || ms < best;
    if (rec) S.best[key] = ms;
    save();
    render(`<div class="study">${studyTop(set, '配對')}<div class="study-body centered"><div class="intro"><div class="cp-emoji">${rec ? '🏆' : '⏱️'}</div><h2>${rec ? '新紀錄！' : '完成！'}</h2><div style="font-size:44px;font-weight:900">${(ms / 1000).toFixed(1)} 秒</div>${best && !rec ? `<p class="muted">最佳紀錄：${(best / 1000).toFixed(1)} 秒</p>` : ''}${pen ? `<p class="muted">含錯誤加罰 ${pen / 1000} 秒</p>` : ''}<button class="btn primary lg" data-a="go" style="min-width:200px">再玩一次</button><a class="btn ghost" href="#/set/${set.id}">回到學習集</a></div></div></div>`, { nav: false, cls: 'full' });
    H = { go: start };
  }
  intro();
}

/* ---------- 拼寫模式 ---------- */
function modeSpell(set) {
  const cards = set.cards.filter(c => c.term.trim());
  if (!cards.length) { toast('沒有可拼寫的詞語'); return go('#/set/' + set.id); }
  let q = shuffle(cards), done = 0, cur = null, locked = false, wrongN = 0;
  const total = cards.length;
  render(`<div class="study">${studyTop(set, '拼寫')}<div class="top-prog"><div class="bar ok"><i id="lp"></i></div><span id="lpt"></span></div><div class="learn-body" id="sb"></div></div>`, { nav: false, cls: 'full' });
  const play = slow => cur && TTS.speak(cur.term, set.termLang, slow ? Math.max(0.35, S.settings.ttsRate * 0.55) : undefined);
  function ask() {
    $('#lp').style.width = done / total * 100 + '%'; $('#lpt').textContent = `${done} / ${total}`;
    if (!q.length) return fin();
    cur = q[0]; locked = false;
    $('#sb').innerHTML = `<div class="spell">
      ${TTS.ok ? '' : '<div class="fb bad">此瀏覽器不支援語音朗讀，請依定義提示作答。</div>'}
      <div class="spell-btns"><button class="circle big-play" data-a="play" aria-label="播放">${ic('sound')}</button><button class="btn ghost sm" data-a="slow">🐢 慢速</button></div>
      <div class="spell-hint">${cur.img ? `<img class="q-img" src="${cur.img}" alt="">` : ''}<small>定義提示</small>${fmt(cur.def) || '—'}</div>
      <form class="wr"><input class="input lg" id="sp-in" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="輸入你聽到的內容" enterkeyhint="done"><button class="btn primary block" type="submit">檢查</button></form>
      <div id="fb"></div></div>`;
    setTimeout(() => { const i = $('#sp-in'); if (i) i.focus(); }, 60);
    play();
  }
  const diffHTML = (typed, correct) => [...correct].map((ch, i) => `<span class="${typed[i] && typed[i].toLowerCase() === ch.toLowerCase() ? 'd-ok' : 'd-bad'}">${esc(ch)}</span>`).join('');
  function fin() {
    $('#sb').innerHTML = `<div class="checkpoint"><div class="cp-emoji">🐝</div><h2>拼寫完成！</h2><p class="muted">${total} 個詞語 · 拼錯 ${wrongN} 次</p><button class="btn primary block lg" data-a="again">再練一次</button><a class="btn ghost block" href="#/set/${set.id}">回到學習集</a></div>`;
  }
  H = {
    play: () => play(), slow: () => play(true),
    cont: ask,
    again: () => { q = shuffle(cards); done = 0; wrongN = 0; ask(); },
    $submit: () => {
      if (locked || !cur) return;
      const inp = $('#sp-in'), v = inp.value;
      if (!v.trim()) return;
      locked = true; act();
      if (norm(v) === norm(cur.term)) {
        q.shift(); done++; cur.lv = Math.max(cur.lv, 2); save();
        $('#fb').innerHTML = `<div class="fb ok">${ic('check')} ${pick(PRAISE)}</div>`;
        later(ask, 850);
      } else {
        wrongN++; q.push(q.shift()); cur.lv = 1; save();
        inp.disabled = true;
        $('#fb').innerHTML = `<div class="fb bad">${ic('close')} 再試一次，稍後會再出現</div><div class="diff mt"><small>正確拼法</small>${diffHTML(v.trim(), cur.term)}</div><button class="btn primary block mt" data-a="cont">繼續</button>`;
        play();
      }
    },
    $keydown: e => { if (locked && e.key === 'Enter' && $('[data-a=cont]')) { e.preventDefault(); ask(); } },
  };
  ask();
}

/* ---------- 重力遊戲 ---------- */
function modeGravity(set) {
  const o = S.settings.grav = Object.assign({ dir: 'term' }, S.settings.grav || {});
  const cards = usable(set);
  if (!cards.length) { toast('需要同時有詞語與定義的卡片'); return go('#/set/' + set.id); }
  const key = 'g' + set.id;
  let raf = 0, last = 0, ast = null, level = 1, score = 0, lives = 3, cleared = 0, queue = [], paused = false, miss = false;
  onCleanup(() => cancelAnimationFrame(raf));
  function intro() {
    const best = S.best[key];
    render(`<div class="study">${studyTop(set, '重力')}<div class="study-body centered"><div class="intro">${ic('gravity')}<h2>保護你的星球！</h2><p class="muted">小行星帶著題目落下，在撞上星球前輸入正確答案擊碎它。<br>漏掉 3 顆就結束。</p>
      <div class="set-row" style="border:0"><span>要輸入的是</span><div class="seg">${[['term', '詞語'], ['def', '定義']].map(([v, l]) => `<button data-a="dir" data-v="${v}" class="${o.dir === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      ${best ? `<p>最高分：<b>${best}</b></p>` : ''}<button class="btn primary lg" data-a="go" style="min-width:200px">開始遊戲</button></div></div></div>`, { nav: false, cls: 'full' });
    H = { go: start, dir: t => { o.dir = t.dataset.v; save(); intro(); } };
  }
  function start() {
    level = 1; score = 0; lives = 3; cleared = 0; queue = shuffle(cards); paused = false; miss = false;
    render(`<div class="study">${studyTop(set, '重力', `<div class="g-hud"><span>Lv <b id="glv">1</b></span><span>${ic('star')} <b id="gsc">0</b></span><span id="glf"></span></div>`)}
      <div class="g-field" id="gf"><div class="g-ast" id="ga"></div><div class="g-planet"></div><div class="g-miss hidden" id="gm"></div></div>
      <form class="g-input"><input class="input" id="gi" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="輸入${o.dir === 'term' ? '詞語' : '定義'}後按 Enter" enterkeyhint="send"><button class="btn primary" type="submit">送出</button></form></div>`, { nav: false, cls: 'full' });
    H = { $submit: submit };
    hud(); spawn();
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    setTimeout(() => { const i = $('#gi'); if (i) i.focus(); }, 80);
  }
  const hud = () => { $('#glv').textContent = level; $('#gsc').textContent = score; $('#glf').textContent = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives); };
  function spawn() {
    if (!queue.length) queue = shuffle(cards);
    const c = queue.shift(), Q = qa(set, c, o.dir);
    const el = $('#ga'), fw = $('#gf').clientWidth;
    el.className = 'g-ast'; el.innerHTML = Q.qImg && !Q.q ? `<img src="${Q.qImg}" style="max-width:120px;border-radius:8px">` : fmt(Q.q.length > 80 ? Q.q.slice(0, 80) + '…' : Q.q);
    const w = el.offsetWidth;
    ast = { c, Q, y: -el.offsetHeight, x: Math.random() * Math.max(0, fw - w - 16) + 8 };
    el.style.transform = `translate(${ast.x}px,${ast.y}px)`;
  }
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    const f = $('#gf'), el = $('#ga');
    if (!f || !el) return;
    if (!paused && ast) {
      const floor = f.clientHeight - 30 - el.offsetHeight;
      const dur = Math.max(4.5, 13 - (level - 1) * 1.2);
      ast.y += dt * (f.clientHeight / dur);
      el.style.transform = `translate(${ast.x}px,${ast.y}px)`;
      if (ast.y >= floor) hit();
    }
    raf = requestAnimationFrame(loop);
  }
  function hit() {
    paused = true; miss = true; lives--; ast.c.lv = 1; save(); hud();
    queue.splice(Math.min(2, queue.length), 0, ast.c);
    const m = $('#gm'); m.classList.remove('hidden');
    m.innerHTML = `<div>${fmt(ast.Q.q)}<b>${fmt(ast.Q.a)}</b><span class="muted">輸入正確答案以繼續</span></div>`;
    const i = $('#gi'); i.value = ''; i.focus();
  }
  function submit() {
    const i = $('#gi'), v = i.value;
    if (!v.trim() || !ast) return;
    const ok = check(v, ast.Q.a).ok;
    if (miss) {
      if (!ok) { i.classList.remove('shake'); void i.offsetWidth; i.classList.add('shake'); return; }
      miss = false; $('#gm').classList.add('hidden'); i.value = '';
      if (lives <= 0) return over();
      spawn(); paused = false; return;
    }
    act();
    if (ok) {
      score += 10 * level; cleared++; ast.c.lv = Math.max(ast.c.lv, 2); save();
      if (cleared % 6 === 0) { level++; toast(`升級！Lv ${level}`); }
      const el = $('#ga'); el.style.setProperty('--t', el.style.transform); el.classList.add('boom');
      ast = null; i.value = ''; hud();
      later(() => { if (!miss) spawn(); }, 330);
    } else { i.classList.remove('shake'); void i.offsetWidth; i.classList.add('shake'); i.select(); }
  }
  function over() {
    cancelAnimationFrame(raf);
    const best = S.best[key] || 0, rec = score > best;
    if (rec) S.best[key] = score;
    save();
    render(`<div class="study">${studyTop(set, '重力')}<div class="study-body centered"><div class="intro"><div class="cp-emoji">${rec ? '🏆' : '☄️'}</div><h2>${rec ? '新的最高分！' : '遊戲結束'}</h2><div style="font-size:44px;font-weight:900">${score}</div><p class="muted">達到 Lv ${level} · 擊碎 ${cleared} 顆小行星${!rec && best ? ` · 最高分 ${best}` : ''}</p><button class="btn primary lg" data-a="go" style="min-width:200px">再玩一次</button><a class="btn ghost" href="#/set/${set.id}">回到學習集</a></div></div></div>`, { nav: false, cls: 'full' });
    H = { go: start };
  }
  intro();
}

/* ---------- 記憶複習（FSRS） ---------- */
function modeReview(scope) {
  const st = S.settings;
  const sid = scope.startsWith('s:') ? scope.slice(2) : null, fid = scope.startsWith('f:') ? scope.slice(2) : null;
  if (sid && !S.sets[sid]) return go('#/library');
  if (fid && !S.folders[fid]) return go('#/library');
  const back = sid ? '#/set/' + sid : fid ? '#/folder/' + fid : '#/';
  const title = sid ? S.sets[sid].title : fid ? S.folders[fid].name : '所有學習集';
  let cur = null, shown = false, front = 'term', forced = null, kind = '';
  const undoStack = [];
  render(`<div class="study">
    <div class="study-top"><a class="icon-btn" href="${back}" aria-label="關閉">${ic('close')}</a><div class="study-title"><span class="mode-name">記憶複習</span><span class="set-name">${esc(title)}</span></div><button class="icon-btn" data-a="undo" id="undoBtn" disabled aria-label="復原">${ic('undo')}</button><button class="icon-btn" data-a="more" aria-label="更多">${ic('more')}</button></div>
    <div class="rv-counts srs-counts" id="rc"></div>
    <div class="rv-main" id="rm"></div>
    <div class="rv-foot" id="rf"></div></div>`, { nav: false, cls: 'full' });

  function select() {
    const now = Date.now(), end = dayEnd(now), today = dayKey(now), p = poolFor(scope);
    const { newLeft, revLeft } = srsLimits();
    const ld = [], la = [], lt = [], rv = [], nw = [];
    for (const x of p) {
      if (x.c.bury === today) continue;
      const q = x.c.srs;
      if (!q || !q.state) nw.push(x);
      else if (q.state === 2) { if (q.due < end) rv.push(x); }
      else if (q.due <= now) ld.push(x);
      else if (q.due <= now + 20 * MIN) la.push(x);
      else if (q.due < end) lt.push(x);
    }
    const byDue = (a, b) => a.c.srs.due - b.c.srs.due;
    ld.sort(byDue); la.sort(byDue); rv.sort(byDue);
    const counts = { new: Math.min(nw.length, newLeft), learn: ld.length + la.length + lt.length, rev: Math.min(rv.length, revLeft) };
    let r = null;
    if (forced) { r = p.find(x => x.c === forced) || null; forced = null; }
    if (!r && ld.length) r = ld[0];
    if (!r) {
      const canR = counts.rev > 0, canN = counts.new > 0;
      const L = logDay();
      if (canR && canN) r = (L.new + L.rev) % 4 === 3 ? nw[0] : rv[0];
      else if (canR) r = rv[0];
      else if (canN) r = nw[0];
      else if (la.length) r = la[0];
    }
    if (r) { const q = r.c.srs; kind = !q || !q.state ? 'new' : q.state === 2 ? 'rev' : 'learn'; }
    return { r, counts };
  }
  function drawCounts(counts) {
    $('#rc').innerHTML = `<span class="cn-new ${kind === 'new' ? 'cur' : ''}">${counts.new}</span><span class="cn-learn ${kind === 'learn' ? 'cur' : ''}">${counts.learn}</span><span class="cn-rev ${kind === 'rev' ? 'cur' : ''}">${counts.rev}</span>`;
  }
  function show() {
    const { r, counts } = select();
    cur = r; shown = false;
    $('#undoBtn').disabled = !undoStack.length;
    if (!cur) return done();
    drawCounts(counts);
    const { s, c } = cur;
    front = st.srsFront === 'mix' ? pick(['term', 'def']) : st.srsFront;
    const F = front === 'term' ? { t: c.term, l: s.termLang, img: '' } : { t: c.def, l: s.defLang, img: c.img };
    const ret = c.srs && c.srs.state === 2 ? Math.round(FSRS.retr(c.srs) * 100) : null;
    $('#rm').innerHTML = `<div class="rv-card" data-a="reveal">
      <div class="rv-meta"><span>${esc(s.title)}${kind === 'new' ? ' · <span style="color:var(--c-new)">新卡</span>' : ''}${ret != null ? ` · 記憶率 ${ret}%` : ''}</span><span class="row"><button class="icon-btn sm" data-a="sayF" aria-label="朗讀">${ic('sound')}</button><button class="icon-btn sm star ${c.star ? 'on' : ''}" data-a="star" aria-label="星號">${ic('star')}</button></span></div>
      <div class="rv-front">${F.img ? `<img class="fc-img" src="${F.img}" alt="">` : ''}<div class="fc-text ${sz(F.t)}">${fmt(F.t) || '<span class="muted">（空白）</span>'}</div></div>
      <div class="rv-back" id="rb"></div></div>`;
    $('#rf').innerHTML = `<button class="btn primary lg block" data-a="reveal">顯示答案</button>`;
    if (st.autoSpeak) TTS.speak(F.t, F.l);
  }
  function reveal() {
    if (shown || !cur) return;
    shown = true;
    const { s, c } = cur;
    const B = front === 'term' ? { t: c.def, l: s.defLang, img: c.img } : { t: c.term, l: s.termLang, img: '' };
    $('#rb').innerHTML = `<hr><div class="rv-backtxt">${B.img ? `<img class="fc-img" src="${B.img}" alt="">` : ''}<div class="fc-text ${sz(B.t)}">${fmt(B.t) || '<span class="muted">（空白）</span>'}</div><button class="icon-btn sm" data-a="sayB" aria-label="朗讀">${ic('sound')}</button></div>`;
    $('.rv-front').style.flex = '0 0 auto';
    const now = Date.now(), names = ['重來', '困難', '良好', '簡單'];
    const pv = [1, 2, 3, 4].map(g => FSRS.next(c.srs, g, now, st).due - now);
    $('#rf').innerHTML = `<div class="rv-btns">${[1, 2, 3, 4].map(g => `<button class="rv-b g${g}" data-a="rate" data-g="${g}"><small>${fmtIvl(pv[g - 1])}</small><b>${names[g - 1]}</b></button>`).join('')}</div>`;
    if (st.autoSpeak) TTS.speak(B.t, B.l);
  }
  function rate(g) {
    if (!shown || !cur) return;
    const { c } = cur, now = Date.now(), prev = c.srs ? { ...c.srs } : null, L = logDay();
    const wasNew = !prev || !prev.state, wasRev = !!prev && prev.state === 2;
    undoStack.push({ c, prev, lv: c.lv, wasNew, wasRev, g });
    if (undoStack.length > 50) undoStack.shift();
    c.srs = FSRS.next(prev, g, now, st);
    if (wasNew) L.new++;
    if (wasRev) { L.rev++; if (g > 1) L.pass++; else L.fail++; }
    L.n++;
    if (g === 1) c.lv = 1; else if (c.srs.state === 2 && c.srs.ivl >= 21) c.lv = 3; else c.lv = Math.max(c.lv, 2);
    save(); show();
  }
  function undo() {
    const u = undoStack.pop(); if (!u) return;
    const L = logDay();
    u.c.srs = u.prev; u.c.lv = u.lv;
    if (u.wasNew) L.new = Math.max(0, L.new - 1);
    if (u.wasRev) { L.rev = Math.max(0, L.rev - 1); if (u.g > 1) L.pass = Math.max(0, L.pass - 1); else L.fail = Math.max(0, L.fail - 1); }
    L.n = Math.max(0, L.n - 1);
    save(); forced = u.c; show(); toast('已復原');
  }
  function done() {
    const p = poolFor(scope), now = Date.now(), today = dayKey(now);
    let nextDue = Infinity, newAvail = 0;
    for (const { c } of p) { const q = c.srs; if (!q || !q.state) { if (c.bury !== today) newAvail++; continue; } if (q.due > now) nextDue = Math.min(nextDue, q.due); }
    const { newLeft } = srsLimits();
    $('#rc').innerHTML = ''; $('#rf').innerHTML = '';
    $('#rm').innerHTML = `<div class="done"><div class="cp-emoji">${p.length ? '🎉' : '📭'}</div><h2>${p.length ? '恭喜！目前沒有要複習的卡片' : '這裡還沒有卡片'}</h2>
      ${nextDue < Infinity ? `<p class="muted">下一張卡片將在 <b>${fmtIvl(nextDue - now)}</b> 後到期</p>` : ''}
      ${newAvail && !newLeft ? `<p class="muted">已達今日新卡上限（${st.newPerDay} 張），還有 ${newAvail} 張新卡片。</p><button class="btn outline block" data-a="extra">${ic('plus')} 今天再多學 10 張新卡</button>` : ''}
      <a class="btn primary block mt" href="${back}">返回</a><a class="btn ghost block" href="#/stats">${ic('chart')} 查看統計</a></div>`;
  }
  H = {
    reveal, undo,
    rate: t => rate(+t.dataset.g),
    extra: () => { logDay().extra = (logDay().extra || 0) + 10; save(); show(); },
    star: () => { const c = cur.c; c.star = !c.star; $('.rv-card .star').classList.toggle('on', c.star); save(); },
    sayF: () => { const { s, c } = cur; front === 'term' ? TTS.speak(c.term, s.termLang) : TTS.speak(c.def, s.defLang); },
    sayB: () => { const { s, c } = cur; front === 'term' ? TTS.speak(c.def, s.defLang) : TTS.speak(c.term, s.termLang); },
    more: () => {
      if (!cur) return menuSheet('', [['chart', '查看統計', () => go('#/stats')], ['gear', '複習設定', () => go('#/settings')]]);
      const { s, c } = cur;
      menuSheet('', [
        ['edit', '編輯這張卡片', () => {
          const sh = sheet(`<h3 class="sheet-title">編輯卡片</h3><label class="fld"><span class="muted sm">詞語</span><textarea class="input" id="ec-t" rows="2">${esc(c.term)}</textarea></label><label class="fld"><span class="muted sm">定義</span><textarea class="input" id="ec-d" rows="3">${esc(c.def)}</textarea></label><button class="btn primary block mt" data-a="ok">儲存</button>`, {
            ok: (t, e, close) => { c.term = $('#ec-t', sh.root).value.trim(); c.def = $('#ec-d', sh.root).value.trim(); s.updated = Date.now(); save(); close(); forced = c; show(); },
          });
        }],
        ['pause2', '今天先略過這張', () => { c.bury = dayKey(); save(); show(); toast('明天會再出現'); }],
        ['reset', '重設這張卡片為新卡', () => { c.srs = null; save(); show(); }],
        ['cards', '開啟學習集', () => go('#/set/' + s.id)],
        ['gear', '複習設定', () => go('#/settings')],
      ]);
    },
    $keydown: e => {
      if (typing(e)) return;
      if (!shown && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); reveal(); }
      else if (shown && /^[1-4]$/.test(e.key)) rate(+e.key);
      else if (shown && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); rate(3); }
      else if (e.key.toLowerCase() === 'z') undo();
    },
  };
  show();
}

/* ---------- 統計 ---------- */
function scrStats() {
  const all = poolFor('all'), now = Date.now();
  let nw = 0, lrn = 0, young = 0, mature = 0, mastered = 0;
  for (const { c } of all) {
    const q = c.srs;
    if (!q || !q.state) nw++; else if (q.state !== 2) lrn++; else if (q.ivl >= 21) mature++; else young++;
    if (c.lv >= 3) mastered++;
  }
  const tot = Math.max(1, all.length);
  const ds = dayStart(now), fc = Array(7).fill(0);
  for (const { c } of all) { const q = c.srs; if (!q || !q.state) continue; const d = Math.max(0, Math.floor((q.due - ds) / DAY)); if (d < 7) fc[d]++; }
  const fmax = Math.max(1, ...fc);
  const weeks = 18, todayDow = new Date(now - ROLL).getDay();
  let cells = '';
  for (let w = 0; w < weeks; w++) for (let d = 0; d < 7; d++) {
    const ago = (weeks - 1 - w) * 7 + (todayDow - d);
    if (ago < 0) { cells += '<i class="f"></i>'; continue; }
    const k = dayKey(now - ago * DAY), n = (S.log[k] && S.log[k].n) || 0;
    cells += `<i class="${n ? 'h' + (n < 10 ? 1 : n < 30 ? 2 : n < 80 ? 3 : 4) : ''}" title="${k}：${n}"></i>`;
  }
  let pass = 0, fail = 0, total30 = 0, days30 = 0;
  for (let i = 0; i < 30; i++) { const L = S.log[dayKey(now - i * DAY)]; if (L) { pass += L.pass || 0; fail += L.fail || 0; total30 += L.n || 0; if (L.n) days30++; } }
  const totalAll = Object.values(S.log).reduce((n, L) => n + (L.n || 0), 0);
  const dn = ['今天', '明天'];
  const seg = (v, c) => `<i style="width:${v / tot * 100}%;background:${c}"></i>`;
  render(`<div class="page">
    <div class="topbar"><a class="icon-btn" href="#/" aria-label="返回">${ic('back')}</a></div>
    <h1 class="page-title" style="margin-top:0">學習統計</h1>
    <div class="stat-grid">
      <div class="stat"><b style="color:var(--warn)">🔥 ${calcStreak()}</b><span>連續天數</span></div>
      <div class="stat"><b>${logDay().n}</b><span>今日作答</span></div>
      <div class="stat"><b>${pass + fail ? Math.round(pass / (pass + fail) * 100) + '%' : '—'}</b><span>30 天複習記憶率</span></div>
      <div class="stat"><b>${totalAll}</b><span>累計作答</span></div>
    </div>
    <div class="sec-head"><h2>學習紀錄</h2><span class="muted sm">近 30 天學習 ${days30} 天 · ${total30} 次</span></div>
    <div class="panel"><div class="heat">${cells}</div></div>
    <div class="sec-head"><h2>未來 7 天到期</h2></div>
    <div class="panel"><div class="fore">${fc.map((v, i) => `<div><span>${v}</span><i style="height:${v / fmax * 90}%"></i><span>${dn[i] || new Date(ds + i * DAY).toLocaleDateString('zh-TW', { weekday: 'short' })}</span></div>`).join('')}</div></div>
    <div class="sec-head"><h2>卡片狀態（FSRS）</h2><span class="muted sm">${all.length} 張</span></div>
    <div class="panel"><div class="stack">${seg(nw, 'var(--c-new)')}${seg(lrn, 'var(--c-learn)')}${seg(young, '#7ed6a8')}${seg(mature, 'var(--c-rev)')}</div>
      <div class="legend"><span style="--c:var(--c-new)">新卡 ${nw}</span><span style="--c:var(--c-learn)">學習中 ${lrn}</span><span style="--c:#7ed6a8">短期 ${young}</span><span style="--c:var(--c-rev)">長期（≥21天）${mature}</span></div>
      <p class="muted sm" style="margin-bottom:0">學習模式已精通：${mastered} / ${all.length}</p></div>
  </div>`);
}

/* ---------- 設定 ---------- */
function applyTheme() {
  const t = S.settings.theme, root = document.documentElement;
  if (t === 'auto') delete root.dataset.theme; else root.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#tc').setAttribute('content', dark ? '#0a092d' : '#f6f7fb');
}
function scrSettings() {
  const st = S.settings;
  const segBtns = (a, cur, opts) => opts.map(([v, l]) => `<button data-a="${a}" data-v="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('');
  render(`<div class="page">
    <h1 class="page-title">設定</h1>
    <div class="group-title">外觀</div>
    <div class="panel list"><div class="set-row"><span>主題</span><div class="seg">${segBtns('theme', st.theme, [['auto', '自動'], ['light', '淺色'], ['dark', '深色']])}</div></div></div>

    <div class="group-title">記憶複習（FSRS-5 間隔重複演算法）</div>
    <div class="panel list">
      <div class="set-row col"><span>目標記憶保留率　<b id="retv">${Math.round(st.retention * 100)}%</b><small>複習時預期記得的機率。越高複習越頻繁，建議 85%–95%。</small></span><input type="range" min="70" max="97" step="1" value="${Math.round(st.retention * 100)}" data-s="retention"></div>
      <div class="set-row"><span>每日新卡上限</span><input class="input xs" type="number" inputmode="numeric" min="0" max="9999" value="${st.newPerDay}" data-s="newPerDay"></div>
      <div class="set-row"><span>每日複習上限</span><input class="input xs" type="number" inputmode="numeric" min="0" max="99999" value="${st.maxReviews}" data-s="maxReviews"></div>
      <div class="set-row"><span>學習步驟（分鐘）<small>新卡畢業前的短期步驟，以空格分隔</small></span><input class="input xs" style="width:110px" value="${st.learnSteps.join(' ')}" data-s="learnSteps"></div>
      <div class="set-row"><span>重新學習步驟（分鐘）<small>忘記後重新學習的步驟</small></span><input class="input xs" style="width:110px" value="${st.relearnSteps.join(' ')}" data-s="relearnSteps"></div>
      <div class="set-row"><span>最長間隔（天）</span><input class="input xs" type="number" inputmode="numeric" min="1" max="36500" value="${st.maxIvl}" data-s="maxIvl"></div>
      <div class="set-row"><span>卡片正面</span><div class="seg">${segBtns('sfront', st.srsFront, [['term', '詞語'], ['def', '定義'], ['mix', '混合']])}</div></div>
    </div>

    <div class="group-title">語音朗讀</div>
    <div class="panel list">
      <div class="set-row col"><span>朗讀速度　<b id="ttsv">${st.ttsRate}x</b></span><input type="range" min="0.5" max="1.5" step="0.1" value="${st.ttsRate}" data-s="ttsRate"></div>
      ${swRow('自動朗讀', 'autoSpeak', st.autoSpeak, '字卡、學習與記憶複習顯示時自動發音', 's')}
      <div class="set-row"><span>測試語音${TTS.ok ? '' : '<small>此瀏覽器不支援語音</small>'}</span><button class="btn ghost sm" data-a="testTts">${ic('sound')} 播放</button></div>
    </div>

    <div class="group-title">資料（只儲存在這台裝置）</div>
    <div class="panel list">
      <button class="set-row link" data-a="export"><span>${ic('download')} 匯出完整備份（JSON）</span></button>
      <button class="set-row link" data-a="import"><span>${ic('upload')} 從備份還原 / 合併</span></button>
      <div class="set-row"><span>儲存空間<small id="stor">計算中…</small></span></div>
      <button class="set-row link danger" data-a="wipe"><span>${ic('trash')} 清除所有資料</span></button>
    </div>

    <div class="group-title">安裝到 iPhone 主畫面</div>
    <div class="panel"><ol class="howto"><li>用 <b>Safari</b> 開啟這個網站</li><li>點下方工具列的「分享」按鈕</li><li>選擇「<b>加入主畫面</b>」</li><li>之後從主畫面開啟，就能全螢幕、離線使用</li></ol>
      <p class="muted sm" style="margin-bottom:0">提醒：資料只存在此裝置的瀏覽器中（主畫面 App 與 Safari 分開儲存），請定期匯出備份。</p></div>
    <p class="center muted sm" style="margin-top:24px">VocabMax · 本地優先的背單字工具</p>
  </div>`);
  const stor = $('#stor');
  if (navigator.storage && navigator.storage.estimate) {
    Promise.all([navigator.storage.estimate(), navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false)])
      .then(([e, p]) => { if (stor) stor.textContent = `已使用 ${(e.usage / 1048576).toFixed(1)} MB${p ? ' · 已啟用持久儲存' : ''}`; })
      .catch(() => { if (stor) stor.textContent = '無法取得'; });
  } else stor.textContent = '無法取得';
  const parseSteps = v => v.split(/[\s,]+/).map(Number).filter(x => x > 0 && isFinite(x));
  H = {
    theme: t => { st.theme = t.dataset.v; save(); applyTheme(); scrSettings(); },
    sfront: t => { st.srsFront = t.dataset.v; save(); $$('[data-a=sfront]').forEach(b => b.classList.toggle('on', b === t)); },
    $input: e => {
      const t = e.target;
      if (t.dataset.s === 'retention') $('#retv').textContent = t.value + '%';
      if (t.dataset.s === 'ttsRate') $('#ttsv').textContent = t.value + 'x';
    },
    $change: e => {
      const t = e.target, k = t.dataset.s; if (!k) return;
      if (k === 'retention') st.retention = clamp(+t.value / 100, 0.7, 0.97);
      else if (k === 'ttsRate') st.ttsRate = +t.value;
      else if (k === 'autoSpeak') st.autoSpeak = t.checked;
      else if (k === 'learnSteps' || k === 'relearnSteps') { st[k] = parseSteps(t.value); t.value = st[k].join(' '); }
      else if (k === 'newPerDay' || k === 'maxReviews') { st[k] = clamp(parseInt(t.value) || 0, 0, 99999); t.value = st[k]; }
      else if (k === 'maxIvl') { st.maxIvl = clamp(parseInt(t.value) || 36500, 1, 36500); t.value = st.maxIvl; }
      save(); renderTabs(); toast('已儲存設定');
    },
    testTts: () => TTS.speak('Hello! 你好，這是語音測試。', 'auto'),
    export: () => shareOrDownload(JSON.stringify(S), `vocabmax-backup-${dayKey()}.json`, 'application/json'),
    import: () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        let data;
        try { data = JSON.parse(await f.text()); if (!data || typeof data.sets !== 'object') throw 0; } catch (e) { return toast('無法讀取這個備份檔'); }
        const n = Object.keys(data.sets).length;
        sheet(`<h3 class="sheet-title">還原備份</h3><p class="muted">這個檔案包含 ${n} 個學習集。</p><button class="btn primary block" data-a="merge">合併到目前資料</button><button class="btn danger block" data-a="replace">取代目前所有資料</button>`, {
          merge: (t, e, c) => {
            const d = migrate(data), map = {};
            for (const set of Object.values(d.sets)) { const nid = S.sets[set.id] ? uid() : set.id; map[set.id] = nid; set.id = nid; S.sets[nid] = set; }
            for (const fo of Object.values(d.folders)) { const nid = S.folders[fo.id] ? uid() : fo.id; S.folders[nid] = { ...fo, id: nid, setIds: fo.setIds.map(x => map[x]).filter(Boolean) }; }
            save(); c(); toast(`已合併 ${n} 個學習集`); renderTabs();
          },
          replace: async (t, e, c) => { c(); if (!(await confirmDlg('確定取代目前所有資料？', { danger: true, ok: '取代', sub: '目前的資料會被完全覆蓋。' }))) return; S = migrate(data); S.seeded = true; await persist(); applyTheme(); toast('已還原備份'); go('#/'); },
        });
      };
      inp.click();
    },
    wipe: async () => {
      if (!(await confirmDlg('清除所有資料？', { danger: true, ok: '下一步', sub: '所有學習集、資料夾、進度與設定都會被刪除。' }))) return;
      if (!(await confirmDlg('真的確定嗎？此動作無法復原。', { danger: true, ok: '永久清除' }))) return;
      S = migrate(null); S.seeded = true; await persist(); applyTheme(); toast('已清除所有資料'); go('#/');
    },
  };
}

/* ---------- 路由 ---------- */
async function scrStudy(id, mode) {
  const set = S.sets[id]; if (!set) return go('#/library');
  set.opened = Date.now();
  if (mode === 'review' && set.srs === false) {
    if (!(await confirmDlg('這個學習集尚未加入記憶複習', { ok: '加入並開始', sub: '加入後，卡片會依 FSRS 間隔重複演算法排程。' }))) return go('#/set/' + id);
    set.srs = true; save();
  }
  const f = { flashcards: modeFlashcards, learn: modeLearn, test: modeTest, match: modeMatch, spell: modeSpell, gravity: modeGravity, review: () => modeReview('s:' + id) }[mode];
  if (!f) return go('#/set/' + id);
  if (!set.cards.length) { toast('這個學習集還沒有卡片'); return go('#/edit/' + id); }
  f(set);
}
const routes = [
  [/^#?\/?$/, scrHome], [/^#\/library$/, scrLibrary], [/^#\/create$/, () => scrEdit(null)], [/^#\/edit\/([\w-]+)$/, scrEdit],
  [/^#\/set\/([\w-]+)$/, scrSet], [/^#\/folder\/([\w-]+)$/, scrFolder], [/^#\/s\/([\w-]+)\/(\w+)$/, scrStudy],
  [/^#\/review$/, () => modeReview('all')], [/^#\/review\/f\/([\w-]+)$/, id => modeReview('f:' + id)],
  [/^#\/stats$/, scrStats], [/^#\/settings$/, scrSettings],
];
function router() {
  RT++;
  cleanups.splice(0).forEach(f => { try { f(); } catch (e) { } });
  TTS.stop();
  $$('.sheet-wrap').forEach(e => e.remove());
  H = {};
  const h = location.hash || '#/';
  for (const [re, fn] of routes) { const m = h.match(re); if (m) { fn(...m.slice(1)); return; } }
  scrHome();
}
function watchViewport() {
  const f = () => {
    const h = window.visualViewport ? visualViewport.height : innerHeight;
    document.documentElement.style.setProperty('--vvh', h + 'px');
    if (document.body.classList.contains('lock')) window.scrollTo(0, 0);
  };
  f();
  if (window.visualViewport) { visualViewport.addEventListener('resize', f); visualViewport.addEventListener('scroll', f); }
  addEventListener('resize', f);
}

(async function boot() {
  await load();
  if (!S.seeded) { if (!Object.keys(S.sets).length) seed(); S.seeded = true; save(); }
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
  TTS.init();
  watchViewport();
  addEventListener('hashchange', router);
  router();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); else if (/^#\/?$|^#\/review$/.test(location.hash || '#/')) renderTabs(); });
  addEventListener('pagehide', persist);
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
