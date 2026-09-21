// system/invisiblesun/creator.js — making a vislae, by the book.
//
// The steps are not a list someone wrote here: they are *The Key*'s own headings, and at
// each one the book's text is shown verbatim from the entity of that name — beside the
// decision, the way the reader sets a rule beside its margin. The controls are the
// sheet's (system/invisiblesun/sheet.js), over the same draft object, so the thing being
// built is the thing that will be played.
//
// What the tool adds is arithmetic the book asks the player to do — how many points of a
// stat are still undivided, how many of a grant have been taken — never a rule of its own.
// Where a number lives only in prose it is a named constant in sheet.js citing its
// sentence, and where the book states a limit it cannot enforce (a Vance's grimoire is
// six spells of a class the corpus does not carry), the sentence is quoted beside the
// picker and the count shown, rather than a guess being enforced.
//
// The characters themselves live in the roster (system/invisiblesun/roster.js): several
// per browser, one current. A file is the durable form.
window.IsCreator = (function () {
  const { el, paragraphs } = window.VttRender;
  const D = window.IsData;
  const E = window.IsEntity;
  const Sheet = window.IsSheet;
  const Roster = window.IsRoster;
  const C = () => Sheet.controls;

  const FILE_KIND = 'sortilege-vtt-character';

  // ── the walk ───────────────────────────────────────────────────────
  // `texts` are entity names in The Key. Each step shows them verbatim, in the order the
  // book prints them, and then whatever it asks the player to decide. `optional` marks
  // what the book leaves to the player; everything else the checklist asks for.
  const STEPS = [
    { id: 'begin', label: 'The Testament', short: 'Testament',
      texts: ['Creating a Vislae Character', 'The Six Fingers of the Testament of Suns'] },
    { id: 'style', label: 'Step 0 · Style', short: 'Style', optional: true,
      texts: ['Step 0: Choose a Roleplaying Style'], enumProp: 'Roleplaying Style',
      styleTexts: ['Builder', 'Explorer', 'Attainer', 'Achiever'] },
    { id: 'order', label: 'Step 1 · Order', short: 'Order', texts: ['Step 1: Choose an Order'], pick: 'Order' },
    { id: 'heart', label: 'Step 2 · Heart', short: 'Heart',
      texts: ['Step 2: Choose a Heart', 'Stat Scores', 'Stat Pools'], pick: 'Heart',
      pools: true, heartSkills: true },
    { id: 'forte', label: 'Step 3 · Forte', short: 'Forte', texts: ['Step 3: Choose a Forte'], pick: 'Forte', forte: true },
    { id: 'soul', label: 'Step 4 · Soul', short: 'Soul', texts: ['Step 4: Choose a Soul'], pick: 'Soul Allegiance' },
    { id: 'foundation', label: 'Step 5 · Foundation', short: 'Foundation',
      texts: ['Step 5: Build a Foundation'], pick: 'Foundation', foundation: true,
      more: ['Vislae Houses', 'Connections', 'Shadow Skill', 'Shadow Memento', 'Quirks'] },
    { id: 'arc', label: 'Step 6 · Arc', short: 'Arc',
      texts: ['Step 6: Choose a Character Arc', 'Beginning a New Arc'], list: 'Character Arcs' },
    { id: 'bonds', label: 'Step 7 · Bonds', short: 'Bonds',
      texts: ['Step 7: Form Bonds'], bonds: true, more: ['NPC Bonds', 'The Process'] },
    { id: 'magic', label: 'What the order gives', short: 'Magic', optional: true, magic: true },
    { id: 'touches', label: 'Finishing touches', short: 'Touches',
      texts: ['Finishing Touches', 'Name', 'Appearance', 'Languages'], touches: true },
    { id: 'done', label: 'The vislae', short: 'Sheet', done: true },
  ];

  // ── the file a finished vislae leaves as ───────────────────────────
  function toFile(v) {
    const out = Object.assign({}, v);
    delete out.id;                                  // the roster's, not the character's
    return {
      kind: FILE_KIND,
      version: 1,
      system: (window.VttConfig || {}).system || 'invisiblesun',
      corpus: (D.index() || {}).corpus || null,
      exported: new Date().toISOString(),
      name: v.name || '',
      character: out,
    };
  }

  function readCharacter(obj) {
    if (!obj || obj.kind !== FILE_KIND) throw new Error('That is not a character file.');
    if (obj.system && obj.system !== ((window.VttConfig || {}).system || 'invisiblesun')) {
      throw new Error('That character is for ' + obj.system + ', not Invisible Sun.');
    }
    const v = obj.character;
    if (!v || typeof v !== 'object') throw new Error('The file carries no character.');
    delete v.id;
    return Sheet.complete(v);
  }

  function download(v) {
    const blob = new Blob([JSON.stringify(toFile(v), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (v.name || 'vislae').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      + '.invisiblesun-character.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ── the book's own words at each step ──────────────────────────────
  const KEY = ['key'];

  function entityNamed(name) {
    return D.all(KEY).find((e) => e.name === name && e.type === 'Rule') || null;
  }

  function guide(names, open) {
    const wrap = el('div', {});
    (names || []).forEach((n, i) => {
      const e = entityNamed(n);
      if (!e) return;
      const body = el('div', {}, [
        paragraphs(D.text(e, 'Text'), 'prose'),
        ...(e.guidance || []).map((g) => el('aside', { class: 'guidance' }, [
          el('div', { class: 'guidance-k' }, [g.name || 'Sidebar']),
          paragraphs(g.text, 'prose'),
        ])),
      ]);
      wrap.appendChild(el('details', { class: 'guide', open: (open === undefined ? i === 0 : open) || null }, [
        el('summary', {}, [
          e.name,
          el('span', { class: 'muted small' }, [' · The Key, page ' + D.val(e, 'Page')]),
        ]),
        body,
      ]));
    });
    return wrap;
  }

  // ── what the book still asks for ───────────────────────────────────
  // Each ask names the step it is settled at. This is the checklist and the chips' colour.
  function asks(v, st) {
    const d = st.d;
    const out = [];
    const ask = (step, text) => out.push({ step, text });
    if (!d.order) ask('order', 'Choose an order');
    if (!d.heart) ask('heart', 'Choose a heart');
    else {
      if (st.certesLeft > 0) ask('heart', 'Divide ' + st.certesLeft + ' more Certes ' + (st.certesLeft === 1 ? 'point' : 'points'));
      if (st.qualiaLeft > 0) ask('heart', 'Divide ' + st.qualiaLeft + ' more Qualia ' + (st.qualiaLeft === 1 ? 'point' : 'points'));
      if (st.certesLeft < 0) ask('heart', 'Certes is ' + (-st.certesLeft) + ' over');
      if (st.qualiaLeft < 0) ask('heart', 'Qualia is ' + (-st.qualiaLeft) + ' over');
      if (d.heartPair < Sheet.HEART_SKILLS) ask('heart', 'Pick the pair of skills the heart grants');
    }
    if (!d.forte) ask('forte', 'Choose a forte');
    if (!d.soul) ask('soul', 'Choose a soul');
    if (!d.foundation) ask('foundation', 'Build a foundation');
    if (!(v.lists['Character Arcs'] || []).length) ask('arc', 'Choose a character arc');
    if (!(v.rated['PC Bonds'] || []).length) ask('bonds', 'Form a bond with another player character');
    if (!(v.name || '').trim()) ask('touches', 'Name them');
    return out;
  }

  // ── completion, by what the book asks for ──────────────────────────
  function state(v) {
    const d = Sheet.derive(v);
    const certesLeft = d.certes == null ? null : d.certes - d.certesSpent;
    const qualiaLeft = d.qualia == null ? null : d.qualia - d.qualiaSpent;
    const st = { d, certesLeft, qualiaLeft };
    st.asks = asks(v, st);
    const pending = (step) => st.asks.some((a) => a.step === step);
    st.done = {
      begin: true,
      style: !!v.picks['Roleplaying Style'],
      order: !!d.order,
      heart: !!d.heart && !pending('heart'),
      forte: !!d.forte,
      soul: !!d.soul,
      foundation: !!d.foundation,
      arc: !pending('arc'),
      bonds: !pending('bonds'),
      magic: Sheet.spec().lists.some((l) => l.name !== 'Character Arcs' && (v.lists[l.name] || []).length > 0),
      touches: !pending('touches'),
      done: false,
    };
    return st;
  }

  // What a step's chip says was decided there.
  function summary(step, v, st) {
    const d = st.d;
    const n = (x) => (x ? x.name : null);
    switch (step.id) {
      case 'style': return v.picks['Roleplaying Style'] || null;
      case 'order': return n(d.order);
      case 'heart': return n(d.heart);
      case 'forte': return n(d.forte);
      case 'soul': return n(d.soul);
      case 'foundation': return n(d.foundation);
      case 'arc': { const k = (v.lists['Character Arcs'] || []).length; return k ? k + (k === 1 ? ' arc' : ' arcs') : null; }
      case 'bonds': { const k = (v.rated['PC Bonds'] || []).length + (v.rated['NPC Bonds'] || []).length; return k ? k + (k === 1 ? ' bond' : ' bonds') : null; }
      case 'magic': {
        const k = Sheet.spec().lists.filter((l) => l.name !== 'Character Arcs').reduce((s, l) => s + (v.lists[l.name] || []).length, 0);
        return k ? k + ' taken' : null;
      }
      case 'touches': return v.name || null;
      default: return null;
    }
  }

  // ── choosing: a grid of cards, or the one chosen with a way back ───
  // `changing` is page state, not the character's: which steps have their grid open again.
  const changing = {};

  function pickBlock(v, redraw, step, options) {
    const name = step.pick;
    const chosen = D.entity(v.picks[name]);
    if (chosen && !changing[step.id]) {
      return el('div', { class: 'chosen-wrap' }, [
        C().choiceCard(chosen, true, () => { changing[step.id] = true; redraw(); },
          el('span', { class: 'btn ghost tiny change' }, ['change'])),
      ]);
    }
    return el('div', { class: 'choose' }, options.map((o) => C().choiceCard(o, chosen && chosen.id === o.id, () => {
      v.picks[name] = o.id;
      changing[step.id] = false;
      redraw();
    })));
  }

  // The book's own account of the chosen thing — its properties, verbatim, without the
  // degrees or abilities that hang under it; those the step lays out itself.
  function about(e, omit) {
    const skip = omit || [];
    const box = el('div', { class: 'about' });
    (e.props || []).forEach((p) => {
      if (skip.indexOf(p.name) !== -1 || ['Book', 'Page', 'Level', 'Chapter', 'Section', 'Deck'].indexOf(p.name) !== -1) return;
      if (p.value === undefined && p.vk !== 'list' && p.vk !== 'def') return;
      const v = p.vk === 'list'
        ? (p.items && p.items.length ? el('div', { class: 'chiprow tight' }, p.items.map((it) => el('span', { class: 'chip' }, [it.vk === 'ref' ? it.name : String(it.value)]))) : null)
        : p.vk === 'def' ? null
          : p.name === 'Color' ? E.sun(p.value)
            : paragraphs(String(p.value), 'prose');
      if (!v) return;
      box.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, [p.name]), el('div', { class: 'prop-v' }, [v])]));
    });
    return box;
  }

  const inBook = (e, label) => el('a', {
    class: 'btn ghost tiny', href: window.VttSite ? window.VttSite.href('books', [e.book, e.id]) : '#',
  }, [label || 'In the book']);

  // ── the creator ────────────────────────────────────────────────────
  function render(container, path, ctx) {
    const need = Sheet.BOOKS.filter((b) => !window.VttData.has(b, 'main'));
    if (need.length) {
      container.appendChild(el('div', { class: 'page' }, [
        el('h2', {}, ['Make a vislae']),
        el('div', { class: 'empty' }, ['Fetching the books a character is made from…']),
      ]));
      window.VttData.ready(Sheet.BOOKS, ['main']).then(() => {
        container.innerHTML = '';
        render(container, path, ctx);
      });
      return;
    }

    const stepId = STEPS.some((s) => s.id === path[0]) ? path[0] : null;
    if (!stepId) return renderRoster(container, ctx);

    let v = Roster.current();
    if (!v) {
      v = Sheet.blank();
      Roster.add(v);
    } else Sheet.complete(v);
    const step = STEPS.find((s) => s.id === stepId);
    const st = state(v);

    const redraw = () => {
      Roster.save(v);
      const y = window.scrollY;
      container.innerHTML = '';
      render(container, path, ctx);
      window.scrollTo(0, y);
    };

    const page = el('div', { class: 'page creator' });
    container.appendChild(page);

    // ── head: who is being made, and what the book still asks ──
    const name = el('input', { type: 'text', class: 'text name-inline', value: v.name || '', placeholder: 'Their name', 'aria-label': 'Name' });
    name.addEventListener('change', () => { v.name = name.value.trim(); redraw(); });
    const first = st.asks[0];
    page.appendChild(el('div', { class: 'creator-head' }, [
      el('div', { class: 'creator-title' }, [
        el('a', { class: 'crumbs', href: ctx.href('creator', []) }, ['‹ The roster']),
        el('h2', {}, ['Make a vislae']),
      ]),
      el('div', { class: 'creator-who' }, [
        step.done ? null : name,
        step.done ? null : el('div', { class: 'sentence' }, [Sheet.sentence(v, st.d) || 'The Key builds a character in six steps, and then two more.']),
        v.startedFrom && !step.done ? el('div', { class: 'muted small' }, [
          'Started from ', el('i', {}, [v.startedFrom.name]),
          ', whom ' + (v.startedFrom.book || 'The Key') + ' illustrates on page ' + v.startedFrom.page + '.',
        ]) : null,
        el('div', { class: 'muted small asks-line' }, st.asks.length
          ? [st.asks.length === 1 ? 'One thing the book still asks: ' : st.asks.length + ' things the book still asks; first: ',
            el('a', { href: ctx.href('creator', [first.step]) }, [first.text]), '.']
          : ['Everything the book asks for is decided.']),
      ]),
    ]));

    // ── the walk so far ──
    const steps = el('ol', { class: 'creator-steps' }, STEPS.map((s) => {
      const sum = summary(s, v, st);
      const pending = st.asks.some((a) => a.step === s.id);
      return el('li', {
        class: (s.id === stepId ? 'current' : '') + (st.done[s.id] ? ' done' : '') + (pending ? ' pending' : ''),
      }, [el('a', { href: ctx.href('creator', [s.id]), title: s.label }, [
        el('span', { class: 'step-l' }, [s.label]),
        el('span', { class: 'step-s' }, [s.short]),
        sum ? el('span', { class: 'step-pick' }, [sum]) : null,
      ])]);
    }));
    page.appendChild(steps);

    // ── the decision, and the book beside it ──
    const main = el('div', { class: 'creator-main' });
    const aside = step.texts || step.more ? el('details', {
      class: 'creator-book', open: window.matchMedia('(min-width: 901px)').matches || null,
    }, [
      el('summary', {}, ['What The Key says']),
      step.texts ? guide(step.texts, true) : null,
      step.more ? guide(step.more, false) : null,
    ]) : null;
    page.appendChild(el('div', { class: 'creator-body' + (aside ? '' : ' alone') }, [main, aside]));

    // ── each step's own business ──
    if (step.id === 'begin') {
      main.appendChild(el('p', { class: 'muted' }, [
        'The Key builds a character in six steps, and then two more. Each step is the book’s own — its text is beside you as you go, and what you decide here is the sheet you will play from.',
      ]));
      main.appendChild(el('div', { class: 'chiprow' }, [
        el('a', { class: 'btn', href: ctx.href('creator', ['style']) }, ['Step 0 · Style ›']),
        el('a', { class: 'btn ghost', href: ctx.href('creator', ['order']) }, ['Skip to Step 1 · Order ›']),
      ]));
    }

    if (step.enumProp) {
      const sp = Sheet.spec().enums.find((e) => e.name === step.enumProp);
      main.appendChild(el('div', { class: 'choose' }, (sp ? sp.options : []).map((o) => {
        const e = entityNamed(o);
        const on = v.picks[step.enumProp] === o;
        return el('button', {
          class: 'choice' + (on ? ' on' : ''), type: 'button',
          onclick: () => { v.picks[step.enumProp] = on ? null : o; redraw(); },
        }, [
          el('div', { class: 'card-name' }, [o]),
          e ? el('div', { class: 'card-desc' }, [C().truncate((D.text(e, 'Text') || '').replace(/\n+/g, ' '), 260)]) : null,
        ]);
      })));
      main.appendChild(el('p', { class: 'muted small' }, ['Step 0 shapes nothing on the sheet; it tells the GM what you are playing for. Leave it if you like.']));
    }

    if (step.pick) {
      const sp = Sheet.spec().picks.find((p) => p.name === step.pick);
      main.appendChild(pickBlock(v, redraw, step, sp ? sp.options : []));
    }

    const d = st.d;

    if (step.id === 'order' && d.order && !changing[step.id]) {
      main.appendChild(about(d.order));
      const first = d.degreeAbilities.length ? d.degreeAbilities[0] : null;
      main.appendChild(el('h4', {}, [first ? first.degree.name : 'What an ' + d.order.name + ' has']));
      if (first && D.text(first.degree, 'Requirements')) main.appendChild(paragraphs(D.text(first.degree, 'Requirements'), 'prose muted small'));
      main.appendChild(C().abilityRows(first ? first.abilities : d.orderAbilities, { clip: true }));
      main.appendChild(el('div', { class: 'chiprow' }, [
        inBook(d.order, first ? 'All six degrees, in the book' : 'In the book'),
        el('a', { class: 'btn ghost tiny', href: ctx.href('creator', ['magic']) }, ['What the order gives ›']),
      ]));
    }

    if (step.pools) {
      main.appendChild(el('h4', {}, ['Divide the points']));
      if (d.heart && !changing[step.id]) main.appendChild(about(d.heart, ['Tagline', 'Skills', 'Starting Certes', 'Starting Qualia']));
      main.appendChild(C().poolsBlock(v, redraw, d, true));
    }

    if (step.heartSkills && d.heartSkills.length) {
      main.appendChild(el('h4', {}, ['The skills your heart grants',
        el('span', { class: 'muted small' }, [' · a pair of them · ' + d.heartPair + ' of ' + Sheet.HEART_SKILLS + ' chosen']),
      ]));
      main.appendChild(el('div', { class: 'chiprow' }, d.heartSkills.map((s) => {
        const on = (v.rated.Skills || []).some((r) => r.Skill === s);
        return el('button', {
          class: 'btn' + (on ? '' : ' ghost'), type: 'button',
          disabled: (!on && d.heartPair >= Sheet.HEART_SKILLS) || null,
          onclick: () => {
            const cur = (v.rated.Skills || []).slice();
            const i = cur.findIndex((r) => r.Skill === s);
            if (i >= 0) cur.splice(i, 1);
            else cur.push({ Skill: s, Level: 1, Kind: null });
            v.rated.Skills = cur;
            redraw();
          },
        }, [s]);
      })));
    }

    if (step.forte && d.forte && !changing[step.id]) {
      main.appendChild(about(d.forte));
      main.appendChild(el('h4', {}, ['The path its abilities are taken along']));
      main.appendChild(el('p', { class: 'muted small' }, [
        'A forte’s abilities are taken along the path the book draws for it, starting at the first and spending Crux for each one after. The path is the book’s own, drawn here from its edges.',
      ]));
      main.appendChild(E.fortePath(d.forte));
      main.appendChild(C().abilityRows(d.forteAbilities, { clip: true }));
      main.appendChild(el('div', { class: 'chiprow' }, [inBook(d.forte)]));
    }

    if (step.id === 'soul' && d.soul && !changing[step.id]) {
      main.appendChild(about(d.soul));
      main.appendChild(el('p', { class: 'muted small' }, ['A soul is kept secret — it is the unspoken part of the describing sentence, and the sheet never says it aloud.']));
    }

    if (step.foundation && d.foundation && !changing[step.id]) {
      main.appendChild(el('h4', {}, ['As the book prints it']));
      main.appendChild(E.render(d.foundation, { bare: true, noKids: true }));
    }
    if (step.foundation) {
      const sp = Sheet.spec();
      main.appendChild(el('h4', {}, ['Your house, and what came back from Shadow']));
      ['House', 'Shadow Skill', 'Shadow Memento'].forEach((n) => {
        const target = n === 'House' ? v.picks : v.values;
        main.appendChild(C().row(n, C().textInput(target, n, n === 'House' ? 'Where they live' : '', false, () => Roster.save(v)),
          n === 'Shadow Skill' ? 'Everyone comes back from Shadow with one, at level ' + Sheet.SHADOW_SKILL_LEVEL + '.' : null));
      });
      ['Connections', 'Quirks'].forEach((n) => {
        const r = sp.rated.find((x) => x.name === n);
        if (!r) return;
        main.appendChild(el('h4', {}, [n]));
        main.appendChild(C().ratedList(v, redraw, r, { placeholders: { Connection: 'A group or organisation…', Description: 'Pick one from the list in the book, or write your own…' } }));
      });
    }

    if (step.list) {
      const sp = Sheet.spec().lists.find((l) => l.name === step.list);
      main.appendChild(C().cardPicker(v, redraw, step.list, sp ? sp.options : [], { label: 'an arc', open: !(v.lists[step.list] || []).length, empty: 'No arc yet — the book asks for one to begin with.' }));
    }

    if (step.bonds) {
      const sp = Sheet.spec();
      [['PC Bonds', 'Bonds with the other player characters', { 'Bond Type': 'The bond (Close Friends, Rivals, Soulmates…)', With: 'with whom', Description: 'as written…' }],
        ['NPC Bonds', 'Bonds with people who are not player characters', { 'Bond Type': 'Associate, Contact, Friend, Lover, Relative…', Benefit: 'benefit', Drawback: 'drawback' }]].forEach(([n, title, ph]) => {
        const r = sp.rated.find((x) => x.name === n);
        if (!r) return;
        main.appendChild(el('h4', {}, [title]));
        main.appendChild(C().ratedList(v, redraw, r, { placeholders: ph }));
      });
      main.appendChild(el('h4', {}, ['The neighbourhood, and what the group makes of it']));
      main.appendChild(C().textInput(v.lines, 'Notes', 'Neighbours, points of interest, local issues, the desideratum…', true, () => Roster.save(v)));
    }

    if (step.magic) {
      const order = d.order;
      if (!order) {
        main.appendChild(el('div', { class: 'empty' }, ['Choose an order first: what a vislae begins with is what their order gives them.']));
        main.appendChild(el('div', { class: 'chiprow' }, [el('a', { class: 'btn', href: ctx.href('creator', ['order']) }, ['Step 1 · Order ›'])]));
      } else {
        const first = d.degreeAbilities.length ? d.degreeAbilities[0] : null;
        main.appendChild(el('h4', {}, [first ? first.degree.name : 'What an ' + order.name + ' has']));
        main.appendChild(el('p', { class: 'muted small' }, [
          'Printed in ', el('i', {}, ['The Key']),
          '. The books state these grants in prose, so they are shown as printed and counted, not enforced.',
        ]));
        main.appendChild(C().abilityRows(first ? first.abilities : d.orderAbilities));
        const spec = Sheet.spec();
        spec.lists.filter((l) => l.name !== 'Character Arcs' && l.options.length).forEach((l) => {
          const k = (v.lists[l.name] || []).length;
          main.appendChild(el('h4', {}, [l.name, el('span', { class: 'muted small' }, [' · ' + (k ? k + ' taken' : 'none taken')])]));
          main.appendChild(C().cardPicker(v, redraw, l.name, l.options, { label: (l.type || l.name).toLowerCase(), empty: 'None taken.' }));
        });
      }
    }

    if (step.touches) {
      main.appendChild(C().row('Name', (() => {
        const n2 = el('input', { type: 'text', class: 'text', value: v.name || '', placeholder: 'Their name' });
        n2.addEventListener('change', () => { v.name = n2.value.trim(); redraw(); });
        return n2;
      })()));
      main.appendChild(C().row('Appearance', C().textInput(v.values, 'Appearance', '', true, () => Roster.save(v))));
      main.appendChild(C().row('Languages', C().textInput(v.lines, 'Languages', 'Indigo and the Invisible Tongue, and any others', true, () => Roster.save(v))));
    }

    if (step.done) {
      main.appendChild(el('div', { class: 'chiprow no-print' }, [
        el('button', { class: 'btn', type: 'button', onclick: () => download(v) }, ['Download as a file']),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => window.print() }, ['Print']),
        el('a', { class: 'btn ghost', href: ctx.href('creator', []) }, ['The roster']),
      ]));
      if (st.asks.length) {
        main.appendChild(el('div', { class: 'asks no-print' }, [
          el('div', { class: 'prop-k' }, ['What the book still asks for']),
          el('ul', { class: 'items' }, st.asks.map((a) => el('li', {}, [el('a', { href: ctx.href('creator', [a.step]) }, [a.text])]))),
        ]));
      }
      main.appendChild(Sheet.render(v, redraw));
    } else {
      const i = STEPS.findIndex((s) => s.id === stepId);
      page.appendChild(el('div', { class: 'chiprow creator-nav' }, [
        i > 0 ? el('a', { class: 'btn ghost', href: ctx.href('creator', [STEPS[i - 1].id]) }, ['‹ ' + STEPS[i - 1].label]) : null,
        el('span', { class: 'grow' }),
        i < STEPS.length - 1 ? el('a', { class: 'btn', href: ctx.href('creator', [STEPS[i + 1].id]) }, [STEPS[i + 1].label + ' ›']) : null,
      ]));
    }

    // the current chip in view on a narrow screen
    const cur = steps.querySelector('li.current');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  // ── the roster: the vislae this browser keeps ──────────────────────
  function renderRoster(container, ctx) {
    const page = el('div', { class: 'page creator' });
    container.appendChild(page);
    const items = Roster.list();
    page.appendChild(el('div', { class: 'creator-head' }, [
      el('div', { class: 'creator-title' }, [el('h2', {}, ['Make a vislae'])]),
      el('div', { class: 'creator-who' }, [
        el('p', { class: 'muted' }, [items.length
          ? 'The vislae this browser keeps. Open one to go on with it; a downloaded file is the copy you can hand to a GM or another browser.'
          : 'Nothing here yet. Begin a vislae, load one from a file, or start from one of the five The Key illustrates.']),
      ]),
    ]));
    page.appendChild(el('div', { class: 'chiprow' }, [
      el('button', {
        class: 'btn', type: 'button',
        onclick: () => { Roster.add(Sheet.blank()); ctx.go('creator', ['begin']); },
      }, ['Begin a vislae']),
      loadControl(ctx),
      el('a', { class: 'btn ghost', href: ctx.href('vislae', []) }, ['Start from one of the five']),
    ]));
    if (!items.length) return;
    page.appendChild(el('div', { class: 'roster' }, items.map((it) => {
      const v = Sheet.complete(it.character);
      const st = state(v);
      const sum = Sheet.sentence(v, st.d);
      const when = it.updated ? new Date(it.updated) : null;
      return el('div', { class: 'roster-row' + (it.id === Roster.currentId() ? ' current' : '') }, [
        el('div', { class: 'roster-main' }, [
          el('a', { class: 'roster-name', href: ctx.href('creator', ['done']), onclick: () => openEntry(it.id, 'done') }, [v.name || 'An unnamed vislae']),
          el('div', { class: 'muted small' }, [sum || 'Nothing decided yet.']),
          el('div', { class: 'muted small' }, [
            st.asks.length ? st.asks.length + ' ' + (st.asks.length === 1 ? 'thing' : 'things') + ' the book still asks' : 'Complete',
            when ? ' · ' + when.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '',
          ]),
        ]),
        el('div', { class: 'chiprow tight' }, [
          el('a', { class: 'btn tiny', href: ctx.href('creator', [st.asks.length ? st.asks[0].step : 'done']), onclick: () => openEntry(it.id, st.asks.length ? st.asks[0].step : 'done') }, [st.asks.length ? 'Go on' : 'Open']),
          el('button', { class: 'btn ghost tiny', type: 'button', onclick: () => { Roster.open(it.id); download(v); } }, ['Download']),
          el('button', { class: 'btn ghost tiny', type: 'button', onclick: () => { Roster.duplicate(it.id); ctx.go('creator', []); window.VttSite.render(); } }, ['Duplicate']),
          el('button', {
            class: 'btn ghost tiny', type: 'button',
            onclick: () => {
              if (!confirm('Delete ' + (v.name || 'this vislae') + ' from this browser? A downloaded file is unaffected.')) return;
              Roster.remove(it.id);
              window.VttSite.render();
            },
          }, ['Delete']),
        ]),
      ]);
    })));
  }

  // Open an entry and go to a step; the link's own navigation does the rest, unless the
  // hash is already there, in which case nothing would fire.
  function openEntry(id, step) {
    Roster.open(id);
    if (location.hash === window.VttSite.href('creator', [step])) window.VttSite.render();
  }

  // Load a character file back in — the same file Download writes. It joins the roster.
  function loadControl(ctx) {
    const input = el('input', { type: 'file', accept: '.json,application/json', class: 'filein' });
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const v = readCharacter(JSON.parse(String(r.result)));
          Roster.add(v);
          ctx.go('creator', ['done']);
          if (window.VttSite) window.VttSite.render();
        } catch (e) {
          alert(e.message || String(e));
        }
      };
      r.readAsText(f);
    });
    return el('label', { class: 'btn ghost' }, ['Load a character file…', input]);
  }

  // ── starting from one of the five vislae The Key illustrates ───────
  // The book gives each a name and a descriptor — "An Established Stoic of the Order of
  // the Vance who Walks the Path of Suns" — and every part of that sentence but one is an
  // entity name. So a start is the sentence read back: whatever resolves is fixed, and
  // whatever does not is left for the player. Nothing is guessed.
  //
  // The soul is absent by design, not by failure: "They are to be kept secret, and as
  // such are never mentioned as part of the sentence that describes the character ...
  // secret souls are the unspoken part of the describing sentence." (Step 4: Choose a
  // Soul, The Key p22.)
  function startFromDescriptor(text) {
    const picks = {};
    const resolved = [];
    const src = String(text || '');
    // the order first, by the phrase the book says that order is spoken of with
    const order = Object.keys(Sheet.ORDER_PHRASE)
      .map((name) => ({ name, phrase: Sheet.ORDER_PHRASE[name] }))
      .filter((o) => src.indexOf(o.phrase) !== -1)
      .sort((a, b) => b.phrase.length - a.phrase.length)[0];
    if (order) {
      const e = D.byType('Order', Sheet.BOOKS).find((x) => x.name === order.name);
      if (e) { picks.Order = e.id; resolved.push({ what: 'Order', name: e.name }); }
    }
    // then the three whose names the sentence carries outright; longest match wins, so
    // "Channels Strength And Skill" is not beaten by a shorter forte inside it
    ['Foundation', 'Heart', 'Forte'].forEach((type) => {
      const hit = D.byType(type, Sheet.BOOKS)
        .filter((e) => src.toLowerCase().indexOf(e.name.toLowerCase()) !== -1)
        .sort((a, b) => b.name.length - a.name.length)[0];
      if (hit) { picks[type] = hit.id; resolved.push({ what: type, name: hit.name }); }
    });
    return { picks, resolved };
  }

  // Seed a new roster entry from a sample character and open the walk at its first step.
  function startFrom(sample, ctx) {
    const v = Sheet.blank();
    const { picks } = startFromDescriptor(D.text(sample, 'Descriptor'));
    Object.keys(picks).forEach((k) => (v.picks[k] = picks[k]));
    v.startedFrom = {
      id: sample.id, name: sample.name,
      descriptor: D.text(sample, 'Descriptor'),
      book: D.val(sample, 'Book'), page: D.val(sample, 'Page'),
    };
    Roster.add(v);
    ctx.go('creator', ['begin']);
    if (window.VttSite) window.VttSite.render();
  }

  return { render, readCharacter, toFile, startFrom, startFromDescriptor, STEPS, state, asks };
})();
