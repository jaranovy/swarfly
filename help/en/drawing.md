# Drawing and shapes

The **Shapes** menu (Project tab, Insert group) adds a ready-made closed outline. Each shape opens a small dialog; wrong values (for example a star whose inner radius is not smaller than the outer one) show a red message and nothing is created.

- **Circle**: radius, segments (smoothness)
- **Rectangle**: width, height
- **Rounded rectangle**: width, height, corner radius
- **Ellipse**: radius X, radius Y, segments
- **Polygon**: number of sides, radius to the corners
- **Star**: points, outer radius, inner radius
- **Slot**: overall length, width (round ends)

By default a new shape hangs on the mouse until you click (see [Move, scale, rotate](topic:edit)); with *At X0 Y0* (or after Esc) all shapes, the circle included, are placed with the lower-left corner of their bounding box at X0 Y0, so their coordinates are never negative.

## Drawing lines and editing points

**Line** (key *L*, in the Create group): click the first point, then click the next points; each click adds a straight segment. Press and **drag** to draw freehand - the jitter of the hand is averaged out and the stroke is cut to a few points. Hold *Shift* for steps of 15 degrees. A click on the first point (or a stroke that ends on it) **closes** the line, *Enter*, a double-click or a right click finishes an open one, *Backspace* takes the last point back, *Esc* cancels. While you draw, the length and the angle of the segment are shown at the pointer, the points snap to the drawing and the grid, and you can type a point (`x,y`, `@dx,dy`, `@length<angle`) into the field at the bottom left. The tool stays on for the next line until you press Esc again.

**Nodes** (key *N*, in the Edit group) shows the points of the selected line (or click a line first):

- **Move**: click a point and drag it (it snaps to points and the grid, *Shift* switches the snapping off). *Shift*+click adds to the selection, a window dragged on empty ground selects every point inside, the arrow keys nudge the selected points (1 mm, *Shift* 10 mm, *Alt* 0.1 mm).
- **Bend**: the diamond in the middle of a segment is dragged sideways and the segment becomes an arc through the pointer. A double-click on the diamond makes it straight again.
- **Add / delete**: a double-click on the line adds a point there (on an arc it keeps the arc), *Delete* removes the selected points. A line keeps at least 2 points (a closed one 3).
- **Soft move** (tick in the box at the bottom right, with a *radius* in mm): the dragged point pulls its neighbours along the line, less and less with the distance (measured along the line, so the other side of a thin shape stays put). Use it to push a smooth bulge into an outline.
- **Simplify** (button in the same box, with a *tolerance* in mm): removes the points that lie within the tolerance of the line between their neighbours (arcs become short straight pieces). Good for a traced picture with thousands of points; a line with more than 5000 points can only be simplified first. The box also shows how many points the line has. Both settings are remembered.
- Every change is one undo step. Moving a point of a shape (rectangle, circle ...) turns it into an ordinary line; its parameters are gone.

## Text

*Text* in the Insert group creates cut outlines from a font; set the height and see the true-size preview before inserting. There are 68 fonts to choose from (all with the Czech letters, except three old display fonts); **Noto Emoji**, **Noto Sans Symbols** and **Noto Sans Symbols 2** are picture fonts - type or paste symbols such as ✂ ★ ☺ → into the text box (on Windows: Win + . opens the symbol picker).

## Import

*Open* loads SVG, DXF and pictures (pictures are traced into lines). Imported objects are placed at the workspace origin without overlapping existing ones.

- **DXF** files are scaled to millimetres from their `$INSUNITS` setting (inches, feet, centimetres, metres); a message tells you when this happened. Files without units are taken as millimetres.
- **SVG** sizes in `px` are read at 96 dpi (400 px = 105.83 mm). Set real units (mm) in your drawing program for exact sizes.
- **Pictures** (PNG, JPG, BMP, GIF) open the **Trace picture** window: the preview shows your picture faint with the outlines on top. *Threshold* decides what is ink (starts at an automatic value; *auto* returns to it), *Invert* is for white drawings on dark ground, *Centre line* makes ONE path along the middle of every stroke instead of two outlines (an inner and an outer edge; it is on by itself for thin line drawings), *Smoothing* switches between sharp corners and smooth curves, *Ignore specks* drops dust and noise, and *Width of the result* sets the real size in mm (the height follows). Transparent areas count as paper. Press *Import* to get the outlines.
- **Text** inside DXF or SVG files cannot be cut and is not imported - a message appears. Convert it to curves/paths first, or use the *Text* tool.

See also [Move, scale, rotate](topic:edit).
