// Swarfly 1.15.0 - pure maths of the camera helpers for a mouse without wheel / middle button (node-testable, no DOM).

// Which camera gesture does a left-button drag mean? mode = value of the Rotate / Zoom-window toggle buttons (null, "orbit", "window").
// Shift = rotate, Alt = rotate (older habit), Ctrl+Shift = zoom by dragging up/down. Ctrl alone stays "add to selection".
function viewGesture(mode, shift, alt, ctrl) {
  if (ctrl && shift) return "zoom";
  if (mode === "window") return "window";
  if (mode === "orbit" || shift || alt) return "orbit";
  return null;
}

// Camera distance factor for the + / - buttons and for the zoom drag (dragging down = zoom out).
function viewStepFactor(zoomIn) { return zoomIn ? 0.75 : 1 / 0.75; }
function viewDragFactor(dy) { return Math.exp(Math.max(-300, Math.min(300, dy)) * 0.006); }

// Zoom to a window: the screen rectangle {x0, y0, x1, y1} (pixels) inside a view of w x h pixels. Returns {cx, cy} = the rectangle centre as a
// fraction of the view (0..1) and {factor} = how the camera distance changes so the window fills the view; null when the window is a click.
function viewWindowPlan(rect, w, h) {
  var rw = Math.abs(rect.x1 - rect.x0), rh = Math.abs(rect.y1 - rect.y0);
  if (!(w > 0 && h > 0) || rw < 6 || rh < 6) return null;
  return { cx: (rect.x0 + rect.x1) / 2 / w, cy: (rect.y0 + rect.y1) / 2 / h, factor: Math.max(rw / w, rh / h) };
}

// Swarfly 1.16.1: is the camera looking from the side (so the depth axis and grid are worth drawing)? (dx, dy, dz) = camera position minus the
// target. From straight above (a plain 2D view, within about 3 degrees) it is false. Z is up in the scene.
function viewIsTilted(dx, dy, dz) {
  var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (!(len > 0)) return false;
  return Math.abs(dz) / len < 0.9986;
}

// Swarfly 1.22.0: how thick the drawing lines are drawn (WebGL lines are 1 px, so thicker ones are the same lines drawn again shifted).
// raw = the stored value ("1", "2", "3"); the old switch swarflyThickLines = "0" means 1 px. Default 2.
function viewLineWidth(raw, legacyOff) {
  var n = Math.round(Number(raw));
  if (n >= 1 && n <= 3) return n;
  return legacyOff === "0" ? 1 : 2;
}

// Pixel shifts of the extra passes for a line width: 1 -> none, 2 -> three passes, 3 -> eight (a 3 x 3 block around the line).
function viewLineOffsets(width) {
  if (width <= 1) return [];
  if (width === 2) return [[1, 0], [0, 1], [1, 1]];
  var out = [];
  for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) if (dx || dy) out.push([dx, dy]);
  return out;
}

function viewNextLineWidth(width) {
  return width >= 3 ? 1 : width + 1;
}
