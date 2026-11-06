// Swarfly: pure geometry for the "Shapes" menu (no DOM, no THREE) so it can be unit-tested in node.
// Every generator returns a CLOSED polyline as an array of [x, y] points (first point == last point),
// moved so that the lower-left corner of its bounding box is at (0, 0) - same convention as addRect.
// Angles: first vertex of polygon / star points up (+Y), like a drawn star.

function shapeNormalize(points) {
  var minX = Infinity, minY = Infinity, i;
  for (i = 0; i < points.length; i++) {
    if (points[i][0] < minX) minX = points[i][0];
    if (points[i][1] < minY) minY = points[i][1];
  }
  var out = [];
  for (i = 0; i < points.length; i++) {
    // round to 1e-9 so that tiny float noise does not show up as -0.000000000001
    out.push([Math.round((points[i][0] - minX) * 1e9) / 1e9, Math.round((points[i][1] - minY) * 1e9) / 1e9]);
  }
  out.push([out[0][0], out[0][1]]);
  return out;
}

// Regular polygon with n sides. radius = circumscribed circle (corner distance) or, with inscribed=true, the
// inradius (distance to the middle of a side) - handy for "a hexagon 20 mm across flats".
function shapePolygon(n, radius, inscribed) {
  n = Math.round(n);
  if (!(n >= 3)) throw new Error("A polygon needs at least 3 sides");
  if (!(radius > 0)) throw new Error("Radius must be positive");
  var R = inscribed ? radius / Math.cos(Math.PI / n) : radius;
  var pts = [];
  for (var i = 0; i < n; i++) {
    var a = Math.PI / 2 + (i * 2 * Math.PI) / n;
    pts.push([R * Math.cos(a), R * Math.sin(a)]);
  }
  return shapeNormalize(pts);
}

// Star with n points: 2n vertices alternating between outer and inner radius.
function shapeStar(n, outerRadius, innerRadius) {
  n = Math.round(n);
  if (!(n >= 3)) throw new Error("A star needs at least 3 points");
  if (!(outerRadius > 0) || !(innerRadius > 0)) throw new Error("Radii must be positive");
  if (!(innerRadius < outerRadius)) throw new Error("Inner radius must be smaller than the outer radius");
  var pts = [];
  for (var i = 0; i < 2 * n; i++) {
    var r = i % 2 === 0 ? outerRadius : innerRadius;
    var a = Math.PI / 2 + (i * Math.PI) / n;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return shapeNormalize(pts);
}

// Ellipse approximated by `segments` straight pieces (the app works with polylines anyway).
function shapeEllipse(rx, ry, segments) {
  segments = Math.round(segments) || 64;
  if (segments < 8) segments = 8;
  if (!(rx > 0) || !(ry > 0)) throw new Error("Radii must be positive");
  var pts = [];
  for (var i = 0; i < segments; i++) {
    var a = (i * 2 * Math.PI) / segments;
    pts.push([rx * Math.cos(a), ry * Math.sin(a)]);
  }
  return shapeNormalize(pts);
}

// Rectangle with rounded corners; cornerSegments = pieces per 90 degree corner.
function shapeRoundedRect(width, height, cornerRadius, cornerSegments) {
  if (!(width > 0) || !(height > 0)) throw new Error("Width and height must be positive");
  cornerRadius = Number(cornerRadius) || 0;
  if (cornerRadius < 0) throw new Error("Corner radius cannot be negative");
  if (cornerRadius * 2 > Math.min(width, height) + 1e-9) throw new Error("Corner radius is too big for this size");
  cornerSegments = Math.round(cornerSegments) || 8;
  if (cornerRadius === 0) return shapeNormalize([[0, 0], [0, height], [width, height], [width, 0]]);
  var r = cornerRadius, pts = [];
  // counter-clockwise: lower-left arc 180->270 deg, lower-right 270->360, upper-right 0->90, upper-left 90->180
  var order = [
    [r, r, Math.PI],
    [width - r, r, 1.5 * Math.PI],
    [width - r, height - r, 0],
    [r, height - r, 0.5 * Math.PI]
  ];
  for (var c = 0; c < 4; c++) {
    for (var s = 0; s <= cornerSegments; s++) {
      var a = order[c][2] + (s * Math.PI) / 2 / cornerSegments;
      pts.push([order[c][0] + r * Math.cos(a), order[c][1] + r * Math.sin(a)]);
    }
  }
  return shapeNormalize(pts);
}

// Slot (oblong, stadium): `length` is the overall length including the round ends, `width` the diameter of the ends.
function shapeSlot(length, width, endSegments) {
  if (!(length > 0) || !(width > 0)) throw new Error("Length and width must be positive");
  if (length < width) throw new Error("Length must not be smaller than the width");
  endSegments = Math.round(endSegments) || 16;
  var r = width / 2, pts = [], s, a;
  // right end: from -90 to +90 deg around (length - r, r); left end: from 90 to 270 deg around (r, r)
  for (s = 0; s <= endSegments; s++) {
    a = -Math.PI / 2 + (s * Math.PI) / endSegments;
    pts.push([length - r + r * Math.cos(a), r + r * Math.sin(a)]);
  }
  for (s = 0; s <= endSegments; s++) {
    a = Math.PI / 2 + (s * Math.PI) / endSegments;
    pts.push([r + r * Math.cos(a), r + r * Math.sin(a)]);
  }
  return shapeNormalize(pts);
}

// Area of a closed polyline (shoelace), always positive. Used by tests and could feed statistics later.
function shapeArea(points) {
  var a = 0;
  for (var i = 0; i < points.length - 1; i++) a += points[i][0] * points[i + 1][1] - points[i + 1][0] * points[i][1];
  return Math.abs(a) / 2;
}

// Proportional resize helper for the Scale tab: given a changed field and the lock state, return the new
// [width, height]. `which` is "width" or "height"; `aspect` = original width / height.
function shapeLinkedSize(which, value, currentWidth, currentHeight, aspect, locked) {
  value = Number(value);
  if (!locked || !(aspect > 0)) return which === "width" ? [value, currentHeight] : [currentWidth, value];
  return which === "width" ? [value, value / aspect] : [value * aspect, value];
}

// Scale by a factor given in percent (100 = unchanged) -> new [width, height] from the ORIGINAL size.
function shapeScaleByPercent(originalWidth, originalHeight, percent) {
  var f = Number(percent) / 100;
  if (!(f > 0)) throw new Error("Scale must be positive");
  return [originalWidth * f, originalHeight * f];
}
