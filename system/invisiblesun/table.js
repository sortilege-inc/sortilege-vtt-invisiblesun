// system/invisiblesun/table.js — what Invisible Sun tells the table (engine/vtt.js) and
// the player's page (engine/play.js): which scenes are in play, what can stand on the
// table, what a token's state reads as, and how a character file becomes a party
// member. The engine never asks the corpus directly.
//
// The corpus has no modules, maps or cast: a scene is the GM's own (system ops
// `scenes`), a map is whatever image the GM sets on it, and a scene's cast is the
// creatures and people the GM has put there from the books.
window.VttSystem = (function () {
  const D = window.IsData;
  const State = window.VttState;
  const S = () => State.state;
  const Sheet = () => window.IsSheet;

  const MODULE = 'narrative';                 // the one "module": the narrative itself

  function scenes() {
    return (S().scenes || []).map((sc) => ({ id: sc.id, name: sc.name, moduleId: MODULE }));
  }

  function scene(id) {
    return (S().scenes || []).find((sc) => sc.id === id) || null;
  }

  function currentSceneId() {
    const cur = (S().current || {})[MODULE];
    const all = scenes();
    return (all.find((s) => s.id === cur) || all[0] || {}).id || null;
  }

  // No map is tied to a scene — a scene is the GM's own — but two of the books' maps ship
  // here for the GM to set on any scene from the table's "maps in the repo…" picker: the
  // poster map of Indigo and the cloth map of the City of Satyrine (GM Tools; owner's
  // call to carry them, 2026-09-21).
  const maps = () => [];
  const mapDef = () => null;
  const defaultMapId = (sceneId) => sceneId;
  const legend = () => null;
  const mapAssets = () => [
    { label: 'Indigo — the poster map', image: 'assets/art/maps/indigo.webp' },
    { label: 'The City of Satyrine — the cloth map', image: 'assets/art/maps/satyrine.webp' },
  ];

  // ── tokens: the party, and the current scene's cast ────────────────
  function tokenSources() {
    const groups = [];
    const party = (S().party || []).map((m) => ({ id: 'tk-' + m.id, label: m.name, kind: 'party', owner: m.id, ref: m.id }));
    if (party.length) groups.push({ label: 'The party', items: party });
    const sc = scene(currentSceneId());
    const cast = ((sc && sc.cast) || []).map((id) => D.entity(id)).filter(Boolean).map((e) => ({ label: e.name, kind: 'cast', ref: e.id }));
    if (cast.length) groups.push({ label: (sc && sc.name) || 'The scene', items: cast });
    return groups;
  }

  // the site's own palette: gold for the vislae, red for what they meet, grey for a marker
  const COLORS = { party: '#a8842b', cast: '#96262a', marker: '#77746e' };
  const tokenColor = (t) => COLORS[t.kind] || COLORS.marker;

  // A party token's word: the harm the sheet keeps ("Wounds 1 · Anguish 2"), only when there is some.
  function tokenStatus(t) {
    if (t.kind !== 'party') return null;
    const m = (S().party || []).find((x) => x.id === t.owner);
    if (!m) return null;
    const v = (m.live && m.live.values) || {};
    const bits = ['Wounds', 'Anguish'].filter((k) => v[k]).map((k) => k + ' ' + v[k]);
    return { text: bits.join(' · '), pips: [] };
  }

  function selectToken(t) {
    if (t.kind === 'party') window.VttBus.emit('select', { kind: 'party', id: t.owner });
    else if (t.kind === 'cast' && t.ref) window.VttBus.emit('select', { kind: 'entity', id: t.ref });
  }

  const tokenMenu = () => null;

  // ── the player's page ──────────────────────────────────────────────
  const liveSheet = (m, opts) => Sheet().live(m, opts);
  const readCharacter = (obj, fileName) => Sheet().readMember(obj, fileName);
  const downloadCharacter = (m) => Sheet().downloadMember(m);
  const memberSubtitle = (m) => Sheet().sentence(m.character || {}, undefined) || 'a vislae';

  return {
    MODULE, scenes, scene, currentSceneId, maps, mapDef, defaultMapId, legend, mapAssets,
    tokenSources, tokenColor, tokenStatus, selectToken, tokenMenu,
    liveSheet, readCharacter, downloadCharacter, memberSubtitle,
  };
})();
