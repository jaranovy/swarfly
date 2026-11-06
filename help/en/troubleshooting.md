# Troubleshooting

- **The G-code is empty or the simulation vanishes at once**: a red message from the G-code check names the problem. Check that a toolpath exists, that depth and feed are filled in and that the operation matches the tool (laser operations for the laser).
- **Warning about negative coordinates**: move the part so that X and Y are 0 or more (Position tab).
- **Wrong size of the part**: check the tool diameter and the choice inside / outside / no offset.
- **The program starts slowly**: the portable `.exe` unpacks itself on every start (about 13 seconds). The installed version starts in about 2 seconds.
- **Windows shows a blue SmartScreen warning**: the installer is not signed. Choose *More info*, then *Run anyway*, only for a file you got from the person who made it.
- **The language is wrong**: use *Language* in the Settings tab.
- **My settings are gone**: the installed program and the portable `.exe` keep separate settings; use *Backup Settings* and *Restore from file*.
- **The controller does not show the file**: use a short name (8 characters), the `.nc` extension and the folder your controller reads.
