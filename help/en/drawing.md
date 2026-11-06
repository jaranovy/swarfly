# Drawing and shapes

The **Shapes** menu (Project tab, Insert group) adds a ready-made closed outline. Each shape opens a small dialog; wrong values (for example a star whose inner radius is not smaller than the outer one) show a red message and nothing is created.

- **Circle**: radius, segments (smoothness)
- **Rectangle**: width, height
- **Rounded rectangle**: width, height, corner radius
- **Ellipse**: radius X, radius Y, segments
- **Polygon**: number of sides, radius to the corners
- **Star**: points, outer radius, inner radius
- **Slot**: overall length, width (round ends)

New shapes (except the circle) are placed with the lower-left corner of their bounding box at X0 Y0, so their coordinates are never negative.

## Text

*Text* in the Insert group creates cut outlines from a font; set the height and see the true-size preview before inserting.

## Import

*Open* loads SVG, DXF and pictures (pictures are traced into lines). Imported objects are placed at the workspace origin without overlapping existing ones.

See also [Move, scale, rotate](topic:edit).
