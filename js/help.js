// Swarfly in-app help. Topics are Markdown files: help/en/<id>.md and help/cs/<id>.md (Czech falls back to English when a file is missing),
// list of topics in help/index.json, release notes in CHANGELOG.md (English). Open with the Help button (Settings tab) or F1.
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

function openHelp(topicId) {
  var dlg = document.getElementById("helpDialog");
  if (!dlg) return;
  function go() {
    helpBuildList();
    helpOpenTopic(topicId || helpState.current || "start");
    Metro.dialog.open("#helpDialog");
  }
  if (helpState.topics) { go(); return; }
  helpFetch("help/index.json", function(text) {
    try { helpState.topics = JSON.parse(text).topics; } catch (e) { helpState.topics = []; }
    go();
  });
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", function() {
    var dlg = document.createElement("div");
    dlg.id = "helpDialog";
    dlg.className = "dialog dark";
    dlg.setAttribute("data-role", "dialog");
    dlg.setAttribute("data-overlay-click-close", "true");
    dlg.setAttribute("data-to-top", "true");
    dlg.style.cssText = "width:min(980px,94vw);max-width:94vw;";
    dlg.innerHTML = '<div class="dialog-title"><i class="fas fa-fw fa-question-circle"></i> Help</div>' +
      '<div class="dialog-content" style="padding:0;">' +
      '<div style="display:flex;height:min(620px,72vh);">' +
      '<nav id="helpTopicList" style="flex:0 0 220px;overflow:auto;border-right:1px solid #3a4656;padding:8px 0;"></nav>' +
      '<div id="helpContent" style="flex:1;overflow:auto;padding:10px 18px;"></div></div></div>' +
      '<div class="dialog-actions"><button class="button js-dialog-close">Close</button></div>' +
      '<style>#helpTopicList a{display:block;padding:6px 14px;color:inherit;text-decoration:none}' +
      '#helpTopicList a:hover{background:rgba(79,179,255,.15)}#helpTopicList a.active{background:rgba(79,179,255,.30);font-weight:600}' +
      '#helpContent h1{font-size:22px;margin:4px 0 10px}#helpContent h2{font-size:17px;margin:16px 0 6px}#helpContent h3{font-size:14px;margin:12px 0 4px}' +
      '#helpContent code{background:rgba(127,127,127,.25);padding:0 4px;border-radius:3px}#helpContent blockquote{margin:8px 0;padding:6px 12px;border-left:4px solid #4fb3ff;background:rgba(79,179,255,.10)}' +
      '#helpContent li{margin:2px 0}</style>';
    document.body.appendChild(dlg);
    // delegated on document: Metro may re-parent the dialog, so listeners on the element itself are not reliable
    document.addEventListener("click", function(e) {
      var a = e.target.closest ? e.target.closest("a.help-link") : null;
      if (a && a.closest("#helpTopicList, #helpContent")) { e.preventDefault(); helpOpenTopic(a.getAttribute("data-topic")); }
    }, true);   // capture phase: Metro stops click propagation inside dialogs
    document.addEventListener("keydown", function(e) {
      if (e.key === "F1") { e.preventDefault(); openHelp(); }
    });
  });
}
