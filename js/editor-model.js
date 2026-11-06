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

// Status line prompt for the current state.
function editorPrompt(state) {
  if (state.placing) return "Click to place the shape - Esc: place at X0 Y0 - right click: cancel";
  if (state.moveStep === 1) return "Click the point to move from (Esc cancels)";
  if (state.moveStep === 2) return "Click the point to move to (Esc cancels)";
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
