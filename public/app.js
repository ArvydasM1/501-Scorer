(() => {
  'use strict';

  const STORAGE_KEY = 'darts-scorer-v1';
  const GITHUB_URL = 'https://github.com/ArvydasM1/501-Scorer';
  const BACKUP_FORMAT = 'darts-scorer-backup';
  const MAX_PLAYERS = 8;
  const MAX_LEGS = 21;
  const MAX_ROSTER = 40;
  const START_SCORES = [301, 501, 701];
  const QUICK_SCORES = [26, 41, 45, 60, 85, 100, 140, 180];
  // Totals that cannot be scored with three darts.
  const IMPOSSIBLE_SCORES = new Set([163, 166, 169, 172, 173, 175, 176, 178, 179]);

  // ---------- Board segments ----------
  const SEGMENTS = [];
  for (let n = 20; n >= 1; n--) {
    SEGMENTS.push({ label: 'T' + n, value: 3 * n, kind: 'T' });
    SEGMENTS.push({ label: 'D' + n, value: 2 * n, kind: 'D' });
    SEGMENTS.push({ label: String(n), value: n, kind: 'S' });
  }
  SEGMENTS.push({ label: 'Bull', value: 50, kind: 'D' });
  SEGMENTS.push({ label: '25', value: 25, kind: 'S' });

  // ---------- Double-out checkout table (standard routes) ----------
  const DOUBLE_OUT_TABLE = [
    '170 T20 T20 Bull', '167 T20 T19 Bull', '164 T20 T18 Bull', '161 T20 T17 Bull', '160 T20 T20 D20',
    '158 T20 T20 D19', '157 T20 T19 D20', '156 T20 T20 D18', '155 T20 T19 D19', '154 T20 T18 D20',
    '153 T20 T19 D18', '152 T20 T20 D16', '151 T20 T17 D20', '150 T20 T18 D18', '149 T20 T19 D16',
    '148 T20 T20 D14', '147 T20 T17 D18', '146 T20 T18 D16', '145 T20 T15 D20', '144 T20 T20 D12',
    '143 T20 T17 D16', '142 T20 T14 D20', '141 T20 T19 D12', '140 T20 T20 D10', '139 T20 T13 D20',
    '138 T20 T18 D12', '137 T20 T19 D10', '136 T20 T20 D8', '135 T20 T17 D12', '134 T20 T14 D16',
    '133 T20 T19 D8', '132 T20 T16 D12', '131 T20 T13 D16', '130 T20 T20 D5', '129 T19 T16 D12',
    '128 T18 T14 D16', '127 T20 T17 D8', '126 T19 T19 D6', '125 25 T20 D20', '124 T20 T16 D8',
    '123 T19 T16 D9', '122 T18 T18 D7', '121 T20 T11 D14', '120 T20 20 D20', '119 T19 T12 D13',
    '118 T20 18 D20', '117 T20 17 D20', '116 T20 16 D20', '115 T20 15 D20', '114 T20 14 D20',
    '113 T20 13 D20', '112 T20 12 D20', '111 T20 11 D20', '110 T20 Bull', '109 T20 9 D20',
    '108 T20 16 D16', '107 T19 Bull', '106 T20 6 D20', '105 T20 13 D16', '104 T18 Bull',
    '103 T19 6 D20', '102 T20 10 D16', '101 T17 Bull', '100 T20 D20', '99 T19 10 D16',
    '98 T20 D19', '97 T19 D20', '96 T20 D18', '95 T19 D19', '94 T18 D20', '93 T19 D18', '92 T20 D16',
    '91 T17 D20', '90 T18 D18', '89 T19 D16', '88 T16 D20', '87 T17 D18', '86 T18 D16', '85 T15 D20',
    '84 T20 D12', '83 T17 D16', '82 Bull D16', '81 T15 D18', '80 T16 D16', '79 T13 D20', '78 T18 D12',
    '77 T19 D10', '76 T20 D8', '75 T17 D12', '74 T14 D16', '73 T19 D8', '72 T16 D12', '71 T13 D16',
    '70 T18 D8', '69 T19 D6', '68 T20 D4', '67 T17 D8', '66 T10 D18', '65 T19 D4', '64 T16 D8',
    '63 T13 D12', '62 T10 D16', '61 T15 D8', '60 20 D20', '59 19 D20', '58 18 D20', '57 17 D20',
    '56 16 D20', '55 15 D20', '54 14 D20', '53 13 D20', '52 12 D20', '51 11 D20', '50 10 D20',
    '49 9 D20', '48 8 D20', '47 7 D20', '46 6 D20', '45 5 D20', '44 4 D20', '43 3 D20', '42 10 D16',
    '41 9 D16', '40 D20', '39 7 D16', '38 D19', '37 5 D16', '36 D18', '35 3 D16', '34 D17', '33 1 D16',
    '32 D16', '31 15 D8', '30 D15', '29 13 D8', '28 D14', '27 11 D8', '26 D13', '25 9 D8', '24 D12',
    '23 7 D8', '22 D11', '21 5 D8', '20 D10', '19 3 D8', '18 D9', '17 1 D8', '16 D8', '15 7 D4', '14 D7',
    '13 5 D4', '12 D6', '11 3 D4', '10 D5', '9 1 D4', '8 D4', '7 3 D2', '6 D3', '5 1 D2', '4 D2', '3 1 D1', '2 D1',
  ].reduce((map, line) => {
    const parts = line.split(' ');
    map.set(Number(parts[0]), parts.slice(1));
    return map;
  }, new Map());

  // Straight-out routes: fewest darts, preferring big trebles first.
  const straightCache = new Map();
  function straightRoute(remaining) {
    if (straightCache.has(remaining)) return straightCache.get(remaining);
    let route = null;
    const byValue = new Map();
    for (const s of SEGMENTS) if (!byValue.has(s.value)) byValue.set(s.value, s);
    if (byValue.has(remaining)) route = [byValue.get(remaining)];
    if (!route) {
      for (const s1 of SEGMENTS) {
        const f = byValue.get(remaining - s1.value);
        if (f) { route = [s1, f]; break; }
      }
    }
    if (!route) {
      outer: for (const s1 of SEGMENTS) {
        for (const s2 of SEGMENTS) {
          const f = byValue.get(remaining - s1.value - s2.value);
          if (f) { route = [s1, s2, f]; break outer; }
        }
      }
    }
    const labels = route ? route.map((s) => s.label) : null;
    straightCache.set(remaining, labels);
    return labels;
  }

  function checkoutRoute(remaining, doubleOut) {
    if (remaining < 1) return null;
    if (doubleOut) return DOUBLE_OUT_TABLE.get(remaining) || null;
    return straightRoute(remaining);
  }

  // Fewest darts that can finish `remaining` (the suggested route may deliberately use more,
  // e.g. 50 is listed as 10 D20 although a Bull finishes in one). Returns 0 if unfinishable.
  function minDartsToFinish(remaining, doubleOut) {
    const finals = new Set(SEGMENTS.filter((s) => !doubleOut || s.kind === 'D').map((s) => s.value));
    if (finals.has(remaining)) return 1;
    for (const s1 of SEGMENTS) if (finals.has(remaining - s1.value)) return 2;
    return checkoutRoute(remaining, doubleOut) ? 3 : 0;
  }

  // ---------- Per-dart entry ----------
  const MULT_FACTOR = { S: 1, D: 2, T: 3 };
  function dartFromHit(number, mult) {
    if (number === 0) return { label: 'Miss', value: 0, kind: 'S' };
    if (number === 25) return mult === 'D' ? { label: 'Bull', value: 50, kind: 'D' } : { label: '25', value: 25, kind: 'S' };
    return { label: (mult === 'S' ? '' : mult) + number, value: number * MULT_FACTOR[mult], kind: mult };
  }
  // Resolves a partially or fully entered visit. Returns the visit to record, or null if more darts are needed.
  function evaluateDarts(remaining, darts, doubleOut) {
    const scored = darts.reduce((sum, d) => sum + d.value, 0);
    const after = remaining - scored;
    const last = darts[darts.length - 1];
    const hits = darts.map((d) => d.label);
    if (after < 0 || (doubleOut && after === 1) || (after === 0 && doubleOut && last.kind !== 'D')) {
      return { score: 0, entered: scored, darts: 3, bust: true, checkout: false, hits };
    }
    if (after === 0) return { score: scored, entered: scored, darts: darts.length, bust: false, checkout: true, hits };
    if (darts.length >= 3) return { score: scored, entered: scored, darts: 3, bust: false, checkout: false, hits };
    return null;
  }

  // ---------- State ----------
  const defaultSettings = () => ({ startScore: 501, doubleOut: true, legsToWin: 3, players: ['Player 1', 'Player 2'], inputMode: 'total' });
  let state = { screen: 'setup', settings: defaultSettings(), match: null, roster: [], history: [] };
  const ui = { entry: '', darts: [], mult: 'S', modal: null, flash: null, flashTimer: null, manageRoster: false, installPrompt: null };

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* storage unavailable */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.settings || !Array.isArray(parsed.settings.players)) return;
      state = parsed;
      if (!Array.isArray(state.roster)) state.roster = [];
      if (!Array.isArray(state.history)) state.history = [];
      if (!['setup', 'game', 'history'].includes(state.screen)) state.screen = 'setup';
      if (!['total', 'darts'].includes(state.settings.inputMode)) state.settings.inputMode = 'total';
      if (state.match && !['total', 'darts'].includes(state.match.settings.inputMode)) state.match.settings.inputMode = state.settings.inputMode;
    } catch (_) { /* ignore corrupt storage */ }
  }

  // ---------- Derived helpers ----------
  const playerCount = (m) => m.settings.players.length;
  const currentLeg = (m) => m.legs[m.legs.length - 1];
  const playerOfVisit = (leg, index, n) => (leg.starter + index) % n;
  const currentPlayer = (m) => playerOfVisit(currentLeg(m), currentLeg(m).visits.length, playerCount(m));

  function legRemaining(m, leg) {
    const n = playerCount(m);
    const rem = Array(n).fill(m.settings.startScore);
    leg.visits.forEach((v, i) => { rem[playerOfVisit(leg, i, n)] -= v.score; });
    return rem;
  }
  function legsWon(m) {
    const w = Array(playerCount(m)).fill(0);
    m.legs.forEach((l) => { if (l.winner !== null) w[l.winner]++; });
    return w;
  }
  function matchWinner(m) {
    return legsWon(m).findIndex((w) => w >= m.settings.legsToWin);
  }
  function playerStats(m, p) {
    const n = playerCount(m);
    let darts = 0, points = 0, c180 = 0, c140 = 0, c100 = 0, highCheckout = 0, bestLeg = null;
    for (const leg of m.legs) {
      let legDarts = 0;
      leg.visits.forEach((v, i) => {
        if (playerOfVisit(leg, i, n) !== p) return;
        darts += v.darts; legDarts += v.darts; points += v.score;
        if (v.score === 180) c180++; else if (v.score >= 140) c140++; else if (v.score >= 100) c100++;
        if (v.checkout && v.score > highCheckout) highCheckout = v.score;
      });
      if (leg.winner === p && (bestLeg === null || legDarts < bestLeg)) bestLeg = legDarts;
    }
    return { darts, points, avg: darts ? (points / darts) * 3 : 0, c180, c140, c100, highCheckout, bestLeg };
  }
  function lastVisitOf(m, leg, p) {
    const n = playerCount(m);
    for (let i = leg.visits.length - 1; i >= 0; i--) if (playerOfVisit(leg, i, n) === p) return leg.visits[i];
    return null;
  }
  function canUndo(m) {
    return !!m && (currentLeg(m).visits.length > 0 || m.legs.length > 1);
  }

  // Lifetime totals per player name, aggregated from saved match summaries.
  function aggregateHistory(history) {
    const map = new Map();
    for (const h of history) {
      h.players.forEach((pl, i) => {
        const t = map.get(pl.name) || { name: pl.name, matches: 0, wins: 0, legs: 0, darts: 0, points: 0, c180: 0, c140: 0, c100: 0, highCheckout: 0, bestLeg: null };
        t.matches++;
        if (h.winner === i) t.wins++;
        t.legs += pl.legs; t.darts += pl.darts; t.points += pl.points;
        t.c180 += pl.c180; t.c140 += pl.c140; t.c100 += pl.c100;
        t.highCheckout = Math.max(t.highCheckout, pl.highCheckout);
        if (pl.bestLeg !== null && (t.bestLeg === null || pl.bestLeg < t.bestLeg)) t.bestLeg = pl.bestLeg;
        map.set(pl.name, t);
      });
    }
    return [...map.values()]
      .map((t) => ({ ...t, avg: t.darts ? (t.points / t.darts) * 3 : 0 }))
      .sort((a, b) => b.wins - a.wins || b.matches - a.matches || a.name.localeCompare(b.name));
  }
  function summarizeMatch(m) {
    const won = legsWon(m);
    return {
      id: `${m.startedAt}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt: m.startedAt,
      finishedAt: Date.now(),
      startScore: m.settings.startScore,
      doubleOut: m.settings.doubleOut,
      legsToWin: m.settings.legsToWin,
      winner: matchWinner(m),
      players: m.settings.players.map((name, p) => ({ name, legs: won[p], ...playerStats(m, p) })),
    };
  }

  // ---------- Scoring rules ----------
  function evaluateVisit(remaining, score, doubleOut) {
    if (!Number.isInteger(score) || score < 0 || score > 180 || IMPOSSIBLE_SCORES.has(score)) {
      return { error: `${score} is not a possible score` };
    }
    const after = remaining - score;
    if (after < 0) return { bust: true };
    if (doubleOut && after === 1) return { bust: true };
    if (after === 0) {
      const minDarts = minDartsToFinish(remaining, doubleOut);
      if (!minDarts) return { error: `${remaining} cannot be checked out` };
      return { checkout: true, minDarts };
    }
    return { ok: true };
  }

  // ---------- Actions ----------
  function newMatch(settings) {
    return {
      settings: JSON.parse(JSON.stringify(settings)),
      legs: [{ starter: 0, visits: [], winner: null }],
      startedAt: Date.now(),
    };
  }
  function rememberPlayers(names) {
    // Most recent game first, keeping that game's player order.
    for (const name of [...names].reverse()) {
      const i = state.roster.indexOf(name);
      if (i >= 0) state.roster.splice(i, 1);
      state.roster.unshift(name);
    }
    state.roster.length = Math.min(state.roster.length, MAX_ROSTER);
  }
  function startGame() {
    const s = state.settings;
    s.players = s.players.map((p, i) => (p || '').trim() || `Player ${i + 1}`);
    rememberPlayers(s.players);
    state.match = newMatch(s);
    state.screen = 'game';
    ui.entry = ''; ui.modal = null;
    requestPersistentStorage();
    save(); render();
  }
  function rematch() {
    const m = state.match;
    const next = newMatch(m.settings);
    // Loser of the previous match throws first.
    const w = matchWinner(m);
    if (w >= 0) next.legs[0].starter = (w + 1) % playerCount(m);
    state.match = next; state.screen = 'game';
    ui.entry = ''; ui.modal = null;
    save(); render();
  }
  function submitScore(score) {
    const m = state.match;
    if (!m || matchWinner(m) >= 0) return;
    const leg = currentLeg(m);
    const p = currentPlayer(m);
    const remaining = legRemaining(m, leg)[p];
    const ev = evaluateVisit(remaining, score, m.settings.doubleOut);
    if (ev.error) { flash(ev.error, 'warn'); ui.entry = ''; render(); return; }
    if (ev.checkout) {
      ui.modal = { type: 'darts', score, minDarts: ev.minDarts };
      render(); return;
    }
    recordVisit({ score: ev.bust ? 0 : score, entered: score, darts: 3, bust: !!ev.bust, checkout: false });
  }
  function confirmCheckout(darts) {
    const modal = ui.modal;
    if (!state.match || !modal || modal.type !== 'darts') return;
    ui.modal = null;
    recordVisit({ score: modal.score, entered: modal.score, darts, bust: false, checkout: true });
  }
  function addDart(number) {
    const m = state.match;
    if (!m || matchWinner(m) >= 0 || ui.darts.length >= 3) return;
    ui.darts.push(dartFromHit(number, ui.mult));
    ui.mult = 'S';
    ui.entry = '';
    const leg = currentLeg(m);
    const remaining = legRemaining(m, leg)[currentPlayer(m)];
    const visit = evaluateDarts(remaining, ui.darts, m.settings.doubleOut);
    if (visit) recordVisit(visit); else render();
  }
  function removeDart() {
    ui.darts.pop();
    ui.mult = 'S';
    render();
  }
  function recordVisit(visit) {
    const m = state.match;
    const leg = currentLeg(m);
    const p = currentPlayer(m);
    const n = playerCount(m);
    leg.visits.push(visit);
    ui.entry = ''; ui.darts = []; ui.mult = 'S';
    if (visit.bust) flash('Bust!', 'bad');
    if (visit.checkout) {
      leg.winner = p;
      const legNo = m.legs.length;
      const legDarts = playerStats({ settings: m.settings, legs: [leg] }, p).darts;
      if (matchWinner(m) < 0) {
        m.legs.push({ starter: (leg.starter + 1) % n, visits: [], winner: null });
        ui.modal = { type: 'legWon', player: p, legNo, darts: legDarts, checkout: visit.score };
      } else {
        const summary = summarizeMatch(m);
        state.history.unshift(summary);
        m.recordedId = summary.id;
        ui.modal = null;
      }
    }
    save(); render();
  }
  function undo() {
    const m = state.match;
    if (!canUndo(m)) return;
    ui.modal = null;
    ui.darts = []; ui.mult = 'S';
    let leg = currentLeg(m);
    if (leg.visits.length === 0) { m.legs.pop(); leg = currentLeg(m); }
    const v = leg.visits.pop();
    if (v && v.checkout) leg.winner = null;
    if (m.recordedId && matchWinner(m) < 0) {
      // The final checkout was taken back, so the match is no longer finished.
      state.history = state.history.filter((h) => h.id !== m.recordedId);
      delete m.recordedId;
    }
    ui.entry = '';
    save(); render();
  }
  function flash(text, kind) {
    ui.flash = { text, kind: kind || 'info' };
    clearTimeout(ui.flashTimer);
    ui.flashTimer = setTimeout(() => { ui.flash = null; render(); }, 1800);
  }
  function appendDigit(d) {
    if (ui.entry.length >= 3) return;
    const next = (ui.entry + d).replace(/^0+(?=\d)/, '');
    if (Number(next) > 180) return;
    ui.entry = next;
    render();
  }

  // ---------- Backup / restore ----------
  function exportBackup() {
    const payload = { format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), roster: state.roster, history: state.history };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `darts-scorer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function isValidSummary(h) {
    return h && typeof h.id === 'string' && Array.isArray(h.players) && h.players.every((p) => p && typeof p.name === 'string' && Number.isFinite(p.darts) && Number.isFinite(p.points))
      && Number.isInteger(h.winner) && Number.isFinite(h.finishedAt);
  }
  function importBackup(text) {
    let data;
    try { data = JSON.parse(text); } catch (_) { flash('That file is not valid JSON', 'warn'); render(); return; }
    if (!data || data.format !== BACKUP_FORMAT || !Array.isArray(data.history) || !Array.isArray(data.roster)) {
      flash('Not a Darts Scorer backup', 'warn'); render(); return;
    }
    const known = new Set(state.history.map((h) => h.id));
    const incoming = data.history.filter((h) => isValidSummary(h) && !known.has(h.id));
    state.history = [...state.history, ...incoming].sort((a, b) => b.finishedAt - a.finishedAt);
    const names = data.roster.filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim().slice(0, 16));
    for (const name of names.reverse()) if (!state.roster.includes(name)) state.roster.push(name);
    state.roster.length = Math.min(state.roster.length, MAX_ROSTER);
    save();
    flash(`Imported ${incoming.length} match${incoming.length === 1 ? '' : 'es'}`);
    render();
  }
  function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }

  // ---------- Rendering ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtAvg = (n) => n.toFixed(1);
  const fmtDate = (ts) => new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  function render() {
    const app = document.getElementById('app');
    let body;
    if (state.screen === 'game' && state.match) body = renderGame();
    else if (state.screen === 'history') body = renderHistory();
    else body = renderSetup();
    app.innerHTML = body + renderModal() + renderFlash();
  }

  function renderSetup() {
    const s = state.settings;
    const m = state.match;
    const resumable = m && matchWinner(m) < 0 && canUndo(m);
    const saved = state.roster.filter((name) => !s.players.includes(name));
    return `
      <div class="screen setup">
        <header class="topbar">
          <h1><span class="logo"></span>Darts Scorer</h1>
          <div class="topbar-actions">
            ${ui.installPrompt ? '<button class="btn ghost small" data-action="install">Install</button>' : ''}
            <button class="icon" data-action="history" aria-label="History and statistics">&#9776;</button>
          </div>
        </header>
        ${resumable ? `<button class="btn ghost block" data-action="resume">Resume game &middot; leg ${m.legs.length}</button>` : ''}
        <section class="card">
          <h2>Game</h2>
          <div class="segmented" role="group" aria-label="Starting score">
            ${START_SCORES.map((v) => `<button class="seg ${v === s.startScore ? 'on' : ''}" data-action="set-start" data-value="${v}">${v}</button>`).join('')}
          </div>
          <div class="row">
            <span>Double out</span>
            <button class="toggle ${s.doubleOut ? 'on' : ''}" role="switch" aria-checked="${s.doubleOut}" data-action="toggle-double"><span></span></button>
          </div>
          <div class="row">
            <span>First to</span>
            <div class="stepper">
              <button data-action="legs-dec" aria-label="Fewer legs" ${s.legsToWin <= 1 ? 'disabled' : ''}>&minus;</button>
              <b>${s.legsToWin}</b>
              <button data-action="legs-inc" aria-label="More legs" ${s.legsToWin >= MAX_LEGS ? 'disabled' : ''}>+</button>
            </div>
            <span class="muted">${s.legsToWin === 1 ? 'leg' : 'legs'}</span>
          </div>
          <div class="row">
            <span>Score entry</span>
            <div class="segmented compact" role="group" aria-label="Score entry mode">
              <button class="seg ${s.inputMode === 'total' ? 'on' : ''}" data-action="set-mode" data-value="total">Total</button>
              <button class="seg ${s.inputMode === 'darts' ? 'on' : ''}" data-action="set-mode" data-value="darts">Per dart</button>
            </div>
          </div>
        </section>
        <section class="card">
          <h2>Players</h2>
          <div class="players-list">
            ${s.players.map((p, i) => `
              <div class="player-row">
                <input type="text" maxlength="16" value="${esc(p)}" data-name-index="${i}" placeholder="Player ${i + 1}" aria-label="Player ${i + 1} name" autocomplete="off">
                <button class="icon" data-action="remove-player" data-index="${i}" aria-label="Remove player" ${s.players.length <= 1 ? 'disabled' : ''}>&#10005;</button>
              </div>`).join('')}
          </div>
          <button class="btn ghost block" data-action="add-player" ${s.players.length >= MAX_PLAYERS ? 'disabled' : ''}>+ Add player</button>
          ${state.roster.length ? `
            <div class="roster-head">
              <h2>Saved players</h2>
              <button class="link" data-action="roster-manage">${ui.manageRoster ? 'Done' : 'Manage'}</button>
            </div>
            <div class="roster">
              ${(ui.manageRoster ? state.roster : saved).map((name) => ui.manageRoster
                ? `<button class="chip danger-chip" data-action="roster-remove" data-name="${esc(name)}" aria-label="Forget ${esc(name)}">${esc(name)} &#10005;</button>`
                : `<button class="chip" data-action="roster-add" data-name="${esc(name)}" ${s.players.length >= MAX_PLAYERS ? 'disabled' : ''}>+ ${esc(name)}</button>`).join('')}
              ${!ui.manageRoster && !saved.length ? '<span class="muted small-text">All saved players are in this game</span>' : ''}
            </div>` : ''}
        </section>
        <button class="btn primary block big" data-action="start">Start game</button>
        <footer class="app-footer">
          <a class="gh-link" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
            <span>Open source on GitHub</span>
          </a>
        </footer>
      </div>`;
  }

  function renderGame() {
    const m = state.match;
    const s = m.settings;
    const leg = currentLeg(m);
    const n = playerCount(m);
    const rem = legRemaining(m, leg);
    const won = legsWon(m);
    const winner = matchWinner(m);
    const active = winner < 0 ? currentPlayer(m) : -1;
    const dartMode = s.inputMode === 'darts';
    const partial = dartMode ? ui.darts.reduce((sum, d) => sum + d.value, 0) : 0;
    const dartsLeft = dartMode ? 3 - ui.darts.length : 3;

    const cards = s.players.map((name, p) => {
      const st = playerStats(m, p);
      const last = lastVisitOf(m, leg, p);
      const live = p === active ? rem[p] - partial : rem[p];
      let route = p === active ? checkoutRoute(live, s.doubleOut) : null;
      if (route && route.length > dartsLeft) route = null;
      const legsMark = s.legsToWin <= 7
        ? Array.from({ length: s.legsToWin }, (_, i) => `<i class="${i < won[p] ? 'on' : ''}"></i>`).join('')
        : `<em>${won[p]}</em>`;
      return `
        <div class="pcard ${p === active ? 'active' : ''} ${p === winner ? 'winner' : ''}">
          <div class="phead"><span class="pname">${esc(name)}</span><span class="legs" title="Legs won">${legsMark}</span></div>
          <div class="remaining">${live}</div>
          <div class="pmeta">
            <span>Avg <b>${fmtAvg(st.avg)}</b></span>
            <span>Last <b>${last ? (last.bust ? 'Bust' : last.score) : '&ndash;'}</b></span>
          </div>
          ${route ? `<div class="checkout">${route.map((x) => `<b>${x}</b>`).join('')}</div>` : '<div class="checkout empty"></div>'}
        </div>`;
    }).join('');

    const running = Array(n).fill(s.startScore);
    const afterByVisit = leg.visits.map((v, i) => { const p = playerOfVisit(leg, i, n); running[p] -= v.score; return running[p]; });
    const history = leg.visits.slice(-8).reverse().map((v, i) => {
      const idx = leg.visits.length - 1 - i;
      const p = playerOfVisit(leg, idx, n);
      const label = v.bust ? `<span class="bad">Bust</span> <span class="muted">(${v.entered})</span>` : v.score;
      const hits = v.hits ? `<small class="muted">${v.hits.join(' ')}</small>` : '';
      return `<li><span class="hp">${esc(s.players[p])} ${hits}</span><span class="hs">${label}</span><span class="hr muted">${afterByVisit[idx]}</span></li>`;
    }).join('');

    let bottom;
    if (winner >= 0) {
      const rows = s.players.map((name, p) => {
        const st = playerStats(m, p);
        return `<tr class="${p === winner ? 'win' : ''}"><td>${esc(name)}</td><td>${won[p]}</td><td>${fmtAvg(st.avg)}</td><td>${st.c180}</td><td>${st.highCheckout || '&ndash;'}</td><td>${st.bestLeg ?? '&ndash;'}</td></tr>`;
      }).join('');
      bottom = `
        <section class="card matchover">
          <h2>&#127942; ${esc(s.players[winner])} wins the match</h2>
          <div class="table-wrap"><table class="stats">
            <thead><tr><th>Player</th><th>Legs</th><th>Avg</th><th>180s</th><th>High CO</th><th>Best leg</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
          <p class="muted small-text">Saved to history.</p>
          <div class="actions">
            <button class="btn primary" data-action="rematch">Rematch</button>
            <button class="btn ghost" data-action="setup">Change setup</button>
          </div>
        </section>`;
    } else if (dartMode) {
      const prefix = ui.mult === 'S' ? '' : ui.mult;
      const slots = [0, 1, 2].map((i) => {
        const d = ui.darts[i];
        const isNext = i === ui.darts.length;
        const text = d ? d.label : (isNext && ui.entry ? prefix + ui.entry : (isNext ? prefix || '&middot;' : '&middot;'));
        return `<span class="slot ${d ? 'filled' : ''} ${isNext ? 'next' : ''}">${text}</span>`;
      }).join('');
      bottom = `
        <section class="entry-area">
          ${renderModeSwitch(s)}
          <div class="dart-entry" aria-label="Darts entered">
            <div class="dart-slots">${slots}</div>
            <div class="dart-sum"><b>${partial}</b><span class="muted"> scored</span></div>
          </div>
          <div class="mults">
            ${['S', 'D', 'T'].map((k) => `<button class="seg ${ui.mult === k ? 'on' : ''}" data-action="mult" data-value="${k}">${{ S: 'Single', D: 'Double', T: 'Treble' }[k]}</button>`).join('')}
            <button class="seg miss" data-action="hit" data-value="0">Miss</button>
          </div>
          <div class="board-grid">
            ${Array.from({ length: 20 }, (_, i) => i + 1).map((n) => `<button class="key hit" data-action="hit" data-value="${n}">${prefix}${n}</button>`).join('')}
            <button class="key hit bull" data-action="hit" data-value="25" ${ui.mult === 'T' ? 'disabled' : ''}>${ui.mult === 'D' ? 'Bull' : '25'}</button>
            <button class="key hit alt" data-action="remove-dart" aria-label="Remove last dart" ${ui.darts.length ? '' : 'disabled'}>&#9003;</button>
            <button class="key hit alt" data-action="undo" aria-label="Undo last visit" ${canUndo(m) ? '' : 'disabled'}>&#8630;</button>
          </div>
        </section>`;
    } else {
      bottom = `
        <section class="entry-area">
          ${renderModeSwitch(s)}
          <div class="entry ${ui.entry ? '' : 'empty'}" aria-label="Score entry">${ui.entry || 'Enter score'}</div>
          <div class="chips">
            ${QUICK_SCORES.map((q) => `<button class="chip" data-action="quick" data-value="${q}">${q}</button>`).join('')}
          </div>
          <div class="keypad">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button class="key" data-action="digit" data-value="${d}">${d}</button>`).join('')}
            <button class="key alt" data-action="backspace" aria-label="Backspace">&#9003;</button>
            <button class="key" data-action="digit" data-value="0">0</button>
            <button class="key ok" data-action="submit" aria-label="Submit score" ${ui.entry === '' ? 'disabled' : ''}>&#10003;</button>
          </div>
          <div class="actions">
            <button class="btn ghost" data-action="quick" data-value="0">No score</button>
            <button class="btn ghost" data-action="undo" ${canUndo(m) ? '' : 'disabled'}>&#8630; Undo</button>
          </div>
        </section>`;
    }

    return `
      <div class="screen game">
        <header class="topbar">
          <button class="icon" data-action="menu" aria-label="Menu">&#9776;</button>
          <div class="title">${s.startScore} &middot; Leg ${m.legs.length}${s.legsToWin > 1 ? ` &middot; First to ${s.legsToWin}` : ''}${s.doubleOut ? '' : ' &middot; Straight out'}</div>
          <button class="icon" data-action="stats" aria-label="Statistics">&#8801;</button>
        </header>
        <section class="players n${Math.min(n, 4)}">${cards}</section>
        ${bottom}
        ${leg.visits.length ? `<section class="history"><ul>${history}</ul></section>` : ''}
      </div>`;
  }

  function renderModeSwitch(s) {
    return `
      <div class="segmented compact mode-switch" role="group" aria-label="Score entry mode">
        <button class="seg ${s.inputMode === 'total' ? 'on' : ''}" data-action="set-mode" data-value="total">Total</button>
        <button class="seg ${s.inputMode === 'darts' ? 'on' : ''}" data-action="set-mode" data-value="darts">Per dart</button>
      </div>`;
  }

  function renderHistory() {
    const totals = aggregateHistory(state.history);
    const lifetime = totals.length ? `
      <div class="table-wrap"><table class="stats">
        <thead><tr><th>Player</th><th>W</th><th>P</th><th>Legs</th><th>Avg</th><th>180</th><th>140+</th><th>100+</th><th>High CO</th><th>Best leg</th></tr></thead>
        <tbody>${totals.map((t) => `<tr><td>${esc(t.name)}</td><td>${t.wins}</td><td>${t.matches}</td><td>${t.legs}</td><td>${fmtAvg(t.avg)}</td><td>${t.c180}</td><td>${t.c140}</td><td>${t.c100}</td><td>${t.highCheckout || '&ndash;'}</td><td>${t.bestLeg ?? '&ndash;'}</td></tr>`).join('')}</tbody>
      </table></div>` : '<p class="muted">No finished matches yet. Stats appear here once a match is won.</p>';

    const matches = state.history.map((h) => {
      const line = h.players.map((p, i) => `<span class="${i === h.winner ? 'win' : ''}">${esc(p.name)} <b>${p.legs}</b></span>`).join('<span class="muted"> &ndash; </span>');
      const avgs = h.players.map((p) => `${esc(p.name)} ${fmtAvg(p.avg)}`).join(' &middot; ');
      return `
        <li class="match">
          <div class="match-main">
            <div class="match-line">${line}</div>
            <div class="muted small-text">${fmtDate(h.finishedAt)} &middot; ${h.startScore}${h.doubleOut ? '' : ' straight'} &middot; first to ${h.legsToWin}</div>
            <div class="muted small-text">Avg ${avgs}</div>
          </div>
          <button class="icon" data-action="delete-match" data-id="${esc(h.id)}" aria-label="Delete match">&#10005;</button>
        </li>`;
    }).join('');

    return `
      <div class="screen history-screen">
        <header class="topbar">
          <button class="icon" data-action="setup" aria-label="Back">&#8592;</button>
          <div class="title">History</div>
          <span class="icon-spacer"></span>
        </header>
        <section class="card">
          <h2>Lifetime stats</h2>
          ${lifetime}
        </section>
        <section class="card">
          <h2>Matches ${state.history.length ? `(${state.history.length})` : ''}</h2>
          ${state.history.length ? `<ul class="matches">${matches}</ul>` : '<p class="muted">Nothing here yet.</p>'}
        </section>
        <section class="card">
          <h2>Backup</h2>
          <p class="muted small-text">Data is stored in this browser only. Export a backup to keep it safe or move it to another device.</p>
          <div class="actions">
            <button class="btn ghost" data-action="export" ${state.history.length || state.roster.length ? '' : 'disabled'}>Export</button>
            <button class="btn ghost" data-action="import">Import</button>
          </div>
          <input type="file" accept="application/json,.json" data-import hidden>
          <button class="btn ghost block danger-text" data-action="clear-history" ${state.history.length ? '' : 'disabled'}>Clear history</button>
        </section>
      </div>`;
  }

  function renderModal() {
    const modal = ui.modal;
    if (!modal) return '';
    const m = state.match;
    let inner = '';
    if (modal.type === 'darts') {
      inner = `
        <h2>Checkout ${modal.score}!</h2>
        <p>How many darts did it take?</p>
        <div class="choices">
          ${[1, 2, 3].map((d) => `<button class="btn ${d >= modal.minDarts ? 'primary' : ''}" data-action="darts" data-value="${d}" ${d < modal.minDarts ? 'disabled' : ''}>${d}</button>`).join('')}
        </div>
        <button class="btn ghost block" data-action="close">Cancel</button>`;
    } else if (modal.type === 'legWon') {
      const next = currentLeg(m);
      inner = `
        <h2>${esc(m.settings.players[modal.player])} wins leg ${modal.legNo}</h2>
        <p>${modal.darts} darts &middot; ${modal.checkout} checkout</p>
        <p class="muted">Legs: ${legsWon(m).map((w, i) => `${esc(m.settings.players[i])} ${w}`).join(' &middot; ')}</p>
        <p class="muted">${esc(m.settings.players[next.starter])} throws first</p>
        <button class="btn primary block" data-action="close">Next leg</button>`;
    } else if (modal.type === 'menu') {
      inner = `
        <h2>Menu</h2>
        <button class="btn ghost block" data-action="stats">Match statistics</button>
        <button class="btn ghost block" data-action="history-confirm">History</button>
        <button class="btn ghost block" data-action="rematch-confirm">New match (same players)</button>
        <button class="btn ghost block" data-action="setup-confirm">Change setup</button>
        <button class="btn primary block" data-action="close">Back to game</button>`;
    } else if (modal.type === 'confirm') {
      inner = `
        <h2>${esc(modal.title)}</h2>
        <p>${esc(modal.text)}</p>
        <div class="choices">
          <button class="btn ghost" data-action="close">Cancel</button>
          <button class="btn danger" data-action="${modal.action}">${esc(modal.confirmLabel)}</button>
        </div>`;
    } else if (modal.type === 'stats') {
      const won = legsWon(m);
      const rows = m.settings.players.map((name, p) => {
        const st = playerStats(m, p);
        return `<tr><td>${esc(name)}</td><td>${won[p]}</td><td>${fmtAvg(st.avg)}</td><td>${st.c180}</td><td>${st.c140}</td><td>${st.c100}</td><td>${st.highCheckout || '&ndash;'}</td><td>${st.bestLeg ?? '&ndash;'}</td><td>${st.darts}</td></tr>`;
      }).join('');
      inner = `
        <h2>Match statistics</h2>
        <div class="table-wrap"><table class="stats">
          <thead><tr><th>Player</th><th>Legs</th><th>Avg</th><th>180</th><th>140+</th><th>100+</th><th>High CO</th><th>Best leg</th><th>Darts</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        <button class="btn primary block" data-action="close">Close</button>`;
    }
    return `<div class="overlay" data-action="close"><div class="modal" role="dialog" aria-modal="true">${inner}</div></div>`;
  }

  function renderFlash() {
    if (!ui.flash) return '';
    return `<div class="flash ${ui.flash.kind}">${esc(ui.flash.text)}</div>`;
  }

  // Expose the pure rules for `npm test` (Node) without touching the DOM.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { evaluateVisit, evaluateDarts, dartFromHit, checkoutRoute, DOUBLE_OUT_TABLE, IMPOSSIBLE_SCORES, SEGMENTS, newMatch, legRemaining, legsWon, matchWinner, playerStats, aggregateHistory };
    return;
  }

  // ---------- Events ----------
  function confirmIfInProgress(title, text, action, confirmLabel, otherwise) {
    const m = state.match;
    if (m && matchWinner(m) < 0 && canUndo(m)) ui.modal = { type: 'confirm', title, text, action, confirmLabel };
    else otherwise();
  }

  function handleAction(action, el) {
    const s = state.settings;
    const m = state.match;
    switch (action) {
      // setup
      case 'set-start': s.startScore = Number(el.dataset.value); break;
      case 'toggle-double': s.doubleOut = !s.doubleOut; break;
      case 'legs-inc': s.legsToWin = Math.min(MAX_LEGS, s.legsToWin + 1); break;
      case 'legs-dec': s.legsToWin = Math.max(1, s.legsToWin - 1); break;
      case 'add-player': if (s.players.length < MAX_PLAYERS) s.players.push(`Player ${s.players.length + 1}`); break;
      case 'remove-player': if (s.players.length > 1) s.players.splice(Number(el.dataset.index), 1); break;
      case 'roster-add':
        if (s.players.length < MAX_PLAYERS && !s.players.includes(el.dataset.name)) {
          // Replace an untouched default name first, otherwise append.
          const blank = s.players.findIndex((p, i) => p === `Player ${i + 1}` && !state.roster.includes(p));
          if (blank >= 0) s.players[blank] = el.dataset.name; else s.players.push(el.dataset.name);
        }
        break;
      case 'roster-remove': state.roster = state.roster.filter((n) => n !== el.dataset.name); if (!state.roster.length) ui.manageRoster = false; break;
      case 'roster-manage': ui.manageRoster = !ui.manageRoster; break;
      case 'set-mode':
        s.inputMode = el.dataset.value;
        if (m) m.settings.inputMode = el.dataset.value;
        ui.entry = ''; ui.darts = []; ui.mult = 'S';
        break;
      case 'start': startGame(); return;
      case 'resume': state.screen = 'game'; break;
      // per-dart entry
      case 'mult': ui.mult = ui.mult === el.dataset.value ? 'S' : el.dataset.value; break;
      case 'hit': addDart(Number(el.dataset.value)); return;
      case 'remove-dart': removeDart(); return;
      case 'install':
        if (ui.installPrompt) { const p = ui.installPrompt; ui.installPrompt = null; p.prompt(); }
        break;
      // game
      case 'digit': appendDigit(el.dataset.value); return;
      case 'backspace': ui.entry = ui.entry.slice(0, -1); break;
      case 'submit': if (ui.entry !== '') submitScore(Number(ui.entry)); return;
      case 'quick': ui.entry = ''; submitScore(Number(el.dataset.value)); return;
      case 'undo': undo(); return;
      case 'darts': confirmCheckout(Number(el.dataset.value)); return;
      case 'menu': ui.modal = { type: 'menu' }; break;
      case 'stats': ui.modal = { type: 'stats' }; break;
      case 'close': ui.modal = null; break;
      case 'rematch-confirm':
        confirmIfInProgress('Start a new match?', 'The current match will be discarded.', 'rematch', 'New match', () => { rematch(); });
        if (!ui.modal) return;
        break;
      case 'setup-confirm':
        confirmIfInProgress('Leave this match?', 'You can resume it from the setup screen until a new game is started.', 'setup', 'Leave', () => { ui.modal = null; state.screen = 'setup'; });
        break;
      case 'history-confirm':
        confirmIfInProgress('Leave this match?', 'You can resume it from the setup screen until a new game is started.', 'history', 'Leave', () => { ui.modal = null; state.screen = 'history'; });
        break;
      case 'rematch': rematch(); return;
      case 'setup': ui.modal = null; ui.manageRoster = false; state.screen = 'setup'; break;
      case 'history': ui.modal = null; state.screen = 'history'; break;
      // history
      case 'delete-match':
        ui.modal = { type: 'confirm', title: 'Delete this match?', text: 'It will be removed from history and lifetime stats.', action: 'delete-match-do', confirmLabel: 'Delete', id: el.dataset.id };
        break;
      case 'delete-match-do':
        state.history = state.history.filter((h) => h.id !== ui.modal.id);
        if (m && m.recordedId === ui.modal.id) delete m.recordedId;
        ui.modal = null;
        break;
      case 'clear-history':
        ui.modal = { type: 'confirm', title: 'Clear all history?', text: `${state.history.length} saved match${state.history.length === 1 ? '' : 'es'} and all lifetime stats will be deleted. Export a backup first if you want to keep them.`, action: 'clear-history-do', confirmLabel: 'Clear' };
        break;
      case 'clear-history-do': state.history = []; if (m) delete m.recordedId; ui.modal = null; break;
      case 'export': exportBackup(); return;
      case 'import': { const input = document.querySelector('input[data-import]'); if (input) input.click(); return; }
      default: return;
    }
    save(); render();
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    // Clicks inside the modal must not fall through to the overlay's close action.
    if (el.classList.contains('overlay') && e.target !== el) return;
    handleAction(el.dataset.action, el);
  });

  document.addEventListener('input', (e) => {
    const idx = e.target.dataset && e.target.dataset.nameIndex;
    if (idx === undefined) return;
    state.settings.players[Number(idx)] = e.target.value;
    save();
  });

  document.addEventListener('change', (e) => {
    if (!e.target.matches('input[data-import]') || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    file.text().then(importBackup).catch(() => { flash('Could not read that file', 'warn'); render(); });
  });

  document.addEventListener('keydown', (e) => {
    if (e.target && e.target.matches && e.target.matches('input, textarea')) return;
    if (ui.modal) {
      if (e.key === 'Escape') { ui.modal = null; render(); }
      else if (ui.modal.type === 'darts' && /^[123]$/.test(e.key) && Number(e.key) >= ui.modal.minDarts) confirmCheckout(Number(e.key));
      else if (ui.modal.type === 'legWon' && e.key === 'Enter') { ui.modal = null; render(); }
      return;
    }
    if (state.screen !== 'game' || !state.match) return;
    if (state.match.settings.inputMode === 'darts') {
      // s/d/t pick the multiplier, digits type a number, Enter confirms it, b = bull/25, m = miss.
      const k = e.key.toLowerCase();
      if (/^\d$/.test(k)) { const next = (ui.entry + k).replace(/^0+(?=\d)/, ''); if (Number(next) <= 25) { ui.entry = next; render(); } e.preventDefault(); }
      else if (k === 's' || k === 'd' || k === 't') { ui.mult = k.toUpperCase(); render(); }
      else if (k === 'b') { addDart(25); }
      else if (k === 'm') { addDart(0); }
      else if (k === 'enter' && ui.entry !== '') { const n = Number(ui.entry); if ((n >= 1 && n <= 20) || n === 25 || n === 0) addDart(n); else { ui.entry = ''; render(); } e.preventDefault(); }
      else if (k === 'backspace') { if (ui.entry) { ui.entry = ui.entry.slice(0, -1); render(); } else removeDart(); e.preventDefault(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'z') { undo(); e.preventDefault(); }
      else if (k === 'escape') { ui.entry = ''; ui.mult = 'S'; render(); }
      return;
    }
    if (/^\d$/.test(e.key)) { appendDigit(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { ui.entry = ui.entry.slice(0, -1); render(); e.preventDefault(); }
    else if (e.key === 'Enter' && ui.entry !== '') { submitScore(Number(ui.entry)); e.preventDefault(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { undo(); e.preventDefault(); }
    else if (e.key === 'Escape') { ui.entry = ''; render(); }
  });

  // PWA: offline cache and install prompt.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    ui.installPrompt = e;
    if (state.screen === 'setup') render();
  });
  window.addEventListener('appinstalled', () => { ui.installPrompt = null; render(); });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  load();
  render();
})();
