// Swarfly 1.18.2 - pure maths of the zoom-dependent grid (node-testable, no DOM).
// Far away only the coarse lines are drawn; coming closer the 10 mm lines get stronger, then 5 mm lines fade in (grey), then 1 mm lines (very faint).
// A level appears when its lines are far enough apart on the screen (pixels), so the grid never turns into a grey wash.

function gridFade(v, lo, hi) {
  if (!(v > lo)) return 0;
  if (v >= hi) return 1;
  return (v - lo) / (hi - lo);
}

// How many screen pixels is 1 mm of the drawing plane at the target distance? fov in degrees (vertical), distance in mm, heightPx = canvas height.
function gridPxPerMm(fovDeg, distance, heightPx) {
  if (!(distance > 0) || !(heightPx > 0)) return 0;
  return heightPx / (2 * distance * Math.tan(fovDeg * Math.PI / 360));
}

// The look of every grid level at px pixels per mm: a = 0..1 strength (0 = not drawn), s10 = 0..1 how dark the 10 mm lines are.
function gridLevels(px) {
  return {
    a1: gridFade(px, 5, 10),                 // 1 mm lines once they are ~10 px apart
    a5: gridFade(px * 5, 7, 16),             // 5 mm
    a10: gridFade(px * 10, 5, 12),           // 10 mm
    s10: gridFade(px * 10, 25, 55),          // 10 mm turn from light to dark when zoomed in
    a100: gridFade(px * 100, 5, 12)          // 100 mm main lines
  };
}
