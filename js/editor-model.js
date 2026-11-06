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
  if (!state.count) return "Click an object or drag a window to select";
  if (state.count === 1) return "1 object selected - change X / Y / W / H in the panel";
  return state.count + " objects selected - the panel moves, resizes and rotates them together";
}
