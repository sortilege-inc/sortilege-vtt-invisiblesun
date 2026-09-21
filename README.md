# sortilege-vtt-invisiblesun

A play aid for **Invisible Sun** (Monte Cook Games) built from the
[Titterpig DSL corpus](../../Titterpig/DSL/titterpig-dsl-invisiblesun) — the thirteen
sourcebooks, the fifteen card decks, the setting prose, and a character creator that walks
*The Key*'s own chapter with the book's text beside each decision, keeping a roster of vislae
in the browser and writing each out as a file. Plan, decisions and milestones: [PLAN.md](PLAN.md).

Live at **https://actuality.sortilege.online/** (and the github.io address behind it).

Buildless static site (GitHub Pages). Phase one is the site; the GM's table, maps and
player sessions come later.

## Status

| Milestone | State |
|---|---|
| M0 — repo skeleton: the engine, the parser, the shell | **landed** (2026-09-20) |
| M1 — `build/` generates `data/` from the corpus; the gate and the shape check | **landed** (2026-09-20) |
| M2 — the books: reader, margin notes, glossary, setting prose, the decks | **landed** (2026-09-20) |
| M3 — the vislae sheet, derived from the corpus `^"Vislae"` ACTOR | **landed** (2026-09-20) |
| M4 — the character creator | **landed** (2026-09-20) |
| M5 — the five sample vislae as starts | **landed** (2026-09-20) |
| M6 — deployed: GitHub Pages, `actuality.sortilege.online` | **landed** (2026-09-20) |
| M7 — the sheet and the walk redesigned: decision first with the book beside it, cards that say what they are, finders for the decks, a roster, the sheet as a sheet, mobile | **landed** (2026-09-20) |

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
bash build/build.sh            # build → verify both directions → check shapes → node --check
```

| Script | What it does |
|---|---|
| `build/parse_dsl.py` | The generic DSL parser (spec 0.5). Contract: every token consumed or it raises. Two things this corpus needed: a `RULES` block's free-text lines lifted verbatim (the tokenizer drops the punctuation they are made of), and a `^"Level" ENUM "subsection"` instance value attached to its property rather than left loose in the body. |
| `build/build_data.py` | One `data/<book>.js` per book plus `data/<book>.notes.js` for its margin notes, and `data/index.js`. Holds the file → book map — the only hand-written list in the build — and refuses to run if any corpus file is claimed by no book. |
| `build/verify_data.py` | The gate, both directions: every string and caret name the corpus prints reaches `data/`, and every string in `data/` came from the corpus. |
| `build/check_shape.py` | What the gate cannot see: that a string landed on the right *field*. Every assertion is against a count the corpus itself supplies. |

Gate status from `bash build/build.sh` on 2026-09-20: 41 corpus files → 15 books,
**6,779 entities + 3,532 margin notes**; `verify_data: 25,391 strings + 2,656 lore lines —
0 uncovered · 0 unsourced`; `check_shape: OK` (47 assertions).

## Layout

```
index.html               the site: the books, the vislae, the creator
build/                   the generator and its gate
data/                    GENERATED — window.INVISIBLESUN.books / .entities / .index
engine/                  system-agnostic: render, the on-demand data loader, the site shell,
                         and (for later phases) bus, ops, state, panels, session, table
system/invisiblesun/     the Invisible Sun module: what a sheet is (sheet.js, derived from the
                         ACTOR), the walk (creator.js), the roster (roster.js), what the site lists
assets/css/              the look: a black box, cream pages, the nine suns
```

## Rights

Invisible Sun, *The Key*, *The Gate*, *The Path*, *The Way* and the sourcebooks and decks
named in the corpus are © Monte Cook Games. This is an unofficial play aid for the owner's
table, not a redistribution of the books.
