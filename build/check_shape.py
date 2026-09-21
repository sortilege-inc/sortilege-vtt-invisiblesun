#!/usr/bin/env python3
"""
check_shape.py — the gate verify_data.py cannot be.

verify_data proves every string round-trips. It does NOT prove a string landed on the
right field: while this build was being written, `^"Level" ENUM "subsection"` parsed as a
property with no value plus a loose string, so all 3,726 rule levels were present in the
data and attached to nothing. Every string still round-tripped.

So this asserts the SHAPES the site reads, against counts taken from the corpus itself.
It is deliberately specific: if a parser or build change displaces a field, this says which.

    python3 build/check_shape.py [<path to titterpig-dsl-invisiblesun/0.5>]
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_data import DEFAULT_CORPUS  # noqa: E402
from verify_data import BLOB, INDEX_BLOB, HERE  # noqa: E402

FAILS = []


def check(label, got, want):
    ok = got == want
    print("  %-58s %s%s" % (label, got, "" if ok else "   EXPECTED %s  ← FAIL" % (want,)))
    if not ok:
        FAILS.append(label)


def load():
    ents, books, index = {}, {}, None
    for fn in sorted(os.listdir(os.path.join(HERE, "data"))):
        if not fn.endswith(".js"):
            continue
        src = open(os.path.join(HERE, "data", fn), encoding="utf-8").read()
        m = BLOB.search(src)
        if m:
            d = json.loads(m.group(1))
            ents.update(d["entities"])
            b = books.setdefault(d["book"]["id"], {})
            for k, v in d["book"].items():
                b[k] = b[k] + v if isinstance(v, list) and isinstance(b.get(k), list) else v
        else:
            index = json.loads(INDEX_BLOB.search(src).group(1))
    return ents, books, index


def grep_count(corpus, pattern, fn):
    """How many times the corpus itself writes something — the source's own count, not ours."""
    out = subprocess.run(["grep", "-c", pattern, os.path.join(corpus, fn)],
                         capture_output=True, text=True)
    return int(out.stdout.strip() or 0)


def prop(e, name):
    return next((p for p in e["props"] if p["name"] == name), None)


def val(e, name):
    p = prop(e, name)
    return None if p is None else p.get("value")


def main():
    corpus = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CORPUS
    ents, books, index = load()
    by_type = {}
    for e in ents.values():
        by_type.setdefault(e["type"], []).append(e)

    print("check_shape: the fields the site reads, against the corpus's own counts")

    # ── every typed entity the corpus declares reaches the data with its type ──
    P = "invisiblesun-0.5-"
    for type_name, fn in [("Rule", "rules-key.ttrpg"), ("Forte", "fortes.ttrpg"),
                          ("Forte Ability", "fortes.ttrpg"), ("Order", "orders.ttrpg"),
                          ("Order Degree", "orders.ttrpg"), ("Order Ability", "orders.ttrpg"),
                          ("Heart", "hearts.ttrpg"), ("Foundation", "foundations.ttrpg"),
                          ("Soul Allegiance", "soul-allegiances.ttrpg"),
                          ("Character Arc", "character-arcs.ttrpg"),
                          ("Margin Note", "margin-notes.ttrpg"),
                          ("Glossary Entry", "glossary.ttrpg"), ("Sooth Card", "sooth-deck.ttrpg")]:
        want = grep_count(corpus, '^\\s*EXTENDS #[A-Za-z0-9]* \\^"%s"$' % re.escape(type_name), P + fn)
        got = len([e for e in by_type.get(type_name, []) if e["file"] == P + fn])
        check("%s entities from %s" % (type_name, fn), got, want)

    # ── a rule carries the fields the reader builds its tree from ──
    rules = by_type.get("Rule", [])
    check("rules with a Book", len([e for e in rules if val(e, "Book")]), len(rules))
    check("rules with a Page", len([e for e in rules if val(e, "Page") is not None]), len(rules))
    with_level = grep_count(corpus, '^\\s*\\^"Level" ENUM "', P + "rules-key.ttrpg")
    check("The Key's rules with a Level value",
          len([e for e in rules if e["file"] == P + "rules-key.ttrpg" and val(e, "Level")]), with_level)
    levels = {val(e, "Level") for e in rules if val(e, "Level")}
    check("the level names are the spec's five",
          sorted(levels), ["chapter", "section", "sidebar", "sub", "subsection"])

    # ── a margin note is meaningless without its colour and its position ──
    notes = by_type.get("Margin Note", [])
    check("margin notes with a Colour", len([e for e in notes if val(e, "Colour")]), len(notes))
    check("margin notes with a Position", len([e for e in notes if val(e, "Position") is not None]), len(notes))
    check("margin notes with a Kind", len([e for e in notes if val(e, "Kind")]), len(notes))
    check("the kinds are the two the corpus declares",
          sorted({val(e, "Kind") for e in notes}), ["cross-reference", "prose"])
    check("every note routed to a book", len([e for e in notes if e["book"] in books]), len(notes))

    # ── the nesting the sheet walks: an order's degrees, a degree's abilities ──
    vance = next((e for e in by_type.get("Order", []) if e["name"] == "Vance"), None)
    check("the Order of the Vance is in the data", bool(vance), True)
    if vance:
        degrees = [ents[c] for c in vance["children"] if ents[c]["type"] == "Order Degree"]
        check("the Vance's degrees", len(degrees), 6)
        check("they sit in the DEGREES block", sorted({d["slot"] for d in degrees}), ["DEGREES"])
        first = next((d for d in degrees if val(d, "Degree") == 1), None)
        check("the 1st degree carries its title", first and val(first, "Title"), "Postulant")
        abilities = [ents[c] for c in (first or {}).get("children", [])]
        check("the 1st degree's abilities", len(abilities), 6)
        check("they sit in the ABILITIES block", sorted({a["slot"] for a in abilities}), ["ABILITIES"])

    orb = next((e for e in by_type.get("Forte", []) if e["name"] == "Bears an Orb"), None)
    check("Bears an Orb is in the data", bool(orb), True)
    if orb:
        abil = [ents[c] for c in orb["children"]]
        check("its forte abilities", len(abil), 9)
        check("each carries a level", len([a for a in abil if val(a, "Level") is not None]), len(abil))
        check("each carries a sun", len([a for a in abil if val(a, "Color")]), len(abil))

    # ── the forte paths: the site draws its tree from these and nothing else ──
    # A displaced ^"Follows" would not lose a string, so verify_data cannot see it; the tree
    # would simply come out flat. Counted against the corpus's own ^"Follows" lines.
    follows = [p for e in ents.values() for p in e.get("props", []) if p["name"] == "Follows"]
    # the BASE declares the field once with no body; every other site is an instance with edges
    decl = [p for p in follows if not p.get("items")]
    check("the BASE declares ^\"Follows\" once, with no edges", len(decl),
          grep_count(corpus, '^ *\\^"Follows" LIST OF [^[]*$', P + "core-base.ttrpg"))
    inst = [p for p in follows if p.get("items")]
    check("abilities that follow another", len(inst),
          sum(grep_count(corpus, '^ *\\^"Follows" LIST OF .*\\[', P + fn)
              for fn in ("fortes.ttrpg",)))
    check("the edges they carry", sum(len(p["items"]) for p in inst),
          sum(len(re.findall(r'#[A-Za-z0-9]+ \^"[^"]+"',
                             re.search(r'\[(.*)\]', line).group(1)))
              for line in open(os.path.join(corpus, P + "fortes.ttrpg"), encoding="utf-8")
              if re.match(r'\s*\^"Follows" LIST OF .*\[', line)))
    fortes = by_type.get("Forte", [])
    check("every forte has a path", len([f for f in fortes if any(
        any(p["name"] == "Follows" for p in ents[c].get("props", [])) for c in f["children"])]),
        len(fortes))
    roots = {f["name"]: len([c for c in f["children"]
                             if not any(p["name"] == "Follows" for p in ents[c].get("props", []))])
             for f in fortes}
    check("each path starts from one or two abilities", sorted(set(roots.values())), [1, 2])

    # ── the character sheet's own type ──
    vislae = next((e for e in ents.values() if e["form"] == "ACTOR"), None)
    check("the Vislae ACTOR is in the data", bool(vislae and vislae["name"] == "Vislae"), True)
    if vislae:
        pools = prop(vislae, "Pools")
        check("its Pools is a DEF with the eight pools", len((pools or {}).get("fields", [])), 8)
        check("it declares the six fingers",
              len([n for n in ("Order", "Heart", "Forte", "Soul Allegiance", "Foundation", "Character Arcs")
                   if prop(vislae, n)]), 6)
        check("its RULES lines are carried", len(vislae["rules"]), 3)
        check("a rule line is verbatim", vislae["rules"][1]["text"].startswith(
            'WHEN [^"Vislae" spends a bene from a ^"Stat Pool"] THEN add +1'), True)

    # ── sidebars, prose, and the index ──
    guidance = sum(len(e["guidance"]) for e in ents.values())
    check("GUIDANCE entries (the books' sidebars)", guidance,
          sum(grep_count(corpus, "^ *ENTRY ", fn) for fn in sorted(os.listdir(corpus)) if fn.endswith(".ttrpg")))
    check("every guidance entry has its text",
          len([g for e in ents.values() for g in e["guidance"] if g["text"]]), guidance)
    path = books.get("path", {})
    check("The Path's lore sections", len(path.get("lore", [{}])[0].get("sections", [])) > 200, True)
    check("books in the index", len(index["books"]), 15)
    check("the index counts every corpus file", index["counts"]["files"],
          len([f for f in os.listdir(corpus) if f.endswith((".ttrpg", ".lore"))]))

    print("check_shape: %s" % ("OK" if not FAILS else "%d FAILED — %s" % (len(FAILS), "; ".join(FAILS))))
    return 1 if FAILS else 0


if __name__ == "__main__":
    sys.exit(main())
