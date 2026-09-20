// system/invisiblesun/site.js — what Invisible Sun puts on the site: the books as a
// reader, the sample vislae, and the character creator. Every word shown comes from
// titterpig-dsl-invisiblesun/0.5 through data/; this file only decides what is listed
// where.
//
// M0 scaffold: the tabs exist and the shell routes between them. The reader lands in M2,
// the sheet in M3, the creator in M4 — each replaces the placeholder below and nothing
// else in this file's shape.
window.VttSiteTabs = (function () {
  const { el } = window.VttRender;
  const Data = window.VttData;

  function soon(container, what) {
    container.appendChild(el('div', { class: 'page' }, [
      el('h2', {}, [what.title]),
      el('p', { class: 'muted' }, [what.note]),
    ]));
  }

  // M1: the shelf — the index, and a book's data fetched when it is asked for. The reader
  // itself is M2; what this proves is that a page shows the corpus and pays for one book.
  function renderShelf(container, path, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    const idx = Data.index();
    page.appendChild(el('h2', {}, ['The books']));
    page.appendChild(el('p', { class: 'muted' }, [
      'Generated from the Invisible Sun corpus: ',
      String(idx.counts.entities), ' entities and ',
      String(idx.counts.notes), ' margin notes across ',
      String(idx.counts.books), ' books. A book’s data is fetched when you open it — the reader is M2.',
    ]));
    const list = el('div', {});
    page.appendChild(list);
    Data.books().forEach((b) => {
      const line = el('div', { class: 'chiprow' });
      const state = el('span', { class: 'muted small' }, [
        Data.has(b.id, 'main') ? 'loaded' : String(b.counts.entities) + ' entities'
          + (b.counts.notes ? ', ' + b.counts.notes + ' margin notes' : ''),
      ]);
      line.appendChild(el('button', {
        class: 'btn ghost', type: 'button',
        onclick: () => {
          state.textContent = 'loading…';
          Data.ready(b.id, ['main', 'notes']).then(() => {
            const T = window.INVISIBLESUN;
            const book = T.books[b.id] || {};
            state.textContent = 'loaded · ' + (book.entities || []).length + ' top-level entities, '
              + (book.notes || []).length + ' notes, ' + (book.files || []).length + ' corpus files';
          }).catch((e) => { state.textContent = String(e.message || e); });
        },
      }, [b.title]));
      line.appendChild(state);
      list.appendChild(line);
    });
  }

  return [
    { id: 'books', label: 'The books', render: renderShelf },
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
