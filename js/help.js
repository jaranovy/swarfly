// Swarfly in-app help. Topics are Markdown files: help/en/<id>.md and help/cs/<id>.md (Czech falls back to English when a file is missing),
// list of topics in help/index.json, release notes in CHANGELOG.md (English). Open with the Help tab (Help / Version buttons) or F1. A free floating window, not a modal dialog.
// helpMarkdown() is a tiny pure renderer (no DOM) so it can be unit-tested; everything is HTML-escaped first, so help files cannot inject markup.

function helpEscape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// inline: **bold**, *italic*, `code`, [text](topic:id) internal link, [text](https://...) external link (opens in the browser)
function helpInline(text) {
  var s = helpEscape(text);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>");
  s = s.replace(/\[([^\]]+)\]\(topic:([a-z0-9-]+)\)/g, '<a href="#" class="help-link" data-topic="$2">$1</a>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

// block level: # ## ### headings, paragraphs, "- " bullet lists, "1. " numbered lists, "> " notes, --- rule, blank-line separated
function helpMarkdown(md) {
  var lines = String(md).replace(/\r\n/g, "\n").split("\n");
  var out = [], para = [], list = null, i, m;
  function flushPara() { if (para.length) { out.push("<p>" + helpInline(para.join(" ")) + "</p>"); para = []; } }
  function flushList() { if (list) { out.push("</" + list + ">"); list = null; } }
  for (i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (/^\s*$/.test(line)) { flushPara(); flushList(); continue; }
    if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) {
      flushPara(); flushList();
      out.push("<h" + m[1].length + ">" + helpInline(m[2]) + "</h" + m[1].length + ">");
    } else if (/^---+\s*$/.test(line)) {
      flushPara(); flushList(); out.push("<hr>");
    } else if ((m = /^\s*[-*]\s+(.*)$/.exec(line))) {
      flushPara();
      if (list !== "ul") { flushList(); out.push("<ul>"); list = "ul"; }
      out.push("<li>" + helpInline(m[1]) + "</li>");
    } else if ((m = /^\s*\d+\.\s+(.*)$/.exec(line))) {
      flushPara();
      if (list !== "ol") { flushList(); out.push("<ol>"); list = "ol"; }
      out.push("<li>" + helpInline(m[1]) + "</li>");
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      flushPara(); flushList();
      out.push('<blockquote>' + helpInline(m[1]) + "</blockquote>");
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara(); flushList();
  return out.join("\n");
}

// ---- browser part (not loaded by the unit tests) -----------------------------------------------------------------
var helpState = { topics: null, current: null, cache: {} };

function helpFetch(url, done) {
  if (helpState.cache[url] !== undefined) { done(helpState.cache[url]); return; }
  var x = new XMLHttpRequest();
  x.open("GET", url, true);
  x.onload = function() {
    var ok = (x.status >= 200 && x.status < 300) || (x.status === 0 && x.responseText);
    helpState.cache[url] = ok ? x.responseText : null;
    done(helpState.cache[url]);
  };
  x.onerror = function() { helpState.cache[url] = null; done(null); };
  x.send(null);
}

function helpLang() { return window.swarflyLang === "cs" ? "cs" : "en"; }

function helpShow(html) {
  var box = document.getElementById("helpContent");
  if (box) { box.innerHTML = html; box.scrollTop = 0; }
}

function helpOpenTopic(id) {
  helpState.current = id;
  var lang = helpLang();
  var url = id === "changelog" ? "CHANGELOG.md" : "help/" + lang + "/" + id + ".md";
  helpFetch(url, function(text) {
    if (text === null && lang !== "en" && id !== "changelog") {
      helpFetch("help/en/" + id + ".md", function(fallback) {
        helpShow(fallback === null ? "<p>Help topic not found.</p>" : helpMarkdown(fallback));
      });
      return;
    }
    helpShow(text === null ? "<p>Help topic not found.</p>" : helpMarkdown(text));
  });
  var items = document.querySelectorAll("#helpTopicList a");
  for (var i = 0; i < items.length; i++) items[i].classList.toggle("active", items[i].getAttribute("data-topic") === id);   // keep the help-link class
}

function helpBuildList() {
  var lang = helpLang(), list = document.getElementById("helpTopicList");
  if (!list || !helpState.topics) return;
  var html = helpState.topics.map(function(t) {
    return '<a href="#" class="help-link" data-topic="' + t.id + '">' + helpEscape(t[lang] || t.en) + "</a>";
  }).join("");
  html += '<a href="#" class="help-link" data-topic="changelog">' + (lang === "cs" ? "Co je nového (anglicky)" : "What's new") + "</a>";
  list.innerHTML = html;
}

function helpSaveGeometry() {
  var w = document.getElementById("helpWindow");
  if (!w || w.style.display === "none") return;
  try { localStorage.setItem("swarflyHelpWin", JSON.stringify({ x: w.offsetLeft, y: w.offsetTop, w: w.offsetWidth, h: w.offsetHeight })); } catch (e) { /* storage blocked */ }
}

// keeps the window reachable: at least 120 px of the title bar stay inside the browser window
function helpClamp(w) {
  var maxX = window.innerWidth - 120, maxY = window.innerHeight - 40;
  w.style.left = Math.max(-w.offsetWidth + 120, Math.min(maxX, w.offsetLeft)) + "px";
  w.style.top = Math.max(0, Math.min(maxY, w.offsetTop)) + "px";
}

function helpPlaceWindow(w) {
  var g = null;
  try { g = JSON.parse(localStorage.getItem("swarflyHelpWin")); } catch (e) { g = null; }
  var vw = window.innerWidth, vh = window.innerHeight;
  var width = g && g.w >= 480 ? g.w : Math.min(860, Math.max(480, Math.round(vw * 0.6)));
  var height = g && g.h >= 320 ? g.h : Math.min(620, Math.max(320, Math.round(vh * 0.75)));
  w.style.width = Math.min(width, vw - 10) + "px";
  w.style.height = Math.min(height, vh - 10) + "px";
  w.style.left = (g ? g.x : Math.max(10, vw - width - 20)) + "px";
  w.style.top = (g ? g.y : 60) + "px";
  helpClamp(w);
}

function helpClose() {
  var w = document.getElementById("helpWindow");
  if (w) { helpSaveGeometry(); w.style.display = "none"; }
}

// the help is a free floating window (not a modal dialog): you can read it and keep working in the application
function openHelp(topicId) {
  var w = document.getElementById("helpWindow");
  if (!w) return;
  function go() {
    helpBuildList();
    helpOpenTopic(topicId || helpState.current || "start");
    if (w.style.display === "none") { w.style.display = "flex"; helpPlaceWindow(w); }
    w.style.zIndex = "5000";
  }
  if (helpState.topics) { go(); return; }
  helpFetch("help/index.json", function(text) {
    try { helpState.topics = JSON.parse(text).topics; } catch (e) { helpState.topics = []; }
    go();
  });
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", function() {
    var w = document.createElement("div");
    w.id = "helpWindow";
    w.style.cssText = "display:none;position:fixed;flex-direction:column;min-width:480px;min-height:320px;resize:both;overflow:hidden;" +
      "background:#1d2530;color:#dfe6ee;border:1px solid #4a5a70;border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,.5);z-index:5000;font-size:14px;";
    w.innerHTML = '<div id="helpTitleBar" style="flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:6px 10px;background:#2b3645;cursor:move;user-select:none;">' +
      '<i class="fas fa-fw fa-question-circle"></i><b style="flex:1">Help</b>' +
      '<button id="helpCloseBtn" type="button" title="Close" style="background:none;border:0;color:inherit;font-size:18px;cursor:pointer;line-height:1;">&times;</button></div>' +
      '<div style="flex:1;display:flex;min-height:0;">' +
      '<nav id="helpTopicList" style="flex:0 0 210px;overflow:auto;border-right:1px solid #3a4656;padding:8px 0;"></nav>' +
      '<div id="helpContent" style="flex:1;overflow:auto;padding:10px 18px;"></div></div>' +
      '<style>#helpTopicList a{display:block;padding:6px 14px;color:inherit;text-decoration:none}' +
      '#helpTopicList a:hover{background:rgba(79,179,255,.15)}#helpTopicList a.active{background:rgba(79,179,255,.30);font-weight:600}' +
      '#helpContent a{color:#6cc0ff}#helpContent h1{font-size:22px;margin:4px 0 10px}#helpContent h2{font-size:17px;margin:16px 0 6px}#helpContent h3{font-size:14px;margin:12px 0 4px}' +
      '#helpContent p{margin:6px 0}#helpContent code{background:rgba(127,127,127,.25);padding:0 4px;border-radius:3px}' +
      '#helpContent blockquote{margin:8px 0;padding:6px 12px;border-left:4px solid #4fb3ff;background:rgba(79,179,255,.10)}#helpContent li{margin:2px 0}</style>';
    document.body.appendChild(w);

    // drag by the title bar
    var drag = null;
    document.getElementById("helpTitleBar").addEventListener("mousedown", function(e) {
      if (e.target.id === "helpCloseBtn") return;
      drag = { dx: e.clientX - w.offsetLeft, dy: e.clientY - w.offsetTop };
      e.preventDefault();
    });
    document.addEventListener("mousemove", function(e) {
      if (!drag) return;
      w.style.left = (e.clientX - drag.dx) + "px";
      w.style.top = (e.clientY - drag.dy) + "px";
    });
    document.addEventListener("mouseup", function() { if (drag) { drag = null; helpClamp(w); helpSaveGeometry(); } });
    document.getElementById("helpCloseBtn").addEventListener("click", helpClose);
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(function() { helpSaveGeometry(); }).observe(w);
    window.addEventListener("resize", function() { if (w.style.display !== "none") helpClamp(w); });

    // links inside the help (capture phase, delegated)
    document.addEventListener("click", function(e) {
      var a = e.target.closest ? e.target.closest("a.help-link") : null;
      if (a && a.closest("#helpTopicList, #helpContent")) { e.preventDefault(); helpOpenTopic(a.getAttribute("data-topic")); }
    }, true);
    document.addEventListener("keydown", function(e) {
      if (e.key === "F1") { e.preventDefault(); openHelp(); }
    });
  });
}
