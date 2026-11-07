// Swarfly 1.17.0 - pure model of the keyboard shortcuts (node-testable, no DOM).
// An action has an id, a group (the same groups as the tool panel), a title and a description (English; js/lang/cs.json translates them) and
// default keys. A key is written as "Ctrl+Shift+Z" (modifiers in the order Ctrl, Alt, Shift, then the key). The user's own choices are a plain
// object { actionId: ["Key", ...] } kept in localStorage.swarflyShortcuts; an action that is not in it keeps its default keys.

var SHORTCUT_ACTIONS = [
  { id: "toolSelect", group: "Select", title: "Select", desc: "Mouse select mode: click or drag a window to select", keys: ["V"] },
  { id: "toolMove", group: "Select", title: "Move", desc: "Mouse move mode: drag a document", keys: ["M"] },
  { id: "toolErase", group: "Select", title: "Erase", desc: "Mouse erase mode: click a line to delete it", keys: ["E"] },
  { id: "toolTransform", group: "Select", title: "Transform", desc: "Scale, move and rotate window", keys: ["T"] },
  { id: "selectAll", group: "Select", title: "Select all", desc: "Select every object", keys: ["Ctrl+A"] },
  { id: "selectNone", group: "Select", title: "Select none", desc: "Clear the selection", keys: ["Ctrl+Shift+A"] },
  { id: "deleteSelected", group: "Select", title: "Delete selected", desc: "Delete the selected objects", keys: ["Delete", "Backspace"] },

  { id: "measureDist", group: "Sketch", title: "Measure distance", desc: "Distance between two points", keys: ["D"] },
  { id: "measureAngle", group: "Sketch", title: "Measure angle", desc: "Angle between three points", keys: [] },
  { id: "snap", group: "Sketch", title: "Snapping", desc: "Switch snapping to points and grid on or off", keys: ["S"] },
  { id: "dims", group: "Sketch", title: "Dimensions", desc: "Show the overall size of the selection", keys: [] },
  { id: "panel", group: "Sketch", title: "Properties panel", desc: "Show or hide the properties of the selection", keys: ["P"] },

  { id: "moveAB", group: "Edit", title: "Move A to B", desc: "Move the selection from one point to another", keys: ["Shift+M"] },
  { id: "trim", group: "Edit", title: "Trim", desc: "Remove the part of a line between two crossings", keys: ["X"] },
  { id: "split", group: "Edit", title: "Split", desc: "Cut a line or circle into two parts", keys: ["C"] },
  { id: "tangent", group: "Edit", title: "Tangent line", desc: "Tangent line to a circle or arc", keys: [] },
  { id: "arc", group: "Edit", title: "Tangent arc", desc: "Arc of a set radius between two lines", keys: [] },
  { id: "reach", group: "Edit", title: "To corner", desc: "Extend or trim two lines to their intersection", keys: [] },
  { id: "undo", group: "Edit", title: "Undo", desc: "Take back the last change", keys: ["Ctrl+Z"] },
  { id: "redo", group: "Edit", title: "Redo", desc: "Bring back the change that was taken back", keys: ["Ctrl+Shift+Z", "Ctrl+Y"] },

  { id: "zoomIn", group: "Camera", title: "Zoom in", desc: "Come closer", keys: ["+", "="] },
  { id: "zoomOut", group: "Camera", title: "Zoom out", desc: "Move away", keys: ["-"] },
  { id: "zoomWindow", group: "Camera", title: "Zoom to a window", desc: "Drag a rectangle, the view zooms to it", keys: ["W"] },
  { id: "rotateView", group: "Camera", title: "Rotate view", desc: "Left button drags rotate the view", keys: ["O"] },
  { id: "viewJob", group: "Camera", title: "Show the job", desc: "Fit the drawing in the view", keys: ["Home"] },
  { id: "viewMachine", group: "Camera", title: "Show the machine area", desc: "Fit the whole bed in the view", keys: ["Shift+Home"] },

  { id: "help", group: "Other", title: "Help", desc: "Open the help window", keys: ["F1"] }
];

var SHORTCUT_GROUPS = ["Select", "Sketch", "Edit", "Camera", "Other"];

// The key text of a keyboard event. "" for a lone modifier key. A printable symbol (+ - = ...) already says "Shift" by itself, so Shift is dropped for it.
function shortcutFromEvent(e) {
  var k = e.key;
  if (!k || k === "Control" || k === "Shift" || k === "Alt" || k === "Meta" || k === "AltGraph" || k === "Dead" || k === "Unidentified") return "";
  if (k === " ") k = "Space";
  else if (k.length === 1) k = k.toUpperCase();
  else if (k === "Esc") k = "Escape";
  var symbol = k.length === 1 && !/[A-Z0-9]/.test(k);
  var parts = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey && !symbol) parts.push("Shift");
  parts.push(k);
  return parts.join("+");
}

// Current keys of every action: the defaults, overridden by the user's object. Unknown ids and non-array values in it are ignored.
function shortcutBindings(custom) {
  var map = {};
  SHORTCUT_ACTIONS.forEach(function(a) {
    var c = custom && custom[a.id];
    map[a.id] = Array.isArray(c) ? c.filter(function(k) { return typeof k === "string" && k; }) : a.keys.slice();
  });
  return map;
}

// Which action does this key text trigger? null when none.
function shortcutFind(bindings, text) {
  if (!text) return null;
  for (var i = 0; i < SHORTCUT_ACTIONS.length; i++) {
    var id = SHORTCUT_ACTIONS[i].id;
    if ((bindings[id] || []).indexOf(text) >= 0) return id;
  }
  return null;
}

// The other action that already uses this key text (null when free).
function shortcutConflict(bindings, text, exceptId) {
  for (var i = 0; i < SHORTCUT_ACTIONS.length; i++) {
    var id = SHORTCUT_ACTIONS[i].id;
    if (id !== exceptId && (bindings[id] || []).indexOf(text) >= 0) return id;
  }
  return null;
}

// Keys that stay fixed for the editor (arrows move the selection, Escape ends a tool) cannot be given to an action.
function shortcutReserved(text) {
  return /^(Ctrl\+|Alt\+|Shift\+)*(Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Tab|Enter)$/.test(text);
}

// What to store: only the actions that differ from the defaults (so a later new default still reaches users who never changed that action).
function shortcutCustomOf(bindings) {
  var out = {};
  SHORTCUT_ACTIONS.forEach(function(a) {
    var cur = bindings[a.id] || [];
    if (cur.join("|") !== a.keys.join("|")) out[a.id] = cur;
  });
  return out;
}

// Short text for a tooltip, e.g. " (Ctrl+Z)"; "" when the action has no key.
function shortcutLabel(bindings, id) {
  var k = bindings[id] || [];
  return k.length ? " (" + k[0] + ")" : "";
}
