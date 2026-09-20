// system/invisiblesun/site.js — what Invisible Sun puts on the site: the books as a
// reader, the sample vislae, and the character creator. Every word shown comes from
// titterpig-dsl-invisiblesun/0.5 through data/; this file decides only what is listed
// where, and pays for a book's data when a reader asks for it.
//
// The vislae sheet is M3 and the creator M4; their tabs hold a placeholder until then.
window.VttSiteTabs = (function () {
  const { el, paragraphs, debounce } = window.VttRender;
  const Data = window.VttData;          // the loader (engine): which files a book costs
  const D = window.IsData;              // the corpus (system): what is in them
  const E = window.IsEntity;
  const Site = () => window.VttSite;

  function soon(container, what) {
    container.appendChild(el('div', { class: 'page' }, [
      el('h2', {}, [what.title]),
      el('p', { class: 'muted' }, [what.note]),
    ]));
  }

  // a link inside any rendered entity opens that entity in the reader
  window.IsOpenEntity = (id) => {
    const e = D.entity(id);
    if (e) Site().go('books', [e.book, id]);
  };

  // ── the shelf ──────────────────────────────────────────────────────
  const GROUPS = [
    { kind: 'core', label: 'The four core books' },
    { kind: 'sourcebook', label: 'The sourcebooks' },
    { kind: 'decks', label: 'The cards' },
    { kind: 'base', label: 'Under the hood' },
  ];

  function renderShelf(container, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    const idx = D.index();
    page.appendChild(el('h2', {}, ['The books']));
    page.appendChild(el('p', { class: 'muted' }, [
      'Everything here is generated from the Invisible Sun corpus: ',
      String(idx.counts.entities), ' entities and ', String(idx.counts.notes),
      ' margin notes out of ', String(idx.counts.files), ' files. Open a book and its text is fetched then.',
    ]));
    GROUPS.forEach((g) => {
      const rows = Data.books().filter((b) => b.kind === g.kind);
      if (!rows.length) return;
      page.appendChild(el('h4', {}, [g.label]));
      page.appendChild(el('div', { class: 'shelf' }, rows.map((b) => el('a', {
        class: 'shelf-book', href: ctx.href('books', [b.id]),
      }, [
        el('div', { class: 'shelf-title' }, [b.title]),
        el('div', { class: 'muted small' }, [
          [b.counts.entities ? b.counts.entities + ' entries' : null,
            b.counts.notes ? b.counts.notes + ' margin notes' : null].filter(Boolean).join(' · ') || 'prose',
        ]),
      ]))));
    });
  }

  // ── the outline ────────────────────────────────────────────────────
  function outlineTree(bid, nodes, openId, ctx) {
    return el('ul', { class: 'toc' }, nodes.map((n) => {
      const open = openId && (n.id === openId || contains(n, openId));
      return el('li', {}, [
        n.kids.length
          ? el('details', { open: open || null }, [
            el('summary', {}, [el('a', {
              class: 'ref' + (n.id === openId ? ' active' : ''),
              href: ctx.href('books', [bid, n.id]),
            }, [n.label])]),
            outlineTree(bid, n.kids, openId, ctx),
          ])
          : el('a', {
            class: 'ref' + (n.id === openId ? ' active' : ''),
            href: ctx.href('books', [bid, n.id]),
          }, [n.label]),
      ]);
    }));
  }

  function contains(n, id) {
    return n.kids.some((k) => k.id === id || contains(k, id));
  }

  // ── a page of a book: the text, its sidebars, and its margin notes ──
  function readingPage(bid, n, ctx) {
    const e = n.entity;
    const wrap = el('div', {});
    const t = D.trail(bid, n.id);
    if (t.length > 1) {
      wrap.appendChild(el('div', { class: 'crumbs' }, t.slice(0, -1).map((n, i) => [
        i ? ' › ' : null,
        el('a', { href: ctx.href('books', [bid, n.id]) }, [n.label]),
      ])));
    }
    wrap.appendChild(el('h2', {}, [n.label]));
    if (!e) {
      // The chapter opens on a page whose title is art, so the corpus has no unit for it;
      // the field names it and what is printed under it stands as its contents.
      wrap.appendChild(el('p', { class: 'muted small' }, ['This chapter opens on a page the book sets as art; what follows is printed under it.']));
      wrap.appendChild(contentsOf(bid, n, ctx));
      return wrap;
    }
    const notes = D.notesFor(bid, D.val(e, 'Page'));
    wrap.appendChild(el('div', { class: 'reading' }, [
      el('div', {}, [
        E.render(e, { bare: true, noKids: e.type === 'Rule' }),
        contentsOf(bid, n, ctx),
      ]),
      el('div', { class: 'notes' }, notes.length ? [
        el('h4', {}, ['In the margin, page ' + D.val(e, 'Page')]),
        notes.map((n) => noteEl(n)),
      ] : [el('div', { class: 'muted small' }, ['No margin notes on this page.'])]),
    ]));
    return wrap;
  }

  // A margin note, set in the ink the book prints it in — the colour is the corpus's own
  // value, and it is the link between the note and the body terms it was set beside.
  function noteEl(n) {
    const colour = D.val(n, 'Colour');
    const refTo = D.val(n, 'Refers To');
    const refPage = D.val(n, 'Refers To Page');
    return el('div', { class: 'note', style: colour ? 'color:' + colour : null }, [
      paragraphs(D.text(n, 'Text'), 'prose'),
      refTo ? el('div', { class: 'note-ref' }, ['→ ', refTo, refPage != null ? ', page ' + refPage : '']) : null,
      D.text(n, 'Beside') ? el('div', { class: 'note-ref muted' }, ['beside: ', D.text(n, 'Beside')]) : null,
    ]);
  }

  function contentsOf(bid, n, ctx) {
    if (!n || !n.kids.length) return null;
    return el('div', { class: 'contents' }, [
      el('h4', {}, ['Contents']),
      el('ul', { class: 'items' }, n.kids.map((k) => el('li', {}, [
        el('a', { class: 'ref', href: ctx.href('books', [bid, k.id]) }, [k.label]),
      ]))),
    ]);
  }

  // ── the lore books (The Path) ──────────────────────────────────────
  function lorePage(bid, path, ctx) {
    const b = D.book(bid);
    const doc = (b.lore || [])[0];
    const sections = (doc && doc.sections) || [];
    const i = Math.max(0, Math.min(sections.length - 1, parseInt(path[1], 10) || 0));
    const toc = el('div', { class: 'site-toc' }, [el('ul', { class: 'toc' }, sections.map((s, k) => (
      s.title ? el('li', { class: 'lore-l' + s.level }, [el('a', {
        class: 'ref' + (k === i ? ' active' : ''), href: ctx.href('books', [bid, String(k)]),
      }, [s.title])]) : null
    )))]);
    const s = sections[i] || { title: null, paras: [] };
    const body = el('div', { class: 'site-reader' }, [
      el('h2', {}, [s.title || b.title]),
      el('div', {}, s.paras.map((p) => paragraphs(p, 'prose'))),
    ]);
    return { toc, body };
  }

  // ── the decks ──────────────────────────────────────────────────────
  function decksPage(bid, path, ctx, state) {
    const cards = D.top(bid);
    const decks = Array.from(new Set(cards.map((c) => D.val(c, 'Deck')).filter(Boolean))).sort();
    const types = Array.from(new Set(cards.map((c) => c.type).filter(Boolean))).sort();
    const f = state.filter || (state.filter = { deck: '', type: '', sun: '', q: '' });

    const bar = el('div', { class: 'chiprow' });
    const grid = el('div', { class: 'cards' });
    const count = el('span', { class: 'muted small' });

    function apply() {
      const rows = cards.filter((c) => (!f.deck || D.val(c, 'Deck') === f.deck)
        && (!f.type || c.type === f.type)
        && (!f.sun || D.val(c, 'Color') === f.sun)
        && (!f.q || (c.name + ' ' + (D.text(c, 'Effect') || '')).toLowerCase().indexOf(f.q) !== -1));
      grid.innerHTML = '';
      count.textContent = rows.length + ' of ' + cards.length + ' cards';
      rows.slice(0, 400).forEach((c) => grid.appendChild(E.card(c, () => Site().go('books', [bid, c.id]))));
      if (rows.length > 400) grid.appendChild(el('div', { class: 'muted small' }, ['Showing the first 400 — narrow it down.']));
    }

    function picker(label, key, options) {
      const sel = el('select', { class: 'scope' });
      sel.appendChild(el('option', { value: '' }, ['All ' + label]));
      options.forEach((o) => sel.appendChild(el('option', { value: o, selected: f[key] === o || null }, [o])));
      sel.addEventListener('change', () => { f[key] = sel.value; apply(); });
      return sel;
    }

    const q = el('input', { type: 'search', class: 'search', placeholder: 'Find a card…', value: f.q || '' });
    q.addEventListener('input', debounce(() => { f.q = q.value.trim().toLowerCase(); apply(); }, 200));
    bar.appendChild(picker('decks', 'deck', decks));
    bar.appendChild(picker('kinds', 'type', types));
    bar.appendChild(picker('suns', 'sun', E.SUNS));
    bar.appendChild(q);
    bar.appendChild(count);
    apply();
    return el('div', {}, [
      el('p', { class: 'muted' }, ['Most of Invisible Sun’s magic is printed on cards and only indexed in the books. These are the cards.']),
      bar, grid,
    ]);
  }

  // ── the reader ─────────────────────────────────────────────────────
  const deckState = {};

  function renderBooks(container, path, ctx) {
    const bid = path[0] && D.indexBook(path[0]) ? path[0] : null;
    if (!bid) return renderShelf(container, ctx);

    const meta = D.indexBook(bid);
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    page.appendChild(el('div', { class: 'crumbs' }, [
      el('a', { href: ctx.href('books', []) }, ['The books']), ' › ', meta.title,
    ]));

    if (!Data.has(bid, 'main')) {
      page.appendChild(el('div', { class: 'empty' }, ['Fetching ' + meta.title + '…']));
      Data.ready(bid, D.hasNotes(bid) ? ['main', 'notes'] : ['main']).then(() => {
        container.innerHTML = '';
        renderBooks(container, path, ctx);
      });
      return;
    }

    const b = D.book(bid);
    const openId = path[1] && (D.entity(path[1]) || D.node(bid, path[1])) ? path[1] : null;

    // a book of prose, and a book of cards, each read their own way
    if (!openId && meta.kind === 'decks') {
      page.appendChild(el('h2', {}, [meta.title]));
      page.appendChild(decksPage(bid, path, ctx, deckState));
      return;
    }
    if ((b.lore || []).length && !D.outline(bid).length) {
      const { toc, body } = lorePage(bid, path, ctx);
      page.appendChild(el('div', { class: 'reader' }, [toc, body]));
      return;
    }

    // search within this book
    const results = el('div', { class: 'results' });
    const q = el('input', { type: 'search', class: 'search', placeholder: 'Search ' + meta.title + '…' });
    q.addEventListener('input', debounce(() => {
      const term = q.value.trim();
      results.innerHTML = '';
      if (term.length < 2) return;
      const hits = D.search(term, [bid], 2000);
      const shown = hits.slice(0, 60);
      results.appendChild(el('div', { class: 'muted small' }, [
        hits.length + ' hits' + (hits.length > shown.length ? ' — the first ' + shown.length : ''),
      ]));
      shown.forEach((h) => {
        const ex = D.excerpt(h, term, 60);
        results.appendChild(el('div', { class: 'hit' }, [
          el('a', { class: 'ref', href: ctx.href('books', [bid, h.id]) }, [h.name]),
          h.type ? el('span', { class: 'etype' }, [h.type]) : null,
          ex ? el('div', { class: 'muted small' }, [ex]) : null,
        ]));
      });
    }, 250));

    const toc = el('div', { class: 'site-toc' }, [q, results, outlineTree(bid, D.outline(bid), openId, ctx)]);
    // the book's other contents: its fortes, its glossary, its price tables
    D.collections(bid).forEach((c) => {
      toc.appendChild(el('details', {}, [
        el('summary', {}, [c.type, el('span', { class: 'muted small' }, [' · ' + c.items.length])]),
        el('ul', { class: 'toc' }, c.items.map((it) => el('li', {}, [
          el('a', { class: 'ref' + (openId === it.id ? ' active' : ''), href: ctx.href('books', [bid, it.id]) }, [it.name]),
        ]))),
      ]));
    });

    const openNode = openId ? D.node(bid, openId) : null;
    const open = openId ? D.entity(openId) : null;
    const body = el('div', { class: 'site-reader' }, [
      openNode ? readingPage(bid, openNode, ctx) : open ? E.render(open) : bookFront(bid, meta, ctx),
    ]);
    page.appendChild(el('div', { class: 'reader' }, [toc, body]));
  }

  function bookFront(bid, meta, ctx) {
    const b = D.book(bid);
    const chapters = D.outline(bid);
    return el('div', {}, [
      el('h2', {}, [meta.title]),
      el('div', { class: 'muted small' }, [(b.files || []).map((f) => f.name).filter(Boolean).join(' · ')]),
      chapters.length ? el('div', { class: 'contents' }, [
        el('h4', {}, ['Contents']),
        el('ul', { class: 'items' }, chapters.map((n) => el('li', {}, [
          el('a', { class: 'ref', href: ctx.href('books', [bid, n.id]) }, [n.label]),
        ]))),
      ]) : null,
      (b.lore || []).length ? el('p', { class: 'muted' }, ['This book is prose; pick a section on the left.']) : null,
    ]);
  }

  return [
    { id: 'books', label: 'The books', render: renderBooks },
    {
      id: 'vislae',
      label: 'Vislae',
      render: (c) => soon(c, {
        title: 'Vislae',
        note: 'The five vislae The Key illustrates, each a start for a character of your own — M5.',
      }),
    },
    {
      id: 'creator',
      label: 'Make a vislae',
      render: (c) => soon(c, {
        title: 'Make a vislae',
        note: 'The Key’s own six (and seventh, and eighth) steps, walked one at a time — M4.',
      }),
    },
  ];
})();
