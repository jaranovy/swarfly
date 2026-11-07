// Swarfly 1.18.1 - pure rule for "does closing / replacing the project lose work?" (node-testable, no DOM).
// saved = what the project looked like when it was last saved or opened: { top, n } (the newest undo snapshot and the number of objects + toolpaths),
// or null when it was never saved. Every change takes an undo snapshot first, so a different top means a change after the save.
function projectIsDirty(objectCount, toolpathCount, undoTop, saved) {
  if (!(objectCount > 0) && !(toolpathCount > 0)) return false;      // an empty project loses nothing
  if (!saved) return true;
  return saved.top !== undoTop || saved.n !== objectCount + toolpathCount;
}
