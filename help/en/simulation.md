# Simulation and statistics

## Simulation

After *Generate G-Code* the **Simulate** button plays the program in the 3D view. The speed button cycles through 1x, 2x, 4x, 8x, 12x, 16x and 20x. If the simulation disappears at once, the generated program is broken: look for a red message from the G-code check.

## Statistics (panel 3)

- **Estimated run time**: from path length and feeds; rapid moves are counted at a fixed speed, so treat it as a guide.
- **Path**: cutting length and rapid length in metres.
- **Removed**: area, depth and volume of the removed material; choose the **material** to get the weight in grams. Only milling operations remove material.

## G-code check

Every generated program is checked automatically (units, absolute mode, glued commands, missing feed, spindle off while cutting, Z moves in laser programs, rapid moves inside the material, NaN values). Errors appear as a red message; negative coordinates and a missing end are warnings.
