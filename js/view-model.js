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
