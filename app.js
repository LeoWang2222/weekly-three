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
    return state.weeks[key] || { goal: '', anticipation: '', highlight: '', done: false, reviewed: false };
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

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- 本周视图 ---------- */
  var fields = { goal: $('f-goal'), anticipation: $('f-anticipation'), highlight: $('f-highlight') };

  function autoGrow(t) {
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 'px';
  }

  function updateShareBtn() {
    $('share-btn').hidden = !fields.highlight.value.trim();
  }

  // 周日/周一的情境提示
  function renderContext() {
    var el = $('week-context');
    var day = new Date().getDay();
    var text = '';
    if (viewKey === todayKey) {
      if (day === 0) text = '今天是周日,花两分钟回顾这周吧 🌅';
      else if (day === 1) text = '新的一周,从一个小目标开始 🎯';
    }
    el.textContent = text;
    el.hidden = !text;
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
    updateShareBtn();
    renderContext();
    renderReview();
    renderCapsule();
    renderBackupNag();
    window.scrollTo(0, 0);
  }

  Object.keys(fields).forEach(function (name) {
    fields[name].addEventListener('input', function () {
      var w = getWeek(viewKey);
      w[name] = fields[name].value;
      state.weeks[viewKey] = w;
      if (name === 'goal') $('done-wrap').hidden = !w.goal.trim();
      if (name === 'highlight') updateShareBtn();
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

  /* ---------- 上周回顾闭环(目标 + 期待) ---------- */
  function renderReview() {
    var prevKey = shiftKey(todayKey, -1);
    var prev = getWeek(prevKey);
    var showGoal = viewKey === todayKey && prev.goal.trim() && !prev.done && !prev.reviewed;
    var showExp = viewKey === todayKey && prev.anticipation.trim() && prev.fulfilled === undefined;
    $('review-goal-block').hidden = !showGoal;
    $('review-exp-block').hidden = !showExp;
    $('review-card').hidden = !(showGoal || showExp);
    if (showGoal) {
      $('review-q-goal').textContent = '上周(' + fmtKey(prevKey).replace(/^\d+ /, '') + ')你想完成:';
      $('review-goal').textContent = prev.goal;
    }
    if (showExp) {
      $('review-exp').textContent = prev.anticipation;
    }
  }

  function answerReview(patch) {
    var prevKey = shiftKey(todayKey, -1);
    var prev = getWeek(prevKey);
    for (var k in patch) prev[k] = patch[k];
    state.weeks[prevKey] = prev;
    save();
    renderReview();
  }
  $('review-yes').addEventListener('click', function () { answerReview({ done: true }); });
  $('review-no').addEventListener('click', function () { answerReview({ reviewed: true }); });
  $('exp-yes').addEventListener('click', function () { answerReview({ fulfilled: true }); });
  $('exp-no').addEventListener('click', function () { answerReview({ fulfilled: false }); });

  /* ---------- 去年这周(时间胶囊) ---------- */
  function renderCapsule() {
    var p = viewKey.split('-W');
    var lastKey = (+p[0] - 1) + '-W' + p[1];
    var card = $('capsule-card');
    if (!hasContent(lastKey)) { card.hidden = true; return; }
    var w = getWeek(lastKey);
    var html = '';
    if (w.goal.trim()) {
      html += '<div class="tl-item"><div class="tl-q">🎯 当时想完成</div>' +
        '<div class="tl-a">' + esc(w.goal) + '</div></div>';
    }
    if (w.anticipation.trim()) {
      html += '<div class="tl-item"><div class="tl-q">✨ 当时最期待</div>' +
        '<div class="tl-a">' + esc(w.anticipation) + '</div></div>';
    }
    if (w.highlight.trim()) {
      html += '<div class="tl-item"><div class="tl-q">🌅 当时的「没有白过」</div>' +
        '<div class="tl-a">' + esc(w.highlight) + '</div></div>';
    }
    $('capsule-body').innerHTML = html;
    card.hidden = false;
  }

  /* ---------- 写作提示库 ---------- */
  var PROMPTS = {
    goal: [
      '这周想推进的一件工作/学习任务',
      '一个想坚持 7 天的小习惯',
      '见一个人,或打一通道电话',
      '整理一个拖了很久的角落',
      '读完一本书的一章',
      '运动三次,每次半小时',
      '把一件难事拆解出第一步',
      '早睡五天',
      '学会一道新菜',
      '处理一件一直回避的事'
    ],
    anticipation: [
      '一顿期待已久的饭',
      '和某个人的见面',
      '一本书 / 一部剧的更新',
      '一个正在路上的快递',
      '周末的一次小出行',
      '一件事即将完成的成就感',
      '可以好好睡一觉的早晨',
      '一场演出或比赛',
      '一个没有任何安排的晚上',
      '发工资的那天'
    ],
    highlight: [
      '这周谁让你笑过?',
      '哪件小事你做到了,值得肯定?',
      '这周学会了什么新东西?',
      '有什么瞬间想感谢?',
      '哪顿饭吃得最开心?',
      '这周帮了谁,或被谁帮了?',
      '身体有没有变好一点?',
      '看了什么好书或好电影?',
      '哪次路上的风景不错?',
      '有什么烦恼其实过去了?',
      '这周最放松的一刻?',
      '完成了什么拖了很久的事?',
      '和谁好好聊了一次天?',
      '有什么意外的小惊喜?',
      '哪笔钱花得特别值?',
      '这周的你比上周强在哪?',
      '有什么习惯坚持下来了?',
      '哪句话打动过你?',
      '吃了什么想再吃一次的?',
      '哪个瞬间觉得「活着真好」?',
      '解决了什么麻烦事?',
      '有没有人对你说了谢谢?',
      '什么事让你觉得自己被需要?',
      '放下了什么执念?',
      '哪一刻完全属于你自己?',
      '工作 / 学习上有什么小进展?',
      '做了什么让未来的自己感谢的事?',
      '这周最勇敢的决定?',
      '哪个家人或老朋友让你想起就暖?',
      '如果给这周配一首 BGM,会是什么?'
    ]
  };

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  var promptPool = {};
  var promptIdx = { goal: 0, anticipation: 0, highlight: 0 };

  function initHints() {
    ['goal', 'anticipation', 'highlight'].forEach(function (name) {
      promptPool[name] = shuffle(PROMPTS[name].slice());
      var chip = $('hint-' + name);
      var field = fields[name];
      function showPrompt() {
        chip.textContent = '💡 ' + promptPool[name][promptIdx[name] % promptPool[name].length];
      }
      chip.addEventListener('click', function () {
        if (!field.value.trim()) {
          field.value = promptPool[name][promptIdx[name] % promptPool[name].length];
          field.dispatchEvent(new Event('input'));
        }
        promptIdx[name]++;
        showPrompt();
      });
      showPrompt();
    });
  }

  /* ---------- 分享卡片 ---------- */
  var SHARE_FONT = '-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

  function wrapText(ctx, text, maxWidth) {
    var lines = [];
    text.split('\n').forEach(function (para) {
      var line = '';
      for (var i = 0; i < para.length; i++) {
        var ch = para[i];
        if (line && ctx.measureText(line + ch).width > maxWidth) {
          lines.push(line);
          line = ch;
        } else {
          line += ch;
        }
      }
      lines.push(line);
    });
    return lines;
  }

  function drawShareCard() {
    var canvas = $('share-canvas');
    var W = 1080, H = 1350, pad = 100;
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');

    var bg = '#f7f3ec', accent = '#d96c47', ink = '#2b2620', muted = '#9a9186', soft = '#f3ddcf';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, W, 14);
    ctx.textBaseline = 'top';

    ctx.fillStyle = accent;
    ctx.font = '600 42px ' + SHARE_FONT;
    ctx.fillText('这周值得', pad, 92);

    ctx.fillStyle = muted;
    ctx.font = '32px ' + SHARE_FONT;
    ctx.textAlign = 'right';
    ctx.fillText(fmtKey(viewKey), W - pad, 98);
    ctx.textAlign = 'left';

    ctx.fillStyle = soft;
    ctx.font = '700 300px Georgia, serif';
    ctx.fillText('“', pad - 14, 270);

    ctx.fillStyle = accent;
    ctx.font = '600 40px ' + SHARE_FONT;
    ctx.fillText('🌅 这周没有白过,因为', pad, 600);

    var content = fields.highlight.value.trim();
    var size = content.length > 120 ? 44 : content.length > 60 ? 52 : 60;
    ctx.fillStyle = ink;
    ctx.font = size + 'px ' + SHARE_FONT;
    var lines = wrapText(ctx, content, W - pad * 2).slice(0, 8);
    var lh = size * 1.75;
    var y = 690;
    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], pad, y);
      y += lh;
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = muted;
    ctx.font = '28px ' + SHARE_FONT;
    ctx.fillText(fmtRange(viewKey) + ' · 每周三件事,一年攒下 52 个「没有白过」', W / 2, H - 132);
    ctx.fillStyle = accent;
    ctx.font = '600 30px ' + SHARE_FONT;
    ctx.fillText('「这周值得」', W / 2, H - 84);
    ctx.textAlign = 'left';
  }

  function showShareOverlay(blob) {
    $('share-img').src = URL.createObjectURL(blob);
    $('share-overlay').hidden = false;
  }

  $('share-btn').addEventListener('click', function () {
    drawShareCard();
    $('share-canvas').toBlob(function (blob) {
      if (!blob) return;
      var file = null;
      try {
        file = new File([blob], 'worth-a-week-' + viewKey + '.png', { type: 'image/png' });
      } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file] }).catch(function (err) {
          if (!err || err.name !== 'AbortError') showShareOverlay(blob);
        });
      } else {
        showShareOverlay(blob);
      }
    }, 'image/png');
  });

  $('share-close').addEventListener('click', function () {
    $('share-overlay').hidden = true;
    URL.revokeObjectURL($('share-img').src);
  });

  /* ---------- 备份提醒:超过 30 天没备份时,本周页顶部出现提醒条 ---------- */
  var THIRTY_DAYS = 30 * 86400000;

  function renderBackupNag() {
    var nag = $('backup-nag');
    var hasAny = Object.keys(state.weeks).some(hasContent);
    var ref = Math.max(state.lastBackupAt || 0, state.backupNagDismissedAt || 0);
    var overdue = Date.now() - ref > THIRTY_DAYS;
    var show = viewKey === todayKey && hasAny && overdue;
    nag.hidden = !show;
    if (show) {
      $('backup-nag-text').textContent = state.lastBackupAt
        ? '💾 已经 ' + Math.floor((Date.now() - state.lastBackupAt) / 86400000) + ' 天没备份了,点我导出一份保险'
        : '💾 还没有备份过,点我导出一份保险';
    }
  }

  $('backup-nag-text').addEventListener('click', function () {
    doExport();
    renderBackupNag();
  });
  $('backup-nag-close').addEventListener('click', function () {
    state.backupNagDismissedAt = Date.now();
    save();
    renderBackupNag();
  });

  /* ---------- 首次引导 ---------- */
  var OB_STEPS = [
    { emoji: '🎯', title: '周一,立一个小目标', text: '「这周我最想完成的一件事」——一件就够,够得着的那种。' },
    { emoji: '✨', title: '给这周一个盼头', text: '写下「这周我最期待的一件事」,等待本身也是快乐。' },
    { emoji: '🌅', title: '周日,回头看', text: '「因为哪件事,这周没有白过?」一年之后,你会攒下 52 个「没有白过」。' }
  ];
  var obStep = 0;

  function renderOb() {
    var s = OB_STEPS[obStep];
    $('ob-emoji').textContent = s.emoji;
    $('ob-title').textContent = s.title;
    $('ob-text').textContent = s.text;
    var dots = $('ob-dots');
    dots.innerHTML = '';
    for (var i = 0; i < OB_STEPS.length; i++) {
      var d = document.createElement('span');
      d.className = 'ob-dot' + (i === obStep ? ' on' : '');
      dots.appendChild(d);
    }
    $('ob-next').textContent = obStep === OB_STEPS.length - 1 ? '开始记录 →' : '下一步';
  }

  function initOnboarding() {
    if (state.seenOnboarding) return;
    $('onboarding').hidden = false;
    renderOb();
    $('ob-next').addEventListener('click', function () {
      if (obStep < OB_STEPS.length - 1) {
        obStep++;
        renderOb();
      } else {
        state.seenOnboarding = true;
        save();
        $('onboarding').hidden = true;
      }
    });
  }

  /* ---------- 安装引导条(仅 iOS Safari、未添加到主屏幕时) ---------- */
  function initInstallBanner() {
    var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
    var standalone = window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    if (!isIOS || standalone || state.installBannerDismissed) return;
    setTimeout(function () { $('install-banner').hidden = false; }, 2500);
    $('install-close').addEventListener('click', function () {
      $('install-banner').hidden = true;
      state.installBannerDismissed = true;
      save();
    });
  }

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
        var expBadge = w.fulfilled === true ? '<span class="tl-badge">如愿 ✓</span>' :
          w.fulfilled === false ? '<span class="tl-badge tl-badge-muted">未如愿</span>' : '';
        html += '<div class="tl-item"><div class="tl-q">✨ 最期待' + expBadge + '</div>' +
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

  /* ---------- 年度 ---------- */
  function renderYear() {
    $('year-label').textContent = viewYear + ' 年';
    $('next-year').disabled = (viewYear >= isoWeek(new Date()).year);

    var count = 0, doneCount = 0, fulfilledCount = 0;
    var highlights = [];
    Object.keys(state.weeks).forEach(function (key) {
      if (+key.split('-W')[0] !== viewYear || !hasContent(key)) return;
      count++;
      var w = getWeek(key);
      if (w.done && w.goal.trim()) doneCount++;
      if (w.fulfilled === true && w.anticipation.trim()) fulfilledCount++;
      if (w.highlight.trim()) highlights.push({ key: key, text: w.highlight });
    });
    $('stat-weeks').textContent = count;
    $('stat-done').textContent = doneCount;
    $('stat-fulfilled').textContent = fulfilledCount;
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

  $('menu-btn').addEventListener('click', function () {
    $('m-export-hint').textContent = state.lastBackupAt
      ? (Math.floor((Date.now() - state.lastBackupAt) / 86400000) === 0
          ? '今天已备份'
          : '上次:' + Math.floor((Date.now() - state.lastBackupAt) / 86400000) + ' 天前')
      : '还没备份过';
    openSheet(menuSheet, menuMask);
  });
  menuMask.addEventListener('click', function () { closeSheet(menuSheet, menuMask); });
  $('m-cancel').addEventListener('click', function () { closeSheet(menuSheet, menuMask); });
  $('m-about').addEventListener('click', function () {
    closeSheet(menuSheet, menuMask);
    openSheet(aboutSheet, aboutMask);
  });
  aboutMask.addEventListener('click', function () { closeSheet(aboutSheet, aboutMask); });
  $('about-close').addEventListener('click', function () { closeSheet(aboutSheet, aboutMask); });

  // 优先调起 iOS 原生分享菜单(可存文件/发微信/AirDrop);不支持则回落为下载
  function exportFile(filename, content, type) {
    var blob = new Blob([content], { type: type });
    var file = null;
    try {
      file = new File([blob], filename, { type: type });
    } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file] }).catch(function () {});
      return;
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function doExport() {
    state.lastBackupAt = Date.now();
    save();
    exportFile('worth-a-week-backup.json', JSON.stringify(state, null, 2), 'application/json');
  }

  $('m-export').addEventListener('click', function () {
    closeSheet(menuSheet, menuMask);
    doExport();
  });

  // 导出 Markdown:按年/周排好的长文,可直接导入笔记软件
  $('m-md').addEventListener('click', function () {
    closeSheet(menuSheet, menuMask);
    var keys = Object.keys(state.weeks).filter(hasContent).sort().reverse();
    if (!keys.length) { alert('还没有记录可导出'); return; }
    var lines = ['# 这周值得 · 记录导出', ''];
    var lastYear = '';
    keys.forEach(function (key) {
      var year = key.split('-W')[0];
      if (year !== lastYear) { lines.push('', '# ' + year + ' 年', ''); lastYear = year; }
      var w = getWeek(key);
      lines.push('## ' + fmtKey(key) + '(' + fmtRange(key) + ')');
      if (w.goal.trim()) lines.push('- 🎯 想完成:' + w.goal.trim() + (w.done ? '(完成了 ✓)' : ''));
      if (w.anticipation.trim()) {
        lines.push('- ✨ 最期待:' + w.anticipation.trim() +
          (w.fulfilled === true ? '(如愿 ✓)' : w.fulfilled === false ? '(未如愿)' : ''));
      }
      if (w.highlight.trim()) lines.push('- 🌅 没有白过,因为:' + w.highlight.trim());
      lines.push('');
    });
    exportFile('worth-a-week.md', lines.join('\n'), 'text/markdown;charset=utf-8');
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
        state = { v: 1, weeks: d.weeks, seenOnboarding: true, installBannerDismissed: true };
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
    exportFile('worth-a-week-reminder.ics', ics, 'text/calendar');
  });

  /* ---------- 启动 ---------- */
  renderWeek();
  initHints();
  initOnboarding();
  initInstallBanner();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
