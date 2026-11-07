// Swarfly 1.15.0 - camera control without wheel / middle button: Zoom + / -, Rotate and Zoom-window tools, Shift = rotate, Ctrl+Shift = zoom.
// The maths is in view-model.js. OrbitControls still does the real orbiting (we only tell it which button means orbit).
var viewState = { mode: null, drag: null };

function viewGestureOf(e) { return viewGesture(viewState.mode, e.shiftKey, e.altKey, e.ctrlKey); }

function viewRenderEl() { return document.getElementById("renderArea"); }

function viewZoomBy(factor) {
  var d = camera.position.clone().sub(controls.target).multiplyScalar(factor);
  if (d.length() > controls.maxDistance) d.setLength(controls.maxDistance);
  camera.position.copy(controls.target).add(d);
  controls.update();
}

function viewZoomIn() { viewZoomBy(viewStepFactor(true)); }
function viewZoomOut() { viewZoomBy(viewStepFactor(false)); }

function viewSetMode(mode) {
  viewState.mode = viewState.mode === mode ? null : mode;
  var ids = { orbit: "viewRotateButton", window: "viewWindowButton" };
  Object.keys(ids).forEach(function(m) {
    var b = document.getElementById(ids[m]);
    if (b) b.classList.toggle("active", viewState.mode === m);
  });
  var a = viewRenderEl();
  if (a) a.style.cursor = viewState.mode === "window" ? "crosshair" : viewState.mode === "orbit" ? "move" : "";
  if (viewState.mode && typeof editorEndCut === "function" && editorState.cut) editorEndCut();
}

function viewWindowRect() {
  var r = document.getElementById("viewWindowRect");
  if (!r) {
    r = document.createElement("div");
    r.id = "viewWindowRect";
    r.style.cssText = "position:absolute;border:2px dashed #0b9bff;background:rgba(11,155,255,.12);pointer-events:none;display:none;z-index:50";
    viewRenderEl().appendChild(r);
  }
  return r;
}

function viewApplyWindow(rect) {
  var el = viewRenderEl(), plan = viewWindowPlan(rect, el.offsetWidth, el.offsetHeight);
  if (!plan) return;
  // move the view so that the window centre is in the middle: shift camera and target on the plane through the target
  var box = el.getBoundingClientRect();
  var c = mouseToWorldCoord({ clientX: box.left + plan.cx * el.offsetWidth, clientY: box.top + plan.cy * el.offsetHeight });
  var shift = new THREE.Vector3(c.x - controls.target.x, c.y - controls.target.y, 0);
  camera.position.add(shift);
  controls.target.add(shift);
  viewZoomBy(Math.max(plan.factor, 0.001));
}

(function viewInstall() {
  function onCanvas(e) { var a = viewRenderEl(); return e.target && e.target.tagName === "CANVAS" && a && a.contains(e.target); }
  window.addEventListener("mousedown", function(e) {
    if (e.button !== 0 || !onCanvas(e)) return;
    var g = viewGestureOf(e);
    if (g === "orbit") { controls.mouseButtons.ORBIT = THREE.MOUSE.LEFT; return; }     // OrbitControls takes it from here
    if (g !== "zoom" && g !== "window") return;
    e.preventDefault(); e.stopImmediatePropagation();
    var box = viewRenderEl().getBoundingClientRect();
    viewState.drag = { g: g, x0: e.clientX - box.left, y0: e.clientY - box.top, x1: e.clientX - box.left, y1: e.clientY - box.top, lastY: e.clientY };
  }, true);
  window.addEventListener("mousemove", function(e) {
    var d = viewState.drag;
    if (!d) return;
    e.stopImmediatePropagation();
    var box = viewRenderEl().getBoundingClientRect();
    d.x1 = e.clientX - box.left; d.y1 = e.clientY - box.top;
    if (d.g === "zoom") { viewZoomBy(viewDragFactor(e.clientY - d.lastY)); d.lastY = e.clientY; return; }
    var r = viewWindowRect();
    r.style.display = "block";
    r.style.left = Math.min(d.x0, d.x1) + "px"; r.style.top = Math.min(d.y0, d.y1) + "px";
    r.style.width = Math.abs(d.x1 - d.x0) + "px"; r.style.height = Math.abs(d.y1 - d.y0) + "px";
  }, true);
  window.addEventListener("mouseup", function(e) {
    var d = viewState.drag;
    if (!d) return;
    viewState.drag = null;
    e.stopImmediatePropagation();
    viewWindowRect().style.display = "none";
    if (d.g === "window") { viewApplyWindow({ x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 }); viewSetMode("window"); }   // one window, then the tool ends
  }, true);
  window.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && (viewState.mode || viewState.drag)) {
      viewState.drag = null;
      var r = document.getElementById("viewWindowRect"); if (r) r.style.display = "none";
      if (viewState.mode) viewSetMode(viewState.mode);
    }
  }, true);
})();
