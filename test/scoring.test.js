'use strict';
const assert = require('node:assert/strict');
const { evaluateVisit, checkoutRoute, DOUBLE_OUT_TABLE, IMPOSSIBLE_SCORES, newMatch, legRemaining, matchWinner, playerStats, aggregateHistory } = require('../public/app.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (err) { console.error(`FAIL ${name}\n  ${err.message}`); process.exitCode = 1; }
}

const segValue = (label) => {
  if (label === 'Bull') return 50;
  if (label === '25') return 25;
  if (label[0] === 'T') return 3 * Number(label.slice(1));
  if (label[0] === 'D') return 2 * Number(label.slice(1));
  return Number(label);
};

test('double-out table covers 2..170 except the known impossible finishes', () => {
  const noFinish = new Set([169, 168, 166, 165, 163, 162, 159]);
  for (let r = 2; r <= 170; r++) {
    assert.equal(DOUBLE_OUT_TABLE.has(r), !noFinish.has(r), `remaining ${r}`);
  }
  assert.equal(DOUBLE_OUT_TABLE.has(171), false);
  assert.equal(DOUBLE_OUT_TABLE.has(1), false);
});

test('every double-out route adds up and ends on a double', () => {
  for (const [r, route] of DOUBLE_OUT_TABLE) {
    assert.ok(route.length >= 1 && route.length <= 3, `route length for ${r}`);
    const sum = route.reduce((a, l) => a + segValue(l), 0);
    assert.equal(sum, r, `route ${route.join(' ')} sums to ${sum}, not ${r}`);
    const last = route[route.length - 1];
    assert.ok(last === 'Bull' || last[0] === 'D', `route for ${r} ends on ${last}`);
  }
});

test('straight-out routes exist for 1..180 and add up', () => {
  for (let r = 1; r <= 180; r++) {
    if (IMPOSSIBLE_SCORES.has(r)) { assert.equal(checkoutRoute(r, false), null, String(r)); continue; }
    const route = checkoutRoute(r, false);
    assert.ok(route, `no straight route for ${r}`);
    assert.equal(route.reduce((a, l) => a + segValue(l), 0), r);
  }
  assert.equal(checkoutRoute(181, false), null);
  assert.deepEqual(checkoutRoute(60, false), ['T20']);
  assert.deepEqual(checkoutRoute(120, false), ['T20', 'T20']);
});

test('impossible visit totals are rejected', () => {
  for (const s of IMPOSSIBLE_SCORES) assert.ok(evaluateVisit(501, s, true).error, `${s}`);
  assert.ok(evaluateVisit(501, 181, true).error);
  assert.ok(evaluateVisit(501, -1, true).error);
  assert.ok(evaluateVisit(501, 1.5, true).error);
  assert.deepEqual(evaluateVisit(501, 180, true), { ok: true });
  assert.deepEqual(evaluateVisit(501, 0, true), { ok: true });
});

test('bust rules', () => {
  assert.deepEqual(evaluateVisit(40, 41, true), { bust: true });
  assert.deepEqual(evaluateVisit(40, 39, true), { bust: true }); // leaves 1 with double out
  assert.deepEqual(evaluateVisit(40, 39, false), { ok: true }); // straight out may leave 1
  assert.deepEqual(evaluateVisit(40, 38, true), { ok: true });
});

test('checkouts and minimum darts', () => {
  assert.deepEqual(evaluateVisit(40, 40, true), { checkout: true, minDarts: 1 });
  assert.deepEqual(evaluateVisit(50, 50, true), { checkout: true, minDarts: 1 }); // Bull, even though 10 D20 is suggested
  assert.deepEqual(evaluateVisit(100, 100, true), { checkout: true, minDarts: 2 });
  assert.deepEqual(evaluateVisit(2, 2, true), { checkout: true, minDarts: 1 });
  assert.deepEqual(evaluateVisit(41, 41, true), { checkout: true, minDarts: 2 });
  assert.deepEqual(evaluateVisit(170, 170, true), { checkout: true, minDarts: 3 });
  assert.ok(evaluateVisit(169, 169, true).error);
  assert.ok(evaluateVisit(159, 159, true).error);
  assert.deepEqual(evaluateVisit(1, 1, false), { checkout: true, minDarts: 1 });
  assert.deepEqual(evaluateVisit(180, 180, false), { checkout: true, minDarts: 3 });
});

test('leg bookkeeping: remaining, winner and stats', () => {
  const m = newMatch({ startScore: 501, doubleOut: true, legsToWin: 1, players: ['A', 'B'] });
  const leg = m.legs[0];
  const visit = (score, extra = {}) => leg.visits.push({ score, entered: score, darts: 3, bust: false, checkout: false, ...extra });
  visit(180); visit(60); visit(180); visit(0, { bust: true, entered: 100 }); visit(141, { darts: 2, checkout: true });
  leg.winner = 0;
  assert.deepEqual(legRemaining(m, leg), [0, 441]);
  assert.equal(matchWinner(m), 0);
  const a = playerStats(m, 0);
  assert.equal(a.darts, 8);
  assert.equal(a.points, 501);
  assert.equal(a.c180, 2);
  assert.equal(a.highCheckout, 141);
  assert.equal(a.bestLeg, 8);
  assert.equal(Number(a.avg.toFixed(2)), Number(((501 / 8) * 3).toFixed(2)));
  const b = playerStats(m, 1);
  assert.equal(b.darts, 6);
  assert.equal(b.points, 60);
  assert.equal(b.bestLeg, null);
});

test('lifetime stats aggregate saved match summaries by player name', () => {
  const player = (name, legs, extra) => ({ name, legs, darts: 30, points: 501, avg: 50.1, c180: 0, c140: 0, c100: 1, highCheckout: 40, bestLeg: null, ...extra });
  const history = [
    { id: 'a', finishedAt: 2, winner: 0, players: [player('Ann', 3, { c180: 2, bestLeg: 15, highCheckout: 120 }), player('Bob', 1)] },
    { id: 'b', finishedAt: 1, winner: 1, players: [player('Ann', 0, { darts: 60, points: 600 }), player('Bob', 3, { bestLeg: 18, highCheckout: 80 })] },
  ];
  const totals = aggregateHistory(history);
  assert.deepEqual(totals.map((t) => t.name), ['Ann', 'Bob']); // tied on wins, Ann first alphabetically
  const ann = totals[0];
  assert.equal(ann.matches, 2);
  assert.equal(ann.wins, 1);
  assert.equal(ann.legs, 3);
  assert.equal(ann.darts, 90);
  assert.equal(ann.points, 1101);
  assert.equal(Number(ann.avg.toFixed(2)), Number(((1101 / 90) * 3).toFixed(2)));
  assert.equal(ann.c180, 2);
  assert.equal(ann.highCheckout, 120);
  assert.equal(ann.bestLeg, 15);
  const bob = totals[1];
  assert.equal(bob.wins, 1);
  assert.equal(bob.bestLeg, 18);
  assert.equal(bob.highCheckout, 80);
  assert.deepEqual(aggregateHistory([]), []);
});

if (!process.exitCode) console.log(`All ${passed} tests passed`);
