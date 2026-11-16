// DOM helpers, modal, toasts, item icons and tiny synthesised sound effects.
import { SYMBOLS, symbolSVG } from './symbols.js';
import { TIER_COLORS } from './mergepuzzle.js';

export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
}
export const $ = (sel) => document.querySelector(sel);

let modalClose = null;
export function openModal(content, { onClose, wide, sticky } = {}) {
  closeModal();
  const m = $('#modal'), panel = $('#panel');
  panel.className = 'panel' + (wide ? ' wide' : '');
  panel.replaceChildren(content);
  if (!sticky) panel.append(el('button', { class: 'close', title: 'Close (Esc)', onclick: () => closeModal() }, '×'));
  m.hidden = false;
  m.dataset.sticky = sticky ? '1' : '';
  modalClose = onClose || null;
  const f = panel.querySelector('[autofocus]'); if (f) f.focus();
}
export function closeModal() {
  const m = $('#modal');
  if (m.hidden) return false;
  m.hidden = true;
  $('#panel').replaceChildren();
  const fn = modalClose; modalClose = null;
  if (fn) fn();
  return true;
}
export const modalOpen = () => !$('#modal').hidden;

export function toast(msg, ms = 3200) {
  const t = el('div', { class: 'toast' }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

const SHAPE_SVG = [null,
  '<path d="M12 3L22 20H2Z"/><path d="M12 3L13.5 20" fill="none" stroke="#0005"/>',
  '<path d="M12 2L21 7V17L12 22L3 17V7Z"/><path d="M3 7L12 12L21 7M12 12V22" fill="none" stroke="#0005"/>',
  '<path d="M12 2L21 12L12 22L3 12Z"/><path d="M3 12H21M12 2L9 12L12 22" fill="none" stroke="#0005"/>',
  '<path d="M12 2L21.5 9L18 20.5H6L2.5 9Z"/><path d="M12 7L16.5 10.3L14.8 15.6H9.2L7.5 10.3ZM12 2V7M21.5 9L16.5 10.3M18 20.5L14.8 15.6M6 20.5L9.2 15.6M2.5 9L7.5 10.3" fill="none" stroke="#0005"/>',
  '<path d="M12 2L21 7V17L12 22L3 17V7Z"/><path d="M12 2L7 14H17ZM3 7L7 14L3 17M21 7L17 14L21 17M7 14L12 22L17 14" fill="none" stroke="#0005"/>',
  '<circle cx="12" cy="12" r="10"/><ellipse cx="8.5" cy="8" rx="3" ry="2" fill="#fff8"/>'];
export const shapeSVG = (tier, size = 28) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${TIER_COLORS[tier]}" stroke="#2b2118" stroke-width="1" stroke-linejoin="round">${SHAPE_SVG[tier]}</svg>`;

export function thingIcon(t, info, size = 30) {
  if (t.kind === 'shape') return shapeSVG(info.tier, size);
  if (t.kind === 'aid') return t.aid === 'matches'
    ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M4 9H20V21H4Z" fill="#c8473c" stroke="#5a1f1a"/><path d="M4 9L7 4H17L20 9Z" fill="#e2b93b" stroke="#5a431a"/><path d="M8 13H16M8 16.5H13" stroke="#f3ecd8" stroke-width="1.4"/><path d="M12 4C13.5 2.5 12 1.5 12.6 0.5C14.5 2 14 3.4 12 4Z" fill="#d9792b"/></svg>`
    : `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6.5" fill="#cfe6ea" stroke="#b8923a" stroke-width="2"/><path d="M15 15L21.5 21.5" stroke="#5a431a" stroke-width="3" stroke-linecap="round"/><path d="M7 8.5C8 6.8 9.5 6.3 11 6.5" fill="none" stroke="#fff" stroke-width="1.2"/></svg>`;
  if (t.blank) return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M5 2.5H16L20 6.5V21.5H5Z" fill="#fbf7ea" stroke="#5a431a" stroke-dasharray="2 1.2"/><text x="12.5" y="16" text-anchor="middle" font-size="9" font-weight="bold" fill="#b9ab8a">?</text></svg>`;
  if (t.kind === 'photo') return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="2.5" y="4" width="19" height="16" fill="#f3ecd8" stroke="#5a431a"/><rect x="4.5" y="6" width="15" height="10.5" fill="#b89a6a"/><path d="M4.5 16.5L9.5 11L13 14.5L15.5 12L19.5 16.5Z" fill="#6e5636"/><circle cx="16" cy="9" r="1.4" fill="#f3ecd8"/></svg>`;
  if (t.half) {
    const col = t.kind === 'key' ? '#b8923a' : '#8d9698';
    const whole = t.kind === 'key' ? '<circle cx="7" cy="12" r="5.6"/><path d="M12 10.8H22.5V13.2H20.5V16H18.4V13.2H16.6V15H14.6V13.2H12Z"/>' : t.tool === 'crowbar' ? '<path d="M3 21.5L5 23L18 8C19 6.5 20.5 6.5 20.5 8.5H22.5C22.5 3.5 18 3 16 6Z"/>' : '<path d="M2.5 20L4 21.5L12 13.5L10.5 12ZM10 13L13 10L20 3C22 1.5 23.5 4.5 21.5 6L14 13.5Z"/>';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><defs><clipPath id="h${t.id}"><path d="${t.half === 'a' ? 'M0 0H13L11 6L14 11L10.5 16L13 24H0Z' : 'M24 0H13L11 6L14 11L10.5 16L13 24H24Z'}"/></clipPath></defs><g fill="${col}" opacity=".22">${whole}</g><g fill="${col}" stroke="#3a2d1c" stroke-width=".8" clip-path="url(#h${t.id})">${whole}</g><path d="M13 0L11 6L14 11L10.5 16L13 24" fill="none" stroke="#c8473c" stroke-width="1" stroke-dasharray="2 1.5"/></svg>`;
  }
  if (t.kind === 'key') return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><g fill="#b8923a" stroke="#5a431a" stroke-width=".8"><circle cx="7" cy="12" r="5.6"/><path d="M12 10.8H22.5V13.2H20.5V16H18.4V13.2H16.6V15H14.6V13.2H12Z"/></g><g transform="translate(3.4 8.4) scale(.3)"><path fill="${SYMBOLS[info.symbol].color}" stroke="#fff" stroke-width="1.5" fill-rule="evenodd" d="${SYMBOLS[info.symbol].path}"/></g></svg>`;
  if (t.kind === 'tool') return t.tool === 'crowbar'
    ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#4a5154" stroke-width="2.6" stroke-linecap="round"><path d="M4 21L17 6C18.5 4 21 4 21 7"/><path d="M4 21L2.5 18.5" /></svg>`
    : `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M3 21L11 13" stroke="#8d9698" stroke-width="2.4" stroke-linecap="round"/><path d="M10 14L13 11L20 4C21.5 2.5 23 5 21 6.5L14 13Z" fill="#c8473c" stroke="#5a1f1a"/></svg>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M5 2.5H16L20 6.5V21.5H5Z" fill="#f3ecd8" stroke="#5a431a"/><path d="M8 9H17M8 12.5H17M8 16H14" stroke="#5a431a" stroke-width="1.2"/></svg>`;
}
export { symbolSVG };

// ---- sound
let ac = null;
export let muted = false;
export const setMuted = (v) => { muted = v; };
function tone(freq, t0, dur, type = 'sine', vol = 0.12) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime + t0); g.gain.linearRampToValueAtTime(vol, ac.currentTime + t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + dur);
  o.connect(g).connect(ac.destination); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + dur + 0.05);
}
const SFX = {
  click: () => tone(520, 0, 0.05, 'square', 0.04),
  tick: () => tone(900, 0, 0.03, 'square', 0.03),
  wrong: () => { tone(160, 0, 0.18, 'sawtooth', 0.07); tone(120, 0.12, 0.22, 'sawtooth', 0.07); },
  unlock: () => { tone(330, 0, 0.09, 'square', 0.06); tone(660, 0.1, 0.25, 'triangle', 0.12); },
  found: () => { tone(660, 0, 0.12, 'triangle'); tone(880, 0.1, 0.2, 'triangle'); },
  merge: () => { tone(440, 0, 0.1, 'triangle'); tone(587, 0.07, 0.1, 'triangle'); tone(784, 0.14, 0.2, 'triangle'); },
  slide: () => tone(220, 0, 0.08, 'sine', 0.08),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.4, 'triangle', 0.13)),
};
// Quiet looping room tone per setting, synthesised from filtered noise and slow oscillators.
let ambient = null;
export function ambience(kind) {
  if (ambient) { try { ambient.gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.4); const old = ambient; setTimeout(() => old.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* not a source */ } }), 600); } catch (e) { /* ignore */ } ambient = null; }
  if (!kind || muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const out = ac.createGain(); out.gain.value = 0; out.gain.linearRampToValueAtTime(1, ac.currentTime + 1.5); out.connect(ac.destination);
    const nodes = [];
    const noise = (type, freq, q, vol) => {
      const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ac.createGain(); g.gain.value = vol;
      src.connect(f).connect(g).connect(out); src.start(); nodes.push(src);
      return g;
    };
    const osc = (freq, vol, type = 'sine') => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = vol; o.connect(g).connect(out); o.start(); nodes.push(o); return g; };
    const lfo = (target, rate, depth) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g).connect(target.gain); o.start(); nodes.push(o); };
    if (kind === 'rain') { noise('highpass', 2600, 0.4, 0.035); noise('lowpass', 420, 0.5, 0.05); }
    else if (kind === 'hum') { osc(60, 0.035); osc(120, 0.012); noise('lowpass', 300, 0.6, 0.05); }
    else if (kind === 'static') { lfo(noise('bandpass', 3200, 0.8, 0.012), 0.23, 0.008); osc(50, 0.02); }
    else if (kind === 'sea') { lfo(noise('lowpass', 520, 0.4, 0.07), 0.13, 0.05); lfo(osc(46, 0.05), 3.1, 0.02); }
    else if (kind === 'clock') {
      // tick... tock: scheduled a little ahead, forever
      const g = ac.createGain(); g.gain.value = 1; g.connect(out);
      let next = ac.currentTime + 0.5, n = 0;
      const timer = setInterval(() => { while (next < ac.currentTime + 1.5) { const o = ac.createOscillator(), e = ac.createGain(); o.type = 'square'; o.frequency.value = n++ % 2 ? 1500 : 1900; e.gain.setValueAtTime(0.03, next); e.gain.exponentialRampToValueAtTime(0.0001, next + 0.03); o.connect(e).connect(g); o.start(next); o.stop(next + 0.05); next += 1; } }, 400);
      nodes.push({ stop: () => clearInterval(timer) });
      noise('lowpass', 250, 0.5, 0.025);
    }
    ambient = { gain: out, nodes };
  } catch (e) { /* no audio */ }
}

export function sfx(name) {
  if (muted) return;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); SFX[name](); } catch (e) { /* no audio */ }
}
