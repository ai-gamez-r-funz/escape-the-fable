// A play session: first-person exploration, interaction, inventory, notebook and hints.
import * as THREE from 'three';
import { CATALOG } from './catalog.js';
import { THEMES } from './themes.js';
import { SYMBOLS } from './symbols.js';
import { propById, thingsFor, thingsAt } from './levelops.js';
import { thingInfo, propName, lockSummary, newProgress, canUnlock, possibleActions, checkLevel, encodeShare } from './manifest.js';
import { World } from './world.js';
import { Player } from './player.js';
import { el, $, openModal, closeModal, modalOpen, toast, thingIcon, symbolSVG, sfx } from './ui.js';
import { digitsUI, dialUI, wheelUI } from './lockui.js';
import { mergeUI } from './mergeui.js';

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export class Game {
  constructor(app, level, opts = {}) {
    this.app = app; this.level = level; this.opts = opts;
    this.theme = THEMES[level.theme];
    this.world = new World(level);
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.05, 60);
    this.player = new Player(this.camera, app.canvas);
    this.player.place(checkLevel(level).spawn);
    this.ray = new THREE.Raycaster();
    this.prog = newProgress();
    this.carry = []; this.notes = []; this.lockState = {}; this.hintLevel = {}; this.hints = 0;
    this.time = 0; this.won = false; this.started = false; this.target = null;
    this.totalLocks = level.props.filter((p) => p.lock).length;
    this.handlers = [];
    const on = (t, ev, fn) => { t.addEventListener(ev, fn); this.handlers.push(() => t.removeEventListener(ev, fn)); };
    on(document, 'keydown', (e) => this.key(e));
    on(app.canvas, 'click', () => this.click());
    on(document, 'pointerlockchange', () => this.refreshHud());
    this.buildHud();
    this.showIntro();
  }

  // ---------------------------------------------------------------- HUD
  buildHud() {
    const hud = $('#hud');
    hud.hidden = false;
    this.ui = {
      prompt: el('div', { id: 'prompt' }),
      inv: el('div', { id: 'inv' }),
      timer: el('span', { class: 'timer' }, '0:00'),
      locks: el('span', { class: 'locks' }),
      resume: el('div', { id: 'resume' }, el('div', {}, el('b', {}, 'Click to look around'), el('span', {}, 'WASD move · mouse look · E / click interact · N notebook · H hint · Esc release mouse'))),
    };
    hud.replaceChildren(
      el('div', { id: 'topbar' }, el('div', { class: 'title' }, el('b', {}, this.level.name), el('span', {}, `${this.theme.name}, ${this.theme.year}`)), this.ui.locks, this.ui.timer,
        el('button', { class: 'btn small', onclick: () => this.notebook() }, 'Notebook (N)'), el('button', { class: 'btn small', onclick: () => this.hint() }, 'Hint (H)'), el('button', { class: 'btn small', onclick: () => this.quitPrompt() }, this.opts.fromEditor ? 'Back to workshop' : 'Menu')),
      el('div', { id: 'crosshair' }), this.ui.prompt, this.ui.inv, this.ui.resume);
    this.refreshHud();
  }
  refreshHud() {
    if (!this.ui || this.dead) return;
    const done = this.level.props.filter((p) => p.lock && this.prog.opened.has(p.id)).length;
    this.ui.locks.textContent = `Locks opened ${done}/${this.totalLocks}`;
    this.ui.inv.replaceChildren(...(this.carry.length ? this.carry.map((id) => { const t = this.thing(id), info = thingInfo(this.level, t); return el('button', { class: 'chip', title: info.lines[0], onclick: () => this.showThing(t) }, el('span', { html: thingIcon(t, info, 30) }), info.name); }) : [el('span', { class: 'empty' }, 'Pockets empty')]));
    this.ui.resume.hidden = !this.started || this.won || modalOpen() || this.player.locked;
    $('#crosshair').hidden = !this.player.locked;
  }
  thing(id) { return this.level.things.find((t) => t.id === id); }
  say(msg) { toast(msg); }

  // ---------------------------------------------------------------- modals
  modal(content, o = {}) {
    this.player.enabled = false;
    this.player.unlock();
    openModal(content, { ...o, onClose: () => { if (o.onClose) o.onClose(); this.resume(); } });
    this.refreshHud();
  }
  resume() {
    if (this.won || modalOpen()) return;
    this.player.enabled = true;
    this.player.lock();
    setTimeout(() => this.refreshHud(), 60);
  }
  showIntro() {
    const ok = () => { this.started = true; closeModal(); };
    this.modal(el('div', { class: 'intro' },
      el('p', { class: 'kicker' }, `${this.theme.name} · ${this.theme.year}`), el('h1', {}, this.level.name), el('p', { class: 'story' }, this.level.intro || this.theme.intro),
      el('ul', { class: 'howto' },
        el('li', { html: '<b>Look closely.</b> Walk up to anything and press <kbd>E</kbd> or click to open, search or examine it.' }),
        el('li', { html: `<b>Follow the symbols.</b> Every lock carries a mark like ${symbolSVG('star', 18)} or ${symbolSVG('moon', 18)}. A clue with the same mark belongs to that lock, and only that lock.` }),
        el('li', { html: '<b>Nothing is a guess.</b> Every code can be worked out from what is in the room. Your <kbd>N</kbd> notebook records each clue you find.' }),
        el('li', { html: 'Stuck? <kbd>H</kbd> gives a gentle nudge first, and spells it out only if you keep asking.' })),
      el('button', { class: 'btn primary big', autofocus: true, onclick: ok }, 'Begin')), { sticky: true, onClose: () => { this.started = true; } });
  }
  paper(t, extra) {
    const info = thingInfo(this.level, t);
    return el('div', { class: 'paper' + (t.kind === 'clue' && t.at.slot !== 'shown' ? ' note' : '') }, info.symbol ? el('span', { class: 'stamp', html: symbolSVG(info.symbol, 44), title: `Marked with a ${SYMBOLS[info.symbol].name.toLowerCase()}` }) : null,
      t.kind !== 'clue' ? el('span', { class: 'bigicon', html: thingIcon(t, info, 64) }) : null, el('h3', {}, info.title), ...info.lines.map((l) => el('p', {}, l)), extra || null);
  }
  showThing(t) { this.modal(el('div', {}, this.paper(t), el('button', { class: 'btn primary', autofocus: true, onclick: () => closeModal() }, 'OK'))); }
  found(things, heading) {
    sfx('found');
    this.modal(el('div', { class: 'found' }, el('p', { class: 'kicker' }, heading), el('h2', {}, things.length > 1 ? 'You found a few things' : 'You found something'), el('div', { class: 'papers' }, things.map((t) => this.paper(t))),
      el('p', { class: 'sub' }, things.some((t) => t.kind === 'clue') ? 'Clues are copied into your notebook (N).' : 'It goes into your pocket.'), el('button', { class: 'btn primary', autofocus: true, onclick: () => closeModal() }, 'Take it')));
  }
  notebook() {
    if (!this.started || this.won) return;
    const groups = new Map();
    for (const id of this.notes) { const t = this.thing(id); if (!groups.has(t.for)) groups.set(t.for, []); groups.get(t.for).push(t); }
    const secs = [...groups].map(([pid, list]) => {
      const owner = propById(this.level, pid), lock = owner.lock, solved = this.prog.opened.has(pid);
      return el('section', { class: solved ? 'solved' : '' }, el('h3', { html: `${symbolSVG(lock.symbol, 26)} ${SYMBOLS[lock.symbol].name} clues` }, solved ? el('em', {}, ' lock opened ✓') : null),
        ...list.map((t) => { const info = thingInfo(this.level, t); return el('div', { class: 'entry' }, el('b', {}, info.title + (t.at.slot === 'shown' ? ` (${propName(propById(this.level, t.at.prop))})` : '')), ...info.lines.map((l) => el('p', {}, l))); }));
    });
    const seen = this.level.props.filter((p) => p.lock && p.lock.symbol && this.lockState[p.id + '/seen'] && !this.prog.opened.has(p.id));
    this.modal(el('div', { class: 'notebook' }, el('h2', {}, 'Notebook'),
      secs.length ? secs : el('p', { class: 'sub' }, 'No clues yet. Search the furniture and examine anything unusual.'),
      seen.length ? el('section', {}, el('h3', {}, 'Locks you have seen'), ...seen.map((p) => el('div', { class: 'entry', html: `${symbolSVG(p.lock.symbol, 20)} ${CATALOG[p.type].name}: ${{ key: 'needs a key', digits: p.lock.code.length + '-digit padlock', dial: 'safe dial', wheel: 'word wheel', merge: 'merge tray' }[p.lock.type]}` }))) : null,
      el('button', { class: 'btn primary', autofocus: true, onclick: () => closeModal() }, 'Close')), { wide: true });
  }

  // ---------------------------------------------------------------- interaction
  key(e) {
    if (this.won) return;
    if (modalOpen()) {
      if (e.code === 'Escape' || ((e.code === 'KeyE' || e.code === 'Enter') && !e.target.closest('.lockui'))) { if ($('#modal').dataset.sticky && e.code === 'Escape') return; e.preventDefault(); if (e.code !== 'Escape') { const b = $('#panel .btn.primary'); if (b) return b.click(); } closeModal(); }
      return;
    }
    if (!this.started) return;
    if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); this.interact(); }
    else if (e.code === 'KeyN' || e.code === 'Tab') { e.preventDefault(); this.notebook(); }
    else if (e.code === 'KeyH') this.hint();
  }
  click() {
    if (!this.started || this.won || modalOpen()) return;
    if (!this.player.locked) { this.player.enabled = true; this.player.lock(); setTimeout(() => this.refreshHud(), 60); return; }
    this.interact();
  }
  promptFor(p) {
    const { def, cat } = p;
    if (cat.container) return this.prog.opened.has(def.id) ? null : def.lock ? `Inspect the lock on the ${propName(def)}` : `Open the ${propName(def)}`;
    if (cat.hide) return this.prog.searched.has(def.id) ? null : cat.hide;
    if (thingsAt(this.level, def.id, 'shown').length) return `Examine the ${propName(def)}`;
    return `Look at the ${propName(def)}`;
  }
  interact() {
    const p = this.target;
    if (!p) return;
    const { def, cat } = p, level = this.level;
    sfx('click');
    if (cat.container) {
      if (this.prog.opened.has(def.id)) return this.say(`The ${propName(def)} is open and empty now.`);
      return def.lock ? this.tryLock(def) : this.open(def);
    }
    if (cat.hide) {
      if (this.prog.searched.has(def.id)) return this.say('Nothing else here.');
      this.prog.searched.add(def.id);
      this.world.animate(def.id, 'search');
      const got = thingsAt(level, def.id, 'hidden');
      return got.length ? this.collect(got, cat.hide + '…') : this.say(`${cat.hide}… nothing but dust.`);
    }
    const shown = thingsAt(level, def.id, 'shown')[0];
    if (shown) {
      const fresh = !this.prog.known.has(shown.id);
      if (fresh) { this.prog.known.add(shown.id); this.notes.push(shown.id); }
      return this.modal(el('div', {}, el('p', { class: 'kicker' }, CATALOG[def.type].name), this.paper(shown), fresh ? el('p', { class: 'sub' }, 'Copied into your notebook (N).') : null, el('button', { class: 'btn primary', autofocus: true, onclick: () => closeModal() }, 'OK')));
    }
    this.say(cat.desc);
  }
  collect(things, heading) {
    for (const t of things) { this.prog.known.add(t.id); (t.kind === 'clue' ? this.notes : this.carry).push(t.id); }
    this.refreshHud();
    this.found(things, heading);
  }
  tryLock(def) {
    const lock = def.lock, level = this.level, st = (this.lockState[def.id] = this.lockState[def.id] || {});
    this.lockState[def.id + '/seen'] = true;
    const solved = () => { closeModal(); this.open(def); };
    if (lock.type === 'key' || lock.type === 'tool') {
      const r = canUnlock(level, def, this.prog.known);
      if (!r.ok) { sfx('wrong'); return this.say(lock.type === 'key' ? `Locked. The keyhole plate is stamped with a ${SYMBOLS[lock.symbol].name.toLowerCase()}: you need the key with the same mark.` : def.type === 'crate' ? 'Nailed shut. You need something to pry it open.' : 'Four screws hold the grille. You need something to undo them.'); }
      const used = thingsFor(level, def.id).find((t) => t.kind === lock.type);
      this.carry = this.carry.filter((id) => id !== used.id);
      sfx('unlock');
      this.say(lock.type === 'key' ? `The ${SYMBOLS[lock.symbol].name.toLowerCase()} key turns with a clunk.` : `The ${thingInfo(level, used).name.toLowerCase()} does the job.`);
      return this.open(def);
    }
    if (lock.type === 'digits') return this.modal(digitsUI(lock, st, solved));
    if (lock.type === 'dial') return this.modal(dialUI(lock, st, solved));
    if (lock.type === 'wheel') return this.modal(wheelUI(lock, st, solved));
    if (lock.type === 'merge') {
      const owned = new Set(thingsFor(level, def.id).filter((t) => t.kind === 'shape' && this.prog.known.has(t.id)).map((t) => t.piece));
      return this.modal(mergeUI(lock, st, owned, () => { this.carry = this.carry.filter((id) => this.thing(id).for !== def.id); solved(); }), { wide: true });
    }
  }
  open(def) {
    this.prog.opened.add(def.id);
    this.world.animate(def.id, 'open');
    this.refreshHud();
    if (CATALOG[def.type].container.exit) return this.win();
    const got = thingsAt(this.level, def.id, 'holds');
    if (got.length) setTimeout(() => this.collect(got, `Inside the ${propName(def)}`), def.lock ? 650 : 450);
    else this.say(`The ${propName(def)} is empty.`);
  }

  // ---------------------------------------------------------------- hints
  hint() {
    if (!this.started || this.won) return;
    const acts = possibleActions(this.level, this.prog);
    const a = acts.find((x) => x.type === 'open' && x.prop.lock) || acts.find((x) => x.type !== 'open') || acts[0];
    let text = 'You have done everything there is to do here.', lvl = 1;
    if (a) {
      const k = a.type + a.prop.id;
      lvl = this.hintLevel[k] = Math.min(3, (this.hintLevel[k] || 0) + 1);
      const name = propName(a.prop), lock = a.prop.lock, cat = CATALOG[a.prop.type];
      if (a.type === 'open' && lock) {
        const sym = lock.symbol ? SYMBOLS[lock.symbol].name.toLowerCase() : null;
        const how = { key: 'Use the key with the matching mark.', tool: 'Use the tool you are carrying.', digits: { clock: 'Read the stopped clock as digits: hour, then minutes.', books: 'Count the books of each colour, in the order shown on the plaque.', radio: 'The radio frequency is the combination.', plain: 'The combination is written in your notebook.', torn: 'Put the two halves of the torn note together.' }[lock.style], dial: lock.style === 'torn' ? 'Put the two halves of the torn note together.' : 'The three turns are written in your notebook.', wheel: 'Go through the code words one at a time and cross out every word that breaks one of the clues. Only one survives.', merge: 'Place the carved pieces, then fuse identical solids until one remains. The tray has its own hint button.' }[lock.type];
        text = [sym ? `You already hold everything needed for the lock marked with the ${sym}.` : 'Something you are carrying can open one of the obstacles in this room.', `It is the ${name}. ${how}`, `Open the ${name}: ${lockSummary(this.level, a.prop)}.`][lvl - 1];
      } else if (a.type === 'open') text = ['Not everything in this room is locked.', `Have you opened the ${name}?`, `Open the ${name}.`][lvl - 1];
      else if (a.type === 'search') text = ['Something is still hidden in the room. Search the furniture.', `Take a closer look at the ${name}.`, `${cat.hide}.`][lvl - 1];
      else text = ['A clue is sitting in plain sight that you have not examined yet.', `Take a closer look at the ${name}.`, `Examine the ${name}.`][lvl - 1];
    }
    this.hints++;
    this.modal(el('div', { class: 'hint' }, el('p', { class: 'kicker' }, `Hint · strength ${lvl} of 3`), el('h2', {}, text), el('p', { class: 'sub' }, lvl < 3 ? 'Ask again for a stronger hint about the same step.' : 'That is as plain as it gets.'), el('button', { class: 'btn primary', autofocus: true, onclick: () => closeModal() }, 'Thanks')));
  }

  // ---------------------------------------------------------------- end
  win() {
    this.won = true;
    this.player.enabled = false;
    sfx('win');
    setTimeout(async () => {
      this.player.unlock();
      const link = location.origin + location.pathname + '#' + (await encodeShare(this.level));
      openModal(el('div', { class: 'intro win' }, el('p', { class: 'kicker' }, 'Escaped!'), el('h1', {}, this.level.name), el('p', { class: 'story' }, this.theme.outro),
        el('div', { class: 'stats' }, el('div', {}, el('b', {}, fmtTime(this.time)), 'time'), el('div', {}, el('b', {}, String(this.totalLocks)), 'locks opened'), el('div', {}, el('b', {}, String(this.hints)), 'hints used')),
        el('div', { class: 'row' }, this.opts.fromEditor ? null : el('button', { class: 'btn primary big', autofocus: true, onclick: () => { closeModal(); this.app.surprise(); } }, 'Another room'),
          el('button', { class: 'btn big', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(link); toast('Link copied. Send it to a friend!'); } }, 'Copy share link'),
          el('button', { class: 'btn big', onclick: () => { closeModal(); this.opts.onExit(); } }, this.opts.fromEditor ? 'Back to workshop' : 'Menu'))), { sticky: true });
    }, 1300);
  }
  quitPrompt() {
    this.modal(el('div', {}, el('h2', {}, 'Leave this room?'), el('p', { class: 'sub' }, 'Your progress in this room will be lost.'), el('div', { class: 'row' }, el('button', { class: 'btn', autofocus: true, onclick: () => closeModal() }, 'Keep playing'), el('button', { class: 'btn primary', onclick: () => { closeModal(); this.opts.onExit(); } }, 'Leave'))));
  }

  frame(dt) {
    const { w, h } = this.app.size;
    if (this.camera.aspect !== w / h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    if (this.started && !this.won && !modalOpen()) this.time += dt;
    this.player.update(dt, this.level.room, this.world.colliders);
    this.world.update(dt);
    let target = null;
    if (this.started && !this.won && !modalOpen()) {
      this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      target = this.world.pick(this.ray);
    }
    const label = target && this.promptFor(target);
    this.target = target;
    this.world.highlight(target && label ? target.def.id : null);
    this.ui.prompt.textContent = label || '';
    this.ui.prompt.hidden = !label;
    this.ui.timer.textContent = fmtTime(this.time);
    this.app.renderer.render(this.world.scene, this.camera);
  }
  dispose() {
    this.dead = true;
    this.handlers.forEach((off) => off());
    this.player.dispose();
    this.world.dispose();
    closeModal();
    $('#hud').hidden = true;
    $('#hud').replaceChildren();
  }
}
