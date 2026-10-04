/* ============================================================
   fermat-quest 進捗管理・クイズ判定（章ごと）
   quest-template（design-system.css）の見た目に対して、
   ステージ一覧の描画・localStorageでの進捗保存・クイズ正誤判定を行う。
   章（フォルダ）ごとに進捗を分けて保存する。
   ============================================================ */
(function (global) {
  "use strict";

  var BOOK_RECOMMEND = {
    title: "Amazonで「フェルマーの最終定理」の本を探す（証明の物語・数論の入門書）",
    url: "https://www.amazon.co.jp/s?k=%E3%83%95%E3%82%A7%E3%83%AB%E3%83%9E%E3%83%BC%E3%81%AE%E6%9C%80%E7%B5%82%E5%AE%9A%E7%90%86&tag=senjin-22"
  };

  // 章の定義。answers は各ステージのクイズ正解（クイズカードの出現順に、正解の選択肢のインデックス）
  var CHAPTERS = {
    "margin": {
      no: 1, title: "余白の書き込み", next: "number-worlds",
      answers: { 1: [1, 2, 0], 2: [2, 0, 1] },
      stages: [
        { n: 1, title: "余白の書き込み", sub: "整数の直角三角形と円の上の分数の点" },
        { n: 2, title: "どこまでも小さくなる解", sub: "無限降下法で n＝4 を証明する" }
      ]
    },
    "number-worlds": {
      no: 2, title: "数の世界をひろげる", next: "elliptic-curves",
      answers: { 1: [1, 2, 0], 2: [2, 0, 1], 3: [0, 2, 1], 4: [1, 0, 2], 5: [2, 1, 0], 6: [0, 1, 2], 7: [1, 2, 0] },
      stages: [
        { n: 1, title: "ラメの発表", sub: "1 の p 乗根で xᵖ＋yᵖ を分ける" },
        { n: 2, title: "数の世界", sub: "足し算・引き算・掛け算で閉じた世界（環）" },
        { n: 3, title: "単数と既約元", sub: "ノルムで数の大きさを測る" },
        { n: 4, title: "1通りの正体", sub: "素数の性質と素因数分解の一意性" },
        { n: 5, title: "余りのある割り算", sub: "互除法とガウス整数" },
        { n: 6, title: "こわれた素因数分解", sub: "a＋b√−5 の世界と a＋b√−2 の世界" },
        { n: 7, title: "見えない部品", sub: "クンマーの理想数と正則素数" }
      ]
    },
    "elliptic-curves": {
      no: 3, title: "時計の算術と楕円曲線", next: "modularity",
      answers: { 1: [1, 0, 2], 2: [2, 1, 0], 3: [0, 1, 2] },
      stages: [
        { n: 1, title: "時計の算術", sub: "mod の計算と、その限界" },
        { n: 2, title: "点を足す曲線", sub: "楕円曲線と有理点の足し算" },
        { n: 3, title: "曲線の指紋", sub: "mod p で点を数えて aₚ をつくる" }
      ]
    },
    "modularity": {
      no: 4, title: "橋をかける", next: null,
      answers: { 1: [1, 2, 0], 2: [2, 0, 1], 3: [0, 2, 1] },
      stages: [
        { n: 1, title: "もうひとつの数列", sub: "モジュラー形式と谷山–志村予想" },
        { n: 2, title: "ありえない曲線", sub: "フライ曲線とリベットの定理" },
        { n: 3, title: "屋根裏の7年間", sub: "ワイルズの証明" }
      ]
    }
  };
  var ORDER = ["margin", "number-worlds", "elliptic-curves", "modularity"];

  function keyOf(chap) { return "fermatQuest_" + chap + "_v1"; }

  // 9ステージ1本だったころの進捗（fermatQuestProgress_v1）を、章ごとの進捗へ一度だけ移す
  function migrate() {
    try {
      var raw = localStorage.getItem("fermatQuestProgress_v1");
      if (!raw || localStorage.getItem("fermatQuest_migrated")) return;
      var old = JSON.parse(raw) || [];
      var map = { 1: ["margin", 1], 2: ["margin", 2], 4: ["elliptic-curves", 1], 5: ["elliptic-curves", 2], 6: ["elliptic-curves", 3], 7: ["modularity", 1], 8: ["modularity", 2], 9: ["modularity", 3] };
      old.forEach(function (n) { var m = map[n]; if (m) setCleared(m[0], m[1]); });
      localStorage.setItem("fermatQuest_migrated", "1");
    } catch (e) { /* 保存できない環境では移行しない */ }
  }

  function getCleared(chap) {
    try {
      var raw = JSON.parse(localStorage.getItem(keyOf(chap)) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function setCleared(chap, stageNum) {
    var cleared = getCleared(chap);
    if (cleared.indexOf(stageNum) === -1) {
      cleared.push(stageNum);
      try { localStorage.setItem(keyOf(chap), JSON.stringify(cleared)); } catch (e) { /* 保存できない環境 */ }
    }
  }

  function isUnlocked(stageNum, cleared) {
    if (stageNum === 1) return true;
    return cleared.indexOf(stageNum - 1) !== -1 || cleared.indexOf(stageNum) !== -1;
  }

  function renderSidebar(chap, currentStage) {
    var list = document.getElementById("side-list");
    if (!list) return;
    var C = CHAPTERS[chap], cleared = getCleared(chap);
    list.innerHTML = "";
    C.stages.forEach(function (stage) {
      var unlocked = isUnlocked(stage.n, cleared) || stage.n === currentStage;
      var isCleared = cleared.indexOf(stage.n) !== -1;
      var item = document.createElement(unlocked ? "a" : "div");
      item.className = "side-item";
      if (stage.n === currentStage) item.className += " active";
      if (!unlocked) item.className += " locked";
      if (unlocked) {
        item.href = "stage" + stage.n + ".html";
        item.setAttribute("aria-label", stage.title);
      } else {
        item.setAttribute("aria-disabled", "true");
      }
      var icon = isCleared ? "✅" : unlocked ? "🔓" : "🔒";
      item.innerHTML =
        '<span class="side-icon">' + icon + '</span>' +
        '<span class="side-text"><div class="side-main">STAGE' + stage.n + " " + stage.title + '</div>' +
        '<div class="side-sub">' + stage.sub + "</div></span>";
      list.appendChild(item);
    });
  }

  function clearedCount(chap) {
    var total = CHAPTERS[chap].stages.length;
    return getCleared(chap).filter(function (n) { return n >= 1 && n <= total; }).length;
  }

  function updateHeaderProgress(chap) {
    var done = clearedCount(chap), total = CHAPTERS[chap].stages.length;
    var label = document.getElementById("progress-label");
    var fill = document.getElementById("progress-fill");
    if (label) label.textContent = "クリア " + done + " / " + total;
    if (fill) {
      fill.style.width = Math.round((done / total) * 100) + "%";
      if (fill.parentNode && fill.parentNode.setAttribute) fill.parentNode.setAttribute("aria-valuenow", done);
    }
  }

  function markSolved(card) {
    card.setAttribute("data-solved", "true");
    var explain = card.querySelector(".quiz-explain");
    if (explain) explain.hidden = false;
  }

  function allSolved(root) {
    var cards = root.querySelectorAll(".quiz-card[data-quiz]");
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute("data-solved") !== "true") return false;
    }
    return true;
  }

  function track(eventName, params) {
    if (typeof window.gtag === "function") window.gtag("event", eventName, params || {});
  }

  function initQuiz(chap, stageNum, onAllSolved) {
    var answers = CHAPTERS[chap].answers[stageNum] || [];
    var cards = document.querySelectorAll(".quiz-card[data-quiz]");
    // クイズのないステージでは onAllSolved が永久に呼ばれず「次へ」が押せなくなるため、先に解放する
    if (cards.length === 0) { onAllSolved(); return; }
    // 正解表の件数がクイズ数と食い違うと、該当カードが永久に正解できずステージがクリア不能になるので警告する
    if (answers.length !== cards.length && window.console && console.warn) {
      console.warn("[progress] " + chap + " STAGE" + stageNum + ": 正解表の件数(" + answers.length + ")がクイズ数(" + cards.length + ")と一致しません");
    }
    cards.forEach(function (card, cardIndex) {
      var live = document.createElement("p");
      live.className = "sr-only";
      live.setAttribute("aria-live", "polite");
      card.appendChild(live);
      var buttons = card.querySelectorAll(".choice-btn");
      buttons.forEach(function (btn, btnIndex) {
        btn.addEventListener("click", function () {
          if (card.getAttribute("data-solved") === "true") return;
          var correct = answers[cardIndex] === btnIndex;
          live.textContent = correct ? "正解です" : "不正解です。もう一度選んでください";
          if (correct) {
            // 正解のボタンは disabled にせず、フォーカスを保ったまま操作だけ止める
            buttons.forEach(function (b) { if (b !== btn) b.disabled = true; });
            btn.setAttribute("aria-disabled", "true");
            btn.classList.add("choice-ok");
            markSolved(card);
            if (allSolved(document)) onAllSolved();
          } else {
            btn.classList.add("choice-ng");
            track("quiz_wrong", { chapter: chap, stage: stageNum, quiz: cardIndex + 1, choice: btnIndex + 1 });
          }
        });
      });
    });
  }

  function setMissionAchieved() {
    var status = document.getElementById("mission-status");
    if (status) {
      status.textContent = "達成！";
      status.classList.add("ok");
    }
  }

  function showClearBanner() {
    if (document.querySelector(".stage-clear-banner")) return;
    var nav = document.querySelector(".stage-nav");
    if (!nav) return;
    var banner = document.createElement("div");
    banner.className = "stage-clear-banner";
    banner.setAttribute("role", "status");
    banner.textContent = "🎉 STAGE CLEAR!";
    nav.parentNode.insertBefore(banner, nav);
  }

  function enableNext(chap, stageNum) {
    var nextBtn = document.getElementById("btn-next");
    if (nextBtn) nextBtn.disabled = false;
    setCleared(chap, stageNum);
    updateHeaderProgress(chap);
    showClearBanner();
    track("stage_clear", { chapter: chap, stage: stageNum });
    if (clearedCount(chap) === CHAPTERS[chap].stages.length) track("chapter_clear", { chapter: chap });
  }

  function bindResetAll(chap) {
    var btn = document.getElementById("btn-reset-all");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (window.confirm("この章の進捗をリセットして最初からやり直しますか？")) {
        try { localStorage.removeItem(keyOf(chap)); } catch (e) { /* 保存できない環境 */ }
        window.location.href = "index.html";
      }
    });
  }

  function renderBookRecommend() {
    var el = document.getElementById("book-recommend");
    if (!el) return;
    el.innerHTML =
      '<p class="book-recommend-label">参考文献</p>' +
      '<div class="book-recommend-body"><div>' +
      '<p class="book-recommend-lead">もっと深く学びたい方へ</p>' +
      '<a href="' + BOOK_RECOMMEND.url + '" target="_blank" rel="sponsored noopener">' + BOOK_RECOMMEND.title + "</a>" +
      "</div></div>" +
      '<p class="book-recommend-note">※ Amazonのアソシエイトとして、当サイトは適格販売により収入を得ています。</p>';
  }

  function bindSidebarToggle() {
    var shell = document.getElementById("app-shell");
    if (!shell) return;
    function toggleSide() { shell.classList.toggle("side-collapsed"); }
    var t1 = document.getElementById("sidebar-toggle");
    var t2 = document.getElementById("head-nav-toggle");
    var backdrop = document.getElementById("side-backdrop");
    if (t1) t1.addEventListener("click", toggleSide);
    if (t2) t2.addEventListener("click", toggleSide);
    if (backdrop) backdrop.addEventListener("click", function () { shell.classList.add("side-collapsed"); });
  }

  function initStagePage(chap, stageNum) {
    // ロック中でも直URLアクセスは許可する（検索エンジン経由の流入を妨げないため）
    migrate();
    document.addEventListener("DOMContentLoaded", function () {
      var cleared = getCleared(chap);
      renderSidebar(chap, stageNum);
      updateHeaderProgress(chap);
      bindResetAll(chap);
      bindSidebarToggle();
      renderBookRecommend();

      var nextBtn = document.getElementById("btn-next");
      if (cleared.indexOf(stageNum) !== -1) {
        document.querySelectorAll(".quiz-card[data-quiz]").forEach(function (card) {
          markSolved(card);
          card.querySelectorAll(".choice-btn").forEach(function (b) { b.disabled = true; });
        });
        setMissionAchieved();
        if (nextBtn) nextBtn.disabled = false;
      } else if (!allSolved(document)) {
        if (nextBtn) nextBtn.disabled = true;
      }

      initQuiz(chap, stageNum, function () {
        setMissionAchieved();
        enableNext(chap, stageNum);
      });

      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          var stages = CHAPTERS[chap].stages;
          window.location.href = stageNum < stages.length ? "stage" + (stageNum + 1) + ".html" : "complete.html";
        });
      }
    });
  }

  function initCompletePage(chap) {
    migrate();
    if (clearedCount(chap) < CHAPTERS[chap].stages.length) {
      window.location.replace("index.html");
      return;
    }
    document.addEventListener("DOMContentLoaded", function () {
      bindResetAll(chap);
      renderBookRecommend();
    });
  }

  function initCoverPage(chap) {
    migrate();
    document.addEventListener("DOMContentLoaded", function () {
      var cleared = getCleared(chap);
      document.querySelectorAll(".quest-card[data-stage]").forEach(function (card) {
        var n = parseInt(card.getAttribute("data-stage"), 10);
        if (!isUnlocked(n, cleared)) {
          card.classList.add("locked");
          card.removeAttribute("href");
        }
        if (cleared.indexOf(n) !== -1) {
          card.classList.add("cleared");
          var cta = card.querySelector(".q-cta");
          if (cta) cta.textContent = "クリア済み ✓";
        }
      });
      renderBookRecommend();
    });
  }

  // シリーズマップ：各章の進み具合を表示する
  function initSeriesPage() {
    migrate();
    document.addEventListener("DOMContentLoaded", function () {
      document.querySelectorAll("[data-chapter]").forEach(function (el) {
        var chap = el.getAttribute("data-chapter"), C = CHAPTERS[chap];
        if (!C) return;
        var done = clearedCount(chap), total = C.stages.length;
        var badge = el.querySelector(".ch-progress");
        if (badge) badge.textContent = done === total ? "クリア済み ✓" : "クリア " + done + " / " + total;
        if (done === total) el.classList.add("cleared");
      });
      renderBookRecommend();
    });
  }

  global.FQ = {
    CHAPTERS: CHAPTERS,
    ORDER: ORDER,
    getCleared: getCleared,
    initStagePage: initStagePage,
    initCoverPage: initCoverPage,
    initCompletePage: initCompletePage,
    initSeriesPage: initSeriesPage
  };
})(window);
