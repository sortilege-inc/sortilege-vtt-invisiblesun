// engine/config.js — where things are. The one file a deployment edits.
window.VttConfig = {
  system: 'invisiblesun',
  title: 'Invisible Sun',
  channel: 'sortilege-vtt-invisiblesun',        // BroadcastChannel name (same-machine windows)
  storagePrefix: 'sortilege-vtt-invisiblesun',  // localStorage key prefix
  dataGlobal: 'INVISIBLESUN',                   // the global data/*.js registers into
  // The pages, relative to the site root. Phase one is the site alone (index.html): the
  // rules, the sample vislae, the character creator. The gm/ pages come in a later phase
  // and will carry <base href="../"> so every path stays root-relative.
  pages: { site: './', gm: 'gm/', table: 'gm/vtt.html', play: 'gm/play.html' },
  // what a fresh browser opens on until a narrative is created or restored (phase two)
  defaultCampaign: { name: 'A new narrative', modules: [], books: [] },
  // The Worker that holds player sessions (phase two). Empty = sessions disabled.
  worker: {
    deployed: '',
    local: 'http://localhost:8787',
  },
};
window.VttConfig.workerUrl = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? window.VttConfig.worker.local : window.VttConfig.worker.deployed;
