// system/invisiblesun/sheet.js — a vislae as played.
//
// Nothing about this sheet is hand-listed. Its shape is the corpus's `^"Vislae"` ACTOR,
// read at runtime: an INTEGER with a MAX is a track, an INTEGER without one a counter, a
// `^"X" ^"Type"` a pick from every entity of that type, a `LIST OF ^"Type"` a pick-any of
// the same, a DEF-valued property (the eight pools) a group, an ENUM its own options.
// Add a declaration to the BASE and it appears here; that is why D1 went to the corpus
// rather than into this file.
//
// What this file does add is ARRANGEMENT: which declared field is set where on the
// page. The six fingers are the book's own ("The Six Fingers of the Testament of Suns",
// The Key p20) and the rest follows the ACTOR's own grouping. A field the layout does
// not name is not lost — it lands in the last section.
//
// The few numbers the books state only in prose are named constants below, each citing
// the sentence it comes from. There are no others.
window.IsSheet = (function () {
  const { el, paragraphs, debounce } = window.VttRender;
  const D = window.IsData;
  const E = window.IsEntity;

  // ── what the books say in prose and nowhere else ───────────────────
  // "The points of each of these are divided into refined pools—four pools for Certes,
  //  and four pools for Qualia." (Statistics, The Key p27.) Which four is which the
  //  source does not finish saying — that sentence breaks off mid-list at a column
  //  ("For Certes, the pools are Accuracy,") — so the division is taken from the order
  //  the corpus's own ^"Stat Pool" ENUM prints them in, which is the book's.
  const CERTES_POOLS = ['Accuracy', 'Movement', 'Physicality', 'Perception'];
  const QUALIA_POOLS = ['Sorcery', 'Interaction', 'Intellect', 'Sortilege'];
  // "Heart determines your starting stat values and grants you a pair of skills."
  // (Heart and the Player Character, The Key p68.)
  const HEART_SKILLS = 2;
  // "This level 2 skill can be anything that could be learned in Shadow" (Shadow Skill,
  // The Key p156.)
  const SHADOW_SKILL_LEVEL = 2;
  // "Player character vislae do not start at Journeyman degree ... They have advanced to
  // 1st degree." (Journeyman Degree, The Key p38.)
  const STARTING_DEGREE = 1;
  // "The Six Fingers of the Testament of Suns" (The Key p20): the six choices that
  // describe a vislae, in the order the book counts them.
  const FINGERS = ['Order', 'Heart', 'Forte', 'Soul Allegiance', 'Foundation', 'Character Arcs'];
  // The three statistics the heart and the foundation set (Statistics, The Key p27).
  const STATS = ['Certes', 'Qualia', 'Hidden Knowledge'];
  // How each order is spoken of, which the book states in a sentence of its own: "When
  // referring to their order, Vances say, “Order of the Vance.” Weavers and Makers just
  // say, “Order of Weavers” and “Order of Makers.” Goetics sometimes say, “Order of
  // Goetics” and other times use the more formal “Order of Goetica.” Apostates just say,
  // “an Apostate.”" (Step 1: Choose an Order, The Key p21.)
  const ORDER_PHRASE = {
    Vance: 'of the Order of the Vance',
    Maker: 'of the Order of Makers',
    Weaver: 'of the Order of Weavers',
    Goetic: 'of the Order of Goetica',
    Apostate: 'Apostate',
  };

  const BOOKS = ['base', 'key', 'way', 'decks'];   // where a vislae's choices live

  const actor = () => D.all(['base']).find((e) => e.form === 'ACTOR') || null;

  // ── the shape of a sheet, from the actor's declarations ────────────
  function spec() {
    const a = actor();
    if (!a) return null;
    const out = { picks: [], enums: [], counters: [], tracks: [], texts: [], lines: [], lists: [], pools: [], rated: [] };
    (a.props || []).forEach((p) => {
      if (p.name === 'Name' || p.name === 'Description') return;
      if (p.vk === 'def') {
        out.pools.push({ name: p.name, fields: (p.fields || []).map((f) => f.name) });
        return;
      }
      if (p.vk === 'enum') {
        out.enums.push({ name: p.name, options: p.options || [] });
        return;
      }
      if (p.vk === 'ref') {
        const type = (p.ref || {}).name;
        out.picks.push({ name: p.name, type, options: type ? D.byType(type, BOOKS) : [] });
        return;
      }
      if (p.vk === 'list') {
        if (p.of === 'STRING') {
          out.lines.push({ name: p.name });
          return;
        }
        const items = p.of ? D.byType(p.of, BOOKS) : [];
        const declared = p.ofHash ? D.entity(p.ofHash) : null;
        // A type the corpus declares but never instantiates is a list the player writes:
        // a skill, a connection, a quirk, a bond. Its fields are the type's own, and it
        // is rated only if the type says so (^"Level" INTEGER MIN 0 MAX 4).
        if (!items.length && declared) {
          const fields = (declared.props || []).filter((f) => f.vk !== 'def');
          const level = fields.find((f) => f.type === 'INTEGER' && f.max != null);
          out.rated.push({
            name: p.name, type: p.of,
            field: (fields.find((f) => f.required) || fields[0] || { name: 'Name' }).name,
            fields: fields.filter((f) => f !== level).map((f) => ({ name: f.name, options: f.vk === 'enum' ? (f.options || []) : null })),
            level: level ? { name: level.name, min: level.min || 0, max: level.max } : null,
          });
        } else out.lists.push({ name: p.name, type: p.of, options: items });
        return;
      }
      if (p.type === 'INTEGER') {
        if (p.max != null) out.tracks.push({ name: p.name, min: p.min || 0, max: p.max, start: p.value != null ? p.value : (p.min || 0) });
        else out.counters.push({ name: p.name, min: p.min || 0, start: p.value != null ? p.value : 0 });
        return;
      }
      if (p.type === 'STRING') out.texts.push({ name: p.name });
    });
    return out;
  }

  function blank() {
    const sp = spec();
    const v = { name: '', values: {}, picks: {}, lists: {}, rated: {}, lines: {}, pools: {} };
    (sp.counters || []).forEach((c) => (v.values[c.name] = c.start));
    (sp.tracks || []).forEach((t) => (v.values[t.name] = t.start));
    (sp.pools || []).forEach((g) => g.fields.forEach((f) => (v.pools[f] = 0)));
    v.values.Degree = STARTING_DEGREE;
    return v;
  }

  // Fill in anything the sheet expects and an older draft lacks.
  function complete(v) {
    const base = blank();
    ['values', 'picks', 'lists', 'rated', 'lines', 'pools'].forEach((k) => {
      v[k] = Object.assign({}, base[k], v[k] || {});
    });
    v.name = v.name || '';
    return v;
  }

  // ── what the choices grant ─────────────────────────────────────────
  // Read off the chosen entities, never stored: change the heart and the numbers change.
  const roots = (forte) => D.children(forte.id).filter((a) => a.type === 'Forte Ability' && !(D.val(a, 'Follows') || []).length);

  function derive(v) {
    const heart = D.entity(v.picks.Heart);
    const foundation = D.entity(v.picks.Foundation);
    const order = D.entity(v.picks.Order);
    const forte = D.entity(v.picks.Forte);
    const soul = D.entity(v.picks['Soul Allegiance']);
    const certes = heart ? D.val(heart, 'Starting Certes') : null;
    const qualia = heart ? D.val(heart, 'Starting Qualia') : null;
    const hidden = foundation ? D.val(foundation, 'Hidden Knowledge') : null;
    const spent = (pools) => pools.reduce((n, p) => n + (v.pools[p] || 0), 0);
    const degree = v.values.Degree || STARTING_DEGREE;
    const degrees = order ? D.children(order.id).filter((d) => d.slot === 'DEGREES') : [];
    return {
      heart, foundation, order, forte, soul,
      certes, qualia, hidden,
      certesSpent: spent(CERTES_POOLS), qualiaSpent: spent(QUALIA_POOLS),
      degree,
      degreeNow: degrees.find((d) => D.val(d, 'Degree') === degree) || null,
      // the abilities the order grants at the character's degree, in the corpus's own nesting
      degreeAbilities: degrees.filter((d) => D.val(d, 'Degree') <= degree)
        .map((d) => ({ degree: d, abilities: D.children(d.id) })),
      // an Apostate has no degrees; its abilities hang directly under the order
      orderAbilities: order ? D.children(order.id).filter((x) => x.slot === 'APOSTATE_ABILITIES') : [],
      forteAbilities: forte ? D.children(forte.id).filter((a) => a.type === 'Forte Ability') : [],
      forteRoots: forte ? roots(forte) : [],
      heartSkills: heart ? (D.val(heart, 'Skills') || []).map((i) => i.value) : [],
      heartPair: heart ? (v.rated.Skills || []).filter((r) => (D.val(heart, 'Skills') || []).some((i) => i.value === r.Skill)).length : 0,
    };
  }

  // The sentence the book describes a character with: "An Established Stoic of the Order
  // of the Vance who Walks the Path of Suns" — foundation, heart, order, forte. A forte's
  // name is a verb and is printed as it stands.
  function sentence(v, d) {
    d = d || derive(v);
    const f = d.foundation && d.foundation.name;
    const h = d.heart && d.heart.name;
    const o = d.order && d.order.name;
    const fo = d.forte && d.forte.name;
    if (!f && !h && !o && !fo) return null;
    const bits = [v.name || 'This vislae', 'is', f ? 'a' + (/^[AEIOU]/i.test(f) ? 'n' : '') + ' ' + f : null, h,
      o ? (ORDER_PHRASE[o] || 'of the Order of ' + o) : null, fo ? 'who ' + fo : null];
    return bits.filter(Boolean).join(' ');
  }

  // ── a choice, summed up by its own fields ──────────────────────────
  // The line under a card's name: the numbers a choice sets, from the entity itself.
  function facts(e) {
    if (!e) return [];
    const n = (k) => D.val(e, k);
    switch (e.type) {
      case 'Heart': return ['Certes ' + n('Starting Certes'), 'Qualia ' + n('Starting Qualia')];
      case 'Foundation': return ['Hidden Knowledge ' + n('Hidden Knowledge'), n('Income') ? 'income ' + n('Income') : null, n('Initial Savings') ? 'savings ' + n('Initial Savings') : null].filter(Boolean);
      case 'Forte': {
        const abil = D.children(e.id).filter((a) => a.type === 'Forte Ability');
        const r = roots(e).map((a) => a.name);
        return [abil.length + ' abilities', r.length ? 'starts at ' + r.join(' or ') : null].filter(Boolean);
      }
      case 'Character Arc': return n('Cost') ? ['cost ' + n('Cost')] : [];
      case 'Order': return D.children(e.id).some((x) => x.slot === 'DEGREES') ? ['six degrees'] : ['no degrees'];
      default: {
        const lvl = n('Level');
        return typeof lvl === 'number' ? ['level ' + lvl] : [];
      }
    }
  }

  // The words under a card's name, the entity's own: a tagline where it has one, else the
  // opening of the text that says what it is. A forte is best said by its first ability.
  function blurb(e, n) {
    if (!e) return '';
    let t = D.text(e, 'Tagline');
    if (!t && e.type === 'Forte') {
      const r = roots(e)[0];
      t = r ? r.name + ' — ' + (D.text(r, 'Effect') || '') : D.text(e, 'Background');
    }
    if (!t && e.type === 'Soul Allegiance') t = D.text(e, 'Description');
    if (!t && e.type === 'Foundation') t = D.text(e, 'Special');
    if (!t) t = D.text(e, 'Description') || D.text(e, 'Text') || D.text(e, 'Effect') || '';
    return truncate(t.replace(/\n+/g, ' '), n || 200);
  }

  function choiceCard(e, on, onclick, extra) {
    const f = facts(e);
    const b = blurb(e);
    const gift = e.type === 'Soul Allegiance' ? D.text(e, 'Gift') : null;
    return el('button', { class: 'choice ' + E.sunClass(D.val(e, 'Color')) + (on ? ' on' : ''), type: 'button', onclick }, [
      el('div', { class: 'card-name' }, [e.name]),
      f.length ? el('div', { class: 'card-facts' }, f.map((x) => el('span', {}, [x]))) : null,
      b ? el('div', { class: 'card-desc' }, [b]) : null,
      gift ? el('div', { class: 'card-desc' }, [el('span', { class: 'card-k' }, ['Gift ']), truncate(gift, 160)]) : null,
      extra || null,
    ]);
  }

  // ── controls ───────────────────────────────────────────────────────
  function stepper(value, min, max, onset, disabled) {
    const show = el('span', { class: 'step-v' }, [String(value)]);
    const go = (n) => onset(Math.max(min, max != null ? Math.min(max, n) : n));
    return el('span', { class: 'stepper' + (disabled ? ' off' : '') }, [
      el('button', { class: 'btn tiny', type: 'button', disabled: disabled || value <= min || null, onclick: () => go(value - 1) }, ['−']),
      show,
      el('button', { class: 'btn tiny', type: 'button', disabled: disabled || (max != null && value >= max) || null, onclick: () => go(value + 1) }, ['+']),
    ]);
  }

  function picker(sp, chosen, onpick, blankLabel) {
    const sel = el('select', { class: 'scope' });
    sel.appendChild(el('option', { value: '' }, [blankLabel || ('Choose a ' + (sp.type || sp.name).toLowerCase() + '…')]));
    sp.options.forEach((o) => sel.appendChild(el('option', { value: o.id, selected: chosen === o.id || null }, [o.name])));
    sel.addEventListener('change', () => onpick(sel.value || null));
    return sel;
  }

  function row(label, control, note) {
    return el('div', { class: 'prop' }, [
      el('div', { class: 'prop-k' }, [label]),
      el('div', { class: 'prop-v' }, [control, note ? el('div', { class: 'muted small' }, [note]) : null]),
    ]);
  }

  function textInput(obj, key, placeholder, multiline, onchange) {
    const node = multiline
      ? el('textarea', { rows: 3, class: 'text', placeholder: placeholder || '' }, [obj[key] || ''])
      : el('input', { type: 'text', class: 'text', value: obj[key] || '', placeholder: placeholder || '' });
    node.addEventListener('change', () => {
      obj[key] = node.value.trim();
      if (onchange) onchange();
    });
    return node;
  }

  function truncate(s, n) {
    return s && s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
  }

  function section(title, note, children) {
    return el('section', { class: 'sheet-sec' }, [
      el('h4', {}, [title, note ? el('span', { class: 'muted small' }, [' · ' + note]) : null]),
      ...(children || []),
    ]);
  }

  // The eight pools, the stat above each four. `cap` is the creator's: a stat cannot
  // divide more points than it has. The sheet, which is the character in play, is free —
  // bene rise and fall at the table.
  function poolsBlock(v, redraw, d, cap) {
    return el('div', { class: 'pools-wrap' }, [
      [['Certes', CERTES_POOLS, d.certes, d.certesSpent, 'heart'], ['Qualia', QUALIA_POOLS, d.qualia, d.qualiaSpent, 'heart']].map(([stat, names, total, spent, from]) => {
        const left = total == null ? null : total - spent;
        const state = total == null ? 'choose a ' + from + ' and these are set'
          : left === 0 ? 'all ' + total + ' divided' : left > 0 ? left + ' of ' + total + ' still to divide' : (-left) + ' over';
        return el('div', { class: 'poolgroup' + (left != null && left < 0 ? ' over' : '') }, [
          el('div', { class: 'poolgroup-h' }, [
            el('span', { class: 'prop-k' }, [stat + ' pools']),
            el('span', { class: 'muted small' }, [state]),
          ]),
          el('div', { class: 'pools' }, names.map((p) => el('div', { class: 'pool' }, [
            el('div', { class: 'pool-n' }, [p]),
            stepper(v.pools[p] || 0, 0, cap ? (total == null ? 0 : (v.pools[p] || 0) + Math.max(0, left)) : null,
              (n) => { v.pools[p] = n; redraw(); }, cap && total == null),
          ]))),
        ]);
      }),
    ]);
  }

  // A list the player writes, over the fields the corpus declares for it (a skill, a
  // connection, a bond, a quirk): one row per entry, its level stepped where the type
  // rates it, and a row of inputs to add the next.
  function ratedList(v, redraw, r, opts) {
    const o = opts || {};
    const rows = v.rated[r.name] || [];
    const box = el('div', { class: 'rated' });
    rows.forEach((entry, i) => {
      box.appendChild(el('div', { class: 'rated-row' }, [
        el('span', { class: 'rated-main' }, [entry[r.field] || '—']),
        ...r.fields.filter((f) => f.name !== r.field).map((f) => f.options
          ? (() => {
            const sel = el('select', { class: 'scope tiny' });
            sel.appendChild(el('option', { value: '' }, [f.name.toLowerCase() + '…']));
            f.options.forEach((x) => sel.appendChild(el('option', { value: x, selected: entry[f.name] === x || null }, [x])));
            sel.addEventListener('change', () => { entry[f.name] = sel.value || null; redraw(); });
            return sel;
          })()
          : el('input', { type: 'text', class: 'text small', value: entry[f.name] || '', placeholder: f.name.toLowerCase(), onchange: (ev) => { entry[f.name] = ev.target.value.trim(); } })),
        r.level ? stepper(entry[r.level.name] || 0, r.level.min, r.level.max, (n) => { rows[i][r.level.name] = n; redraw(); }) : null,
        el('button', { class: 'btn ghost tiny', type: 'button', title: 'remove', onclick: () => { rows.splice(i, 1); redraw(); } }, ['×']),
      ]));
    });
    const inputs = r.fields.map((f) => f.options
      ? (() => {
        const sel = el('select', { class: 'scope tiny' });
        sel.appendChild(el('option', { value: '' }, [f.name.toLowerCase() + '…']));
        f.options.forEach((x) => sel.appendChild(el('option', { value: x }, [x])));
        return sel;
      })()
      : el('input', { type: 'text', class: 'text small' + (f.name === r.field ? ' rated-main' : ''), placeholder: (o.placeholders || {})[f.name] || f.name.toLowerCase() }));
    const add = () => {
      const main = inputs[r.fields.findIndex((f) => f.name === r.field)];
      if (!main || !main.value.trim()) return;
      const entry = {};
      r.fields.forEach((f, k) => (entry[f.name] = inputs[k].value.trim() || null));
      if (r.level) entry[r.level.name] = o.startLevel != null ? o.startLevel : 1;
      v.rated[r.name] = rows.concat([entry]);
      redraw();
    };
    inputs.forEach((inp) => inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); add(); } }));
    box.appendChild(el('div', { class: 'rated-row add' }, [
      ...inputs,
      el('button', { class: 'btn tiny', type: 'button', onclick: add }, ['Add']),
    ]));
    return box;
  }

  // A pick-any over a deck's worth of entities: what is chosen as cards, and a finder —
  // search, sun, level, deck, whichever the options vary by — to add the next. The state
  // of the finder outlives a redraw so adding a card does not lose the search.
  const finders = {};
  function cardPicker(v, redraw, name, options, opts) {
    const o = opts || {};
    const st = finders[name] = finders[name] || { q: '', sun: '', level: '', deck: '', open: !!o.open };
    const chosen = v.lists[name] || [];
    const avail = options.filter((x) => chosen.indexOf(x.id) === -1);
    const uniq = (xs) => Array.from(new Set(xs.filter((x) => x != null && x !== '')));
    const suns = E.SUNS.filter((s) => avail.some((x) => D.val(x, 'Color') === s));
    const levels = uniq(avail.map((x) => D.val(x, 'Level'))).filter((x) => typeof x === 'number').sort((a, b) => a - b);
    const decks = uniq(avail.map((x) => D.val(x, 'Deck'))).sort();

    const grid = el('div', { class: 'cards' });
    const count = el('span', { class: 'muted small' });
    const LIMIT = 48;
    const pick = (c) => {
      v.lists[name] = (v.lists[name] || []).concat([c.id]);
      redraw();
    };
    // the rows the filters leave — all of them, not only the ones the grid shows
    let rows = [];
    // draw one from those rows: what the deck does when a card is dealt rather than chosen
    const random = el('button', { class: 'btn tiny', type: 'button', title: 'Draw one at random from what the filters leave' }, ['Draw one']);
    random.addEventListener('click', () => {
      if (rows.length) pick(rows[Math.floor(Math.random() * rows.length)]);
    });
    function apply() {
      const q = st.q.toLowerCase();
      rows = avail.filter((c) => (!st.sun || D.val(c, 'Color') === st.sun)
        && (st.level === '' || D.val(c, 'Level') === Number(st.level))
        && (!st.deck || D.val(c, 'Deck') === st.deck)
        && (!q || (c.name + ' ' + (D.text(c, 'Effect') || D.text(c, 'Description') || '')).toLowerCase().indexOf(q) !== -1));
      grid.innerHTML = '';
      count.textContent = rows.length === avail.length ? avail.length + ' to choose from' : rows.length + ' of ' + avail.length;
      random.disabled = !rows.length;
      random.textContent = rows.length && rows.length < avail.length ? 'Draw one of ' + rows.length : 'Draw one';
      rows.slice(0, LIMIT).forEach((c) => grid.appendChild(E.card(c, () => pick(c))));
      if (rows.length > LIMIT) grid.appendChild(el('div', { class: 'muted small' }, ['The first ' + LIMIT + ' — narrow it down.']));
    }
    function sel(label, key, values, fmt) {
      const s = el('select', { class: 'scope' });
      s.appendChild(el('option', { value: '' }, ['All ' + label]));
      values.forEach((x) => s.appendChild(el('option', { value: String(x), selected: String(st[key]) === String(x) || null }, [fmt ? fmt(x) : String(x)])));
      s.addEventListener('change', () => { st[key] = s.value; apply(); });
      return s;
    }
    const q = el('input', { type: 'search', class: 'search', placeholder: 'Find by name or effect…', value: st.q });
    q.addEventListener('input', debounce(() => { st.q = q.value.trim(); apply(); }, 150));
    const bar = el('div', { class: 'chiprow finder-bar' }, [
      q,
      suns.length > 1 ? sel('suns', 'sun', suns) : null,
      levels.length > 1 ? sel('levels', 'level', levels, (x) => 'level ' + x) : null,
      decks.length > 1 ? sel('decks', 'deck', decks) : null,
      random,
      count,
    ]);
    apply();

    const details = el('details', { class: 'finder', open: st.open || null }, [
      el('summary', {}, ['Add ' + (o.label || name.toLowerCase()), el('span', { class: 'muted small' }, [' · ' + avail.length + ' in the books'])]),
      bar, grid,
    ]);
    details.addEventListener('toggle', () => { st.open = details.open; });

    return el('div', { class: 'picker' }, [
      chosen.length ? el('div', { class: 'cards chosen-cards' }, chosen.map((id) => {
        const e = D.entity(id);
        if (!e) return null;
        const card = E.card(e, () => window.IsOpenEntity && window.IsOpenEntity(e.id));
        card.appendChild(el('span', {
          class: 'btn ghost tiny card-remove', title: 'remove', onclick: (ev) => {
            ev.stopPropagation();
            v.lists[name] = (v.lists[name] || []).filter((x) => x !== id);
            redraw();
          },
        }, ['remove']));
        return card;
      })) : el('div', { class: 'muted small' }, [o.empty || 'None yet.']),
      avail.length ? details : null,
    ]);
  }

  // Abilities as rows: name, level, sun, and the effect — the whole of it on the sheet,
  // where it is played from; clipped in the creator, where it is chosen.
  function abilityRows(list, opts) {
    const o = opts || {};
    return el('div', { class: 'abilities' + (o.clip ? ' clip' : '') }, list.map((ab) => {
      const lvl = D.val(ab, 'Level');
      const colour = D.val(ab, 'Color');
      return el('div', {
        class: 'ability ' + E.sunClass(colour), tabindex: '0', role: 'link',
        onclick: () => window.IsOpenEntity && window.IsOpenEntity(ab.id),
        onkeydown: (ev) => { if (ev.key === 'Enter' && window.IsOpenEntity) window.IsOpenEntity(ab.id); },
      }, [
        el('div', { class: 'ability-h' }, [
          el('span', { class: 'ability-n' }, [ab.name]),
          el('span', { class: 'muted small' }, [
            colour ? el('span', { class: 'sun-dot' }) : null, ' ',
            [colour, typeof lvl === 'number' ? 'level ' + lvl : null].filter(Boolean).join(' · '),
          ]),
        ]),
        el('div', { class: 'ability-t' }, [D.text(ab, 'Effect') || D.text(ab, 'Description') || '']),
      ]);
    }));
  }

  // ── the sheet ──────────────────────────────────────────────────────
  // `redraw` is the page's own; this renders into a fresh node each time. What is
  // written goes to the draft the caller owns; storage is the caller's business.
  function render(v, redraw, opts) {
    const o = opts || {};
    const sp = spec();
    const d = derive(v);
    const placed = {};
    const take = (n) => { placed[n] = true; return n; };
    const set = (obj, k, val) => { obj[k] = val; redraw(); };
    const box = el('div', { class: 'sheet' });

    // ── masthead: who this is ──
    const name = el('input', { type: 'text', class: 'text name-big', value: v.name || '', placeholder: 'Their name' });
    name.addEventListener('change', () => { v.name = name.value.trim(); redraw(); });
    take('Name');
    const degreeTitle = d.degreeNow ? D.val(d.degreeNow, 'Title') : null;
    const styleSpec = sp.enums.find((e2) => e2.name === 'Roleplaying Style');
    box.appendChild(el('div', { class: 'masthead' }, [
      el('div', { class: 'masthead-main' }, [
        name,
        el('div', { class: 'sentence' }, [sentence(v, d) || 'No part of the describing sentence is decided yet.']),
        v.startedFrom ? el('div', { class: 'muted small' }, [
          'Started from ', el('i', {}, [v.startedFrom.name]),
          ', whom ' + (v.startedFrom.book || 'The Key') + ' illustrates on page ' + v.startedFrom.page + '.',
        ]) : null,
      ]),
      el('div', { class: 'masthead-side' }, [
        el('div', { class: 'tile' }, [
          el('div', { class: 'pool-n' }, [take('Degree')]),
          stepper(d.degree, 1, 6, (n) => set(v.values, 'Degree', n)),
          el('div', { class: 'muted small' }, [degreeTitle || (d.order ? '' : 'of no order yet')]),
        ]),
        styleSpec ? el('div', { class: 'tile' }, [
          el('div', { class: 'pool-n' }, [take('Roleplaying Style')]),
          (() => {
            const sel = el('select', { class: 'scope' });
            sel.appendChild(el('option', { value: '' }, ['—']));
            styleSpec.options.forEach((x) => sel.appendChild(el('option', { value: x, selected: v.picks['Roleplaying Style'] === x || null }, [x])));
            sel.addEventListener('change', () => set(v.picks, 'Roleplaying Style', sel.value || null));
            return sel;
          })(),
        ]) : null,
      ]),
    ]));

    // ── the six fingers ──
    box.appendChild(el('div', { class: 'fingers' }, FINGERS.map((fname) => {
      const pk = sp.picks.find((p) => p.name === fname);
      const ls = sp.lists.find((l) => l.name === fname);
      if (!pk && !ls) return null;
      take(fname);
      if (pk) {
        const chosen = D.entity(v.picks[fname]);
        return el('div', { class: 'finger ' + (chosen ? E.sunClass(D.val(chosen, 'Color')) : '') }, [
          el('div', { class: 'pool-n' }, [fname === 'Soul Allegiance' ? 'Soul' : fname]),
          el('div', { class: 'finger-name' }, [chosen ? chosen.name : '—']),
          chosen ? el('div', { class: 'muted small' }, [facts(chosen).join(' · ')]) : null,
          o.readonly ? null : picker(pk, v.picks[fname], (id) => set(v.picks, fname, id), chosen ? 'Change…' : undefined),
        ]);
      }
      const chosen = (v.lists[fname] || []).map((id) => D.entity(id)).filter(Boolean);
      return el('div', { class: 'finger' }, [
        el('div', { class: 'pool-n' }, [fname]),
        el('div', { class: 'finger-name' }, [chosen.length ? chosen.map((e2) => e2.name).join(', ') : '—']),
        el('div', { class: 'muted small' }, [chosen.length ? chosen.length + ' in play' : 'none yet']),
      ]);
    })));

    // ── statistics and pools ──
    box.appendChild(section('Statistics', 'the heart sets Certes and Qualia; the foundation sets Hidden Knowledge', [
      el('div', { class: 'stat-tiles' }, STATS.map((n) => {
        take(n);
        const granted = n === 'Certes' ? d.certes : n === 'Qualia' ? d.qualia : d.hidden;
        const from = n === 'Hidden Knowledge' ? 'foundation' : 'heart';
        return el('div', { class: 'tile stat' }, [
          el('div', { class: 'pool-n' }, [n]),
          el('div', { class: 'stat-v' }, [granted != null ? String(granted) : '—']),
          el('div', { class: 'muted small' }, [granted != null ? 'from the ' + from : 'no ' + from + ' yet']),
        ]);
      })),
      sp.pools.length ? poolsBlock(v, redraw, d, false) : null,
    ]));
    sp.pools.forEach((g) => take(g.name));

    // ── harm and advancement: the tracks and counters the actor declares ──
    const strip = sp.tracks.concat(sp.counters).filter((c) => !placed[c.name]);
    if (strip.length) {
      box.appendChild(section('Harm and advancement', null, [
        el('div', { class: 'counters' }, strip.map((c) => {
          take(c.name);
          return el('div', { class: 'counter' }, [
            el('div', { class: 'pool-n' }, [c.name]),
            stepper(v.values[c.name] || 0, c.min, c.max != null ? c.max : null, (n) => set(v.values, c.name, n)),
          ]);
        })),
      ]));
    }

    // ── what the order and the forte give ──
    if (d.order) {
      const kids = d.degreeAbilities.length ? d.degreeAbilities : [{ degree: null, abilities: d.orderAbilities }];
      box.appendChild(section('Order · ' + d.order.name, d.degreeNow ? d.degreeNow.name : null, kids.map((g) => el('div', {}, [
        g.degree && d.degreeAbilities.length > 1 ? el('div', { class: 'muted small' }, [g.degree.name]) : null,
        abilityRows(g.abilities),
      ]))));
    }
    if (d.forte) {
      box.appendChild(section('Forte · ' + d.forte.name, d.forteAbilities.length + ' abilities along its path', [
        E.fortePath(d.forte),
        abilityRows(d.forteAbilities),
      ]));
    }

    // ── skills and connections: rated lists, the heart's pair first ──
    const skills = sp.rated.find((r) => r.name === 'Skills');
    const conns = sp.rated.find((r) => r.name === 'Connections');
    box.appendChild(section('Skills and connections', 'both rise to 4', [
      d.heartSkills.length ? el('div', {}, [
        el('div', { class: 'muted small' }, ['The heart grants a pair of these; the rest are bought with Acumen.']),
        el('div', { class: 'chiprow' }, d.heartSkills.map((s) => {
          const on = (v.rated.Skills || []).some((r) => r.Skill === s);
          return el('button', {
            class: 'btn' + (on ? '' : ' ghost'), type: 'button',
            onclick: () => {
              const cur = (v.rated.Skills || []).slice();
              const i = cur.findIndex((r) => r.Skill === s);
              if (i >= 0) cur.splice(i, 1);
              else if (d.heartPair < HEART_SKILLS) cur.push({ Skill: s, Level: 1, Kind: null });
              set(v.rated, 'Skills', cur);
            },
          }, [s]);
        })),
      ]) : null,
      el('div', { class: 'two-up' }, [
        skills ? el('div', {}, [el('div', { class: 'prop-k' }, [take('Skills')]), ratedList(v, redraw, skills)]) : null,
        conns ? el('div', {}, [el('div', { class: 'prop-k' }, [take('Connections')]), ratedList(v, redraw, conns)]) : null,
      ]),
    ]));

    // ── from Shadow, and where they live ──
    const house = sp.picks.find((p) => p.name === 'House');
    const shadow = ['Shadow Skill', 'Shadow Memento'].filter((n) => sp.texts.some((t) => t.name === n));
    if (house || shadow.length) {
      box.appendChild(section('Out of Shadow, and home', null, [
        ...shadow.map((n) => row(take(n), textInput(v.values, n, ''),
          n === 'Shadow Skill' ? 'Everyone comes back from Shadow with one, at level ' + SHADOW_SKILL_LEVEL + '.' : null)),
        house ? row(take('House'), house.options.length
          ? picker(house, v.picks.House, (id) => set(v.picks, 'House', id))
          : textInput(v.picks, 'House', 'Where they live')) : null,
      ]));
    }

    // ── magic: every list of a type the books instantiate, in the actor's order ──
    sp.lists.filter((l) => !placed[l.name]).forEach((l) => {
      const chosen = v.lists[l.name] || [];
      box.appendChild(section(take(l.name), chosen.length ? chosen.length + ' carried' : null, [
        cardPicker(v, redraw, l.name, l.options, { label: (l.type || l.name).toLowerCase(), empty: 'None carried.' }),
      ]));
    });

    // ── bonds and quirks: the rest of what the player writes ──
    const rest = sp.rated.filter((r) => !placed[r.name]);
    if (rest.length) {
      box.appendChild(section('Bonds and quirks', null, rest.map((r) => el('div', {}, [
        el('div', { class: 'prop-k' }, [take(r.name)]),
        ratedList(v, redraw, r, { placeholders: { 'Bond Type': 'the bond', With: 'with whom', Description: 'as written…' } }),
      ]))));
    }

    // ── to look at, to talk to ──
    const texts = sp.texts.filter((t) => !placed[t.name]);
    const lines = sp.lines.filter((l) => !placed[l.name]);
    if (texts.length || lines.length) {
      box.appendChild(section('To look at, and to talk to', null, [
        ...texts.map((t) => row(take(t.name), textInput(v.values, t.name, '', true))),
        ...lines.map((l) => row(take(l.name), textInput(v.lines, l.name, 'one per line', true))),
        row('Notes', textInput(v.lines, 'Notes', 'Neighbours, the desideratum, what came up at the table…', true)),
      ]));
    }

    // ── the foundation's own table, verbatim, because it is what a foundation IS ──
    if (d.foundation) {
      box.appendChild(section('Foundation · ' + d.foundation.name, null, [E.render(d.foundation, { bare: true, noKids: true })]));
    }
    if (d.soul) {
      box.appendChild(section('Soul · ' + d.soul.name, null, [E.render(d.soul, { bare: true, noKids: true })]));
    }

    // ── anything the actor declares that the layout did not name ──
    const also = [];
    sp.picks.filter((p) => !placed[p.name]).forEach((p) => also.push(row(p.name, p.options.length
      ? picker(p, v.picks[p.name], (id) => set(v.picks, p.name, id))
      : textInput(v.picks, p.name, 'The corpus has no ' + (p.type || '').toLowerCase() + ' to choose from'))));
    sp.enums.filter((e2) => !placed[e2.name]).forEach((e2) => {
      const sel = el('select', { class: 'scope' });
      sel.appendChild(el('option', { value: '' }, ['—']));
      e2.options.forEach((x) => sel.appendChild(el('option', { value: x, selected: v.picks[e2.name] === x || null }, [x])));
      sel.addEventListener('change', () => set(v.picks, e2.name, sel.value || null));
      also.push(row(e2.name, sel));
    });
    if (also.length) box.appendChild(section('Also declared', null, also));

    return box;
  }

  // ══ in play: a party member, the live sheet, the roll ══════════════
  // On the GM's page and the player's, a vislae is a party member: the character file
  // the site wrote (`character`), plus what play changes (`live`): the harm and
  // advancement values, bene spent from each pool, and nothing else. The engine's
  // `setPartyLive` carries the changes; a player may send it for their own member.
  const FILE_KIND = 'sortilege-vtt-character';
  const State = () => window.VttState;
  const Bus = () => window.VttBus;
  const actorId = () => (actor() || {}).id || null;

  // The file the site's creator writes, checked and completed.
  function readFile(obj) {
    if (!obj || obj.kind !== FILE_KIND) throw new Error('That is not a character file.');
    const sys = (window.VttConfig || {}).system || 'invisiblesun';
    if (obj.system && obj.system !== sys) throw new Error('That character is for ' + obj.system + ', not Invisible Sun.');
    if (obj.version > 1) throw new Error('That character was saved by a newer build.');
    const v = obj.character;
    if (!v || typeof v !== 'object') throw new Error('The file carries no character.');
    delete v.id;
    return complete(v);
  }

  function memberFrom(v, source) {
    const values = Object.assign({}, v.values || {});
    return {
      id: State().genId('pc'),
      templateId: actorId(),                    // the type every vislae is: the corpus's ACTOR
      name: v.name || 'A vislae',
      character: v,
      live: { values, spent: {} },              // spent: bene taken from each pool since the last refresh
      notes: '', playerNotes: '',
      source: source || null,
    };
  }

  function readMember(obj, fileName) {
    const v = readFile(obj);
    return memberFrom(v, { kind: 'file', name: fileName || null, exportedAt: obj.exported || null, loadedAt: new Date().toISOString() });
  }

  // The member as played, right now, as the same kind of file the site reads back.
  function downloadMember(m) {
    const v = JSON.parse(JSON.stringify(m.character || {}));
    v.name = m.name || v.name;
    v.values = Object.assign({}, v.values || {}, (m.live && m.live.values) || {});
    const file = {
      kind: FILE_KIND, version: 1, system: (window.VttConfig || {}).system || 'invisiblesun',
      corpus: (D.index() || {}).corpus || null, exported: new Date().toISOString(), name: v.name || '', character: v,
    };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (v.name || 'vislae').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.invisiblesun-character.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function member(id) {
    return ((State().state || {}).party || []).find((m) => m.id === id) || null;
  }

  function patchLive(m, key, value) {
    const next = Object.assign({}, (m.live || {})[key] || {}, value);
    State().commit('setPartyLive', [m.id, { [key]: next }]);
  }

  // ── the roll ──
  // "When you have a total, you subtract the venture from the challenge. If the result is
  //  0 or less, you don't need to roll. If the result is 1 or higher, that's the number"
  //  you need on the die (Venture and Challenge, The Key p24). "An enhancement is an
  //  additional die you get to roll ... Rolling a success on either die results in a
  //  success." (Bonuses and Enhancements, The Key p74.) "A bene adds +1 to the action ...
  //  a character can use only one bene per action." (Using Bene, The Key p30.)
  const DIE = 10;
  function doRoll(m, o) {
    const challenge = o.challenge == null || isNaN(o.challenge) ? null : Number(o.challenge);
    const venture = (Number(o.venture) || 0) + (o.bene ? 1 : 0);
    const dice = Array.from({ length: 1 + (Number(o.enhancements) || 0) }, () => 1 + Math.floor(Math.random() * DIE));
    const target = challenge == null ? null : challenge - venture;
    const entry = {
      at: new Date().toISOString(), kind: 'roll', memberId: m.id, who: m.name,
      what: o.what || '', challenge, venture, bene: o.bene || null, enhancements: Number(o.enhancements) || 0,
      dice, target,
      success: target == null ? null : target <= 0 ? true : dice.some((d) => d >= target),
      noRoll: target != null && target <= 0,
    };
    State().commit('appendLog', [entry]);
    Bus().emit('roll', entry);
    return entry;
  }

  function rollLine(entry) {
    const cls = entry.success === true ? ' ok' : entry.success === false ? ' fail' : '';
    return el('div', { class: 'roll-line' + cls }, [
      el('span', { class: 'roll-who' }, [entry.who + (entry.what ? ' · ' + entry.what : '')]),
      el('span', { class: 'roll-dice' }, (entry.dice || []).map((d) => el('span', { class: 'die' + (entry.target != null && d >= entry.target ? ' hit' : '') }, [String(d)]))),
      el('span', { class: 'roll-sum' }, [
        entry.challenge == null ? 'venture ' + entry.venture + ', challenge not stated'
          : entry.noRoll ? 'challenge ' + entry.challenge + ' − venture ' + entry.venture + ' ≤ 0: no roll needed'
            : 'needs ' + entry.target + ' (challenge ' + entry.challenge + ' − venture ' + entry.venture + ')',
      ]),
      entry.bene ? el('span', { class: 'muted small' }, ['bene from ' + entry.bene]) : null,
      entry.enhancements ? el('span', { class: 'muted small' }, ['+' + entry.enhancements + (entry.enhancements === 1 ? ' die' : ' dice')]) : null,
      entry.success === true ? el('b', {}, ['success']) : entry.success === false ? el('b', {}, ['failure']) : null,
    ]);
  }

  // ── the live sheet ──
  function live(m, opts) {
    const o = opts || {};
    const v = complete(m.character || blank());
    const d = derive(v);
    const lv = m.live || { values: {}, spent: {} };
    const values = lv.values || {};
    const spent = lv.spent || {};
    const sp = spec();
    const box = el('article', { class: 'sheet live' });

    // on the player's page, the card that lies on the Path right now, above the sheet
    if (o.player && window.IsSooth) {
      const strip = window.IsSooth.strip();
      if (strip) box.appendChild(strip);
    }

    box.appendChild(el('header', { class: 'sheet-head' }, [
      el('h2', {}, [m.name]),
      el('div', { class: 'sentence' }, [sentence(v, d) || 'a vislae']),
      el('div', { class: 'muted small' }, [
        [d.degreeNow ? d.degreeNow.name : null, d.soul && !o.player ? 'soul: ' + d.soul.name : null].filter(Boolean).join(' · '),
      ]),
    ]));

    // the pools: divided on the sheet, spent at the table
    const poolTile = (p, max) => {
      const used = spent[p] || 0;
      const cur = Math.max(0, max - used);
      return el('div', { class: 'pool live' + (cur === 0 ? ' empty' : '') }, [
        el('div', { class: 'pool-n' }, [p]),
        el('div', { class: 'pool-cur' }, [el('b', {}, [String(cur)]), el('span', { class: 'muted small' }, [' / ' + max])]),
        el('div', { class: 'chiprow tight' }, [
          el('button', { class: 'btn tiny', type: 'button', disabled: cur <= 0 || null, title: 'Spend a bene', onclick: () => patchLive(m, 'spent', { [p]: used + 1 }) }, ['spend']),
          el('button', { class: 'btn ghost tiny', type: 'button', disabled: used <= 0 || null, title: 'Refresh one', onclick: () => patchLive(m, 'spent', { [p]: used - 1 }) }, ['+1']),
        ]),
      ]);
    };
    box.appendChild(section('Pools', 'a bene is +1 to the venture, one per action', [
      el('div', { class: 'pools-wrap' }, [['Certes', CERTES_POOLS, d.certes], ['Qualia', QUALIA_POOLS, d.qualia]].map(([stat, names, total]) => el('div', { class: 'poolgroup' }, [
        el('div', { class: 'poolgroup-h' }, [el('span', { class: 'prop-k' }, [stat + ' pools']), el('span', { class: 'muted small' }, [total != null ? stat + ' ' + total : ''])]),
        el('div', { class: 'pools' }, names.map((p) => poolTile(p, v.pools[p] || 0))),
      ]))),
      el('div', { class: 'chiprow tight' }, [
        el('button', { class: 'btn ghost tiny', type: 'button', onclick: () => State().commit('setPartyLive', [m.id, { spent: {} }]) }, ['Refresh every pool']),
        el('span', { class: 'muted small' }, ['Sortilege is spent for enhancements: each is +1 die.']),
      ]),
    ]));

    // harm and advancement
    const strip = sp.tracks.concat(sp.counters).filter((c) => STATS.indexOf(c.name) === -1 && c.name !== 'Degree');
    box.appendChild(section('Harm and advancement', null, [
      el('div', { class: 'counters' }, strip.map((c) => el('div', { class: 'counter' }, [
        el('div', { class: 'pool-n' }, [c.name]),
        stepper(values[c.name] || 0, c.min, c.max != null ? c.max : null, (n) => patchLive(m, 'values', { [c.name]: n })),
      ]))),
      el('div', { class: 'muted small' }, ['One Joy and one Despair make a Crux; Crux advances the order and the forte, Acumen everything else.']),
    ]));

    // the roll
    const sortCur = Math.max(0, (v.pools.Sortilege || 0) - (spent.Sortilege || 0));
    const what = el('input', { type: 'text', class: 'text small', placeholder: 'what they attempt' });
    const challenge = el('input', { type: 'number', class: 'text small num', placeholder: 'challenge', min: '0', max: '20' });
    const venture = el('input', { type: 'number', class: 'text small num', placeholder: 'venture', value: '0', min: '-5', max: '20' });
    const bene = el('select', { class: 'scope tiny' }, [el('option', { value: '' }, ['no bene'])]);
    CERTES_POOLS.concat(QUALIA_POOLS).forEach((p) => {
      const cur = Math.max(0, (v.pools[p] || 0) - (spent[p] || 0));
      bene.appendChild(el('option', { value: p, disabled: cur <= 0 || null }, ['bene from ' + p + ' (' + cur + ')']));
    });
    const enh = el('select', { class: 'scope tiny' }, Array.from({ length: sortCur + 1 }, (_, i) => el('option', { value: String(i) }, [i === 0 ? 'no enhancement' : '+' + i + (i === 1 ? ' die' : ' dice') + ' from Sortilege'])));
    const rollLog = el('div', { class: 'roll-log' });
    (((State().state || {}).log) || []).filter((x) => x.kind === 'roll' && x.memberId === m.id).slice(-5).reverse().forEach((x) => rollLog.appendChild(rollLine(x)));
    const go = el('button', { class: 'btn', type: 'button' }, ['Roll']);
    go.addEventListener('click', () => {
      const b = bene.value || null;
      const n = Number(enh.value) || 0;
      const patch = {};
      if (b) patch[b] = (spent[b] || 0) + 1;
      if (n) patch.Sortilege = (spent.Sortilege || 0) + n;
      if (Object.keys(patch).length) patchLive(m, 'spent', patch);
      const entry = doRoll(m, { what: what.value.trim(), challenge: challenge.value === '' ? null : challenge.value, venture: venture.value, bene: b, enhancements: n });
      rollLog.prepend(rollLine(entry));
    });
    box.appendChild(section('Roll', 'challenge − venture is the number to roll; any die that meets it succeeds', [
      el('div', { class: 'roll-bar' }, [what, challenge, venture, bene, enh, go]),
      rollLog,
    ]));

    // what they have: the order's and forte's abilities, the magic carried — read here, changed on the site
    if (d.order || d.forte) {
      box.appendChild(section('Abilities', null, [
        d.order ? el('div', {}, [el('div', { class: 'prop-k' }, ['Order · ' + d.order.name]), abilityRows((d.degreeAbilities.length ? d.degreeAbilities.flatMap((g) => g.abilities) : d.orderAbilities), { clip: true })]) : null,
        d.forte ? el('div', {}, [el('div', { class: 'prop-k' }, ['Forte · ' + d.forte.name]), abilityRows(d.forteAbilities, { clip: true })]) : null,
      ]));
    }
    const carried = sp.lists.filter((l) => (v.lists[l.name] || []).length);
    if (carried.length) {
      box.appendChild(section('Carried', null, carried.map((l) => el('div', { class: 'prop' }, [
        el('div', { class: 'prop-k' }, [l.name]),
        el('div', { class: 'prop-v chiprow tight' }, (v.lists[l.name] || []).map((id) => {
          const e2 = D.entity(id);
          return e2 ? el('button', { class: 'chip ' + E.sunClass(D.val(e2, 'Color')), type: 'button', onclick: () => window.IsOpenEntity && window.IsOpenEntity(e2.id) }, [el('span', { class: 'sun-dot' }), ' ', e2.name]) : null;
        })),
      ]))));
    }
    const skills = (v.rated.Skills || []).concat(v.rated.Connections || []);
    if (skills.length) {
      box.appendChild(section('Skills and connections', null, [el('div', { class: 'chiprow tight' }, skills.map((r) => el('span', { class: 'chip' }, [(r.Skill || r.Connection || '—') + (r.Level != null ? ' ' + r.Level : '')])))]));
    }

    if (!o.player && !o.preview) {
      box.appendChild(section('GM notes', 'never sent to players', [
        el('textarea', { class: 'text', rows: 3, oninput: debounce((ev) => State().commit('setPartyNotes', [m.id, ev.target.value]), 400) }, [m.notes || '']),
      ]));
    }
    if (!o.preview) {
      box.appendChild(section('Player notes', null, [
        el('textarea', { class: 'text', rows: 3, oninput: debounce((ev) => State().commit('setPartyPlayerNotes', [m.id, ev.target.value]), 400) }, [m.playerNotes || '']),
      ]));
    }
    return box;
  }

  return {
    spec, blank, complete, derive, sentence, render, facts, blurb, BOOKS,
    readFile, memberFrom, readMember, downloadMember, member, live, doRoll, rollLine, patchLive, FILE_KIND,
    CERTES_POOLS, QUALIA_POOLS, HEART_SKILLS, SHADOW_SKILL_LEVEL, STARTING_DEGREE, FINGERS, STATS, ORDER_PHRASE,
    // the creator walks the same controls over the same draft
    controls: { stepper, picker, row, textInput, truncate, section, poolsBlock, ratedList, cardPicker, abilityRows, choiceCard },
  };
})();
