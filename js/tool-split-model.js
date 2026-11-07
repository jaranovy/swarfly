// Pure helpers for "one G-code file per tool" (release 1.11.0, node-testable, no DOM).
// The offline controller cannot change a bit by itself, so the program is split where the tool changes: the operator changes the bit
// and touches off Z between the files. GRBL has no tool length offset, so a pause alone would not be enough.

var TOOL_KINDS = { Drill: { kind: "drill", letter: "d", name: "Drill" }, CNC: { kind: "mill", letter: "m", name: "Mill" }, Laser: { kind: "laser", letter: "l", name: "Laser" },
  Plasma: { kind: "plasma", letter: "p", name: "Plasma" }, Drag: { kind: "drag", letter: "k", name: "Drag knife" }, Pen: { kind: "pen", letter: "n", name: "Pen" } };

function toolFormatDia(dia) {
  var d = Math.round(Number(dia) * 1000) / 1000;
  return isFinite(d) && d > 0 ? String(d) : "";
}

// One toolpath -> the tool it needs: {key, label, letter}. Cutters (drill, mill, pen, ...) differ by diameter, a laser is one tool.
function toolOf(operation, dia) {
  var first = String(operation || "").split(/[:\s]/)[0];
  var kind = TOOL_KINDS[first] || { kind: "other", letter: "o", name: first || "Other" };
  var d = kind.kind === "laser" ? "" : toolFormatDia(dia);
  return { key: kind.kind + (d ? ":" + d : ""), label: kind.name + (d ? " " + d + " mm" : ""), letter: kind.letter };
}

// items: [{index, operation, toolDia}] in program order -> groups [{key, label, letter, indexes}] in order of first appearance.
function toolGroups(items) {
  var groups = [], byKey = {};
  items.forEach(function(it) {
    var t = toolOf(it.operation, it.toolDia);
    if (!byKey[t.key]) { byKey[t.key] = { key: t.key, label: t.label, letter: t.letter, indexes: [] }; groups.push(byKey[t.key]); }
    byKey[t.key].indexes.push(it.index);
  });
  return groups;
}

// File names in the 8.3 style the controller reads: up to 4 characters of the project name, "_", number, tool letter ("plat_01d.nc").
function toolFileNames(baseName, groups) {
  var base = String(baseName || "program").replace(/\.[^.]*$/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "").toLowerCase().slice(0, 4) || "prog";
  return groups.map(function(g, i) { return base + "_" + (i < 9 ? "0" : "") + (i + 1) + g.letter + ".nc"; });
}
