/* ============================================================
   fermat-quest 共通ライブラリ（FL）
   canvas の用意、分数（BigInt）の計算、mod の計算、表示用の整形をまとめる。
   ============================================================ */
(function (global) {
  "use strict";

  var FL = {};

  /* ---------- 色（design-system.css の配色に合わせる） ---------- */
  FL.C = {
    ink: "#1c2b26", muted: "#6b837a", grid: "#e6e0d6", axis: "#b9b0a3",
    theme: "#41846b", themeLight: "#7fc0a8", themeDark: "#2e5f4d",
    gold: "#9a6a1c", goldLight: "#e3bd6a", red: "#c8433f", blue: "#3f6fb5", paper: "#fdfbf6"
  };

  /* ---------- canvas ---------- */

  // 幅いっぱい・縦横比固定のキャンバスを用意し、リサイズ時に draw(st) を呼ぶ
  FL.canvas = function (id, aspect, draw) {
    var cv = document.getElementById(id);
    if (!cv) return null;
    var ctx = cv.getContext("2d");
    var st = { cv: cv, ctx: ctx, W: 0, H: 0, aspect: aspect };
    function resize() {
      var w = cv.clientWidth || (cv.parentNode && cv.parentNode.clientWidth) || 320;
      var a = typeof st.aspect === "function" ? st.aspect(w) : st.aspect;
      var h = Math.round(w * a);
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.W = w; st.H = h;
      draw(st);
    }
    window.addEventListener("resize", resize);
    st.redraw = function () { draw(st); };
    st.resize = resize;
    resize();
    return st;
  };

  // 数学座標 → canvas 座標。span: 短い辺に収めたい数学上の幅、(cx,cy): 中央に置く点
  FL.view = function (st, span, cx, cy) {
    var s = Math.min(st.W, st.H) / span;
    return {
      s: s,
      X: function (x) { return st.W / 2 + (x - cx) * s; },
      Y: function (y) { return st.H / 2 - (y - cy) * s; },
      inv: function (px, py) { return { x: (px - st.W / 2) / s + cx, y: -(py - st.H / 2) / s + cy }; }
    };
  };

  FL.line = function (ctx, x1, y1, x2, y2, color, w, dash) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = w || 1;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  };

  FL.dot = function (ctx, x, y, r, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  };

  FL.text = function (ctx, s, x, y, opt) {
    opt = opt || {};
    ctx.save();
    ctx.font = (opt.weight || 800) + " " + (opt.size || 12) + "px " + (opt.font || "system-ui, 'Hiragino Sans', 'Yu Gothic', sans-serif");
    ctx.fillStyle = opt.color || FL.C.ink;
    ctx.textAlign = opt.align || "left";
    ctx.textBaseline = opt.base || "alphabetic";
    if (opt.halo) { ctx.lineWidth = 4; ctx.strokeStyle = "rgba(253,251,246,.92)"; ctx.lineJoin = "round"; ctx.strokeText(s, x, y); }
    ctx.fillText(s, x, y);
    ctx.restore();
  };

  // 方眼と軸
  FL.axes = function (ctx, st, v, step, opt) {
    opt = opt || {};
    var a = v.inv(0, 0), b = v.inv(st.W, st.H);
    ctx.save();
    if (step) {
      ctx.strokeStyle = FL.C.grid; ctx.lineWidth = 1;
      for (var x = Math.ceil(a.x / step) * step; x <= b.x; x += step) { ctx.beginPath(); ctx.moveTo(v.X(x), 0); ctx.lineTo(v.X(x), st.H); ctx.stroke(); }
      for (var y = Math.ceil(b.y / step) * step; y <= a.y; y += step) { ctx.beginPath(); ctx.moveTo(0, v.Y(y)); ctx.lineTo(st.W, v.Y(y)); ctx.stroke(); }
    }
    ctx.strokeStyle = FL.C.axis; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(0, v.Y(0)); ctx.lineTo(st.W, v.Y(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(v.X(0), 0); ctx.lineTo(v.X(0), st.H); ctx.stroke();
    if (opt.labels !== false) {
      FL.text(ctx, "x", st.W - 10, v.Y(0) - 6, { color: FL.C.muted, align: "right" });
      FL.text(ctx, "y", v.X(0) + 6, 14, { color: FL.C.muted });
    }
    ctx.restore();
  };

  // y² = f(x) の曲線を、上半分と下半分に分けて描く。f の符号が変わるところは二分法で根を求め、
  // 曲線が x 軸で途切れずに閉じるようにする
  FL.plotY2 = function (ctx, f, x0, x1, X, Y, steps) {
    steps = steps || 1200;
    function root(a, b) {
      for (var i = 0; i < 50; i++) { var m = (a + b) / 2; if ((f(a) >= 0) === (f(m) >= 0)) a = m; else b = m; }
      return (a + b) / 2;
    }
    [1, -1].forEach(function (sg) {
      var on = false, px = x0;
      ctx.beginPath();
      for (var i = 0; i <= steps; i++) {
        var x = x0 + i * (x1 - x0) / steps, v = f(x);
        if (v < 0) {
          if (on) { ctx.lineTo(X(root(px, x)), Y(0)); ctx.stroke(); ctx.beginPath(); on = false; }
        } else {
          if (!on) { var r = i ? root(px, x) : x; ctx.moveTo(X(r), Y(i ? 0 : sg * Math.sqrt(v))); on = true; }
          ctx.lineTo(X(x), Y(sg * Math.sqrt(v)));
        }
        px = x;
      }
      if (on) ctx.stroke();
    });
  };

  /* ---------- 整数・分数（BigInt） ---------- */

  FL.gcd = function (a, b) {
    a = a < 0n ? -a : a; b = b < 0n ? -b : b;
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  };
  FL.gcdN = function (a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  };

  // 分数 {n, d}（d > 0、約分済み）
  FL.Q = function (n, d) {
    n = BigInt(n); d = d === undefined ? 1n : BigInt(d);
    if (d === 0n) throw new Error("分母が0の分数は作れません");
    if (d < 0n) { n = -n; d = -d; }
    var g = FL.gcd(n, d) || 1n;
    return { n: n / g, d: d / g };
  };
  FL.qadd = function (a, b) { return FL.Q(a.n * b.d + b.n * a.d, a.d * b.d); };
  FL.qsub = function (a, b) { return FL.Q(a.n * b.d - b.n * a.d, a.d * b.d); };
  FL.qmul = function (a, b) { return FL.Q(a.n * b.n, a.d * b.d); };
  FL.qdiv = function (a, b) {
    if (b.n === 0n) throw new Error("0 で割ることはできません");
    return FL.Q(a.n * b.d, a.d * b.n);
  };
  FL.qneg = function (a) { return FL.Q(-a.n, a.d); };
  FL.qeq = function (a, b) { return a.n === b.n && a.d === b.d; };
  FL.qnum = function (a) { return Number(a.n) / Number(a.d); };
  FL.qstr = function (a) {
    if (a.d === 1n) return a.n < 0n ? "−" + (-a.n) : String(a.n);
    var s = (a.n < 0n ? -a.n : a.n) + "/" + a.d;
    return a.n < 0n ? "−" + s : s;
  };

  /* ---------- mod ---------- */

  FL.mod = function (a, p) { var r = a % p; return r < 0 ? r + p : r; };
  FL.isPrime = function (n) {
    if (n < 2) return false;
    for (var i = 2; i * i <= n; i++) if (n % i === 0) return false;
    return true;
  };
  FL.primes = function (max) {
    var out = [];
    for (var i = 2; i <= max; i++) if (FL.isPrime(i)) out.push(i);
    return out;
  };

  /* ---------- 表示 ---------- */

  FL.signed = function (x) { return x < 0 ? "−" + (-x) : String(x); };
  FL.reducedMotion = function () {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  global.FL = FL;
})(window);
