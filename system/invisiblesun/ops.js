// system/invisiblesun/ops.js — the ops Invisible Sun adds to the engine's, registered
// with the same call and shared the same way (engine/ops.js). Loaded by the browser
// after engine/ops.js, and imported by the Worker beside it, so the room applies the
// very same functions. Ids and drawn cards travel in the args: applying an op is
// deterministic everywhere, and the room never rolls or shuffles.
//
//   narrative  { mode }                          which of The Gate's modes is in play
//   scenes     [ { id, name, cast:[entityIds] } ] the GM's own scenes, in play order —
//                                                the corpus has no modules, so a scene
//                                                is whatever the GM writes ("Scenes or
//                                                Encounters", The Gate p65); done, notes
//                                                and the current one use the engine's
//                                                scene ops under moduleId 'narrative'
//   sooth      { deck, path, invisible, active, on, turned }   the Sooth Deck on the
//                                                Path of Suns (The Gate p10, p75)
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../../engine/ops.js'));
  else factory(root.VttOps);
})(typeof self !== 'undefined' ? self : this, function (Ops) {
  Ops.shared(['narrative', 'scenes', 'sooth']);

  Ops.register('setNarrative', (s, patch) => {
    s.narrative = Object.assign({}, s.narrative || {}, patch);
  });

  // ── the GM's scenes ──
  Ops.register('setScenes', (s, list) => {
    s.scenes = (list || []).slice();
  });
  Ops.register('putScene', (s, scene) => {
    if (!s.scenes) s.scenes = [];
    const i = s.scenes.findIndex((x) => x.id === scene.id);
    if (i === -1) s.scenes.push(scene);
    else s.scenes[i] = Object.assign({}, s.scenes[i], scene);
  });
  Ops.register('removeScene', (s, id) => {
    s.scenes = (s.scenes || []).filter((x) => x.id !== id);
  });
  // who is in a scene: corpus entities (a creature from Teratology, a person from a
  // sourcebook) the GM has put there; the table lists them as tokens
  Ops.register('setSceneCast', (s, sceneId, ids) => {
    const sc = (s.scenes || []).find((x) => x.id === sceneId);
    if (sc) sc.cast = (ids || []).slice();
  });

  // ── the Sooth Deck on the Path of Suns ──
  // "Cards are always played in order, moving down the Path of Suns. So the first card is
  //  played on the Silver Sun, the next on the Green Sun, and so on. The most recent card
  //  is the active card, and any effects of the previous card are now canceled. The only
  //  exception is that a card played on the Invisible Sun goes into the Testament of Suns
  //  and remains in effect until a new card is played on the Invisible Sun." (The Gate p10)
  function sooth(s) {
    if (!s.sooth) s.sooth = { deck: [], path: {}, invisible: null, active: null, on: null, turned: [] };
    return s.sooth;
  }
  // the deck's order is decided by the window that shuffles; the room only stores it
  Ops.register('soothShuffle', (s, ids) => {
    const so = sooth(s);
    so.deck = (ids || []).slice();
  });
  // a card is turned onto a sun; turning onto Silver begins the path afresh
  Ops.register('soothTurn', (s, cardId, sun, at) => {
    const so = sooth(s);
    so.deck = (so.deck || []).filter((x) => x !== cardId);
    if (sun === 'Invisible') so.invisible = cardId;
    else {
      if (sun === 'Silver') so.path = {};
      so.path = Object.assign({}, so.path || {}, { [sun]: cardId });
    }
    so.active = cardId;
    so.on = sun;
    so.turned = (so.turned || []).concat([{ id: cardId, sun, at: at || null }]).slice(-200);
  });
  // clear the path (a new session); the Invisible Sun's card stays unless told otherwise
  Ops.register('soothClear', (s, keepInvisible) => {
    const so = sooth(s);
    const inv = keepInvisible ? so.invisible : null;
    so.path = {};
    so.invisible = inv;
    so.active = inv;
    so.on = inv ? 'Invisible' : null;
  });
  Ops.register('soothReset', (s) => {
    s.sooth = { deck: [], path: {}, invisible: null, active: null, on: null, turned: [] };
  });

  return Ops;
});
