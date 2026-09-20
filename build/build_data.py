#!/usr/bin/env python3
"""
build_data.py — the Invisible Sun corpus (titterpig-dsl-invisiblesun/0.5) → data/*.js.

Everything the site shows comes from here; nothing is hand-typed. The shape is GENERIC
and hash-keyed — the engine reads it without knowing the game, and system/invisiblesun/
interprets an entity by its `type` (the caret name it EXTENDS):

    window.INVISIBLESUN.index          { system, corpus, counts, books: [ … ] }
    window.INVISIBLESUN.books[<id>]    { id, title, kind, files, entities: [ids in printed
                                         order], notes: [ids], lore: [ … ] }
    window.INVISIBLESUN.entities[<h>]  { id, name, key, form, book, file, type, typeHash,
                                         parent, slot, children: [ids], props: [ … ],
                                         guidance: [ … ], rules: [ … ], appliesTo: [ … ] }

Two things this corpus needs that a smaller one does not:

  * **A book is not a file.** The corpus keeps The Key's rules, its fortes, its orders and
    its price tables in separate files, and publishes most of the game's magic on card
    decks that belong to no book at all. BOOKS below is the file → book map, and it is the
    only hand-written list in the build. Every corpus file must be claimed by exactly one
    book or this exits non-zero: that is what stops a file added to the corpus later from
    being silently left out of the site.

  * **Channels.** 8.97 MB is far too much to load per page, so each book is emitted as
    `main` (its entities) and, where it has them, `notes` (its margin notes — 3,532 of them
    across the thirteen books, 2.2 MB, which the character creator must never pay for).
    engine/data.js loads a channel when a tab asks for it.

Every string is carried byte-for-byte from the DSL (only DSL escapes resolved); this file
decides shape alone. verify_data.py then proves the round trip in both directions.

    python3 build/build_data.py [<path to titterpig-dsl-invisiblesun/0.5>]
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_dsl import parse_files  # noqa: E402

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_CORPUS = os.path.expanduser("~/Sortilege/Titterpig/DSL/titterpig-dsl-invisiblesun/0.5")
P = "invisiblesun-0.5-"

# ───────────────────────── the file → book map ─────────────────────────
#
# `title` is the book's own name as the corpus prints it in every ^"Rule" and ^"Margin
# Note" ^"Book" field — that is also how the margin notes are routed to their book. The two
# titles the corpus does not print (the BASE, and the decks, which are card products rather
# than books) are this build's own labels and are declared as such to the gate.
BOOKS = [
    {"id": "base", "title": "Invisible Sun — the core vocabulary", "kind": "base", "ours": True,
     "files": [P + "core-base.ttrpg"]},

    {"id": "key", "title": "The Key", "kind": "core",
     "files": [P + "rules-key.ttrpg", P + "hearts.ttrpg", P + "fortes.ttrpg",
               P + "foundations.ttrpg", P + "orders.ttrpg", P + "soul-allegiances.ttrpg",
               P + "character-arcs.ttrpg", P + "sample-characters.ttrpg",
               P + "goods.ttrpg", P + "currencies.ttrpg"],
     "lore": [P + "fiction.lore"]},

    {"id": "gate", "title": "The Gate", "kind": "core",
     "files": [P + "rules-gate.ttrpg", P + "glossary.ttrpg"]},

    {"id": "way", "title": "The Way", "kind": "core",
     "files": [P + "rules-way.ttrpg", P + "spells.ttrpg", P + "minor-magic.ttrpg",
               P + "secrets.ttrpg", P + "weaver-aggregates.ttrpg",
               P + "goetic-summonings.ttrpg", P + "changes.ttrpg"]},

    {"id": "path", "title": "The Path", "kind": "core",
     "files": [], "lore": [P + "the-path-setting.lore"]},

    {"id": "threshold", "title": "The Threshold", "kind": "sourcebook",
     "files": [P + "the-threshold.ttrpg"]},
    {"id": "vanhauten", "title": "The Van Hauten Collection", "kind": "sourcebook",
     "files": [P + "the-van-hauten-collection.ttrpg"]},
    {"id": "enchiridion", "title": "Enchiridion of the Path", "kind": "sourcebook",
     "files": [P + "enchiridion-of-the-path.ttrpg"]},
    {"id": "bookm", "title": "Book M", "kind": "sourcebook",
     "files": [P + "book-m.ttrpg"]},
    {"id": "teratology", "title": "Teratology", "kind": "sourcebook",
     "files": [P + "teratology.ttrpg"]},
    {"id": "nightside", "title": "The Nightside", "kind": "sourcebook",
     "files": [P + "the-nightside.ttrpg"]},
    {"id": "wellspring", "title": "The Wellspring", "kind": "sourcebook",
     "files": [P + "the-wellspring.ttrpg"]},
    {"id": "silentstreets", "title": "Secrets of Silent Streets", "kind": "sourcebook",
     "files": [P + "secrets-of-silent-streets.ttrpg"]},
    {"id": "webegin", "title": "We Begin at the End", "kind": "sourcebook",
     "files": [P + "we-begin-at-the-end.ttrpg"]},

    # Most of Invisible Sun's magic is printed on cards and only indexed in the books, so
    # the decks are where the spells, ephemera, incantations and objects actually live.
    {"id": "decks", "title": "The card decks", "kind": "decks", "ours": True,
     "files": [P + "spells-general-index.ttrpg", P + "spells-vance-index.ttrpg",
               P + "objects-index.ttrpg", P + "incantations-index.ttrpg",
               P + "ephemera.ttrpg", P + "sooth-deck.ttrpg", P + "book-m-cards.ttrpg",
               P + "the-nightside-cards.ttrpg", P + "the-wellspring-cards.ttrpg"]},
]

# The one file that belongs to every book at once: each note carries the book it is
# printed in, and is emitted on that book's `notes` channel.
NOTES_FILE = P + "margin-notes.ttrpg"

# Book kinds this build writes (the corpus has no word for them).
KINDS = {b["kind"] for b in BOOKS}


# ───────────────────────── AST accessors ─────────────────────────

def kws(body, name):
    return [x for x in (body or []) if x.get("n") == "kw" and x["kw"] == name]


def kw1(body, name):
    got = kws(body, name)
    return got[0] if got else None


def arg(node, kind):
    return next((a["v"] for a in (node or {}).get("args", []) if a["k"] == kind), None)


def arglist(node):
    return next((a["v"] for a in (node or {}).get("args", []) if a["k"] == "list"), []) or []


def prop_nodes(body):
    """A DEF's properties: the PROPERTIES block's rows, plus any row written directly in
    the body (a nested ability writes `^"Level" INTEGER 2` with no PROPERTIES around it)."""
    out = [p for p in (body or []) if p.get("n") == "prop"]
    for b in kws(body, "PROPERTIES"):
        out.extend(p for p in (b.get("body") or []) if p.get("n") == "prop")
    return out


def elem_ref(e):
    if e.get("k") == "ref":
        return {"hash": e["hash"], "name": e["v"]}
    if e.get("k") == "hash":
        return {"hash": e["v"], "name": None}
    if e.get("k") == "caret":
        return {"hash": None, "name": e["v"]}
    return None


def elem_value(e):
    if e.get("k") == "def":
        return {"vk": "def", "fields": [prop_value(p) for p in prop_nodes(e.get("body"))]}
    if e.get("k") in ("ref", "hash", "caret"):
        return dict(vk="ref", **elem_ref(e))
    return {"vk": "scalar", "value": e["v"]}


def prop_value(p):
    v = {"name": p["name"]}
    t = p.get("type")
    if t == "DEF":
        v["vk"] = "def"
        ext = kw1(p.get("body"), "EXTENDS")
        if ext:
            v["type"] = arg(ext, "caret")
            v["typeHash"] = arg(ext, "hash")
        v["fields"] = [prop_value(x) for x in prop_nodes(p.get("body"))]
        return v
    if t == "LIST":
        v["vk"] = "list"
        if p.get("of"):
            v["of"] = p["of"]
        if p.get("of_hash"):
            v["ofHash"] = p["of_hash"]
        v["items"] = [elem_value(e) for e in p.get("items", [])]
        return v
    if t == "ENUM":
        # a declaration lists its options; an instance names one
        v["vk"] = "enum"
        if "options" in p:
            v["options"] = p["options"]
        if "value" in p:
            v["value"] = p["value"]
        return v
    if t == "REF":
        v["vk"] = "ref"
        v["ref"] = {"hash": p.get("hash"), "name": p.get("ref")}
        return v
    v["vk"] = "scalar"
    if t and t != "VALUE":
        v["type"] = t
    if "value" in p:
        v["value"] = p["value"]
    for m in ("min", "max", "required", "fixed"):
        if m in p:
            v[m] = p[m]
    return v


def flat(pv):
    if pv.get("vk") == "scalar":
        return pv.get("value")
    if pv.get("vk") == "enum":
        return pv.get("value")
    if pv.get("vk") == "ref":
        return (pv.get("ref") or {}).get("name")
    return None


def guidance_of(body):
    """§22 GUIDANCE: prose about a rule (chiefly the books' sidebars), sitting beside what
    it CONCERNS rather than inside it."""
    out = []
    for gb in kws(body, "GUIDANCE"):
        for e in kws(gb.get("body"), "ENTRY"):
            out.append({
                "name": arg(e, "caret"),
                "id": arg(e, "hash"),
                "concerns": [r for r in (elem_ref(x) for x in arglist(kw1(e.get("body"), "CONCERNS"))) if r],
                "text": arg(kw1(e.get("body"), "TEXT"), "str"),
            })
    return out


def rules_of(body):
    """§11 RULES: one WHEN/THEN line per rule, verbatim (see parse_dsl.lift_rule_lines)."""
    out = []
    for rb in kws(body, "RULES"):
        for r in (rb.get("body") or []):
            if r.get("n") == "rule":
                out.append({"id": r["hash"], "text": r["text"]})
    return out


def applies_to(body):
    ap = kw1(body, "APPLIES")
    return [r for r in (elem_ref(x) for x in arglist(ap)) if r] if ap else []


# ───────────────────────── entities ─────────────────────────

def entity_record(e, doc, book, parent_id=None, slot=None):
    body = e["body"]
    props = [prop_value(p) for p in prop_nodes(body)]
    pm = {p["name"]: p for p in props}
    ext = kw1(body, "EXTENDS")
    display = flat(pm["Name"]) if "Name" in pm else None
    rec = {
        "id": e["hash"],
        "name": display or e["name"],
        "key": e["name"],
        "form": e.get("kind") or "DEF",
        "book": book,
        "file": doc["file"],
        "type": arg(ext, "caret") if ext else None,
        "typeHash": arg(ext, "hash") if ext else None,
        "parent": parent_id,
        "slot": slot,                      # the keyword block it was nested in (ABILITIES, DEGREES…)
        "children": [],
        "props": props,
        "guidance": guidance_of(body),
        "rules": rules_of(body),
        "appliesTo": applies_to(body),
    }
    return rec


def collect_entities(doc, book, out, body=None, parent=None, slot=None):
    """Every hashed entity anywhere in the tree — nested directly or inside a keyword block
    (an order's DEGREES, a degree's ABILITIES, the Apostate's APOSTATE_ABILITIES) — keyed by
    hash, with `parent` the nearest enclosing entity and `slot` the block it sat in."""
    ids = []
    for e in (body if body is not None else doc["body"]):
        if e.get("n") == "entity":
            rec = entity_record(e, doc, book, parent["id"] if parent else None, slot)
            if rec["id"] in out:
                raise SystemExit("duplicate entity hash %s (%s and %s)" % (rec["id"], out[rec["id"]]["file"], doc["file"]))
            out[rec["id"]] = rec
            ids.append(rec["id"])
            if parent:
                parent["children"].append(rec["id"])
            collect_entities(doc, book, out, e["body"], rec, None)
        elif e.get("n") == "kw" and e.get("body"):
            ids.extend(collect_entities(doc, book, out, e["body"], parent, e["kw"]))
    return ids


# ───────────────────────── lore ─────────────────────────

def build_lore(path):
    """A .lore file is Markdown and stays Markdown: headings become sections, the prose
    under each is carried as paragraphs, verbatim."""
    text = open(path, encoding="utf-8").read()
    sections, cur = [], None
    para = []

    def flush():
        if para:
            cur["paras"].append("\n".join(para))
            del para[:]

    for line in text.split("\n"):
        s = line.rstrip()
        m = re.match(r"^(#{1,6})\s+(.*)$", s)
        if m:
            if cur:
                flush()
                sections.append(cur)
            cur = {"level": len(m.group(1)), "title": m.group(2).strip(), "paras": []}
            continue
        if cur is None:
            cur = {"level": 0, "title": None, "paras": []}
        if not s.strip():
            flush()
        else:
            para.append(s)
    if cur:
        flush()
        sections.append(cur)
    return {"file": os.path.basename(path), "sections": sections}


# ───────────────────────── emit ─────────────────────────

BANNER = ("/* Generated by build/build_data.py from %s — do not edit by hand.\n"
          "   Every string is verbatim from the DSL corpus; regenerate rather than patch. */\n")

REGISTER = """(function(){var d=%s;var T=window.INVISIBLESUN=window.INVISIBLESUN||{books:{},entities:{},loaded:{}};
T.loaded[d.src]=true;
var b=T.books[d.book.id]||(T.books[d.book.id]={id:d.book.id});
for(var k in d.book){if(k==='id')continue;var v=d.book[k];b[k]=(Array.isArray(v)&&Array.isArray(b[k]))?b[k].concat(v):v;}
for(var h in d.entities){T.entities[h]=d.entities[h];}})();
"""


def write_js(path, corpus, payload):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(BANNER % corpus)
        fh.write(REGISTER % json.dumps(payload, ensure_ascii=False, sort_keys=True))


def main():
    corpus = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CORPUS
    data_dir = os.path.join(HERE, "data")
    os.makedirs(data_dir, exist_ok=True)

    # every corpus file claimed exactly once
    on_disk = {fn for fn in os.listdir(corpus) if fn.endswith((".ttrpg", ".lore"))}
    claimed = {}
    for b in BOOKS:
        for fn in b["files"] + b.get("lore", []):
            if fn in claimed:
                raise SystemExit("build_data: %s is claimed by both %s and %s" % (fn, claimed[fn], b["id"]))
            claimed[fn] = b["id"]
    claimed[NOTES_FILE] = "(margin notes, split by the book each is printed in)"
    missing = sorted(on_disk - set(claimed))
    stale = sorted(set(claimed) - on_disk)
    if missing or stale:
        raise SystemExit("build_data: the file → book map is out of step with the corpus.\n"
                         "  in the corpus, claimed by no book: %s\n"
                         "  claimed but not in the corpus: %s" % (missing or "none", stale or "none"))

    for fn in sorted(os.listdir(data_dir)):
        if fn.endswith(".js"):
            os.remove(os.path.join(data_dir, fn))

    entities = {}
    books_out = []
    index_books = []

    # ── the books ──
    for b in BOOKS:
        docs = parse_files([os.path.join(corpus, f) for f in b["files"]])
        roots = []
        files = []
        for doc in docs:
            ids = collect_entities(doc, b["id"], entities)
            roots.extend(ids)
            files.append({"file": doc["file"], "name": arg(kw1(doc["body"], "NAME"), "str")})
        lore = [build_lore(os.path.join(corpus, f)) for f in b.get("lore", [])]
        rec = {"id": b["id"], "title": b["title"], "kind": b["kind"],
               "files": files, "entities": roots, "lore": lore}
        books_out.append((b, rec))
        index_books.append({"id": b["id"], "title": b["title"], "kind": b["kind"],
                            "files": {"main": ["data/%s.js" % b["id"]]},
                            "counts": {"entities": len(roots)}})

    # ── the margin notes, routed to the book each is printed in ──
    notes_doc = parse_files([os.path.join(corpus, NOTES_FILE)])[0]
    note_entities = {}
    note_ids = collect_entities(notes_doc, None, note_entities)
    by_title = {b["title"]: b["id"] for b in BOOKS}
    notes_by_book = {}
    for nid in note_ids:
        rec = note_entities[nid]
        title = next((flat(p) for p in rec["props"] if p["name"] == "Book"), None)
        bid = by_title.get(title)
        if not bid:
            raise SystemExit("build_data: margin note %s names book %r, which no book claims" % (nid, title))
        rec["book"] = bid
        notes_by_book.setdefault(bid, []).append(nid)

    # ── write ──
    total_entities = 0
    for b, rec in books_out:
        payload = {"src": "data/%s.js" % b["id"], "book": rec,
                   "entities": {h: e for h, e in entities.items() if e["book"] == b["id"]}}
        total_entities += len(payload["entities"])
        write_js(os.path.join(data_dir, "%s.js" % b["id"]), corpus, payload)

        ids = notes_by_book.get(b["id"], [])
        if not ids:
            continue
        src = "data/%s.notes.js" % b["id"]
        # the notes file is one of this book's sources, so it belongs in the book's file
        # list like any other (the register concatenates arrays across channels)
        notes_file = {"file": notes_doc["file"], "name": arg(kw1(notes_doc["body"], "NAME"), "str")}
        write_js(os.path.join(data_dir, "%s.notes.js" % b["id"]), corpus,
                 {"src": src, "book": {"id": b["id"], "notes": ids, "files": [notes_file]},
                  "entities": {h: note_entities[h] for h in ids}})
        idx = next(x for x in index_books if x["id"] == b["id"])
        idx["files"]["notes"] = [src]
        idx["counts"]["notes"] = len(ids)

    index = {"system": "invisiblesun", "corpus": corpus, "books": index_books,
             "counts": {"books": len(index_books), "entities": total_entities,
                        "notes": sum(len(v) for v in notes_by_book.values()),
                        "files": len(on_disk)}}
    with open(os.path.join(data_dir, "index.js"), "w", encoding="utf-8") as fh:
        fh.write(BANNER % corpus)
        fh.write("(function(){var T=window.INVISIBLESUN=window.INVISIBLESUN||{books:{},entities:{},loaded:{}};"
                 "T.index=%s;})();\n" % json.dumps(index, ensure_ascii=False, sort_keys=True))

    print("build_data: %d corpus files → %d books, %d entities + %d margin notes"
          % (len(on_disk), len(index_books), total_entities, index["counts"]["notes"]))
    for x in index_books:
        print("  %-14s %-34s %6d entities%s" % (
            x["id"], x["title"], x["counts"]["entities"],
            "  + %5d notes" % x["counts"]["notes"] if "notes" in x["counts"] else ""))


if __name__ == "__main__":
    main()
