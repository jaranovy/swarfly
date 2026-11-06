// Swarfly editor (browser part). Maths lives in js/editor-model.js (unit-tested); this file is the DOM / three.js glue:
//  - properties panel for the selection (X/Y of a chosen reference point, width, height, ratio lock, rotation, shape parameters)
//  - placement mode: a new shape follows the mouse until you click (Esc = X0 Y0, right click = cancel)
//  - Dimensions button: overall width / height of the selection drawn on the part
//  - status line: prompt + cursor coordinates
// Uses globals of the OpenBuilds code: getSelectedObjects, objectsInScene, storeUndo, undoStore, changePositionToGeoTranslate,
// fillTree, mouseToWorldCoord, camera, clearSceneFlag, hoverShapesinScene, THREE.

var editorState = { placing: null, dims: 0, lock: true, ref: "ll", panelOn: true, sig: "", paramsFor: null, count: 0, snap: true, gridStep: 1, mv: null, snapCache: null, pick: null, pickCount: 0, measures: [], me: null, lastPoint: null };

function editorLoadSnapSettings() {
  try {
    if (localStorage.getItem("swarflySnap") === "0") editorState.snap = false;
    var g = localStorage.getItem("swarflyGrid");
    if (g !== null && !isNaN(Number(g))) editorState.gridStep = Number(g);
  } catch (e) { /* storage blocked: defaults */ }
}

function editorPlaceWithMouse() {
  try { return localStorage.getItem("swarflyPlaceMouse") !== "0"; } catch (e) { return true; }
}

// ---- reading the scene ---------------------------------------------------------------------------------------------
function editorLinePoints(line) {
  var pts = [], vs = line.geometry.vertices, ox = line.position.x + (line.parent ? line.parent.position.x : 0), oy = line.position.y + (line.parent ? line.parent.position.y : 0);
  for (var i = 0; i < vs.length; i++) pts.push([vs[i].x + ox, vs[i].y + oy]);
  return pts;
}

function editorSelection() {
  return typeof getSelectedObjects === "function" ? getSelectedObjects().filter(function(l) { return l.geometry && l.geometry.vertices && l.geometry.vertices.length; }) : [];
}

function editorSelectionBox(lines) {
  var boxes = lines.map(function(l) { return editorBox(editorLinePoints(l)); });
  return boxes.length ? editorBoxUnion(boxes) : null;
}

function editorAllBox() {
  var lines = [];
  objectsInScene.forEach(function(o) { o.children.forEach(function(c) { if (c.geometry && c.geometry.vertices && c.geometry.vertices.length) lines.push(c); }); });
  return editorSelectionBox(lines);
}

// ---- changing the scene --------------------------------------------------------------------------------------------
// fn maps one [x, y] point to a new one; kind "move" keeps the shape parameters, any other change drops them (the object no longer
// is exactly what the parameters describe).
function editorLocked(lines) {
  return lines.filter(function(l) { return l.userData.locked; });
}

function editorTransform(lines, fn, kind) {
  if (!lines.length) return;
  if (editorLocked(lines).length) { editorToast("Locked objects are not changed - untick Locked first"); editorRefresh(true); return; }
  storeUndo(true);                       // also bakes positions into the geometry
  lines.forEach(function(line) {
    var g = line.geometry;
    for (var i = 0; i < g.vertices.length; i++) {
      var q = fn([g.vertices[i].x, g.vertices[i].y]);
      g.vertices[i].x = q[0]; g.vertices[i].y = q[1];
    }
    g.verticesNeedUpdate = true;
    if (g.computeBoundingSphere) g.computeBoundingSphere();
    if (g.computeBoundingBox) g.computeBoundingBox();
    if (kind !== "move") delete line.userData.shape;
  });
  if (typeof hoverShapesinScene !== "undefined") hoverShapesinScene.length = 0;
  clearSceneFlag = true;
  editorRefresh(true);
}

function editorRead(id) {
  var s = String(document.getElementById(id).value).trim().replace(",", ".");
  var v = Number(s);
  if (s === "" || !isFinite(v)) throw new Error("Not a number: " + document.getElementById(id).value);
  return v;
}

function editorToast(msg, cls) {
  if (typeof Metro !== "undefined" && Metro.toast) Metro.toast.create(msg, null, 4000, cls || "bg-red"); else console.warn(msg);
}

function editorApplyPosition() {
  var lines = editorSelection(), box = editorSelectionBox(lines);
  if (!box) return;
  try {
    var d = editorMoveDelta(box, editorState.ref, editorRead("epX"), editorRead("epY"));
    editorTransform(lines, function(p) { return [p[0] + d[0], p[1] + d[1]]; }, "move");
  } catch (e) { editorToast(e.message); editorRefresh(true); }
}

function editorApplySize(which) {
  var lines = editorSelection(), box = editorSelectionBox(lines);
  if (!box) return;
  try {
    var f = editorResizeFactors(box, which, editorRead(which === "w" ? "epW" : "epH"), editorState.lock);
    var fixed = editorRefPoint(box, editorState.ref);
    editorTransform(lines, function(p) { return editorScalePoint(p, fixed, f[0], f[1]); }, "scale");
  } catch (e) { editorToast(e.message); editorRefresh(true); }
}

function editorApplyRotate(dir) {
  var lines = editorSelection(), box = editorSelectionBox(lines);
  if (!box) return;
  try {
    var angle = editorRead("epAngle") * dir, c = editorRefPoint(box, "mc");
    editorTransform(lines, function(p) { return editorRotatePoint(p, c, angle); }, "rotate");
  } catch (e) { editorToast(e.message); }
}

// rebuild one shape from edited parameters; its lower-left corner stays where it is
function editorApplyParams() {
  var lines = editorSelection();
  if (lines.length !== 1 || !lines[0].userData.shape) return;
  var line = lines[0], info = line.userData.shape, params = {};
  try {
    EDITOR_SHAPES[info.kind].fields.forEach(function(f) { params[f.key] = editorRead("epP_" + f.key); });
    var box = editorBox(editorLinePoints(line));
    var pts = editorBuildShape(info.kind, params, box.minX, box.minY);
    storeUndo(true);
    var geom = new THREE.Geometry();
    pts.forEach(function(p) { geom.vertices.push(new THREE.Vector3(p[0], p[1], 0)); });
    line.geometry.dispose();
    line.geometry = geom;
    line.userData.shape = { kind: info.kind, params: editorCheckParams(info.kind, params) };
    if (typeof hoverShapesinScene !== "undefined") hoverShapesinScene.length = 0;
    clearSceneFlag = true;
    editorState.paramsFor = null;
    editorRefresh(true);
  } catch (e) { editorToast(e.message); }
}

// ---- panel ---------------------------------------------------------------------------------------------------------
function editorBuildPanel() {
  var p = document.createElement("div");
  p.id = "editorPanel";
  var grid = "";
  ["ul", "uc", "ur", "ml", "mc", "mr", "ll", "lc", "lr"].forEach(function(r) {
    grid += '<input type="radio" name="epRef" value="' + r + '" id="epRef_' + r + '" title="Reference point"' + (r === "ll" ? " checked" : "") + ">";
  });
  p.innerHTML = '<style>' +
    '#editorPanel{--ed-bg:#ffffff;--ed-fg:#1d2530;--ed-bar:#e3e9f1;--ed-border:#9fb0c3;--ed-input:#f4f7fb;--ed-accent:#0b6bcb}' +
    'body.theme_dark #editorPanel{--ed-bg:#1d2530;--ed-fg:#dfe6ee;--ed-bar:#2b3645;--ed-border:#4a5a70;--ed-input:#141a22;--ed-accent:#6cc0ff}' +
    '#editorPanel{position:absolute;top:10px;left:64px;z-index:6;width:236px;max-height:calc(100% - 50px);overflow:auto;display:none;background:var(--ed-bg);color:var(--ed-fg);border:1px solid var(--ed-border);border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.35);font-size:13px}' +
    '#editorPanel .ep-head{padding:5px 10px;background:var(--ed-bar);border-radius:6px 6px 0 0;font-weight:600;cursor:default}' +
    '#editorPanel .ep-body{padding:8px 10px}#editorPanel .ep-row{display:flex;align-items:center;gap:6px;margin:4px 0}' +
    '#editorPanel .ep-row label{width:70px;flex:0 0 70px}' +
    '#editorPanel input[type=text]{width:100%;min-width:0;box-sizing:border-box;background:var(--ed-input);color:var(--ed-fg);border:1px solid var(--ed-border);border-radius:3px;padding:2px 5px;text-align:right}' +
    '#editorPanel .ep-grid{display:grid;grid-template-columns:repeat(3,16px);grid-gap:3px;padding:4px;border:1px solid var(--ed-border);border-radius:3px;background:var(--ed-input)}' +
    '#editorPanel .ep-grid input{margin:0;width:16px;height:16px}' +
    '#editorPanel button{background:var(--ed-accent);color:#fff;border:0;border-radius:3px;padding:3px 8px;cursor:pointer}' +
    '#editorPanel hr{border:0;border-top:1px solid var(--ed-border);margin:8px 0}' +
    '#editorPanel .ep-note{opacity:.75;font-size:12px}' +
    '.ed-on{outline:2px solid #0b6bcb;outline-offset:-2px;border-radius:4px}' +
    '#editorStatus{position:absolute;left:64px;bottom:6px;z-index:5;pointer-events:none;font:12px/1.4 monospace;padding:2px 8px;border-radius:3px;background:rgba(0,0,0,.55);color:#fff;white-space:nowrap}' +
    '#editorDims{position:absolute;left:0;top:0;width:100%;height:100%;z-index:4;pointer-events:none;display:none}' +
    '</style>' +
    '<div class="ep-head"><i class="fas fa-fw fa-sliders-h"></i> <span id="epTitle">Properties</span></div><div class="ep-body">' +
    '<div class="ep-row"><div class="ep-grid" id="epGrid">' + grid + '</div><div style="flex:1">' +
    '<div class="ep-row"><label for="epX">X</label><input type="text" id="epX" autocomplete="off"></div>' +
    '<div class="ep-row"><label for="epY">Y</label><input type="text" id="epY" autocomplete="off"></div></div></div>' +
    '<div class="ep-note" id="epRefNote">Lower-left corner</div><hr>' +
    '<div class="ep-row"><label for="epW">Width</label><input type="text" id="epW" autocomplete="off"></div>' +
    '<div class="ep-row"><label for="epH">Height</label><input type="text" id="epH" autocomplete="off"></div>' +
    '<div class="ep-row"><label style="width:auto;flex:1"><input type="checkbox" id="epLock" checked> Keep proportions</label></div><hr>' +
    '<div class="ep-row"><label for="epAngle">Rotate</label><input type="text" id="epAngle" value="45" autocomplete="off"></div>' +
    '<div class="ep-row"><button type="button" id="epCCW" style="flex:1">Anticlockwise</button><button type="button" id="epCW" style="flex:1">Clockwise</button></div>' +
    '<div class="ep-row"><label style="width:auto;flex:1" title="A locked object is not changed by the panel, handles, arrow keys or Move A-B"><input type="checkbox" id="epLocked"> <i class="fas fa-lock fa-fw"></i> Locked</label></div>' +
    '<hr><div class="ep-row"><button type="button" id="epMirrorX" style="flex:1" title="Flip left-right about the centre of the selection">Mirror left-right</button><button type="button" id="epMirrorY" style="flex:1" title="Flip up-down about the centre of the selection">Mirror up-down</button></div>' +
    '<div class="ep-row"><button type="button" id="epToZero" style="flex:1" title="Move the selection so its lower-left corner is at X0 Y0">Move to X0 Y0</button></div><hr>' +
    '<div id="epPointsBox"></div>' +
    '<b>Corners and offset</b>' +
    '<div class="ep-row"><label for="epCornerSize">Size</label><input type="text" id="epCornerSize" value="3" autocomplete="off" title="Radius of the rounded corners, or the length cut off along both edges for a chamfer"></div>' +
    '<div class="ep-row"><button type="button" id="epFillet" style="flex:1" title="Round every corner of the selected outlines">Round corners</button><button type="button" id="epChamfer" style="flex:1" title="Cut every corner of the selected outlines">Chamfer</button></div>' +
    '<div class="ep-row"><label for="epOffset">Offset</label><input type="text" id="epOffset" value="2" autocomplete="off" title="Positive grows the outline, negative shrinks it"></div>' +
    '<div class="ep-row"><button type="button" id="epOffsetCopy" style="flex:1" title="Add a parallel outline at this distance (closed outlines only)">Offset copy</button></div><hr>' +
    '<b>Copies</b>' +
    '<div class="ep-row"><label for="epCopyCount">Objects</label><input type="text" id="epCopyCount" value="3" autocomplete="off" title="Total number of objects, the original included"></div>' +
    '<div class="ep-row"><label for="epCopyDX">Step X</label><input type="text" id="epCopyDX" value="10" autocomplete="off"></div>' +
    '<div class="ep-row"><label for="epCopyDY">Step Y</label><input type="text" id="epCopyDY" value="0" autocomplete="off"></div>' +
    '<div class="ep-row"><button type="button" id="epCopyLinear" style="flex:1">Copy in a row</button></div>' +
    '<div class="ep-row"><label for="epCopyAngle">Angle</label><input type="text" id="epCopyAngle" value="360" autocomplete="off" title="360 = full circle, spread evenly"></div>' +
    '<div class="ep-row"><label for="epCopyCX">Centre X</label><input type="text" id="epCopyCX" value="0" autocomplete="off" title="Point the copies turn around"></div>' +
    '<div class="ep-row"><label for="epCopyCY">Centre Y</label><input type="text" id="epCopyCY" value="0" autocomplete="off"></div>' +
    '<div class="ep-row"><button type="button" id="epCopyPolar" style="flex:1" title="Copies rotated about the centre point">Copy around a point</button></div>' +
    '<div id="epParams"></div></div>';
  var area = document.getElementById("renderArea");
  area.appendChild(p);
  // the panel must not start a marquee or orbit in the viewer underneath
  ["mousedown", "mouseup", "mousemove", "wheel", "dblclick", "contextmenu"].forEach(function(t) {
    p.addEventListener(t, function(e) { e.stopPropagation(); });
  });
  ["epX", "epY"].forEach(function(id) { document.getElementById(id).addEventListener("change", editorApplyPosition); });
  document.getElementById("epW").addEventListener("change", function() { editorApplySize("w"); });
  document.getElementById("epH").addEventListener("change", function() { editorApplySize("h"); });
  document.getElementById("epLock").addEventListener("change", function() { editorState.lock = this.checked; });
  document.getElementById("epCCW").addEventListener("click", function() { editorApplyRotate(1); });
  document.getElementById("epCW").addEventListener("click", function() { editorApplyRotate(-1); });
  document.getElementById("epGrid").addEventListener("change", function(e) {
    editorState.ref = e.target.value;
    var names = { ul: "Upper-left corner", uc: "Upper edge, middle", ur: "Upper-right corner", ml: "Left edge, middle", mc: "Centre", mr: "Right edge, middle", ll: "Lower-left corner", lc: "Lower edge, middle", lr: "Lower-right corner" };
    document.getElementById("epRefNote").textContent = names[editorState.ref];
    editorRefresh(true);
  });
  document.getElementById("epLocked").addEventListener("change", function() { editorSetLocked(this.checked); });
  document.getElementById("epFillet").addEventListener("click", function() { editorCorners("fillet"); });
  document.getElementById("epChamfer").addEventListener("click", function() { editorCorners("chamfer"); });
  document.getElementById("epOffsetCopy").addEventListener("click", editorOffsetCopy);
  document.getElementById("epMirrorX").addEventListener("click", function() { editorMirror("x"); });
  document.getElementById("epMirrorY").addEventListener("click", function() { editorMirror("y"); });
  document.getElementById("epToZero").addEventListener("click", editorToZero);
  document.getElementById("epCopyLinear").addEventListener("click", editorCopyLinear);
  document.getElementById("epCopyPolar").addEventListener("click", editorCopyPolar);
  p.addEventListener("keydown", function(e) { e.stopPropagation(); });   // Delete / Backspace in a field must not delete objects

  var coord = document.createElement("div");
  coord.id = "editorCoordBox";
  coord.style.cssText = "position:absolute;left:64px;bottom:34px;z-index:7;display:none;background:rgba(0,0,0,.7);padding:4px 8px;border-radius:4px;color:#fff;font:12px monospace";
  // the hint is a text node (the translator skips input placeholders)
  coord.innerHTML = '<div id="editorCoordHint" style="opacity:.85;margin-bottom:3px">or type X,Y @dx,dy @length&lt;angle</div><input type="text" id="editorCoord" autocomplete="off" style="width:240px;background:#fff;color:#000;border:0;border-radius:3px;padding:2px 5px"> <span style="opacity:.8">Enter</span>';
  area.appendChild(coord);
  ["mousedown", "mouseup", "mousemove", "wheel", "dblclick", "contextmenu", "keydown"].forEach(function(t) { coord.addEventListener(t, function(e) { e.stopPropagation(); }); });
  document.getElementById("editorCoord").addEventListener("keydown", function(e) {
    if (e.key === "Enter") { e.preventDefault(); editorCoordSubmit(); }
    if (e.key === "Escape") { editorCancelMoveAB(); if (editorState.me) editorMeasureEnd(); }
  });
  var status = document.createElement("div");
  status.id = "editorStatus";
  status.innerHTML = '<span id="editorCoords"></span><span id="editorPrompt"></span>';   // prompt alone, so the Czech translation can match it
  area.appendChild(status);
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  svg.id = "editorDims";
  area.appendChild(svg);
  // selection box with 8 handles; the svg itself ignores the mouse, only the handles take it
  var hs = document.createElementNS(ns, "svg");
  hs.id = "editorHandles";
  hs.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:5;pointer-events:none;display:none";
  var cursors = { ul: "nwse-resize", lr: "nwse-resize", ur: "nesw-resize", ll: "nesw-resize", uc: "ns-resize", lc: "ns-resize", ml: "ew-resize", mr: "ew-resize" };
  var html = '<rect id="editorBoxLine" fill="none" stroke="#0b9bff" stroke-width="1" stroke-dasharray="5 4"/>';
  Object.keys(cursors).forEach(function(h) {
    html += '<rect class="editorHandle" data-h="' + h + '" width="9" height="9" fill="#fff" stroke="#0b6bcb" stroke-width="1.5" style="pointer-events:all;cursor:' + cursors[h] + '"/>';
  });
  hs.innerHTML = html;
  area.appendChild(hs);
  var sm = document.createElementNS(ns, "svg");
  sm.id = "editorSnapMark";
  sm.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:5;pointer-events:none;display:none";
  sm.innerHTML = '<line id="editorRubber" stroke="#ff4fd8" stroke-width="1.5" stroke-dasharray="6 4" style="display:none"/>' +
    '<circle id="editorSnapDot" r="7" fill="none" stroke="#ff4fd8" stroke-width="2.5"/>' +
    '<text id="editorSnapText" fill="#ff4fd8" font-size="12" font-family="monospace" font-weight="bold" paint-order="stroke" stroke="#000" stroke-width="3"></text>';
  area.appendChild(sm);
  Array.prototype.forEach.call(hs.querySelectorAll(".editorHandle"), function(r) {
    r.addEventListener("mousedown", function(e) { editorHandleDown(e, r.getAttribute("data-h")); });
    ["mouseup", "wheel", "dblclick", "contextmenu"].forEach(function(t) { r.addEventListener(t, function(e) { e.stopPropagation(); }); });
  });
}

function editorParamsHtml(line) {
  var info = line.userData.shape;
  if (!info || !EDITOR_SHAPES[info.kind]) return "";
  var rows = EDITOR_SHAPES[info.kind].fields.map(function(f) {
    return '<div class="ep-row"><label for="epP_' + f.key + '">' + f.label + '</label><input type="text" id="epP_' + f.key + '" value="' + info.params[f.key] + '" autocomplete="off"></div>';
  }).join("");
  return '<hr><b>Shape: ' + info.kind + '</b>' + rows + '<div class="ep-row"><button type="button" id="epApplyParams" style="flex:1">Apply parameters</button></div>';
}

// fills the fields from the selection; force = overwrite even when a field has the focus
function editorRefresh(force) {
  var panel = document.getElementById("editorPanel");
  if (!panel) return;
  var lines = editorSelection(), box = editorSelectionBox(lines);
  editorState.count = lines.length;
  if (!box || !editorState.panelOn || editorState.mv || editorState.me || editorState.placing) { panel.style.display = "none"; editorState.sig = ""; return; }   // out of the way while a point is being picked
  var sig = lines.map(function(l) { return l.uuid; }).join() + [box.minX, box.minY, box.maxX, box.maxY].map(function(v) { return v.toFixed(4); }).join() + editorState.ref + lines.map(function(l) { return l.userData.locked ? "L" : "u"; }).join("");
  if (sig === editorState.sig && !force) return;
  editorState.sig = sig;
  panel.style.display = "block";
  document.getElementById("epTitle").textContent = lines.length === 1 ? "Properties" : "Properties - " + lines.length + " objects";
  var lockedCount = editorLocked(lines).length, lockBox = document.getElementById("epLocked");
  lockBox.checked = lockedCount === lines.length;
  lockBox.indeterminate = lockedCount > 0 && lockedCount < lines.length;
  document.getElementById("epTitle").parentNode.style.opacity = lockedCount ? "0.9" : "1";
  var ref = editorRefPoint(box, editorState.ref), s = editorSize(box);
  document.getElementById("epX").value = editorFormat(ref[0]);
  document.getElementById("epY").value = editorFormat(ref[1]);
  document.getElementById("epW").value = editorFormat(s.w);
  document.getElementById("epH").value = editorFormat(s.h);
  editorRefreshPoints(lines);
  var box2 = document.getElementById("epParams");
  var key = lines.length === 1 && lines[0].userData.shape ? lines[0].uuid + JSON.stringify(lines[0].userData.shape) : "";
  if (key !== editorState.paramsFor) {
    editorState.paramsFor = key;
    box2.innerHTML = key ? editorParamsHtml(lines[0]) : "";
    var btn = document.getElementById("epApplyParams");
    if (btn) btn.addEventListener("click", editorApplyParams);
  }
}

// ---- 1.5.0: mirror, move to zero, copies --------------------------------------------------------------------------------
function editorMirror(axis) {
  var lines = editorSelection(), box = editorSelectionBox(lines);
  if (!box) return;
  var c = editorRefPoint(box, "mc"), value = axis === "x" ? c[0] : c[1];
  editorTransform(lines, function(p) { return editorMirrorPoint(p, axis, value); }, "mirror");
}

function editorToZero() {
  var lines = editorSelection(), box = editorSelectionBox(lines);
  if (!box) return;
  var d = editorMoveDelta(box, "ll", 0, 0);
  editorTransform(lines, function(p) { return [p[0] + d[0], p[1] + d[1]]; }, "move");
}

// one copy of every selected line for each transform; the copies become the selection. keepShape: copies of a pure move keep their parameters.
function editorMakeCopies(lines, transforms, keepShape) {
  storeUndo(true);                         // one undo step for the whole set
  var created = [];
  transforms.forEach(function(fn) {
    lines.forEach(function(line) {
      var g = line.geometry.clone();
      for (var i = 0; i < g.vertices.length; i++) {
        var q = fn([g.vertices[i].x, g.vertices[i].y]);
        g.vertices[i].x = q[0]; g.vertices[i].y = q[1];
      }
      var copy = new THREE.Line(g, line.material.clone());
      copy.name = line.name;
      if (keepShape && line.userData.shape) copy.userData.shape = JSON.parse(JSON.stringify(line.userData.shape));
      line.parent.add(copy);
      created.push(copy);
    });
  });
  lines.forEach(function(l) { l.userData.selected = false; });
  created.forEach(function(c) { c.userData.selected = true; });
  if (typeof fillTree === "function") fillTree();
  if (typeof hoverShapesinScene !== "undefined") hoverShapesinScene.length = 0;
  clearSceneFlag = true;
  editorRefresh(true);
}

function editorCopyLinear() {
  var lines = editorSelection();
  if (!lines.length) return;
  try {
    var offs = editorLinearOffsets(editorRead("epCopyCount"), editorRead("epCopyDX"), editorRead("epCopyDY"));
    editorMakeCopies(lines, offs.map(function(o) { return function(p) { return [p[0] + o[0], p[1] + o[1]]; }; }), true);
  } catch (e) { editorToast(e.message); }
}

function editorCopyPolar() {
  var lines = editorSelection();
  if (!lines.length) return;
  try {
    var angles = editorPolarAngles(editorRead("epCopyCount"), editorRead("epCopyAngle")), c = [editorRead("epCopyCX"), editorRead("epCopyCY")];
    editorMakeCopies(lines, angles.map(function(a) { return function(p) { return editorRotatePoint(p, c, a); }; }), false);
  } catch (e) { editorToast(e.message); }
}

// ---- 1.5.0: handles on the selection box ---------------------------------------------------------------------------------
var editorDrag = null;

function editorDrawHandles() {
  var hs = document.getElementById("editorHandles");
  if (!hs) return;
  var lines = (editorState.placing || editorState.mv || editorState.me) ? [] : editorSelection();      // no handles in the way while a point is being picked
  var box = lines.length ? editorSelectionBox(lines) : null;
  if (!box || (box.maxX - box.minX <= 0 && box.maxY - box.minY <= 0)) { hs.style.display = "none"; return; }
  hs.style.display = "block";
  var locked = editorLocked(lines).length > 0;           // the box is shown, the handles are not
  Array.prototype.forEach.call(hs.querySelectorAll(".editorHandle"), function(r) { r.style.display = locked ? "none" : ""; });
  var a = editorToScreen(box.minX, box.maxY), b = editorToScreen(box.maxX, box.minY);
  var line = document.getElementById("editorBoxLine");
  line.setAttribute("x", Math.min(a[0], b[0])); line.setAttribute("y", Math.min(a[1], b[1]));
  line.setAttribute("width", Math.abs(b[0] - a[0])); line.setAttribute("height", Math.abs(b[1] - a[1]));
  Array.prototype.forEach.call(hs.querySelectorAll(".editorHandle"), function(r) {
    var p = editorRefPoint(box, r.getAttribute("data-h")), q = editorToScreen(p[0], p[1]);
    r.setAttribute("x", q[0] - 4.5); r.setAttribute("y", q[1] - 4.5);
  });
}

function editorHandleDown(e, handle) {
  if (e.button !== 0) return;
  e.preventDefault(); e.stopPropagation();
  var lines = editorSelection(), box = editorSelectionBox(lines);
  if (!box || editorLocked(lines).length) return;
  storeUndo(true);
  editorDrag = {
    handle: handle, lines: lines, box: box, changed: false,
    snap: lines.map(function(l) { return l.geometry.vertices.map(function(v) { return [v.x, v.y]; }); })
  };
}

function editorHandleMove(e) {
  if (!editorDrag) return;
  var d = editorDrag, w = mouseToWorldCoord(e), sp = editorSnapPoint(w.x, w.y, d.lines);
  editorShowSnap(sp ? sp.point : null, sp ? sp.kind : null);
  var r = editorHandleFactors(d.box, d.handle, sp ? sp.point[0] : w.x, sp ? sp.point[1] : w.y, e.shiftKey);
  d.lines.forEach(function(line, li) {
    var g = line.geometry;
    for (var i = 0; i < g.vertices.length; i++) {
      var q = editorScalePoint(d.snap[li][i], r.fixed, r.fx, r.fy);
      g.vertices[i].x = q[0]; g.vertices[i].y = q[1];
    }
    g.verticesNeedUpdate = true;
  });
  d.changed = d.changed || Math.abs(r.fx - 1) > 1e-9 || Math.abs(r.fy - 1) > 1e-9;
  clearSceneFlag = true;
}

function editorHandleUp() {
  if (!editorDrag) return;
  var d = editorDrag;
  editorDrag = null;
  editorShowSnap(null);
  d.lines.forEach(function(line) {
    if (line.geometry.computeBoundingSphere) line.geometry.computeBoundingSphere();
    if (line.geometry.computeBoundingBox) line.geometry.computeBoundingBox();
    if (d.changed) delete line.userData.shape;
  });
  if (!d.changed && typeof undoStore !== "undefined") undoStore.shift();      // a click on a handle without dragging is not an edit
  if (typeof hoverShapesinScene !== "undefined") hoverShapesinScene.length = 0;
  clearSceneFlag = true;
  editorRefresh(true);
}

// arrow keys nudge the selection: 1 mm, Shift 10 mm, Alt 0.1 mm
function editorArrowKey(e) {
  var t = e.target && e.target.nodeName ? e.target.nodeName.toLowerCase() : "";
  if (t === "input" || t === "textarea" || t === "select" || editorState.placing) return;
  var d = editorArrowDelta(e.key, e.shiftKey, e.altKey);
  if (!d) return;
  var lines = editorSelection();
  if (!lines.length) return;
  e.preventDefault(); e.stopImmediatePropagation();
  editorTransform(lines, function(p) { return [p[0] + d[0], p[1] + d[1]]; }, "move");
}

// ---- 1.5.1: snapping -----------------------------------------------------------------------------------------------------
function editorMmPerPixel() {
  var a = editorToScreen(0, 0), b = editorToScreen(1, 0), px = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return px > 0 ? 1 / px : 1;
}

function editorSnapOpts() { return { gridStep: editorState.gridStep }; }

// outlines the cursor may snap to: every line except the excluded ones (the ones being moved); cached until the scene changes
function editorSnapPolylines(exclude) {
  var skip = {};
  exclude.forEach(function(l) { skip[l.uuid] = true; });
  var lines = [], total = 0;
  objectsInScene.forEach(function(o) { o.children.forEach(function(c) {
    if (c.geometry && c.geometry.vertices && c.geometry.vertices.length && !skip[c.uuid]) { lines.push(c); total += c.geometry.vertices.length; }
  }); });
  var sig = lines.length + ":" + total + ":" + (typeof undoStore !== "undefined" ? undoStore.length + ":" + (undoStore[0] ? undoStore[0].length : 0) : "") + ":" + Object.keys(skip).join();
  if (editorState.snapCache && editorState.snapCache.sig === sig) return editorState.snapCache.polys;
  var polys = lines.map(editorLinePoints);
  editorState.snapCache = { sig: sig, polys: polys };
  return polys;
}

function editorSnapPoint(x, y, exclude) {
  if (!editorState.snap) return null;
  return editorSnapFind([x, y], editorSnapPolylines(exclude), 10 * editorMmPerPixel(), editorSnapOpts());
}

var EDITOR_SNAP_NAMES = { end: "End point", intersection: "Intersection", centre: "Centre", mid: "Middle", grid: "Grid" };

function editorShowSnap(point, kind) {
  var svg = document.getElementById("editorSnapMark");
  if (!svg) return;
  if (!point) { svg.style.display = "none"; return; }
  var q = editorToScreen(point[0], point[1]);
  svg.style.display = "block";
  var c = document.getElementById("editorSnapDot"), t = document.getElementById("editorSnapText");
  c.setAttribute("cx", q[0]); c.setAttribute("cy", q[1]);
  t.setAttribute("x", q[0] + 12); t.setAttribute("y", q[1] - 10);
  var name = EDITOR_SNAP_NAMES[kind] || kind;
  if (t.getAttribute("data-en") !== name) { t.setAttribute("data-en", name); t.textContent = name; }
}

function editorToggleSnap() {
  editorState.snap = !editorState.snap;
  try { localStorage.setItem("swarflySnap", editorState.snap ? "1" : "0"); } catch (e) { /* storage blocked */ }
  var b = document.getElementById("editorSnapButton");
  if (b) b.classList.toggle("ed-on", editorState.snap);
  if (!editorState.snap) editorShowSnap(null);
}

function editorCycleGrid() {
  editorState.gridStep = editorNextGridStep(editorState.gridStep);
  try { localStorage.setItem("swarflyGrid", String(editorState.gridStep)); } catch (e) { /* storage blocked */ }
  editorShowGridButton();
}

function editorShowGridButton() {
  var cap = document.getElementById("editorGridCaption");
  if (cap) cap.textContent = editorState.gridStep > 0 ? editorState.gridStep + " mm" : "Off";
}

// ---- 1.5.1: move from point A to point B ---------------------------------------------------------------------------------
function editorStartMoveAB() {
  editorEndPlacement();
  var lines = editorSelection();
  if (!lines.length) { editorToast("Select the objects to move first"); return; }
  if (editorLocked(lines).length) { editorToast("Locked objects are not changed - untick Locked first"); return; }
  editorCancelMoveAB(true);
  editorState.mv = { step: 1, a: null, lines: lines, snap: lines.map(function(l) { return l.geometry.vertices.map(function(v) { return [v.x, v.y]; }); }), undoTop: null };
  var b = document.getElementById("editorMoveButton");
  if (b) b.classList.add("ed-on");
  editorDrawHandles();
  editorRefresh(true);
  editorCoordShow();
  editorStatusUpdate(null);
}

function editorMoveABPoint(e) {
  // the first point may be a corner of the selection itself; once the objects follow the pointer they must not snap to themselves
  var w = mouseToWorldCoord(e), s = editorSnapPoint(w.x, w.y, editorState.mv.step === 1 ? [] : editorState.mv.lines);
  editorShowSnap(s ? s.point : null, s ? s.kind : null);
  return s ? s.point : [w.x, w.y];
}

function editorMoveABApply(dx, dy) {
  var mv = editorState.mv;
  mv.lines.forEach(function(line, li) {
    var g = line.geometry;
    for (var i = 0; i < g.vertices.length; i++) { g.vertices[i].x = mv.snap[li][i][0] + dx; g.vertices[i].y = mv.snap[li][i][1] + dy; }
    g.verticesNeedUpdate = true;
  });
  clearSceneFlag = true;
}

function editorMoveABMove(e) {
  var mv = editorState.mv;
  if (!mv) return;
  var p = editorMoveABPoint(e);
  if (mv.step === 2) {
    editorMoveABApply(p[0] - mv.a[0], p[1] - mv.a[1]);
    var rb = document.getElementById("editorRubber"), a = editorToScreen(mv.a[0], mv.a[1]), b = editorToScreen(p[0], p[1]);
    rb.setAttribute("x1", a[0]); rb.setAttribute("y1", a[1]); rb.setAttribute("x2", b[0]); rb.setAttribute("y2", b[1]);
    document.getElementById("editorSnapMark").style.display = "block";
    rb.style.display = "block";
  }
}

function editorMoveABClick(e) { editorMoveABAccept(editorMoveABPoint(e)); }

function editorMoveABAccept(p) {
  var mv = editorState.mv;
  editorState.lastPoint = p;
  if (mv.step === 1) {
    mv.a = p;
    mv.undoTop = typeof undoStore !== "undefined" ? undoStore[0] : null;
    storeUndo(true);                       // the snapshot of the state before the move
    mv.step = 2;
  } else {
    editorMoveABApply(p[0] - mv.a[0], p[1] - mv.a[1]);
    mv.lines.forEach(function(l) { if (l.geometry.computeBoundingSphere) l.geometry.computeBoundingSphere(); if (l.geometry.computeBoundingBox) l.geometry.computeBoundingBox(); });
    editorState.mv = null;
    editorMoveABClean();
    if (typeof hoverShapesinScene !== "undefined") hoverShapesinScene.length = 0;
    editorRefresh(true);
  }
  editorStatusUpdate(null);
}

function editorMoveABClean() {
  var rb = document.getElementById("editorRubber");
  if (rb) rb.style.display = "none";
  editorShowSnap(null);
  var b = document.getElementById("editorMoveButton");
  if (b) b.classList.remove("ed-on");
  editorCoordHide();
}

// cancel: put the objects back and drop the undo snapshot that step 2 took. quiet: no status update
function editorCancelMoveAB(quiet) {
  var mv = editorState.mv;
  if (!mv) return;
  editorState.mv = null;
  if (mv.step === 2) {
    mv.lines.forEach(function(line, li) {
      var g = line.geometry;
      for (var i = 0; i < g.vertices.length; i++) { g.vertices[i].x = mv.snap[li][i][0]; g.vertices[i].y = mv.snap[li][i][1]; }
      g.verticesNeedUpdate = true;
    });
    if (typeof undoStore !== "undefined" && undoStore.length) undoStore.shift();
  }
  editorMoveABClean();
  clearSceneFlag = true;
  if (!quiet) editorStatusUpdate(null);
}

// ---- 1.5.2: lock, window selection, group by double-click, Esc, cycling ------------------------------------------------------
function editorSetLocked(on) {
  var lines = editorSelection();
  if (!lines.length) return;
  storeUndo(true);
  lines.forEach(function(l) { if (on) l.userData.locked = true; else delete l.userData.locked; });
  editorRefresh(true);
}

// Called by the marquee code of the viewer for every outline while the window is dragged.
function editorMarqueeTest(child) {
  var a = worldstartcoords, b = worldendcoords;
  if (!a || !b || !child.geometry || !child.geometry.vertices.length) return false;
  var rect = editorRectFromCorners([a.x, a.y], [b.x, b.y]);
  var sel = document.getElementById("selection");
  if (sel) { sel.style.borderStyle = rect.mode === "window" ? "solid" : "dashed"; sel.style.borderColor = rect.mode === "window" ? "#2d8cff" : "#2fbf55"; }
  var g = child.geometry;
  if (g.computeBoundingBox) g.computeBoundingBox();
  var ox = child.position.x + (child.parent ? child.parent.position.x : 0), oy = child.position.y + (child.parent ? child.parent.position.y : 0);
  var bb = g.boundingBox;
  var box = { minX: bb.min.x + ox, minY: bb.min.y + oy, maxX: bb.max.x + ox, maxY: bb.max.y + oy };
  return editorMarqueeHit(box, function() { return editorLinePoints(child); }, rect);
}

// Called by the click code of the viewer: which of the objects under the pointer is picked. Clicking again on the same spot
// moves on to the next one (the status line says how many there are).
function editorPickIndex(event, intersects) {
  var seen = {}, firsts = [];
  intersects.forEach(function(hit, i) {
    var o = hit.object;
    if (!o || !o.name || o.userData.type === "toolpath" || seen[o.uuid]) return;
    seen[o.uuid] = true; firsts.push(i);
  });
  editorState.pickCount = firsts.length;
  var r = editorCycleIndex(editorState.pick, event.clientX, event.clientY, Date.now(), firsts.length);
  editorState.pick = r.state;
  editorState.pickObject = firsts.length ? intersects[firsts[r.idx]].object.uuid : null;        // a following double-click works on this one
  return firsts.length ? firsts[r.idx] : 0;
}

// double-click selects every outline of the object group under the pointer (a whole imported drawing, a whole text)
function editorDoubleClick(e) {
  if (e.target.tagName !== "CANVAS" || editorState.placing || editorState.mv || typeof raycaster === "undefined") return;
  mouseVector.x = (e.offsetX / renderer.domElement.width) * 2 - 1;
  mouseVector.y = -(e.offsetY / renderer.domElement.height) * 2 + 1;
  camera.updateProjectionMatrix();
  raycaster.setFromCamera(mouseVector, camera);
  var documents = scene.getObjectByName("Documents");
  if (!documents) return;
  var hits = raycaster.intersectObjects(documents.children, true).filter(function(h) { return h.object.name && h.object.userData.type !== "toolpath" && h.object.parent; });
  if (!hits.length) return;
  var chosen = hits.filter(function(h) { return h.object.uuid === editorState.pickObject; })[0] || hits[0];
  var group = chosen.object.parent;
  if (!e.ctrlKey) objectsInScene.forEach(function(o) { o.children.forEach(function(c) { c.userData.selected = false; }); });
  group.children.forEach(function(c) { if (c.type === "Line") c.userData.selected = true; });
  clearSceneFlag = true;
  editorRefresh(true);
}

// Esc clears the selection (when nothing else is using Esc)
function editorEscape(e) {
  if (e.key !== "Escape" || editorState.placing || editorState.mv) return;
  var t = e.target && e.target.nodeName ? e.target.nodeName.toLowerCase() : "";
  if (t === "input" || t === "textarea" || t === "select") return;
  if (!editorSelection().length) return;
  objectsInScene.forEach(function(o) { o.children.forEach(function(c) { c.userData.selected = false; }); });
  clearSceneFlag = true;
  editorRefresh(true);
}

// ---- 1.6.2: edit single points, hole diameter -----------------------------------------------------------------------------
var EDITOR_MAX_POINT_ROWS = 40;

// a closed outline repeats its first point at the end; the table shows that point once
function editorOutlineRows(pts) {
  var closed = pts.length > 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-9;
  return { rows: closed ? pts.slice(0, -1) : pts, closed: closed };
}

function editorRefreshPoints(lines) {
  var host = document.getElementById("epPointsBox");
  if (!host) return;
  var key = "";
  if (lines.length === 1) key = lines[0].uuid + ":" + editorLinePoints(lines[0]).map(function(p) { return p[0].toFixed(4) + "," + p[1].toFixed(4); }).join(";");
  if (key === editorState.pointsFor) return;
  editorState.pointsFor = key;
  if (!key) { host.innerHTML = ""; return; }
  var pts = editorLinePoints(lines[0]), info = editorOutlineRows(pts), fit = info.closed ? editorCircleFit(pts, 0.01) : null, h = "";
  if (fit) {
    h += '<b>Hole</b><div class="ep-row"><label for="epDia">Diameter</label><input type="text" id="epDia" value="' + editorFormat(2 * fit.r) + '" autocomplete="off" title="Resize the circle round its centre"><button type="button" id="epApplyDia">Set</button></div><hr>';
  }
  if (info.rows.length <= EDITOR_MAX_POINT_ROWS) {
    h += '<b>Outline points</b><div style="max-height:150px;overflow:auto">';
    info.rows.forEach(function(p, i) {
      h += '<div class="ep-row"><span style="width:22px">' + (i + 1) + '</span><input type="text" class="epPtX" value="' + editorFormat(p[0]) + '" autocomplete="off"><input type="text" class="epPtY" value="' + editorFormat(p[1]) + '" autocomplete="off"></div>';
    });
    h += '</div><div class="ep-row"><button type="button" id="epApplyPoints" style="flex:1" title="Move the outline points to the typed positions">Apply points</button></div><hr>';
  } else {
    h += '<div class="ep-row" style="opacity:.7">Too many points to list (' + info.rows.length + ')</div><hr>';
  }
  host.innerHTML = h;
  var a = document.getElementById("epApplyPoints"); if (a) a.addEventListener("click", editorApplyPoints);
  var d = document.getElementById("epApplyDia"); if (d) d.addEventListener("click", editorApplyDiameter);
}

function editorApplyPoints() {
  var lines = editorSelection();
  if (lines.length !== 1) return;
  var line = lines[0];
  if (editorLocked(lines).length) { editorToast("Locked objects are not changed - untick Locked first"); return; }
  try {
    var xs = document.querySelectorAll("#epPointsBox .epPtX"), ys = document.querySelectorAll("#epPointsBox .epPtY"), pts = editorLinePoints(line), info = editorOutlineRows(pts);
    if (xs.length !== info.rows.length) throw new Error("The point list is out of date");
    var out = [];
    for (var i = 0; i < xs.length; i++) {
      var x = Number(String(xs[i].value).trim().replace(",", ".")), y = Number(String(ys[i].value).trim().replace(",", "."));
      if (!isFinite(x) || !isFinite(y) || xs[i].value.trim() === "" || ys[i].value.trim() === "") throw new Error("Not a number: point " + (i + 1));
      out.push([x, y]);
    }
    if (info.closed) out.push([out[0][0], out[0][1]]);
    storeUndo(true);
    // the line's own position was baked into the geometry by storeUndo, so absolute and geometry coordinates now agree
    var ox = line.position.x + (line.parent ? line.parent.position.x : 0), oy = line.position.y + (line.parent ? line.parent.position.y : 0);
    editorReplaceGeometry(line, out.map(function(p) { return [p[0] - ox, p[1] - oy]; }));
    delete line.userData.shape;
    if (typeof hoverShapesinScene !== "undefined") hoverShapesinScene.length = 0;
    clearSceneFlag = true;
    editorState.snapCache = null;
    editorRefresh(true);
  } catch (e) { editorToast(e.message); }
}

function editorApplyDiameter() {
  var lines = editorSelection();
  if (lines.length !== 1) return;
  try {
    var d = editorRead("epDia");
    if (!(d > 0)) throw new Error("Diameter must be positive");
    var fit = editorCircleFit(editorLinePoints(lines[0]), 0.01);
    if (!fit) return;
    var f = d / (2 * fit.r);
    editorTransform(lines, function(p) { return [fit.cx + (p[0] - fit.cx) * f, fit.cy + (p[1] - fit.cy) * f]; }, "scale");
  } catch (e) { editorToast(e.message); }
}

// ---- 1.6.1: rounded corners, chamfers, offset ---------------------------------------------------------------------------
function editorReplaceGeometry(line, pts) {
  var g = new THREE.Geometry();
  pts.forEach(function(p) { g.vertices.push(new THREE.Vector3(p[0], p[1], 0)); });
  line.geometry.dispose();
  line.geometry = g;
}

function editorCorners(mode) {
  var lines = editorSelection();
  if (!lines.length) return;
  if (editorLocked(lines).length) { editorToast("Locked objects are not changed - untick Locked first"); return; }
  try {
    var size = editorRead("epCornerSize");
    var results = lines.map(function(l) { return editorCornerCut(editorLinePoints(l), mode, size); });
    var corners = 0, clamped = 0;
    results.forEach(function(r) { corners += r.corners; clamped += r.clamped; });
    if (!corners) { editorToast("There is no corner to change in the selection"); return; }
    storeUndo(true);
    lines.forEach(function(l, i) { editorReplaceGeometry(l, results[i].points); delete l.userData.shape; });
    if (typeof hoverShapesinScene !== "undefined") hoverShapesinScene.length = 0;
    clearSceneFlag = true;
    editorState.snapCache = null;
    editorRefresh(true);
    if (clamped) editorToast("Some corners were too short for that size and got a smaller one", "bg-orange");
  } catch (e) { editorToast(e.message); }
}

// a parallel outline at the typed distance; the original stays, the new outline becomes the selection
function editorOffsetCopy() {
  var lines = editorSelection();
  if (!lines.length) return;
  try {
    var delta = editorRead("epOffset");
    var result = editorOffsetOutlines(ClipperLib, lines.map(editorLinePoints), delta);
    if (!result.length) { editorToast("Nothing is left after shrinking by that distance"); return; }
    storeUndo(true);
    var parent = lines[0].parent, created = [];
    result.forEach(function(pts) {
      var g = new THREE.Geometry();
      pts.forEach(function(p) { g.vertices.push(new THREE.Vector3(p[0], p[1], 0)); });
      var line = new THREE.Line(g, lines[0].material.clone());
      line.name = "offset";
      parent.add(line);
      created.push(line);
    });
    lines.forEach(function(l) { l.userData.selected = false; });
    created.forEach(function(c) { c.userData.selected = true; });
    if (typeof fillTree === "function") fillTree();
    if (typeof hoverShapesinScene !== "undefined") hoverShapesinScene.length = 0;
    clearSceneFlag = true;
    editorState.snapCache = null;
    editorRefresh(true);
  } catch (e) { editorToast(e.message); }
}

// ---- 1.6.0: measuring, typed coordinates ---------------------------------------------------------------------------------
function editorStartMeasure(mode) {
  editorEndPlacement();
  editorCancelMoveAB(true);
  if (mode === "circle") { editorMeasureCircles(); return; }
  editorState.me = { mode: mode, pts: [] };
  var b = document.getElementById("editorMeasureButton");
  if (b) b.classList.add("ed-on");
  editorDrawHandles(); editorRefresh(true);
  editorCoordShow();
  editorStatusUpdate(null);
}

function editorMeasureStep() {
  var me = editorState.me;
  if (!me) return null;
  return me.mode === "dist" ? (me.pts.length ? "d2" : "d1") : ["a1", "a2", "a3"][me.pts.length];
}

function editorMeasureEnd() {
  editorState.me = null;
  var b = document.getElementById("editorMeasureButton");
  if (b) b.classList.remove("ed-on");
  editorShowSnap(null);
  editorCoordHide();
  editorStatusUpdate(null);
}

function editorMeasureAccept(p) {
  var me = editorState.me;
  if (!me) return;
  me.pts.push(p);
  editorState.lastPoint = p;
  if (me.mode === "dist" && me.pts.length === 2) {
    editorState.measures.push({ type: "dist", a: me.pts[0], b: me.pts[1] });
    me.pts = [];
  } else if (me.mode === "angle" && me.pts.length === 3) {
    var deg = editorAngleInfo(me.pts[0], me.pts[1], me.pts[2]);
    if (deg === null) editorToast("An arm of the angle has no length - pick another point");
    else editorState.measures.push({ type: "angle", v: me.pts[0], p1: me.pts[1], p2: me.pts[2], deg: deg });
    me.pts = [];
  }
  editorDrawDims();
  editorStatusUpdate(null);
}

function editorMeasureMove(e) {
  var w = mouseToWorldCoord(e), s = editorSnapPoint(w.x, w.y, []);
  editorShowSnap(s ? s.point : null, s ? s.kind : null);
  editorState.cursorSnapped = s ? s.point : [w.x, w.y];
}

// Ø and R of the selected outlines that are circles
function editorMeasureCircles() {
  var lines = editorSelection(), found = 0;
  lines.forEach(function(l) {
    var c = editorCircleFit(editorLinePoints(l), 0.01);
    if (c) { editorState.measures.push({ type: "dia", center: [c.cx, c.cy], r: c.r, text: "Ø " + editorFormat(2 * c.r) }); found++; }
  });
  if (!found) editorToast("Select a circle first");
  editorDrawDims();
}

function editorClearMeasures() {
  editorState.measures = [];
  editorDrawDims();
}

function editorCoordShow() {
  var box = document.getElementById("editorCoordBox");
  if (box) { box.style.display = "block"; var i = document.getElementById("editorCoord"); i.value = ""; }
}

function editorCoordHide() {
  var box = document.getElementById("editorCoordBox");
  if (box && !editorState.mv && !editorState.me) box.style.display = "none";
}

// Enter in the coordinate field = a click at the typed point
function editorCoordSubmit() {
  var input = document.getElementById("editorCoord");
  try {
    var p = editorParseCoordinate(input.value, editorState.lastPoint);
    input.value = "";
    if (editorState.me) editorMeasureAccept(p);
    else if (editorState.mv) editorMoveABAccept(p);
  } catch (e) { editorToast(e.message); }
}

// ---- dimensions ------------------------------------------------------------------------------------------------------
function editorToScreen(x, y) {
  var area = document.getElementById("renderArea"), v = new THREE.Vector3(x, y, 0).project(camera);
  return [(v.x + 1) / 2 * area.offsetWidth, (1 - v.y) / 2 * area.offsetHeight];
}

function editorAllLines() {
  var lines = [];
  objectsInScene.forEach(function(o) { o.children.forEach(function(c) { if (c.geometry && c.geometry.vertices && c.geometry.vertices.length) lines.push(c); }); });
  return lines;
}

function editorSvgLine(x1, y1, x2, y2, color, w) {
  return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="' + (w || 1.5) + '"/>';
}

function editorSvgText(x, y, t, color, size, rot) {
  return '<text x="' + x + '" y="' + y + '" fill="' + color + '" font-size="' + size + '" font-family="monospace" font-weight="bold" text-anchor="middle" paint-order="stroke" stroke="#000" stroke-width="3"' +
    (rot ? ' transform="rotate(-90 ' + x + " " + y + ')"' : "") + ">" + t + "</text>";
}

// width below the box, height left of it
function editorSizeDimSvg(box, color, gap, size) {
  var d = editorDimensions(box), out = "";
  var a = editorToScreen(d.width.from[0], d.width.from[1]), b = editorToScreen(d.width.to[0], d.width.to[1]);
  var c = editorToScreen(d.height.from[0], d.height.from[1]), e = editorToScreen(d.height.to[0], d.height.to[1]);
  out += editorSvgLine(a[0], a[1] + gap, b[0], b[1] + gap, color) + editorSvgLine(a[0], a[1] + 4, a[0], a[1] + gap + 5, color) + editorSvgLine(b[0], b[1] + 4, b[0], b[1] + gap + 5, color);
  out += editorSvgText((a[0] + b[0]) / 2, a[1] + gap + size + 4, d.width.text + " mm", color, size, false);
  out += editorSvgLine(c[0] - gap, c[1], e[0] - gap, e[1], color) + editorSvgLine(c[0] - 4, c[1], c[0] - gap - 5, c[1], color) + editorSvgLine(e[0] - 4, e[1], e[0] - gap - 5, e[1], color);
  out += editorSvgText(c[0] - gap - 8, (c[1] + e[1]) / 2, d.height.text + " mm", color, size, true);
  return out;
}

function editorDiaDimSvg(item, color, size, extra) {
  var a = editorToScreen(item.center[0] - item.r, item.center[1]), b = editorToScreen(item.center[0] + item.r, item.center[1]), m = editorToScreen(item.center[0], item.center[1]);
  return editorSvgLine(a[0], a[1], b[0], b[1], color) + editorSvgText(m[0], m[1] - 6, item.text + (extra || ""), color, size, false);
}

function editorMeasureSvg(me) {
  var color = "#35e0ff", out = "", a, b;
  if (me.type === "dist") {
    a = editorToScreen(me.a[0], me.a[1]); b = editorToScreen(me.b[0], me.b[1]);
    var info = editorDistanceInfo(me.a, me.b), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    out += editorSvgLine(a[0], a[1], b[0], b[1], color) + '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="3.5" fill="' + color + '"/><circle cx="' + b[0] + '" cy="' + b[1] + '" r="3.5" fill="' + color + '"/>';
    out += editorSvgText(mx, my - 8, editorFormat(info.dist) + " mm", color, 13, false);
    out += editorSvgText(mx, my + 8, "dX " + editorFormat(info.dx) + "  dY " + editorFormat(info.dy) + "  " + info.angle.toFixed(1) + "°", color, 11, false);
  } else if (me.type === "angle") {
    var v = editorToScreen(me.v[0], me.v[1]), p1 = editorToScreen(me.p1[0], me.p1[1]), p2 = editorToScreen(me.p2[0], me.p2[1]);
    out += editorSvgLine(v[0], v[1], p1[0], p1[1], color) + editorSvgLine(v[0], v[1], p2[0], p2[1], color);
    var a1 = Math.atan2(p1[1] - v[1], p1[0] - v[0]), a2 = Math.atan2(p2[1] - v[1], p2[0] - v[0]), da = a2 - a1;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    var pts = [], rad = 30;
    for (var i = 0; i <= 16; i++) { var t = a1 + da * i / 16; pts.push((v[0] + rad * Math.cos(t)).toFixed(1) + "," + (v[1] + rad * Math.sin(t)).toFixed(1)); }
    out += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + color + '" stroke-width="1.5"/>';
    var mid = a1 + da / 2;
    out += editorSvgText(v[0] + (rad + 24) * Math.cos(mid), v[1] + (rad + 24) * Math.sin(mid) + 4, me.deg.toFixed(1) + "°", color, 13, false);
  } else if (me.type === "dia") {
    out += editorDiaDimSvg(me, color, 13, "   R " + editorFormat(me.r));
  }
  return out;
}

function editorDrawDims() {
  var svg = document.getElementById("editorDims");
  if (!svg) return;
  var out = "", mode = editorState.dims;
  if (mode) {
    var lines = editorSelection();
    if (mode === 1) {
      var box = lines.length ? editorSelectionBox(lines) : editorAllBox();
      if (box && box.maxX - box.minX + box.maxY - box.minY > 0) out += editorSizeDimSvg(box, "#ffb000", 16, 13);
    } else {
      var src = (lines.length ? lines : editorAllLines()).slice(0, 300);          // a drawing with thousands of outlines would only be a mess
      editorAutoDimensions(src.map(editorLinePoints)).forEach(function(it) {
        out += it.type === "dia" ? editorDiaDimSvg(it, "#ffb000", 11, "") : editorSizeDimSvg(it.box, "#ffb000", 9, 11);
      });
    }
  }
  editorState.measures.forEach(function(me) { out += editorMeasureSvg(me); });
  if (!out) { svg.style.display = "none"; return; }
  svg.style.display = "block";
  svg.innerHTML = out;
}

var EDITOR_DIMS_CAPTIONS = ["Dimensions", "Overall size", "Every object"];

function editorToggleDims() {
  editorState.dims = editorNextDimsMode(editorState.dims);
  var b = document.getElementById("editorDimsButton");
  if (b) {
    b.classList.toggle("ed-on", editorState.dims > 0);
    var cap = b.querySelector(".caption"), t = EDITOR_DIMS_CAPTIONS[editorState.dims];
    if (cap && cap.getAttribute("data-en") !== t) { cap.setAttribute("data-en", t); cap.textContent = t; }
  }
  editorDrawDims();
}


function editorTogglePanel() {
  editorState.panelOn = !editorState.panelOn;
  var b = document.getElementById("editorPanelButton");
  if (b) b.classList.toggle("ed-on", editorState.panelOn);
  editorRefresh(true);
}

function editorTogglePlace() {
  try { localStorage.setItem("swarflyPlaceMouse", editorPlaceWithMouse() ? "0" : "1"); } catch (e) { /* storage blocked */ }
  editorShowPlaceButton();
}

function editorShowPlaceButton() {
  var cap = document.getElementById("editorPlaceCaption");
  if (cap) cap.textContent = editorPlaceWithMouse() ? "With mouse" : "At X0 Y0";
}

// ---- placement mode --------------------------------------------------------------------------------------------------
// Called by the shape creators once the new line is in the scene with its lower-left corner at X0 Y0.
function editorBeginPlacement(line) {
  editorEndPlacement(false);
  if (!editorPlaceWithMouse() || !line) return;
  var box = editorBox(editorLinePoints(line));
  editorState.placing = { line: line, w: box.maxX - box.minX, h: box.maxY - box.minY, baseX: box.minX, baseY: box.minY, undoTop: typeof undoStore !== "undefined" ? undoStore[0] : null };   // the snapshot taken when the shape was created
  editorStatusUpdate(null);
}

function editorMovePlacement(event) {
  var pl = editorState.placing;
  if (!pl) return;
  var wc = mouseToWorldCoord(event), ll = editorPlaceAtCursor(wc.x, wc.y, pl.w, pl.h);
  if (editorState.snap) {                  // any of the 9 reference points of the ghost may snap; the closest snap wins
    var sn = editorSnapMove({ minX: ll[0], minY: ll[1], maxX: ll[0] + pl.w, maxY: ll[1] + pl.h }, 0, 0, editorSnapPolylines([pl.line]), 10 * editorMmPerPixel(), editorSnapOpts());
    ll = [ll[0] + sn.dx, ll[1] + sn.dy];
    editorShowSnap(sn.point, sn.kind);
  }
  pl.line.position.x = ll[0] - pl.baseX;
  pl.line.position.y = ll[1] - pl.baseY;
  clearSceneFlag = true;
}

// keep = true: the shape stays where it is; false: only used to close a running placement before another starts
function editorEndPlacement() {
  var pl = editorState.placing;
  if (!pl) return;
  editorState.placing = null;
  editorShowSnap(null);
  if (typeof changePositionToGeoTranslate === "function") changePositionToGeoTranslate();
  clearSceneFlag = true;
  editorStatusUpdate(null);
}

function editorCancelPlacement() {
  var pl = editorState.placing;
  if (!pl) return;
  editorState.placing = null;
  editorShowSnap(null);
  var group = pl.line.parent;
  if (group) {
    group.remove(pl.line);
    if (!group.children.length) { var i = objectsInScene.indexOf(group); if (i >= 0) objectsInScene.splice(i, 1); }
  }
  if (typeof undoStore !== "undefined" && undoStore.length && undoStore[0] === pl.undoTop) undoStore.shift();   // a cancelled shape leaves no undo step
  if (typeof fillTree === "function") fillTree();
  clearSceneFlag = true;
  editorStatusUpdate(null);
}

function editorDropAtOrigin() {
  var pl = editorState.placing;
  if (!pl) return;
  pl.line.position.x = 0; pl.line.position.y = 0;
  editorEndPlacement();
}

// ---- status line -----------------------------------------------------------------------------------------------------
function editorStatusUpdate(event) {
  var el = document.getElementById("editorStatus");
  if (!el) return;
  if (event) editorState.cursor = mouseToWorldCoord(event);
  var c = editorState.cursor, pos = c ? "X " + editorFormat(c.x) + "  Y " + editorFormat(c.y) + "   |   " : "";
  var coords = document.getElementById("editorCoords"), prompt = document.getElementById("editorPrompt"), text = editorPrompt({ placing: !!editorState.placing, count: editorState.count, moveStep: editorState.mv ? editorState.mv.step : 0, pick: editorState.pickCount, measure: editorMeasureStep() });
  if (coords.textContent !== pos) coords.textContent = pos;
  if (prompt.getAttribute("data-en") !== text) { prompt.setAttribute("data-en", text); prompt.textContent = text; }   // rewritten only when it changes (the translator replaces the text)
}

// ---- start -----------------------------------------------------------------------------------------------------------
if (typeof document !== "undefined" && typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById("renderArea")) return;
    editorLoadSnapSettings();
    editorBuildPanel();
    editorShowPlaceButton();
    editorShowGridButton();
    var sb = document.getElementById("editorSnapButton");
    if (sb) sb.classList.toggle("ed-on", editorState.snap);
    var pb = document.getElementById("editorPanelButton");
    if (pb) pb.classList.add("ed-on");
    var area = document.getElementById("renderArea");

    area.addEventListener("mousemove", function(e) {
      if (editorState.placing) editorMovePlacement(e);
      if (editorState.mv) editorMoveABMove(e);
      if (editorState.me) editorMeasureMove(e);
      editorStatusUpdate(e);
    });

    // capture phase on the document: while a shape is being placed the first click / right click / Esc belongs to the placement
    document.addEventListener("mousedown", function(e) {
      if (editorState.me) {
        var onCanvas3 = e.target && e.target.tagName === "CANVAS" && area.contains(e.target);
        if (!onCanvas3) { if (!(e.target.closest && e.target.closest("#editorMeasureMenu, #editorCoordBox"))) editorMeasureEnd(); return; }
        e.preventDefault(); e.stopImmediatePropagation();
        if (e.button === 2) editorMeasureEnd();
        else if (e.button === 0) { var w = mouseToWorldCoord(e), sp = editorSnapPoint(w.x, w.y, []); editorMeasureAccept(sp ? sp.point : [w.x, w.y]); }
        return;
      }
      if (editorState.mv) {
        var onCanvas2 = e.target && e.target.tagName === "CANVAS" && area.contains(e.target);
        if (!onCanvas2) { if (!(e.target.closest && e.target.closest("#editorMoveButton"))) editorCancelMoveAB(); return; }
        e.preventDefault(); e.stopImmediatePropagation();
        if (e.button === 2) editorCancelMoveAB(); else if (e.button === 0) editorMoveABClick(e);
        return;
      }
      if (!editorState.placing) return;
      var onCanvas = e.target && e.target.tagName === "CANVAS" && area.contains(e.target);
      if (!onCanvas) { editorEndPlacement(); return; }          // a click elsewhere (ribbon ...) keeps the shape where it is
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.button === 2) editorCancelPlacement();
      else if (e.button === 0) { editorMovePlacement(e); editorEndPlacement(); }
    }, true);
    document.addEventListener("contextmenu", function(e) { if (editorState.placing || editorState.mv || editorState.me) e.preventDefault(); }, true);
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && editorState.me) { e.preventDefault(); e.stopImmediatePropagation(); editorMeasureEnd(); return; }
      if (e.key === "Escape" && editorState.mv) { e.preventDefault(); e.stopImmediatePropagation(); editorCancelMoveAB(); return; }
      if (e.key === "Escape" && editorState.placing) { e.preventDefault(); e.stopImmediatePropagation(); editorDropAtOrigin(); }
    }, true);

    document.addEventListener("mousemove", editorHandleMove);
    document.addEventListener("mouseup", editorHandleUp, true);   // capture: the handles stop the event from bubbling
    document.addEventListener("keydown", editorArrowKey, true);
    document.addEventListener("keydown", editorEscape);
    area.addEventListener("dblclick", editorDoubleClick);
    area.addEventListener("mouseleave", function() { editorState.pickCount = 0; });
    area.addEventListener("mousemove", function() { if (editorState.pick && Date.now() - editorState.pick.t > 2000) editorState.pickCount = 0; });

    setInterval(function() { editorRefresh(false); editorStatusUpdate(null); }, 150);
    setInterval(function() { editorDrawDims(); editorDrawHandles(); }, 100);
  });
}
