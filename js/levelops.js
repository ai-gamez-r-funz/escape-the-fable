// Operations on a level manifest shared by the generator and the editor.
// A level is: { props:[{id,type,x,z,rot,lock?,on?,ox?}], things:[{id,kind,for,at:{prop,slot}}] }
// "things" are everything a lock needs: keys, tools, shapes and clues. Clue text is always derived
// from the lock it belongs to, so clues can never drift out of sync with their solution.
import { CATALOG } from './catalog.js';
import { SYMBOL_IDS } from './symbols.js';
import { buildWheel } from './words.js';
import { genMerge } from './mergepuzzle.js';
import { THEMES, DIFFICULTY } from './themes.js';

export const FORMAT = 'escape-the-fable/1';
export const BOOK_COLORS = { red: '#c0392b', blue: '#2b62b8', green: '#2f8f4e', yellow: '#e2b93b' };

export function newLevel(theme = 'detective') {
  return { format: FORMAT, name: 'Untitled room', theme, difficulty: 'medium', room: { w: 7, d: 6, h: 3 }, props: [], things: [], n: 0 };
}
export const propById = (level, id) => level.props.find((p) => p.id === id);
export const thingsFor = (level, pid) => level.things.filter((t) => t.for === pid);
export const thingsAt = (level, pid, slot) => level.things.filter((t) => t.at && t.at.prop === pid && (!slot || t.at.slot === slot));

export function addProp(level, type, o = {}) {
  const p = { id: 'p' + ++level.n, type, x: 0, z: 0, rot: 0, ...o };
  level.props.push(p);
  return p;
}
export function addThing(level, t) {
  t.id = 't' + ++level.n;
  t.at = t.at || null;
  level.things.push(t);
  return t;
}
export function freeSymbol(level, rng) {
  const used = new Set(level.props.map((p) => p.lock && p.lock.symbol).filter(Boolean));
  const free = SYMBOL_IDS.filter((s) => !used.has(s));
  return free.length ? rng.pick(free) : rng.pick(SYMBOL_IDS);
}

const pad2 = (n) => String(n).padStart(2, '0');
export function codeFits(style, code) {
  if (!/^\d{3,4}$/.test(code)) return 'The code must be 3 or 4 digits.';
  if (style === 'clock') {
    const h = +code.slice(0, -2), m = +code.slice(-2);
    if (h < 1 || h > 12 || m > 55 || m % 5) return 'A clock code must read as a time on a 5-minute mark, e.g. 435 for 4:35 or 1120 for 11:20.';
  }
  if (style === 'books' && /[0]/.test(code)) return 'A book-count code cannot contain 0 (each digit is a number of books).';
  if (style === 'radio' && (+code < 540 || +code > 1600)) return 'A radio code must be a frequency between 540 and 1600.';
  return null;
}
function genCode(level, rng, n, style, self) {
  const taken = new Set(level.props.filter((p) => p !== self && p.lock && p.lock.code).map((p) => p.lock.code));
  for (let i = 0; i < 200; i++) {
    let code;
    if (style === 'clock') code = (n === 3 ? rng.int(1, 9) : rng.int(10, 12)) + pad2(5 * rng.int(1, 11));
    else if (style === 'books') code = Array.from({ length: n }, () => rng.int(1, 7)).join('');
    else if (style === 'radio') code = String(n === 3 ? rng.int(540, 999) : rng.int(1000, 1600));
    else code = Array.from({ length: n }, () => rng.int(0, 9)).join('');
    if (new Set(code).size < 2 || taken.has(code)) continue;
    return code;
  }
  return '1234'.slice(0, n);
}
function genCombo(rng) {
  const c = [rng.int(0, 39)];
  while (c.length < 3) { const v = rng.int(0, 39); if (Math.abs(v - c[c.length - 1]) >= 5) c.push(v); }
  return c;
}

const CODE_STYLES = ['plain', 'tornA', 'tornB', 'clock', 'books', 'radio'];

// (Re)creates the clue things for a digits/dial lock in the requested style.
// style: plain | torn | clock | books | radio
export function setClueStyle(level, prop, style, rng) {
  const lock = prop.lock;
  if (lock.type === 'dial' && !['plain', 'torn'].includes(style)) style = 'plain';
  const old = level.things.filter((t) => t.for === prop.id && t.kind === 'clue' && CODE_STYLES.includes(t.style));
  const oldAt = old.map((t) => t.at).filter((a) => a && a.slot !== 'shown');
  level.things = level.things.filter((t) => !old.includes(t));
  lock.style = style;
  if (lock.type === 'digits') {
    const n = lock.code ? lock.code.length : lock.n || 3;
    if (!lock.code || codeFits(style, lock.code)) lock.code = genCode(level, rng, n, style, prop);
    delete lock.n;
    if (style === 'books') lock.colors = rng.shuffle(Object.keys(BOOK_COLORS)).slice(0, lock.code.length);
    else delete lock.colors;
  }
  const styles = style === 'torn' ? ['tornA', 'tornB'] : [style];
  return styles.map((s, i) => addThing(level, { kind: 'clue', style: s, for: prop.id, at: oldAt[i] || null }));
}

export function clearLock(level, prop) {
  level.things = level.things.filter((t) => t.for !== prop.id);
  delete prop.lock;
}

// Puts a lock on a container and creates everything needed to open it (initially unplaced).
export function setLock(level, prop, type, rng, o = {}) {
  clearLock(level, prop);
  const cat = CATALOG[prop.type];
  if (!cat.container || !cat.container.locks.includes(type)) return null;
  const D = DIFFICULTY[level.difficulty] || DIFFICULTY.medium;
  const lock = { type };
  if (type !== 'tool') lock.symbol = o.symbol || freeSymbol(level, rng);
  prop.lock = lock;
  if (type === 'key') addThing(level, { kind: 'key', for: prop.id });
  else if (type === 'tool') addThing(level, { kind: 'tool', tool: cat.container.tool, for: prop.id });
  else if (type === 'digits') { lock.n = o.n || rng.int(D.digits[0], D.digits[1]); setClueStyle(level, prop, o.style || 'plain', rng); }
  else if (type === 'dial') { lock.combo = genCombo(rng); setClueStyle(level, prop, o.style || 'plain', rng); }
  else if (type === 'wheel') {
    const w = buildWheel(rng, THEMES[level.theme].words, o.cands || D.cands, o.cons || D.cons, o.word);
    if (!w) { delete prop.lock; return null; }
    Object.assign(lock, w);
    addThing(level, { kind: 'clue', style: 'codebook', for: prop.id });
    w.constraints.forEach((_, idx) => addThing(level, { kind: 'clue', style: 'constraint', idx, for: prop.id }));
  } else if (type === 'merge') {
    const board = genMerge(rng, o.level ?? D.merge, o.sockets ?? rng.int(D.sockets[0], D.sockets[1]));
    if (!board) { delete prop.lock; return null; }
    lock.board = board;
    board.pieces.forEach((pc, piece) => { if (pc.s) addThing(level, { kind: 'shape', piece, for: prop.id }); });
  }
  return lock;
}

export function removeProp(level, id) {
  const p = propById(level, id);
  if (!p) return;
  clearLock(level, p);
  for (const t of level.things) if (t.at && t.at.prop === id) t.at = null;
  for (const top of level.props.filter((q) => q.on === id)) removeProp(level, top.id);
  level.props = level.props.filter((q) => q.id !== id);
}

// Which slot kinds a thing may occupy on a given prop.
export function slotFor(thing, prop) {
  const cat = CATALOG[prop.type];
  if (thing.for === prop.id) return null; // never inside / on the thing it opens
  if (thing.kind === 'clue' && ['clock', 'books', 'radio'].includes(thing.style)) return cat.feature === thing.style ? 'shown' : null;
  if (cat.container && !cat.container.exit) return 'holds';
  if (cat.hide) return 'hidden';
  if (cat.inscribe && thing.kind === 'clue' && ['plain', 'codebook', 'constraint'].includes(thing.style)) return 'shown';
  return null;
}
export const SLOT_CAP = { holds: 4, hidden: 2, shown: 1 };

// Table-top props follow their host.
export function placeTops(level) {
  for (const p of level.props) {
    if (CATALOG[p.type].place !== 'top') continue;
    const host = propById(level, p.on);
    if (!host) continue;
    const a = (host.rot * Math.PI) / 2, ox = p.ox || 0, oz = p.oz || 0;
    p.x = +(host.x + ox * Math.cos(a) + oz * Math.sin(a)).toFixed(3);
    p.z = +(host.z - ox * Math.sin(a) + oz * Math.cos(a)).toFixed(3);
    p.rot = host.rot;
  }
}
