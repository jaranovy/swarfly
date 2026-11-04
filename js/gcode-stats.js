// 3018 fork: statistics of the generated G-code, shown under the "Generate G-Code" button:
// path length (cutting / rapid), estimated run time, removed material (area, volume, weight).
//
// Removed material is measured, not guessed: every cutting XY move is rasterised as a "stadium"
// (the tool diameter swept along the segment) into a bitmap per Z level, so overlapping passes
// (pocket stepover, repeated passes) are counted once. The thickness of a level is the distance
// to the next shallower level (the shallowest one counts from Z0).
(function () {
  var CELL = 0.25;                                   // mm, grid resolution
  var MATERIALS = [                                  // g/cm3, rough values
    ["MDF", 0.75], ["Překližka", 0.6], ["Dřevo měkké (smrk)", 0.5], ["Dřevo tvrdé (buk, dub)", 0.7],
    ["Akryl (plexi)", 1.18], ["PVC / pěnový plast", 0.5], ["Hliník", 2.7]
  ];
  var last = null;

  function toolDiameter() {
    try {
      for (var i = 0; i < toolpathsInScene.length; i++) {
        var u = toolpathsInScene[i].userData;
        if (u && u.camOperation && /^(CNC|Drill)/.test(u.camOperation)) {
          var d = parseFloat(u.camToolDia);
          if (d > 0) return d;
        }
      }
    } catch (e) { /* no toolpaths */ }
    return 3.175;
  }

  function parse(text) {
    var x = 0, y = 0, z = 0, g1 = false, feed = 0;
    var cutLen = 0, rapidLen = 0, segs = [];
    text.split(/\r?\n/).forEach(function (raw) {
      var line = raw.replace(/;.*$/, "").replace(/\([^)]*\)/g, "").trim().toUpperCase();
      if (!line) return;
      var gm = line.match(/\bG0*([01])\b/);
      if (gm) g1 = gm[1] === "1";
      else if (!/\b[XYZ]-?[\d.]/.test(line)) return;
      else if (!/^G?\d/.test(line) && !/^[XYZ]/.test(line)) return;
      if (!gm && /^[MGST]\d/.test(line) && !/\b[XYZ]-?[\d.]/.test(line)) return;
      var f = line.match(/\bF([\d.]+)/); if (f) feed = parseFloat(f[1]);
      var xw = line.match(/\bX(-?[\d.]+)/), yw = line.match(/\bY(-?[\d.]+)/), zw = line.match(/\bZ(-?[\d.]+)/);
      if (!xw && !yw && !zw) return;
      var nx = xw ? parseFloat(xw[1]) : x, ny = yw ? parseFloat(yw[1]) : y, nz = zw ? parseFloat(zw[1]) : z;
      var d3 = Math.sqrt((nx - x) * (nx - x) + (ny - y) * (ny - y) + (nz - z) * (nz - z));
      if (g1) {
        cutLen += d3;
        if (nz < -0.0005 || z < -0.0005) segs.push([x, y, nx, ny, Math.min(z, nz)]);
      } else {
        rapidLen += d3;
      }
      x = nx; y = ny; z = nz;
    });
    return { cutLen: cutLen, rapidLen: rapidLen, segs: segs };
  }

  // area (mm2) of the union of all levels' footprints + volume (mm3)
  function removed(segs, dia) {
    if (!segs.length) return { area: 0, volume: 0, depth: 0 };
    var r = dia / 2, minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9, levels = {};
    segs.forEach(function (s) {
      minx = Math.min(minx, s[0], s[2]); maxx = Math.max(maxx, s[0], s[2]);
      miny = Math.min(miny, s[1], s[3]); maxy = Math.max(maxy, s[1], s[3]);
      levels[Math.round(s[4] * 100) / 100] = true;
    });
    minx -= r + CELL; miny -= r + CELL; maxx += r + CELL; maxy += r + CELL;
    var W = Math.ceil((maxx - minx) / CELL), H = Math.ceil((maxy - miny) / CELL);
    var keys = Object.keys(levels).map(parseFloat).sort(function (a, b) { return b - a; }); // 0 > -0.5 > -1 ...
    if (W * H * (keys.length + 1) > 60e6) return null;                                       // too big, skip
    var maps = {}, union = new Uint8Array(W * H);
    keys.forEach(function (k) { maps[k] = new Uint8Array(W * H); });
    segs.forEach(function (s) {
      var m = maps[Math.round(s[4] * 100) / 100], ax = s[0], ay = s[1], bx = s[2], by = s[3];
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      var i0 = Math.max(0, Math.floor((Math.min(ax, bx) - r - minx) / CELL)), i1 = Math.min(W - 1, Math.ceil((Math.max(ax, bx) + r - minx) / CELL));
      var j0 = Math.max(0, Math.floor((Math.min(ay, by) - r - miny) / CELL)), j1 = Math.min(H - 1, Math.ceil((Math.max(ay, by) + r - miny) / CELL));
      for (var j = j0; j <= j1; j++) {
        var py = miny + (j + 0.5) * CELL;
        for (var i = i0; i <= i1; i++) {
          var px = minx + (i + 0.5) * CELL;
          var t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          var qx = px - (ax + t * dx), qy = py - (ay + t * dy);
          if (qx * qx + qy * qy <= r * r) m[j * W + i] = 1;
        }
      }
    });
    var volume = 0, prev = 0;
    keys.forEach(function (k) {
      var m = maps[k], n = 0;
      for (var q = 0; q < m.length; q++) if (m[q]) { n++; union[q] = 1; }
      var thick = Math.max(0, prev - k);                  // k is negative, prev is the shallower level
      volume += n * CELL * CELL * thick;
      prev = k;
    });
    var cells = 0; for (var u = 0; u < union.length; u++) if (union[u]) cells++;
    return { area: cells * CELL * CELL, volume: volume, depth: -keys[keys.length - 1] };
  }

  function fmt(n, d) { return n.toFixed(d).replace(".", ","); }

  function render() {
    var el = document.getElementById("gcodestats");
    if (!el || !last) return;
    var dens = parseFloat(localStorage.getItem("materialDensity")) || 0.75;
    var h = '<div title="Odhad z vygenerovaného G-kódu">'
      + '<i class="fa fa-route fa-fw fg-gray"></i> Dráha: <b>' + fmt(last.cutLen / 1000, 2) + ' m</b> řez + ' + fmt(last.rapidLen / 1000, 2) + ' m rychloposuv'
      + ' (celkem ' + fmt((last.cutLen + last.rapidLen) / 1000, 2) + ' m)</div>';
    if (last.rem && last.rem.volume > 0) {
      var cm3 = last.rem.volume / 1000;
      h += '<div><i class="fa fa-cube fa-fw fg-gray"></i> Odebráno: <b>' + fmt(last.rem.area / 100, 1) + ' cm²</b> plochy, hloubka ' + fmt(last.rem.depth, 1) + ' mm, <b>'
        + fmt(cm3, 2) + ' cm³</b> ≈ <b>' + fmt(cm3 * dens, 1) + ' g</b> ';
      h += '<select id="materialSelect" style="font-size:11px">' + MATERIALS.map(function (m) {
        return '<option value="' + m[1] + '"' + (m[1] === dens ? " selected" : "") + ">" + m[0] + "</option>";
      }).join("") + "</select></div>";
    } else if (last.rem === null) {
      h += '<div><i class="fa fa-cube fa-fw fg-gray"></i> Odebraný materiál: dílec je příliš velký na výpočet</div>';
    } else {
      h += '<div><i class="fa fa-cube fa-fw fg-gray"></i> Odebraný materiál: žádný (bez řezu pod Z0, např. laser)</div>';
    }
    el.innerHTML = h;
    el.style.display = "block";
    var sel = document.getElementById("materialSelect");
    if (sel) sel.onchange = function () { try { localStorage.setItem("materialDensity", sel.value); } catch (e) {} render(); };
  }

  window.updateGcodeStats = function (text) {
    var el = document.getElementById("gcodestats");
    if (!text || !text.trim()) { if (el) el.style.display = "none"; return; }
    var p = parse(text);
    last = { cutLen: p.cutLen, rapidLen: p.rapidLen, rem: removed(p.segs, toolDiameter()) };
    render();
  };
  window.hideGcodeStats = function () {
    var el = document.getElementById("gcodestats"); if (el) el.style.display = "none";
  };
  window.gcodeStatsParse = parse;            // for tests
  window.gcodeStatsRemoved = removed;
})();

// plan_001.svg -> plan_001.nc : lower case, ASCII only, max 8 characters (like the card programs)
function nc83Name(name) {
  var base = String(name || 'program').replace(/\.[^.]*$/, '');
  base = base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase().slice(0, 8);
  return (base || 'program') + '.nc';
}
