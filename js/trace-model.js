// Pure helpers for tracing a picture into outlines (node-testable, no DOM). Used by js/potrace.js.
// Release 1.10.0: threshold (automatic by default), transparent pixels count as background, invert, smoothing presets, size in mm.

// Brightness 0..255 of one RGBA pixel; a transparent pixel counts as white (the paper), so a PNG with a transparent background
// no longer turns into one big black block.
function traceBrightness(r, g, b, a) {
  var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  var alpha = a / 255;
  return lum * alpha + 255 * (1 - alpha);
}

// Histogram (256 bins) of the brightness of RGBA data.
function traceHistogram(rgba) {
  var h = new Array(256).fill(0);
  for (var i = 0; i < rgba.length; i += 4) h[Math.max(0, Math.min(255, Math.round(traceBrightness(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]))))]++;
  return h;
}

// Otsu's method: the threshold that separates dark from light best. Pixels darker than the result are "ink".
function traceOtsu(hist) {
  var total = 0, sum = 0, i;
  for (i = 0; i < 256; i++) { total += hist[i]; sum += i * hist[i]; }
  if (!total) return 128;
  var wB = 0, sumB = 0, best = 0, threshold = 128;
  for (i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    var wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    var mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; threshold = i + 1; }
  }
  return threshold;
}

// Ink mask (Uint8Array, 1 = ink) of RGBA data. invert: light pixels are the ink (white drawing on black).
function traceMask(rgba, width, height, threshold, invert) {
  var mask = new Uint8Array(width * height);
  for (var p = 0, i = 0; p < mask.length; p++, i += 4) {
    var dark = traceBrightness(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]) < threshold;
    mask[p] = (invert ? !dark : dark) ? 1 : 0;
  }
  return mask;
}

// Size used for tracing: the longer side is at most maxSide pixels (large photos are slow and gain nothing). factor = traced / original.
function traceWorkSize(width, height, maxSide) {
  var f = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * f)), height: Math.max(1, Math.round(height * f)), factor: f };
}

// Smoothing presets -> potrace options. noise = largest speckle (in pixels of the traced size) that is dropped.
var TRACE_SMOOTHING = {
  sharp: { alphaMax: 0.3, optTolerance: 0.1 },
  normal: { alphaMax: 1, optTolerance: 0.2 },
  smooth: { alphaMax: 1.3, optTolerance: 0.5 }
};

function traceOptions(smoothing, noise) {
  var s = TRACE_SMOOTHING[smoothing] || TRACE_SMOOTHING.normal;
  return { turnPolicy: 4, turdSize: Math.max(0, Math.round(Number(noise) || 0)), alphaMax: s.alphaMax, optCurve: true, optTolerance: s.optTolerance };
}

// The default size of a picture: pixels at 96 dpi (as a browser would show them), in mm.
function traceDefaultWidthMm(widthPx) { return Math.round(widthPx * 25.4 / 96 * 100) / 100; }

// potrace's toSVG(scale) multiplies the coordinates (traced pixels) and the svg width / height, which the SVG reader then takes as
// px at 96 dpi. Returns the scale that makes the traced picture targetMm wide in the end.
function traceSvgScale(workWidthPx, targetMm) { return targetMm / (workWidthPx * 25.4 / 96); }

// Rough size of the result for the dialog: "42.33 x 21.17 mm".
function traceSizeText(widthPx, heightPx, targetMm) {
  var w = Number(targetMm);
  if (!isFinite(w) || w <= 0) return "";
  return (Math.round(w * 100) / 100) + " x " + (Math.round(w * heightPx / widthPx * 100) / 100) + " mm";
}
