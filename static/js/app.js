(() => {
  "use strict";

  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const STORE_KEY = "ttt.v1";
  const AI_DELAY = 480; // ms - gives the computer a natural "thinking" pause

  // ---------- State ----------
  const saved = load();
  const state = {
    mode: saved.mode || "cpu",          // "cpu" | "pvp"
    level: saved.level || "hard",       // easy | medium | hard
    human: saved.human || "X",          // side the person plays vs computer
    theme: saved.theme || "chalk",
    sound: saved.sound !== false,
    scores: saved.scores || { X: 0, O: 0, D: 0 },
    board: Array(9).fill(null),
    turn: "X",
    over: false,
    busy: false,                        // true while waiting for the computer
    history: [],                        // list of move indices (for undo)
  };

  // ---------- DOM ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const boardEl = $("#board");
  const statusEl = $("#status");
  const undoBtn = $("#undoBtn");

  // ---------- Persistence ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  function save() {
    const { mode, level, human, theme, sound, scores } = state;
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ mode, level, human, theme, sound, scores })); } catch {}
  }

  // ---------- Sound (tiny WebAudio blips, no asset files) ----------
  let audio;
  function beep(freq, dur = 0.09, type = "triangle", vol = 0.06, delay = 0) {
    if (!state.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const t = audio.currentTime + delay;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(audio.destination);
      osc.start(t); osc.stop(t + dur);
    } catch {}
  }
  const sfx = {
    place: (p) => beep(p === "X" ? 520 : 390, 0.08),
    win:   () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.16, "triangle", 0.07, i * 0.11)),
    lose:  () => [330, 262].forEach((f, i) => beep(f, 0.2, "sawtooth", 0.04, i * 0.15)),
    draw:  () => [392, 392].forEach((f, i) => beep(f, 0.12, "triangle", 0.05, i * 0.14)),
  };

  // ---------- Pure helpers ----------
  function evaluate(b) {
    for (const line of LINES) {
      const [x, y, z] = line;
      if (b[x] && b[x] === b[y] && b[x] === b[z]) return { winner: b[x], line };
    }
    return { winner: null, line: null, draw: b.every(Boolean) };
  }
  const other = (p) => (p === "X" ? "O" : "X");
  const cpuSide = () => other(state.human);

  function markSVG(player) {
    return player === "X"
      ? `<svg viewBox="0 0 100 100" aria-hidden="true"><path pathLength="1" style="--len:1" d="M20 22 L80 80"/><path pathLength="1" style="--len:1" d="M80 20 L22 80"/></svg>`
      : `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse pathLength="1" style="--len:1" cx="50" cy="50" rx="31" ry="33" transform="rotate(-12 50 50)"/></svg>`;
  }

  // ---------- Rendering ----------
  function buildBoard() {
    boardEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cell";
      b.dataset.index = i;
      b.setAttribute("role", "gridcell");
      b.addEventListener("click", () => play(i));
      boardEl.appendChild(b);
    }
  }

  function render(winLine = null) {
    $$(".cell", boardEl).forEach((cell, i) => {
      const v = state.board[i];
      const isWin = winLine && winLine.includes(i);
      cell.className = "cell" + (v ? ` ${v.toLowerCase()}` : "") + (isWin ? " win" : "");
      cell.disabled = state.over || state.busy || !!v || !humanCanMove();
      cell.dataset.ghost = !v && !cell.disabled ? state.turn : "";
      cell.setAttribute("aria-label", `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}, ${v || "empty"}`);
      // only (re)draw a mark when it changes, so the animation doesn't replay
      const had = cell.dataset.mark || "";
      if ((v || "") !== had) {
        cell.innerHTML = v ? markSVG(v) : "";
        cell.dataset.mark = v || "";
      } else if (v && !cell.querySelector("svg")) {
        cell.innerHTML = markSVG(v);
      }
    });
    boardEl.classList.toggle("over", state.over);
    undoBtn.disabled = state.busy || state.history.length <= minHistory();
  }

  // moves that can't be undone (the computer's opening move when the human plays O)
  function minHistory() {
    return state.mode === "cpu" && state.human === "O" ? 1 : 0;
  }

  function humanCanMove() {
    return state.mode === "pvp" || state.turn === state.human;
  }

  function names() {
    return state.mode === "cpu"
      ? { X: state.human === "X" ? "You" : "CPU", O: state.human === "O" ? "You" : "CPU" }
      : { X: "Player 1", O: "Player 2" };
  }

  function renderScores() {
    const n = names();
    $("#nameX").textContent = `${n.X} (X)`;
    $("#nameO").textContent = `${n.O} (O)`;
    $("#winsX").textContent = state.scores.X;
    $("#winsO").textContent = state.scores.O;
    $("#winsD").textContent = state.scores.D;
    $("#scoreX").classList.toggle("active", !state.over && state.turn === "X");
    $("#scoreO").classList.toggle("active", !state.over && state.turn === "O");
  }

  function setStatus(html, cls = "") {
    statusEl.className = "status " + cls;
    statusEl.innerHTML = html;
  }

  function renderStatus(result) {
    const n = names();
    if (result && result.winner) {
      const w = result.winner;
      const text = state.mode === "cpu"
        ? (n[w] === "You" ? "You win! 🎉" : "Computer wins")
        : `${n[w]} wins! 🎉`;
      setStatus(text, `win-${w.toLowerCase()}`);
    } else if (result && result.draw) {
      setStatus("It's a draw");
    } else if (state.busy) {
      setStatus(`Computer is thinking<span class="dots"><span>.</span><span>.</span><span>.</span></span>`);
    } else if (state.mode === "cpu") {
      setStatus(`Your turn (${state.human})`);
    } else {
      setStatus(`${n[state.turn]}'s turn (${state.turn})`);
    }
  }

  function renderControls() {
    $$("#modeGroup button").forEach(b => b.setAttribute("aria-checked", b.dataset.mode === state.mode));
    $$("#levelGroup button").forEach(b => b.setAttribute("aria-checked", b.dataset.level === state.level));
    $$("#sideGroup button").forEach(b => b.setAttribute("aria-checked", b.dataset.side === state.human));
    $("#cpuOptions").hidden = state.mode !== "cpu";
    document.documentElement.dataset.theme = state.theme;
    const soundBtn = $("#soundBtn");
    soundBtn.setAttribute("aria-pressed", state.sound);
    soundBtn.setAttribute("aria-label", state.sound ? "Sound on" : "Sound off");
    $("#themeBtn").setAttribute("aria-label", state.theme === "chalk" ? "Switch to paper theme" : "Switch to chalkboard theme");
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = state.theme === "chalk" ? "#1e2b27" : "#fbf8ef";
  }

  // ---------- Game flow ----------
  function newRound() {
    state.board = Array(9).fill(null);
    state.turn = "X";
    state.over = false;
    state.busy = false;
    state.history = [];
    renderControls();
    render();
    renderScores();
    renderStatus();
    maybeComputerTurn();
  }

  function play(i) {
    if (state.over || state.busy || state.board[i] || !humanCanMove()) return;
    place(i);
    maybeComputerTurn();
  }

  function place(i) {
    const player = state.turn;
    state.board[i] = player;
    state.history.push(i);
    sfx.place(player);

    const result = evaluate(state.board);
    if (result.winner || result.draw) {
      finish(result);
    } else {
      state.turn = other(player);
      render();
      renderScores();
      renderStatus();
    }
  }

  function finish(result) {
    state.over = true;
    state.busy = false;
    if (result.winner) {
      state.scores[result.winner]++;
      const humanWon = state.mode === "pvp" || result.winner === state.human;
      humanWon ? sfx.win() : sfx.lose();
    } else {
      state.scores.D++;
      sfx.draw();
    }
    save();
    render(result.line);
    renderScores();
    renderStatus(result);
  }

  async function maybeComputerTurn() {
    if (state.mode !== "cpu" || state.over || state.turn !== cpuSide()) return;
    state.busy = true;
    render();
    renderStatus();
    const snapshot = state.history.length;
    const wait = new Promise(r => setTimeout(r, AI_DELAY));

    let move;
    try {
      const res = await fetch("/api/ai-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board: state.board, ai: cpuSide(), difficulty: state.level }),
      });
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      move = (await res.json()).move;
    } catch (err) {
      console.error(err);
      // graceful fallback so the game never gets stuck
      const free = state.board.map((v, i) => (v ? null : i)).filter(i => i !== null);
      move = free[Math.floor(Math.random() * free.length)];
      setStatus("Server unreachable - playing a random move");
    }
    await wait;

    // the player may have reset / undone / changed mode while we were waiting
    if (!state.busy || state.history.length !== snapshot || state.over) return;
    state.busy = false;
    place(move);
  }

  function undo() {
    if (state.busy || state.history.length <= minHistory()) return;
    if (state.over) revertScore();
    do {
      const last = state.history.pop();
      state.turn = state.board[last];
      state.board[last] = null;
    } while (state.mode === "cpu" && state.turn !== state.human && state.history.length > minHistory());
    state.over = false;
    render();
    renderScores();
    renderStatus();
  }

  function revertScore() {
    const r = evaluate(state.board);
    if (r.winner) state.scores[r.winner] = Math.max(0, state.scores[r.winner] - 1);
    else state.scores.D = Math.max(0, state.scores.D - 1);
    save();
  }

  // ---------- Events ----------
  $("#newBtn").addEventListener("click", newRound);
  undoBtn.addEventListener("click", undo);
  $("#resetBtn").addEventListener("click", () => {
    state.scores = { X: 0, O: 0, D: 0 };
    save();
    newRound();
  });

  $("#modeGroup").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    state.mode = b.dataset.mode; state.scores = { X: 0, O: 0, D: 0 };
    save(); newRound();
  });
  $("#levelGroup").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    state.level = b.dataset.level; state.scores = { X: 0, O: 0, D: 0 };
    save(); newRound();
  });
  $("#sideGroup").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    state.human = b.dataset.side; state.scores = { X: 0, O: 0, D: 0 };
    save(); newRound();
  });
  $("#soundBtn").addEventListener("click", () => { state.sound = !state.sound; save(); renderControls(); sfx.place("X"); });
  $("#themeBtn").addEventListener("click", () => {
    state.theme = state.theme === "chalk" ? "paper" : "chalk";
    save(); renderControls();
  });

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") toggleSettings(false);
    else if (/^[1-9]$/.test(e.key)) play(Number(e.key) - 1);
    else if (e.key.toLowerCase() === "n") newRound();
    else if (e.key.toLowerCase() === "u") undo();
  });

  // ---------- Settings sheet (small screens) ----------
  const settingsEl = $("#settings"), settingsBtn = $("#settingsBtn"), backdrop = $("#backdrop");
  function toggleSettings(open) {
    open = open ?? !settingsEl.classList.contains("open");
    settingsEl.classList.toggle("open", open);
    settingsBtn.setAttribute("aria-expanded", open);
    backdrop.hidden = !open;
  }
  settingsBtn.addEventListener("click", () => toggleSettings());
  backdrop.addEventListener("click", () => toggleSettings(false));
  $("#newBtn").addEventListener("click", () => toggleSettings(false));
  window.addEventListener("resize", () => { if (window.matchMedia('(min-width: 860px) and (min-aspect-ratio: 5/4)').matches) toggleSettings(false); });

  // ---------- Init ----------
  buildBoard();
  newRound();
})();
