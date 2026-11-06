// After electron-builder: copy the finished .exe files of this version to <project>/out (short path for the owner).
const fs = require("fs"), path = require("path");
const v = require("../package.json").version, from = path.join(__dirname, "..", "dist"), to = path.join(__dirname, "..", "..", "..", "out");
fs.mkdirSync(to, { recursive: true });
["Swarfly-Setup-" + v + ".exe", "Swarfly-" + v + ".exe"].forEach((f) => {
	if (fs.existsSync(path.join(from, f))) { fs.copyFileSync(path.join(from, f), path.join(to, f)); console.log("copied to out/: " + f); }
});
