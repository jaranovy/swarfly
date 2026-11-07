// Swarfly 1.18.0 - pure description of the left tool panel (node-testable, no DOM).
// Each group lists the existing buttons (found by CSS selector, so they keep their id and onclick) and the keyboard action whose key goes into the tooltip.
// Group names are the same as the groups of the keyboard shortcuts.

var TOOL_PANEL_GROUPS = [
  { title: "Select", items: [
    { sel: ".mouseSelectBtn", action: "toolSelect" }, { sel: ".mouseMoveBtn", action: "toolMove" },
    { sel: ".mouseDelBtn", action: "toolErase" }, { sel: ".mouseScaleBtn", action: "toolTransform" } ] },
  { title: "Create", items: [
    { sel: "#textButton", action: null }, { sel: "#shapesMenu", action: null } ] },
  { title: "Sketch", items: [
    { sel: "#editorMeasureMenu", action: "measureDist" }, { sel: "#editorSnapButton", action: "snap" },
    { sel: "#editorDimsButton", action: "dims" }, { sel: "#editorPanelButton", action: "panel" } ] },
  { title: "Edit", items: [
    { sel: "#editorMoveButton", action: "moveAB" }, { sel: "#editorTrimButton", action: "trim" }, { sel: "#editorSplitButton", action: "split" },
    { sel: "#editorTangentButton", action: "tangent" }, { sel: "#editorArcButton", action: "arc" }, { sel: "#editorReachButton", action: "reach" },
    { sel: "#undoButton", action: "undo" }, { sel: "#redoButton", action: "redo" } ] },
  { title: "Camera", items: [
    { sel: "#viewZoomInButton", action: "zoomIn" }, { sel: "#viewZoomOutButton", action: "zoomOut" },
    { sel: "#viewWindowButton", action: "zoomWindow" }, { sel: "#viewRotateButton", action: "rotateView" },
    { sel: "#viewJobButton", action: "viewJob" }, { sel: "#viewMachineButton", action: "viewMachine" } ] }
];

// Saved layout: "ribbon" (everything in the ribbon, the old look) or "tools" (the tool panel on the left, the new default).
function toolPanelLayout(saved) {
  return saved === "ribbon" ? "ribbon" : "tools";
}

function toolPanelNextLayout(current) {
  return toolPanelLayout(current) === "tools" ? "ribbon" : "tools";
}
