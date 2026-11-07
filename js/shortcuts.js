// Swarfly 1.17.0 - keyboard shortcuts: one key handler for every configurable action, and the Settings window to change the keys.
// The table of actions and the key maths are in js/shortcuts-model.js. Keys that stay fixed: arrows and Escape (editor), Enter, Tab.

var shortcutState = { custom: {}, bindings: null, capture: null };

function shortcutLoad() {
  try { shortcutState.custom = JSON.parse(localStorage.getItem("swarflyShortcuts") || "{}") || {}; } catch (e) { shortcutState.custom = {}; }
  shortcutState.bindings = shortcutBindings(shortcutState.custom);
}

function shortcutSave() {
  shortcutState.custom = shortcutCustomOf(shortcutState.bindings);
  try { localStorage.setItem("swarflyShortcuts", JSON.stringify(shortcutState.custom)); } catch (e) {}
  shortcutApplyTooltips();
}

// what each action does (DOM side); an action that needs a missing function is skipped
var SHORTCUT_RUN = {
  toolSelect: function() { mouseSelectMode(); },
  toolMove: function() { mouseMoveMode(); },
  toolErase: function() { mouseEraseMode(); },
  toolTransform: function() { mouseScaleMode(); },
  selectAll: function() { if (mouseState != "scale") $("#selectAll").click(); },
  selectNone: function() { if (mouseState != "scale") $("#selectNone").click(); },
  deleteSelected: function() { if (mouseState != "scale") { storeUndo(true); deleteSelectedObjects(); } },
  measureDist: function() { editorStartMeasure("dist"); },
  measureAngle: function() { editorStartMeasure("angle"); },
  snap: function() { editorToggleSnap(); },
  dims: function() { editorToggleDims(); },
  panel: function() { editorTogglePanel(); },
  moveAB: function() { editorStartMoveAB(); },
  trim: function() { editorStartCut("trim"); },
  split: function() { editorStartCut("split"); },
  tangent: function() { editorStartCut("tangent"); },
  arc: function() { editorStartCut("arc"); },
  reach: function() { editorStartCut("reach"); },
  undo: function() { undo(); },
  redo: function() { redo(); },
  zoomIn: function() { viewZoomIn(); },
  zoomOut: function() { viewZoomOut(); },
  zoomWindow: function() { viewSetMode("window"); },
  rotateView: function() { viewSetMode("orbit"); },
  viewJob: function() { resetView(); },
  viewMachine: function() { resetView(scene.getObjectByName("Grid")); },
  help: function() { openHelp(); }
};

function shortcutTypingTarget(t) {
  var n = t && t.nodeName ? t.nodeName.toLowerCase() : "";
  if (t && t.isContentEditable) return true;
  if (n === "select" || n === "textarea") return true;
  if (n === "input") return !(t.readOnly || t.getAttribute("readonly") || t.getAttribute("type") === "checkbox");
  return false;
}

function shortcutKeydown(e) {
  if (shortcutState.capture) return;            // the Settings window is waiting for a new key
  var text = shortcutFromEvent(e);
  if (!text) return;
  var id = shortcutFind(shortcutState.bindings, text);
  if (!id || !SHORTCUT_RUN[id]) return;
  if (shortcutTypingTarget(e.target) && !/^F\d+$/.test(text)) return;   // typing into a field: only F-keys (F1 = help) still work
  e.preventDefault();
  e.stopImmediatePropagation();
  try { SHORTCUT_RUN[id](); } catch (err) { console.warn("shortcut " + id + ": " + err.message); }
}

// the tool panel buttons carry data-shortcut="<action id>": their tooltip gets the current key
function shortcutApplyTooltips() {
  var els = document.querySelectorAll("[data-shortcut]");
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (!el.hasAttribute("data-title")) el.setAttribute("data-title", el.getAttribute("title") || "");
    el.setAttribute("title", el.getAttribute("data-title") + shortcutLabel(shortcutState.bindings, el.getAttribute("data-shortcut")));
  }
}

// ---- Settings window ----

function shortcutEsc(s) { return String(s).replace(/[&<>"]/g, function(c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

function shortcutTitleOf(id) {
  for (var i = 0; i < SHORTCUT_ACTIONS.length; i++) if (SHORTCUT_ACTIONS[i].id === id) return SHORTCUT_ACTIONS[i].title;
  return id;
}

function shortcutRender() {
  var box = document.getElementById("shortcutRows");
  if (!box) return;
  var html = "";
  SHORTCUT_GROUPS.forEach(function(g) {
    html += '<tr class="sc-group"><th colspan="4">' + shortcutEsc(g) + "</th></tr>";
    SHORTCUT_ACTIONS.filter(function(a) { return a.group === g; }).forEach(function(a) {
      var keys = shortcutState.bindings[a.id];
      var waiting = shortcutState.capture === a.id;
      var chips = waiting ? "<i>Press a key...</i>" : (keys.length ? keys.map(function(k) { return "<kbd>" + shortcutEsc(k) + "</kbd>"; }).join(" ") : "<i>none</i>");
      html += '<tr><td class="sc-title">' + shortcutEsc(a.title) + '</td><td class="sc-desc">' + shortcutEsc(a.desc) + '</td><td class="sc-keys">' + chips + "</td>" +
        '<td class="sc-btn"><button type="button" data-sc-change="' + a.id + '" title="Change the key">' + (waiting ? "Cancel" : "Change") + "</button>" +
        '<button type="button" data-sc-clear="' + a.id + '" title="Remove the key">Clear</button></td></tr>';
    });
  });
  box.innerHTML = html;
}

function shortcutMessage(text) {
  var m = document.getElementById("shortcutMsg");
  if (m) m.textContent = text || "";
}

function shortcutOpen() {
  var w = document.getElementById("shortcutWindow");
  if (!w) return;
  shortcutState.capture = null;
  shortcutMessage("");
  shortcutRender();
  w.style.display = "flex";
}

function shortcutClose() {
  var w = document.getElementById("shortcutWindow");
  shortcutState.capture = null;
  if (w) w.style.display = "none";
}

function shortcutCaptureKey(e) {
  var id = shortcutState.capture;
  if (!id) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  var text = shortcutFromEvent(e);
  if (!text) return;                                   // a lone modifier: wait for the real key
  if (text === "Escape") { shortcutState.capture = null; shortcutMessage(""); shortcutRender(); return; }
  if (shortcutReserved(text)) { shortcutMessage(text + " is reserved (arrows, Escape, Enter, Tab). Press another key."); return; }
  var other = shortcutConflict(shortcutState.bindings, text, id);
  if (other) { shortcutMessage(text + " is already used by: " + shortcutTitleOf(other) + ". Clear that one first or press another key."); return; }
  shortcutState.bindings[id] = [text];
  shortcutState.capture = null;
  shortcutMessage("");
  shortcutSave();
  shortcutRender();
}

function shortcutResetAll() {
  shortcutState.bindings = shortcutBindings(null);
  shortcutState.capture = null;
  shortcutMessage("");
  shortcutSave();
  shortcutRender();
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  shortcutLoad();
  document.addEventListener("keydown", shortcutCaptureKey, true);
  document.addEventListener("keydown", shortcutKeydown, true);
  document.addEventListener("DOMContentLoaded", function() {
    var w = document.createElement("div");
    w.id = "shortcutWindow";
    w.innerHTML = '<div class="sc-bar"><i class="fas fa-fw fa-keyboard"></i><b>Keyboard shortcuts</b><button type="button" id="shortcutCloseBtn" title="Close">&times;</button></div>' +
      '<div class="sc-note">Click Change, then press the new key (with Ctrl, Alt or Shift if you like). Plain letter keys work when you are not typing into a field.</div>' +
      '<div class="sc-body"><table><tbody id="shortcutRows"></tbody></table></div>' +
      '<div class="sc-foot"><span id="shortcutMsg"></span><button type="button" id="shortcutResetBtn">Restore defaults</button></div>';
    document.body.appendChild(w);
    w.addEventListener("click", function(e) {
      var t = e.target.closest ? e.target.closest("button") : null;
      if (!t) return;
      if (t.id === "shortcutCloseBtn") { shortcutClose(); return; }
      if (t.id === "shortcutResetBtn") { shortcutResetAll(); return; }
      if (t.hasAttribute("data-sc-change")) {
        var id = t.getAttribute("data-sc-change");
        shortcutState.capture = shortcutState.capture === id ? null : id;
        shortcutMessage("");
        shortcutRender();
      } else if (t.hasAttribute("data-sc-clear")) {
        shortcutState.bindings[t.getAttribute("data-sc-clear")] = [];
        shortcutState.capture = null;
        shortcutSave();
        shortcutRender();
      }
    });
    shortcutApplyTooltips();
  });
}
