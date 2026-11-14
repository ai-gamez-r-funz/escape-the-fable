# Escape the Fable

A first-person, mid-20th-century escape room **generator** for the browser, built on three.js.
No computers, no phones: just keys, padlocks, safe dials, word wheels and furniture with secrets.

- **Surprise me** builds a fresh, guaranteed-solvable room in one click.
- **Level workshop** lets you build or remix rooms on a floor plan, with live solvability checking.
- **Share** rooms as a link, or as a JSON manifest that anyone can load.

## Run it

It is a static site with no build step.

```bash
npm start
```

Then open http://localhost:8080. Any static file server works (the game must be served over http, not opened as a file).

```bash
npm test
```

runs the headless logic checks: every generated room across all settings and difficulties must be valid, solvable, deterministic and survive a JSON round trip, and every SCAMPER remix must stay solvable.

## Playing

| | |
|---|---|
| Walk | `W A S D` (hold `Shift` to hurry) |
| Look | mouse (click the view to capture it; `Esc` releases it) |
| Interact | `E` or click |
| Notebook | `N` |
| Hint | `H` (three strengths: nudge, pointer, answer) |

**Symbols link clues to locks.** Every lock carries a mark (star, moon, heart...). A clue with the same mark belongs to that lock and no other, so you never have to guess which code goes where. The notebook files every clue under its symbol and crosses it off once the lock is open.

### Locks and puzzles

| Lock | How it opens | Where the answer comes from |
|---|---|---|
| Key lock | the key stamped with the same symbol | found in a hiding spot or another container |
| Tool | crowbar for the nailed crate, screwdriver for the vent grille | found likewise |
| Number padlock | 3 or 4 digits | a note, a note torn in two halves, a stopped clock, a count of coloured books, or a radio dial |
| Safe dial | right, left, right | a note or a torn note |
| Word wheel | spin the letter wheel to spell the password | a list of code words plus clues that eliminate all but one ("has no letter E", "ends with a vowel"...) |
| Merge tray | slide polyhedra so identical solids fuse (tetrahedron, cube, octahedron, dodecahedron...) until one remains | carved pieces found around the room complete the tray |

### Why every room is fair

- The generator grows the puzzle **backwards from the exit**. Each lock needs things (a key, clue notes, carved pieces); each thing is either locked inside another container or left in a free spot. Built this way the chain cannot be circular.
- A **solver** then plays the room and must reach the exit. It also drives the hint system and the workshop's "Check" panel.
- Word wheel clues are chosen so that all of them together leave exactly one code word, and every clue is necessary.
- Merge trays are verified by breadth-first search, which also powers the in-puzzle hint.
- The layout pass reserves standing room in front of everything interactive, then flood-fills the floor from the door to prove the player can walk up to it.
- Clue text is always *derived* from the lock it belongs to, so a clue can never disagree with its solution, even after editing.

## Level workshop

- Click a piece in the palette to add it, drag it on the plan, `R` to rotate, `Del` to remove, `Ctrl+Z` to undo.
- Select a container to give it a lock, pick its symbol, set its code/word, and choose how its clue is delivered.
- Everything a lock needs is listed under "Needed to open it" with a dropdown for where it is placed.
- **Check** shows live whether the room is escapable, lists any problems in plain language, and can reveal the full solution.
- **Remix (SCAMPER)** applies one idea at a time while keeping the room solvable:
  **S**ubstitute furniture, **C**ombine (tear a note in two), **A**dapt a written code into the room (clock, books, radio),
  **M**odify (magnify the challenge), **P**ut idle furniture to other use, **E**liminate a lock or clutter, **R**earrange the floor plan.
- **Export / Import JSON** saves and loads level manifests; **Copy share link** packs the level into the URL.
  Generated rooms that have not been edited share as a short `#seed=...` link.

## Level manifest

```jsonc
{
  "format": "escape-the-fable/1",
  "name": "The Silent Alibi",
  "theme": "detective",            // detective | study | radio | lab | liner
  "difficulty": "medium",
  "room": { "w": 7.2, "d": 4.4, "h": 3 },
  "props": [
    // x,z in metres from the room centre; rot in quarter turns (0 faces +z)
    { "id": "p1", "type": "door", "x": 3.53, "z": 0.08, "rot": 3, "lock": { "type": "key", "symbol": "diamond" } },
    { "id": "p4", "type": "trunk", "x": -1.2, "z": -1.9, "rot": 0,
      "lock": { "type": "wheel", "symbol": "star", "word": "CASE", "candidates": ["..."], "constraints": [{ "t": "has", "l": "S" }], "letters": "..." } },
    { "id": "p9", "type": "typewriter", "on": "p8", "ox": 0.43 }   // table-top props sit on a host
  ],
  "things": [
    // everything a lock needs. "for" = the prop whose lock it opens; "at" = where the player finds it
    { "id": "t2", "kind": "key", "for": "p1", "at": { "prop": "p3", "slot": "holds" } },
    { "id": "t6", "kind": "clue", "style": "constraint", "idx": 0, "for": "p4", "at": { "prop": "p9", "slot": "shown" } }
  ]
}
```

Slots: `holds` (inside a container), `hidden` (in a hiding spot), `shown` (written on, or displayed by, a prop).
Lock types: `key`, `tool`, `digits`, `dial`, `wheel`, `merge`. Clue styles: `plain`, `tornA`/`tornB`, `clock`, `books`, `radio`, `codebook`, `constraint`.
Loading a manifest validates it; a level with problems opens in the workshop instead of the game.

## Code map

| File | Role |
|---|---|
| `js/catalog.js` | prop catalogue: sizes and roles (container, hiding spot, clue surface...) |
| `js/themes.js` | the five setting templates: palette, prop pool, vocabulary, difficulty table |
| `js/levelops.js` | manifest operations shared by generator and editor (locks, clues, placement rules) |
| `js/manifest.js` | clue text, solver, layout and level validation, import/export/share |
| `js/generator.js` | backwards puzzle generation, floor-plan layout, SCAMPER operators |
| `js/words.js`, `js/mergepuzzle.js` | word-wheel clue logic; merge-tray rules, solver and generator |
| `js/props.js`, `js/textures.js`, `js/world.js` | procedural prop models, canvas textures, scene assembly |
| `js/player.js`, `js/game.js` | first-person controller; play session, notebook, hints |
| `js/lockui.js`, `js/mergeui.js` | close-up lock interfaces |
| `js/editor.js` | the level workshop |

### Adding a prop

1. Add an entry to `CATALOG` in `js/catalog.js` (size, placement, role).
2. Add a builder with the same id to `js/props.js`.
3. List it in the `props` pool of any theme that should use it.

All props are currently built from primitives so the game ships with no binary assets.

three.js is vendored in `vendor/` (MIT licence).
