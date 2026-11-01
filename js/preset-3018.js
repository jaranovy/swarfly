// Defaults for the CNC 3018 Pro (GRBL, milling). Seeds localStorage once per browser profile.
// (Again when PRESET_VERSION changes or the page is opened with ?reset3018).
// Values follow the programs that are known to run on this machine (docs/gcode-template.md). Edit here, bump the version.
(function () {
  var PRESET_VERSION = "1";
  try {
    var reset = /[?&]reset3018\b/.test(location.search);
    if (!reset && localStorage.getItem("preset3018") === PRESET_VERSION) return;
    var s = {
      machinetype: "custom",
      sizexmax: 270, sizeymax: 175, sizezmax: 40,          // bed marks "270"/"175"; Z unmeasured (docs TODO A)
      scommand: "S", scommandscale: 10000, scommandnewline: false,   // S10000 like the working card programs
      g0command: "G0", g1command: "G1",
      startgcode: "; Created by OpenBuilds CAM (3018 preset)\nG21; mm-mode\nG90; Absolute Positioning\n",  // no G54 (not used by the working programs)
      endgcode: "M5 S0; Spindle Off\n",
      ihsgcode: "", laseron: "", laseroff: "", performanceLimit: false,
      hasSpindle: true, hasRouter: false, hasPlasma: false, hasLaser: false, hasPenPlotter: false, hasDust: false
    };
    Object.keys(s).forEach(function (k) { localStorage.setItem(k, s[k]); });
    // operation defaults (OpenBuilds reuses the last operation as the template for the next one)
    localStorage.setItem("lastCamOperation", JSON.stringify({
      camToolDia: 3.175, camStepover: 40, camZClearance: 3, camDragOffset: 1, camSpotSize: 0.1, camFillAngle: 0,
      camLaserPower: 100, camSpindleRpm: 10000, camZStep: 0.5, camZDepth: 2, camFeedrate: 500, camPlungerate: 200
    }));
    localStorage.setItem("preset3018", PRESET_VERSION);
  } catch (e) { console.warn("preset-3018 not applied", e); }
})();
