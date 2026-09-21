// system/invisiblesun/panels.js — the Invisible Sun panels: Narrative, Party, Inspector,
// the Path of Suns, Bestiary, Rules & Books, Log, Campaign. Registered into the engine's
// registry; the shell (engine/app.js) decides where they show.
//
// The corpus has no modules, so nothing here reads a scene or a cast out of a book: a
// scene is the GM's own (system ops `scenes`), and what is in it is whatever the GM has
// put there from the books. Every word of rules text shown comes from the corpus.
(function () {
  const { el, paragraphs, chip, button, debounce, dragSort } = window.VttRender;
  const D = window.IsData;
  const E = window.IsEntity;
  const Sheet = window.IsSheet;
  const State = window.VttState;
  const Bus = window.VttBus;
  const Panels = window.VttPanels;
  const Data = window.VttData;
  const Sys = () => window.VttSystem;

  const S = () => State.state;
  const MODULE = 'narrative';

  // a link inside any rendered entity opens it in the Inspector here, not the reader
  window.IsOpenEntity = (id) => {
    if (D.entity(id)) Panels.select({ kind: 'entity', id });
  };

  const loadedBooks = () => D.books().map((b) => b.id).filter((id) => Data.has(id, 'main'));

  // ── Narrative ──────────────────────────────────────────────────────
  // "The Three Modes of Gameplay" (The Gate p7): the book's own names for them, each a
  // rule in The Gate the GM can open.
  const MODE_NAMES = ['Action Mode', 'Development Mode', 'Narrative Mode'];
  const modeRule = (name) => D.all(['gate']).find((e) => e.type === 'Rule' && e.name === name) || null;

  function currentScene() {
    return Sys().scene(Sys().currentSceneId());
  }

  function progress(sceneId) {
    return ((S().progress || {})[MODULE] || {})[sceneId] || { done: false, notes: '' };
  }

  function goTo(sceneId) {
    State.commit('setCurrentScene', [MODULE, sceneId]);
    Bus.emit('scene:changed', { moduleId: MODULE, sceneId });
  }

  function renderNarrative(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const n = S().narrative || {};
      // the mode in play
      const modes = el('div', { class: 'chiprow tight' }, MODE_NAMES.map((name) => {
        const r = modeRule(name);
        const on = n.mode === name;
        return el('span', { class: 'mode' }, [
          el('button', { class: 'btn tiny' + (on ? '' : ' ghost'), type: 'button', onclick: () => State.commit('setNarrative', [{ mode: on ? null : name }]) }, [name.replace(/ Mode$/, '')]),
          r ? el('button', { class: 'ref tiny', type: 'button', title: 'The Gate, page ' + D.val(r, 'Page'), onclick: () => Panels.select({ kind: 'entity', id: r.id }) }, ['?']) : null,
        ]);
      }));
      container.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, ['Mode']), el('div', { class: 'prop-v' }, [modes])]));

      // the scenes
      const scenes = S().scenes || [];
      const cur = currentScene();
      const done = scenes.filter((sc) => progress(sc.id).done).length;
      const add = el('input', { type: 'text', class: 'text small', placeholder: 'A new scene…' });
      const addIt = () => {
        const name = add.value.trim();
        if (!name) return;
        const id = State.genId('sc');
        State.commit('putScene', [{ id, name, cast: [] }]);
        add.value = '';
        if (!cur) goTo(id);
      };
      add.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); addIt(); } });
      container.appendChild(el('h4', {}, ['Scenes', el('span', { class: 'muted small' }, [scenes.length ? ' · ' + done + ' of ' + scenes.length + ' done · drag to arrange' : ''])]));
      container.appendChild(el('div', { class: 'chiprow tight' }, [add, button('Add', addIt, 'tiny')]));
      if (!scenes.length) container.appendChild(el('div', { class: 'empty' }, ['No scenes yet. The Gate leaves them to you: "Scenes or Encounters", page 65.']));
      const list = el('div', { class: 'scene-list' }, scenes.map((sc) => {
        const st = progress(sc.id);
        return el('div', { class: 'scene-row' + (cur && cur.id === sc.id ? ' current' : '') + (st.done ? ' done' : ''), 'data-id': sc.id, title: 'Drag to arrange' }, [
          el('span', { class: 'grip', 'aria-hidden': 'true' }, ['⋮⋮']),
          el('input', { type: 'checkbox', checked: st.done || null, title: 'Done', onchange: (ev) => State.commit('setSceneDone', [MODULE, sc.id, ev.target.checked]) }),
          el('button', { class: 'scene-link', type: 'button', onclick: () => goTo(sc.id) }, [sc.name]),
          (sc.cast || []).length ? el('span', { class: 'muted small' }, [sc.cast.length + ' in it']) : null,
        ]);
      }));
      dragSort(list, { item: '.scene-row', onDrop: () => {
        const ids = Array.from(list.querySelectorAll('.scene-row')).map((r) => r.dataset.id);
        State.commit('setScenes', [ids.map((id) => scenes.find((sc) => sc.id === id)).filter(Boolean)]);
      } });
      container.appendChild(list);

      // the current scene
      if (cur) {
        const st = progress(cur.id);
        const name = el('input', { type: 'text', class: 'text', value: cur.name, onchange: (ev) => State.commit('putScene', [{ id: cur.id, name: ev.target.value.trim() || cur.name }]) });
        const cast = (cur.cast || []).map((id) => D.entity(id)).filter(Boolean);
        container.appendChild(el('section', { class: 'scene' }, [
          el('h4', {}, ['This scene']),
          name,
          el('div', { class: 'chiprow tight' }, [
            button('Open on the table', () => window.open(window.VttConfig.pages.table + '?scene=' + encodeURIComponent(cur.id), (window.VttConfig.channel || 'vtt') + '-table'), 'tiny'),
            el('label', { class: 'small' }, [el('input', { type: 'checkbox', checked: st.done || null, onchange: (ev) => State.commit('setSceneDone', [MODULE, cur.id, ev.target.checked]) }), ' done']),
            button('remove', () => { if (confirm('Remove the scene "' + cur.name + '"?')) State.commit('removeScene', [cur.id]); }, 'ghost tiny'),
          ]),
          el('div', { class: 'prop-k' }, ['In it']),
          cast.length ? el('div', { class: 'chiprow tight' }, cast.map((e) => el('span', { class: 'chip' }, [
            el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'entity', id: e.id }) }, [e.name]),
            el('button', { class: 'ref tiny', type: 'button', title: 'take out', onclick: () => State.commit('setSceneCast', [cur.id, (cur.cast || []).filter((x) => x !== e.id)]) }, ['×']),
          ]))) : el('div', { class: 'muted small' }, ['No one yet — the Bestiary and the books can put someone here.']),
          el('div', { class: 'prop-k' }, ['GM notes', el('span', { class: 'muted' }, [' · never sent to players'])]),
          el('textarea', { class: 'text', rows: 5, placeholder: 'What happens here, who is here, what the cards might mean…', oninput: debounce((ev) => State.commit('setSceneNotes', [MODULE, cur.id, ev.target.value]), 400) }, [st.notes || '']),
        ]));
      }
    };
    ctx.on('state:changed', (p) => { if (!(document.activeElement && /TEXTAREA|INPUT/.test(document.activeElement.tagName) && container.contains(document.activeElement))) draw(); });
    ctx.on('state:remote', draw);
    ctx.on('scene:changed', draw);
    draw();
  }

  // ── Party ──────────────────────────────────────────────────────────
  // A character file (the site's creator writes one) becomes a party member — and so part
  // of the campaign pack from then on. One control, used by the Party and Campaign panels.
  function characterLoader(label, cls) {
    const file = el('input', { type: 'file', accept: '.json,application/json', hidden: true, multiple: true });
    file.addEventListener('change', () => {
      const files = Array.from(file.files || []);
      Promise.all(files.map((f) => f.text().then((text) => Sheet.readMember(JSON.parse(text), f.name))))
        .then((members) => {
          members.forEach((m) => State.commit('addPartyMember', [m]));
          if (members.length) Panels.select({ kind: 'party', id: members[members.length - 1].id });
        })
        .catch((e) => alert(e.message))
        .finally(() => (file.value = ''));
    });
    return el('span', {}, [button(label, () => file.click(), cls), file]);
  }

  function renderParty(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const party = S().party || [];
      container.appendChild(el('div', { class: 'chiprow' }, [characterLoader('Load character file(s)…', ''), el('span', { class: 'muted small' }, ['from the site’s creator'])]));
      if (!party.length) container.appendChild(el('div', { class: 'empty' }, ['No one in the party yet.']));
      party.forEach((m) => {
        const v = m.character || {};
        const lv = (m.live && m.live.values) || {};
        const harm = ['Wounds', 'Anguish'].filter((k) => lv[k]).map((k) => k + ' ' + lv[k]).join(' · ');
        const adv = ['Joy', 'Despair', 'Crux', 'Acumen'].map((k) => k + ' ' + (lv[k] || 0)).join(' · ');
        container.appendChild(el('div', { class: 'member' }, [
          el('button', { class: 'card static-card', type: 'button', onclick: () => Panels.select({ kind: 'party', id: m.id }) }, [
            el('div', { class: 'card-name' }, [m.name]),
            el('div', { class: 'card-sub muted small' }, [Sheet.sentence(Sheet.complete(v)) || 'a vislae']),
            el('div', { class: 'card-desc' }, [harm ? harm + ' · ' : '', adv]),
          ]),
          el('div', { class: 'member-ops' }, [
            button('file', () => Sheet.downloadMember(m), 'ghost tiny'),
            button('remove', () => { if (confirm('Remove ' + m.name + ' from the party?')) State.commit('removePartyMember', [m.id]); }, 'ghost tiny'),
          ]),
        ]));
      });
    };
    ctx.on('state:changed', draw);
    ctx.on('state:remote', draw);
    draw();
  }

  // ── Inspector ──────────────────────────────────────────────────────
  function renderInspector(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const sel = Panels.selection();
      if (!sel) {
        container.appendChild(el('div', { class: 'empty' }, ['Nothing selected. Click a name anywhere — a vislae, a creature, a rule, a card.']));
        return;
      }
      if (sel.kind === 'entity') {
        const e = D.entity(sel.id);
        if (!e) return container.appendChild(el('div', { class: 'empty' }, ['Not in the loaded books: ' + sel.id]));
        const cur = currentScene();
        const head = el('div', { class: 'chiprow tight no-print' }, [
          cur && e.type === 'Rule' && isStatBlock(e) ? button('Put in ' + cur.name, () => State.commit('setSceneCast', [cur.id, (cur.cast || []).concat([e.id])]), 'tiny') : null,
          el('a', { class: 'btn ghost tiny', href: './#books/' + e.book + '/' + encodeURIComponent(e.id), target: '_blank' }, ['In the reader']),
        ]);
        container.appendChild(head);
        container.appendChild(E.render(e));
      } else if (sel.kind === 'party') {
        const m = Sheet.member(sel.id);
        container.appendChild(m ? Sheet.live(m) : el('div', { class: 'empty' }, ['That vislae is no longer in the party.']));
      } else {
        container.appendChild(el('div', { class: 'empty' }, ['Nothing to show for ' + sel.kind + '.']));
      }
    };
    ctx.on('select', draw);
    ctx.on('state:changed', () => {
      const sel = Panels.selection();
      if (sel && sel.kind === 'party' && !(document.activeElement && /TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName) && container.contains(document.activeElement))) draw();
    });
    ctx.on('state:remote', draw);
    draw();
  }

  // ── Bestiary ───────────────────────────────────────────────────────
  // The books print a creature as a stat block in prose — "Level: 6  Injuries: …
  // Defenses: …" — and the corpus keeps each as a rule. This lists every rule of that
  // shape in the loaded books, by book and by the sun it is printed under. Teratology,
  // the bestiary, is fetched the first time this opens.
  const BESTIARY = 'teratology';
  // A creature is its prose and then its block, and the block may come a page of prose
  // in: the level line and at least one of the block's own labels, anywhere in the text.
  function isStatBlock(e) {
    const t = (D.text(e, 'Text') || '');
    return /(^|\n)Level:\s*\d+/.test(t) && /(^|\n)(Injuries|Wounds|Anguish|Defenses( \([A-Za-z]+\))?|Traits|GM Shift):/.test(t);
  }
  function blocks() {
    return D.all(loadedBooks()).filter((e) => e.type === 'Rule' && isStatBlock(e));
  }

  function renderBestiary(container, ctx) {
    let q = '';
    const draw = () => {
      container.innerHTML = '';
      const search = el('input', { type: 'search', class: 'search', placeholder: 'Find a creature…', value: q });
      search.addEventListener('input', debounce(() => { q = search.value.trim().toLowerCase(); drawList(); }, 150));
      container.appendChild(search);
      const list = el('div');
      container.appendChild(list);
      if (!Data.has(BESTIARY, 'main')) {
        list.appendChild(el('div', { class: 'empty' }, ['Fetching Teratology…']));
        Data.ready([BESTIARY], ['main']).then(draw);
        return;
      }
      function drawList() {
        list.innerHTML = '';
        const all = blocks().filter((e) => !q || e.name.toLowerCase().indexOf(q) !== -1 || (D.text(e, 'Text') || '').toLowerCase().indexOf(q) !== -1);
        const byBook = {};
        all.forEach((e) => ((byBook[e.book] = byBook[e.book] || {})[D.val(e, 'Chapter') || '—'] = (byBook[e.book][D.val(e, 'Chapter') || '—'] || [])).push(e));
        list.appendChild(el('div', { class: 'muted small' }, [all.length + ' stat blocks in the loaded books']));
        Object.keys(byBook).forEach((bid) => {
          const b = D.indexBook(bid) || { title: bid };
          const chapters = byBook[bid];
          list.appendChild(el('details', { class: 'book', open: q || Object.keys(byBook).length === 1 || null }, [
            el('summary', {}, [b.title, el('span', { class: 'muted small' }, [' · ' + Object.values(chapters).reduce((n, xs) => n + xs.length, 0)])]),
            ...Object.keys(chapters).map((ch) => el('details', { class: 'chapter', open: q || null }, [
              el('summary', {}, [ch, el('span', { class: 'muted small' }, [' · ' + chapters[ch].length])]),
              el('ul', { class: 'items toc' }, chapters[ch].map((e) => el('li', {}, [
                el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'entity', id: e.id }) }, [e.name]),
                el('span', { class: 'muted small' }, [' · ' + levelOf(e)]),
              ]))),
            ])),
          ]));
        });
        const others = D.books().filter((b) => b.kind === 'sourcebook' && !Data.has(b.id, 'main'));
        if (others.length) {
          list.appendChild(el('div', { class: 'chiprow tight' }, [
            el('span', { class: 'muted small' }, ['More may be in: ']),
            ...others.map((b) => button(b.title, () => Data.ready([b.id], ['main']).then(drawList), 'ghost tiny')),
          ]));
        }
      }
      drawList();
    };
    draw();
  }

  function levelOf(e) {
    const m = /\bLevel:\s*(\d+)/.exec(D.text(e, 'Text') || '');
    return m ? 'level ' + m[1] : '';
  }

  // ── Rules & Books ──────────────────────────────────────────────────
  function renderRules(container, ctx) {
    container.innerHTML = '';
    const input = el('input', { type: 'search', class: 'search', placeholder: 'Search the loaded books… ( / )', autocomplete: 'off' });
    const scope = el('select', { class: 'scope' });
    const results = el('div', { class: 'results' });
    const browser = el('div', { class: 'browser' });

    function drawScope() {
      scope.innerHTML = '';
      scope.appendChild(el('option', { value: '' }, ['Every loaded book']));
      D.books().forEach((b) => scope.appendChild(el('option', { value: b.id }, [b.title + (Data.has(b.id, 'main') ? '' : ' · fetch')])));
    }
    const bookIds = () => (scope.value ? [scope.value] : loadedBooks());

    function drawBrowser() {
      browser.innerHTML = '';
      bookIds().forEach((bid) => {
        const b = D.indexBook(bid);
        if (!b || !Data.has(bid, 'main')) return;
        const chapters = D.outline(bid);
        const colls = D.collections(bid).filter((c) => c.type !== 'Rule');
        browser.appendChild(el('details', { class: 'book', open: bookIds().length === 1 || null }, [
          el('summary', {}, [b.title, el('span', { class: 'muted small' }, [' · ' + chapters.length + ' chapters'])]),
          el('ul', { class: 'items toc' }, chapters.map((n) => el('li', {}, [
            n.entity ? el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'entity', id: n.id }) }, [n.label]) : el('span', {}, [n.label]),
            n.kids.length ? el('details', { class: 'chapter' }, [
              el('summary', { class: 'muted small' }, [n.kids.length + ' sections']),
              el('ul', { class: 'items toc' }, n.kids.map((k) => el('li', {}, [el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'entity', id: k.id }) }, [k.label])]))),
            ]) : null,
          ]))),
          ...colls.map((c) => el('details', { class: 'chapter' }, [
            el('summary', {}, [c.type, el('span', { class: 'muted small' }, [' · ' + c.items.length])]),
            el('ul', { class: 'items toc' }, c.items.slice(0, 400).map((it) => el('li', {}, [el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'entity', id: it.id }) }, [it.name])]))),
          ])),
        ]));
      });
    }
    const run = debounce(() => {
      results.innerHTML = '';
      const q = input.value.trim();
      browser.hidden = !!q;
      if (q.length < 2) return;
      const hits = D.search(q, bookIds(), 120);
      if (!hits.length) return results.appendChild(el('div', { class: 'empty' }, ['Nothing matches.']));
      results.appendChild(el('div', { class: 'muted small' }, [hits.length + (hits.length === 1 ? ' result' : ' results')]));
      hits.forEach((e) => results.appendChild(el('div', { class: 'hit' }, [
        el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'entity', id: e.id }) }, [e.name]),
        e.type ? el('span', { class: 'etype' }, [e.type]) : null,
        el('span', { class: 'muted small' }, [' · ' + ((D.indexBook(e.book) || {}).title || e.book)]),
        (() => { const ex = D.excerpt(e, q, 60); return ex ? el('div', { class: 'muted small' }, [ex]) : null; })(),
      ])));
    }, 150);
    input.addEventListener('input', run);
    scope.addEventListener('change', () => {
      const bid = scope.value;
      if (bid && !Data.has(bid, 'main')) {
        browser.innerHTML = '';
        browser.appendChild(el('div', { class: 'empty' }, ['Fetching ' + (D.indexBook(bid) || {}).title + '…']));
        Data.ready([bid], ['main']).then(() => { drawScope(); scope.value = bid; drawBrowser(); run(); });
        return;
      }
      drawBrowser();
      run();
    });
    container.appendChild(el('div', { class: 'search-row' }, [input, scope]));
    container.appendChild(results);
    container.appendChild(browser);
    drawScope();
    drawBrowser();
    container.focusSearch = () => input.focus();
  }

  // ── Log ────────────────────────────────────────────────────────────
  function renderLog(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const log = (S().log || []).slice().reverse();
      if (!log.length) return container.appendChild(el('div', { class: 'empty' }, ['No rolls yet.']));
      log.forEach((x) => container.appendChild(x.kind === 'roll' ? Sheet.rollLine(x) : el('div', { class: 'roll-line' }, [x.text || JSON.stringify(x)])));
    };
    ctx.on('state:changed', draw);
    ctx.on('state:remote', draw);
    draw();
  }

  // ── Campaign ───────────────────────────────────────────────────────
  function renderCampaign(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const c = S().campaign;
      const name = el('input', { type: 'text', value: c.name || '', class: 'text', onchange: (ev) => State.commit('setCampaign', [{ name: ev.target.value }]) });
      container.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, ['Narrative']), el('div', { class: 'prop-v' }, [name])]));

      const party = S().party || [];
      container.appendChild(el('h4', {}, ['The vislae', el('span', { class: 'muted small' }, [' · saved in the pack'])]));
      container.appendChild(party.length ? el('ul', { class: 'items' }, party.map((m) => el('li', {}, [
        el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'party', id: m.id }) }, [m.name]),
        el('span', { class: 'muted small' }, [' · ' + (m.source && m.source.kind === 'file' ? 'from ' + (m.source.name || 'a file') : 'made here')]),
        button('file', () => Sheet.downloadMember(m), 'ghost tiny'),
        button('remove', () => { if (confirm('Remove ' + m.name + ' from the narrative?')) State.commit('removePartyMember', [m.id]); }, 'ghost tiny'),
      ]))) : el('div', { class: 'empty' }, ['No vislae yet.']));
      container.appendChild(el('div', { class: 'chiprow' }, [characterLoader('Load character file(s)…', 'ghost'), el('span', { class: 'muted small' }, ['.invisiblesun-character.json, from the site’s creator'])]));

      const list = State.listCampaigns();
      container.appendChild(el('h4', {}, ['Narratives in this browser']));
      container.appendChild(el('ul', { class: 'items' }, list.map((row) => el('li', {}, [
        row.id === State.id ? el('b', {}, [row.name || row.id]) : el('button', { class: 'ref', type: 'button', onclick: () => { State.switchTo(row.id); location.reload(); } }, [row.name || row.id]),
        row.id !== State.id ? button('remove', () => { if (confirm('Remove "' + row.name + '" from this browser? Save its pack first if you want it back.')) { State.remove(row.id); draw(); } }, 'ghost tiny') : null,
      ]))));
      const file = el('input', { type: 'file', accept: 'application/json', hidden: true, onchange: (ev) => {
        const f = ev.target.files[0];
        if (!f) return;
        f.text().then((txt) => {
          try {
            State.importPack(JSON.parse(txt));
            location.reload();
          } catch (e) {
            alert(e.message);
          }
        });
      } });
      container.appendChild(el('div', { class: 'chiprow' }, [
        button('New narrative', () => { const n = prompt('Narrative name'); if (n) { State.create(n, { campaign: { modules: [], books: [] } }); location.reload(); } }),
        button('Save pack (download)', () => State.downloadPack()),
        button('Restore pack…', () => file.click(), 'ghost'),
        file,
      ]));
      container.appendChild(el('p', { class: 'muted small' }, ['A pack is the narrative as an instance: the vislae, the scenes, the Path, every note and roll, as JSON. Keep packs with the narrative; this browser is a cache.']));
    };
    ctx.on('state:changed', draw);
    draw();
  }

  Panels.register('narrative', { label: 'Narrative', render: renderNarrative });
  Panels.register('party', { label: 'Party', render: renderParty });
  Panels.register('inspector', { label: 'Inspector', render: renderInspector });
  if (window.IsSooth) Panels.register('sooth', { label: 'Path of Suns', render: window.IsSooth.renderPanel });
  Panels.register('bestiary', { label: 'Bestiary', render: renderBestiary });
  Panels.register('rules', { label: 'Rules & Books', render: renderRules });
  Panels.register('log', { label: 'Log', render: renderLog });
  Panels.register('campaign', { label: 'Narrative pack', render: renderCampaign });

  window.IsPanels = { currentScene, goTo, characterLoader, isStatBlock, blocks, MODULE };
})();
