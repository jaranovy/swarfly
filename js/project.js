// Swarfly 1.18.1 - "New project" asks before it throws work away, the usual way: Save / Don't save / Cancel.
// The rule (what counts as unsaved) is in js/project-model.js. Saving means the .obc file (the same as Save Project).

var projectState = { saved: null };

function projectUndoTop() { return typeof undoStore !== "undefined" && undoStore.length ? undoStore[0] : null; }

function projectMarkSaved() {
  projectState.saved = { top: projectUndoTop(), n: objectsInScene.length + toolpathsInScene.length };
}

function projectDirty() {
  return projectIsDirty(objectsInScene.length, toolpathsInScene.length, projectUndoTop(), projectState.saved);
}

function projectClear() {
  storeUndo(true);
  objectsInScene.length = 0;
  toolpathsInScene.length = 0;
  trashGcode();
  fillTree();
  $(".workspaceTitle").html("");
  projectState.saved = null;
}

function projectNew() {
  if (!projectDirty()) { projectClear(); return; }
  Metro.dialog.create({
    width: 520,
    title: "Save the project?",
    content: "<div>The project has changes that are not saved. If you do not save them, they will be lost.</div>",
    actions: [
      { caption: "<i class=\"far fa-fw fa-save\"></i> Save", cls: "js-dialog-close success", onclick: function() { exportWorkspace(); setTimeout(projectClear, 400); } },
      { caption: "Don't save", cls: "js-dialog-close alert", onclick: function() { projectClear(); } },
      { caption: "Cancel", cls: "js-dialog-close", onclick: function() {} }
    ]
  });
}
