# sortilege-vtt-invisiblesun — plan and decision log

A virtual tabletop for **Invisible Sun** (Monte Cook Games), built on the Titterpig corpus
`titterpig-dsl-invisiblesun/0.5`. Its shape follows `sortilege-vtt-teeth`, read as a reference
only — that repo's `PLAYBOOK.md` states the generalisable rules this one works to, and neither it
nor anything else in that repo is modified here. Fifth in the line — Wyldwolf Axis, NOVA Open,
City of Winter, TEETH.

Status words: **PROPOSED** (awaiting the owner), **(owner)** decided, **landed** built and
verified in the browser by the main session.

## Scope of this phase (owner, 2026-09-20)

**The initial landing only:** the public site at the root — the Rules reader, the published
characters, and above all the **character creator**. The GM's table (`gm/`), maps, sessions and the
Worker are later phases; `engine/` is copied whole now so they are additive when they come.

**Ground rules (owner, 2026-09-20):**
- **The TEETH repo is read-only reference. Zero changes to it** — no edits, no commits, nothing
  written into its `PLAN.md` / `PLAYBOOK.md`. Notes this build produces live in this repo.
- **No TEETH rules or content enter this project.** What is reused is the system-agnostic code
  only: `engine/*.js` (no game words), the generic DSL parser and the shape of the gate. Nothing
  under TEETH's `data/`, `system/teeth/`, `assets/`, its book map, its `window.TEETH` namespace
  or its fonts and palette comes across. Every word this site shows is from
  `titterpig-dsl-invisiblesun/0.5`.

## What is on disk (read 2026-09-20)

| Input | State |
|---|---|
| `~/Sortilege/VTT/sortilege-vtt-invisiblesun` | cloned, empty (no commits); remote `sortilege-inc/sortilege-vtt-invisiblesun` |
| `~/Sortilege/Titterpig/DSL/titterpig-dsl-invisiblesun/0.5` | 41 files, 8.97 MB; validator 0/0; 13 books + 15 decks, every gate PASS (its `README.md`, 2026-09-20) |
| `~/Sortilege/Campaigns/2026 TEETH/sortilege-vtt-teeth` | the template: `engine/` 2,090 lines, `system/teeth/` 2,056, `build/` 1,110; `PLAYBOOK.md` |
| Invisible Sun PDFs | **not on disk** — `~/Downloads/Invisible Sun/` is gone; the corpus is the only source now |
| Forte flowcharts | 30 PNGs (220 dpi) + Maker's Matrix + Path of Suns in `~/Sortilege/Titterpig/Temp/archive-conversions/invisible-sun-conversion/maps/`; the 30 cover 30 of the 31 fortes (see D3) |

**The TEETH parser already reads this corpus:** `parse_dsl.parse_files` on all 41 files → 40 of 41
parse; the one failure is the BASE's `RULES { #hash: WHEN […] THEN … }` block (line 122 of
`invisiblesun-0.5-core-base.ttrpg`), a rule-line form TEETH's corpus never used. One parser
extension, then the build is inherited whole.

### The corpus, by what the site needs

| Need | In the corpus | Shape |
|---|---|---|
| The rules of every book | `^"Rule"` × 3,726 — one per printed heading, verbatim, with `Book`/`Page`/`Chapter`/`Section` ("A / B" path)/`Level` | flat entities; the reader builds the tree from the fields, not from nesting |
| Sidebars | 524 `GUIDANCE` (§22) on the rule they sit beside | `guidance[]` (TEETH's build reads it) |
| Margin notes | `^"Margin Note"` × 3,532 with `Book`/`Page`/`Position`/`Colour`/`Kind`/`Beside`/`Terms` | 2.2 MB — the channel the books print down the middle of the page; matched to a rule by book + page, ordered by `Position` |
| The Gate's glossary | `^"Glossary Entry"` × 228 | |
| The setting (The Path) and the fiction | two `.lore` Markdown files (453 KB + 19 KB) | TEETH's build already carries `.lore` |
| The six fingers | `^"Order"` 5 (+24 `Order Degree`, 107 `Order Ability`, 12 `Apostate Ability`), `^"Heart"` 4, `^"Forte"` 31 (+297 `Forte Ability`), `^"Soul Allegiance"` 13, `^"Foundation"` 8, `^"Character Arc"` 37 | records; degrees/abilities nested in `DEGREES {}` / `ABILITIES {}` blocks (TEETH's `collect_entities` walks keyword blocks → `children`) |
| Magic to pick | `^"Spell"` 45 long-form + 300 general + 50 Vance (+ Book M 40, Nightside 25, Wellspring 2), `^"Minor Magic"` 63, `^"Secret"` 103, `^"Ephemera"` 242+, `^"Incantation"` 208+, `^"Object of Power"` 182+, `^"Weaver Aggregate"` 18, `^"Goetic Summoning"` 13, `^"Change"` 182 | every card an entity; `Deck` names the physical deck |
| Money | `^"Currency"` 10, `^"Good"` 450 in 42 `^"Good Category"` | |
| The Sooth Deck | `^"Sooth Card"` 60 | |
| The character | `ACTOR "Vislae"` in the BASE: the six fingers as `^"X" ^"Type"` picks, Certes/Qualia/Hidden Knowledge, `^"Pools" DEF {…}` (8 pools), Wounds/Anguish/Acumen/Joy/Despair, House, Spells/Secrets/Charms/Objects/Quirks/NPC Bonds as `LIST OF #hash ^"Type"` | **no TEMPLATE, no `.actor`** — a vislae is built from the ACTOR directly, the path TEETH's Outfit already takes |
| Published characters | `^"Sample Character"` × 5 — name + the book's descriptor sentence + page, nothing else | see D2 |

### What The Key says the creator must do (all verbatim entities in `rules-key`)

*Creating a Vislae Character* › *The Six Fingers of the Testament of Suns* › **Step 0** (roleplaying
style) · **Step 1** Order · **Step 2** Heart · **Step 3** Forte · **Step 4** Soul · **Step 5**
Foundation · **Step 6** Character Arc · **Step 7** Form Bonds (with the group; *The First Session*
chapter), then *Finishing Touches* (Name, Appearance, Languages, Skills) and the Foundation
chapter's *Shadow Skill*, *Shadow Memento*, *Quirks*, *Connections*, *NPC Bonds*, *Vislae Houses*.

The numbers that live only in prose (each becomes a named constant citing its sentence, as TEETH's
`ADDED_ACTION_POINTS` does):

| Rule | Sentence (entity) |
|---|---|
| Heart sets Certes and Qualia; the points are divided into that stat's four pools; undivided points serve no purpose | *Stat Scores* (p27) |
| The pool's declared value is its *normal starting value*; bene are tokens on it | *Stat Pools* (p27) |
| Heart "grants you a pair of skills" (from the heart's `Skills` list) | *Heart and the Player Character* (p68) |
| Skills rise only to 4 | *Using Skills* (p33) |
| Forte: "start with the first one and then select more, following the path indicated" — some fortes "one of the first ones (my choice)" | each forte's own *Forte Abilities* sentence (`Background`/… props; the sentence is in the `rules-key` forte entry) — see D3 |
| Vance: "a grimoire with six Vancian spells … alpha or beta class" | *1st-Degree Vance: Postulant › Vancian Spells* — see D4 |
| One character arc at creation (optional) | *Beginning a New Arc* (p166) |
| Zero to three NPC bonds | *NPC Bonds* (p159) |
| Everyone starts with a level 2 Shadow skill; one Shadow memento | *Shadow Skill*, *Shadow Memento* (p156) |
| One quirk (or your own) | *Quirks* (p156) |
| Foundation gives Income, Initial Savings, Hidden Knowledge, House, Connections (levels), Special | the eight `^"Foundation"` records |
| PCs start at 1st degree (not Journeyman) | *Journeyman Degree* (p38) |
| All speak Indigo and the Invisible Tongue | *Languages* (p162) |

**Corpus holes the creator will show as they are** (report to the corpus `TODO.md`; never patch in
the tool): *Heart and the Player Character* (p68) is truncated — the Galant and Stoic paragraphs and
the sentence after "you take the base" are missing; the Forte chapter's opening (p73) is fragments
("Sun character can", "do."); The Key's degree headings read "st -Degree Vance: Postulant" (the
`orders` file has them whole).

## Decisions D1–D6 — settled (owner, 2026-09-20)

The owner took every recommendation as written. Each is restated below with the evidence it was
decided on, and each is logged in the decision log at the foot of this file.

**D1 — The `Vislae` ACTOR declares less than The Key puts on a character.** Missing from the
BASE: skills (rated 0–4), connections (rated), Shadow skill, Shadow memento, appearance, languages,
roleplaying style, PC bonds, house peculiarity, ephemera / incantations held, Crux. The playbook
rule is that the sheet is *derived from the ACTOR's declarations*, so a hand list in the tool is the
wrong fix.
- **(owner) Decided:** add the declarations to `invisiblesun-0.5-core-base.ttrpg` (hand-authored
  BASE; VERSION 0.5.1 → 0.5.2 per the bump rule), e.g. `^"Skills" LIST OF ^"Skill Rating"` with a
  `^"Skill Rating"` type (`^"Skill" STRING`, `^"Level" INTEGER MIN 0 MAX 4` — "only ever rise to
  4"), `^"Connections" LIST OF ^"Connection Rating"`, `^"Shadow Skill" STRING`, `^"Shadow
  Memento" STRING`, `^"Appearance" STRING`, `^"Languages" LIST OF STRING`, `^"Roleplaying Style"
  ENUM [Builder, Explorer, Attainer, Achiever]`, `^"Crux" INTEGER MIN 0`, `^"Ephemera" LIST OF
  ^"Ephemera"`, `^"Incantations" LIST OF ^"Incantation"`. Pools stay as declared: the declared
  value is the book's "normal starting value" and current bene is live sheet state.
- *Trade-off accepted:* this touches the corpus repo (~20 lines, then validator +
  `check_references.py` + `check_constructs.py` + the eleven coverage gates rerun, all of which
  must stay green) rather than hand-listing a sheet in the tool. It is an **addition to a
  hand-authored BASE**, not a regeneration: `support/build.sh` does not write `core-base.ttrpg`,
  so no bucket is rebuilt and no verbatim string moves. Done as its own commit in the corpus repo
  before M3, with the gate output in the commit message.

**D2 — Published characters.** The five sample vislae are a name and a sentence ("An Established
Stoic of the Order of the Vance who Walks the Path of Suns"). The Character Tomes / Player's
Envelope are not converted and the PDFs are no longer on disk.
- **(owner) Decided:** the **Characters** tab lists the five as *starts*: choosing one opens the
  creator with Foundation, Heart, Order and Forte fixed from the sentence (all four are entity
  names) and everything else the player's. Nothing is invented; the descriptor is shown verbatim.
  Where a descriptor's forte phrase is not an exact entity name, only the parts that resolve are
  fixed and the step is left open — the tool never guesses which forte was meant.

**D3 — The forte path.** The book's rule is "start with the first one and then select more,
following the path indicated"; the path is the flowchart, and the corpus held the abilities but
no edges.
- **(owner) Decided, then decided again (2026-09-20).** The first decision was to show the
  archive's flowchart images beside the ability list. Looking at them changed the premise: they
  are not isolated diagrams but **whole printed pages**, some with body text cut mid-column, and
  this repo is public while the corpus repo is private. The owner's call on seeing that: **no
  diagrams, and encode the path-dependence in the corpus instead**, so our own interface diagrams
  can be drawn from data — an image is not DSL-legal content.
- **Done.** `^"Forte Ability"` now declares `^"Follows"`, and the corpus carries **303 edges
  across all 31 fortes** (`titterpig-dsl-invisiblesun` `da87e78`, completed in `0884c15`). The
  edges were read off the page renders as a conversion source and gated from both sides by
  `support/scripts/verify_forte_paths.py`; no image is referenced by the corpus or shipped by
  this repo. The site draws the tree itself, in SVG, from those edges.
- **Checked against the printed books (owner, 2026-09-20).** Every forte diagram is in The Key,
  one per odd page 77–137. The owner read ten of them out of the physical copy — the one forte
  with no edges, the four whose two starting abilities no sentence confirms, the two the surviving
  geometry could not locate, and the three with the most crowded bands. **Nine matched the corpus
  edge for edge.** *Breathes Runes* was corrected: one band is a full crossing, read here as two
  straight verticals. *Writhes And Squirms* — whose diagram is the one page the conversion never
  rasterised — now has all twelve of its edges, so `no_diagram` is empty and no forte shows the
  sentence alone. `build/check_shape.py` gained five assertions on `^"Follows"`, counted against
  the corpus's own lines, because a displaced edge loses no string and would simply draw flat.

**D4 — Vance spell class.** The 1st-degree Vance takes six spells "from those we can fit into our
minds (alpha or beta class)". Class is the card's *size* on the Vance deck and is not in the
corpus.
- **(owner) Decided:** the creator offers all 50 Vance spells, shows the effect text verbatim, and
  does not filter; it states the book's limit ("alpha or beta class") in the book's own words
  beside the picker so the player applies it from their deck. The class gap goes to the corpus
  `TODO.md` — the deck reader knows each card's geometry, so `^"Class"` is derivable later, and
  when it lands the picker filters without a change here.

**D5 — Look.** The books are cream pages, black Scala body, DevinneD small-caps headings, and five
inks for the margin channel (`#862124` red, `#243061` blue, `#e38529` orange, `#663895` purple,
`#484b75` slate); the box is black.
- **(owner) Decided:** a black chrome (the Black Cube) with the sun colours as accents and cream
  reading pages; Google fonts `Cormorant Garamond` (body) and `Cinzel` (display); margin notes
  set in the ink the book prints them in, from the note's own `Colour` field. `assets/css/invisiblesun.css`
  is written for this repo — no TEETH stylesheet is copied.

**D6 — Domain.** A Pages CNAME.
- **(owner) Decided:** the plan said `invisiblesun.sortilege.online`; the owner chose
  **`actuality.sortilege.online`** when adding it (2026-09-20) — Actuality being the setting's own
  name for the world. The github.io address serves behind it. The plan assumes both origins are
  live, so nothing hard-codes one.

## Layout (the inherited three-layer shape; everything game-specific written here)

```
index.html               the site: Rules · Characters · Character creator (engine/site.js + system/invisiblesun/site.js)
build/                   parse_dsl.py (+ RULES lines) · build_data.py (books map for this corpus, lazy-load index) · verify_data.py
data/                    GENERATED — window.INVISIBLESUN.books / .entities / .index; one file per corpus file, loaded on demand
engine/                  copied whole from sortilege-vtt-teeth (bus, ops, state, render, site; vtt/play/session unused until gm/ comes)
system/invisiblesun/     data.js · entity.js · sheet.js (the Vislae sheet, derived from the ACTOR) · site.js (tabs, reader, creator)
assets/css/invisiblesun.css · assets/art/fortes/ (D3)
docs/ PLAN.md PLAYBOOK-notes.md README.md .claude/launch.json (vtt-invisiblesun, port 8736)
```

Git identity per repo, as TEETH: `Jordan Peacock <jordan@sortilege.online>` (set in M0).

## Milestones

| # | Milestone | Proof required |
|---|---|---|
| M0 | Repo skeleton: copy `engine/*.js` and `build/parse_dsl.py` (generic code only — no `data/`, no `system/teeth/`, no css, no TEETH book map); `.gitignore`, `launch.json`, README stub, this plan; git identity | **landed 2026-09-20** (`0165ab6`) — `grep -ri teeth` matches only this plan; the shell renders on 8736 and the three tabs route through their real links; console empty |
| M1 | `build/` generates `data/` from the corpus: `parse_dsl` learns `RULES` lines; a new `build_data.py` (written for this corpus, `window.INVISIBLESUN`) maps the 41 files to site books and emits `data/index.js` + per-book scripts the engine loads on demand; `verify_data.py` two-directional | **landed 2026-09-20** (`7215bb1`) — `build.sh`: 41 files → 15 books, 6,779 entities + 3,532 notes; `verify_data: 25,391 strings + 2,656 lore lines — 0 uncovered · 0 unsourced`; `check_shape: OK` (42 assertions); `node --check` on every data file. Browser: the shelf lists 15 books from `index.js` alone, and opening The Key fetched exactly `key.js` + `key.notes.js` (the decks stayed unloaded); *Step 1: Choose an Order* carries Text/Book/Page/Level/Chapter/Section and The Key p21's note carries `#862124` · prose |
| M2 | The site shell and the **Rules** reader: book picker, chapters › sections from the `Rule` fields, the rule verbatim with its `GUIDANCE` sidebars and the page's margin notes beside it in their ink, glossary, `.lore` rendered from Markdown, search; the decks as a card grid filterable by deck / sun / level | **landed 2026-09-20** — browser, through the real controls: The Key's 13 chapters in the outline; *Step 1: Choose an Order* reads verbatim, trails *Characters › R E O T* and carries its three p21 margin notes in `#862124`; *Speaks with the Moon* shows its sidebar as GUIDANCE and 4 notes; The Gate's 228 glossary entries listed, *Actuality* opens with its definition; *Bears an Orb* renders its five prose fields and all nine abilities with level and sun; the decks filtered to Gold → 207 of 1,315, every card Gold; The Path's 300 lore sections, *THE CITY OF SATYRINE* opens; search "bene" → 60 hits with excerpts. 0 console errors |
| M3 | `system/invisiblesun/sheet.js`: the Vislae sheet derived from the ACTOR (+ D1 declarations) | **landed 2026-09-20** — browser, through the real controls: the six fingers offer exactly what the corpus holds (5 orders, 4 hearts, 31 fortes, 13 souls, 8 foundations); Stoic set Certes 7 / Qualia 10 and Established set Hidden Knowledge 10; Vance showed its *1st-Degree Vance: Postulant* abilities verbatim and Bears an Orb its nine ability cards; the heart's ten skills offered and the third pick refused (a pair, per the book); Intellect stepped to 3 and the Qualia group read *3 of 10 divided*; House fell back to free text because the corpus has no `^"Vislae House"` instance. localStorage byte-identical and empty throughout |
| M4 | **The character creator**: The Key's chapter walked step by step | **landed 2026-09-20** — browser, through the real controls: twelve steps, each showing the book's entity verbatim with its page; Vance → Stoic (Certes 7 / Qualia 10, and a stat refuses a point it does not have: 8 clicks on Accuracy gave 7, 11 points asked of Qualia gave 10) → two heart skills, the third refused → Walks the Path of Suns with its nine abilities → The Watcher → Established, its printed table shown and house / Shadow skill / memento / a connection / a quirk written → Uncover a Secret → the Vance's six first-degree grants verbatim and six spells chosen → name, appearance, languages → the finished sheet, whose describing sentence reads *Ossian Vahl is an Established Stoic of the Order of the Vance who Walks the Path of Suns*, the same form The Key prints for its own five. The file round-trips byte-identically through `readCharacter`, and the real **Load a character file…** control restored the whole character into a blank creator. localStorage held one key throughout, the draft |
| M5 | **Vislae** tab (D2): the five sample vislae as starts into the creator | **landed 2026-09-20** — browser, through the real controls: all five resolve all four parts of their printed descriptor, including *Order of Goetica* → Goetic, a bare *Apostate*, and *Explores the Noösphere*; **Start a vislae from this** on Lord Vryx seeded the draft and opened the walk reading *This vislae is an Iconoclastic Ardent of the Order of Goetica who Hosts a Legion* with *Started from Lord Vryx, whom The Key illustrates on page 59*, and Order, Forte and Foundation marked done while Heart stayed open (its points are still undivided). The soul is left open by the book's own rule |
| M6 | Deploy: GitHub Pages from `main`, root; CNAME when the owner adds it (D6); README complete | **landed 2026-09-20** — Pages from `main`; the owner added `actuality.sortilege.online` (`13b8844`, the CNAME file GitHub commits). At the time of this note the host still answered with the `*.github.io` certificate: GitHub provisions the domain's own and "Enforce HTTPS" unlocks when it lands |
| M7 | **The sheet and the walk, redesigned** (owner, 2026-09-20: "a lot of improvements can be made in the character sheet/character creation space"): each step decision-first with The Key's text beside it; choice cards that say what a thing is from its own fields; the chosen card collapsing with a way back; finders over the decks instead of 300-option selects; chips that show what was decided and a checklist of what the book still asks; a roster of vislae per browser; the sheet laid out as a sheet; mobile | **landed 2026-09-20** — browser, through the real controls at 1200 px and 375 px: the old single draft migrated into the roster as its first entry and the legacy key removed; Vance chosen → its card collapsed with *change*, its Description and *1st-Degree Vance: Postulant* (6 abilities) shown, chip reads *Step 1 · Order / Vance*; Stoic → Certes 7 / Qualia 10 on the card, the pools disabled before a heart and capped after (*6 of 7 still to divide*), the pair of skills counted; Bears an Orb → tree + 9 ability rows, the stale "corpus holds no edges" line gone; a soul card carries its Description and Gift; Established carries Hidden Knowledge / income / savings; the arc finder listed 37 with descriptions and one click chose *Aid a Friend*; the spell finder offered sun (10) / level (15) / deck (8) filters, "fire" narrowed 462 → 9, a pick kept the search; the sheet: masthead, six fingers, three stat tiles, eight pools, six tracks, order and forte abilities, skills/connections, magic by kind, bonds, foundation and soul tables — nothing in the "also declared" bucket; the file round-trips byte-identically and carries no roster id; duplicate 1→2, delete 2→1, deleting the current entry falls back to the most recent; the Vislae tab's *Start* seeds a roster entry with all four picks; at 375 px no horizontal overflow, the chips scroll, the nav sticks, the book folds. 0 console errors throughout |

One commit per milestone, pushed; each proven in the browser by the main session through the
real controls (PLAYBOOK §5) before the next begins. Use the launch entry, never Bash, for the dev
server.

## What Invisible Sun needs that the inherited engine did not (this repo's `docs/PLAYBOOK-notes.md`; TEETH's files are not touched)

1. **Lazy data.** Nine MB of corpus; the site loads `index.js` and fetches a book's files on
   first use (script injection with a promise), so the engine gains `VttData.ready(bookIds)`.
2. **A reader over typed, flat rules.** TEETH's chapters were untyped nested roots; here every rule
   is a `^"Rule"` with `Chapter`/`Section`/`Level` fields, so the tree is built from fields.
3. **A margin channel.** Notes are entities matched to a page and set beside the rule in their
   printed ink — the first corpus where colour and position are content.
4. **An ACTOR with no TEMPLATE, all picks.** The sheet's shape is the BASE alone; every finger is
   a `^"X" ^"Type"` pick and every magic list a pick-any from the type's entities (TEETH's Outfit
   path, generalised), plus a `DEF`-valued property (`Pools`) rendered as a group of tracks.
5. **A creator whose numbers are all in prose.** Nine named constants, each citing its sentence.

## Decision log

| # | Decision | Why |
|---|---|---|
| 1 | The landing first; `engine/` copied whole so `gm/`, the table and the Worker are later additions, not rewrites (owner's scope, 2026-09-20) | The site writes nothing (PLAYBOOK §2), so it stands alone. |
| 2 | Data is parsed straight from the DSL with TEETH's generic parser, extended for `RULES` lines; not the synthesist | Same reason as TEETH's decision 4; and 40 of 41 files already parse unchanged. |
| 3 | Books for the site are a map in `build/build_data.py` from corpus file → book, the only hand list in the build; the corpus's `sources.json` groups by *source PDF*, which is not what a reader picks (The Key's fortes are their own file) | The build knows file kinds, not game words; a file → book map is a file kind. |
| 4 | Data loads per book on demand | 8.97 MB; the margin notes alone are 2.2 MB. |
| 5 | Margin notes are shown beside the rule they are printed against (book + page, ordered by `Position`), never merged into its text | Verbatim-rules rule; the note channel is content in its own right (owner, 2026-09-20). |
| 6 | Corpus gaps found while building are reported to `titterpig-dsl-invisiblesun/TODO.md`, never patched in `data/` or in the tool | `data/` is generated; regenerating is the only way to change it. |
| 7 | **(owner, D1)** The missing character fields are added to the corpus BASE's `^"Vislae"` ACTOR, not hand-listed in the tool; its own commit in the corpus repo before M3, gates green in the message | The sheet is derived from the ACTOR's declarations; a hand list in the tool would be a second, drifting copy of the character. |
| 8 | **(owner, D2)** The five `^"Sample Character"` entities are creator *starts*, fixing only the parts of the printed descriptor that resolve to an entity name | The books give a name and a sentence, nothing more; fixing what resolves invents nothing, and an unresolved phrase leaves the step open rather than guessed. |
| 9 | **(owner, D3 — decided, then reversed the same day)** First: show the archive's flowchart image beside the ability list. Reversed on seeing them: **no images at all; encode the path-dependence in the corpus** and let the site draw its own tree in SVG from the edges | The archive's "charts" are whole printed pages, some cutting body text mid-column, and this repo is public while the corpus is private — and an image is not DSL-legal content, so the corpus could not hold one either way. Edges between entities the corpus already had can be gated from both sides; a picture cannot. |
| 10 | **(owner, D4)** All 50 Vance spells are offered unfiltered with the book's "alpha or beta class" limit quoted beside the picker; `^"Class"` goes to the corpus TODO | Class is the card's physical size and is not in the corpus; a guessed filter would silently remove legal choices. |
| 11 | **(owner, D5)** Black chrome with the sun colours as accents, cream reading pages, Cormorant Garamond / Cinzel, margin notes in the ink from each note's own `Colour` | The books' own scheme; the note colour is already content in the corpus, so it is read, not chosen. |
| 12 | **(owner, D6)** `invisiblesun.sortilege.online` by Pages CNAME at M6; nothing hard-codes a single origin | TEETH's CNAME commit was rejected once because the Worker admitted one origin; this one assumes two from the start. |
| 13 | A RULES block's lines are lifted to quoted strings in place before tokenizing (`parse_dsl.lift_rule_lines`), and the gate lifts the same way before counting | The tokenizer drops the punctuation free text is made of, so a rule line cannot be rebuilt from tokens — and a rebuilt line would not be verbatim, which is the one thing it must be. |
| 15 | The creator **counts against the book's sentence rather than enforcing it** wherever a grant is stated only in prose (a Vance's grimoire of six spells, a Maker's crafted object). The order's own first-degree abilities are printed verbatim above the pickers, and the picker shows how many have been taken | D4's principle: the corpus does not carry a Vance spell's class, so a filter would silently remove legal choices. The two places the creator *does* refuse — a stat's points and a heart's pair of skills — are refusals the book states as numbers the corpus carries or a constant citing its sentence. |
| 16 | How each order is spoken of in the describing sentence is a five-entry constant citing *Step 1: Choose an Order* (The Key p21), which states them in one sentence | Without it the sentence reads "of the Order of Vance"; the book, and its own five sample descriptors, say "of the Order of the Vance" but "of the Order of Makers". |
| 14 | `build/check_shape.py` joins the build: 47 assertions on the fields the site reads, each against a count grepped from the corpus, and it runs in `build.sh` | The string gate is blind to a string on the wrong field. `^"Level" ENUM "subsection"` parsed as a property with no value plus a loose string: 3,726 rule levels and 3,532 note kinds attached to nothing, with every string still round-tripping. The parser is fixed; this is what would catch the next one. |
| 17 | **(owner)** Ten forte diagrams checked against the **physical copies** of The Key, chosen by what nothing else could settle: the forte with no edges, the four whose two starting abilities no sentence confirms, the two the surviving geometry could not locate, and the three with the most crowded bands | The edges were read from rasterised pages and the source PDFs are gone, so the print was the only independent witness left. It paid: nine matched edge for edge, *Breathes Runes* had a band wrong, and *Writhes And Squirms* — the one page the conversion never rasterised — got all twelve of its edges. |
| 18 | `check_shape.py` gains five assertions on `^"Follows"`, counted against the corpus's own lines, including that the BASE declares the field exactly once with no body | A displaced edge loses no string, so `verify_data` cannot see it — the tree would simply come out flat. Proved by removing one edge from `data/key.js`: 302 vs 303, gate exits 1. |
| 19 | **(owner, M7)** A step is decision-first: the choice in the main column, The Key's text for that step verbatim in a side column that scrolls on its own, folded under *What The Key says* on a narrow screen | Every step had opened on the book's text with the decision below the fold (Step 1 was ~2,500 characters before an order appeared). The text is a constraint, not the task; the reader already sets a rule beside its margin, and the same shape fits here. |
| 20 | **(owner, M7)** The browser keeps a **roster** of vislae (`roster.js`: list / open / add / save / remove / duplicate, one current), and the single draft this replaced migrates in as the first entry; a file stays the durable form | One draft meant a second character silently discarded the first. The roster is state only; nothing in the engine changes, and the creator still walks one draft object. |
| 21 | A choice card is summed up by its own fields, never by text written here: a heart's tagline and its Certes/Qualia; a forte's first ability and its effect; a soul's Description and Gift; a foundation's Hidden Knowledge, income and savings; an arc's Description. The chosen card collapses to one with *change*; what is shown under it is what the step needs (an order: its Description and its 1st degree, the six degrees a link away) | Bare names for 31 fortes and 13 souls said nothing; dumping the whole entity after a pick (an order = six degrees) hid the other choices. Excerpts are verbatim prefixes cut at a word, the full text one click away. |
| 22 | Every pick-any over a deck's worth of entities is a **finder** (`Sheet.controls.cardPicker`): search, and a sun / level / deck filter wherever the options vary by it, results as cards, the chosen ones as cards above; its state outlives a redraw | Six `<select>`s of up to 462 options were unusable. The decks tab already had this control; the finder is the same idea over a list. D4 stands: the order's sentence is shown and the count kept, nothing enforced. |
| 25 | **(owner)** Every finder has **Draw one** — a random pick from the rows the filters currently leave, all of them, not only the 48 the grid shows; the button says how many it is drawing from and the filters stay set after the draw | Invisible Sun deals most magic from decks; drawing from a narrowed deck (Red spells, level 3 ephemera) is how the table does it. Verified: Red narrowed 461 → 38, the draw was *Fingersnakes* (Red), the filter held, the label read *Draw one of 37*. |
| 23 | The sheet is arranged as a sheet — masthead with the describing sentence, the six fingers as cards, stat tiles and pools, the tracks as a strip, rated tables, magic by kind, bonds, the foundation's and soul's own tables — but the fields are still read off the ACTOR: the layout names where a declared field goes, and a field it does not name lands in a final *Also declared* section (empty today, asserted so in the M7 proof) | Derivation from the ACTOR is the M3 principle and stays; what was missing was arrangement, and a hand-listed arrangement of declared fields loses nothing as long as the leftover bucket exists. |
| 24 | The checklist is what the book asks for, each ask naming the step it is settled at (`IsCreator.asks`): order, heart with its points divided and its pair of skills, forte, soul, foundation, an arc, a bond with another PC, a name. Style and the order's magic are the book's optional steps and are not asked | The chips coloured done/not-done but said neither what was chosen nor what was missing; a player finishing saw a form, not a list. Asks are the book's steps, not rules of this tool's. |

## STOPPED HERE — to resume

**Everything on the landing has landed, M0–M7, and is live at https://actuality.sortilege.online/**
(the github.io address behind it). `bash build/build.sh` is green (47 shape assertions); the corpus
is at `titterpig-dsl-invisiblesun` `0884c15`, every forte path complete.

Open, none blocking:
- GitHub's certificate for `actuality.sortilege.online` was still provisioning when M7 landed;
  once it is there, turn on **Enforce HTTPS** in the Pages settings.
- The print stylesheet for the sheet is written (`@media print` in `invisiblesun.css`) but was not
  proofed on paper or in a print preview — the browser pane cannot open one.

**The next phase** — the GM's table under `gm/`, sessions, the Worker — is a fresh piece of work on
the same engine; the roster's character objects are the file the table will import.
