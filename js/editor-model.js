// Swarfly editor model: pure functions (no DOM, no THREE) used by the properties panel, placement mode and dimensions.
// Points are [x, y] arrays. A "box" is {minX, minY, maxX, maxY}. A reference point is one of the 9 positions of a 3x3 picker:
// "ll" lower-left, "lc" lower-centre, "lr" lower-right, "ml", "mc" (centre), "mr", "ul", "uc", "ur" (first letter = vertical, second = horizontal).

var EDITOR_REFS = ["ul", "uc", "ur", "ml", "mc", "mr", "ll", "lc", "lr"];

function editorBox(points) {
  if (!points || !points.length) throw new Error("No points");
  var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (var i = 0; i < points.length; i++) {
    if (points[i][0] < b.minX) b.minX = points[i][0];
    if (points[i][1] < b.minY) b.minY = points[i][1];
    if (points[i][0] > b.maxX) b.maxX = points[i][0];
    if (points[i][1] > b.maxY) b.maxY = points[i][1];
  }
  return b;
}

function editorBoxUnion(boxes) {
  var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  boxes.forEach(function(o) {
    b.minX = Math.min(b.minX, o.minX); b.minY = Math.min(b.minY, o.minY);
    b.maxX = Math.max(b.maxX, o.maxX); b.maxY = Math.max(b.maxY, o.maxY);
  });
  return b;
}

function editorSize(box) { return { w: box.maxX - box.minX, h: box.maxY - box.minY }; }

// The point of the box that a reference name stands for.
function editorRefPoint(box, ref) {
  if (EDITOR_REFS.indexOf(ref) < 0) throw new Error("Unknown reference point: " + ref);
  var x = ref[1] === "l" ? box.minX : ref[1] === "r" ? box.maxX : (box.minX + box.maxX) / 2;
  var y = ref[0] === "l" ? box.minY : ref[0] === "u" ? box.maxY : (box.minY + box.maxY) / 2;
  return [x, y];
}

// Move so that the reference point of the box lands on (x, y). Returns the [dx, dy] to add to every point.
function editorMoveDelta(box, ref, x, y) {
  var p = editorRefPoint(box, ref);
  return [x - p[0], y - p[1]];
}

// New width / height after the user typed a value in one field. keepRatio keeps the box proportions.
// `which` is "w" or "h". Returns [factorX, factorY] relative to the current size.
function editorResizeFactors(box, which, value, keepRatio) {
  var s = editorSize(box);
  value = Number(value);
  if (!(value > 0)) throw new Error("Size must be positive");
  if (!(s.w > 0) || !(s.h > 0)) {
    // a flat object (a straight line) has no ratio to keep
    return which === "w" ? [s.w > 0 ? value / s.w : 1, 1] : [1, s.h > 0 ? value / s.h : 1];
  }
  var f = which === "w" ? value / s.w : value / s.h;
  if (keepRatio) return [f, f];
  return which === "w" ? [f, 1] : [1, f];
}

// Scale about a fixed point (the reference point keeps its place).
function editorScalePoint(p, fixed, fx, fy) {
  return [fixed[0] + (p[0] - fixed[0]) * fx, fixed[1] + (p[1] - fixed[1]) * fy];
}

// Rotate about a centre; angle in degrees, positive = anticlockwise (like the mathematical convention on the XY plane).
function editorRotatePoint(p, centre, degrees) {
  var a = degrees * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  var dx = p[0] - centre[0], dy = p[1] - centre[1];
  return [centre[0] + dx * c - dy * s, centre[1] + dx * s + dy * c];
}

// Text for the dimension labels: "123.45".
function editorFormat(v) {
  var r = Math.round(v * 100) / 100;
  if (Object.is(r, -0)) r = 0;
  return r.toFixed(2);
}

// What the Dimensions button shows for a box: overall width and height plus where the lines are drawn.
function editorDimensions(box) {
  var s = editorSize(box);
  return {
    width: { text: editorFormat(s.w), from: [box.minX, box.minY], to: [box.maxX, box.minY] },
    height: { text: editorFormat(s.h), from: [box.minX, box.minY], to: [box.minX, box.maxY] }
  };
}

// Where the lower-left corner goes when a new shape of size w x h is held with its centre under the cursor.
function editorPlaceAtCursor(cursorX, cursorY, w, h) {
  return [cursorX - w / 2, cursorY - h / 2];
}

// Parameter definitions of the shapes: edited later in the properties panel. build() returns the closed polyline.
var EDITOR_SHAPES = {
  circle: { fields: [{ key: "radius", label: "Radius", min: 0.01 }, { key: "segments", label: "Segments", min: 3, int: true }],
    build: function(p) { return editorCircle(p.radius, p.segments); } },
  rectangle: { fields: [{ key: "width", label: "Width", min: 0.01 }, { key: "height", label: "Height", min: 0.01 }],
    build: function(p) { return shapeNormalize([[0, 0], [0, p.height], [p.width, p.height], [p.width, 0]]); } },
  "rounded rectangle": { fields: [{ key: "width", label: "Width", min: 0.01 }, { key: "height", label: "Height", min: 0.01 }, { key: "radius", label: "Corner radius", min: 0 }],
    build: function(p) { return shapeRoundedRect(p.width, p.height, p.radius, 8); } },
  ellipse: { fields: [{ key: "rx", label: "Radius X", min: 0.01 }, { key: "ry", label: "Radius Y", min: 0.01 }, { key: "segments", label: "Segments", min: 8, int: true }],
    build: function(p) { return shapeEllipse(p.rx, p.ry, p.segments); } },
  polygon: { fields: [{ key: "sides", label: "Sides", min: 3, int: true }, { key: "radius", label: "Radius (to corners)", min: 0.01 }],
    build: function(p) { return shapePolygon(p.sides, p.radius); } },
  star: { fields: [{ key: "points", label: "Points", min: 3, int: true }, { key: "outer", label: "Outer radius", min: 0.01 }, { key: "inner", label: "Inner radius", min: 0.01 }],
    build: function(p) { return shapeStar(p.points, p.outer, p.inner); } },
  slot: { fields: [{ key: "length", label: "Length", min: 0.01 }, { key: "width", label: "Width", min: 0.01 }],
    build: function(p) { return shapeSlot(p.length, p.width, 16); } }
};

// Closed circle polyline with its lower-left bounding-box corner at (0, 0).
function editorCircle(radius, segments) {
  radius = Number(radius); segments = Math.round(Number(segments));
  if (!(radius > 0)) throw new Error("Radius must be positive");
  if (!(segments >= 3)) throw new Error("A circle needs at least 3 segments");
  var pts = [];
  for (var i = 0; i < segments; i++) {
    var a = (i * 2 * Math.PI) / segments;
    pts.push([radius + radius * Math.cos(a), radius + radius * Math.sin(a)]);
  }
  pts.push([pts[0][0], pts[0][1]]);
  return pts;
}

// Validates and normalises a parameter set against the definition; throws a readable error.
function editorCheckParams(kind, params) {
  var def = EDITOR_SHAPES[kind];
  if (!def) throw new Error("This object has no editable parameters");
  var out = {};
  def.fields.forEach(function(f) {
    var v = Number(params[f.key]);
    if (!isFinite(v)) throw new Error(f.label + " must be a number");
    if (v < f.min) throw new Error(f.label + " must be at least " + f.min);
    out[f.key] = f.int ? Math.round(v) : v;
  });
  return out;
}

// Points of the shape described by kind + params, then moved so the lower-left corner is at (x, y).
function editorBuildShape(kind, params, x, y) {
  var p = editorCheckParams(kind, params);
  var pts = EDITOR_SHAPES[kind].build(p);
  var b = editorBox(pts);
  return pts.map(function(q) { return [q[0] - b.minX + (x || 0), q[1] - b.minY + (y || 0)]; });
}

var EDITOR_MEASURE_PROMPTS = {
  d1: "Measure: click the first point (Esc ends)",
  d2: "Measure: click the second point (Esc ends)",
  a1: "Angle: click the corner (Esc ends)",
  a2: "Angle: click a point on the first arm (Esc ends)",
  a3: "Angle: click a point on the second arm (Esc ends)"
};

// Status line prompt for the current state.
function editorPrompt(state) {
  if (state.draft) return "New shape: set the values in the bar - Enter creates it, then place it with the mouse - Esc cancels";
  if (state.placing) return "Click to place the shape - Esc: place at X0 Y0 - right click: cancel";
  if (state.measure) return EDITOR_MEASURE_PROMPTS[state.measure];
  if (state.cut === "trim") return "Trim: click the part of a line that should go (between two crossings) - Esc ends";
  if (state.cut === "tangent") return "Tangent: point at a circle or arc - the tangent line in the set direction is previewed - click to draw it - Esc ends";
  if (state.cut === "arc") return state.cutStep === 1 ? "Tangent arc: click the first line or arc (on the part that stays) - Esc ends" : "Tangent arc: click the second line or arc (on the part that stays) - Esc ends";
  if (state.cut === "reach") return state.cutStep === 1 ? "To intersection: click the first line on the part that stays - Esc ends" : "To intersection: click the second line on the part that stays - Esc ends";
  if (state.cut === "split") return "Split: click a line where it should be cut (crossings attract) - Esc ends";
  if (state.moveStep === 1) return "Click the point to move from (Esc cancels)";
  if (state.moveStep === 2) return "Click the point to move to (Esc cancels)";
  if (state.pick > 1) return state.pick + " objects under the pointer - click again to pick the next one";
  if (!state.count) return "Click an object or drag a window to select";
  if (state.count === 1) return "1 object selected - change X / Y / W / H in the panel";
  return state.count + " objects selected - the panel moves, resizes and rotates them together";
}

// ---- 1.5.0: mirror, copies, handles, arrow keys ---------------------------------------------------------------------

// Mirror a point: axis "x" flips left-right about the vertical line x = value, axis "y" flips up-down about y = value.
function editorMirrorPoint(p, axis, value) {
  if (axis === "x") return [2 * value - p[0], p[1]];
  if (axis === "y") return [p[0], 2 * value - p[1]];
  throw new Error("Axis must be x or y");
}

// Offsets of the extra copies of a linear copy: count = number of objects in total (original included) -> count-1 offsets.
function editorLinearOffsets(count, dx, dy) {
  count = Math.round(Number(count));
  if (!(count >= 2) || count > 500) throw new Error("Number of objects must be between 2 and 500");
  if (!isFinite(dx) || !isFinite(dy)) throw new Error("Distance must be a number");
  if (dx === 0 && dy === 0) throw new Error("Distance X and Y are both zero");
  var out = [];
  for (var i = 1; i < count; i++) out.push([dx * i, dy * i]);
  return out;
}

// Angles (degrees) of the extra copies of a circular copy. totalAngle 360 = full circle (the copies are spread evenly and the last
// one does not land on the original); any other total angle puts the last copy exactly at that angle.
function editorPolarAngles(count, totalAngle) {
  count = Math.round(Number(count));
  totalAngle = Number(totalAngle);
  if (!(count >= 2) || count > 500) throw new Error("Number of objects must be between 2 and 500");
  if (!isFinite(totalAngle) || totalAngle === 0) throw new Error("Angle must be a non-zero number");
  var step = Math.abs(totalAngle) >= 360 ? totalAngle / count : totalAngle / (count - 1);
  var out = [];
  for (var i = 1; i < count; i++) out.push(step * i);
  return out;
}

// The 8 handles of the selection box (the centre has none). A handle is dragged to the mouse point (mx, my);
// the OPPOSITE point of the box stays fixed. Corners keep the proportions unless `free`; edge handles change one side only.
// Returns {fx, fy, fixed:[x,y]}; the factors never fall below 0.01 (no flipping inside out).
var EDITOR_OPPOSITE = { ul: "lr", uc: "lc", ur: "ll", ml: "mr", mr: "ml", ll: "ur", lc: "uc", lr: "ul" };
function editorHandleFactors(box, handle, mx, my, free) {
  if (!EDITOR_OPPOSITE[handle]) throw new Error("Unknown handle: " + handle);
  var fixed = editorRefPoint(box, EDITOR_OPPOSITE[handle]), h = editorRefPoint(box, handle);
  var vx = h[0] - fixed[0], vy = h[1] - fixed[1];
  var fx = 1, fy = 1;
  if (vx !== 0 && vy !== 0) {
    if (free) { fx = (mx - fixed[0]) / vx; fy = (my - fixed[1]) / vy; }
    else {                                                    // project the mouse on the diagonal
      var f = ((mx - fixed[0]) * vx + (my - fixed[1]) * vy) / (vx * vx + vy * vy);
      fx = f; fy = f;
    }
  } else if (vx !== 0) fx = (mx - fixed[0]) / vx;
  else if (vy !== 0) fy = (my - fixed[1]) / vy;
  return { fx: Math.max(0.01, fx), fy: Math.max(0.01, fy), fixed: fixed };
}

// Arrow key step in mm: 1 mm, Shift = 10 mm, Alt = 0.1 mm. Returns [dx, dy] or null for other keys.
function editorArrowDelta(key, shift, alt) {
  var s = shift ? 10 : alt ? 0.1 : 1;
  if (key === "ArrowLeft") return [-s, 0];
  if (key === "ArrowRight") return [s, 0];
  if (key === "ArrowUp") return [0, s];
  if (key === "ArrowDown") return [0, -s];
  return null;
}

// ---- 1.5.1: snapping ------------------------------------------------------------------------------------------------------
// Intersection of segment ab with segment cd, or null (parallel, touching only the line extension, or outside).
function editorSegmentIntersection(a, b, c, d) {
  var rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
  var den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12) return null;
  var t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
  var u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + t * rx, a[1] + t * ry];
}

// Rank of the snap kinds: a point that really is on the drawing beats the grid.
var EDITOR_SNAP_RANK = { end: 0, intersection: 1, centre: 2, mid: 3, grid: 4 };

// Finds the best snap point for the cursor. polylines: array of arrays of [x, y] (the objects you may snap to - the caller leaves
// out the ones being moved). tol in mm. opts: {end, intersection, centre, mid, grid} flags (default all on) and gridStep (0 = no grid).
// Returns {point, kind, dist} or null.
function editorSnapFind(cursor, polylines, tol, opts) {
  opts = opts || {};
  var on = function(k) { return opts[k] !== false; };
  var best = null;
  function offer(p, kind) {
    var dist = Math.hypot(p[0] - cursor[0], p[1] - cursor[1]);
    if (dist > tol) return;
    if (!best || EDITOR_SNAP_RANK[kind] < EDITOR_SNAP_RANK[best.kind] || (EDITOR_SNAP_RANK[kind] === EDITOR_SNAP_RANK[best.kind] && dist < best.dist)) best = { point: p, kind: kind, dist: dist };
  }
  var near = [];
  for (var i = 0; i < polylines.length; i++) {
    var pl = polylines[i];
    if (!pl.length) continue;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var j = 0; j < pl.length; j++) {
      var p = pl[j];
      if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1]; if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1];
      if (on("end")) offer(p, "end");
      if (j > 0) {
        var q = pl[j - 1];
        if (on("mid")) offer([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], "mid");
        // segments passing close to the cursor are kept for the intersection test
        if (on("intersection") && near.length < 80 &&
            Math.min(p[0], q[0]) - tol <= cursor[0] && cursor[0] <= Math.max(p[0], q[0]) + tol &&
            Math.min(p[1], q[1]) - tol <= cursor[1] && cursor[1] <= Math.max(p[1], q[1]) + tol) near.push([q, p, i]);
      }
    }
    if (on("centre")) offer([(minX + maxX) / 2, (minY + maxY) / 2], "centre");
  }
  for (var a = 0; a < near.length; a++) {
    for (var b = a + 1; b < near.length; b++) {
      if (near[a][2] === near[b][2] && Math.abs(a - b) === 1) continue;       // neighbouring segments of one outline meet at a vertex anyway
      var x = editorSegmentIntersection(near[a][0], near[a][1], near[b][0], near[b][1]);
      if (x) offer(x, "intersection");
    }
  }
  if (on("grid") && opts.gridStep > 0) {
    var g = opts.gridStep;
    offer([Math.round(cursor[0] / g) * g, Math.round(cursor[1] / g) * g], "grid");
  }
  return best;
}

// Object snap for something that is moved by (dx, dy): every one of the 9 reference points of its box is tried and the closest
// snap wins. Returns {dx, dy, kind, point} (the adjusted move) or the unchanged move with kind null.
function editorSnapMove(box, dx, dy, polylines, tol, opts) {
  var best = null;
  for (var i = 0; i < EDITOR_REFS.length; i++) {
    var p = editorRefPoint(box, EDITOR_REFS[i]), c = [p[0] + dx, p[1] + dy];
    var s = editorSnapFind(c, polylines, tol, opts);
    if (s && (!best || EDITOR_SNAP_RANK[s.kind] < EDITOR_SNAP_RANK[best.s.kind] || (EDITOR_SNAP_RANK[s.kind] === EDITOR_SNAP_RANK[best.s.kind] && s.dist < best.s.dist))) best = { s: s, p: p };
  }
  if (!best) return { dx: dx, dy: dy, kind: null, point: null };
  return { dx: best.s.point[0] - best.p[0], dy: best.s.point[1] - best.p[1], kind: best.s.kind, point: best.s.point };
}

// Grid steps the Settings button cycles through (0 = off).
var EDITOR_GRID_STEPS = [1, 5, 10, 0.5, 0.1, 0];
function editorNextGridStep(current) {
  var i = EDITOR_GRID_STEPS.indexOf(Number(current));
  return EDITOR_GRID_STEPS[(i + 1) % EDITOR_GRID_STEPS.length];
}

// ---- 1.5.2: window selection, cycling through overlapping objects ---------------------------------------------------------
// Rectangle from two opposite corners [x, y]. Drawn left to right = "window" (objects must lie fully inside), right to left =
// "crossing" (objects that touch the rectangle count).
function editorRectFromCorners(a, b) {
  return {
    minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]), minY: Math.min(a[1], b[1]), maxY: Math.max(a[1], b[1]),
    mode: b[0] >= a[0] ? "window" : "crossing"
  };
}

// How the bounding box of an object lies against the rectangle: "outside" (no overlap), "inside" (fully within), "overlap".
function editorRectRelation(box, rect) {
  if (box.maxX < rect.minX || box.minX > rect.maxX || box.maxY < rect.minY || box.minY > rect.maxY) return "outside";
  if (box.minX >= rect.minX && box.maxX <= rect.maxX && box.minY >= rect.minY && box.maxY <= rect.maxY) return "inside";
  return "overlap";
}

// Does the polyline touch the rectangle? True when a point lies inside or a segment crosses an edge.
function editorPolylineTouchesRect(points, rect) {
  var corners = [[rect.minX, rect.minY], [rect.maxX, rect.minY], [rect.maxX, rect.maxY], [rect.minX, rect.maxY]];
  for (var i = 0; i < points.length; i++) {
    var p = points[i];
    if (p[0] >= rect.minX && p[0] <= rect.maxX && p[1] >= rect.minY && p[1] <= rect.maxY) return true;
    if (i === 0) continue;
    for (var c = 0; c < 4; c++) {
      if (editorSegmentIntersection(points[i - 1], p, corners[c], corners[(c + 1) % 4])) return true;
    }
  }
  return false;
}

// Selection test of one object: box = its bounding box, points = lazily fetched polyline (function) to avoid copying big outlines.
function editorMarqueeHit(box, getPoints, rect) {
  var rel = editorRectRelation(box, rect);
  if (rel === "outside") return false;
  if (rel === "inside") return true;
  return rect.mode === "crossing" ? editorPolylineTouchesRect(getPoints(), rect) : false;
}

// Clicking again on the same spot picks the next of several overlapping objects. state = {x, y, t, idx} of the previous click or null.
// Returns {idx, state}; the click counts as "the same spot" within 4 px and 2 seconds.
function editorCycleIndex(state, x, y, now, count) {
  if (!(count > 0)) return { idx: 0, state: { x: x, y: y, t: now, idx: 0 } };
  var same = state && Math.hypot(x - state.x, y - state.y) <= 4 && now - state.t <= 2000;
  var idx = same ? (state.idx + 1) % count : 0;
  return { idx: idx, state: { x: x, y: y, t: now, idx: idx } };
}

// ---- 1.6.0: typed coordinates, measuring, automatic dimensions ------------------------------------------------------------
// Parses a typed point. Absolute "x,y" / "x;y" / "x y" (a decimal comma is fine with ; or a space), relative to the last point
// "@dx,dy", polar relative "@length<angle" (angle in degrees, anticlockwise from +X). `last` is the previous point [x, y] or null.
function editorParseCoordinate(text, last) {
  var t = String(text).trim();
  if (!t) throw new Error("Type a point, e.g. 12.5,30 or @10,5");
  var relative = t.charAt(0) === "@";
  if (relative) t = t.slice(1).trim();
  var num = function(s) {
    var v = Number(String(s).trim().replace(",", "."));
    if (String(s).trim() === "" || !isFinite(v)) throw new Error("Not a number: " + String(s).trim());
    return v;
  };
  var x, y;
  if (t.indexOf("<") >= 0) {
    if (!relative) throw new Error("A polar point must start with @, e.g. @10<45");
    var pp = t.split("<");
    if (pp.length !== 2) throw new Error("Use @length<angle");
    var len = num(pp[0]), ang = num(pp[1]) * Math.PI / 180;
    x = len * Math.cos(ang); y = len * Math.sin(ang);
  } else {
    var parts;
    t = t.replace(/\s*,\s*/g, ",");                    // "12 , 5" is the same as "12,5"
    if (t.indexOf(";") >= 0) parts = t.split(";");
    else if (/\s/.test(t)) parts = t.split(/\s+/);
    else parts = t.split(",");
    if (parts.length !== 2) throw new Error("Use x,y (or x;y with decimal commas)");
    x = num(parts[0]); y = num(parts[1]);
  }
  if (relative) {
    if (!last) throw new Error("There is no previous point to measure from - type an absolute point");
    return [last[0] + x, last[1] + y];
  }
  return [x, y];
}

// Distance between two points with the components and the direction (degrees, anticlockwise from +X, 0..360).
function editorDistanceInfo(a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1], ang = Math.atan2(dy, dx) * 180 / Math.PI;
  return { dist: Math.hypot(dx, dy), dx: dx, dy: dy, angle: ang < 0 ? ang + 360 : ang };
}

// Angle at the vertex between the rays to p1 and p2, 0..180 degrees; null when a ray has no length.
function editorAngleInfo(vertex, p1, p2) {
  var ax = p1[0] - vertex[0], ay = p1[1] - vertex[1], bx = p2[0] - vertex[0], by = p2[1] - vertex[1];
  var la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (!la || !lb) return null;
  var c = (ax * bx + ay * by) / (la * lb);
  return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
}

// Does the closed outline look like a circle? Centre = middle of the bounding box, all points within tol (relative) of the mean
// radius and at least 9 points. Returns {cx, cy, r} or null. Used to label holes and discs with a diameter.
function editorCircleFit(points, tol) {
  tol = tol || 0.01;
  if (!points || points.length < 9) return null;
  var first = points[0], last = points[points.length - 1];
  if (Math.abs(first[0] - last[0]) > 1e-9 || Math.abs(first[1] - last[1]) > 1e-9) return null;      // must be closed
  var b = editorBox(points), cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2, sum = 0, i;
  for (i = 0; i < points.length; i++) sum += Math.hypot(points[i][0] - cx, points[i][1] - cy);
  var r = sum / points.length;
  if (!(r > 0)) return null;
  for (i = 0; i < points.length; i++) {
    if (Math.abs(Math.hypot(points[i][0] - cx, points[i][1] - cy) - r) > tol * r) return null;
  }
  return { cx: cx, cy: cy, r: r };
}

// Automatic dimensions of a list of outlines (arrays of points): a circle gets a diameter, anything else its width and height.
function editorAutoDimensions(outlines) {
  var out = [];
  outlines.forEach(function(pts) {
    if (!pts.length) return;
    var c = editorCircleFit(pts, 0.01);
    if (c) { out.push({ type: "dia", center: [c.cx, c.cy], r: c.r, text: "Ø " + editorFormat(2 * c.r) }); return; }
    var box = editorBox(pts), d = editorDimensions(box);
    if (box.maxX - box.minX <= 0 && box.maxY - box.minY <= 0) return;
    out.push({ type: "size", box: box, width: d.width, height: d.height });
  });
  return out;
}

// What the Dimensions button shows: 0 off, 1 overall size of the selection (or the drawing), 2 every object on its own.
function editorNextDimsMode(current) { return (Number(current) + 1) % 3; }

// ---- 1.6.1: rounded corners, chamfers, offset -----------------------------------------------------------------------------
// Rounds (mode "fillet", size = radius) or cuts (mode "chamfer", size = distance along both edges) every corner of a polyline.
// Open polylines keep their end points. A corner may use at most half of each adjacent edge, so neighbouring corners never
// overlap: a bigger size is reduced for that corner (counted in `clamped`). Almost straight vertices (turn under 1 degree) are left alone.
// Returns {points, corners, clamped}.
function editorCornerCut(points, mode, size) {
  if (mode !== "fillet" && mode !== "chamfer") throw new Error("Mode must be fillet or chamfer");
  size = Number(size);
  if (!(size > 0)) throw new Error("Size must be positive");
  if (!points || points.length < 3) throw new Error("An outline needs at least 3 points");
  var closed = points.length > 3 && Math.hypot(points[0][0] - points[points.length - 1][0], points[0][1] - points[points.length - 1][1]) < 1e-9;
  var pts = closed ? points.slice(0, -1) : points.slice();
  var n = pts.length, out = [], corners = 0, clamped = 0;
  for (var i = 0; i < n; i++) {
    var V = pts[i];
    if (!closed && (i === 0 || i === n - 1)) { out.push(V); continue; }
    var A = pts[(i - 1 + n) % n], B = pts[(i + 1) % n];
    var lenA = Math.hypot(A[0] - V[0], A[1] - V[1]), lenB = Math.hypot(B[0] - V[0], B[1] - V[1]);
    if (lenA < 1e-9 || lenB < 1e-9) { out.push(V); continue; }
    var u = [(A[0] - V[0]) / lenA, (A[1] - V[1]) / lenA], w = [(B[0] - V[0]) / lenB, (B[1] - V[1]) / lenB];
    var cosT = Math.max(-1, Math.min(1, u[0] * w[0] + u[1] * w[1])), theta = Math.acos(cosT);
    if (theta > Math.PI - 0.0175 || theta < 0.0175) { out.push(V); continue; }
    var tFull = mode === "fillet" ? size / Math.tan(theta / 2) : size, tMax = Math.min(lenA, lenB) / 2, t = Math.min(tFull, tMax);
    if (t < tFull - 1e-9) clamped++;
    corners++;
    var P1 = [V[0] + u[0] * t, V[1] + u[1] * t], P2 = [V[0] + w[0] * t, V[1] + w[1] * t];
    if (mode === "chamfer") { out.push(P1, P2); continue; }
    var r = t * Math.tan(theta / 2), bx = u[0] + w[0], by = u[1] + w[1], bl = Math.hypot(bx, by);
    var dC = r / Math.sin(theta / 2), C = [V[0] + bx / bl * dC, V[1] + by / bl * dC];
    var a1 = Math.atan2(P1[1] - C[1], P1[0] - C[0]), a2 = Math.atan2(P2[1] - C[1], P2[0] - C[0]), da = a2 - a1;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    var steps = Math.max(2, Math.ceil(Math.abs(da) / (Math.PI / 16)));
    for (var k = 0; k <= steps; k++) {
      var a = a1 + da * k / steps;
      out.push(k === 0 ? P1 : k === steps ? P2 : [C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)]);
    }
  }
  if (closed) out.push([out[0][0], out[0][1]]);
  return { points: out, corners: corners, clamped: clamped };
}

// Offsets closed outlines with the Clipper library (passed in, so this file stays free of globals): delta > 0 grows, < 0 shrinks.
// Round joins. Returns an array of closed outlines (shrinking can split an outline in two or remove it).
function editorOffsetOutlines(Clipper, outlines, delta) {
  delta = Number(delta);
  if (!isFinite(delta) || delta === 0) throw new Error("Offset must be a non-zero number");
  var scale = 1000, paths = [];
  outlines.forEach(function(pl) {
    var closed = pl.length > 3 && Math.hypot(pl[0][0] - pl[pl.length - 1][0], pl[0][1] - pl[pl.length - 1][1]) < 1e-9;
    if (!closed) throw new Error("Only closed outlines can be offset");
    paths.push(pl.slice(0, -1).map(function(p) { return { X: Math.round(p[0] * scale), Y: Math.round(p[1] * scale) }; }));
  });
  var co = new Clipper.ClipperOffset(2, scale * 0.005), result = new Clipper.Paths();
  co.AddPaths(paths, Clipper.JoinType.jtRound, Clipper.EndType.etClosedPolygon);
  co.Execute(result, delta * scale);
  return result.map(function(path) {
    var pts = path.map(function(q) { return [q.X / scale, q.Y / scale]; });
    pts.push([pts[0][0], pts[0][1]]);
    return pts;
  });
}

// ---- 1.6.3: extend / trim the ends of an open polyline -----------------------------------------------------------------------------
// Moves the first point (startDelta) and the last point (endDelta) along the direction of the first / last segment: positive extends,
// negative trims. Trimming cannot eat more than the segment minus 0.001 (the segment would vanish). Closed outlines are refused.
function editorExtendEnds(points, startDelta, endDelta) {
  startDelta = Number(startDelta); endDelta = Number(endDelta);
  if (!isFinite(startDelta) || !isFinite(endDelta)) throw new Error("Extension must be a number");
  if (!points || points.length < 2) throw new Error("An open line needs at least 2 points");
  var n = points.length;
  if (n > 3 && Math.hypot(points[0][0] - points[n - 1][0], points[0][1] - points[n - 1][1]) < 1e-9) throw new Error("Only open lines can be extended");
  var out = points.map(function(p) { return [p[0], p[1]]; });
  function move(i, j, delta) {                          // point i moves along the segment j -> i
    if (!delta) return;
    var dx = out[i][0] - out[j][0], dy = out[i][1] - out[j][1], len = Math.hypot(dx, dy);
    if (len < 1e-9) throw new Error("Cannot extend a zero-length segment");
    if (delta < 0 && -delta > len - 0.001) throw new Error("Cannot trim more than the length of the end segment");
    out[i] = [out[i][0] + dx / len * delta, out[i][1] + dy / len * delta];
  }
  move(0, 1, startDelta);
  move(n - 1, n - 2, endDelta);
  return out;
}

// ---- 1.7.0: size steps and rotation snapping -------------------------------------------------------------------------------------
// Rounds the new size given by the handle factors r = {fx, fy, fixed} to whole steps (default 1 mm; never below one step).
// One factor changing (edge handle) snaps that side; both changing: free mode snaps each side, proportional mode snaps the longer
// side and keeps the proportions.
function editorSnapSize(box, r, free, step) {
  step = step || 1;
  var w = box.maxX - box.minX, h = box.maxY - box.minY, fx = r.fx, fy = r.fy;
  function snapTo(len, f) { return len > 0 ? Math.max(step, Math.round(len * f / step) * step) / len : f; }
  var cx = Math.abs(fx - 1) > 1e-12, cy = Math.abs(fy - 1) > 1e-12;
  if (cx && cy) {
    if (free) { fx = snapTo(w, fx); fy = snapTo(h, fy); }
    else if (w >= h) { fx = snapTo(w, fx); fy = fx; }
    else { fy = snapTo(h, fy); fx = fy; }
  } else if (cx) fx = snapTo(w, fx);
  else if (cy) fy = snapTo(h, fy);
  return { fx: fx, fy: fy, fixed: r.fixed };
}

// Rotation angle in degrees: whole degrees, pulled to the nearest multiple of `magnet` (15) when within `tol` (4) degrees of it.
function editorSnapAngle(deg, step, magnet, tol) {
  step = step || 1; magnet = magnet || 15; tol = tol === undefined ? 4 : tol;
  var d = Math.round(deg / step) * step, m = Math.round(d / magnet) * magnet;
  if (Math.abs(d - m) <= tol) d = m;
  return d === 0 ? 0 : d;
}

// ---- 1.9.0: trim between crossings, split (the SAPS "erase part of a section" and "divide a section") ------------------------------
// A position on a polyline is a number t: the integer part is the segment, the fraction the way along it (0 .. n-1 for n points).

function editorPolyClosed(points) {
  var n = points ? points.length : 0;
  return n > 3 && Math.hypot(points[0][0] - points[n - 1][0], points[0][1] - points[n - 1][1]) < 1e-9;
}

// Point at position t (clamped to the ends).
function editorPointAt(points, t) {
  var n = points.length;
  if (t <= 0) return [points[0][0], points[0][1]];
  if (t >= n - 1) return [points[n - 1][0], points[n - 1][1]];
  var i = Math.floor(t), f = t - i;
  return [points[i][0] + (points[i + 1][0] - points[i][0]) * f, points[i][1] + (points[i + 1][1] - points[i][1]) * f];
}

// The position on the polyline nearest to p: {t, dist, point}.
function editorNearestPosition(points, p) {
  var best = null;
  for (var i = 0; i < points.length - 1; i++) {
    var a = points[i], b = points[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
    var f = len2 < 1e-18 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    var q = [a[0] + dx * f, a[1] + dy * f], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (!best || d < best.dist) best = { t: i + f, dist: d, point: q };
  }
  return best;
}

// Positions on `points` where any of the `others` (arrays of points) crosses or touches it, sorted, duplicates merged.
// A closed outline reports a crossing at its start only once (position 0, never n-1).
function editorCrossingPositions(points, others) {
  var n = points.length, eps = 1e-9, found = [];
  for (var i = 0; i < n - 1; i++) {
    var a = points[i], b = points[i + 1], rx = b[0] - a[0], ry = b[1] - a[1];
    for (var k = 0; k < others.length; k++) {
      var o = others[k];
      for (var j = 0; j < o.length - 1; j++) {
        var c = o[j], d = o[j + 1], sx = d[0] - c[0], sy = d[1] - c[1], den = rx * sy - ry * sx;
        if (Math.abs(den) < 1e-12) continue;
        var t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
        var u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
        if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) continue;
        found.push(i + Math.max(0, Math.min(1, t)));
      }
    }
  }
  var closed = editorPolyClosed(points);
  found = found.map(function(t) { return closed && t >= n - 1 - eps ? 0 : t; }).sort(function(x, y) { return x - y; });
  var out = [];
  found.forEach(function(t) { if (!out.length || t - out[out.length - 1] > 1e-7) out.push(t); });
  return out;
}

// The part of the polyline from position t0 forward to t1. For a closed outline t1 may be smaller than t0 (the part runs through
// the start); the result is always an open polyline without repeated points.
function editorSubPolyline(points, t0, t1) {
  var n = points.length, closed = editorPolyClosed(points), m = n - 1, out = [];
  if (closed && t1 <= t0) t1 += m;
  var at = function(t) { return editorPointAt(points, t > m ? t - m : t); };
  var push = function(p) { var q = out[out.length - 1]; if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 1e-9) out.push(p); };
  push(at(t0));
  for (var k = Math.floor(t0 + 1e-9) + 1; k < t1 - 1e-9; k++) push(at(k));
  push(at(t1));
  return out;
}

// The range [from, to] that a trim at clickT removes (positions; for a closed outline `to` may be smaller than `from`: the range runs
// through the start). The whole line when there is nothing to stop at.
function editorTrimRange(points, ts, clickT) {
  var n = points.length, closed = editorPolyClosed(points), eps = 1e-9, lo = null, hi = null;
  ts.forEach(function(t) { if (t <= clickT + eps) lo = t; });
  for (var i = 0; i < ts.length; i++) if (ts[i] > clickT + eps) { hi = ts[i]; break; }
  if (closed) {
    if (ts.length < 2) return [0, n - 1];
    return [lo === null ? ts[ts.length - 1] : lo, hi === null ? ts[0] : hi];
  }
  return [lo === null ? 0 : lo, hi === null ? n - 1 : hi];
}

// Removes the part of the line under position clickT that lies between the nearest crossings (ts, sorted). Returns the pieces that
// stay: [] when nothing stays (the whole line goes), otherwise polylines of at least two points. Open line: the parts before the
// previous and after the next crossing stay. Closed outline: the arc between the two crossings next to the click goes and the
// rest stays as one open line; a closed outline with fewer than two crossings goes completely.
function editorTrimPolyline(points, ts, clickT) {
  var n = points.length, closed = editorPolyClosed(points), eps = 1e-9, pieces = [];
  if (n < 2) return [];
  if (closed) {
    if (ts.length < 2) return [];
    var prev = null, next = null;
    ts.forEach(function(t) { if (t <= clickT + eps) prev = t; });
    for (var i = 0; i < ts.length; i++) if (ts[i] > clickT + eps) { next = ts[i]; break; }
    if (prev === null) prev = ts[ts.length - 1];
    if (next === null) next = ts[0];
    if (Math.abs(prev - next) < eps) return [];
    pieces.push(editorSubPolyline(points, next, prev));
  } else {
    var lo = null, hi = null;
    ts.forEach(function(t) { if (t <= clickT + eps) lo = t; });
    for (var j = 0; j < ts.length; j++) if (ts[j] > clickT + eps) { hi = ts[j]; break; }
    if (lo !== null && lo > eps) pieces.push(editorSubPolyline(points, 0, lo));
    if (hi !== null && hi < n - 1 - eps) pieces.push(editorSubPolyline(points, hi, n - 1));
  }
  return pieces.filter(function(p) { return p.length >= 2; });
}

// Cuts the line into pieces at the positions ts (sorted). Open line: ends are not cut points. Closed outline: two or more positions
// give that many arcs, one position opens the outline there. Returns null when there is nothing to cut.
function editorSplitPolyline(points, ts) {
  var n = points.length, closed = editorPolyClosed(points), eps = 1e-9, pieces = [];
  if (closed) {
    if (!ts.length) return null;
    if (ts.length === 1) return Math.abs(ts[0]) < eps ? null : [editorSubPolyline(points, ts[0], ts[0] + (n - 1))];
    for (var i = 0; i < ts.length; i++) pieces.push(editorSubPolyline(points, ts[i], ts[(i + 1) % ts.length]));
  } else {
    var cuts = ts.filter(function(t) { return t > eps && t < n - 1 - eps; });
    if (!cuts.length) return null;
    var bounds = [0].concat(cuts, [n - 1]);
    for (var j = 0; j < bounds.length - 1; j++) pieces.push(editorSubPolyline(points, bounds[j], bounds[j + 1]));
  }
  return pieces.filter(function(p) { return p.length >= 2; });
}

// ---- 1.12.0: tangent line under an angle, tangent arc between two elements (SAPS 8.3.14, 8.3.15) ----------------------------------
// An element is {type: "line", p, q} (a straight segment) or {type: "circle", cx, cy, r}.

// Circle through three points, or null when they are (nearly) on one line.
function editorCircleThrough(a, b, c) {
  var d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-9) return null;
  var a2 = a[0] * a[0] + a[1] * a[1], b2 = b[0] * b[0] + b[1] * b[1], c2 = c[0] * c[0] + c[1] * c[1];
  var cx = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d;
  var cy = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
  return { cx: cx, cy: cy, r: Math.hypot(a[0] - cx, a[1] - cy) };
}

// An open polyline that is an arc: at least 5 points, all within tol (relative to the radius) of the circle through its first, middle and
// last point. Returns {cx, cy, r} or null.
function editorArcFit(points, tol) {
  tol = tol || 0.01;
  if (!points || points.length < 5 || editorPolyClosed(points)) return null;
  var c = editorCircleThrough(points[0], points[Math.floor(points.length / 2)], points[points.length - 1]);
  if (!c || !(c.r > 0) || c.r > 1e6) return null;
  for (var i = 0; i < points.length; i++) if (Math.abs(Math.hypot(points[i][0] - c.cx, points[i][1] - c.cy) - c.r) > tol * c.r) return null;
  return c;
}

// What is under position t of a polyline: a circle / arc (the whole polyline is round) or the straight segment at t.
function editorElementAt(points, t) {
  var fit = editorPolyClosed(points) ? editorCircleFit(points, 0.01) : editorArcFit(points, 0.01);
  if (fit) return { type: "circle", cx: fit.cx, cy: fit.cy, r: fit.r };
  var i = Math.max(0, Math.min(points.length - 2, Math.floor(t)));
  return { type: "line", p: [points[i][0], points[i][1]], q: [points[i + 1][0], points[i + 1][1]] };
}

// The tangent lines of a circle that run in direction angleDeg touch it at two points; the one nearer to `near` is returned as a
// segment of `length` centred on the touching point: [[x1, y1], [x2, y2]].
function editorTangentLine(circle, angleDeg, near, length) {
  var a = angleDeg * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  var t1 = [circle.cx + circle.r * nx, circle.cy + circle.r * ny], t2 = [circle.cx - circle.r * nx, circle.cy - circle.r * ny];
  var t = Math.hypot(near[0] - t1[0], near[1] - t1[1]) <= Math.hypot(near[0] - t2[0], near[1] - t2[1]) ? t1 : t2, h = length / 2;
  return [[t[0] - ux * h, t[1] - uy * h], [t[0] + ux * h, t[1] + uy * h]];
}

// Centres of the circles with radius R that touch both elements: the intersections of the offset curves of the two elements
// (a line gives two parallels, a circle gives r + R and |r - R|).
function editorFilletCenters(a, b, R) {
  function offsets(el) {
    if (el.type === "line") {
      var dx = el.q[0] - el.p[0], dy = el.q[1] - el.p[1], len = Math.hypot(dx, dy);
      if (len < 1e-12) return [];
      var nx = -dy / len * R, ny = dx / len * R;
      return [{ line: true, p: [el.p[0] + nx, el.p[1] + ny], d: [dx / len, dy / len] }, { line: true, p: [el.p[0] - nx, el.p[1] - ny], d: [dx / len, dy / len] }];
    }
    var out = [{ line: false, cx: el.cx, cy: el.cy, r: el.r + R }];
    if (Math.abs(el.r - R) > 1e-9) out.push({ line: false, cx: el.cx, cy: el.cy, r: Math.abs(el.r - R) });
    return out;
  }
  function meet(u, v) {
    var out = [];
    if (u.line && v.line) {
      var den = u.d[0] * v.d[1] - u.d[1] * v.d[0];
      if (Math.abs(den) < 1e-12) return out;
      var s = ((v.p[0] - u.p[0]) * v.d[1] - (v.p[1] - u.p[1]) * v.d[0]) / den;
      out.push([u.p[0] + u.d[0] * s, u.p[1] + u.d[1] * s]);
    } else if (u.line !== v.line) {
      var l = u.line ? u : v, c = u.line ? v : u;
      var fx = l.p[0] - c.cx, fy = l.p[1] - c.cy, bb = fx * l.d[0] + fy * l.d[1], cc = fx * fx + fy * fy - c.r * c.r, disc = bb * bb - cc;
      if (disc < -1e-9) return out;
      var sq = Math.sqrt(Math.max(0, disc));
      [-bb - sq, -bb + sq].forEach(function(s2, k) { if (k === 0 || sq > 1e-9) out.push([l.p[0] + l.d[0] * s2, l.p[1] + l.d[1] * s2]); });
    } else {
      var dx = v.cx - u.cx, dy = v.cy - u.cy, d = Math.hypot(dx, dy);
      if (d < 1e-12 || d > u.r + v.r + 1e-9 || d < Math.abs(u.r - v.r) - 1e-9) return out;
      var aa = (u.r * u.r - v.r * v.r + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, u.r * u.r - aa * aa));
      var mx = u.cx + dx * aa / d, my = u.cy + dy * aa / d;
      out.push([mx - dy * hh / d, my + dx * hh / d]);
      if (hh > 1e-9) out.push([mx + dy * hh / d, my - dx * hh / d]);
    }
    return out;
  }
  var found = [];
  offsets(a).forEach(function(u) { offsets(b).forEach(function(v) {
    meet(u, v).forEach(function(c) { if (!found.some(function(f) { return Math.hypot(f[0] - c[0], f[1] - c[1]) < 1e-7; })) found.push(c); });
  }); });
  return found;
}

// Where the circle of radius R at `center` touches the element.
function editorTangentPoint(el, center, R) {
  if (el.type === "line") {
    var dx = el.q[0] - el.p[0], dy = el.q[1] - el.p[1], len2 = dx * dx + dy * dy;
    var s = ((center[0] - el.p[0]) * dx + (center[1] - el.p[1]) * dy) / len2;
    return [el.p[0] + dx * s, el.p[1] + dy * s];
  }
  var vx = el.cx - center[0], vy = el.cy - center[1], d = Math.hypot(vx, vy);
  if (d < 1e-12) return [center[0] + R, center[1]];
  var k = el.r > R + 1e-9 && Math.abs(d - (el.r - R)) < 1e-6 ? -1 : 1;     // the fillet circle lies inside the bigger circle: touch beyond the centre
  return [center[0] + k * vx / d * R, center[1] + k * vy / d * R];
}

// Points of the shorter arc from t1 to t2 around centre (both on the circle), step about stepDeg.
function editorArcBetween(center, t1, t2, stepDeg) {
  var a1 = Math.atan2(t1[1] - center[1], t1[0] - center[0]), a2 = Math.atan2(t2[1] - center[1], t2[0] - center[0]);
  var da = a2 - a1;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  var R = Math.hypot(t1[0] - center[0], t1[1] - center[1]), n = Math.max(2, Math.ceil(Math.abs(da) * 180 / Math.PI / (stepDeg || 3))), out = [];
  for (var i = 0; i <= n; i++) out.push([center[0] + R * Math.cos(a1 + da * i / n), center[1] + R * Math.sin(a1 + da * i / n)]);
  out[0] = [t1[0], t1[1]]; out[n] = [t2[0], t2[1]];
  return out;
}

// The tangent arc of radius R between the elements under two clicks. polyA / polyB: the polylines the elements come from (the touching
// points must lie on them). Of all possible circles the one whose touching points are nearest to the clicks wins.
// Returns {center, tA, tB, arc: [[x, y], ...]} or null.
function editorFilletArc(elA, elB, R, clickA, clickB, polyA, polyB) {
  if (!(R > 0)) return null;
  var best = null;
  function onPoly(poly, p) {
    if (!poly) return true;
    var near = editorNearestPosition(poly, p);
    return near && near.dist < 0.05 + 0.002 * R;
  }
  editorFilletCenters(elA, elB, R).forEach(function(c) {
    var ta = editorTangentPoint(elA, c, R), tb = editorTangentPoint(elB, c, R);
    if (!onPoly(polyA, ta) || !onPoly(polyB, tb)) return;
    var score = Math.hypot(ta[0] - clickA[0], ta[1] - clickA[1]) + Math.hypot(tb[0] - clickB[0], tb[1] - clickB[1]);
    if (!best || score < best.score) best = { center: c, tA: ta, tB: tb, score: score };
  });
  if (!best) return null;
  return { center: best.center, tA: best.tA, tB: best.tB, arc: editorArcBetween(best.center, best.tA, best.tB, 3) };
}

// The part of the open polyline that stays when the arc is attached at position tT and the click was at tClick: the side with the click,
// oriented so that it ENDS at the touching point (reversed = true when it had to be turned round). null when nothing is left.
function editorPieceEndingAt(points, tT, tClick) {
  var n = points.length, piece, reversed = false;
  if (tClick <= tT) piece = editorSubPolyline(points, 0, tT);
  else { piece = editorSubPolyline(points, tT, n - 1).reverse(); reversed = true; }
  return piece.length >= 2 ? { points: piece, reversed: reversed } : null;
}

// Puts the tangent arc between two polylines: both are trimmed to the touching points and joined with the arc into ONE open polyline.
// pointsA / pointsB: the two polylines (open); clickTA / clickTB: positions of the clicks on them. Returns the joined polyline or null.
function editorFilletJoin(pointsA, clickTA, fillet, pointsB, clickTB) {
  var tA = editorNearestPosition(pointsA, fillet.tA).t, tB = editorNearestPosition(pointsB, fillet.tB).t;
  var a = editorPieceEndingAt(pointsA, tA, clickTA), b = editorPieceEndingAt(pointsB, tB, clickTB);
  if (!a || !b) return null;
  var out = a.points.slice(0, a.points.length - 1).concat(fillet.arc, b.points.slice(0, b.points.length - 1).reverse());
  var clean = [];
  out.forEach(function(p) { var q = clean[clean.length - 1]; if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 1e-9) clean.push(p); });
  return clean;
}

// ---- 1.13.0: extend / trim two lines to their intersection (SAPS 8.3.9) ------------------------------------------------------------
// Intersection of the infinite lines through ab and cd: {point, s, u} (s, u = distance along each, 0..1 inside the segment) or null.
function editorLineHit(a, b, c, d) {
  var rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1], den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12) return null;
  var s = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  return { point: [a[0] + rx * s, a[1] + ry * s], s: s, u: u };
}

// The open polyline reaches the point I (on the straight line of the segment at tc): the side of I that holds the click stays, the other
// side is cut off - or, when I lies beyond the end of the polyline, that end segment is extended to I. null when this is not possible
// (closed outline, or I beyond an end but the clicked segment is not the end segment).
function editorReachPoint(points, tc, I) {
  var n = points.length;
  if (n < 2 || editorPolyClosed(points)) return null;
  var i = Math.max(0, Math.min(n - 2, Math.floor(tc))), a = points[i], b = points[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
  if (len2 < 1e-18) return null;
  var tI = i + ((I[0] - a[0]) * dx + (I[1] - a[1]) * dy) / len2, eps = 1e-9, out;
  if (tc <= tI) {
    if (tI > n - 1 + eps) { if (i !== n - 2) return null; out = points.slice(0, n - 1).concat([[I[0], I[1]]]); }
    else out = editorSubPolyline(points, 0, Math.min(tI, n - 1));
  } else {
    if (tI < -eps) { if (i !== 0) return null; out = [[I[0], I[1]]].concat(points.slice(1)); }
    else out = editorSubPolyline(points, Math.max(tI, 0), n - 1);
  }
  return out.length >= 2 ? out : null;
}
