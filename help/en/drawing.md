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

## Text

*Text* in the Insert group creates cut outlines from a font; set the height and see the true-size preview before inserting.

## Import

*Open* loads SVG, DXF and pictures (pictures are traced into lines). Imported objects are placed at the workspace origin without overlapping existing ones.

- **DXF** files are scaled to millimetres from their `$INSUNITS` setting (inches, feet, centimetres, metres); a message tells you when this happened. Files without units are taken as millimetres.
- **SVG** sizes in `px` are read at 96 dpi (400 px = 105.83 mm). Set real units (mm) in your drawing program for exact sizes.
- **Pictures** (PNG, JPG, BMP, GIF) open the **Trace picture** window: the preview shows your picture faint with the outlines on top. *Threshold* decides what is ink (starts at an automatic value; *auto* returns to it), *Invert* is for white drawings on dark ground, *Centre line* makes ONE path along the middle of every stroke instead of two outlines (an inner and an outer edge; it is on by itself for thin line drawings), *Smoothing* switches between sharp corners and smooth curves, *Ignore specks* drops dust and noise, and *Width of the result* sets the real size in mm (the height follows). Transparent areas count as paper. Press *Import* to get the outlines.
- **Text** inside DXF or SVG files cannot be cut and is not imported - a message appears. Convert it to curves/paths first, or use the *Text* tool.

See also [Move, scale, rotate](topic:edit).
