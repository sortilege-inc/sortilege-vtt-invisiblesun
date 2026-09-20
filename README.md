# sortilege-vtt-invisiblesun

A play aid for **Invisible Sun** (Monte Cook Games) built from the
[Titterpig DSL corpus](../../Titterpig/DSL/titterpig-dsl-invisiblesun) — the thirteen
sourcebooks, the fifteen card decks, the setting prose, and a character creator that walks
*The Key*'s own chapter. Plan, decisions and milestones: [PLAN.md](PLAN.md).

Buildless static site (GitHub Pages). Phase one is the site; the GM's table, maps and
player sessions come later.

## Status

| Milestone | State |
|---|---|
| M0 — repo skeleton: the engine, the parser, the shell | **landed** (2026-09-20) |
| M1 — `build/` generates `data/` from the corpus, two-directional gate | in progress |
| M2 — the books: reader, margin notes, glossary, setting prose, the decks | planned |
| M3 — the vislae sheet, derived from the corpus `^"Vislae"` ACTOR | planned |
| M4 — the character creator | planned |
| M5 — the five sample vislae as starts | planned |
| M6 — deployed | planned |

## Running it

```bash
python3 -m http.server 8736
```

then open `http://localhost:8736/`.

## Where the content comes from

Everything this tool shows is generated from `titterpig-dsl-invisiblesun/0.5`, whose own
gates report 13 of 13 books and 15 of 15 decks converted, 0 source units uncovered, and
95.5% of its strings reproducing the PDFs verbatim. **Nothing here is hand-transcribed**;
`data/*.js` is generated and regenerating is the only way to change it.

```bash
bash build/build.sh            # parse → build → verify (both directions) → node --check
```

## Layout

```
index.html               the site: the books, the vislae, the creator
build/                   the generator and its gate
data/                    GENERATED — window.INVISIBLESUN.books / .entities / .index
engine/                  system-agnostic: render, the on-demand data loader, the site shell,
                         and (for later phases) bus, ops, state, panels, session, table
system/invisiblesun/     the Invisible Sun module: what a sheet is, what the site lists
assets/css/              the look: a black box, cream pages, the nine suns
```

## Rights

Invisible Sun, *The Key*, *The Gate*, *The Path*, *The Way* and the sourcebooks and decks
named in the corpus are © Monte Cook Games. This is an unofficial play aid for the owner's
table, not a redistribution of the books.
