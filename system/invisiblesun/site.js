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

  function soon(container, what) {
    container.appendChild(el('div', { class: 'page' }, [
      el('h2', {}, [what.title]),
      el('p', { class: 'muted' }, [what.note]),
    ]));
  }

  return [
    {
      id: 'books',
      label: 'The books',
      render: (c) => soon(c, {
        title: 'The books',
        note: 'The reader over the thirteen sourcebooks, the setting prose and the card decks — M2.',
      }),
    },
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
