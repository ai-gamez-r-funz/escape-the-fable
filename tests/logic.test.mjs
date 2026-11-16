// Headless checks: every generated level must be valid, solvable and deterministic.
import { generate, scamper, SCAMPER } from '../js/generator.js';
import { checkLevel, parseLevel, cleanLevel } from '../js/manifest.js';
import { THEME_IDS } from '../js/themes.js';
import { solveMerge, slide } from '../js/mergepuzzle.js';
import { RNG } from '../js/rng.js';

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.error('FAIL', msg); } };
const N = Number(process.argv[2]) || 8; // seeds per setting and difficulty: `npm test -- 40` for a longer run
const t0 = Date.now();
const stats = { levels: 0, steps: 0, locks: {}, ms: 0 };
for (const theme of THEME_IDS) for (const difficulty of ['easy', 'medium', 'hard']) for (let seed = 1; seed <= N; seed++) {
  let level;
  const s = Date.now();
  try { level = generate({ seed, theme, difficulty }); } catch (e) { ok(false, `${theme}/${difficulty}/${seed}: ${e.message}`); continue; }
  stats.ms = Math.max(stats.ms, Date.now() - s);
  const res = checkLevel(level);
  ok(res.ok, `${theme}/${difficulty}/${seed}: ${res.errors.join(' | ')}`);
  stats.levels++; stats.steps += res.steps.length;
  for (const p of level.props) if (p.lock) { stats.locks[p.lock.type] = (stats.locks[p.lock.type] || 0) + 1; if (p.lock.split) stats.split = (stats.split || 0) + 1; if (p.lock.style) stats['style:' + p.lock.style] = (stats['style:' + p.lock.style] || 0) + 1; }
  if (level.photo) stats.photo = (stats.photo || 0) + 1;
  for (const t of level.things) if (t.kind === 'aid') stats[t.aid] = (stats[t.aid] || 0) + 1;
  if (seed <= 3) {
    ok(JSON.stringify(generate({ seed, theme, difficulty })) === JSON.stringify(level), `${theme}/${difficulty}/${seed}: not deterministic`);
    const round = parseLevel(JSON.stringify(cleanLevel(level)));
    ok(checkLevel(round).ok, `${theme}/${difficulty}/${seed}: round trip broke the level`);
    for (const op of Object.keys(SCAMPER)) { const v = scamper(level, op, seed); if (v) ok(checkLevel(v).ok, `scamper ${op} broke ${theme}/${seed}`); else stats['noop' + op] = (stats['noop' + op] || 0) + 1; }
    // merge trays: replay the solver's answer
    for (const p of level.props) if (p.lock && p.lock.type === 'merge') {
      let pieces = p.lock.board.pieces.map((q) => ({ ...q }));
      for (const m of solveMerge(p.lock.board, pieces)) pieces = slide(p.lock.board, pieces, pieces.findIndex((q) => q.x === m.x && q.y === m.y), m.dir).pieces;
      ok(pieces.length === 1 && pieces[0].t === p.lock.board.target, 'merge replay');
    }
  }
}
console.log(stats, `${Date.now() - t0} ms`);
if (fail) { console.error(fail + ' failure(s)'); process.exit(1); }
console.log('all good');
