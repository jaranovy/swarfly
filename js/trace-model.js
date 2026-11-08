// Pure helpers for tracing a picture into outlines (node-testable, no DOM). Used by js/potrace.js.
// Release 1.10.0: threshold (automatic by default), transparent pixels count as background, invert, smoothing presets, size in mm.

// Brightness 0..255 of one RGBA pixel; a transparent pixel counts as white (the paper), so a PNG with a transparent background
// no longer turns into one big black block.
function traceBrightness(r, g, b, a) {
  var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  var alpha = a / 255;
  return lum * alpha + 255 * (1 - alpha);
}

// Histogram (256 bins) of the brightness of RGBA data.
function traceHistogram(rgba) {
  var h = new Array(256).fill(0);
  for (var i = 0; i < rgba.length; i += 4) h[Math.max(0, Math.min(255, Math.round(traceBrightness(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]))))]++;
  return h;
}

// Otsu's method: the threshold that separates dark from light best. Pixels darker than the result are "ink".
function traceOtsu(hist) {
  var total = 0, sum = 0, i;
  for (i = 0; i < 256; i++) { total += hist[i]; sum += i * hist[i]; }
  if (!total) return 128;
  var wB = 0, sumB = 0, best = 0, threshold = 128;
  for (i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    var wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    var mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; threshold = i + 1; }
  }
  return threshold;
}

// Ink mask (Uint8Array, 1 = ink) of RGBA data. invert: light pixels are the ink (white drawing on black).
function traceMask(rgba, width, height, threshold, invert) {
  var mask = new Uint8Array(width * height);
  for (var p = 0, i = 0; p < mask.length; p++, i += 4) {
    var dark = traceBrightness(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]) < threshold;
    mask[p] = (invert ? !dark : dark) ? 1 : 0;
  }
  return mask;
}

// Size used for tracing: the longer side is at most maxSide pixels (large photos are slow and gain nothing). factor = traced / original.
function traceWorkSize(width, height, maxSide) {
  var f = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * f)), height: Math.max(1, Math.round(height * f)), factor: f };
}

// Smoothing presets -> potrace options. noise = largest speckle (in pixels of the traced size) that is dropped.
var TRACE_SMOOTHING = {
  sharp: { alphaMax: 0.3, optTolerance: 0.1 },
  normal: { alphaMax: 1, optTolerance: 0.2 },
  smooth: { alphaMax: 1.3, optTolerance: 0.5 }
};

function traceOptions(smoothing, noise) {
  var s = TRACE_SMOOTHING[smoothing] || TRACE_SMOOTHING.normal;
  return { turnPolicy: 4, turdSize: Math.max(0, Math.round(Number(noise) || 0)), alphaMax: s.alphaMax, optCurve: true, optTolerance: s.optTolerance };
}

// The default size of a picture: pixels at 96 dpi (as a browser would show them), in mm.
function traceDefaultWidthMm(widthPx) { return Math.round(widthPx * 25.4 / 96 * 100) / 100; }

// potrace's toSVG(scale) multiplies the coordinates (traced pixels) and the svg width / height, which the SVG reader then takes as
// px at 96 dpi. Returns the scale that makes the traced picture targetMm wide in the end.
function traceSvgScale(workWidthPx, targetMm) { return targetMm / (workWidthPx * 25.4 / 96); }

// Rough size of the result for the dialog: "42.33 x 21.17 mm".
function traceSizeText(widthPx, heightPx, targetMm) {
  var w = Number(targetMm);
  if (!isFinite(w) || w <= 0) return "";
  return (Math.round(w * 100) / 100) + " x " + (Math.round(w * heightPx / widthPx * 100) / 100) + " mm";
}

// ---- Swarfly 1.19.0: centre line tracing ------------------------------------------------------------------------------------------------
// potrace outlines a stroke twice (outer and inner edge: a black circle line gives two circles). For drawings made of lines the better result is
// ONE path along the middle of every stroke: thin the ink to a 1 pixel skeleton, follow it into paths, smooth and simplify them.

// Guo-Hall thinning. mask: Uint8Array w*h (1 = ink). Returns a new Uint8Array with the 1 pixel skeleton.
function traceThin(mask, w, h) {
  var W = w + 2, H = h + 2, img = new Uint8Array(W * H), x, y, i;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) img[(y + 1) * W + x + 1] = mask[y * w + x] ? 1 : 0;
  var changed = true, del = [];
  while (changed) {
    changed = false;
    for (var step = 0; step < 2; step++) {
      del.length = 0;
      for (y = 1; y <= h; y++) {
        for (x = 1; x <= w; x++) {
          i = y * W + x;
          if (!img[i]) continue;
          var p2 = img[i - W], p3 = img[i - W + 1], p4 = img[i + 1], p5 = img[i + W + 1], p6 = img[i + W], p7 = img[i + W - 1], p8 = img[i - 1], p9 = img[i - W - 1];
          var C = (!p2 && (p3 || p4)) + (!p4 && (p5 || p6)) + (!p6 && (p7 || p8)) + (!p8 && (p9 || p2));
          if (C !== 1) continue;
          var N1 = (p9 || p2) + (p3 || p4) + (p5 || p6) + (p7 || p8), N2 = (p2 || p3) + (p4 || p5) + (p6 || p7) + (p8 || p9), N = Math.min(N1, N2);
          if (N < 2 || N > 3) continue;
          if (step === 0) { if ((p6 || p7 || !p9) && p8) continue; }
          else { if ((p2 || p3 || !p5) && p4) continue; }
          del.push(i);
        }
      }
      if (del.length) changed = true;
      for (var k = 0; k < del.length; k++) img[del[k]] = 0;
    }
  }
  // staircase corners: remove simple points (all neighbours form ONE arc, at least two of them) one by one; keeps connectivity, makes the line 1 pixel wide
  var again = true;
  while (again) {
    again = false;
    for (y = 1; y <= h; y++) {
      for (x = 1; x <= w; x++) {
        i = y * W + x;
        if (!img[i]) continue;
        var r = [img[i - W], img[i - W + 1], img[i + 1], img[i + W + 1], img[i + W], img[i + W - 1], img[i - 1], img[i - W - 1]];
        var cnt = 0, arcs = 0;
        for (var t = 0; t < 8; t++) { cnt += r[t]; if (!r[t] && r[(t + 1) % 8]) arcs++; }
        if (cnt >= 2 && arcs === 1) { img[i] = 0; again = true; }
      }
    }
  }
  var out = new Uint8Array(w * h);
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) out[y * w + x] = img[(y + 1) * W + x + 1];
  return out;
}

// Follows a skeleton (Uint8Array, 1 = pixel) into paths: [{ pts: [[x, y], ...], closed: bool }], pixel coordinates. Paths run between end points and
// junctions; a ring without any junction becomes one closed path.
function traceSkeletonPaths(skel, w, h) {
  var DX = [0, 1, 1, 1, 0, -1, -1, -1], DY = [-1, -1, 0, 1, 1, 1, 0, -1];
  function has(x, y) { return x >= 0 && y >= 0 && x < w && y < h && skel[y * w + x] === 1; }
  function neighbours(x, y) {
    var r = [];
    for (var d = 0; d < 8; d++) if (has(x + DX[d], y + DY[d])) r.push([x + DX[d], y + DY[d]]);
    return r;
  }
  var deg = new Uint8Array(w * h), x, y;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (skel[y * w + x]) deg[y * w + x] = neighbours(x, y).length;
  var used = new Uint8Array(w * h), edges = {}, paths = [];
  function ekey(a, b) { var ia = a[1] * w + a[0], ib = b[1] * w + b[0]; return ia < ib ? ia + "," + ib : ib + "," + ia; }
  function walk(start, first) {
    var pts = [start, first], prev = start, cur = first;
    edges[ekey(start, first)] = 1;
    while (deg[cur[1] * w + cur[0]] === 2 && !used[cur[1] * w + cur[0]]) {
      used[cur[1] * w + cur[0]] = 1;
      var nb = neighbours(cur[0], cur[1]), next = null;
      for (var i = 0; i < nb.length; i++) if (!(nb[i][0] === prev[0] && nb[i][1] === prev[1]) && !edges[ekey(cur, nb[i])]) { next = nb[i]; break; }
      if (!next) break;
      edges[ekey(cur, next)] = 1;
      pts.push(next);
      prev = cur; cur = next;
    }
    return pts;
  }
  for (y = 0; y < h; y++) {
    for (x = 0; x < w; x++) {
      if (!skel[y * w + x] || deg[y * w + x] === 2) continue;     // start at end points (1) and junctions (3+)
      var nbs = neighbours(x, y);
      for (var k = 0; k < nbs.length; k++) {
        if (edges[ekey([x, y], nbs[k])]) continue;
        if (used[nbs[k][1] * w + nbs[k][0]]) continue;
        paths.push({ pts: walk([x, y], nbs[k]), closed: false });
      }
    }
  }
  for (y = 0; y < h; y++) {                                       // what is left are rings
    for (x = 0; x < w; x++) {
      if (!skel[y * w + x] || used[y * w + x] || deg[y * w + x] !== 2) continue;
      var ring = [[x, y]], prev = null, cur = [x, y];
      used[y * w + x] = 1;
      for (;;) {
        var nb2 = neighbours(cur[0], cur[1]), nx = null;
        for (var j = 0; j < nb2.length; j++) {
          if (prev && nb2[j][0] === prev[0] && nb2[j][1] === prev[1]) continue;
          if (used[nb2[j][1] * w + nb2[j][0]]) continue;
          nx = nb2[j]; break;
        }
        if (!nx) break;
        used[nx[1] * w + nx[0]] = 1;
        ring.push(nx);
        prev = cur; cur = nx;
      }
      if (ring.length >= 3) paths.push({ pts: ring, closed: true });
    }
  }
  return paths;
}

// Moving average (window of 2 * radius + 1 points) that keeps the end points of an open path.
function traceSmoothPoints(pts, closed, radius) {
  if (!radius || pts.length < 3) return pts;
  var n = pts.length, out = [];
  for (var i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) { out.push(pts[i]); continue; }
    var sx = 0, sy = 0, c = 0;
    for (var d = -radius; d <= radius; d++) {
      var j = i + d;
      if (closed) j = ((j % n) + n) % n; else if (j < 0 || j >= n) continue;
      sx += pts[j][0]; sy += pts[j][1]; c++;
    }
    out.push([sx / c, sy / c]);
  }
  return out;
}

// Douglas-Peucker on an open polyline.
function traceSimplify(pts, eps) {
  if (pts.length < 3) return pts.slice();
  function dist(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
    if (!l) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    var t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }
  var keep = new Uint8Array(pts.length), stack = [[0, pts.length - 1]];
  keep[0] = keep[pts.length - 1] = 1;
  while (stack.length) {
    var s = stack.pop(), best = -1, idx = -1;
    for (var i = s[0] + 1; i < s[1]; i++) { var d = dist(pts[i], pts[s[0]], pts[s[1]]); if (d > best) { best = d; idx = i; } }
    if (best > eps) { keep[idx] = 1; stack.push([s[0], idx], [idx, s[1]]); }
  }
  var out = [];
  for (var k = 0; k < pts.length; k++) if (keep[k]) out.push(pts[k]);
  return out;
}

// smoothing preset -> [moving average radius, simplify tolerance in pixels]
var TRACE_CENTER_SMOOTHING = { sharp: [0, 0.7], normal: [2, 1], smooth: [4, 1.6] };

// Centre lines of a mask: [{ pts, closed }] in pixel coordinates (pixel centres + 0.5). noise = shortest path (in pixels) that is kept.
function traceCenterlines(mask, w, h, smoothing, noise) {
  var sm = TRACE_CENTER_SMOOTHING[smoothing] || TRACE_CENTER_SMOOTHING.normal;
  var skel = traceThin(mask, w, h), ink = 0, bone = 0, i;
  for (i = 0; i < mask.length; i++) { if (mask[i]) ink++; if (skel[i]) bone++; }
  var thick = bone ? ink / bone : 0;                                 // stroke width in pixels; thinning shortens every end by about half of it
  var paths = traceSkeletonPaths(skel, w, h), out = [];
  paths.forEach(function(p) {
    if (p.pts.length < Math.max(2, Number(noise) || 0)) return;
    var pts = p.pts.map(function(q) { return [q[0] + 0.5, q[1] + 0.5]; });
    pts = traceSmoothPoints(pts, p.closed, sm[0]);
    if (p.closed) {                                                  // close the ring before simplifying so the seam is not a corner of its own
      var ring = pts.concat([pts[0]]);
      pts = traceSimplify(ring, sm[1]);
      pts.pop();
      if (pts.length < 3) return;
    } else {
      pts = traceSimplify(pts, sm[1]);
      // a hand drawn loop that does not quite meet: ends closer than ~2 % of the picture on a long enough path become a closed ring
      var gap = Math.max(4, 0.02 * Math.max(w, h)) + thick, len = 0;
      for (var k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      var ends = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
      if (pts.length >= 4 && ends <= gap && len > 5 * gap) { out.push({ pts: pts, closed: true, joined: true }); return; }
    }
    out.push({ pts: pts, closed: p.closed });
  });
  return out;
}

// SVG text of centre lines; scale multiplies the coordinates and the size (as potrace's toSVG does).
function traceCenterSvg(lines, w, h, scale) {
  var d = lines.map(function(l) {
    return "M" + l.pts.map(function(p) { return (p[0] * scale).toFixed(3) + " " + (p[1] * scale).toFixed(3); }).join(" L") + (l.closed ? " Z" : "");
  }).join(" ");
  return '<svg id="svg" version="1.1" width="' + (w * scale) + '" height="' + (h * scale) + '" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="#000000" stroke-width="1" d="' + d + '"/></svg>';
}

// Does the picture look like a drawing made of thin lines (centre line tracing makes sense) rather than filled shapes? Typical stroke thickness
// = 2 * ink area / perimeter; thin = under 5 % of the longer side.
function traceLooksLikeLines(mask, w, h) {
  var area = 0, perim = 0, x, y;
  for (y = 0; y < h; y++) {
    for (x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      area++;
      if (x === 0 || !mask[y * w + x - 1] || x === w - 1 || !mask[y * w + x + 1] || y === 0 || !mask[(y - 1) * w + x] || y === h - 1 || !mask[(y + 1) * w + x]) perim++;
    }
  }
  if (!area || !perim) return false;
  return (2 * area / perim) < 0.05 * Math.max(w, h);
}
