# Saving the program (.nc, SD card)

Press **Save G-Code** in panel 4. The file is always saved with the extension `.nc`.

## File name

The name is taken from the drawing you loaded: lower case, plain ASCII letters, at most 8 characters before the dot (for example `plan_001.svg` becomes `plan_001.nc`, `Můj dlouhý výkres.svg` becomes `muj_dlou.nc`). Short names are safest for the offline controller.

## Card style

The program is written like the programs that already run on the machine:

- no comments and no `G4 P8` wait, a single `G21`, then `G90`
- Windows line ends (CRLF)
- ends with `M5` and `M2`

If a coordinate goes below zero (X or Y), a message warns you; the machine may not reach that place.

## One file per tool

The machine cannot change a bit by itself. When the drawing uses more than one tool (for example a 3 mm drill and a 3.175 mm mill), press the **layers** button next to Save G-Code: a window lists the files (`plat_01d.nc` = first file, drill; `plat_02m.nc` = second file, mill) and how many toolpaths each holds. *Save files* writes them all into one folder you choose. Run them in the listed order; before each next file **change the bit and touch off Z again** - the machine has no tool length offset, so the old Z zero is wrong for the new bit. If only one tool is used, the normal Save G-Code is enough.

## To the machine

1. Copy the `.nc` file to the SD card (root folder or the folder your controller uses).
2. Put the card into the offline controller and choose the file.
3. Do an **air cut** first: tool raised or no material, watch the whole path.

> Nothing produced by Swarfly has been run on the real machine yet. The first test is always an air cut, then a scrap piece.
