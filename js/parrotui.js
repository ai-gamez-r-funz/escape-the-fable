// Talking to the parrot: a little conversation, and a bell song to ring back before it gives up its secret.
import { el, sfx, note, symbolSVG } from './ui.js';
import { SYMBOLS } from './symbols.js';
import { RNG, hashStr } from './rng.js';

const BELLS = [{ name: 'red', col: '#c8473c', f: 523 }, { name: 'teal', col: '#2f8f9c', f: 659 }, { name: 'gold', col: '#d9a21b', f: 784 }, { name: 'green', col: '#4d8a3c', f: 988 }];
const PORTRAIT = `<svg viewBox="0 0 120 150" width="120" height="150"><path d="M60 8C28 8 16 34 16 62V132H104V62C104 34 92 8 60 8Z" fill="none" stroke="#b8923a" stroke-width="3"/><path d="M16 132H104M38 12V132M60 8V132M82 12V132" stroke="#b8923a" stroke-width="2" opacity=".55"/><g class="bird"><path d="M50 128L46 96C40 78 44 58 60 54C78 58 82 80 74 98L70 128Z" fill="#d23a2a"/><path d="M48 96C42 84 44 70 52 64L56 104Z" fill="#e2b93b"/><path d="M72 98C80 86 78 70 70 64L66 106Z" fill="#2b62b8"/><circle cx="60" cy="46" r="17" fill="#d23a2a"/><ellipse cx="66" cy="44" rx="9" ry="7" fill="#f3ecd8"/><circle cx="67" cy="43" r="3" fill="#1b1b1d"/><path d="M74 40C86 42 86 54 76 58C78 52 76 48 72 48Z" fill="#2b2622"/><path d="M52 128L50 146M66 128L68 146" stroke="#2b62b8" stroke-width="6"/></g><path d="M22 104H98" stroke="#6e4a2c" stroke-width="5" stroke-linecap="round"/></svg>`;

// st persists on the game: { round, done }.  secret = { symbol, line } or null.  onLearn() is called once.
export function parrotUI(theme, propId, st, secret, onLearn) {
  const P = theme.parrot, rng = new RNG(hashStr('song' + propId + theme.id));
  const song = Array.from({ length: 5 }, () => rng.int(0, 3));
  const rounds = [3, 4, 5];
  st.round = st.round || 0;
  let input = [], playing = false, chat = 0, alive = true;

  const root = el('div', { class: 'lockui parrot', tabindex: 0, autofocus: true });
  const bubble = el('div', { class: 'bubble' });
  const say = (text, squawk = true) => { bubble.textContent = text; bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop'); if (squawk) sfx('squawk'); };
  const bells = BELLS.map((b, i) => el('button', { class: 'bell', style: `--c:${b.col}`, title: `${b.name} bell (${i + 1})`, onclick: () => ring(i) }, el('span', {}), String(i + 1)));
  const dots = el('div', { class: 'songdots' });
  const status = el('p', { class: 'msg' });
  const paint = () => {
    const n = rounds[Math.min(st.round, rounds.length - 1)];
    dots.replaceChildren(...Array.from({ length: st.done ? 0 : n }, (_, i) => el('i', { class: i < input.length ? 'on' : '' })));
    listen.hidden = !secret || st.done;
    bellRow.classList.toggle('off', !secret || !!st.done);
  };
  const flash = (i, ms = 380) => { note(BELLS[i].f, ms / 1000); bells[i].classList.add('lit'); setTimeout(() => bells[i].classList.remove('lit'), ms - 90); };
  const play = () => {
    if (playing || st.done || !secret) return;
    playing = true; input = []; paint();
    const n = rounds[st.round];
    status.textContent = `${P.name} sings ${n} notes. Listen and watch the bells…`;
    song.slice(0, n).forEach((b, k) => setTimeout(() => { if (alive && root.isConnected) flash(b); }, 500 + k * 560));
    setTimeout(() => { playing = false; status.textContent = 'Your turn: ring the bells in the same order.'; }, 600 + n * 560);
  };
  function ring(i) {
    if (playing || st.done || !secret) { if (!playing) flash(i, 260); return; }
    const n = rounds[st.round];
    flash(i, 260);
    if (song[input.length] !== i) { input = []; paint(); sfx('wrong'); say(`Awk! Wrong, wrong! Listen to ${P.name}!`); status.textContent = 'Not quite. Press Listen to hear the song again.'; return; }
    input.push(i); paint();
    if (input.length < n) return;
    input = [];
    if (++st.round < rounds.length) { say(['Awk! Good! Again, longer!', 'Clever human! One more!'][st.round - 1] || 'Awk!'); status.textContent = 'Right! The song gets one note longer.'; paint(); setTimeout(play, 1400); return; }
    st.done = true; paint(); sfx('unlock');
    say(secret.line.replace(/^"|"$/g, ''));
    status.replaceChildren(el('span', { html: `${P.name} has told you its secret. It is marked with a ${symbolSVG(secret.symbol, 18)} ${SYMBOLS[secret.symbol].name.toLowerCase()} and has been copied into your notebook.` }));
    onLearn();
  }
  const talk = (kind) => {
    if (kind === 'hello') return say(chat++ % 2 ? `Awk! ${P.name}! Pretty ${P.name}!` : `Hello! Hello! ${P.name} says hello!`);
    if (kind === 'chat') return say(P.lines[chat++ % P.lines.length]);
    if (st.done) return say(secret.line.replace(/^"|"$/g, ''));
    if (!secret) return say(`Awk! ${P.name} knows nothing! Nothing!`);
    say(`Secret! Secret! Sing with ${P.name} first! Awk!`);
    status.textContent = `${P.name} wants you to ring back its song. Press Listen.`;
  };
  const listen = el('button', { class: 'btn primary', onclick: play }, '♪ Listen to the song');
  const bellRow = el('div', { class: 'bells' }, bells);
  root.addEventListener('keydown', (e) => {
    if (/^[1-4]$/.test(e.key)) ring(+e.key - 1); else if (e.key === 'l' || e.key === ' ') play(); else return;
    e.preventDefault(); e.stopPropagation();
  });
  root.append(
    el('div', { class: 'lock-head' }, secret ? el('span', { html: symbolSVG(secret.symbol, 38) }) : null, el('div', {}, el('h2', {}, `${P.name} the parrot`), el('p', { class: 'sub' }, secret ? `A tag on the cage is stamped with a ${SYMBOLS[secret.symbol].name.toLowerCase()}. This bird has been taught something.` : 'A talkative bird with bright, knowing eyes.'))),
    el('div', { class: 'parrotrow' }, el('div', { class: 'portrait', html: PORTRAIT }), bubble),
    el('div', { class: 'row' }, el('button', { class: 'btn', onclick: () => talk('hello') }, 'Say hello'), el('button', { class: 'btn', onclick: () => talk('chat') }, 'Chat'), el('button', { class: 'btn', onclick: () => talk('secret') }, 'Ask for its secret')),
    bellRow, dots, el('div', { class: 'row' }, listen), status, el('p', { class: 'keys' }, 'Bells: click or press 1 to 4 · L to listen'));
  bubble.textContent = st.done ? secret.line.replace(/^"|"$/g, '') : `Awk! Who goes there?`;
  status.textContent = st.done ? `${P.name} has already told you its secret.` : secret ? 'The four bells in the cage are within reach.' : `${P.name} seems happy just to chat.`;
  paint();
  root.cleanup = () => { alive = false; };
  return root;
}
