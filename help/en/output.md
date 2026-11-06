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

## To the machine

1. Copy the `.nc` file to the SD card (root folder or the folder your controller uses).
2. Put the card into the offline controller and choose the file.
3. Do an **air cut** first: tool raised or no material, watch the whole path.

> Nothing produced by Swarfly has been run on the real machine yet. The first test is always an air cut, then a scrap piece.
