// Swarfly 1.23.0 - line drawing tool and point (node) editor, browser part. The maths is in js/draw-model.js (unit-tested).
//  Line tool (L): click points, a straight segment joins them; press and drag = freehand; the last point near the first closes the line.
//  Points tool (N): the points of a line show up; drag a point to move it (Shift adds to the selection, a window selects several),
//  drag the diamond in the middle of a segment to bend it into an arc, double-click the line for a new point, Delete removes points.
// Both work on a polyline in the scene, like every other tool; undo is one step per change.

var drawState = { mode: null, pts: [], cursor: null, press: null, stroke: null, ns: null };

var DRAW_HINTS = {
  line: "Line: click the points; drag = freehand; Shift = 15° steps; click the first point = close; Enter / double-click / right click = finish; Backspace = remove the last point; Esc = end",
  nodes: "Nodes: click a line, then click a point to select it (Shift adds, drag a window to select several) and drag it; drag the diamond of a segment to bend it into an arc (double-click it = straight); double-click the line = new point; Delete = remove; arrows nudge; Esc = end"
};
var DRAW_MAX_NODES = 5000;
var drawSettings = { soft: false, radius: 20, tol: 0.1 };           // remembered in localStorage.swarflyDraw
try { var drawSaved = JSON.parse(localStorage.getItem("swarflyDraw") || "{}"); if (drawSaved.radius > 0) drawSettings.radius = Number(drawSaved.radius); if (drawSaved.tol > 0) drawSettings.tol = Number(drawSaved.tol); drawSettings.soft = !!drawSaved.soft; } catch (e) { /* storage blocked */ }
function drawSaveSettings() { try { localStorage.setItem("swarflyDraw", JSON.stringify(drawSettings)); } catch (e) { /* storage blocked */ } }

function drawActive() { return !!drawState.mode; }
function drawPx(n) { return n * editorMmPerPixel(); }
function drawWorld(e) { var w = mouseToWorldCoord(e); return [w.x, w.y]; }
function drawOnCanvas(e) {
  var a = document.getElementById("renderArea");
  return !!(a && e.target && e.target.tagName === "CANVAS" && a.contains(e.target));
}
function drawClone(nodes) { return nodes.map(function(n) { return { x: n.x, y: n.y, b: n.b }; }); }
function drawLineAlive(line) { return objectsInScene.some(function(o) { return o.children.indexOf(line) >= 0; }); }

function drawSetButtons() {
  var l = document.getElementById("drawLineButton"), n = document.getElementById("nodeEditButton");
  if (l) l.classList.toggle("ed-on", drawState.mode === "line");
  if (n) n.classList.toggle("ed-on", drawState.mode === "nodes");
}

function drawOverlay() {
  var svg = document.getElementById("drawOverlay");
  if (svg) return svg;
  var area = document.getElementById("renderArea");
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "drawOverlay";
  svg.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:6;pointer-events:none;display:none";
  area.appendChild(svg);
  var hint = document.createElement("div");
  hint.id = "drawHint";
  hint.style.cssText = "position:absolute;left:50%;top:6px;transform:translateX(-50%);max-width:92%;z-index:6;pointer-events:none;display:none;padding:4px 10px;border-radius:4px;background:rgba(20,30,45,.82);color:#fff;font:12px 'Segoe UI',Arial,sans-serif;text-align:center";
  area.appendChild(hint);
  var box = document.createElement("div");
  box.id = "drawBox";
  box.style.cssText = "position:absolute;right:12px;bottom:12px;z-index:7;display:none;padding:6px 10px;border-radius:4px;background:rgba(20,30,45,.88);color:#fff;font:12px 'Segoe UI',Arial,sans-serif;line-height:28px;white-space:nowrap;width:max-content;max-width:92%";
  box.innerHTML = '<span>Nodes</span>: <b id="drawCount">0</b> &nbsp;|&nbsp; ' +
    '<label title="Dragging a point also pulls the points near it along the line, less and less with the distance"><input type="checkbox" id="drawSoft" style="vertical-align:middle"> Soft move</label> ' +
    '<input type="number" id="drawSoftR" min="1" step="5" style="width:60px;height:24px;min-height:0;padding:0 4px;margin:0;display:inline-block;vertical-align:middle"> <span>mm</span> &nbsp;|&nbsp; ' +
    '<button type="button" id="drawSimplifyBtn" class="button small" style="height:24px;min-height:0;padding:0 10px;margin:0" title="Remove the points that lie within this distance of the straight line between their neighbours (arcs become short straight pieces)">Simplify</button> ' +
    '<input type="number" id="drawSimplifyTol" min="0.01" step="0.05" style="width:60px;height:24px;min-height:0;padding:0 4px;margin:0;display:inline-block;vertical-align:middle"> <span>mm</span>';
  area.appendChild(box);
  var soft = box.querySelector("#drawSoft"), rad = box.querySelector("#drawSoftR"), tol = box.querySelector("#drawSimplifyTol");
  soft.checked = drawSettings.soft; rad.value = drawSettings.radius; tol.value = drawSettings.tol;
  soft.addEventListener("change", function() { drawSettings.soft = soft.checked; drawSaveSettings(); });
  rad.addEventListener("change", function() { if (Number(rad.value) > 0) drawSettings.radius = Number(rad.value); rad.value = drawSettings.radius; drawSaveSettings(); });
  tol.addEventListener("change", function() { if (Number(tol.value) > 0) drawSettings.tol = Number(tol.value); tol.value = drawSettings.tol; drawSaveSettings(); });
  box.querySelector("#drawSimplifyBtn").addEventListener("click", drawNodesSimplify);
  return svg;
}

function drawShowHint() {
  var h = document.getElementById("drawHint");
  if (!h) return;
  var text = drawState.mode ? DRAW_HINTS[drawState.mode] : "";
  h.style.display = text ? "block" : "none";
  if (text && h.getAttribute("data-en") !== text) { h.setAttribute("data-en", text); h.textContent = text; }   // rewritten only when it changes (the translator replaces the text)
  var b = document.getElementById("drawBox");
  if (b) b.style.display = drawState.mode === "nodes" ? "block" : "none";
}

// ---- start / end ------------------------------------------------------------------------------------------------------------
function drawBegin(mode) {
  if (typeof editorEndPlacement === "function") editorEndPlacement();
  if (typeof editorCancelMoveAB === "function") editorCancelMoveAB(true);
  if (editorState.cut && typeof editorEndCut === "function") editorEndCut();
  if (editorState.me && typeof editorMeasureEnd === "function") editorMeasureEnd();
  if (editorState.draft && typeof editorDraftCancel === "function") editorDraftCancel();
  drawEnd();
  drawState = { mode: mode, pts: [], cursor: null, press: null, stroke: null, ns: null };
  drawOverlay();
  drawSetButtons();
  drawShowHint();
  if (mode === "line") { editorCoordShow(); editorState.lastPoint = null; }
  editorDrawHandles();
  drawRender();
}

function drawEnd() {
  if (!drawState.mode) return;
  var st = drawState;
  if (st.mode === "line" && st.pts.length >= 2) drawLineFinish(false);      // switching to another tool keeps what was drawn
  if (st.mode === "nodes" && st.ns) drawNodesCancelDrag();
  drawState = { mode: null, pts: [], cursor: null, press: null, stroke: null, ns: null };
  drawSetButtons();
  drawShowHint();
  var svg = document.getElementById("drawOverlay");
  if (svg) { svg.style.display = "none"; svg.innerHTML = ""; }
  if (typeof editorShowSnap === "function") editorShowSnap(null);
  if (typeof editorCoordHide === "function") editorCoordHide();
  editorRefresh(true);
}

function drawToggleLine() { if (drawState.mode === "line") drawEnd(); else drawBegin("line"); }

function drawToggleNodes() {
  if (drawState.mode === "nodes") { drawEnd(); return; }
  var lines = editorSelection();
  drawBegin("nodes");
  if (lines.length === 1) drawNodesLoad(lines[0]);
  drawRender();
}

function drawEscape() {
  var st = drawState;
  if (st.mode === "line") {
    if (st.press || st.stroke) { st.press = null; st.stroke = null; } else if (st.pts.length) st.pts = []; else drawEnd();
  } else if (st.mode === "nodes") {
    var ns = st.ns;
    if (ns && ns.drag) drawNodesCancelDrag(); else if (ns && Object.keys(ns.sel).length) ns.sel = {}; else drawEnd();
  }
  drawRender();
}

// ---- drawing a line ----------------------------------------------------------------------------------------------------------
// The point under the pointer: snapped to the drawing and the grid, locked to 15 degrees with Shift, or the first point when the line can be closed.
function drawLinePointer(e) {
  var w = drawWorld(e), p = w, kind = null, pts = drawState.pts;
  var s = e.shiftKey ? null : editorSnapPoint(w[0], w[1], []);
  if (s) { p = s.point; kind = s.kind; }
  if (pts.length && e.shiftKey) { p = drawLockAngle(pts[pts.length - 1], w, 15); kind = "15°"; }
  if (pts.length >= 3 && drawDist(p, pts[0]) <= drawPx(10)) { p = [pts[0][0], pts[0][1]]; kind = "Close"; }
  return { p: p, kind: kind };
}

function drawLineAdd(p) {
  var pts = drawState.pts;
  if (pts.length && drawDist(p, pts[pts.length - 1]) < 1e-6) return;           // the same point twice (a double-click)
  if (pts.length >= 3 && drawDist(p, pts[0]) < 1e-6) { drawLineFinish(true); return; }
  pts.push([p[0], p[1]]);
  editorState.lastPoint = [p[0], p[1]];
}

function drawLineFinish(closed) {
  var st = drawState, pts = st.pts;
  st.pts = []; st.press = null; st.stroke = null;
  if (pts.length < 2) return;
  if (closed && pts.length < 3) closed = false;
  drawCommit(pts.map(function(p) { return { x: p[0], y: p[1], b: 0 }; }), closed);
  editorShowSnap(null);
  drawRender();
}

function drawLineDown(e) {
  var r = drawLinePointer(e);
  drawState.press = { p: r.p, x: e.clientX, y: e.clientY, moved: false };
}

function drawLineMove(e) {
  var st = drawState, r = drawLinePointer(e), pr = st.press;
  st.cursor = r;
  if (pr) {
    if (!pr.moved && Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > 5) {
      pr.moved = true;
      st.stroke = st.pts.length ? [st.pts[st.pts.length - 1].slice(), pr.p.slice()] : [pr.p.slice()];
    }
    if (pr.moved) {
      var w = drawWorld(e), l = st.stroke[st.stroke.length - 1];
      if (Math.hypot(w[0] - l[0], w[1] - l[1]) >= drawPx(2)) st.stroke.push(w);
    }
  }
  editorShowSnap(r.kind && !(pr && pr.moved) ? r.p : null, r.kind);
  drawRender();
}

function drawLineUp() {
  var st = drawState, pr = st.press;
  st.press = null;
  if (!pr) return;
  if (!pr.moved) { drawLineAdd(pr.p); drawRender(); return; }
  var s = drawSimplify(drawSmoothStroke(st.stroke, 2), drawPx(1));         // the jitter of the hand is averaged out, then the stroke is cut to a few points
  st.stroke = null;
  if (st.pts.length) s.shift();                                                 // its first point is the last one already in the line
  s.forEach(function(q) {
    var last = st.pts[st.pts.length - 1];
    if (!last || drawDist(q, last) > 1e-6) st.pts.push([q[0], q[1]]);
  });
  var pts = st.pts;
  if (pts.length >= 4 && drawDist(pts[pts.length - 1], pts[0]) <= drawPx(10)) { pts.pop(); drawLineFinish(true); return; }   // the stroke ended on the start: closed
  if (pts.length) editorState.lastPoint = pts[pts.length - 1].slice();
  drawRender();
}

// A point typed in the coordinate box (x,y  @dx,dy  @length<angle) counts as a click.
function drawLineTyped(p) {
  if (drawState.mode !== "line") return;
  drawLineAdd(p);
  drawRender();
}

// ---- adding the new line to the drawing ------------------------------------------------------------------------------------
function drawCommit(nodes, closed) {
  storeUndo(true);
  var existing = scene.getObjectByName("Internal CAD", true), group = existing ? existing : new THREE.Group();
  var pts = drawNodesToPoints(nodes, closed), g = new THREE.Geometry();
  pts.forEach(function(p) { g.vertices.push(new THREE.Vector3(p[0], p[1], 0)); });
  var line = new THREE.Line(g, new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide }));
  line.name = closed ? "Drawn outline" : "Drawn line";
  line.userData.sketch = { nodes: drawClone(nodes), closed: closed, sig: drawSignature(pts) };
  group.add(line);
  group.name = "Internal CAD" + Math.random();
  if (!existing) objectsInScene.push(group);
  drawSelectOnly(line);
  clearSceneFlag = true;
  editorState.snapCache = null;
  return line;
}

function drawSelectOnly(line) {
  objectsInScene.forEach(function(o) { o.children.forEach(function(c) { c.userData.selected = false; }); });
  line.userData.selected = true;
  if (typeof fillTree === "function") fillTree();
  if (typeof hoverShapesinScene !== "undefined") hoverShapesinScene.length = 0;
  clearSceneFlag = true;
  editorRefresh(true);
}

// ---- the point editor --------------------------------------------------------------------------------------------------------
function drawNodesLoad(line) {
  if (line.userData.locked) { editorToast("Locked objects are not changed - untick Locked first"); return false; }
  if (typeof changePositionToGeoTranslate === "function") changePositionToGeoTranslate();      // the points are then in world coordinates
  var pts = editorLinePoints(line), sk = line.userData.sketch, info;
  if (pts.length < 2) return false;
  info = sk && sk.sig === drawSignature(pts) ? { nodes: drawClone(sk.nodes), closed: !!sk.closed } : drawPointsToNodes(pts);
  drawState.ns = { line: line, nodes: info.nodes, closed: info.closed, sel: {}, drag: null, undone: false, frozen: info.nodes.length > DRAW_MAX_NODES };
  if (drawState.ns.frozen) editorToast("This line has too many points to edit one by one (over 5000) - press Simplify first");
  return true;
}

function drawNodesApply() {
  var ns = drawState.ns, pts = drawNodesToPoints(ns.nodes, ns.closed);
  editorReplaceGeometry(ns.line, pts);
  if (ns.line.geometry.computeBoundingSphere) ns.line.geometry.computeBoundingSphere();
  if (ns.line.geometry.computeBoundingBox) ns.line.geometry.computeBoundingBox();
  delete ns.line.userData.shape;                                                // no longer a shape with parameters
  if (typeof hoverShapesinScene !== "undefined") hoverShapesinScene.length = 0;
  editorState.snapCache = null;
  clearSceneFlag = true;
}

function drawNodesStore() {                                                      // remembers the nodes (with the arcs) on the line, valid while its points stay as they are
  var ns = drawState.ns;
  ns.line.userData.sketch = { nodes: drawClone(ns.nodes), closed: ns.closed, sig: drawSignature(editorLinePoints(ns.line)) };
}

// one undo step per change: call before the first modification
function drawNodesUndoPoint() { storeUndo(true); }

function drawNodesCancelDrag() {
  var ns = drawState.ns;
  if (!ns || !ns.drag) return;
  var d = ns.drag;
  ns.drag = null;
  if (d.type !== "marquee" && d.pushed) {
    ns.nodes = drawClone(d.orig);
    drawNodesApply();
    drawNodesStore();
    if (typeof undoStore !== "undefined" && undoStore.length) undoStore.shift();
  }
}

function drawPickLine(p, tol, except) {
  var best = null, bd = tol, all = editorAllLines();
  for (var i = 0; i < all.length; i++) {
    if (all[i] === except || all[i].userData.locked) continue;
    var r = editorNearestPosition(editorLinePoints(all[i]), p);
    if (r && r.dist <= bd) { bd = r.dist; best = all[i]; }
  }
  return best;
}

function drawNodesDown(e) {
  var ns = drawState.ns, p = drawWorld(e), tol = drawPx(9);
  if (ns && ns.frozen) {                                                          // too many points: only another line can be picked
    var oth = drawPickLine(p, tol * 1.2, ns.line);
    if (oth) { drawSelectOnly(oth); drawState.ns = null; drawNodesLoad(oth); drawRender(); }
    return;
  }
  if (ns) {
    var i = drawNearestNode(ns.nodes, p, tol);
    if (i >= 0) {
      if (e.shiftKey) { if (ns.sel[i]) delete ns.sel[i]; else ns.sel[i] = true; } else if (!ns.sel[i]) ns.sel = (function() { var o = {}; o[i] = true; return o; })();
      if (ns.sel[i]) ns.drag = { type: "nodes", start: p, grab: i, orig: drawClone(ns.nodes), x: e.clientX, y: e.clientY, pushed: false };
      drawRender();
      return;
    }
    var s = drawNearestMid(ns.nodes, ns.closed, p, tol);
    if (s >= 0) { ns.drag = { type: "bulge", seg: s, orig: drawClone(ns.nodes), x: e.clientX, y: e.clientY, pushed: false }; return; }
    var near = editorNearestPosition(editorLinePoints(ns.line), p);
    if (!near || near.dist > tol * 1.2) {
      var other = drawPickLine(p, tol * 1.2, ns.line);
      if (other) { drawSelectOnly(other); drawState.ns = null; drawNodesLoad(other); drawRender(); return; }
    }
    if (!e.shiftKey) ns.sel = {};
    ns.drag = { type: "marquee", a: p, b: p, shift: e.shiftKey };
    drawRender();
    return;
  }
  var hit = drawPickLine(p, tol * 1.2, null);
  if (hit) { drawSelectOnly(hit); drawNodesLoad(hit); drawRender(); }
}

function drawNodesMove(e) {
  var ns = drawState.ns;
  if (!ns || !ns.drag) return;
  var d = ns.drag, w = drawWorld(e);
  if (d.type === "marquee") { d.b = w; drawRender(); return; }
  if (!d.pushed && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 3) return;       // a click is not a drag
  if (!d.pushed) { drawNodesUndoPoint(); d.pushed = true; }
  if (d.type === "nodes") {
    var g = d.orig[d.grab], target = [g.x + (w[0] - d.start[0]), g.y + (w[1] - d.start[1])];
    var sp = e.shiftKey ? null : editorSnapPoint(target[0], target[1], [ns.line]);
    if (sp) target = sp.point;
    editorShowSnap(sp ? sp.point : null, sp ? sp.kind : null);
    var dx = target[0] - g.x, dy = target[1] - g.y;
    if (drawSettings.soft) {                                                      // soft move: the neighbours follow, less and less with the distance along the line
      if (!d.weights) d.weights = drawSoftWeights(d.orig, ns.closed, d.grab, drawSettings.radius);
      d.weights.forEach(function(wt, k) { if (wt > 0) { ns.nodes[k].x = d.orig[k].x + dx * wt; ns.nodes[k].y = d.orig[k].y + dy * wt; } });
    } else {
      Object.keys(ns.sel).forEach(function(k) { ns.nodes[k].x = d.orig[k].x + dx; ns.nodes[k].y = d.orig[k].y + dy; });
    }
  } else if (d.type === "bulge") {
    var a = d.orig[d.seg], b = d.orig[(d.seg + 1) % d.orig.length], A = [a.x, a.y], B = [b.x, b.y], len = drawDist(A, B);
    var off = len < 1e-9 ? 0 : Math.abs((B[0] - A[0]) * (w[1] - A[1]) - (B[1] - A[1]) * (w[0] - A[0])) / len;
    var bulge = off < drawPx(3) ? 0 : drawBulgeThrough(A, B, w);                      // close to the chord = straight again
    ns.nodes[d.seg].b = Math.max(-12, Math.min(12, bulge));
  }
  drawNodesApply();
  drawRender();
}

function drawNodesUp() {
  var ns = drawState.ns;
  if (!ns || !ns.drag) return;
  var d = ns.drag;
  ns.drag = null;
  editorShowSnap(null);
  if (d.type === "marquee") {
    var x0 = Math.min(d.a[0], d.b[0]), x1 = Math.max(d.a[0], d.b[0]), y0 = Math.min(d.a[1], d.b[1]), y1 = Math.max(d.a[1], d.b[1]);
    if (!d.shift) ns.sel = {};
    ns.nodes.forEach(function(n, i) { if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1) ns.sel[i] = true; });
  } else if (d.pushed) {
    drawNodesStore();
    editorRefresh(true);
  }
  drawRender();
}

function drawNodesDouble(e) {
  var ns = drawState.ns;
  if (!ns || ns.frozen) return;
  var p = drawWorld(e), tol = drawPx(9);
  if (drawNearestNode(ns.nodes, p, tol) >= 0) return;
  var s = drawNearestMid(ns.nodes, ns.closed, p, tol);
  if (s >= 0) {                                                                  // a curved segment goes straight again
    if (ns.nodes[s].b) { drawNodesUndoPoint(); ns.nodes[s].b = 0; drawNodesApply(); drawNodesStore(); editorRefresh(true); }
    drawRender();
    return;
  }
  var hit = drawNearestSegment(ns.nodes, ns.closed, p);
  if (hit && hit.dist <= tol) {
    drawNodesUndoPoint();
    ns.nodes = drawInsertNode(ns.nodes, ns.closed, hit.seg, hit.t);
    ns.sel = {}; ns.sel[hit.seg + 1] = true;
    drawNodesApply(); drawNodesStore(); editorRefresh(true);
    drawRender();
  }
}

function drawNodesDelete() {
  var ns = drawState.ns;
  if (!ns || ns.frozen) return;
  var idx = Object.keys(ns.sel).map(Number);
  if (!idx.length) return;
  var left = drawDeleteNodes(ns.nodes, ns.closed, idx);
  if (!left) { editorToast("A line needs at least 2 points (a closed one 3)"); return; }
  drawNodesUndoPoint();
  ns.nodes = left; ns.sel = {};
  drawNodesApply(); drawNodesStore(); editorRefresh(true);
  drawRender();
}

function drawNodesNudge(key, shift, alt) {
  var ns = drawState.ns, idx = ns && !ns.frozen ? Object.keys(ns.sel) : [];
  if (!idx.length) return false;
  var step = shift ? 10 : alt ? 0.1 : 1, d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[key];
  if (!d) return false;
  drawNodesUndoPoint();
  idx.forEach(function(k) { ns.nodes[k].x += d[0]; ns.nodes[k].y += d[1]; });
  drawNodesApply(); drawNodesStore(); editorRefresh(true);
  drawRender();
  return true;
}

// Simplify (button in the box): removes the points that lie within the tolerance of the line between their neighbours. Arcs become short straight pieces.
function drawNodesSimplify() {
  var ns = drawState.ns;
  if (!ns) { editorToast("Select a line first"); return; }
  var pts = drawNodesToPoints(ns.nodes, ns.closed), res = drawSimplify(pts, drawSettings.tol), info = drawPointsToNodes(res);
  if (info.nodes.length >= ns.nodes.length) { editorToast("Nothing to remove at this tolerance"); return; }
  drawNodesUndoPoint();
  ns.nodes = info.nodes; ns.closed = info.closed; ns.sel = {}; ns.frozen = ns.nodes.length > DRAW_MAX_NODES;
  drawNodesApply(); drawNodesStore(); editorRefresh(true);
  drawRender();
}

// ---- the picture on top of the drawing ---------------------------------------------------------------------------------------
function drawRender() {
  var svg = document.getElementById("drawOverlay");
  if (!svg) return;
  var st = drawState;
  if (!st.mode) { svg.style.display = "none"; return; }
  var h = [], i;
  var xy = function(p) { var q = editorToScreen(p[0], p[1]); return q[0].toFixed(1) + "," + q[1].toFixed(1); };
  if (st.mode === "line") {
    var pts = st.pts;
    if (pts.length) h.push('<polyline fill="none" stroke="#0b9bff" stroke-width="2.5" stroke-linejoin="round" points="' + pts.map(xy).join(" ") + '"/>');
    pts.forEach(function(p, k) {
      var q = editorToScreen(p[0], p[1]);
      h.push('<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + (k === 0 ? 5.5 : 4) + '" fill="#fff" stroke="#0b6bcb" stroke-width="2"/>');
    });
    if (st.stroke) h.push('<polyline fill="none" stroke="#0b9bff" stroke-width="2" points="' + st.stroke.map(xy).join(" ") + '"/>');
    if (st.cursor && pts.length && !st.stroke) {
      var last = pts[pts.length - 1], c = st.cursor.p, a = editorToScreen(last[0], last[1]), b = editorToScreen(c[0], c[1]);
      h.push('<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="#ff4fd8" stroke-width="1.5" stroke-dasharray="6 4"/>');
      var len = drawDist(last, c), ang = Math.atan2(c[1] - last[1], c[0] - last[0]) * 180 / Math.PI;
      h.push('<text x="' + (b[0] + 14).toFixed(1) + '" y="' + (b[1] + 22).toFixed(1) + '" fill="#ff4fd8" font-size="12" font-family="Segoe UI, Arial, sans-serif" paint-order="stroke" stroke="#000" stroke-opacity=".7" stroke-width="2" stroke-linejoin="round">L ' + len.toFixed(2) + '   ∠ ' + ang.toFixed(1) + '°</text>');
    }
  } else if (st.ns) {
    var ns = st.ns, sq = [], sel = [], dia = [], diaFull = [];
    var shown = ns.frozen ? [] : ns.nodes;
    shown.forEach(function(n, k) {
      var q = editorToScreen(n.x, n.y), s = 'M' + (q[0] - 4.5).toFixed(1) + ' ' + (q[1] - 4.5).toFixed(1) + 'h9v9h-9z';
      (ns.sel[k] ? sel : sq).push(s);
    });
    if (!ns.frozen && ns.nodes.length <= 600) {
      for (i = 0; i < drawSegmentCount(ns.nodes, ns.closed); i++) {
        var m = drawSegmentMid(ns.nodes, ns.closed, i), q2 = editorToScreen(m[0], m[1]), s2 = 'M' + q2[0].toFixed(1) + ' ' + (q2[1] - 5.5).toFixed(1) + 'l5.5 5.5-5.5 5.5-5.5-5.5z';
        (ns.nodes[i].b ? diaFull : dia).push(s2);
      }
    }
    if (dia.length) h.push('<path d="' + dia.join("") + '" fill="#fff" fill-opacity=".85" stroke="#0b6bcb" stroke-width="1.2"/>');
    if (diaFull.length) h.push('<path d="' + diaFull.join("") + '" fill="#0b9bff" stroke="#fff" stroke-width="1.2"/>');
    if (sq.length) h.push('<path d="' + sq.join("") + '" fill="#fff" stroke="#0b6bcb" stroke-width="1.8"/>');
    if (sel.length) h.push('<path d="' + sel.join("") + '" fill="#ffb020" stroke="#7a4a00" stroke-width="1.8"/>');
    if (ns.drag && ns.drag.type === "marquee") {
      var qa = editorToScreen(ns.drag.a[0], ns.drag.a[1]), qb = editorToScreen(ns.drag.b[0], ns.drag.b[1]);
      h.push('<rect x="' + Math.min(qa[0], qb[0]).toFixed(1) + '" y="' + Math.min(qa[1], qb[1]).toFixed(1) + '" width="' + Math.abs(qb[0] - qa[0]).toFixed(1) + '" height="' + Math.abs(qb[1] - qa[1]).toFixed(1) + '" fill="#0b9bff" fill-opacity=".12" stroke="#0b9bff" stroke-dasharray="5 4"/>');
    }
  }
  svg.innerHTML = h.join("");
  svg.style.display = "block";
  var cnt = document.getElementById("drawCount");
  if (cnt) { var txt = st.mode === "nodes" && st.ns ? String(st.ns.nodes.length) : "-"; if (cnt.textContent !== txt) cnt.textContent = txt; }
}

// ---- events -------------------------------------------------------------------------------------------------------------------
// The key handler is registered when the script loads (before js/shortcuts.js), so Delete, Backspace and the arrows belong to the tool while it is on.
if (typeof document !== "undefined") {
document.addEventListener("keydown", function(e) {
  var st = drawState;
  if (!st.mode) return;
  var tag = e.target && e.target.nodeName ? e.target.nodeName.toLowerCase() : "", typing = tag === "input" || tag === "textarea" || tag === "select";
  if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); drawEscape(); return; }
  if (typing) return;
  var stop = function() { e.preventDefault(); e.stopImmediatePropagation(); };
  if (st.mode === "line") {
    if (e.key === "Enter") { stop(); drawLineFinish(false); }
    else if (e.key === "Backspace" || e.key === "Delete") { stop(); if (st.pts.length) { st.pts.pop(); editorState.lastPoint = st.pts.length ? st.pts[st.pts.length - 1].slice() : null; } drawRender(); }
  } else if (st.ns) {
    if (e.key === "Delete" || e.key === "Backspace") { stop(); drawNodesDelete(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) { stop(); st.ns.nodes.forEach(function(n, k) { st.ns.sel[k] = true; }); drawRender(); }
    else if (e.key.indexOf("Arrow") === 0) { stop(); drawNodesNudge(e.key, e.shiftKey, e.altKey); }
  }
}, true);

}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById("renderArea")) return;
    var KEEP = "#drawLineButton, #nodeEditButton, #editorSnapButton, #gridGroup, #editorCoordBox, #drawHint, #drawBox";

    document.addEventListener("mousedown", function(e) {
      var st = drawState;
      if (!st.mode) return;
      if (!drawOnCanvas(e)) { if (!(e.target && e.target.closest && e.target.closest(KEEP))) drawEnd(); return; }
      if (e.button === 1) return;                                              // the middle button pans the view
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.button === 2) { if (st.mode === "line" && st.pts.length >= 2) drawLineFinish(false); else drawEscape(); return; }
      if (e.button !== 0) return;
      if (st.mode === "line") drawLineDown(e); else drawNodesDown(e);
    }, true);

    document.addEventListener("mousemove", function(e) {
      if (!drawState.mode) return;
      if (drawState.mode === "line") { if (drawOnCanvas(e) || drawState.press) drawLineMove(e); } else drawNodesMove(e);
    });

    document.addEventListener("mouseup", function(e) {
      if (!drawState.mode) return;
      if (drawState.mode === "line") drawLineUp(e); else drawNodesUp(e);
    }, true);

    document.addEventListener("dblclick", function(e) {
      if (!drawState.mode || !drawOnCanvas(e)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (drawState.mode === "line") { if (drawState.pts.length >= 2) drawLineFinish(false); } else drawNodesDouble(e);
    }, true);

    document.addEventListener("contextmenu", function(e) { if (drawState.mode && drawOnCanvas(e)) e.preventDefault(); }, true);

    setInterval(function() {
      var st = drawState;
      if (!st.mode) return;
      if (st.mode === "nodes" && st.ns && !drawLineAlive(st.ns.line)) {          // undo or delete replaced the line: pick up the selected one again
        st.ns = null;
        var lines = editorSelection();
        if (lines.length === 1) drawNodesLoad(lines[0]);
      }
      drawRender();
    }, 100);
  });
}
