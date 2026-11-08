# Toolpaths and operations

A **toolpath** is one operation applied to the selected lines. You can have several toolpaths in one project; they are cut in the order of the list in panel 2.

## Operations

- **CNC: Vector (no offset / path inside / path outside)**: cut along the line, inside it or outside it (the tool edge follows the line).
- **CNC: Pocket**: remove the whole area inside a closed outline.
- **Drill: Peck / Continuous**: drill holes at the centres of circles.
- **Laser: Vector (no offset / inside / outside)** and *raster fill (Beta)*: see [Laser](topic:laser).
- **Plasma**, **Drag Knife**, **Pen Plotter**: other tools of the original program, not tested on this machine.

## Suggest toolpaths

Under the Toolpaths list is the button **Suggest toolpaths**. Select the lines (or select nothing for the whole drawing), enter the **material thickness**, the **cutter diameter** and the **engraving depth** for open lines, and press *Create toolpaths*. The drawing decides the operations: tiny circles are drilled, closed shapes inside another shape are cut as holes (path inside), open lines are engraved (no offset), and the outer shapes are cut out (path outside) last, so the part stays held in the sheet until the end. Feeds and step down come from the last operation you used. It is only a proposal: open each toolpath, check the values and press Generate G-Code.

## Main values

- **Endmill diameter** and **Stepover**: size of the tool and distance between passes in a pocket.
- **Z safe height**: height for rapid moves above the material.
- **Cut depth: start / final / per pass**: how deep, and how much per pass.
- **Feedrate (X/Y)** and **Feedrate: plunge**: speed of cutting and of going down.
- **Spindle RPM**: written as an S value.
- **Cutting direction**: climb or conventional.

The starting values come from the 3018 preset and are only a starting point: check them against the programs that are known to run on your machine (step per pass, feeds, tool size) before cutting.

> Path *outside* / *inside* shifts the line by half the tool diameter. A wrong diameter means a wrong size of the part.
