// Pure helpers for "Suggest toolpaths" (release 1.20.0, node-testable, no DOM).
// Looks at the drawing, not at the material: holes are cut inside, the part outside and last, open lines are engraved, tiny circles are drilled.
// The result is only a pre-filled proposal - every toolpath is opened and checked in the normal toolpath dialog before G-code is made.

// Is the point inside the closed polygon (even-odd rule)?
function autoPointInPolygon(px, py, poly) {
  var inside = false;
  for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// shapes: [{pts: [[x, y], ...], closed: bool}] -> for each shape how many other closed shapes contain it (0 = outermost, 1 = a hole in a part, 2 = an island in a hole ...).
function autoNesting(shapes) {
  return shapes.map(function(s, i) {
    if (!s.pts.length) return 0;
    var n = 0;
    shapes.forEach(function(o, j) {
      if (i !== j && o.closed && o.pts.length >= 3 && autoPointInPolygon(s.pts[0][0], s.pts[0][1], o.pts)) n++;
    });
    return n;
  });
}

// A closed shape that is a circle (radius within 3 % everywhere): {cx, cy, d}, otherwise null.
function autoCircle(shape) {
  var p = shape.pts;
  if (!shape.closed || p.length < 8) return null;
  var minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  p.forEach(function(q) { minx = Math.min(minx, q[0]); maxx = Math.max(maxx, q[0]); miny = Math.min(miny, q[1]); maxy = Math.max(maxy, q[1]); });
  var cx = (minx + maxx) / 2, cy = (miny + maxy) / 2, r = ((maxx - minx) + (maxy - miny)) / 4;
  if (!(r > 0)) return null;
  for (var i = 0; i < p.length; i++) if (Math.abs(Math.hypot(p[i][0] - cx, p[i][1] - cy) - r) > 0.03 * r) return null;
  return { cx: cx, cy: cy, d: 2 * r };
}

var AUTO_OPS = {
  drill: "Drill: Peck (Centered)",
  inside: "CNC: Vector (path inside)",
  engrave: "CNC: Vector (no offset)",
  outside: "CNC: Vector (path outside)"
};

// shapes + options -> toolpath proposals in the order they should be cut: [{key, operation, name, indexes, zDepth}].
//  opts: toolDia (mm), thickness (mm of material), engraveDepth (mm, open lines), drillBelow (circles with a diameter up to toolDia * drillBelow are drilled)
// Order: drills, holes (inside), engraving, outside last - the part must stay held in the sheet until the very end.
function autoPlan(shapes, opts) {
  var tool = Number(opts.toolDia) > 0 ? Number(opts.toolDia) : 3.175;
  var thick = Number(opts.thickness) > 0 ? Number(opts.thickness) : 3;
  var engr = Number(opts.engraveDepth) > 0 ? Math.min(Number(opts.engraveDepth), thick) : Math.min(0.5, thick);
  var drillBelow = Number(opts.drillBelow) > 0 ? Number(opts.drillBelow) : 1.2;
  var nest = autoNesting(shapes);
  var groups = { drill: [], inside: [], engrave: [], outside: [] };
  shapes.forEach(function(s, i) {
    if (!s.closed) { groups.engrave.push(i); return; }
    var c = autoCircle(s);
    if (c && c.d <= tool * drillBelow) { groups.drill.push(i); return; }
    (nest[i] % 2 === 1 ? groups.inside : groups.outside).push(i);
  });
  var names = { drill: "Drill holes", inside: "Cut holes", engrave: "Engrave lines", outside: "Cut out" };
  var depth = { drill: thick, inside: thick, engrave: engr, outside: thick };
  var out = [];
  ["drill", "inside", "engrave", "outside"].forEach(function(k) {
    if (groups[k].length) out.push({ key: k, operation: AUTO_OPS[k], name: names[k], indexes: groups[k], zDepth: depth[k] });
  });
  return out;
}

// The values the Suggest toolpaths window starts with: what was used last time (JSON text from localStorage), else 3 mm material, the cutter of the
// last operation and 0.5 mm engraving. Bad or missing numbers fall back one by one.
function autoSettings(raw, lastToolDia) {
  var saved = {};
  try { saved = JSON.parse(raw) || {}; } catch (e) { saved = {}; }
  var pos = function(v, d) { v = Number(v); return v > 0 && isFinite(v) ? v : d; };
  return { thickness: pos(saved.thickness, 3), toolDia: pos(saved.toolDia, pos(lastToolDia, 3.175)), engraveDepth: pos(saved.engraveDepth, 0.5) };
}
