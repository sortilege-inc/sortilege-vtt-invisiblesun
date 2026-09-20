// system/invisiblesun/sheet.js — a vislae as played.
//
// Nothing about this sheet is hand-listed. Its shape is the corpus's `^"Vislae"` ACTOR,
// read at runtime: an INTEGER with a MAX is a track, an INTEGER without one a counter, a
// `^"X" ^"Type"` a pick from every entity of that type, a `LIST OF ^"Type"` a pick-any of
// the same, a DEF-valued property (the eight pools) a group, an ENUM its own options.
// Add a declaration to the BASE and it appears here; that is why D1 went to the corpus
// rather than into this file.
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
        // a list of a type the corpus declares but never instantiates is a list the
        // player writes themselves (a skill, a connection, a bond)
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

  // ── what the choices grant ─────────────────────────────────────────
  // Read off the chosen entities, never stored: change the heart and the numbers change.
  function derive(v) {
    const heart = D.entity(v.picks.Heart);
    const foundation = D.entity(v.picks.Foundation);
    const order = D.entity(v.picks.Order);
    const forte = D.entity(v.picks.Forte);
    const certes = heart ? D.val(heart, 'Starting Certes') : null;
    const qualia = heart ? D.val(heart, 'Starting Qualia') : null;
    const hidden = foundation ? D.val(foundation, 'Hidden Knowledge') : null;
    const spent = (pools) => pools.reduce((n, p) => n + (v.pools[p] || 0), 0);
    return {
      heart, foundation, order, forte,
      certes, qualia, hidden,
      certesSpent: spent(CERTES_POOLS), qualiaSpent: spent(QUALIA_POOLS),
      degree: v.values.Degree || STARTING_DEGREE,
      // the abilities the order grants at the character's degree, in the corpus's own nesting
      degreeAbilities: order ? D.children(order.id)
        .filter((d) => d.slot === 'DEGREES' && D.val(d, 'Degree') <= (v.values.Degree || STARTING_DEGREE))
        .map((d) => ({ degree: d, abilities: D.children(d.id) })) : [],
      forteAbilities: forte ? D.children(forte.id) : [],
      heartSkills: heart ? (D.val(heart, 'Skills') || []).map((i) => i.value) : [],
    };
  }

  // ── controls ───────────────────────────────────────────────────────
  function stepper(value, min, max, onset) {
    const show = el('span', { class: 'step-v' }, [String(value)]);
    const go = (n) => onset(Math.max(min, max != null ? Math.min(max, n) : n));
    return el('span', { class: 'stepper' }, [
      el('button', { class: 'btn tiny', type: 'button', onclick: () => go(value - 1) }, ['−']),
      show,
      el('button', { class: 'btn tiny', type: 'button', onclick: () => go(value + 1) }, ['+']),
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

  // ── the sheet ──────────────────────────────────────────────────────
  // `redraw` is the page's own; this renders into a fresh node each time. Nothing here
  // writes to storage — the sheet is a preview until a later phase gives it a campaign.
  function render(v, redraw) {
    const sp = spec();
    const d = derive(v);
    const box = el('div', { class: 'sheet' });
    const set = (obj, k, val) => { obj[k] = val; redraw(); };

    // name and the six fingers
    const name = el('input', { type: 'text', class: 'text', value: v.name || '', placeholder: 'Their name' });
    name.addEventListener('change', () => { v.name = name.value.trim(); });
    box.appendChild(el('h3', {}, ['The vislae']));
    box.appendChild(row('Name', name));
    sp.picks.forEach((p) => {
      const chosen = D.entity(v.picks[p.name]);
      box.appendChild(row(p.name,
        p.options.length ? picker(p, v.picks[p.name], (id) => set(v.picks, p.name, id))
          : textInput(v.picks, p.name, 'The corpus has no ' + (p.type || '').toLowerCase() + ' to choose from'),
        chosen ? (D.text(chosen, 'Tagline') || truncate(D.text(chosen, 'Description') || D.text(chosen, 'Descriptor') || '', 150)) : null));
    });
    sp.enums.forEach((e2) => {
      const sel = el('select', { class: 'scope' });
      sel.appendChild(el('option', { value: '' }, ['—']));
      e2.options.forEach((o) => sel.appendChild(el('option', { value: o, selected: v.picks[e2.name] === o || null }, [o])));
      sel.addEventListener('change', () => set(v.picks, e2.name, sel.value || null));
      box.appendChild(row(e2.name, sel));
    });

    // the statistics, and the pools they are divided into
    box.appendChild(el('h4', {}, ['Statistics']));
    ['Certes', 'Qualia', 'Hidden Knowledge'].forEach((n) => {
      const granted = n === 'Certes' ? d.certes : n === 'Qualia' ? d.qualia : d.hidden;
      const from = n === 'Hidden Knowledge' ? 'foundation' : 'heart';
      box.appendChild(row(n,
        el('b', {}, [granted != null ? String(granted) : '—']),
        granted != null ? 'from the ' + from : 'choose a ' + from + ' and this is set'));
    });
    box.appendChild(el('div', { class: 'muted small' }, [
      'The points of a stat are divided into its four pools; points left undivided serve no purpose.',
    ]));
    sp.pools.forEach(() => {
      [['Certes', CERTES_POOLS, d.certes, d.certesSpent], ['Qualia', QUALIA_POOLS, d.qualia, d.qualiaSpent]].forEach(([stat, names, total, spent]) => {
        box.appendChild(el('div', { class: 'poolgroup' }, [
          el('div', { class: 'prop-k' }, [stat + ' pools']),
          el('div', { class: 'muted small' }, [total != null ? spent + ' of ' + total + ' divided' : String(spent) + ' assigned']),
          el('div', { class: 'pools' }, names.map((p) => el('div', { class: 'pool' }, [
            el('div', { class: 'pool-n' }, [p]),
            stepper(v.pools[p] || 0, 0, null, (n) => set(v.pools, p, n)),
          ]))),
        ]));
      });
    });

    // the tracks and counters the actor declares
    box.appendChild(el('h4', {}, ['Harm and advancement']));
    const grid = el('div', { class: 'counters' });
    sp.tracks.concat(sp.counters).forEach((c) => {
      if (['Certes', 'Qualia', 'Hidden Knowledge'].indexOf(c.name) !== -1) return;
      grid.appendChild(el('div', { class: 'counter' }, [
        el('div', { class: 'pool-n' }, [c.name]),
        stepper(v.values[c.name] || 0, c.min, c.max != null ? c.max : null, (n) => set(v.values, c.name, n)),
      ]));
    });
    box.appendChild(grid);

    // what the order and the forte grant, from the corpus's own nesting
    if (d.order) {
      box.appendChild(el('h4', {}, ['Order · ' + d.order.name + ' · degree ' + d.degree]));
      d.degreeAbilities.forEach((g) => {
        box.appendChild(el('div', { class: 'muted small' }, [g.degree.name]));
        box.appendChild(el('ul', { class: 'items' }, g.abilities.map((ab) => el('li', {}, [
          el('b', {}, [ab.name]), ' ', D.text(ab, 'Effect') || '',
        ]))));
      });
    }
    if (d.forte) {
      box.appendChild(el('h4', {}, ['Forte · ' + d.forte.name]));
      box.appendChild(el('div', { class: 'cards' }, d.forteAbilities.map((ab) => E.card(ab, () => window.IsOpenEntity(ab.id)))));
    }
    if (d.heartSkills.length) {
      box.appendChild(el('h4', {}, ['Skills the heart offers']));
      box.appendChild(el('div', { class: 'muted small' }, ['A heart grants a pair of these; the rest are bought with Acumen.']));
      box.appendChild(el('div', { class: 'chiprow' }, d.heartSkills.map((s) => {
        const on = (v.rated.Skills || []).some((r) => r.Skill === s);
        return el('button', {
          class: 'btn' + (on ? '' : ' ghost'), type: 'button',
          onclick: () => {
            const cur = (v.rated.Skills || []).slice();
            const i = cur.findIndex((r) => r.Skill === s);
            if (i >= 0) cur.splice(i, 1);
            else if (cur.length < HEART_SKILLS) cur.push({ Skill: s, Level: 1, Kind: null });
            set(v.rated, 'Skills', cur);
          },
        }, [s]);
      })));
    }

    // the rated lists the corpus declares but leaves to the player, and the free lines
    sp.rated.forEach((r) => {
      const rows = v.rated[r.name] || [];
      box.appendChild(el('h4', {}, [
        r.name,
        r.level ? el('span', { class: 'muted small' }, [' · ' + r.level.name.toLowerCase() + ' ' + r.level.min + '–' + r.level.max]) : null,
      ]));
      box.appendChild(el('div', {}, rows.map((entry, i) => el('div', { class: 'chiprow' }, [
        el('span', {}, [entry[r.field] || '—']),
        r.level ? stepper(entry[r.level.name] || 0, r.level.min, r.level.max, (n) => { rows[i][r.level.name] = n; redraw(); }) : null,
        el('button', { class: 'btn ghost tiny', type: 'button', onclick: () => { rows.splice(i, 1); redraw(); } }, ['remove']),
      ]))));
      const add = el('input', { type: 'text', class: 'text', placeholder: 'Add a ' + (r.type || r.name).toLowerCase() + '…' });
      add.addEventListener('change', () => {
        if (!add.value.trim()) return;
        const entry = { [r.field]: add.value.trim() };
        if (r.level) entry[r.level.name] = 1;
        set(v.rated, r.name, (v.rated[r.name] || []).concat([entry]));
      });
      box.appendChild(add);
    });

    sp.texts.forEach((t) => box.appendChild(row(t.name, textInput(v.values, t.name),
      t.name === 'Shadow Skill' ? 'Everyone comes back from Shadow with one, at level ' + SHADOW_SKILL_LEVEL + '.' : null)));
    sp.lines.forEach((l) => box.appendChild(row(l.name, textInput(v.lines, l.name, 'one per line', true))));

    // the magic and the bonds: pick-any from every entity of the type in the books
    box.appendChild(el('h4', {}, ['What they carry and who they know']));
    sp.lists.forEach((l) => {
      const chosen = v.lists[l.name] || [];
      box.appendChild(row(l.name + (chosen.length ? ' · ' + chosen.length : ''),
        el('div', {}, [
          el('div', { class: 'chiprow' }, chosen.map((id) => {
            const e2 = D.entity(id);
            return el('button', {
              class: 'btn tiny', type: 'button', title: 'remove',
              onclick: () => set(v.lists, l.name, chosen.filter((x) => x !== id)),
            }, [(e2 && e2.name) || id, ' ×']);
          })),
          l.options.length ? picker({ options: l.options.filter((o) => chosen.indexOf(o.id) === -1), type: l.type, name: l.name },
            null, (id) => id && set(v.lists, l.name, chosen.concat([id])), 'Add ' + (l.type || l.name).toLowerCase() + '…')
            : el('span', { class: 'muted small' }, ['nothing of this type is in the loaded books']),
        ])));
    });

    // the foundation's own table, verbatim, because it is what a foundation IS
    if (d.foundation) {
      box.appendChild(el('h4', {}, ['Foundation · ' + d.foundation.name]));
      box.appendChild(E.render(d.foundation, { bare: true }));
    }
    return box;
  }

  function textInput(obj, key, placeholder, multiline) {
    const node = multiline
      ? el('textarea', { rows: 3, class: 'text', placeholder: placeholder || '' }, [obj[key] || ''])
      : el('input', { type: 'text', class: 'text', value: obj[key] || '', placeholder: placeholder || '' });
    node.addEventListener('change', () => { obj[key] = node.value.trim(); });
    return node;
  }

  function truncate(s, n) {
    return s && s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
  }

  return {
    spec, blank, derive, render, BOOKS,
    CERTES_POOLS, QUALIA_POOLS, HEART_SKILLS, SHADOW_SKILL_LEVEL, STARTING_DEGREE,
    // the creator walks the same controls over the same draft
    controls: { stepper, picker, row, textInput, truncate },
  };
})();
