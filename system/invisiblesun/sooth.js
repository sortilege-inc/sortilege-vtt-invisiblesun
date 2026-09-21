// system/invisiblesun/sooth.js — the Sooth Deck on the Path of Suns.
//
// "Throughout a session of Invisible Sun, the GM will, at various points, play a Sooth
//  card on the Path of Suns, starting on the Silver Sun at the top, and ending with the
//  Invisible Sun off to the side." (The Sooth Deck, The Gate p75.) The sixty cards are
// the corpus's `^"Sooth Card"` entities; the path, the deck and what has been turned
// are shared state (system/invisiblesun/ops.js `sooth`), so the GM's page, the board
// on a second screen and every player see the same card. The rules quoted below are
// the whole of what this file adds; the meanings are the cards' own.
window.IsSooth = (function () {
  const { el, paragraphs, button } = window.VttRender;
  const D = window.IsData;
  const E = window.IsEntity;
  const State = () => window.VttState;
  const Bus = () => window.VttBus;
  const S = () => State().state;

  // The Path, in the order the corpus's own `^"Color"` ENUM prints the suns — the
  // book's: "the first card is played on the Silver Sun, the next on the Green Sun,
  // and so on" (The Gate p10), the Invisible Sun off to the side.
  const PATH = ['Silver', 'Green', 'Blue', 'Indigo', 'Grey', 'Pale', 'Red', 'Gold'];
  const INVISIBLE = 'Invisible';
  // "Each heart is tied not only to one of the classical elements but also to a family of
  //  cards in the Sooth Deck. Thus, Galants (Flamehearts) are tied to Secrets, Stoics
  //  (Stonehearts) to Mysteries, Empaths (Wavehearts) to Visions, and Ardents (Stormhearts)
  //  to Notions." (The Key p67.)
  const HEART_FAMILY = { Galant: 'Secrets', Stoic: 'Mysteries', Empath: 'Visions', Ardent: 'Notions' };
  // "Special royalty cards have these effects" (The Gate p75, with its sidebar).
  const ROYALTY = {
    Sovereign: '+1 to all actions, +2 if heart is linked to family',
    Nemesis: '−1 to all actions, −2 if heart is linked to family',
    Defender: '+2 to all actions if heart is linked to family',
    Apprentice: '−1 to all actions if heart is linked to family',
    Companion: 'Duplicates the effects of the previously played card (if played first in a session on the Silver Sun, immediately play another card on the next sun)',
    Adept: 'Play another card on the next sun',
  };

  const cards = () => D.byType('Sooth Card', ['decks']);
  const card = (id) => (id ? D.entity(id) : null);
  const suns = (c) => (D.val(c, 'Suns') || []).map((i) => i.value).filter(Boolean);
  const family = (c) => D.text(c, 'Family');
  const rank = (c) => D.text(c, 'Royalty Rank');

  const empty = () => ({ deck: [], path: {}, invisible: null, active: null, on: null, turned: [] });
  const state = () => Object.assign(empty(), S().sooth || {});

  // where the next card goes: down the path, then the Invisible Sun, then Silver again
  function nextSun(so) {
    so = so || state();
    if (!so.on || so.on === INVISIBLE) return PATH[0];
    const i = PATH.indexOf(so.on);
    return i >= 0 && i + 1 < PATH.length ? PATH[i + 1] : INVISIBLE;
  }

  // the deck is every card not on the path, in the order this window shuffled it
  function shuffle() {
    const so = state();
    const out = Object.values(so.path || {}).concat(so.invisible ? [so.invisible] : []);
    const ids = cards().map((c) => c.id).filter((id) => out.indexOf(id) === -1);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = ids[i];
      ids[i] = ids[j];
      ids[j] = t;
    }
    State().commit('soothShuffle', [ids]);
    return ids;
  }

  function turn() {
    let so = state();
    let deck = (so.deck || []).filter((id) => card(id));
    if (!deck.length) deck = shuffle();
    const sun = nextSun(so);
    State().commit('soothTurn', [deck[0], sun, new Date().toISOString()]);
    Bus().emit('sooth:turned', { id: deck[0], sun });
  }

  // ── what the active card does (The Gate p10, p75) ──
  function effects(c, on) {
    if (!c) return null;
    const ss = suns(c);
    const out = { enhanced: ss[0] || null, diminished: ss[1] || null, doubled: null, family: family(c), rank: rank(c), rankText: ROYALTY[rank(c)] || null };
    if (on && (on === out.enhanced || on === out.diminished)) out.doubled = on;
    return out;
  }

  // the party members whose heart is tied to the card's family: +1 venture (The Gate p10)
  function favoured(c) {
    if (!c) return [];
    const fam = family(c);
    return (S().party || []).filter((m) => {
      const h = D.entity(((m.character || {}).picks || {}).Heart);
      return h && HEART_FAMILY[h.name] === fam;
    });
  }

  // ── rendering ──
  function cardTile(c, sun, opts) {
    const o = opts || {};
    const ss = c ? suns(c) : [];
    return el('div', { class: 'sooth-slot sun sun-' + (sun || 'varies').toLowerCase() + (c ? ' filled' : '') + (o.active ? ' active' : '') }, [
      el('div', { class: 'sooth-sun' }, [el('span', { class: 'sun-dot' }), ' ', sun === INVISIBLE ? 'The Invisible Sun' : sun]),
      c ? el('div', { class: 'sooth-card ' + (o.big ? 'big' : ''), onclick: o.onclick || null }, [
        el('div', { class: 'sooth-name' }, [c.name]),
        el('div', { class: 'sooth-meta' }, [
          [family(c), D.val(c, 'Value') != null ? 'value ' + D.val(c, 'Value') : null, rank(c)].filter(Boolean).join(' · '),
        ]),
        ss.length ? el('div', { class: 'sooth-suns' }, [
          el('span', { class: 'sun sun-' + ss[0].toLowerCase() + ' strong' }, [el('span', { class: 'sun-dot' }), ' ', ss[0]]),
          ss[1] ? el('span', { class: 'sun sun-' + ss[1].toLowerCase() + ' faint' }, [el('span', { class: 'sun-dot' }), ' ', ss[1]]) : null,
        ]) : null,
      ]) : el('div', { class: 'sooth-empty' }, ['—']),
    ]);
  }

  function pathView(opts) {
    const so = state();
    const o = opts || {};
    return el('div', { class: 'sooth-path' + (o.big ? ' big' : '') }, [
      el('div', { class: 'sooth-row' }, PATH.map((sun) => cardTile(card(so.path[sun]), sun, { active: so.on === sun, big: o.big, onclick: o.onclick && so.path[sun] ? () => o.onclick(so.path[sun]) : null }))),
      el('div', { class: 'sooth-aside' }, [cardTile(card(so.invisible), INVISIBLE, { active: so.on === INVISIBLE, big: o.big, onclick: o.onclick && so.invisible ? () => o.onclick(so.invisible) : null })]),
    ]);
  }

  // the card's effect, said from the rule: level or cost by 1, doubled on its own sun
  function effectLines(c, on, opts) {
    const fx = effects(c, on);
    if (!fx) return null;
    const o = opts || {};
    const lines = [];
    const n = (sun) => (fx.doubled === sun ? 2 : 1);
    if (fx.enhanced) lines.push(el('div', { class: 'sun sun-' + fx.enhanced.toLowerCase() }, [el('span', { class: 'sun-dot' }), ' ', fx.enhanced + ' magic: level +' + n(fx.enhanced) + ', or Sorcery cost −' + n(fx.enhanced) + (fx.doubled === fx.enhanced ? ' (doubled: played on its own sun)' : '')]));
    if (fx.diminished) lines.push(el('div', { class: 'sun sun-' + fx.diminished.toLowerCase() }, [el('span', { class: 'sun-dot' }), ' ', fx.diminished + ' magic: level −' + n(fx.diminished) + ', or Sorcery cost +' + n(fx.diminished) + (fx.doubled === fx.diminished ? ' (doubled: played on its own sun)' : '')]));
    if (fx.rankText) lines.push(el('div', {}, [el('b', {}, [fx.rank + ': ']), fx.rankText]));
    const fav = favoured(c);
    if (!o.noParty) {
      lines.push(el('div', {}, [
        fx.family + ' is the family of the ' + (Object.keys(HEART_FAMILY).find((h) => HEART_FAMILY[h] === fx.family) || '—') + ' heart: +1 venture for ',
        fav.length ? fav.map((m) => m.name).join(', ') : 'no one in the party',
      ]));
    }
    if (on === INVISIBLE) lines.push(el('div', { class: 'muted small' }, ['On the Invisible Sun: in the Testament of Suns until a new card is played there.']));
    return el('div', { class: 'sooth-effects' }, lines);
  }

  // the card's own listing: meanings, divination, the game narrative, Joy, Despair
  function listing(c, opts) {
    const o = opts || {};
    const box = el('div', { class: 'sooth-listing' });
    const cap = D.text(c, 'Caption');
    if (cap) box.appendChild(el('div', { class: 'sooth-caption' }, [cap]));
    const meanings = (D.val(c, 'Meanings') || []).map((i) => i.value);
    if (meanings.length) box.appendChild(el('div', { class: 'chiprow tight' }, meanings.map((m) => el('span', { class: 'chip' }, [m]))));
    if (!o.player) {
      ['Divination', 'Game Narrative', 'Joy', 'Despair'].forEach((k) => {
        const t = D.text(c, k);
        if (t) box.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, [k]), el('div', { class: 'prop-v' }, [paragraphs(t, 'prose small')])]));
      });
    }
    return box;
  }

  function renderPanel(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const so = state();
      const active = card(so.active);
      const next = nextSun(so);
      container.appendChild(el('div', { class: 'chiprow tight' }, [
        button('Turn a card on ' + (next === INVISIBLE ? 'the Invisible Sun' : next), turn, ''),
        button('Shuffle', () => shuffle(), 'ghost tiny'),
        button('Clear the path', () => { if (confirm('Clear the path? The card on the Invisible Sun stays.')) State().commit('soothClear', [true]); }, 'ghost tiny'),
        button('Reset', () => { if (confirm('Take every card back into the deck?')) State().commit('soothReset', []); }, 'ghost tiny'),
        el('a', { class: 'btn ghost tiny', href: 'gm/path.html', target: (window.VttConfig.channel || 'vtt') + '-board' }, ['Open the board']),
        el('span', { class: 'muted small' }, [(so.deck || []).length ? (so.deck.length + ' in the deck') : 'the deck is unshuffled']),
      ]));
      container.appendChild(pathView({ onclick: (id) => window.VttPanels.select({ kind: 'entity', id }) }));
      if (active) {
        container.appendChild(el('h4', {}, ['The active card · ' + active.name, el('span', { class: 'muted small' }, [' · on ' + (so.on === INVISIBLE ? 'the Invisible Sun' : 'the ' + so.on + ' Sun')])]));
        container.appendChild(effectLines(active, so.on));
        container.appendChild(listing(active));
        if (so.invisible && so.invisible !== so.active) {
          const inv = card(so.invisible);
          container.appendChild(el('h4', {}, ['In the Testament of Suns · ' + inv.name]));
          container.appendChild(effectLines(inv, INVISIBLE));
        }
      } else container.appendChild(el('div', { class: 'empty' }, ['No card turned yet. The first is turned at the beginning of the session, on the Silver Sun.']));
      const turned = (so.turned || []).slice(-8).reverse();
      if (turned.length) {
        container.appendChild(el('h4', {}, ['Turned']));
        container.appendChild(el('ul', { class: 'items small' }, turned.map((t) => {
          const c = card(t.id);
          return el('li', {}, [c ? el('button', { class: 'ref', type: 'button', onclick: () => window.VttPanels.select({ kind: 'entity', id: c.id }) }, [c.name]) : t.id, el('span', { class: 'muted' }, [' on ' + t.sun])]);
        })));
      }
      container.appendChild(el('p', { class: 'muted small' }, ['When to turn a card, from The Gate p10: characters move to a new location · a significant event occurs · a significant new NPC enters the scene · a PC suffers a Wound or Anguish · something surprising happens · a GM shift is introduced · flux occurs.']));
    };
    ctx.on('state:changed', draw);
    ctx.on('state:remote', draw);
    draw();
  }

  // The board: one page, the whole path large, for a second screen. ?view=player hides
  // the GM's meanings; the effect on magic is the table's business and stays.
  function renderBoard(container, opts) {
    const o = opts || {};
    const draw = () => {
      container.innerHTML = '';
      const so = state();
      const active = card(so.active);
      container.appendChild(pathView({ big: true }));
      const side = el('div', { class: 'board-side' });
      if (active) {
        side.appendChild(el('h2', {}, [active.name]));
        side.appendChild(el('div', { class: 'muted' }, ['on ' + (so.on === INVISIBLE ? 'the Invisible Sun' : 'the ' + so.on + ' Sun') + ' · ' + [family(active), 'value ' + D.val(active, 'Value'), rank(active)].filter(Boolean).join(' · ')]));
        side.appendChild(effectLines(active, so.on, { noParty: false }));
        side.appendChild(listing(active, { player: !!o.player }));
        if (so.invisible && so.invisible !== so.active) {
          const inv = card(so.invisible);
          side.appendChild(el('h4', {}, ['In the Testament of Suns · ' + inv.name]));
          side.appendChild(effectLines(inv, INVISIBLE));
        }
      } else side.appendChild(el('div', { class: 'empty' }, ['No card turned yet.']));
      container.appendChild(side);
    };
    Bus().on('state:changed', draw);
    Bus().on('state:remote', draw);
    draw();
  }

  // the player's page: the active card and what it does, above their sheet
  function strip(opts) {
    const so = state();
    const active = card(so.active);
    if (!active) return null;
    return el('div', { class: 'sooth-strip' }, [
      cardTile(active, so.on, { active: true }),
      el('div', {}, [effectLines(active, so.on), listing(active, { player: true })]),
    ]);
  }

  return { PATH, INVISIBLE, HEART_FAMILY, ROYALTY, cards, state, nextSun, shuffle, turn, effects, favoured, renderPanel, renderBoard, strip, pathView };
})();
