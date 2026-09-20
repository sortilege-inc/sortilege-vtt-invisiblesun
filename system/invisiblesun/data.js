// system/invisiblesun/data.js — accessors over the generated corpus (window.INVISIBLESUN
// from data/*.js). This is the only file that knows the data's shape; the reader, the
// sheet and the creator ask here.
//
// The one thing worth saying about this corpus: a book's structure is not nesting, it is
// FIELDS. Every rule is a flat ^"Rule" entity carrying Book, Page, Chapter, Section and a
// Level (chapter · section · subsection · sub · sidebar), emitted in printed order — so
// the outline is rebuilt from the level ladder over that order, exactly the way the page
// reads. A margin note is a separate entity that names the page it is printed on.
window.IsData = (function () {
  const EMPTY = { books: {}, entities: {}, loaded: {}, index: { books: [] } };
  const T = () => window.INVISIBLESUN || EMPTY;

  // The ladder the printed page walks down. A sidebar is set beside the text at the depth
  // it interrupts, so it takes the same depth as a sub.
  const DEPTH = { chapter: 0, section: 1, subsection: 2, sub: 3, sidebar: 3 };

  const index = () => T().index || { books: [] };
  const books = () => (index().books || []).slice();
  const book = (id) => T().books[id] || null;
  const indexBook = (id) => (index().books || []).find((b) => b.id === id) || null;
  const entity = (id) => T().entities[id] || null;

  function children(id) {
    const e = entity(id);
    return e ? e.children.map(entity).filter(Boolean) : [];
  }

  // Every entity of a book, top level first, then nested, in printed order.
  function all(bookIds) {
    const ids = bookIds && bookIds.length ? bookIds : Object.keys(T().books);
    const out = [];
    ids.forEach((bid) => {
      const b = book(bid);
      if (!b) return;
      const stack = (b.entities || []).slice();
      while (stack.length) {
        const e = entity(stack.shift());
        if (!e) continue;
        out.push(e);
        stack.unshift.apply(stack, e.children);
      }
    });
    return out;
  }

  const top = (bid) => ((book(bid) || {}).entities || []).map(entity).filter(Boolean);

  // Every entity of one type across a set of books. Indexed once per set of books, and
  // thrown away when another book is loaded, because that set has changed.
  const typeIndex = {};
  let indexedFor = '';
  function byType(type, bookIds) {
    const key = (bookIds || []).join(',') + '|' + Object.keys(T().loaded || {}).length;
    if (indexedFor !== key) {
      for (const k in typeIndex) delete typeIndex[k];
      all(bookIds).forEach((e) => {
        if (!e.type) return;
        (typeIndex[e.type] = typeIndex[e.type] || []).push(e);
      });
      indexedFor = key;
    }
    return (typeIndex[type] || []).slice();
  }

  function prop(e, name) {
    return e && (e.props || []).find((p) => p.name === name) || null;
  }

  function val(e, name) {
    const p = prop(e, name);
    if (!p) return undefined;
    if (p.vk === 'scalar' || p.vk === 'enum') return p.value;
    if (p.vk === 'ref') return p.ref;
    if (p.vk === 'list') return p.items;
    return p;
  }

  const text = (e, name) => {
    const v = val(e, name);
    return typeof v === 'string' ? v : null;
  };

  // ── a book's outline ───────────────────────────────────────────────
  // Chapters come from the rules' own ^"Chapter" field, and everything under a chapter
  // nests by the level ladder in printed order.
  //
  // Why not nest by level alone: thirteen chapters across five books have a Chapter value
  // and NO chapter-level unit — The Key's *Characters*, Teratology's six suns, Book M's
  // six — because those chapters open on a page whose title is art rather than text. A
  // pure level ladder then hangs *Step 1: Choose an Order* under the previous chapter,
  // which is not where the book puts it. Grouping by the field is safe: no chapter in any
  // book is interleaved with another (checked over all twelve books that carry rules).
  //
  // A rule with no Chapter of its own belongs to the chapter it is printed inside — a
  // sidebar carries no chapter field but sits on a chapter's page. Only the rules printed
  // before any chapter begins (a book's contents pages) stand outside them.
  function outline(bid) {
    const roots = [];
    const chapters = {};
    let current = null;
    let stack = [];

    top(bid).filter((e) => e.type === 'Rule').forEach((e) => {
      const level = val(e, 'Level');
      const chapter = val(e, 'Chapter') || current;
      const depth = DEPTH[level] != null ? DEPTH[level] : 2;

      if (chapter && chapter !== current) {
        current = chapter;
        // the chapter's own unit when the book prints one, else the field as the label
        // A chapter is labelled with the corpus's ^"Chapter" value, not with the
        // entity's name: where two books print a heading of the same name the corpus
        // disambiguates the entity ("Characters (The Key p13)"), and the chapter is
        // still called Characters.
        const node = level === 'chapter'
          ? { id: e.id, entity: e, label: chapter, depth: 0, kids: [] }
          : { id: 'ch:' + chapter, entity: null, label: chapter, depth: 0, kids: [] };
        chapters[chapter] = node;
        roots.push(node);
        stack = [node];
        if (level === 'chapter') return;              // the chapter unit IS the node
      } else if (chapter && level === 'chapter' && chapters[chapter] && !chapters[chapter].entity) {
        // the chapter's own unit turns up after something printed above it
        chapters[chapter].entity = e;
        chapters[chapter].id = e.id;
        chapters[chapter].label = chapter;
        return;
      }

      const node = { id: e.id, entity: e, label: e.name, depth, kids: [] };
      while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
      if (stack.length) stack[stack.length - 1].kids.push(node);
      else roots.push(node);
      stack.push(node);
    });
    return roots;
  }

  const outlineIndex = {};
  function node(bid, id) {
    if (!outlineIndex[bid]) {
      const map = {};
      (function walk(ns, parent) {
        ns.forEach((n) => {
          n.parent = parent;
          map[n.id] = n;
          walk(n.kids, n);
        });
      })(outline(bid), null);
      outlineIndex[bid] = map;
    }
    return outlineIndex[bid][id] || null;
  }

  function trail(bid, id) {
    const out = [];
    let n = node(bid, id);
    while (n) {
      out.unshift(n);
      n = n.parent;
    }
    return out;
  }

  // Everything in a book that is not a rule, grouped by the type the corpus gives it:
  // The Key's fortes and price tables, The Gate's glossary, the decks' cards.
  function collections(bid) {
    const groups = {};
    top(bid).forEach((e) => {
      if (e.type === 'Rule' || e.type === 'Margin Note') return;
      // the BASE's own entities declare the vocabulary and EXTEND nothing; they are
      // grouped by what they are rather than by a type they do not have
      const group = e.type || (e.form === 'ACTOR' ? 'Actor' : 'Type declarations');
      (groups[group] = groups[group] || []).push(e);
    });
    return Object.keys(groups).sort().map((type) => ({ type, items: groups[type] }));
  }

  // ── the margin channel ─────────────────────────────────────────────
  // A note belongs to the page it is printed on, and its order down the channel is its
  // printed y. Colour is the link to the body terms it was set beside; it is the corpus's
  // own value and is never chosen here.
  const noteCache = {};
  function notesByPage(bid) {
    if (noteCache[bid]) return noteCache[bid];
    const map = {};
    ((book(bid) || {}).notes || []).forEach((id) => {
      const e = entity(id);
      if (!e) return;
      (map[val(e, 'Page')] = map[val(e, 'Page')] || []).push(e);
    });
    Object.keys(map).forEach((p) => map[p].sort((a, b) => (val(a, 'Position') || 0) - (val(b, 'Position') || 0)));
    noteCache[bid] = map;
    return map;
  }

  function notesFor(bid, page) {
    return page == null ? [] : (notesByPage(bid)[page] || []);
  }

  const hasNotes = (bid) => !!((indexBook(bid) || {}).files || {}).notes;

  // ── search ─────────────────────────────────────────────────────────
  function searchText(e) {
    const parts = [e.name];
    (e.props || []).forEach((p) => {
      if ((p.vk === 'scalar' || p.vk === 'enum') && typeof p.value === 'string') parts.push(p.value);
      if (p.vk === 'list') (p.items || []).forEach((it) => it.vk === 'scalar' && parts.push(String(it.value)));
      if (p.vk === 'def') (p.fields || []).forEach((f) => f.value != null && parts.push(String(f.value)));
    });
    (e.guidance || []).forEach((g) => parts.push(g.text || ''));
    (e.rules || []).forEach((r) => parts.push(r.text || ''));
    return parts.join('\n');
  }

  const cache = new Map();
  function search(query, bookIds, limit) {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return [];
    const hits = [];
    all(bookIds).forEach((e) => {
      let t = cache.get(e.id);
      if (t === undefined) {
        t = searchText(e).toLowerCase();
        cache.set(e.id, t);
      }
      const inName = e.name.toLowerCase().indexOf(q) !== -1;
      if (inName || t.indexOf(q) !== -1) hits.push({ e, score: inName ? 0 : 1 });
    });
    hits.sort((a, b) => a.score - b.score || a.e.name.localeCompare(b.e.name));
    return hits.slice(0, limit || 200).map((h) => h.e);
  }

  // Where a string was found, with enough either side to read it.
  function excerpt(e, query, n) {
    const t = searchText(e);
    const i = t.toLowerCase().indexOf(String(query).toLowerCase());
    if (i < 0) return null;
    const a = Math.max(0, i - (n || 60));
    const b = Math.min(t.length, i + String(query).length + (n || 60));
    return (a ? '…' : '') + t.slice(a, b).replace(/\n+/g, ' ') + (b < t.length ? '…' : '');
  }

  return {
    T, index, books, book, indexBook, entity, children, all, top, prop, val, text,
    outline, node, trail, collections, byType, notesFor, notesByPage, hasNotes, search, excerpt, DEPTH,
  };
})();
