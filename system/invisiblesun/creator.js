// system/invisiblesun/creator.js — making a vislae, by the book.
//
// The steps are not a list someone wrote here: they are *The Key*'s own headings, and at
// each one the book's text is shown verbatim from the entity of that name. The controls
// are the sheet's (system/invisiblesun/sheet.js), over the same draft object, so the
// thing being built is the thing that will be played.
//
// What the tool adds is arithmetic the book asks the player to do — how many points of a
// stat are still undivided, how many of a grant have been taken — never a rule of its own.
// Where a number lives only in prose it is a named constant in sheet.js citing its
// sentence, and where the book states a limit it cannot enforce (a Vance's grimoire is
// six spells of a class the corpus does not carry), the sentence is quoted beside the
// picker and the count shown, rather than a guess being enforced.
window.IsCreator = (function () {
  const { el, paragraphs } = window.VttRender;
  const D = window.IsData;
  const E = window.IsEntity;
  const Sheet = window.IsSheet;
  const C = () => Sheet.controls;

  const DRAFT_KEY = ((window.VttConfig || {}).storagePrefix || 'sortilege-vtt') + ':site:draft';
  const FILE_KIND = 'sortilege-vtt-character';

  // ── the walk ───────────────────────────────────────────────────────
  // `texts` are entity names in The Key. Each step shows them verbatim, in the order the
  // book prints them, and then whatever it asks the player to decide.
  const STEPS = [
    { id: 'begin', label: 'The Testament',
      texts: ['Creating a Vislae Character', 'The Six Fingers of the Testament of Suns'] },
    { id: 'style', label: 'Step 0 · Style', optional: true,
      texts: ['Step 0: Choose a Roleplaying Style'], enumProp: 'Roleplaying Style',
      styleTexts: ['Builder', 'Explorer', 'Attainer', 'Achiever'] },
    { id: 'order', label: 'Step 1 · Order', texts: ['Step 1: Choose an Order'], pick: 'Order' },
    { id: 'heart', label: 'Step 2 · Heart',
      texts: ['Step 2: Choose a Heart', 'Stat Scores', 'Stat Pools'], pick: 'Heart',
      pools: true, heartSkills: true },
    { id: 'forte', label: 'Step 3 · Forte', texts: ['Step 3: Choose a Forte'], pick: 'Forte', forte: true },
    { id: 'soul', label: 'Step 4 · Soul', texts: ['Step 4: Choose a Soul'], pick: 'Soul Allegiance' },
    { id: 'foundation', label: 'Step 5 · Foundation',
      texts: ['Step 5: Build a Foundation'], pick: 'Foundation', foundation: true,
      more: ['Vislae Houses', 'Connections', 'Shadow Skill', 'Shadow Memento', 'Quirks'] },
    { id: 'arc', label: 'Step 6 · Arc', optional: true,
      texts: ['Step 6: Choose a Character Arc', 'Beginning a New Arc'], list: 'Character Arcs' },
    { id: 'bonds', label: 'Step 7 · Bonds', optional: true,
      texts: ['Step 7: Form Bonds'], bonds: true, more: ['NPC Bonds', 'The Process'] },
    { id: 'magic', label: 'What the order gives', optional: true, magic: true },
    { id: 'touches', label: 'Finishing touches',
      texts: ['Finishing Touches', 'Name', 'Appearance', 'Languages'], touches: true },
    { id: 'done', label: 'The vislae', done: true },
  ];

  // The magic a starting vislae picks from. Which of these an order actually grants is
  // said in that order's own 1st-degree abilities, shown verbatim above them.
  const MAGIC_LISTS = ['Spells', 'Secrets', 'Charms', 'Objects of Power', 'Ephemera', 'Incantations'];

  // ── the draft ──────────────────────────────────────────────────────
  function load() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save(v) {
    try {
      if (v) localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
      else localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      /* a browser with no storage still builds a character; it just forgets it */
    }
  }

  // ── the file a finished vislae leaves as ───────────────────────────
  function toFile(v) {
    return {
      kind: FILE_KIND,
      version: 1,
      system: (window.VttConfig || {}).system || 'invisiblesun',
      corpus: (D.index() || {}).corpus || null,
      exported: new Date().toISOString(),
      name: v.name || '',
      character: v,
    };
  }

  function readCharacter(obj) {
    if (!obj || obj.kind !== FILE_KIND) throw new Error('That is not a character file.');
    if (obj.system && obj.system !== ((window.VttConfig || {}).system || 'invisiblesun')) {
      throw new Error('That character is for ' + obj.system + ', not Invisible Sun.');
    }
    const v = obj.character;
    if (!v || typeof v !== 'object') throw new Error('The file carries no character.');
    // fill in anything the sheet expects and an older file lacks
    const base = Sheet.blank();
    ['values', 'picks', 'lists', 'rated', 'lines', 'pools'].forEach((k) => {
      v[k] = Object.assign({}, base[k], v[k] || {});
    });
    v.name = v.name || '';
    return v;
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

  // ── completion, by what the book asks for ──────────────────────────
  function state(v) {
    const d = Sheet.derive(v);
    const certesLeft = d.certes == null ? null : d.certes - d.certesSpent;
    const qualiaLeft = d.qualia == null ? null : d.qualia - d.qualiaSpent;
    return {
      d, certesLeft, qualiaLeft,
      done: {
        begin: true,
        style: !!v.picks['Roleplaying Style'],
        order: !!v.picks.Order,
        // the heart is done when its points are divided: "Points not put in a pool serve
        // no purpose." (Stat Scores, The Key p27)
        heart: !!v.picks.Heart && certesLeft === 0 && qualiaLeft === 0,
        forte: !!v.picks.Forte,
        soul: !!v.picks['Soul Allegiance'],
        foundation: !!v.picks.Foundation,
        arc: (v.lists['Character Arcs'] || []).length > 0,
        bonds: (v.rated['PC Bonds'] || []).length > 0,
        magic: MAGIC_LISTS.some((l) => (v.lists[l] || []).length > 0),
        touches: !!(v.name || '').trim(),
        done: false,
      },
    };
  }

  // ── controls a step needs that the sheet does not ──────────────────
  function poolBlock(v, redraw, st) {
    const box = el('div', {});
    [['Certes', Sheet.CERTES_POOLS, st.d.certes, st.certesLeft],
      ['Qualia', Sheet.QUALIA_POOLS, st.d.qualia, st.qualiaLeft]].forEach(([stat, names, total, left]) => {
      box.appendChild(el('div', { class: 'poolgroup' }, [
        el('div', { class: 'prop-k' }, [stat + (total != null ? ' ' + total : '')]),
        el('div', { class: 'muted small' }, [
          total == null ? 'Choose a heart and these are set.'
            : left === 0 ? 'All divided.' : left + ' still to divide',
        ]),
        el('div', { class: 'pools' }, names.map((p) => el('div', { class: 'pool' }, [
          el('div', { class: 'pool-n' }, [p]),
          // the creator will not let a stat spend more than it has; the sheet, which is
          // the character in play, is free (bene rise and fall at the table)
          C().stepper(v.pools[p] || 0, 0, total == null ? null : (v.pools[p] || 0) + left, (n) => {
            v.pools[p] = n;
            redraw();
          }),
        ]))),
      ]));
    });
    return box;
  }

  function pickBlock(v, redraw, name, options) {
    const chosen = D.entity(v.picks[name]);
    const grid = el('div', { class: 'choose' }, options.map((o) => {
      const on = chosen && chosen.id === o.id;
      const blurb = D.text(o, 'Tagline') || C().truncate(D.text(o, 'Description') || '', 220);
      return el('button', {
        class: 'choice' + (on ? ' on' : ''), type: 'button',
        onclick: () => { v.picks[name] = on ? null : o.id; redraw(); },
      }, [
        el('div', { class: 'card-name' }, [o.name]),
        blurb ? el('div', { class: 'card-desc' }, [blurb]) : null,
      ]);
    }));
    return el('div', {}, [
      grid,
      chosen ? el('div', { class: 'chosen' }, [
        el('h4', {}, ['As the book prints it']),
        E.render(chosen, { bare: true }),
      ]) : null,
    ]);
  }

  function listBlock(v, redraw, name, options, note) {
    const chosen = v.lists[name] || [];
    const sel = el('select', { class: 'scope' });
    sel.appendChild(el('option', { value: '' }, ['Add ' + name.toLowerCase() + '…']));
    options.filter((o) => chosen.indexOf(o.id) === -1)
      .forEach((o) => sel.appendChild(el('option', { value: o.id }, [
        o.name + (D.val(o, 'Level') != null ? ' · level ' + D.val(o, 'Level') : ''),
      ])));
    sel.addEventListener('change', () => {
      if (!sel.value) return;
      v.lists[name] = chosen.concat([sel.value]);
      redraw();
    });
    return el('div', {}, [
      el('div', { class: 'chiprow' }, [
        sel,
        el('span', { class: 'muted small' }, [chosen.length + ' chosen' + (note ? ' · ' + note : '')]),
      ]),
      el('div', { class: 'cards' }, chosen.map((id) => {
        const e = D.entity(id);
        if (!e) return null;
        const card = E.card(e, () => window.IsOpenEntity(e.id));
        card.appendChild(el('span', {
          class: 'btn ghost tiny', onclick: (ev) => {
            ev.stopPropagation();
            v.lists[name] = (v.lists[name] || []).filter((x) => x !== id);
            redraw();
          },
        }, ['remove']));
        return card;
      })),
    ]);
  }

  function writtenList(v, redraw, name, fieldLabels, placeholder) {
    const rows = v.rated[name] || [];
    const box = el('div', {});
    rows.forEach((entry, i) => {
      box.appendChild(el('div', { class: 'chiprow' }, [
        el('b', {}, [entry[fieldLabels[0]] || '—']),
        fieldLabels[1] ? el('span', {}, [entry[fieldLabels[1]] || '']) : null,
        el('button', {
          class: 'btn ghost tiny', type: 'button',
          onclick: () => { rows.splice(i, 1); redraw(); },
        }, ['remove']),
      ]));
    });
    const a = el('input', { type: 'text', class: 'text', placeholder: placeholder[0] });
    const b = fieldLabels[1] ? el('input', { type: 'text', class: 'text', placeholder: placeholder[1] }) : null;
    box.appendChild(el('div', { class: 'chiprow' }, [a, b,
      el('button', {
        class: 'btn', type: 'button',
        onclick: () => {
          if (!a.value.trim()) return;
          const entry = {};
          entry[fieldLabels[0]] = a.value.trim();
          if (b) entry[fieldLabels[1]] = b.value.trim();
          v.rated[name] = (v.rated[name] || []).concat([entry]);
          redraw();
        },
      }, ['Add']),
    ]));
    return box;
  }

  // ── the creator ────────────────────────────────────────────────────
  function render(container, path, ctx) {
    const page = el('div', { class: 'page creator' });
    container.appendChild(page);

    const need = Sheet.BOOKS.filter((b) => !window.VttData.has(b, 'main'));
    if (need.length) {
      page.appendChild(el('h2', {}, ['Make a vislae']));
      page.appendChild(el('div', { class: 'empty' }, ['Fetching the books a character is made from…']));
      window.VttData.ready(Sheet.BOOKS, ['main']).then(() => {
        container.innerHTML = '';
        render(container, path, ctx);
      });
      return;
    }

    let v = load();
    if (!v) {
      v = Sheet.blank();
      save(v);
    } else {
      const base = Sheet.blank();
      ['values', 'picks', 'lists', 'rated', 'lines', 'pools'].forEach((k) => (v[k] = Object.assign({}, base[k], v[k] || {})));
    }
    const stepId = STEPS.some((s) => s.id === path[0]) ? path[0] : 'begin';
    const step = STEPS.find((s) => s.id === stepId);
    const st = state(v);

    const redraw = () => {
      save(v);
      container.innerHTML = '';
      render(container, path, ctx);
    };

    // head: who is being made, and the walk so far
    page.appendChild(el('div', { class: 'creator-head' }, [
      el('h2', {}, ['Make a vislae']),
      el('div', { class: 'muted' }, [
        sentence(v, st) || 'The Key builds a character in six steps, and then two more.',
        v.startedFrom ? el('div', { class: 'small' }, [
          'Started from ', el('i', {}, [v.startedFrom.name]),
          ', whom ' + (v.startedFrom.book || 'The Key') + ' illustrates on page ' + v.startedFrom.page + '.',
        ]) : null,
        el('button', {
          class: 'btn ghost tiny', type: 'button',
          onclick: () => {
            if (!confirm('Start over? This draft is discarded.')) return;
            save(null);
            ctx.go('creator', ['begin']);
          },
        }, ['start over']),
      ]),
    ]));
    page.appendChild(el('ol', { class: 'creator-steps' }, STEPS.map((s) => el('li', {
      class: (s.id === stepId ? 'current' : '') + (st.done[s.id] ? ' done' : ''),
    }, [el('a', { href: ctx.href('creator', [s.id]) }, [s.label])]))));

    const body = el('div', { class: 'creator-body' });
    page.appendChild(body);
    if (step.texts) body.appendChild(guide(step.texts));

    // ── each step's own business ──
    if (step.enumProp) {
      const sp = Sheet.spec().enums.find((e) => e.name === step.enumProp);
      body.appendChild(el('div', { class: 'choose' }, (sp ? sp.options : []).map((o) => {
        const e = entityNamed(o);
        const on = v.picks[step.enumProp] === o;
        return el('button', {
          class: 'choice' + (on ? ' on' : ''), type: 'button',
          onclick: () => { v.picks[step.enumProp] = on ? null : o; redraw(); },
        }, [
          el('div', { class: 'card-name' }, [o]),
          e ? el('div', { class: 'card-desc' }, [C().truncate(D.text(e, 'Text') || '', 260)]) : null,
        ]);
      })));
    }

    if (step.pick) {
      const sp = Sheet.spec().picks.find((p) => p.name === step.pick);
      body.appendChild(pickBlock(v, redraw, step.pick, sp ? sp.options : []));
    }

    if (step.pools) {
      body.appendChild(el('h4', {}, ['Divide the points']));
      body.appendChild(poolBlock(v, redraw, st));
    }

    if (step.heartSkills && st.d.heartSkills.length) {
      const chosen = (v.rated.Skills || []).map((r) => r.Skill);
      body.appendChild(el('h4', {}, ['The skills your heart grants',
        el('span', { class: 'muted small' }, [' · a pair of them']),
      ]));
      body.appendChild(el('div', { class: 'chiprow' }, st.d.heartSkills.map((s) => {
        const on = chosen.indexOf(s) !== -1;
        return el('button', {
          class: 'btn' + (on ? '' : ' ghost'), type: 'button',
          onclick: () => {
            const cur = (v.rated.Skills || []).slice();
            const i = cur.findIndex((r) => r.Skill === s);
            if (i >= 0) cur.splice(i, 1);
            else if (cur.filter((r) => st.d.heartSkills.indexOf(r.Skill) !== -1).length < Sheet.HEART_SKILLS) {
              cur.push({ Skill: s, Level: 1 });
            }
            v.rated.Skills = cur;
            redraw();
          },
        }, [s]);
      })));
    }

    if (step.forte && st.d.forte) {
      body.appendChild(el('h4', {}, ['Its abilities']));
      body.appendChild(el('p', { class: 'muted small' }, [
        'A forte’s abilities are taken along the path the book draws for it, starting at the first. '
        + 'The path is printed as a diagram and the corpus holds no edges for it, so the page is '
        + 'shown as printed rather than the path being guessed at.',
      ]));
      body.appendChild(E.fortePath(st.d.forte));
      body.appendChild(el('div', { class: 'cards' }, st.d.forteAbilities.map((ab) => E.card(ab, () => window.IsOpenEntity(ab.id)))));
    }

    if (step.foundation && st.d.foundation) {
      // the foundation's own table is already printed above, by the picker
      body.appendChild(el('h4', {}, ['Your house, your connections, and what came back from Shadow']));
      ['House', 'Shadow Skill', 'Shadow Memento'].forEach((n) => {
        const target = n === 'House' ? v.picks : v.values;
        body.appendChild(C().row(n, C().textInput(target, n, n === 'House' ? 'Where they live' : '')));
      });
      body.appendChild(el('h4', {}, ['Connections']));
      body.appendChild(writtenList(v, redraw, 'Connections', ['Connection', 'Level'], ['A group or organisation…', 'level']));
      body.appendChild(el('h4', {}, ['A quirk']));
      body.appendChild(writtenList(v, redraw, 'Quirks', ['Description'], ['Pick one from the list above, or write your own…']));
    }

    if (step.list) {
      const sp = Sheet.spec().lists.find((l) => l.name === step.list);
      body.appendChild(listBlock(v, redraw, step.list, sp ? sp.options : [], 'one to begin with'));
    }

    if (step.bonds) {
      body.appendChild(el('h4', {}, ['Bonds with the other player characters']));
      body.appendChild(writtenList(v, redraw, 'PC Bonds', ['Bond Type', 'With'], ['The bond (Close Friends, Rivals, Soulmates…)', 'with whom']));
      body.appendChild(el('h4', {}, ['Bonds with people who are not player characters']));
      body.appendChild(writtenList(v, redraw, 'NPC Bonds', ['Bond Type', 'With'], ['Associate, Contact, Friend, Lover, Relative…', 'with whom']));
      body.appendChild(el('h4', {}, ['The neighbourhood, and what the group makes of it']));
      body.appendChild(C().textInput(v.lines, 'Notes', 'Neighbours, points of interest, local issues, the desideratum…', true));
    }

    if (step.magic) {
      const order = st.d.order;
      if (!order) {
        body.appendChild(el('div', { class: 'empty' }, ['Choose an order first: what a vislae begins with is what their order gives them.']));
      } else {
        const first = D.children(order.id).filter((x) => x.slot === 'DEGREES' && D.val(x, 'Degree') === 1)[0];
        body.appendChild(el('h4', {}, ['What a 1st-degree ' + order.name + ' has']));
        body.appendChild(el('p', { class: 'muted small' }, [
          'Printed in ', el('i', {}, ['The Key']),
          '. The books state these grants in prose, so they are shown as printed and counted, not enforced.',
        ]));
        if (first) {
          body.appendChild(el('ul', { class: 'items' }, D.children(first.id).map((ab) => el('li', {}, [
            el('b', {}, [ab.name]), ' ', D.text(ab, 'Effect') || '',
          ]))));
        } else {
          body.appendChild(el('div', { class: 'cards' }, D.children(order.id)
            .filter((x) => x.slot === 'APOSTATE_ABILITIES')
            .map((ab) => E.card(ab, () => window.IsOpenEntity(ab.id)))));
        }
        const spec = Sheet.spec();
        MAGIC_LISTS.forEach((n) => {
          const sp = spec.lists.find((l) => l.name === n);
          if (!sp || !sp.options.length) return;
          body.appendChild(el('h4', {}, [n]));
          body.appendChild(listBlock(v, redraw, n, sp.options));
        });
      }
    }

    if (step.touches) {
      const name = el('input', { type: 'text', class: 'text', value: v.name || '', placeholder: 'Their name' });
      name.addEventListener('change', () => { v.name = name.value.trim(); save(v); });
      body.appendChild(C().row('Name', name));
      body.appendChild(C().row('Appearance', C().textInput(v.values, 'Appearance', '', true)));
      body.appendChild(C().row('Languages', C().textInput(v.lines, 'Languages', 'Indigo and the Invisible Tongue, and any others', true)));
    }

    if (step.more) body.appendChild(guide(step.more, false));

    if (step.done) {
      body.appendChild(el('p', { class: 'muted' }, [
        'This is the vislae as the books describe them. The draft stays in this browser; the file is yours to keep.',
      ]));
      body.appendChild(el('div', { class: 'chiprow no-print' }, [
        el('button', { class: 'btn', type: 'button', onclick: () => download(v) }, ['Download as JSON']),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => window.print() }, ['Print this sheet']),
        loadControl(ctx),
      ]));
      body.appendChild(Sheet.render(v, redraw));
    } else {
      const i = STEPS.findIndex((s) => s.id === stepId);
      body.appendChild(el('div', { class: 'chiprow creator-nav' }, [
        i > 0 ? el('a', { class: 'btn ghost', href: ctx.href('creator', [STEPS[i - 1].id]) }, ['‹ ' + STEPS[i - 1].label]) : null,
        i < STEPS.length - 1 ? el('a', { class: 'btn', href: ctx.href('creator', [STEPS[i + 1].id]) }, [STEPS[i + 1].label + ' ›']) : null,
        stepId === 'begin' ? loadControl(ctx) : null,
      ]));
    }
  }

  // Load a character file back in — the same file Download writes.
  function loadControl(ctx) {
    const input = el('input', { type: 'file', accept: '.json,application/json', class: 'filein' });
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const v = readCharacter(JSON.parse(String(r.result)));
          save(v);
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

  // How each order is spoken of, which the book states in a sentence of its own: "When
  // referring to their order, Vances say, \u201cOrder of the Vance.\u201d Weavers and Makers just
  // say, \u201cOrder of Weavers\u201d and \u201cOrder of Makers.\u201d Goetics sometimes say, \u201cOrder of
  // Goetics\u201d and other times use the more formal \u201cOrder of Goetica.\u201d Apostates just say,
  // \u201can Apostate.\u201d" (Step 1: Choose an Order, The Key p21.)
  const ORDER_PHRASE = {
    Vance: 'of the Order of the Vance',
    Maker: 'of the Order of Makers',
    Weaver: 'of the Order of Weavers',
    Goetic: 'of the Order of Goetica',
    Apostate: 'Apostate',
  };

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
    const order = Object.keys(ORDER_PHRASE)
      .map((name) => ({ name, phrase: ORDER_PHRASE[name] }))
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

  // Seed the draft from a sample character and open the walk at its first step.
  function startFrom(sample, ctx) {
    const v = Sheet.blank();
    const { picks } = startFromDescriptor(D.text(sample, 'Descriptor'));
    Object.keys(picks).forEach((k) => (v.picks[k] = picks[k]));
    v.startedFrom = {
      id: sample.id, name: sample.name,
      descriptor: D.text(sample, 'Descriptor'),
      book: D.val(sample, 'Book'), page: D.val(sample, 'Page'),
    };
    save(v);
    ctx.go('creator', ['begin']);
    if (window.VttSite) window.VttSite.render();
  }

  // The sentence the book describes a character with: "An Established Stoic of the Order
  // of the Vance who Walks the Path of Suns" — foundation, heart, order, forte. A forte's
  // name is a verb and is printed as it stands.
  function sentence(v, st) {
    const f = st.d.foundation && st.d.foundation.name;
    const h = st.d.heart && st.d.heart.name;
    const o = st.d.order && st.d.order.name;
    const fo = st.d.forte && st.d.forte.name;
    if (!f && !h && !o && !fo) return null;
    const bits = [v.name || 'This vislae', 'is', f ? 'a' + (/^[AEIOU]/i.test(f) ? 'n' : '') + ' ' + f : null, h,
      o ? (ORDER_PHRASE[o] || 'of the Order of ' + o) : null, fo ? 'who ' + fo : null];
    return bits.filter(Boolean).join(' ');
  }

  return { render, readCharacter, toFile, startFrom, startFromDescriptor, STEPS, DRAFT_KEY, load, save };
})();
