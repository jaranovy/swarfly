# Move, scale, rotate

## Properties panel (select, then type)

Click an object (or drag a window around several, Ctrl adds to the selection). The **Properties** panel appears in the top left of the drawing:

- **X / Y** and the **3x3 picker**: the numbers are the position of the chosen point of the selection box (lower-left corner by default; also the other corners, edge middles or the centre). Type a new value and press Enter - the object moves so that this point is exactly there. A comma works as decimal separator.
- **Width / Height** and **Keep proportions**: type a size, the object is scaled; the chosen reference point stays where it is. With several objects selected they scale and move together as one.
- **Rotate**: angle in degrees, *Anticlockwise* or *Clockwise*, around the centre of the selection.
- **Shape parameters** (one star, polygon, ellipse ... selected): change the number of points, radii, sides and press *Apply parameters*; the lower-left corner stays. Scaling or rotating a shape afterwards removes its parameters (it is then an ordinary outline).
- **Mirror left-right / up-down** flips the selection about its centre; **Move to X0 Y0** puts its lower-left corner on the origin.
- **Copies**: *Copy in a row* makes the given total number of objects (the original included) with the step X / Y between them; *Copy around a point* turns the copies about the centre X / Y (default X0 Y0), 360 = a full circle spread evenly, any other angle ends exactly there. The copies become the selection; copies of one shape keep its parameters.
- Every change is one undo step (Ctrl+Z).

### The properties bar

When something is selected a bar appears across the top of the drawing: reference point (the 3x3 dots), **X**, **Y**, **W**, **H**, *Keep proportions*, **Rotate** with the two turn buttons, the two mirror buttons, **X0 Y0** (move to the origin) and *Locked*. Everything else described below (copies, corners and offset, points, extend / trim, shape parameters) is in the **More** drawer at the right end of the bar.

### Trim and split (like SAPS "erase part" and "divide")

Two tools in the ribbon, next to Move A-B. Both work on any unlocked line of the drawing; Esc or a right click ends the tool.

- **Trim** - point at a line: the part that would go turns red. It is the part between the two crossings next to the pointer (a crossing is where another line cuts or touches it). Click to remove it. On an open line the parts outside the crossings stay; on a closed outline (circle, rectangle) the rest becomes one open line. A line without crossings is removed completely.
- **Split** - click a line where it should be cut; a crossing within 10 pixels attracts the cut. A closed outline is opened at that point. The pieces are separate lines that you can move, delete or give different toolpaths.

Trimmed or split shapes lose their shape parameters (a circle with an arc missing is no longer a circle). Undo restores everything in one step.

*Erase by window*: drag a window around objects (left to right: whole objects inside, right to left: everything the window touches) and press **Del**. *Erase everything outside a window*: drag the window, press **Invert** in the Documents panel, then **Del**.

### Pocket (mill out an area)

Select one or more **closed** outlines and press **Pocket** in the properties bar: the toolpath is created and its dialog opens with *CNC: Pocket* chosen. Set the cutter diameter, depth and step down, then Apply and Preview. Pocket removes the whole area inside the outline; use *CNC: Vector (path inside)* instead to cut only along the line. Inner corners cannot be sharper than the cutter radius.

### Corners and offset

Panel section *Corners and offset* (select one or more outlines):

- **Size** + **Round corners**: every corner becomes an arc of that radius. **Chamfer**: every corner is cut off at that distance along both edges. A corner may use at most half of each neighbouring edge; where the size does not fit, a smaller one is used and a message says so. Open lines keep their end points. The outline is then an ordinary outline (its shape parameters are dropped); undo brings the original back.
- **Offset** + **Offset copy**: adds a parallel outline at that distance, with round corners at convex bends. A positive number grows the outline, a negative one shrinks it (use it for a cutter-diameter allowance or an inner pocket line). The original stays, the new outline is selected. Only closed outlines can be offset; if shrinking leaves nothing you get a message.

### Points and hole diameter

With one outline selected the panel lists its corner points (a closed outline shows its first point once; up to 40 points). Type new X / Y values and press **Apply points**; the outline is reshaped (one undo step, shape parameters dropped, locked outlines refused). A closed outline that is a circle also shows **Hole - Diameter**: type the new diameter and press **Set**; the circle is resized round its centre.

### Extend / trim ends

For one open line: type a length for **Start** and/or **End** and press **Extend / trim ends**. A positive number moves that end point further along its last segment, a negative one trims it back. Closed outlines are refused. One undo step.

### Dimensions, measuring and typed points

- **Dimensions** button (Edit group) cycles three states: off, **Overall size** (width and height of the selection, or of the whole drawing when nothing is selected) and **Every object** (each outline gets its own width and height, a circle gets its diameter).
- **Measure** menu: *Distance between two points* (length, dX, dY and direction), *Angle* (click the corner, then a point on each arm) and *Diameter of the selected circles* (Ø and R). The tool stays active for the next measurement; Esc ends it. The results stay on the drawing until *Clear measurements*. They are not saved with the project.
- **Typed points**: while *Move A-B* or *Measure* wait for a point, a field appears at the bottom left. Type `x,y` (absolute), `@dx,dy` (relative to the previous point) or `@length<angle` (angle in degrees, anticlockwise from the X axis) and press Enter - the same as a click. With a decimal comma write `12,5;30` or `12,5 30`.

### Selecting

- **Click** an object; **Ctrl+click** adds or removes one.
- **Drag a window** on empty space. Drawn from **left to right** (solid blue frame) it selects what lies **fully inside**; drawn from **right to left** (dashed green frame) it selects everything it **touches**.
- **Double-click** selects every outline of that object group (a whole imported drawing, a whole text); Ctrl keeps the current selection.
- **Click again on the same spot** when objects lie on top of each other: each click picks the next one (the status line says how many there are).
- **Esc** clears the selection; Ctrl+A selects all (as before).
- **Locked** (tick in the panel): the object is not changed by the panel, handles, arrow keys or Move A-B - useful for a finished part or the stock outline. Copies are not locked.

### Snapping and "Move A-B"

With **Snap** on (Edit group, on by default) the pointer is pulled to the nearest useful point within about 10 pixels: an **end point** (corner) of another object, an **intersection** of two outlines, the **centre** of an object, the **middle** of a segment, or - when nothing else is near - a point of the **grid**. A pink marker names the point. It works for a new shape hanging on the mouse (any corner, edge middle or the centre of the shape can snap), for the handles and for *Move A-B*. The grid step is set in the Settings tab (*Snap grid*: 1, 5, 10, 0.5, 0.1 mm or off).

**Move A-B**: select the objects, press *Move A-B*, click the point to move *from* (e.g. a corner), then the point to move *to* (e.g. a corner of another part). The objects follow the pointer while you choose; Esc or right click cancels and puts everything back.

### Handles and arrow keys

The selection is framed by a dashed box with eight handles. Drag a **corner** to scale proportionally (hold **Shift** to change width and height separately); drag the **middle of an edge** to change one side. The opposite corner or edge stays where it is, and the panel follows while you drag. Click on a handle without moving does nothing. The box and handles sit a few pixels outside the object, so they do not cover its outline. Dragging with the handles changes the size in **whole millimetres** (when the pointer is not pulled to a snap point); use the panel for finer sizes.

**Rotating:** click the selected object a second time (without dragging) and the handles change to four round orange **rotation handles**. Drag one of them round the middle of the selection: the angle goes in whole degrees and is pulled to multiples of 15 degrees when you come within 4 degrees of them; the angle shows next to the pointer. Click the object again (or press **Esc**) to get the resize handles back. Selecting another object always starts in resize mode.

The **arrow keys** nudge the selection by 1 mm (Shift 10 mm, Alt 0.1 mm); they do nothing while you type in a field.

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

Measurements made with the Measure tool are saved in the project file (.obc) and come back when it is opened.
