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

  return { render, card, link, sun, sunClass, SUNS };
})();
