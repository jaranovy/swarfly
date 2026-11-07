// Swarfly 1.18.0 - left tool panel. The drawing tools (select, create, sketch, edit, camera) live in a panel on the left of the drawing and the
// ribbon at the top keeps file, project, settings and help. Instead of copying the buttons, the existing ribbon buttons are MOVED into the panel
// (so they keep their id, their onclick and the active state the editor paints on them) and moved back when the old layout is chosen.
// What goes where: js/tool-panel-model.js. The choice is in localStorage.swarflyLayout ("tools" or "ribbon").

var toolPanelState = { applied: false, moved: [], panel: null };

function toolPanelHideEmptyGroups(hide) {
  var groups = document.querySelectorAll('nav[data-role="ribbonmenu"] .group');
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    if (!hide) { if (g.getAttribute("data-tp-hidden")) { g.style.display = ""; g.removeAttribute("data-tp-hidden"); } continue; }
    if (!g.querySelector("button, input, .btn-file, .ribbon-button, .tbtn") && g.style.display !== "none") {
      g.style.display = "none";
      g.setAttribute("data-tp-hidden", "1");
    }
  }
}

function toolPanelBuild() {
  var side = document.querySelector(".sidemenu");
  if (!side || toolPanelState.applied) return;
  var panel = document.createElement("div");
  panel.id = "toolPanel";
  TOOL_PANEL_GROUPS.forEach(function(g) {
    var box = document.createElement("div");
    box.className = "tp-group";
    var head = document.createElement("div");
    head.className = "tp-title";
    head.textContent = g.title;
    head.addEventListener("click", function() { box.classList.toggle("tp-collapsed"); });
    var grid = document.createElement("div");
    grid.className = "tp-grid";
    g.items.forEach(function(it) {
      var node = document.querySelector(it.sel);
      if (!node) return;
      var marker = document.createComment("tool-panel");
      node.parentNode.replaceChild(marker, node);
      toolPanelState.moved.push({ node: node, marker: marker });
      grid.appendChild(node);
      var btn = node.matches && node.matches("button, .tbtn") ? node : node.querySelector("button");
      if (btn) {
        if (!btn.getAttribute("title")) { var c = btn.querySelector(".caption"); if (c) btn.setAttribute("title", c.textContent.trim().replace(/\s+/g, " ")); }
        if (it.action) btn.setAttribute("data-shortcut", it.action);
      }
    });
    box.appendChild(head);
    box.appendChild(grid);
    panel.appendChild(box);
  });
  side.appendChild(panel);
  toolPanelState.panel = panel;
  toolPanelState.applied = true;
  document.body.classList.add("sw-tools");
  toolPanelHideEmptyGroups(true);
  if (typeof shortcutApplyTooltips === "function") shortcutApplyTooltips();
}

function toolPanelRestore() {
  if (!toolPanelState.applied) return;
  toolPanelState.moved.forEach(function(m) { if (m.marker.parentNode) m.marker.parentNode.replaceChild(m.node, m.marker); });
  toolPanelState.moved = [];
  if (toolPanelState.panel && toolPanelState.panel.parentNode) toolPanelState.panel.parentNode.removeChild(toolPanelState.panel);
  toolPanelState.panel = null;
  toolPanelState.applied = false;
  document.body.classList.remove("sw-tools");
  toolPanelHideEmptyGroups(false);
}

function toolPanelApply(layout) {
  if (toolPanelLayout(layout) === "tools") toolPanelBuild(); else toolPanelRestore();
  var b = document.getElementById("layoutButton");
  if (b) b.classList.toggle("active", toolPanelState.applied);
}

function swarflyToggleLayout() {
  var cur = "tools";
  try { cur = toolPanelLayout(localStorage.getItem("swarflyLayout")); } catch (e) {}
  var next = toolPanelNextLayout(cur);
  try { localStorage.setItem("swarflyLayout", next); } catch (e) {}
  toolPanelApply(next);
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", function() {
    var saved = null;
    try { saved = localStorage.getItem("swarflyLayout"); } catch (e) {}
    toolPanelApply(saved);
  });
}
