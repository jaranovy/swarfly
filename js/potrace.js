// Tracing a picture into outlines with potrace (https://github.com/oov/potrace). Release 1.10.0: a dialog with a live preview.
// Pure helpers (threshold, mask, presets, size) are in js/trace-model.js.

var TRACE_MAX_SIDE = 1000;       // pictures are traced at most this many pixels on the longer side
var traceState = null;

function traceFromImg(e, f) {
  var img = new Image();
  img.onload = function() { traceOpenDialog(img, f, e.target.result); };
  img.onerror = function() { Metro.toast.create("The picture " + f.name + " could not be read", null, 6000, 'bg-red'); };
  img.src = e.target.result;
}

function traceOpenDialog(img, file, dataUrl) {
  var size = traceWorkSize(img.width, img.height, TRACE_MAX_SIDE);
  var canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, size.width, size.height);
  var rgba = ctx.getImageData(0, 0, size.width, size.height).data;
  traceState = { file: file, rgba: rgba, w: size.width, h: size.height, origW: img.width, origH: img.height, dataUrl: dataUrl, timer: null, result: null };
  var auto = traceOtsu(traceHistogram(rgba));
  var content =
    '<div id="traceBox">' +
    '<div id="traceView" style="position:relative;height:260px;background:#fff;border:1px solid #bbb;border-radius:4px;overflow:hidden;margin-bottom:8px">' +
    '<img id="traceOrig" src="' + dataUrl + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:.3">' +
    '<img id="traceOut" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain"></div>' +
    '<table style="width:100%;font-size:13px">' +
    '<tr><td style="width:34%">Threshold</td><td><input type="range" id="traceThreshold" min="1" max="255" value="' + auto + '" style="width:70%"> <span id="traceThresholdValue">' + auto + '</span> <a href="#" id="traceAuto">auto</a></td></tr>' +
    '<tr><td>Invert (light is ink)</td><td><input type="checkbox" id="traceInvert"></td></tr>' +
    '<tr><td>Smoothing</td><td><select id="traceSmooth"><option value="sharp">Sharp corners</option><option value="normal" selected>Normal</option><option value="smooth">Smooth</option></select></td></tr>' +
    '<tr><td>Ignore specks up to</td><td><input type="range" id="traceNoise" min="0" max="60" value="5" style="width:70%"> <span id="traceNoiseValue">5</span> px</td></tr>' +
    '<tr><td>Width of the result</td><td><input type="number" id="traceWidth" min="1" step="0.1" value="' + traceDefaultWidthMm(img.width) + '" style="width:90px"> mm <span id="traceSize" style="color:#777"></span></td></tr>' +
    '</table><div id="traceInfo" style="margin-top:6px;font-size:12px;color:#777"></div></div>';
  Metro.dialog.create({
    title: "Trace picture: " + file.name,
    content: content,
    clsDialog: "trace-dialog",
    actions: [
      { caption: "<span class='fas fa-check fa-fw'></span> Import", cls: "js-dialog-close primary", onclick: function() { traceImport(); } },
      { caption: "Cancel", cls: "js-dialog-close", onclick: function() { traceState = null; } }
    ]
  });
  ["traceThreshold", "traceInvert", "traceSmooth", "traceNoise", "traceWidth"].forEach(function(id) {
    var el = document.getElementById(id);
    el.addEventListener("input", traceSchedule);
    el.addEventListener("change", traceSchedule);
  });
  document.getElementById("traceAuto").addEventListener("click", function(ev) {
    ev.preventDefault();
    document.getElementById("traceThreshold").value = auto;
    traceSchedule();
  });
  traceSchedule();
}

function traceSettings() {
  return {
    threshold: Number(document.getElementById("traceThreshold").value),
    invert: document.getElementById("traceInvert").checked,
    smoothing: document.getElementById("traceSmooth").value,
    noise: Number(document.getElementById("traceNoise").value),
    widthMm: Number(document.getElementById("traceWidth").value)
  };
}

function traceSchedule() {
  if (!traceState) return;
  clearTimeout(traceState.timer);
  traceState.timer = setTimeout(traceRun, 150);
}

// Traces with the current settings; keeps the SVG text in traceState.result (scale 1 in traced pixels) for the preview and the import.
function traceRun() {
  var st = traceState;
  if (!st || !document.getElementById("traceThreshold")) return;
  var s = traceSettings();
  st.lastSettings = s;
  document.getElementById("traceThresholdValue").textContent = s.threshold;
  document.getElementById("traceNoiseValue").textContent = s.noise;
  document.getElementById("traceSize").textContent = traceSizeText(st.origW, st.origH, s.widthMm);
  var mask = traceMask(st.rgba, st.w, st.h, s.threshold, s.invert);
  var list = potrace.fromFunction(function(x, y) { return mask[y * st.w + x] === 1; }, st.w, st.h, traceOptions(s.smoothing, s.noise));
  st.result = { list: list, count: list.length };
  var info = document.getElementById("traceInfo");
  info.textContent = list.length ? list.length + " outlines" : "Nothing to trace - change the threshold or tick Invert";
  document.getElementById("traceOut").src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(list.toSVG(1));
}

function traceImport() {
  var st = traceState;
  if (!st) return;
  traceRun();
  traceState = null;
  clearTimeout(st.timer);
  if (!st.result || !st.result.count) { Metro.toast.create("Nothing was traced from " + st.file.name, null, 6000, 'bg-amber'); return; }
  var s = st.lastSettings;
  var scale = traceSvgScale(st.w, isFinite(s.widthMm) && s.widthMm > 0 ? s.widthMm : traceDefaultWidthMm(st.origW));
  var svg = st.result.list.toSVG(scale);
  return lwsvgparser.loadFromString(svg).then(function() {
    return lwsvgparser.parse().then(function(tags) {
      lwsvgparser.editor = { name: "PoTrace.js", version: "1.00" };
      drawFile(st.file.name, tags, false);
    });
  }).catch(function(error) {
    console.error('error:', error);
  });
}
