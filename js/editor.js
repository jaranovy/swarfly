// Swarfly editor (browser part). Maths lives in js/editor-model.js (unit-tested); this file is the DOM / three.js glue:
//  - properties panel for the selection (X/Y of a chosen reference point, width, height, ratio lock, rotation, shape parameters)
//  - placement mode: a new shape follows the mouse until you click (Esc = X0 Y0, right click = cancel)
//  - Dimensions button: overall width / height of the selection drawn on the part
//  - status line: prompt + cursor coordinates
// Uses globals of the OpenBuilds code: getSelectedObjects, objectsInScene, storeUndo, undoStore, changePositionToGeoTranslate,
// fillTree, mouseToWorldCoord, camera, clearSceneFlag, hoverShapesinScene, THREE.

var editorState = { placing: null, dims: false, lock: true, ref: "ll", panelOn: true, sig: "", paramsFor: null, count: 0 };

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
function editorTransform(lines, fn, kind) {
  if (!lines.length) return;
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

function editorToast(msg) {
  if (typeof Metro !== "undefined" && Metro.toast) Metro.toast.create(msg, null, 4000, "bg-red"); else console.warn(msg);
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
    '<hr><div class="ep-row"><button type="button" id="epMirrorX" style="flex:1" title="Flip left-right about the centre of the selection">Mirror left-right</button><button type="button" id="epMirrorY" style="flex:1" title="Flip up-down about the centre of the selection">Mirror up-down</button></div>' +
    '<div class="ep-row"><button type="button" id="epToZero" style="flex:1" title="Move the selection so its lower-left corner is at X0 Y0">Move to X0 Y0</button></div><hr>' +
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
  document.getElementById("epMirrorX").addEventListener("click", function() { editorMirror("x"); });
  document.getElementById("epMirrorY").addEventListener("click", function() { editorMirror("y"); });
  document.getElementById("epToZero").addEventListener("click", editorToZero);
  document.getElementById("epCopyLinear").addEventListener("click", editorCopyLinear);
  document.getElementById("epCopyPolar").addEventListener("click", editorCopyPolar);
  p.addEventListener("keydown", function(e) { e.stopPropagation(); });   // Delete / Backspace in a field must not delete objects

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
  if (!box || !editorState.panelOn) { panel.style.display = "none"; editorState.sig = ""; return; }
  var sig = lines.map(function(l) { return l.uuid; }).join() + [box.minX, box.minY, box.maxX, box.maxY].map(function(v) { return v.toFixed(4); }).join() + editorState.ref;
  if (sig === editorState.sig && !force) return;
  editorState.sig = sig;
  panel.style.display = "block";
  document.getElementById("epTitle").textContent = lines.length === 1 ? "Properties" : "Properties - " + lines.length + " objects";
  var ref = editorRefPoint(box, editorState.ref), s = editorSize(box);
  document.getElementById("epX").value = editorFormat(ref[0]);
  document.getElementById("epY").value = editorFormat(ref[1]);
  document.getElementById("epW").value = editorFormat(s.w);
  document.getElementById("epH").value = editorFormat(s.h);
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
  var lines = editorState.placing ? [] : editorSelection();
  var box = lines.length ? editorSelectionBox(lines) : null;
  if (!box || (box.maxX - box.minX <= 0 && box.maxY - box.minY <= 0)) { hs.style.display = "none"; return; }
  hs.style.display = "block";
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
  if (!box) return;
  storeUndo(true);
  editorDrag = {
    handle: handle, lines: lines, box: box, changed: false,
    snap: lines.map(function(l) { return l.geometry.vertices.map(function(v) { return [v.x, v.y]; }); })
  };
}

function editorHandleMove(e) {
  if (!editorDrag) return;
  var d = editorDrag, w = mouseToWorldCoord(e), r = editorHandleFactors(d.box, d.handle, w.x, w.y, e.shiftKey);
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

// ---- dimensions ------------------------------------------------------------------------------------------------------
function editorToScreen(x, y) {
  var area = document.getElementById("renderArea"), v = new THREE.Vector3(x, y, 0).project(camera);
  return [(v.x + 1) / 2 * area.offsetWidth, (1 - v.y) / 2 * area.offsetHeight];
}

function editorDrawDims() {
  var svg = document.getElementById("editorDims");
  if (!svg) return;
  if (!editorState.dims) { svg.style.display = "none"; return; }
  var lines = editorSelection(), box = lines.length ? editorSelectionBox(lines) : editorAllBox();
  if (!box || box.maxX - box.minX + box.maxY - box.minY <= 0) { svg.style.display = "none"; return; }
  svg.style.display = "block";
  var d = editorDimensions(box), ns = "http://www.w3.org/2000/svg", out = "";
  var color = "#ffb000", gap = 16;
  var a = editorToScreen(d.width.from[0], d.width.from[1]), b = editorToScreen(d.width.to[0], d.width.to[1]);
  var c = editorToScreen(d.height.from[0], d.height.from[1]), e = editorToScreen(d.height.to[0], d.height.to[1]);
  function line(x1, y1, x2, y2) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="1.5"/>'; }
  function label(x, y, t, rot) {
    return '<text x="' + x + '" y="' + y + '" fill="' + color + '" font-size="13" font-family="monospace" font-weight="bold" text-anchor="middle" paint-order="stroke" stroke="#000" stroke-width="3"' +
      (rot ? ' transform="rotate(-90 ' + x + " " + y + ')"' : "") + ">" + t + " mm</text>";
  }
  // width: below the box
  out += line(a[0], a[1] + gap, b[0], b[1] + gap) + line(a[0], a[1] + 4, a[0], a[1] + gap + 5) + line(b[0], b[1] + 4, b[0], b[1] + gap + 5);
  out += label((a[0] + b[0]) / 2, a[1] + gap + 17, d.width.text, false);
  // height: left of the box
  out += line(c[0] - gap, c[1], e[0] - gap, e[1]) + line(c[0] - 4, c[1], c[0] - gap - 5, c[1]) + line(e[0] - 4, e[1], e[0] - gap - 5, e[1]);
  out += label(c[0] - gap - 8, (c[1] + e[1]) / 2, d.height.text, true);
  svg.innerHTML = out;
}

function editorToggleDims() {
  editorState.dims = !editorState.dims;
  var b = document.getElementById("editorDimsButton");
  if (b) b.classList.toggle("ed-on", editorState.dims);
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
  pl.line.position.x = ll[0] - pl.baseX;
  pl.line.position.y = ll[1] - pl.baseY;
  clearSceneFlag = true;
}

// keep = true: the shape stays where it is; false: only used to close a running placement before another starts
function editorEndPlacement() {
  var pl = editorState.placing;
  if (!pl) return;
  editorState.placing = null;
  if (typeof changePositionToGeoTranslate === "function") changePositionToGeoTranslate();
  clearSceneFlag = true;
  editorStatusUpdate(null);
}

function editorCancelPlacement() {
  var pl = editorState.placing;
  if (!pl) return;
  editorState.placing = null;
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
  var coords = document.getElementById("editorCoords"), prompt = document.getElementById("editorPrompt"), text = editorPrompt({ placing: !!editorState.placing, count: editorState.count });
  if (coords.textContent !== pos) coords.textContent = pos;
  if (prompt.getAttribute("data-en") !== text) { prompt.setAttribute("data-en", text); prompt.textContent = text; }   // rewritten only when it changes (the translator replaces the text)
}

// ---- start -----------------------------------------------------------------------------------------------------------
if (typeof document !== "undefined" && typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById("renderArea")) return;
    editorBuildPanel();
    editorShowPlaceButton();
    var pb = document.getElementById("editorPanelButton");
    if (pb) pb.classList.add("ed-on");
    var area = document.getElementById("renderArea");

    area.addEventListener("mousemove", function(e) {
      if (editorState.placing) editorMovePlacement(e);
      editorStatusUpdate(e);
    });

    // capture phase on the document: while a shape is being placed the first click / right click / Esc belongs to the placement
    document.addEventListener("mousedown", function(e) {
      if (!editorState.placing) return;
      var onCanvas = e.target && e.target.tagName === "CANVAS" && area.contains(e.target);
      if (!onCanvas) { editorEndPlacement(); return; }          // a click elsewhere (ribbon ...) keeps the shape where it is
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.button === 2) editorCancelPlacement();
      else if (e.button === 0) { editorMovePlacement(e); editorEndPlacement(); }
    }, true);
    document.addEventListener("contextmenu", function(e) { if (editorState.placing) e.preventDefault(); }, true);
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && editorState.placing) { e.preventDefault(); e.stopImmediatePropagation(); editorDropAtOrigin(); }
    }, true);

    document.addEventListener("mousemove", editorHandleMove);
    document.addEventListener("mouseup", editorHandleUp, true);   // capture: the handles stop the event from bubbling
    document.addEventListener("keydown", editorArrowKey, true);

    setInterval(function() { editorRefresh(false); editorStatusUpdate(null); }, 150);
    setInterval(function() { editorDrawDims(); editorDrawHandles(); }, 100);
  });
}
