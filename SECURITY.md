# Security Policy

Swarfly is a desktop CAM program (a fork of OpenBuilds CAM) that runs locally and, in the Electron build, reads and writes files on your computer. It does not send your drawings anywhere.

## Supported versions

Only the newest release gets fixes. The installer updates itself, so please update first.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through GitHub: **Security tab > Report a vulnerability** (private vulnerability reporting) in https://github.com/jaranovy/swarfly.

Include the version, the steps to reproduce and, if you can, a sample file. This is a hobby project run by one person, so there is no fixed response time, but reports are read and answered as soon as possible.

## Scope

- In scope: the Swarfly code in this repository (opening drawings / G-code / images, the Electron shell, the auto-updater).
- Out of scope: GRBL firmware and the machine itself; third-party libraries in `lib/` (report those to their authors, but tell us so we can update).
