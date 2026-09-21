// system/invisiblesun/roster.js — the vislae this browser keeps.
//
// A roster is a list of characters in localStorage, one of them current. Each entry is
// the sheet's own draft object (IsSheet.blank() shape) with an `id`; a downloaded file
// stays the durable form, and the roster is where work in progress lives between visits.
// Nothing here knows what a character contains.
window.IsRoster = (function () {
  const PREFIX = (window.VttConfig || {}).storagePrefix || 'sortilege-vtt';
  const KEY = PREFIX + ':site:roster';
  const LEGACY = PREFIX + ':site:draft';      // the single draft this replaced

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      const r = raw ? JSON.parse(raw) : null;
      if (r && r.items) return r;
    } catch (e) {
      /* fall through: a browser with no storage still builds a character; it just forgets it */
    }
    return { current: null, items: {} };
  }

  function write(r) {
    try {
      localStorage.setItem(KEY, JSON.stringify(r));
    } catch (e) {
      /* see read() */
    }
  }

  const newId = () => 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function list() {
    const r = read();
    return Object.keys(r.items).map((id) => r.items[id]).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  }

  const count = () => Object.keys(read().items).length;
  const currentId = () => read().current;

  function get(id) {
    const it = read().items[id];
    return it ? it.character : null;
  }

  function current() {
    const r = read();
    const it = r.current && r.items[r.current];
    return it ? it.character : null;
  }

  function open(id) {
    const r = read();
    if (!r.items[id]) return null;
    r.current = id;
    write(r);
    return r.items[id].character;
  }

  function add(v) {
    const r = read();
    const id = newId();
    v.id = id;
    r.items[id] = { id, name: v.name || '', updated: Date.now(), character: v };
    r.current = id;
    write(r);
    return id;
  }

  function save(v) {
    if (!v.id) return add(v);
    const r = read();
    r.items[v.id] = { id: v.id, name: v.name || '', updated: Date.now(), character: v };
    if (!r.current) r.current = v.id;
    write(r);
    return v.id;
  }

  // Removing the current entry makes the most recently touched of the rest current, so
  // the walk never quietly begins a blank one in its place.
  function remove(id) {
    const r = read();
    delete r.items[id];
    if (r.current === id) {
      const rest = Object.keys(r.items).map((k) => r.items[k]).sort((a, b) => (b.updated || 0) - (a.updated || 0));
      r.current = rest.length ? rest[0].id : null;
    }
    write(r);
  }

  function duplicate(id) {
    const src = get(id);
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    delete copy.id;
    copy.name = src.name ? src.name + ' (copy)' : '';
    return add(copy);
  }

  // The one draft the site kept before it kept a roster becomes the roster's first entry.
  (function migrate() {
    let raw = null;
    try {
      raw = localStorage.getItem(LEGACY);
    } catch (e) {
      return;
    }
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      if (v && typeof v === 'object') add(v);
    } catch (e) {
      /* an unreadable draft is not worth keeping */
    }
    try {
      localStorage.removeItem(LEGACY);
    } catch (e) {
      /* see read() */
    }
  })();

  return { list, count, currentId, get, current, open, add, save, remove, duplicate, KEY };
})();
