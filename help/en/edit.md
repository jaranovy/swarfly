# Move, scale, rotate

## Properties panel (select, then type)

Click an object (or drag a window around several, Ctrl adds to the selection). The **Properties** panel appears in the top left of the drawing:

- **X / Y** and the **3x3 picker**: the numbers are the position of the chosen point of the selection box (lower-left corner by default; also the other corners, edge middles or the centre). Type a new value and press Enter - the object moves so that this point is exactly there. A comma works as decimal separator.
- **Width / Height** and **Keep proportions**: type a size, the object is scaled; the chosen reference point stays where it is. With several objects selected they scale and move together as one.
- **Rotate**: angle in degrees, *Anticlockwise* or *Clockwise*, around the centre of the selection.
- **Shape parameters** (one star, polygon, ellipse ... selected): change the number of points, radii, sides and press *Apply parameters*; the lower-left corner stays. Scaling or rotating a shape afterwards removes its parameters (it is then an ordinary outline).
- Every change is one undo step (Ctrl+Z).

The **Properties** button in the *Edit* group hides or shows the panel. The **Dimensions** button draws the overall width and height of the selection (or of the whole drawing when nothing is selected) on the part. The line at the bottom of the drawing shows the cursor position and what to do next.

## New shapes follow the mouse

After *Create* in a shape dialog the new shape hangs on the cursor (its centre under the pointer). **Click** puts it there, **Esc** puts it at X0 Y0, **right click** cancels it (nothing is added). Settings tab, group *Editor*, button *New shapes*: choose *With mouse* or *At X0 Y0*. The panel then shows the exact position, which you can type over.

## Transform window (old way)

Select an object with the transform tool and use the tabs **Scale**, **Position**, **Rotation**.

Select an object and open the transform window (tabs **Scale**, **Position**, **Rotation**).

### Scale

- **Width / Height**: type a size in mm.
- **Keep proportions** (ticked by default): changing one side changes the other so the shape keeps its ratio. Untick it to change one side only.
- **Scale %**: 100 = unchanged, 50 = half, 200 = double (always counted from the size when the window was opened).

### Position

Type the left, centre or right edge (X) and the bottom, centre or top edge (Y) in mm. The other values follow automatically.

### Rotation

Type the angle and press *Anticlockwise* or *Clockwise*.

> Keep every part at X 0 or more and Y 0 or more. Swarfly warns when a saved program goes into negative coordinates, because the machine may not reach them.
