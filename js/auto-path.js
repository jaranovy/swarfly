// "Suggest toolpaths" (release 1.20.0): looks at the selected lines (or the whole drawing) and creates the toolpaths for them in the right order:
// drills, holes, engraving, cut-out last. Maths in auto-path-model.js. The toolpaths are only pre-filled (operation, tool, depth, the rest from the
// last used operation) - open each one in the Toolpaths list, check it and press Generate.

function autoShapes(lines) {
  return lines.map(function(l) {
    var pts = editorLinePoints(l), n = pts.length;
    var closed = n > 2 && Math.hypot(pts[0][0] - pts[n - 1][0], pts[0][1] - pts[n - 1][1]) < 0.1;
    return { pts: pts, closed: closed };
  });
}

function autoLastOperation() {
  try { return JSON.parse(localStorage.getItem("lastCamOperation")) || {}; } catch (e) { return {}; }
}

function autoStored() {
  try { return localStorage.getItem("swarflyAutoPath"); } catch (e) { return null; }
}

function autoToolpaths() {
  var lines = editorSelection();
  var whole = !lines.length;
  if (whole) lines = editorAllLines();
  if (!lines.length) { editorToast("Draw or import something first"); return; }
  var last = autoLastOperation();
  var saved = autoSettings(autoStored(), last.camToolDia);
  var content =
    '<div id="autoBox"><div style="margin-bottom:8px">' + lines.length + (whole ? ' lines in the drawing' : ' selected lines') + '</div>' +
    '<table style="width:100%;font-size:13px">' +
    '<tr><td style="width:55%">Material thickness (mm)</td><td><input type="number" id="autoThick" min="0.1" step="any" value="' + saved.thickness + '" style="width:90px"></td></tr>' +
    '<tr><td>Cutter diameter (mm)</td><td><input type="number" id="autoTool" min="0.1" step="any" value="' + saved.toolDia + '" style="width:90px"></td></tr>' +
    '<tr><td>Engraving depth for open lines (mm)</td><td><input type="number" id="autoEngrave" min="0.05" step="any" value="' + saved.engraveDepth + '" style="width:90px"></td></tr>' +
    '</table><div id="autoInfo" style="margin-top:8px;font-size:12px;color:#777"></div></div>';
  var refresh = function() {
    var el = document.getElementById("autoInfo");
    if (!el) return;
    var plan = autoPlan(autoShapes(lines), autoOptions());
    el.innerHTML = plan.map(function(g) { return g.name + ": " + g.indexes.length + " (" + g.zDepth + " mm deep)"; }).join("<br>");
  };
  Metro.dialog.create({
    title: "Suggest toolpaths",
    content: content,
    actions: [
      { caption: "<span class='fas fa-check fa-fw'></span> Create toolpaths", cls: "js-dialog-close primary", onclick: function() { autoCreate(lines); } },
      { caption: "Cancel", cls: "js-dialog-close" }
    ]
  });
  ["autoThick", "autoTool", "autoEngrave"].forEach(function(id) {
    var el = document.getElementById(id);
    el.addEventListener("input", refresh);
    el.addEventListener("change", refresh);
  });
  refresh();
}

function autoOptions() {
  var v = function(id) { var e = document.getElementById(id); return e ? Number(e.value) : NaN; };
  return { thickness: v("autoThick"), toolDia: v("autoTool"), engraveDepth: v("autoEngrave") };
}

// Builds the toolpath groups the same way addJob(-1) does (clones of the lines, "closed" flag, position of the document).
function autoCreate(lines) {
  var opts = autoOptions();
  var plan = autoPlan(autoShapes(lines), opts);
  if (!plan.length) return;
  try { localStorage.setItem("swarflyAutoPath", JSON.stringify({ thickness: opts.thickness, toolDia: opts.toolDia, engraveDepth: opts.engraveDepth })); } catch (e) { /* storage blocked */ }  var last = autoLastOperation();
  storeUndo(true);
  var firstNew = toolpathsInScene.length;
  plan.forEach(function(g) {
    var toolpath = new THREE.Group();
    g.indexes.forEach(function(i) {
      var line = lines[i], copy = line.clone(), vs = copy.geometry.vertices, n = vs.length;
      copy.userData.closed = n > 2 && Math.hypot(vs[0].x - vs[n - 1].x, vs[0].y - vs[n - 1].y) < 0.1;
      copy.userData.selected = false;
      copy.position.copy(line.parent ? line.parent.position : line.position);
      toolpath.add(copy);
    });
    toolpath.name = g.name + " " + (toolpathsInScene.length + 1);
    toolpath.userData = {
      visible: true, advanced: false,
      camOperation: g.operation, camToolDia: opts.toolDia, camStepover: last.camStepover !== undefined ? last.camStepover : 40,
      camZClearance: last.camZClearance !== undefined ? last.camZClearance : 3, camZStart: last.camZStart !== undefined ? last.camZStart : 0,
      camPasses: last.camPasses || 1, camDragOffset: last.camDragOffset || 1, camLaserPower: last.camLaserPower || 100,
      camSpindleRpm: last.camSpindleRpm || 10000, camZStep: last.camZStep || 0.5, camZDepth: g.zDepth,
      camFeedrate: last.camFeedrate || 500, camPlungerate: last.camPlungerate || 200,
      camPlasmaKerf: last.camPlasmaKerf || 1.2, camPlasmaZHeight: last.camPlasmaZHeight || 1.5, camPlasmaPierceHeight: last.camPlasmaPierceHeight || 4,
      camPlasmaPierceDelay: last.camPlasmaPierceDelay || 1.5, camPlasmaLeadinDist: last.camPlasmaLeadinDist || 5, camPlasmaIHS: last.camPlasmaIHS || "No",
      camUnion: "No", camDirection: last.camDirection || "Climb", camSpotSize: last.camSpotSize || 0.1, camFillAngle: last.camFillAngle || 0,
      camTabDepth: 0, camTabWidth: 6, camTabSpace: 50
    };
    toolpathsInScene.push(toolpath);
  });
  fillTree();
  setTimeout(function() {                               // the same as loading a project: compute the paths so Generate can use them
    for (var i = firstNew; i < toolpathsInScene.length; i++) toolpathPreview(i);
  }, 200);
  editorToast(plan.length + (plan.length === 1 ? " toolpath" : " toolpaths") + " created - open each in the Toolpaths list, check it and press Generate", "bg-green");
}
