// system/invisiblesun/entity.js — one entity, as the corpus holds it.
//
// Generic by design: an entity is rendered from its own properties, whatever type it is,
// so a spell, a forte, a glossary term, a sooth card and a price table all come out
// without this file naming any of them. Every string shown is the book's; the only words
// added are the property names, which are the corpus's own too.
window.IsEntity = (function () {
  const { el, paragraphs } = window.VttRender;
  const D = window.IsData;

  // Properties that are said in the header rather than listed in the body.
  const HEADER = ['Book', 'Page', 'Level', 'Chapter', 'Section', 'Deck'];
  // The property that IS the entity's text, printed with no label above it.
  const BODY = ['Text', 'Description', 'Definition', 'Effect'];

  const SUNS = ['Silver', 'Green', 'Blue', 'Indigo', 'Grey', 'Pale', 'Red', 'Gold', 'Invisible'];
  const sunClass = (name) => 'sun sun-' + (SUNS.indexOf(name) !== -1 ? name.toLowerCase() : 'varies');

  function sun(name) {
    return el('span', { class: sunClass(name), title: 'the sun this is keyed to' }, [
      el('span', { class: 'sun-dot' }), ' ', name,
    ]);
  }

  // A reference to another entity: a link when the target is loaded, the printed name when
  // it is not (an index entry may name a card in a deck this page has not paid for).
  function link(ref) {
    const target = ref && ref.hash && D.entity(ref.hash);
    const label = (ref && ref.name) || (target && target.name) || '';
    if (!target) return el('span', {}, [label]);
    return el('a', {
      class: 'ref', href: '#', onclick: (ev) => {
        ev.preventDefault();
        if (window.IsOpenEntity) window.IsOpenEntity(target.id);
      },
    }, [label]);
  }

  function value(p) {
    if (p.vk === 'ref') return link(p.ref);
    if (p.vk === 'list') {
      if (!p.items || !p.items.length) return null;
      return el('ul', { class: 'items' }, p.items.map((it) => el('li', {}, [
        it.vk === 'ref' ? link(it) : it.vk === 'def' ? fields(it.fields) : String(it.value),
      ])));
    }
    if (p.vk === 'def') return fields(p.fields);
    if (p.value === undefined) return null;
    if (p.name === 'Color' && typeof p.value === 'string') return sun(p.value);
    if (typeof p.value === 'boolean') return el('span', {}, [p.value ? 'yes' : 'no']);
    return paragraphs(String(p.value), 'prose');
  }

  function fields(list) {
    return el('div', { class: 'fields' }, (list || []).map((f) => {
      const v = value(f);
      return v ? el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, [f.name]), el('div', { class: 'prop-v' }, [v])]) : null;
    }));
  }

  // A DEF-valued property (the Vislae's eight pools) reads as a group, not as a sentence.
  function isDeclaration(p) {
    return p.value === undefined && p.vk !== 'list' && p.vk !== 'def' && p.vk !== 'ref';
  }

  function header(e) {
    const bits = [];
    const bk = D.val(e, 'Book');
    const pg = D.val(e, 'Page');
    if (bk) bits.push(pg != null ? bk + ' · page ' + pg : bk);
    const deck = D.val(e, 'Deck');
    if (deck) bits.push(deck);
    const section = D.val(e, 'Section');
    if (section) bits.push(section);
    const lvl = D.val(e, 'Level');
    if (typeof lvl === 'number') bits.push('level ' + lvl);
    return bits;
  }

  // The whole entity: its text, then its remaining properties, then what hangs under it.
  function render(e, opts) {
    const o = opts || {};
    const box = el('article', { class: 'entity' });
    if (!o.bare) {
      box.appendChild(el('h3', {}, [
        e.name,
        e.type ? el('span', { class: 'etype' }, [e.type]) : null,
      ]));
      const bits = header(e);
      if (bits.length) box.appendChild(el('div', { class: 'muted small' }, [bits.join(' · ')]));
    }

    (e.props || []).forEach((p) => {
      if (HEADER.indexOf(p.name) !== -1 && p.name !== 'Deck') return;
      if (p.name === 'Deck') return;
      if (isDeclaration(p)) return;                 // a type's declaration, not an instance's value
      if (BODY.indexOf(p.name) !== -1) {
        const v = value(p);
        if (v) box.appendChild(v);
        return;
      }
      const v = value(p);
      if (!v) return;
      box.appendChild(el('div', { class: 'prop' }, [
        el('div', { class: 'prop-k' }, [p.name]),
        el('div', { class: 'prop-v' }, [v]),
      ]));
    });

    // §22 GUIDANCE — the sidebar printed beside this, kept beside it here
    (e.guidance || []).forEach((g) => {
      box.appendChild(el('aside', { class: 'guidance' }, [
        el('div', { class: 'guidance-k' }, [g.name || 'Sidebar']),
        paragraphs(g.text, 'prose'),
      ]));
    });

    // §11 RULES — one WHEN/THEN line each, verbatim
    if ((e.rules || []).length) {
      box.appendChild(el('h4', {}, ['Rules']));
      box.appendChild(el('ul', { class: 'items rules' }, e.rules.map((r) => el('li', {}, [r.text]))));
    }

    // a forte's own path, drawn from the edges the corpus carries
    if (e.type === 'Forte' && !o.noKids) {
      box.appendChild(el('h4', {}, ['The path its abilities are taken along']));
      box.appendChild(fortePath(e));
    }

    // what hangs under it: an order's degrees, a degree's or a forte's abilities
    const kids = D.children(e.id);
    if (kids.length && !o.noKids) {
      const bySlot = {};
      kids.forEach((k) => (bySlot[k.slot || ''] = bySlot[k.slot || ''] || []).push(k));
      Object.keys(bySlot).forEach((slot) => {
        if (slot) box.appendChild(el('h4', {}, [slot.toLowerCase().replace(/_/g, ' ')]));
        bySlot[slot].forEach((k) => box.appendChild(el('div', { class: 'nested' }, [render(k)])));
      });
    }
    return box;
  }

  // A card, for the decks' grid: the name, its sun and level, and its effect.
  function card(e, onclick) {
    const lvl = D.val(e, 'Level');
    const colour = D.val(e, 'Color');
    return el('button', { class: 'card ' + sunClass(colour), type: 'button', onclick }, [
      el('div', { class: 'card-name' }, [e.name]),
      el('div', { class: 'card-meta muted small' }, [
        el('span', { class: 'sun-dot' }), ' ',
        [colour, typeof lvl === 'number' ? 'level ' + lvl : D.val(e, 'Level Note') || null, e.type]
          .filter(Boolean).join(' · '),
      ]),
      el('div', { class: 'card-text' }, [D.text(e, 'Effect') || D.text(e, 'Description') || '']),
    ]);
  }

  // ── a forte's path, drawn from the corpus ─────────────────────────
  // The books print the ability tree as a picture and say it nowhere in words. The corpus
  // now carries its edges (`^"Follows"` on each ability, read off the printed diagram and
  // gated in titterpig-dsl-invisiblesun), so this draws the path itself: no page image,
  // and nothing here decides an order the data does not have.
  const BOX_W = 148;
  const BOX_H = 44;
  const GAP_X = 18;
  const GAP_Y = 34;

  function wrap(name, per) {
    const words = String(name).split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach((w) => {
      if (!line) line = w;
      else if ((line + ' ' + w).length <= per) line += ' ' + w;
      else { lines.push(line); line = w; }
    });
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  // depth = the longest run of Follows behind an ability, so a box always sits below
  // everything it needs
  function layout(abilities) {
    const byName = {};
    abilities.forEach((a) => (byName[a.name] = a));
    const follows = (a) => ((D.val(a, 'Follows') || []).map((i) => i.name).filter((n) => byName[n]));
    const depth = {};
    const walk = (a, seen) => {
      if (depth[a.name] != null) return depth[a.name];
      if (seen.indexOf(a.name) !== -1) return 0;                 // a cycle cannot happen; do not hang if it does
      const parents = follows(a);
      const d = parents.length ? 1 + Math.max.apply(null, parents.map((p) => walk(byName[p], seen.concat([a.name])))) : 0;
      depth[a.name] = d;
      return d;
    };
    abilities.forEach((a) => walk(a, []));
    const rows = [];
    abilities.forEach((a) => (rows[depth[a.name]] = rows[depth[a.name]] || []).push(a));
    return { rows, follows, byName, depth };
  }

  function fortePath(forte) {
    const abilities = D.children(forte.id).filter((c) => c.type === 'Forte Ability');
    if (!abilities.length || !abilities.some((a) => (D.val(a, 'Follows') || []).length)) {
      // no edges: the corpus says so, and says why in its own TODO
      return el('div', { class: 'muted small' }, [
        'The books draw this forte’s path as a diagram, and the corpus carries no edges for it, '
        + 'so its abilities are listed below in the order the book prints them.',
      ]);
    }
    const { rows, follows } = layout(abilities);
    const width = Math.max.apply(null, rows.map((r) => r.length * BOX_W + (r.length - 1) * GAP_X));
    const height = rows.length * BOX_H + (rows.length - 1) * GAP_Y;
    const at = {};
    rows.forEach((row, y) => {
      const rowW = row.length * BOX_W + (row.length - 1) * GAP_X;
      row.forEach((a, i) => {
        at[a.name] = { x: (width - rowW) / 2 + i * (BOX_W + GAP_X), y: y * (BOX_H + GAP_Y) };
      });
    });

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.setAttribute('class', 'fortetree');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', forte.name + ' — the order its abilities are taken in');

    abilities.forEach((a) => {
      follows(a).forEach((p) => {
        const from = at[p];
        const to = at[a.name];
        const line = document.createElementNS(ns, 'path');
        line.setAttribute('d', 'M ' + (from.x + BOX_W / 2) + ' ' + (from.y + BOX_H)
          + ' L ' + (to.x + BOX_W / 2) + ' ' + to.y);
        line.setAttribute('class', 'tree-edge');
        svg.appendChild(line);
      });
    });

    abilities.forEach((a) => {
      const p = at[a.name];
      const g = document.createElementNS(ns, 'g');
      g.setAttribute('class', 'tree-node ' + sunClass(D.val(a, 'Color')));
      g.setAttribute('tabindex', '0');
      const title = document.createElementNS(ns, 'title');
      const lvl = D.val(a, 'Level');
      title.textContent = a.name + (lvl != null ? ' · level ' + lvl : '') + '\n' + (D.text(a, 'Effect') || '');
      g.appendChild(title);
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', p.x);
      rect.setAttribute('y', p.y);
      rect.setAttribute('width', BOX_W);
      rect.setAttribute('height', BOX_H);
      rect.setAttribute('rx', '2');
      g.appendChild(rect);
      const lines = wrap(a.name, 20);
      lines.forEach((ln, i) => {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', p.x + BOX_W / 2);
        t.setAttribute('y', p.y + BOX_H / 2 - (lines.length - 1) * 6 + i * 12 + 4);
        t.setAttribute('text-anchor', 'middle');
        t.textContent = ln;
        g.appendChild(t);
      });
      if (lvl != null) {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', p.x + BOX_W - 5);
        t.setAttribute('y', p.y + BOX_H - 4);
        t.setAttribute('text-anchor', 'end');
        t.setAttribute('class', 'tree-lvl');
        t.textContent = lvl;
        g.appendChild(t);
      }
      const open = () => window.IsOpenEntity && window.IsOpenEntity(a.id);
      g.addEventListener('click', open);
      g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') open(); });
      svg.appendChild(g);
    });

    const starts = abilities.filter((a) => !follows(a).length).map((a) => a.name);
    return el('div', { class: 'fortetree-wrap' }, [
      svg,
      el('div', { class: 'muted small' }, [
        starts.length === 1 ? 'Starts at ' + starts[0] + '; each ability below needs the one above it.'
          : 'Starts at any of ' + starts.join(' or ') + '; each ability below needs the one above it.',
      ]),
    ]);
  }

  return { render, card, link, sun, sunClass, fortePath, SUNS };
})();
