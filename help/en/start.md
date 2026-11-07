# Getting started

Swarfly turns a drawing (SVG, DXF, picture) into a G-code program for a CNC 3018 Pro (GRBL) with a milling spindle or a laser.
The program is saved as a `.nc` file and carried to the machine on an SD card.

## Five steps

1. **Load a drawing**: *Open* in the Project tab, or draw a shape with *Shapes* (see [Drawing and shapes](topic:drawing)).
2. **Select** the lines you want to cut, then use *Create Toolpath using (n) selected vectors*.
3. **Choose the operation** (for example *CNC: Vector (path outside)* or *Laser: Vector (path inside)*), fill in depth, feed and tool, then *Apply and Preview Toolpath*. See [Toolpaths and operations](topic:toolpath).
4. **Generate G-code** (panel 3), watch the *Simulate* preview and read the statistics. See [Simulation and statistics](topic:simulation).
5. **Save G-code** (panel 4) and copy the `.nc` file to the SD card. See [Saving the program](topic:output).

> Before the first real cut: do an **air cut** (spindle up, nothing under it) and check that the size and position are what you expect.

## Where things are

- **Tool panel (left of the drawing)**: the drawing tools in groups - *Select* (select, move, erase, transform), *Create* (text, shapes), *Sketch* (measure, snapping, dimensions, properties bar), *Edit* (move A-B, trim, split, tangent, arc, to corner, undo, redo) and *Camera* (zoom, window, rotate, show job, show machine area). Point at a button to see its name and key; click a group name to fold it. **Ctrl+Alt+L** moves all of them back into the ribbon (the old look) and forth again.
- **Toolbar at the top** (in the old ribbon layout: the Project, Settings and Help tabs): open, new project, save/open project, settings, language, theme, keyboard shortcuts, help.
- **Settings tab**: settings, backup, language, theme.
- **Help tab**: the *Help* button and the *Version* button (what is new).
- **Panels on the right**: 1 drawing, 2 toolpaths, 3 create G-code (with time and statistics), 4 export G-code.
- **Help**: the *Help* button in the Help tab or the F1 key. The help is a free window: drag it by the title bar, resize it from the corner, and keep working in the application; it remembers its size and place.

## Mouse and keys

| Action | How |
|---|---|
| Select | Left mouse button (click an object, or drag a window; **Ctrl** adds to the selection) |
| Rotate / resize handles | Click the selected object again to switch between resize and rotate handles |
| Orbit the view | **Shift** (or **Alt**) + left mouse drag, the **Rotate** button (Zoom group), or the middle mouse button |
| Pan | Right mouse button drag |
| Zoom | Mouse wheel, the **Zoom +** / **Zoom -** buttons, **Ctrl + Shift** + left drag (up = closer) |
| Zoom to an area | The **Window** button, then drag a rectangle with the left button (Esc cancels) |
| Delete selected | **Del** |
| Other actions | Most tools have a key (V select, M move, X trim, + / - zoom ...). The full list, with descriptions, is in *Settings - Keyboard Shortcuts*, where you can change every key |
| Nudge selected | Arrow keys (1 mm; **Shift** 10 mm; **Alt** 0.1 mm) |
| Cancel | **Esc** |
