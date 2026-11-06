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

- **Project tab**: open, new project, save/open project, text, shapes, undo/redo.
- **Settings tab**: settings, backup, language, theme, help.
- **Panels on the right**: 1 drawing, 2 toolpaths, 3 create G-code (with time and statistics), 4 export G-code.
- **Help**: the *Help* button in the Settings tab or the F1 key.
