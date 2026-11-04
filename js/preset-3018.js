// Settings for the CNC 3018 Pro (GRBL, milling): defaults + optional config file.
// 1. If the local server provides /config.json (package: ../config/config.json), it is loaded at start and wins over the browser's localStorage.
// 2. Otherwise the built-in defaults below seed localStorage once (again when PRESET_VERSION changes or with ?reset3018).
// 3. Every change of a tracked setting is written back through POST /api/config (only the package server offers it; elsewhere it is skipped).
// Defaults follow the programs known to run on this machine (docs/gcode-template.md). Edit here, bump PRESET_VERSION.
(function () {
  var PRESET_VERSION = "3";
  var DEFAULTS = {
    machinetype: "custom",
    sizexmax: 270, sizeymax: 175, sizezmax: 40,                      // bed marks "270"/"175"; Z unmeasured
    scommand: "S", scommandscale: 10000, scommandnewline: false,     // S10000 like the working card programs
    g0command: "G0", g1command: "G1",
    startgcode: "; Created by OpenBuilds CAM (3018 preset)\nG21; mm-mode\nG90; Absolute Positioning\n",  // no G54 (not used by the working programs)
    endgcode: "M5\nM2\n",                                            // like the card programs (M5, M2)
    ihsgcode: "", laseron: "", laseroff: "", performanceLimit: false,
    hasSpindle: true, hasRouter: false, hasPlasma: false, hasLaser: false, hasPenPlotter: false, hasDust: false,
    // OpenBuilds reuses the last operation as the template for the next one
    // Must list EVERY field the app reads from it (advanced-cam-modal.js, "lastused" block): a missing key is written into the form
    // as "" by jQuery .val(undefined) -> empty Passes / Start height / Direction -> the generated G-code has no cutting moves.
    // Values not about milling are the form's own HTML defaults.
    lastCamOperation: {
      camToolDia: 3.175, camStepover: 40, camZClearance: 3, camDragOffset: 1, camSpotSize: 0.1, camFillAngle: 0,
      camLaserPower: 100, camSpindleRpm: 10000, camZStep: 0.5, camZDepth: 2, camFeedrate: 500, camPlungerate: 200,
      camZStart: 0, camPasses: 1, camDirection: "Climb",
      camPlasmaKerf: 1.2, camPlasmaZHeight: 1.5, camPlasmaPierceHeight: 4, camPlasmaPierceDelay: 1.5, camPlasmaLeadinDist: 5, camPlasmaIHS: "No",
      plotterType: "Z-Axis", camPenUp: 255, camPenDown: 0, camPenTime: 500, camPenUpZ: 5, camPenDownZ: 0
    }
  };
  var KEYS = Object.keys(DEFAULTS);
  var NUMBERS = { sizexmax: 1, sizeymax: 1, sizezmax: 1, scommandscale: 1 };

  function toStorage(k, v) { return (v !== null && typeof v === "object") ? JSON.stringify(v) : String(v); }
  function fromStorage(k, raw) {
    if (raw === null) return undefined;
    if (k === "lastCamOperation") { try { return JSON.parse(raw); } catch (e) { return undefined; } }
    if (NUMBERS[k]) { var n = parseFloat(raw); return isNaN(n) ? raw : n; }
    if (raw === "true") return true;
    if (raw === "false") return false;
    return raw;
  }
  function http(method, url, body) {   // synchronous on purpose: settings must be in place before the app starts
    var x = new XMLHttpRequest();
    x.open(method, url, false);
    if (body !== undefined) { x.setRequestHeader("Content-Type", "application/json"); x.setRequestHeader("X-Config", "1"); }
    x.send(body);
    return x;
  }

  try {
    var ls = window.localStorage;
    var rawSet = Storage.prototype.setItem;
    var reset = /[?&]reset3018\b/.test(location.search);
    var cfg = null, serverHasConfig = false;
    if (!reset) {
      try { var r = http("GET", "/config.json?t=" + Date.now()); if (r.status === 200) { cfg = JSON.parse(r.responseText); serverHasConfig = true; } } catch (e) { cfg = null; }
    }
    var seed = function (src) { KEYS.forEach(function (k) { if (src[k] !== undefined) rawSet.call(ls, k, toStorage(k, src[k])); }); };

    if (cfg && typeof cfg === "object") {
      seed(cfg);                                           // the file wins
      rawSet.call(ls, "preset3018", PRESET_VERSION);
    } else if (reset || ls.getItem("preset3018") !== PRESET_VERSION) {
      seed(DEFAULTS);
      rawSet.call(ls, "preset3018", PRESET_VERSION);
    }

    // write back to the file (debounced); skipped silently when there is no write endpoint
    var timer = null, warned = false;
    var flush = function () {
      timer = null;
      var out = {};
      KEYS.forEach(function (k) { var v = fromStorage(k, ls.getItem(k)); if (v !== undefined) out[k] = v; });
      try {
        var res = http("POST", "/api/config", JSON.stringify(out, null, 2));
        if (res.status >= 300 && !warned) { warned = true; console.warn("config.json not written, HTTP " + res.status); }
      } catch (e) { if (!warned) { warned = true; console.warn("config.json not written", e); } }
    };
    var probe = null;
    try { probe = http("OPTIONS", "/api/config"); } catch (e) { probe = null; }
    var canWrite = serverHasConfig || (probe && probe.status === 204);   // the package server answers 204 to OPTIONS
    if (canWrite) {
      Storage.prototype.setItem = function (k, v) {
        rawSet.call(this, k, v);
        if (this === ls && KEYS.indexOf(k) >= 0) { if (timer) clearTimeout(timer); timer = setTimeout(flush, 400); }
      };
      if (!serverHasConfig || reset) flush();              // first run (or reset): create / overwrite the file with the seeded values
    }
  } catch (e) { console.warn("preset-3018 not applied", e); }
})();
