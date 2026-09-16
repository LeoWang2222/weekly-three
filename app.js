/* 这周值得 —— 每周三件事:一个目标、一份期待、一个没有白过的理由 */
(function () {
  'use strict';

  var STORE_KEY = 'worth-a-week-v1';

  /* ---------- 数据 ---------- */
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE_KEY));
      if (d && d.weeks) return d;
    } catch (e) {}
    return { v: 1, weeks: {} };
  }
  var state = load();
  var saveTimer = null;

  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    var hint = document.getElementById('save-hint');
    hint.textContent = '已自动保存 ✓';
    hint.style.opacity = 1;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { hint.style.opacity = 0; }, 1200);
  }

  function getWeek(key) {
    return state.weeks[key] || { goal: '', anticipation: '', highlight: '', done: false };
  }
  function hasContent(key) {
    var w = state.weeks[key];
    return !!(w && (w.goal.trim() || w.anticipation.trim() || w.highlight.trim()));
  }

  /* ---------- ISO 周计算(周一为一周开始) ---------- */
  function isoWeek(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return { year: d.getUTCFullYear(), week: week };
  }
  function weekKeyOf(date) {
    var w = isoWeek(date);
    return w.year + '-W' + (w.week < 10 ? '0' : '') + w.week;
  }
  function mondayOfKey(key) {
    var p = key.split('-W');
    var y = +p[0], w = +p[1];
    var jan4 = new Date(Date.UTC(y, 0, 4));
    var day = jan4.getUTCDay() || 7;
    var mon = new Date(jan4);
    mon.setUTCDate(jan4.getUTCDate() - day + 1 + (w - 1) * 7);
    return mon;
  }
  function shiftKey(key, weeks) {
    var mon = mondayOfKey(key);
    mon.setUTCDate(mon.getUTCDate() + weeks * 7);
    return weekKeyOf(new Date(mon.getUTCFullYear(), mon.getUTCMonth(), mon.getUTCDate()));
  }
  function fmtRange(key) {
    var mon = mondayOfKey(key);
    var sun = new Date(mon);
    sun.setUTCDate(mon.getUTCDate() + 6);
    function f(d) { return d.getUTCMonth() + 1 + '月' + d.getUTCDate() + '日'; }
    return f(mon) + ' – ' + f(sun);
  }
  function fmtKey(key) {
    var p = key.split('-W');
    return p[0] + ' 第' + parseInt(p[1], 10) + '周';
  }
  function weeksInYear(y) {
    return isoWeek(new Date(Date.UTC(y, 11, 28))).week;
  }

  var todayKey = weekKeyOf(new Date());
  var viewKey = todayKey;
  var viewYear = isoWeek(new Date()).year;

  function $(id) { return document.getElementById(id); }

  /* ---------- 本周视图 ---------- */
  var fields = { goal: $('f-goal'), anticipation: $('f-anticipation'), highlight: $('f-highlight') };

  function autoGrow(t) {
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 'px';
  }

  function renderWeek() {
    $('week-label').textContent = fmtKey(viewKey) + (viewKey === todayKey ? ' · 本周' : '');
    $('week-range').textContent = fmtRange(viewKey);
    $('next-week').disabled = (viewKey === todayKey);
    var w = getWeek(viewKey);
    fields.goal.value = w.goal;
    fields.anticipation.value = w.anticipation;
    fields.highlight.value = w.highlight;
    $('f-done').checked = !!w.done;
    $('done-wrap').hidden = !w.goal.trim();
    autoGrow(fields.goal); autoGrow(fields.anticipation); autoGrow(fields.highlight);
    window.scrollTo(0, 0);
  }

  Object.keys(fields).forEach(function (name) {
    fields[name].addEventListener('input', function () {
      var w = getWeek(viewKey);
      w[name] = fields[name].value;
      state.weeks[viewKey] = w;
      if (name === 'goal') $('done-wrap').hidden = !w.goal.trim();
      autoGrow(fields[name]);
      save();
    });
  });

  $('f-done').addEventListener('change', function () {
    var w = getWeek(viewKey);
    w.done = $('f-done').checked;
    state.weeks[viewKey] = w;
    save();
  });

  $('prev-week').addEventListener('click', function () { viewKey = shiftKey(viewKey, -1); renderWeek(); });
  $('next-week').addEventListener('click', function () {
    if (viewKey !== todayKey) { viewKey = shiftKey(viewKey, 1); renderWeek(); }
  });

  /* ---------- 时光轴 ---------- */
  function renderTimeline() {
    var list = $('timeline-list');
    list.innerHTML = '';
    var keys = Object.keys(state.weeks).filter(hasContent).sort().reverse();
    $('timeline-empty').hidden = keys.length > 0;
    keys.forEach(function (key) {
      var w = getWeek(key);
      var card = document.createElement('div');
      card.className = 'tl-card';
      var html = '<div class="tl-head"><span class="tl-week">' + fmtKey(key) + '</span>' +
        '<span class="tl-range">' + fmtRange(key) + '</span></div>';
      if (w.goal.trim()) {
        html += '<div class="tl-item"><div class="tl-q">🎯 想完成' +
          (w.done ? '<span class="tl-badge">完成了 ✓</span>' : '') + '</div>' +
          '<div class="tl-a' + (w.done ? ' done' : '') + '">' + esc(w.goal) + '</div></div>';
      }
      if (w.anticipation.trim()) {
        html += '<div class="tl-item"><div class="tl-q">✨ 最期待</div>' +
          '<div class="tl-a">' + esc(w.anticipation) + '</div></div>';
      }
      if (w.highlight.trim()) {
        html += '<div class="tl-item"><div class="tl-q">🌅 没有白过,因为</div>' +
          '<div class="tl-a">' + esc(w.highlight) + '</div></div>';
      }
      card.innerHTML = html;
      list.appendChild(card);
    });
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- 年度 ---------- */
  function renderYear() {
    $('year-label').textContent = viewYear + ' 年';
    $('next-year').disabled = (viewYear >= isoWeek(new Date()).year);

    var count = 0, doneCount = 0;
    var highlights = [];
    Object.keys(state.weeks).forEach(function (key) {
      if (+key.split('-W')[0] !== viewYear || !hasContent(key)) return;
      count++;
      var w = getWeek(key);
      if (w.done && w.goal.trim()) doneCount++;
      if (w.highlight.trim()) highlights.push({ key: key, text: w.highlight });
    });
    $('stat-weeks').textContent = count;
    $('stat-done').textContent = doneCount;
    $('stat-streak').textContent = streak();

    // 52/53 格圆点
    var grid = $('year-grid');
    grid.innerHTML = '';
    var total = weeksInYear(viewYear);
    for (var i = 1; i <= total; i++) {
      var key = viewYear + '-W' + (i < 10 ? '0' : '') + i;
      var dot = document.createElement('div');
      dot.className = 'dot' + (hasContent(key) ? ' full' : '') + (key === todayKey ? ' now' : '');
      dot.title = fmtKey(key);
      grid.appendChild(dot);
    }

    // 「没有白过」合集
    var box = $('year-highlights');
    box.innerHTML = '';
    highlights.sort(function (a, b) { return a.key < b.key ? 1 : -1; });
    $('year-empty').hidden = highlights.length > 0;
    highlights.forEach(function (h) {
      var item = document.createElement('div');
      item.className = 'hl-item';
      item.innerHTML = '<span class="hl-week">' + fmtKey(h.key).replace(viewYear + ' ', '') + '</span>' +
        '<span class="hl-text">' + esc(h.text) + '</span>';
      box.appendChild(item);
    });
  }

  // 连续记录:以「填写了没有白过」为准;本周未填则从上周往回数
  function streak() {
    var key = todayKey, n = 0;
    if (!getWeek(key).highlight.trim()) key = shiftKey(key, -1);
    while (getWeek(key).highlight.trim()) { n++; key = shiftKey(key, -1); }
    return n;
  }

  $('prev-year').addEventListener('click', function () { viewYear--; renderYear(); });
  $('next-year').addEventListener('click', function () {
    if (viewYear < isoWeek(new Date()).year) { viewYear++; renderYear(); }
  });

  /* ---------- Tab 切换 ---------- */
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
      ['view-week', 'view-timeline', 'view-year'].forEach(function (id) {
        $(id).hidden = (id !== tab.dataset.view);
      });
      if (tab.dataset.view === 'view-timeline') renderTimeline();
      if (tab.dataset.view === 'view-year') renderYear();
    });
  });

  /* ---------- 菜单 ---------- */
  function openSheet(sheet, mask) { sheet.hidden = false; mask.hidden = false; }
  function closeSheet(sheet, mask) { sheet.hidden = true; mask.hidden = true; }
  var menuSheet = $('menu-sheet'), menuMask = $('menu-mask');
  var aboutSheet = $('about-sheet'), aboutMask = $('about-mask');

  $('menu-btn').addEventListener('click', function () { openSheet(menuSheet, menuMask); });
  menuMask.addEventListener('click', function () { closeSheet(menuSheet, menuMask); });
  $('m-cancel').addEventListener('click', function () { closeSheet(menuSheet, menuMask); });
  $('m-about').addEventListener('click', function () {
    closeSheet(menuSheet, menuMask);
    openSheet(aboutSheet, aboutMask);
  });
  aboutMask.addEventListener('click', function () { closeSheet(aboutSheet, aboutMask); });
  $('about-close').addEventListener('click', function () { closeSheet(aboutSheet, aboutMask); });

  function download(filename, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  $('m-export').addEventListener('click', function () {
    closeSheet(menuSheet, menuMask);
    download('worth-a-week-backup.json', JSON.stringify(state, null, 2), 'application/json');
  });

  $('m-import').addEventListener('click', function () {
    closeSheet(menuSheet, menuMask);
    $('import-file').click();
  });
  $('import-file').addEventListener('change', function (e) {
    var file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var d = JSON.parse(reader.result);
        if (!d || typeof d.weeks !== 'object') throw new Error('bad file');
        state = { v: 1, weeks: d.weeks };
        save();
        renderWeek();
        alert('导入成功 ✓');
      } catch (err) {
        alert('导入失败:文件格式不对');
      }
    };
    reader.readAsText(file);
  });

  // 每周日 21:00 日历提醒(.ics 订阅文件)
  $('m-ics').addEventListener('click', function () {
    closeSheet(menuSheet, menuMask);
    var now = new Date();
    var d = new Date(now);
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); // 本周日;今天若是周日也取下周日
    if (d <= now) d.setDate(d.getDate() + 7);
    d.setHours(21, 0, 0, 0);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    var start = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + 'T' + p(d.getHours()) + p(d.getMinutes()) + '00';
    var stamp = now.getUTCFullYear() + p(now.getUTCMonth() + 1) + p(now.getUTCDate()) +
      'T' + p(now.getUTCHours()) + p(now.getUTCMinutes()) + p(now.getUTCSeconds()) + 'Z';
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//worth-a-week//ZH-CN',
      'BEGIN:VEVENT',
      'UID:worth-a-week-sunday@local',
      'DTSTAMP:' + stamp,
      'DTSTART:' + start,
      'RRULE:FREQ=WEEKLY;BYDAY=SU',
      'SUMMARY:这周值得 · 周日回顾',
      'DESCRIPTION:花两分钟:这周因为哪件事没有白过?顺便写下下周的目标与期待。',
      'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:周日回顾', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    download('worth-a-week-reminder.ics', ics, 'text/calendar');
  });

  /* ---------- 启动 ---------- */
  renderWeek();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
