/* 웹 발표 공통 스크립트 (madebymaid-web-presentation). 고치지 말고 그대로 넣는다.
   필요한 전역: NOTES=[{t:제목,n:대본,s:초}], TOTAL_SEC. 슬라이드 <section class="slide" data-title data-sec data-cum>. */
/* ───── 모드 ───── */
const Q = new URLSearchParams(location.search);
const EMBED = Q.has("embed"), PRESENTER = Q.has("presenter");
if (Q.has("static") || EMBED) document.body.classList.add("noanim");
const ch = ("BroadcastChannel" in window) ? new BroadcastChannel("deck:" + (document.body.dataset.deck || location.pathname)) : null;

/* ───── 무대 크기 ───── */
const stage = document.getElementById("stage"), vp = document.getElementById("viewport");
function fit() { const s = Math.min(vp.clientWidth / 1920, vp.clientHeight / 1080) * (document.body.classList.contains("full") || EMBED ? 1 : 0.97); stage.style.transform = `scale(${s})`; }
addEventListener("resize", fit); new ResizeObserver(fit).observe(vp);

/* ───── 슬라이드 이동 ───── */
const slides = [...document.querySelectorAll(".slide")], total = slides.length;
slides.forEach((s, i) => { const pg = s.querySelector(".pg"); if (pg) pg.textContent = `${i + 1} / ${total}`; });
let cur = -1;
const fmt = (sec) => { sec = Math.max(0, Math.round(sec)); return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0"); };
function countUp(el) {
  const to = +el.dataset.count, t0 = performance.now(), dur = 1100;
  if (document.body.classList.contains("noanim") || matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = to.toLocaleString(); return; }
  const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e).toLocaleString(); if (k < 1) requestAnimationFrame(step); };
  el.textContent = "0"; requestAnimationFrame(step);
  setTimeout(() => el.textContent = to.toLocaleString(), dur + 150);
}
const nT = document.getElementById("nT"), nS = document.getElementById("nS"), nB = document.getElementById("nB");
function go(i, push = true, from) {
  i = Math.max(0, Math.min(total - 1, i));
  if (i === cur) return;
  slides.forEach((s, k) => { s.classList.toggle("active", k === i); s.classList.toggle("prev", k < i); });
  cur = i;
  slides[i].querySelectorAll("[data-count]").forEach(countUp);
  const n = NOTES[i], s = slides[i];
  document.getElementById("ttl").textContent = s.dataset.title;
  document.getElementById("cnt").textContent = `${i + 1} / ${total}`;
  document.getElementById("prog").style.width = ((i + 1) / total * 100) + "%";
  nT.textContent = `${i + 1}. ${n.t}`;
  nS.textContent = n.s ? `약 ${n.s}초 · 이 장까지 ${fmt(+s.dataset.cum)} / 전체 ${fmt(TOTAL_SEC)}` : "부록 · 질문이 나올 때";
  nB.textContent = n.n;
  if (push && !EMBED) history.replaceState(null, "", location.search + "#" + (i + 1));
  if (ch && from !== "remote" && !EMBED) ch.postMessage({ type: "go", i, t0: timerStart });
  tick();
}
document.getElementById("prev").onclick = () => go(cur - 1);
document.getElementById("next").onclick = () => go(cur + 1);
function toggleFull() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); }
document.getElementById("bF").onclick = toggleFull;
document.addEventListener("fullscreenchange", () => { document.body.classList.toggle("full", !!document.fullscreenElement); setTimeout(fit, 50); });

/* 대본 */
const notesEl = document.getElementById("notes"), bN = document.getElementById("bN");
function toggleNotes() { notesEl.classList.toggle("on"); bN.classList.toggle("on", notesEl.classList.contains("on")); setTimeout(fit, 30); }
bN.onclick = toggleNotes;

/* 타이머: 첫 '다음' 이후 흐르는 발표 시간과 이 장까지의 목표 */
let timerStart = 0;
const clock = document.getElementById("clock");
function tick() {
  if (!timerStart) { clock.textContent = "00:00 / " + fmt(+(slides[cur]?.dataset.cum || 0)); clock.className = "clock"; return; }
  const el = (Date.now() - timerStart) / 1000, target = +(slides[cur]?.dataset.cum || 0);
  clock.textContent = fmt(el) + " / " + fmt(target);
  clock.className = "clock" + (el > target + 30 ? " late" : el > target ? " near" : "");
}
setInterval(tick, 1000);
function resetTimer() { timerStart = 0; tick(); if (ch) ch.postMessage({ type: "go", i: cur, t0: 0 }); }
clock.onclick = resetTimer;
function next() { if (!timerStart && cur === 0) timerStart = Date.now(); go(cur + 1); }

/* 목록 / 대본 전체 보기 */
const list = document.getElementById("list"), lBody = document.getElementById("lBody");
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
function openList(kind) {
  if (kind === "notes") lBody.innerHTML = `<h2>발표 대본 <small style="font-size:15px;color:#5C685F;font-weight:500">본 발표 약 ${fmt(TOTAL_SEC)} (부록 제외)</small></h2><div class='nt'>` + NOTES.map((n, i) => `<section><h3>${i + 1}. ${esc(n.t)}<small>${n.s ? "약 " + n.s + "초" : "부록"}</small></h3><p>${esc(n.n)}</p></section>`).join("") + "</div>";
  else lBody.innerHTML = "<h2>전체 슬라이드</h2><ol>" + slides.map((s, i) => `<li><button data-i="${i}"><b>${i + 1}</b>${esc(s.dataset.title)}</button></li>`).join("") + "</ol>";
  lBody.querySelectorAll("button[data-i]").forEach((b) => b.onclick = () => { closeList(); go(+b.dataset.i); });
  list.classList.add("on");
}
function closeList() { list.classList.remove("on"); }
document.getElementById("bList").onclick = () => openList("slides");
document.getElementById("bNotes").onclick = () => openList("notes");
document.getElementById("lClose").onclick = closeList;
document.getElementById("bPres").onclick = openPresenter;
function openPresenter() { window.open(location.pathname + "?presenter#" + (cur + 1), "a4ai-presenter", "width=1280,height=800"); }

/* 키보드 */
document.addEventListener("keydown", (e) => {
  if (EMBED || PRESENTER) return;
  if (!started) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); playIntro(); } else if (e.key === "Escape") skipStart(); return; }
  if (introOn) { e.preventDefault(); closeIntro(); return; }
  if (list.classList.contains("on")) { if (e.key === "Escape") closeList(); return; }
  if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); next(); }
  else if (["ArrowLeft", "PageUp"].includes(e.key)) go(cur - 1);
  else if (e.key === "Home") go(0);
  else if (e.key === "End") go(total - 1);
  else if (e.key === "f" || e.key === "F") toggleFull();
  else if (e.key === "n" || e.key === "N") toggleNotes();
  else if (e.key === "p" || e.key === "P") openPresenter();
  else if (e.key === "t" || e.key === "T") resetTimer();
});
stage.addEventListener("click", (e) => { if (!EMBED && !e.target.closest("video,button,a")) next(); });

/* 발표자 화면과 동기화 */
if (ch && !EMBED && !PRESENTER) ch.onmessage = (m) => {
  if (m.data.type === "cmd") { if (m.data.t0 !== undefined) timerStart = m.data.t0; if (m.data.go === "next") next(); else go(m.data.go); }
  if (m.data.type === "hello") ch.postMessage({ type: "go", i: cur, t0: timerStart });
};

/* ───── 시작 화면과 인트로 ───── */
const startEl = document.getElementById("start") || document.createElement("div"), intro = document.getElementById("intro");
let started = false, introOn = false;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
function skipStart() { started = true; startEl.classList.add("out"); setTimeout(() => startEl.style.display = "none", 500); }
function playIntro() {
  skipStart();
  if (!intro) return;
  introOn = true; intro.style.display = "block"; intro.classList.remove("out");
  resize(); startTitle(); t0 = performance.now(); if (ctx) requestAnimationFrame(frame);
}
function closeIntro() {
  introOn = false; intro.classList.add("out");
  setTimeout(() => { if (!introOn) intro.style.display = "none"; }, 950);
  const k = slides[cur]; if (k) { k.classList.remove("active"); void k.offsetWidth; k.classList.add("active"); k.querySelectorAll("[data-count]").forEach(countUp); }
}
const playBtn = document.getElementById("play"); if (playBtn) playBtn.onclick = playIntro;
if (intro) intro.addEventListener("click", closeIntro);
const bIntro = document.getElementById("bIntro"); if (bIntro) bIntro.onclick = () => { started = true; playIntro(); };
if (!document.getElementById("start")) started = true;

const tt = document.getElementById("tt"), TITLE = ((tt && tt.dataset.title) || "").split("|");
function startTitle() {
  if (!tt) return;
  tt.innerHTML = TITLE.map((l) => [...l].map((c) => `<span>${c === " " ? "&nbsp;" : c}</span>`).join("")).join("<br>");
  ["tg", "sb"].forEach((id) => document.getElementById(id).classList.remove("on"));
  const sp = tt.querySelectorAll("span");
  setTimeout(() => document.getElementById("tg").classList.add("on"), 300);
  sp.forEach((s, i) => setTimeout(() => s.classList.add("on"), reduce ? 0 : (FUN || VOICE ? 3200 : 700) + i * 60));
  setTimeout(() => document.getElementById("sb").classList.add("on"), reduce ? 0 : (FUN || VOICE ? 3500 : 900) + sp.length * 60);
}

/* 인트로 캔버스 — #intro의 data-funnel="2785,235,38,25" data-split="11" data-labels="가능 11|조건부 14"가 있으면
   '많은 점이 단계별로 걸러져 마지막 묶음이 오른쪽 상자로 모이는' 깔때기 연출, 없으면 천천히 떠다니는 점만 그린다.
   HUD 숫자 칸은 id h1~h4 (있는 만큼만 채움). 발표 주제에 맞는 연출이 따로 있으면 frame()만 바꾼다. */
const cv = document.getElementById("cv"), ctx = cv ? cv.getContext("2d") : null;
let Wd, Ht, DPR = Math.min(devicePixelRatio || 1, 2), t0 = 0;
function resize() { if (!cv) return; Wd = cv.clientWidth; Ht = cv.clientHeight; cv.width = Wd * DPR; cv.height = Ht * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
addEventListener("resize", () => { if (introOn) resize(); });
const FUN = intro && intro.dataset.funnel && intro.dataset.mode !== "voice" ? intro.dataset.funnel.split(",").map(Number) : null;
/* 색은 CSS 변수에서 (테마 CSS가 --intro-bg/--intro-dot/--intro-keep/--intro-accent/--intro-text 를 정하면 그 색으로) */
const cssv = (n, d) => (getComputedStyle(document.documentElement).getPropertyValue(n) || "").trim() || d;
const C = { bg: cssv("--intro-bg", "#0d120e"), dot: cssv("--intro-dot", "#6E8B5E"), keep: cssv("--intro-keep", "#4E9A4A"), acc: cssv("--intro-accent", "#D9971E"), txt: cssv("--intro-text", "#c9d1c5") };
/* data-mode="voice": 소음 섞인 음성 → 소음 제거 → 기록 칸으로 정리 → 데이터로 재사용 (현장 음성 기록 주제용)
   data-steps="87 dB|CLEAN|4 FIELDS|REUSED" (HUD h1~h4에 단계마다 표시), data-fields="작업|설비|시간|조치", data-reuse="검색|품질 이력|AI 재학습" */
const VOICE = !!(intro && intro.dataset.mode === "voice");
const VSTEPS = VOICE && intro.dataset.steps ? intro.dataset.steps.split("|") : [];
const VFIELDS = VOICE ? (intro.dataset.fields || "작업|설비|시간|조치").split("|") : [];
const VREUSE = VOICE ? (intro.dataset.reuse || "검색|품질 이력|AI 재학습").split("|") : [];
const SPLIT = intro ? +(intro.dataset.split || 0) : 0, LABELS = intro && intro.dataset.labels ? intro.dataset.labels.split("|") : [];
const NP = FUN ? FUN[0] : (VOICE ? 0 : 900), P = [];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < NP; i++) { let lv = 0; if (FUN) FUN.forEach((n, k) => { if (k && i < n) lv = k; }); P.push({ x: rnd(), y: rnd(), lv, ph: rnd() * 6.28 }); }
const LAST = FUN ? FUN.length - 1 : 0, KEEP = FUN ? FUN[LAST] : 0;
const ease = (k) => k < 0 ? 0 : k > 1 ? 1 : 1 - Math.pow(1 - k, 3);
const H = ["h1", "h2", "h3", "h4", "h5"].map((id) => document.getElementById(id));
/* 음성 모드 데이터: 막대 140개 = 소음 + 말소리(단어 4개의 봉우리) */
const NB = 140, BAR = [];
if (VOICE) {
  const words = [[0.16, 0.06], [0.34, 0.08], [0.55, 0.05], [0.74, 0.09]];
  for (let i = 0; i < NB; i++) {
    const u = i / (NB - 1); let env = 0;
    words.forEach(([c, w]) => { env += Math.exp(-((u - c) ** 2) / (2 * w * w)); });
    BAR.push({ u, noise: 0.35 + 0.65 * rnd(), env: Math.min(1, env) * (0.75 + 0.25 * rnd()), ph: rnd() * 6.28, row: Math.floor(rnd() * 4) });
  }
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function voiceFrame(t) {
  const sA = ease(t / 1.2), sB = ease((t - 1.5) / 1.2), sC = ease((t - 2.9) / 1.3), sD = ease((t - 4.3) / 1.2);
  /* 바닥 격자 (공장 평면도 느낌) */
  ctx.globalAlpha = 0.07; ctx.strokeStyle = C.txt; ctx.lineWidth = 1;
  for (let x = 0; x < Wd; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, Ht); ctx.stroke(); }
  for (let y = 0; y < Ht; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(Wd, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const x0 = Wd * 0.05, x1 = Wd * 0.60, cy = Ht * 0.36, amp = Ht * 0.17, bw = (x1 - x0) / NB;
  /* 기록 칸 (오른쪽) */
  const px = Wd * 0.66, py = Ht * 0.26, pw = Wd * 0.27, rowH = Ht * 0.07, ph = rowH * VFIELDS.length + 24;
  if (sC > 0) {
    ctx.globalAlpha = sC; ctx.setLineDash([6, 6]); ctx.strokeStyle = C.acc; ctx.lineWidth = 2; rr(px, py, pw, ph, 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `600 ${Math.round(Math.max(13, Wd * 0.0085))}px 'JetBrains Mono',monospace`; ctx.fillStyle = C.txt; ctx.textAlign = "left";
    VFIELDS.forEach((f, k) => { ctx.fillText(f, px + 14, py + 12 + rowH * k + rowH * 0.62); });
    ctx.globalAlpha = 1;
  }
  const rowFill = [0, 0, 0, 0];
  BAR.forEach((b, i) => {
    const x = x0 + i * bw, appear = ease((t * 1.6 - b.u * 1.2));
    if (appear <= 0) return;
    const speech = b.env > 0.25, noisy = b.noise * (1 - sB) * (0.6 + 0.4 * Math.sin(t * 9 + b.ph));
    let h = amp * Math.max(0.03, (noisy * 0.7 + b.env * 0.9)) * appear;
    let bx = x, by = cy - h / 2, w = Math.max(2, bw * 0.6), col = speech && sB > 0.3 ? C.acc : C.dot, a = speech ? 0.95 : 0.55 * (1 - sB * 0.85);
    if (speech && sC > 0) {
      /* 말소리 막대 → 기록 칸의 블록으로 이동 */
      const k = b.row % VFIELDS.length, n = rowFill[k]++;
      const tx = px + pw * 0.34 + (n % 14) * (pw * 0.62 / 14), ty = py + 12 + rowH * k + rowH * 0.2, th = rowH * 0.55;
      bx = x + (tx - x) * sC; by = by + (ty - by) * sC; h = h + (th - h) * sC; w = w + (pw * 0.62 / 14 * 0.8 - w) * sC;
    }
    ctx.globalAlpha = a * Math.min(1, appear * 1.5); ctx.fillStyle = col; rr(bx, by, w, Math.max(2, h), Math.min(3, w / 2)); ctx.fill();
  });
  /* 기준선 */
  ctx.globalAlpha = 0.25 * (1 - sC); ctx.strokeStyle = C.txt; ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke();
  /* 데이터로 재사용: 기록 칸 아래로 층이 쌓임 */
  if (sD > 0) {
    VREUSE.forEach((r, k) => {
      const e = ease((t - 4.3 - k * 0.25) / 0.8), y = py + ph + 18 + k * (rowH * 0.9);
      if (e <= 0) return;
      ctx.globalAlpha = e * 0.9; ctx.fillStyle = C.acc; rr(px + (1 - e) * 30, y, pw, rowH * 0.7, 8); ctx.globalAlpha = e * 0.18; ctx.fill();
      ctx.globalAlpha = e; ctx.strokeStyle = C.acc; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = C.txt; ctx.font = `600 ${Math.round(Math.max(13, Wd * 0.0085))}px 'JetBrains Mono',monospace`; ctx.textAlign = "left"; ctx.fillText("↺ " + r, px + 16 + (1 - e) * 30, y + rowH * 0.45);
    });
  }
  ctx.globalAlpha = 1;
  [0.2, 1.5, 2.9, 4.3].forEach((s, k) => { if (H[k] && VSTEPS[k] !== undefined) H[k].textContent = t > s ? VSTEPS[k] : "–"; });
}
function frame(ms) {
  const t = reduce ? 9 : Math.max(0, ms - t0) / 1000;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, Wd, Ht);
  if (VOICE) { voiceFrame(t); if (intro.style.display !== "none") requestAnimationFrame(frame); return; }
  const fx = Wd * 0.04, fy = Ht * 0.12, fw = Wd * 0.58, fh = Ht * 0.5, gx = Wd * 0.78, gy = Ht * 0.36;
  const st = FUN ? FUN.map((_, k) => k ? ease((t - 0.6 - k * 1.1) / 1) : 1) : [];
  const sEnd = FUN ? st[LAST] : 0;
  P.forEach((p, k) => {
    let a = Math.min(1, t / 1.2) * (0.55 + 0.25 * Math.sin(t * 2 + p.ph)), x = fx + p.x * fw, y = fy + p.y * fh, r = 2.2, col = C.dot;
    if (!FUN) { x = p.x * Wd + Math.sin(t * 0.3 + p.ph) * 20; y = p.y * Ht + Math.cos(t * 0.25 + p.ph) * 14; a *= 0.6; }
    else {
      for (let s = 1; s <= LAST; s++) if (p.lv < s) a *= 1 - 0.8 * st[s];
      if (p.lv === LAST) {
        const tx = gx + (k % 5) * 26 - 52, ty = gy + Math.floor(k / 5) * 26 - 52;
        x += (tx - x) * sEnd; y += (ty - y) * sEnd; r = 2.2 + 4 * sEnd; col = SPLIT && k >= SPLIT ? C.acc : C.keep; a = Math.max(a, 0.9 * Math.min(1, t / 1.2));
      }
    }
    ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  });
  if (FUN) {
    ctx.globalAlpha = Math.min(1, sEnd); const rows = Math.ceil(KEEP / 5);
    ctx.strokeStyle = C.acc; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.strokeRect(gx - 90, gy - 90, 180, rows * 26 + 38); ctx.setLineDash([]);
    ctx.fillStyle = C.txt; ctx.font = "600 14px 'JetBrains Mono',monospace"; ctx.textAlign = "center";
    if (LABELS.length) ctx.fillText(LABELS.map((l) => "● " + l).join("   "), gx, gy - 52 + rows * 26 + 40);
    ctx.globalAlpha = 1;
    FUN.forEach((n, k) => { if (!H[k]) return; const prev = k ? FUN[k - 1] : 0; H[k].textContent = k === 0 ? Math.round(n * Math.min(1, t / 1.2)).toLocaleString() : st[k] > 0 ? Math.round(prev - (prev - n) * st[k]).toLocaleString() : "–"; });
  }
  ctx.globalAlpha = 1;
  if (intro.style.display !== "none") requestAnimationFrame(frame);
}

/* ───── 발표자 화면 ───── */
if (PRESENTER) {
  document.body.className = "presenter";
  document.body.innerHTML = `<div id="pv"><div class="pane"><h3>지금 화면</h3><iframe id="fC" title="현재 슬라이드"></iframe><h3>다음</h3><div class="nxt" id="pN"></div>
    <div class="btns"><button id="pP">◀ 이전</button><button id="pX">다음 ▶</button><button id="pR">타이머 초기화</button></div></div>
    <div class="pane"><div class="tm" id="pT"><b>00:00</b><span></span></div><div class="cur" id="pC"></div><h3 id="pS"></h3><div class="note" id="pB"></div></div></div>`;
  let i = Math.max(0, (parseInt(location.hash.slice(1)) || 1) - 1), tS = 0;
  const base = location.pathname + "?embed#";
  const draw = () => {
    const n = NOTES[i], nx = NOTES[i + 1];
    document.getElementById("fC").src = base + (i + 1);
    document.getElementById("pC").textContent = `${i + 1} / ${NOTES.length}  ${n.t}`;
    document.getElementById("pN").textContent = nx ? `${i + 2}. ${nx.t}` : "마지막 장";
    document.getElementById("pS").textContent = n.s ? `대본 · 약 ${n.s}초` : "부록 · 질문이 나올 때";
    document.getElementById("pB").textContent = n.n;
  };
  const cumOf = (k) => NOTES.slice(0, k + 1).reduce((a, n) => a + (n.s || 0), 0);
  setInterval(() => { const el = tS ? (Date.now() - tS) / 1000 : 0, tg = cumOf(i), T = document.getElementById("pT"); T.querySelector("b").textContent = fmt(el); T.querySelector("span").textContent = `이 장까지 목표 ${fmt(tg)} · 전체 ${fmt(TOTAL_SEC)}`; T.classList.toggle("late", el > tg + 30); }, 500);
  if (ch) { ch.onmessage = (m) => { if (m.data.type === "go") { i = m.data.i; tS = m.data.t0; draw(); } }; ch.postMessage({ type: "hello" }); }
  document.getElementById("pP").onclick = () => ch && ch.postMessage({ type: "cmd", go: i - 1 });
  document.getElementById("pX").onclick = () => ch && ch.postMessage({ type: "cmd", go: "next" });
  document.getElementById("pR").onclick = () => ch && ch.postMessage({ type: "cmd", go: i, t0: 0 });
  document.addEventListener("keydown", (e) => { if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); ch && ch.postMessage({ type: "cmd", go: "next" }); } else if (["ArrowLeft", "PageUp"].includes(e.key)) ch && ch.postMessage({ type: "cmd", go: i - 1 }); });
  draw();
} else {
  /* 시작 */
  if (EMBED) {
    document.body.classList.add("full"); startEl.style.display = "none"; started = true;
    addEventListener("hashchange", () => go((parseInt(location.hash.slice(1)) || 1) - 1, false));
  }
  const startAt = Math.max(0, (parseInt(location.hash.slice(1)) || 1) - 1);
  go(startAt, false); fit();
}
