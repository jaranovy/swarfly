// 3018 fork: G-code parser + validator for the program this app is about to save.
// Pure JS (no DOM): used by the app (warning toast after "Generate G-Code") and by the unit / e2e tests.
//
//   var r = validateGcode(text, { mode: "auto", maxX: 270, maxY: 175, minZ: -8, maxZ: 40 });
//   r.ok, r.errors [{line, code, message}], r.warnings [...], r.stats {moves, cutLen, rapidLen, minX, maxX, ...}
//
// Errors are things that make the machine do something wrong (several moves on one line, a rapid move through
// material, cutting with the spindle / laser off, Z moves in a laser program, ...). Warnings are suspicious but legal.
var GCODE_ALLOWED_G = { 0: 1, 1: 1, 4: 1, 17: 1, 20: 1, 21: 1, 54: 1, 90: 1, 91: 1, 94: 1 };
var GCODE_ALLOWED_M = { 2: 1, 3: 1, 4: 1, 5: 1, 8: 1, 9: 1, 30: 1 };

function parseGcodeLine(raw) {
  var text = raw.replace(/;.*$/, "").replace(/\([^)]*\)/g, "").trim().toUpperCase();
  var words = [], rest = text;
  var re = /([A-Z])\s*([-+]?\d*\.?\d+)/g, m;
  while ((m = re.exec(text)) !== null) words.push({ letter: m[1], value: parseFloat(m[2]) });
  rest = text.replace(re, "").replace(/\s+/g, "");
  return { text: text, words: words, garbage: rest };
}

function validateGcode(gcode, opts) {
  opts = opts || {};
  var errors = [], warnings = [];
  var err = function (line, code, message) { errors.push({ line: line, code: code, message: message }); };
  var warn = function (line, code, message) { warnings.push({ line: line, code: code, message: message }); };
  var lines = String(gcode).split(/\r?\n/);

  // mode: any Z word in a motion line => milling, otherwise laser
  var mode = opts.mode || "auto";
  var parsed = lines.map(parseGcodeLine);
  if (mode === "auto") {
    mode = "laser";
    parsed.forEach(function (p) { if (/\bZ-?[\d.]/.test(p.text)) mode = "mill"; });
  }

  var x = 0, y = 0, z = 0, feed = 0, g1 = false, spindleOn = false, spindleS = 0, units = false, absolute = false;
  var stats = { lines: 0, moves: 0, cutMoves: 0, cutLen: 0, rapidLen: 0, minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9, minZ: 1e9, maxZ: -1e9, mode: mode };
  var sawM5End = false, lastCommandLine = 0;

  parsed.forEach(function (p, idx) {
    var n = idx + 1;
    if (!p.text) return;
    stats.lines++;
    lastCommandLine = n;
    if (/UNDEFINED|NAN|NULL|INFINITY/.test(p.text)) { err(n, "BAD_VALUE", "line contains undefined/NaN/null: " + p.text.slice(0, 60)); return; }
    if (p.garbage) { err(n, "SYNTAX", "unparsable text '" + p.garbage.slice(0, 30) + "' in: " + p.text.slice(0, 60)); return; }

    var count = {}, motionG = [];
    p.words.forEach(function (w) {
      count[w.letter] = (count[w.letter] || 0) + 1;
      if (w.letter === "G" && (w.value === 0 || w.value === 1 || w.value === 2 || w.value === 3)) motionG.push(w.value);
    });
    // several moves glued on one line ("G1 X1 Y1 G1 X2 Y2" or repeated axis words)
    if (motionG.length > 1 || count.X > 1 || count.Y > 1 || count.Z > 1 || count.F > 1) {
      err(n, "MULTI_COMMAND", "more than one move on one line: " + p.text.slice(0, 70));
      return;
    }

    var skipMotion = false;
    p.words.forEach(function (w) {
      if (w.letter === "G") {
        if (!GCODE_ALLOWED_G[w.value]) err(n, "UNKNOWN_G", "G" + w.value + " is not used by this machine's programs");
        if (w.value === 21) units = true;
        if (w.value === 20) err(n, "INCHES", "G20 (inch) in a mm program");
        if (w.value === 90) absolute = true;
        if (w.value === 91) err(n, "RELATIVE", "G91 relative mode is not expected");
        if (w.value === 0) g1 = false;
        if (w.value === 1) g1 = true;
        if (w.value === 4) skipMotion = true;
      } else if (w.letter === "M") {
        if (!GCODE_ALLOWED_M[w.value]) err(n, "UNKNOWN_M", "M" + w.value + " is not used by this machine's programs");
        if (w.value === 3 || w.value === 4) spindleOn = true;
        if (w.value === 5 || w.value === 2 || w.value === 30) { spindleOn = false; spindleS = 0; }
        if (w.value === 5) sawM5End = true;
      } else if (w.letter === "S") {
        spindleS = w.value;
        if (w.value <= 0) spindleOn = false;
        if (opts.maxS && w.value > opts.maxS) err(n, "S_RANGE", "S" + w.value + " is above the allowed maximum " + opts.maxS);
      } else if (w.letter === "F") {
        feed = w.value;
        if (opts.maxFeed && w.value > opts.maxFeed) warn(n, "FEED_HIGH", "F" + w.value + " is above " + opts.maxFeed);
      } else if ("XYZ".indexOf(w.letter) < 0 && "GMSFP".indexOf(w.letter) < 0) {
        err(n, "UNKNOWN_WORD", "unexpected word " + w.letter + w.value);
      }
    });
    if (skipMotion) return;

    var hasAxis = count.X || count.Y || count.Z;
    if (!hasAxis) return;
    if (!units) err(n, "NO_UNITS", "motion before G21");
    if (!absolute) err(n, "NO_ABSOLUTE", "motion before G90");
    var nx = x, ny = y, nz = z;
    p.words.forEach(function (w) { if (w.letter === "X") nx = w.value; if (w.letter === "Y") ny = w.value; if (w.letter === "Z") nz = w.value; });
    var dxy = Math.sqrt((nx - x) * (nx - x) + (ny - y) * (ny - y));
    var d3 = Math.sqrt(dxy * dxy + (nz - z) * (nz - z));

    if (mode === "laser" && count.Z) err(n, "LASER_Z", "Z word in a laser program: " + p.text.slice(0, 60));
    if (g1) {
      if (!(feed > 0)) err(n, "NO_FEED", "G1 before any F word");
      stats.cutLen += d3; stats.moves++;
      if (mode === "mill" && nz < -0.0005 && !spindleOn) err(n, "SPINDLE_OFF", "cutting below Z0 while the spindle is off");
      if (mode === "laser" && !spindleOn) err(n, "LASER_OFF", "G1 move while the laser is off (no M3/M4 or S0)");
      if (mode === "laser" && spindleOn && !(spindleS > 0) && !count.S) err(n, "LASER_NO_POWER", "laser on without an S value");
      if (nz < -0.0005 || mode === "laser") stats.cutMoves++;
    } else {
      stats.rapidLen += d3; stats.moves++;
      if (mode === "mill" && z < -0.0005 && dxy > 0.0001) err(n, "RAPID_IN_MATERIAL", "rapid XY move at Z " + z + " (inside the material)");
    }
    x = nx; y = ny; z = nz;
    stats.minX = Math.min(stats.minX, x); stats.maxX = Math.max(stats.maxX, x);
    stats.minY = Math.min(stats.minY, y); stats.maxY = Math.max(stats.maxY, y);
    stats.minZ = Math.min(stats.minZ, z); stats.maxZ = Math.max(stats.maxZ, z);

    if (opts.maxX !== undefined && (x > opts.maxX || y > opts.maxY)) err(n, "BOUNDS", "X/Y outside the machine (" + x + ", " + y + ")");
    if (opts.minZ !== undefined && z < opts.minZ) err(n, "BOUNDS_Z", "Z " + z + " below the allowed minimum " + opts.minZ);
    if (opts.maxZ !== undefined && z > opts.maxZ) err(n, "BOUNDS_Z", "Z " + z + " above the allowed maximum " + opts.maxZ);
    if ((x < -0.0005 || y < -0.0005) && !errors.some(function (e) { return e.code === "NEGATIVE_XY"; }) && !warnings.some(function (e) { return e.code === "NEGATIVE_XY"; })) {
      warn(n, "NEGATIVE_XY", "negative X/Y coordinates (" + x + ", " + y + "): move the part away from the zero corner");
    }
  });

  if (!stats.moves) err(0, "NO_MOVES", "the program contains no motion");
  if (stats.moves && !sawM5End) warn(lastCommandLine, "NO_M5", "program never switches the spindle/laser off with M5");
  if (stats.moves && !parsed.some(function (p) { return /\bM0*2\b|\bM30\b/.test(p.text); })) warn(lastCommandLine, "NO_END", "no M2 at the end");
  if (stats.minX === 1e9) { stats.minX = stats.maxX = stats.minY = stats.maxY = stats.minZ = stats.maxZ = 0; }
  return { ok: errors.length === 0, errors: errors, warnings: warnings, stats: stats };
}

function formatGcodeIssues(result, limit) {
  limit = limit || 5;
  return result.errors.slice(0, limit).map(function (e) { return (e.line ? "line " + e.line + ": " : "") + e.message; }).join("\n");
}
