/* ============================================================
   site.js — shared behaviour for every page
   · writes the current year into [data-year] spans
   · GA4 is disabled until the real Measurement ID is set below
     (TODO 上线前替换 G-XXXXXXXXXX 为真实 GA4 媒体资源 ID)
   · injects an "Export result" bar on converter pages and
     renders a print-to-PDF report from the live page state
   ============================================================ */
(function(){
  'use strict';

  var SITE_ID = 'G-XXXXXXXXXX';

  var year = document.querySelector('[data-year]');
  if(year){ year.textContent = new Date().getFullYear(); }

  if(SITE_ID.indexOf('XXXX') !== -1){ return; }

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + SITE_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', SITE_ID);
})();

/* ============================================================
   Export module — converter pages only.
   Reads the live DOM (inputs, method, readouts, verdict,
   sources) into a print-only report; the browser's "Save as
   PDF" produces the deliverable. No third-party libraries.
   ============================================================ */
(function(){
  'use strict';
  var conv = document.querySelector('.conv') || document.querySelector('.tool');
  if(!conv){ return; }

  function text(el){
    return el ? el.textContent.replace(/\s+/g,' ').trim() : '';
  }
  function esc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function dateStr(){
    var d = new Date();
    return d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  }

  /* active method: checked radio nested in a .m label (works for
     name="method" and name="dir" alike) */
  function activeMethod(){
    var checked = document.querySelector('.conv input[type=radio]:checked');
    if(!checked){ return { name:'', note:'' }; }
    var m = checked.closest('.m');
    if(!m){ return { name:'', note:'' }; }
    var nameEl = m.querySelector('.m-name');
    var noteEl = m.querySelector('.m-note');
    return { name: text(nameEl), note: text(noteEl) };
  }

  /* input(s): visible number fields and selects inside the left pane */
  function inputs(){
    var pane = conv.querySelector('.pane-in') || conv.querySelector('.side-in');
    if(!pane){ return []; }
    var out = [];
    var fields = pane.querySelectorAll('input[type=number], select, input[type=text]');
    Array.prototype.forEach.call(fields, function(f){
      if(f.offsetParent === null){ return; } /* hidden sub-field */
      var label = f.labels && f.labels.length ? text(f.labels[0]) : (f.previousElementSibling && f.previousElementSibling.tagName === 'LABEL' ? text(f.previousElementSibling) : '');
      var val = f.value;
      if(val === ''){ return; }
      out.push({ label: label || 'Value', value: val });
    });
    return out;
  }

  /* readouts: every .readout in the right pane */
  function readouts(){
    var pane = conv.querySelector('.pane-out') || conv.querySelector('.side-out');
    if(!pane){ return []; }
    var out = [];
    Array.prototype.forEach.call(pane.querySelectorAll('.readout'), function(r){
      var l = r.querySelector('.r-label');
      var v = r.querySelector('.r-value');
      out.push({ label: text(l), value: text(v) });
    });
    return out;
  }

  function workload(){
    var w = conv.querySelector('.workload');
    if(!w){ return []; }
    var out = [];
    Array.prototype.forEach.call(w.children, function(line){
      out.push(text(line));
    });
    return out;
  }

  function verdict(){
    var v = document.querySelector('.gverdict') || document.querySelector('.verdict');
    var n = document.querySelector('.gverdict-note') || document.querySelector('.verdict-note');
    var tag = document.querySelector('.verdictbox-tag') || document.querySelector('.ladder-tag');
    return { tag: text(tag), main: text(v), note: text(n) };
  }

  function sources(){
    var box = document.querySelector('.sources');
    if(!box){ return []; }
    var out = [];
    Array.prototype.forEach.call(box.querySelectorAll('li'), function(li){
      var what = li.querySelector('.what');
      var who = li.querySelector('.who');
      if(!what && !who){ return; }
      out.push({ what: text(what), who: text(who) });
    });
    var verified = box.querySelector('.verified');
    return { rows: out, verified: text(verified) };
  }

  function buildReport(){
    var h1 = document.querySelector('h1');
    var method = activeMethod();
    var ins = inputs();
    var outs = readouts();
    var wrk = workload();
    var v = verdict();
    var src = sources();
    var disclaimers = document.querySelector('.warn, .foot-note');

    var h = '';
    h += '<div class="pr-brand">CreditLab<small>transcripts, translated</small></div>';
    h += '<div class="pr-title">' + esc(text(h1)) + '</div>';
    h += '<div class="pr-meta">Generated ' + dateStr() + ' · result is an estimate, not an official evaluation</div>';

    h += '<table class="pr-table">';
    ins.forEach(function(inp){
      h += '<tr><th>' + esc(inp.label) + '</th><td>' + esc(inp.value) + '</td></tr>';
    });
    if(method.name){
      h += '<tr><th>Method</th><td>' + esc(method.name) + (method.note ? ' — ' + esc(method.note) : '') + '</td></tr>';
    }
    outs.forEach(function(o){
      h += '<tr><th>' + esc(o.label) + '</th><td>' + esc(o.value) + '</td></tr>';
    });
    if(wrk.length){
      h += '<tr><th>Details</th><td>' + wrk.map(function(line){ return esc(line); }).join('<br>') + '</td></tr>';
    }
    h += '</table>';

    if(v.main){
      h += '<div class="pr-verdict">';
      if(v.tag){ h += '<div class="pr-verdict-tag">' + esc(v.tag) + '</div>'; }
      h += '<div class="pr-verdict-main">' + esc(v.main) + '</div>';
      if(v.note){ h += '<div class="pr-verdict-note">' + esc(v.note) + '</div>'; }
      h += '</div>';
    }

    if(src && src.rows.length){
      h += '<div class="pr-h2">Where the figures come from</div>';
      h += '<ul class="pr-sources">';
      src.rows.forEach(function(r){
        h += '<li><strong>' + esc(r.what) + '</strong> — ' + esc(r.who) + '</li>';
      });
      h += '</ul>';
      if(src.verified){ h += '<p style="margin:8px 0 0;font-size:11px;color:#555">' + esc(src.verified) + '</p>'; }
    }

    h += '<div class="pr-disclaimer">Estimates only — formal recognition is decided by the receiving institution. Generated with CreditLab (https://example.com), a free transcript conversion tool. This printout is for planning and correspondence; it is not an official credential evaluation.</div>';
    h += '<div class="pr-url">' + esc(window.location.href) + '</div>';

    return h;
  }

  /* inject the export bar before .related (or after the converter) */
  function inject(){
    var bar = document.createElement('div');
    bar.className = 'export-bar';
    bar.innerHTML = '<button type="button">Export this result</button><span class="export-hint">Prints a one-page summary with your numbers, the method used, the verdict and the cited sources — save it as a PDF and attach it to an application email.</span>';

    var related = document.querySelector('.related');
    var anchor = related || conv;
    anchor.parentNode.insertBefore(bar, related ? related : conv.nextSibling);

    bar.querySelector('button').addEventListener('click', function(){
      var existing = document.getElementById('print-report');
      if(existing){ existing.parentNode.removeChild(existing); }
      var node = document.createElement('div');
      node.id = 'print-report';
      node.innerHTML = buildReport();
      document.body.appendChild(node);
      window.print();
    });
  }

  inject();
})();
