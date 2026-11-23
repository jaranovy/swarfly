// Swarfly 1.23.0 - pure maths of the line drawing tool and the point editor (node-testable, no DOM).
// A drawn line is kept as NODES: [{x, y, b}] where b is the "bulge" of the segment from this node to the next one
// (0 = straight, otherwise tan(quarter of the included angle), counter-clockwise positive, the same number a DXF polyline uses).
// The scene itself only holds a polyline of points; an arc is cut into short straight pieces (see drawArcPoints).

var DRAW_ARC_TOLERANCE = 0.02;        // mm, how far the straight pieces of an arc may lie from the true arc

function drawDist(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }

// Centre, radius and angles of the arc from a to b with this bulge, or null for a straight segment.
function drawArcGeom(a, b, bulge) {
  if (!bulge || !isFinite(bulge)) return null;
  var c = drawDist(a, b);
  if (c < 1e-9) return null;
  var theta = 4 * Math.atan(bulge), r = c / (2 * Math.abs(Math.sin(theta / 2)));
  var nx = -(b[1] - a[1]) / c, ny = (b[0] - a[0]) / c;                       // the left normal of a -> b
  var k = (c / 2) / Math.tan(theta / 2);                                      // signed distance of the centre from the chord, positive = left
  var cx = (a[0] + b[0]) / 2 + nx * k, cy = (a[1] + b[1]) / 2 + ny * k;
  return { cx: cx, cy: cy, r: r, a0: Math.atan2(a[1] - cy, a[0] - cx), theta: theta };
}

// The point on the arc at fraction t (0 = a, 1 = b) of its sweep.
function drawArcAt(a, b, bulge, t) {
  var g = drawArcGeom(a, b, bulge);
  if (!g) return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  var ang = g.a0 + g.theta * t;
  return [g.cx + g.r * Math.cos(ang), g.cy + g.r * Math.sin(ang)];
}

// Points of the segment from a to b including both ends. A straight segment is just [a, b].
function drawArcPoints(a, b, bulge, tol) {
  var g = drawArcGeom(a, b, bulge);
  if (!g) return [[a[0], a[1]], [b[0], b[1]]];
  tol = tol > 0 ? tol : DRAW_ARC_TOLERANCE;
  var step = g.r > tol ? 2 * Math.acos(Math.max(-1, 1 - tol / g.r)) : Math.PI / 4;
  step = Math.min(Math.max(step, Math.PI / 180), Math.PI / 12);               // 1 .. 15 degrees
  var n = Math.max(2, Math.ceil(Math.abs(g.theta) / step)), out = [[a[0], a[1]]];
  for (var i = 1; i < n; i++) out.push(drawArcAt(a, b, bulge, i / n));
  out.push([b[0], b[1]]);
  return out;
}

// The bulge of the arc from a to b that passes through p (0 when p lies on the chord line).
function drawBulgeThrough(a, b, p) {
  var cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  var pa = [a[0] - p[0], a[1] - p[1]], pb = [b[0] - p[0], b[1] - p[1]];
  var la = Math.hypot(pa[0], pa[1]), lb = Math.hypot(pb[0], pb[1]);
  if (la < 1e-9 || lb < 1e-9 || Math.abs(cross) < 1e-9 * (la + lb)) return 0;
  var phi = Math.acos(Math.max(-1, Math.min(1, (pa[0] * pb[0] + pa[1] * pb[1]) / (la * lb))));   // the angle a-p-b
  phi = Math.max(phi, 0.06);                                                  // keeps the arc below about 350 degrees
  var theta = 2 * Math.PI - 2 * phi;                                          // the arc that contains p
  var bulge = Math.tan(theta / 4);
  return cross > 0 ? -bulge : bulge;                                          // p left of a -> b means the arc runs clockwise
}

function drawIsClosed(points) {
  return points.length >= 4 && drawDist(points[0], points[points.length - 1]) < 1e-6;
}

// nodes -> the points of the polyline; a closed line repeats its first point at the end.
function drawNodesToPoints(nodes, closed, tol) {
  var n = nodes.length, out = [];
  if (!n) return out;
  var segs = closed ? n : n - 1;
  for (var i = 0; i < segs; i++) {
    var a = nodes[i], b = nodes[(i + 1) % n], pts = drawArcPoints([a.x, a.y], [b.x, b.y], a.b, tol);
    for (var k = i === 0 ? 0 : 1; k < pts.length; k++) out.push(pts[k]);
  }
  if (n === 1) out.push([nodes[0].x, nodes[0].y]);
  return out;
}

// A polyline of points -> {nodes, closed}; every point is a straight node (a closed line loses its repeated end point).
function drawPointsToNodes(points) {
  var closed = drawIsClosed(points), n = closed ? points.length - 1 : points.length, nodes = [];
  for (var i = 0; i < n; i++) nodes.push({ x: points[i][0], y: points[i][1], b: 0 });
  return { nodes: nodes, closed: closed };
}

// A short fingerprint of the points; the stored nodes are only trusted while the line still has the same one (another tool may have moved it).
function drawSignature(points) {
  var sx = 0, sy = 0, i;
  for (i = 0; i < points.length; i++) { sx += points[i][0]; sy += points[i][1] * 1.7; }
  var f = points[0] || [0, 0], l = points[points.length - 1] || [0, 0];
  return points.length + ":" + [f[0], f[1], l[0], l[1], sx, sy].map(function(v) { return v.toFixed(4); }).join(",");
}

// Douglas-Peucker: drops the points that lie within tol of the line between the kept ones.
function drawSimplify(points, tol) {
  var n = points.length;
  if (n < 3) return points.map(function(p) { return [p[0], p[1]]; });
  var keep = new Array(n), stack = [[0, n - 1]], i;
  for (i = 0; i < n; i++) keep[i] = false;
  keep[0] = keep[n - 1] = true;
  while (stack.length) {
    var s = stack.pop(), a = points[s[0]], b = points[s[1]], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), best = -1, bd = tol;
    for (i = s[0] + 1; i < s[1]; i++) {
      var d = len < 1e-12 ? Math.hypot(points[i][0] - a[0], points[i][1] - a[1]) : Math.abs(dy * (points[i][0] - a[0]) - dx * (points[i][1] - a[1])) / len;
      if (d > bd) { bd = d; best = i; }
    }
    if (best >= 0) { keep[best] = true; stack.push([s[0], best], [best, s[1]]); }
  }
  var out = [];
  for (i = 0; i < n; i++) if (keep[i]) out.push([points[i][0], points[i][1]]);
  return out;
}

// p moved so that the line from a to p points along a multiple of stepDeg (the length stays).
function drawLockAngle(a, p, stepDeg) {
  var dx = p[0] - a[0], dy = p[1] - a[1], len = Math.hypot(dx, dy);
  if (len < 1e-12) return [p[0], p[1]];
  var step = stepDeg * Math.PI / 180, ang = Math.round(Math.atan2(dy, dx) / step) * step;
  return [a[0] + len * Math.cos(ang), a[1] + len * Math.sin(ang)];
}

// Number of segments of a line with this many nodes.
function drawSegmentCount(nodes, closed) { return closed ? nodes.length : Math.max(0, nodes.length - 1); }

// The middle of segment i (the middle of the arc for a curved one): where its handle sits.
function drawSegmentMid(nodes, closed, i) {
  var a = nodes[i], b = nodes[(i + 1) % nodes.length];
  return drawArcAt([a.x, a.y], [b.x, b.y], a.b, 0.5);
}

// Index of the node within tol of p (the nearest one), or -1.
function drawNearestNode(nodes, p, tol) {
  var best = -1, bd = tol;
  for (var i = 0; i < nodes.length; i++) {
    var d = Math.hypot(nodes[i].x - p[0], nodes[i].y - p[1]);
    if (d <= bd) { bd = d; best = i; }
  }
  return best;
}

// Index of the segment whose middle handle is within tol of p, or -1.
function drawNearestMid(nodes, closed, p, tol) {
  var best = -1, bd = tol;
  for (var i = 0; i < drawSegmentCount(nodes, closed); i++) {
    var m = drawSegmentMid(nodes, closed, i), d = Math.hypot(m[0] - p[0], m[1] - p[1]);
    if (d <= bd) { bd = d; best = i; }
  }
  return best;
}

// The point of the line nearest to p: {seg, t, point, dist}, t = fraction along the segment (of the sweep for an arc). null when there is no segment.
function drawNearestSegment(nodes, closed, p) {
  var best = null;
  for (var i = 0; i < drawSegmentCount(nodes, closed); i++) {
    var a = nodes[i], b = nodes[(i + 1) % nodes.length], A = [a.x, a.y], B = [b.x, b.y], g = drawArcGeom(A, B, a.b), t, q, d;
    if (g) {
      var ang = Math.atan2(p[1] - g.cy, p[0] - g.cx), rel = (ang - g.a0) * (g.theta < 0 ? -1 : 1);
      rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      t = rel / Math.abs(g.theta);
      if (t > 1) {                                                            // outside the arc: the nearer end
        var da = drawDist(p, A), db = drawDist(p, B);
        t = da < db ? 0 : 1;
      }
      q = drawArcAt(A, B, a.b, t); d = drawDist(p, q);
    } else {
      var dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy;
      t = l2 < 1e-18 ? 0 : Math.max(0, Math.min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / l2));
      q = [A[0] + dx * t, A[1] + dy * t]; d = drawDist(p, q);
    }
    if (!best || d < best.dist) best = { seg: i, t: t, point: q, dist: d };
  }
  return best;
}

// A new node on segment seg at fraction t. A curved segment is cut into two arcs of the same circle.
function drawInsertNode(nodes, closed, seg, t) {
  var out = nodes.map(function(n) { return { x: n.x, y: n.y, b: n.b }; }), a = nodes[seg], b = nodes[(seg + 1) % nodes.length];
  var q = drawArcAt([a.x, a.y], [b.x, b.y], a.b, t), theta = a.b ? 4 * Math.atan(a.b) : 0;
  out[seg].b = a.b ? Math.tan(theta * t / 4) : 0;
  out.splice(seg + 1, 0, { x: q[0], y: q[1], b: a.b ? Math.tan(theta * (1 - t) / 4) : 0 });
  return out;
}

// Removes the nodes with these indexes; the segment that joins the neighbours is straight. Keeps at least 2 nodes (open) or 3 (closed): returns null if that is not possible.
function drawDeleteNodes(nodes, closed, indexes) {
  var drop = {}, n = nodes.length, out = [];
  indexes.forEach(function(i) { drop[i] = true; });
  for (var i = 0; i < n; i++) {
    if (drop[i]) continue;
    out.push({ x: nodes[i].x, y: nodes[i].y, b: drop[(i + 1) % n] ? 0 : nodes[i].b });   // the segment out of a node whose successor was removed is no longer the old arc
  }
  return out.length < (closed ? 3 : 2) ? null : out;
}
