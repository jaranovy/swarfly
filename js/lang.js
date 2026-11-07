// Swarfly UI language. Order: ?en / ?cs in the URL, the choice saved by the Language button, window.SWARFLY_DEFAULT_LANG
// (js/default-lang.js; in the Electron app generated from swarfly-defaults.json next to the program), otherwise English. Czech is a dictionary in js/lang/cs.json (exact visible strings -> Czech).
// Switch: Settings tab -> Language button (stored in localStorage "swarflyLang"), or ?en / ?cs in the URL for one session.
// Only visible UI text is replaced (text nodes, title/placeholder, <option> labels - option VALUES stay English because the app
// reads them, e.g. "CNC: Pocket"). Generated G-code and its comments stay English on purpose.
// Terms: sousledne/nesousledne frezovani = climb/conventional (checked in Czech sources); fix wording in js/lang/cs.json only.
(function () {
  var DEFAULT_LANG = window.SWARFLY_DEFAULT_LANG === "cs" ? "cs" : "en";
  var lang = DEFAULT_LANG;
  try { var saved = localStorage.getItem("swarflyLang"); if (saved === "cs" || saved === "en") lang = saved; } catch (e) { /* storage blocked: default */ }
  if (/[?&]en/.test(location.search)) lang = "en";
  else if (/[?&]cs/.test(location.search)) lang = "cs";
  window.swarflyLang = lang;

  // Language button in the Settings tab: shows the language you would switch TO; a reload applies it
  window.swarflySwitchLanguage = function () {
    var next = lang === "cs" ? "en" : "cs";
    var msg = next === "cs" ? "Switch to Czech? The page reloads - save your work first (Save project)." : "Přepnout do angličtiny? Stránka se znovu načte - nejdřív ulož projekt.";
    if (!window.confirm(msg)) return;
    try { localStorage.setItem("swarflyLang", next); } catch (e) { /* ignore */ }
    location.href = location.pathname;   // drop ?en / ?cs so the stored choice wins
  };
  function labelButton() {
    var cap = document.getElementById("languageButtonCaption");
    if (cap) cap.textContent = lang === "cs" ? "English" : "Česky";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", labelButton); else labelButton();

  if (lang !== "cs") return;
  var D = {};
  try {
    var x = new XMLHttpRequest();
    x.open("GET", "js/lang/cs.json", false);
    x.send(null);
    if (x.status === 200 || (x.status === 0 && x.responseText)) D = JSON.parse(x.responseText);
  } catch (e) { console.warn("Czech dictionary not loaded", e); }
  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE)$/;
  // texts with numbers or operation names inside (built at run time by the app)
  var RULES = [
    [/^Create Toolpath using \((\d+)\) selected vectors$/, "Vytvořit dráhu nástroje z vybraných vektorů ($1)"],
    [/Toolpath-(\d+)/g, "Dráha-$1"],
    [/^Properties - (\d+) objects$/, "Vlastnosti - objektů: $1"],
    [/^(\d+) objects selected - the panel moves, resizes and rotates them together$/, "Vybráno objektů: $1 - panel je posune, změní velikost a otočí společně"],
    [/^Shape: (.+)$/, "Tvar: $1"],
    [/^Not a number: (.*)$/, "Není číslo: $1"],
    [/^(\d+) objects under the pointer - click again to pick the next one$/, "Pod ukazatelem objektů: $1 - dalším kliknutím vybereš další"],
    [/^(.+) is drawn in (.+) - scaled to millimetres \(x ([\d.]+)\)\.$/, "$1: kresba je v jednotkách „$2“ - převedeno na milimetry (x $3)."],
    [/^(.+) contains (\d+) text entit(?:y|ies), which cannot be cut\. Convert the text to curves in your CAD program, or use the Text tool\.$/, "$1 obsahuje textových prvků: $2 - ty nelze řezat. Převeď text na křivky v CAD programu nebo použij nástroj Text."],
    [/^(.+) contains text, which is not imported\. Convert it to paths first \(Inkscape: Path > Object to Path\), or use the Text tool\.$/, "$1 obsahuje text, který se nenačte. Nejdřív ho převeď na cesty (Inkscape: Cesta > Objekt na cestu) nebo použij nástroj Text."],
    [/^Rectangle (\d[\d.]*×\d[\d.]*)$/, "Obdélník $1"],
    [/^Circle (\d[\d.]*×\d[\d.]*)$/, "Kruh $1"],
    [/^Ellipse (\d[\d.]*×\d[\d.]*)$/, "Elipsa $1"],
    [/^Polygon (\d[\d.]*×\d[\d.]*)$/, "Mnohoúhelník $1"],
    [/^Star (\d[\d.]*×\d[\d.]*)$/, "Hvězda $1"],
    [/^Slot (\d[\d.]*×\d[\d.]*)$/, "Drážka $1"],
    [/^Line (\d[\d.]*×\d[\d.]*)$/, "Čára $1"],
    [/^Outline (\d[\d.]*×\d[\d.]*)$/, "Obrys $1"],
    [/^Drawing (\d+)$/, "Výkres $1"],
    [/^Trace picture: (.+)$/, "Vektorizace obrázku: $1"],
    [/^(\d+) outlines$/, "Obrysů: $1"],
    [/^Nothing was traced from (.+)$/, "Z $1 se nic nevektorizovalo"],
    [/^The picture (.+) could not be read$/, "Obrázek $1 se nepodařilo přečíst"],
    [/^(\d+) toolpaths$/, "$1 drah"],
    [/^Drill ([\d.]+) mm$/, "Vrták $1 mm"],
    [/^Mill ([\d.]+) mm$/, "Fréza $1 mm"],
    [/^(\d+) toolpath$/, "$1 dráha"],
    [/^(\d+) files saved\. Run them in order; change the bit and set Z between them\.$/, "Uloženo souborů: $1. Spouštěj je popořadě; mezi nimi vyměň nástroj a nastav Z."],
    [/^This toolpath contains (\d+) open vector\(s\), and (\d+) closed vector\(s\)$/, "Dráha obsahuje otevřených vektorů: $1, uzavřených: $2"]
  ];
  var OPS = Object.keys(D).filter(function (k) { return /^(CNC|Laser: Vector|Plasma: Vector|Drill|Drag Knife: Cutout|Pen Plotter)/.test(k); })
    .sort(function (a, b) { return b.length - a.length; });
  function tr(s) {
    var t = s.replace(/\s+/g, " ").trim();
    if (!t) return null;
    // Return null when nothing changes: writing an identical nodeValue still fires the MutationObserver -> endless loop
    if (D.hasOwnProperty(t)) return D[t] === t ? null : s.replace(t, D[t]);
    // a tooltip with a key appended by js/shortcuts.js, e.g. "Undo (Ctrl+Z)": translate the text, keep the key
    var km = t.match(/^(.+) \(((?:Ctrl\+|Alt\+|Shift\+)*[A-Za-z0-9+=-]{1,8}|F\d+)\)$/);
    if (km && D.hasOwnProperty(km[1])) return s.replace(t, D[km[1]] + " (" + km[2] + ")");
    var o = t;
    RULES.forEach(function (r) { o = o.replace(r[0], r[1]); });
    OPS.forEach(function (k) { if (o.indexOf(k) >= 0) o = o.split(k).join(D[k]); });
    return o !== t ? s.replace(t, o) : null;
  }
  function walk(root) {
    if (!root || root.nodeType === 8) return;
    if (root.nodeType === 3) {
      var p = root.parentNode;
      if (p && !SKIP.test(p.nodeName)) { var r = tr(root.nodeValue); if (r !== null && r !== root.nodeValue) root.nodeValue = r; }
      return;
    }
    if (root.nodeType !== 1 || SKIP.test(root.nodeName)) return;
    // keep the English value of options: the app reads it
    if (root.nodeName === "OPTION" && !root.hasAttribute("value")) root.setAttribute("value", root.textContent.trim());
    ["title", "placeholder", "data-title", "data-hint-text"].forEach(function (a) {
      if (root.hasAttribute(a)) { var r = tr(root.getAttribute(a)); if (r !== null) root.setAttribute(a, r); }
    });
    for (var n = root.firstChild; n; n = n.nextSibling) walk(n);
  }
  function start() {
    document.documentElement.lang = "cs";
    walk(document.body);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(walk); if (m.type === "characterData") walk(m.target); });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
