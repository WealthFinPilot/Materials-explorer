// Node test for engine.js — no dependencies. Run: node test/engine.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rank, similarity } from '../src/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (silo) => JSON.parse(readFileSync(join(root, 'data', `${silo}.json`), 'utf-8'));

let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.error('  FAIL:', msg); } };

// --- unit: similarity ---
ok(similarity(5, 5) === 1, 'similarity equal = 1');
ok(similarity(0, 0) === 1, 'similarity 0/0 = 1');
ok(Math.abs(similarity(2, 4) - 0.5) < 1e-12, 'similarity 2/4 = 0.5');
ok(similarity(3, 0) === 0, 'similarity vs missing = 0');

// --- identity: each alloy fed as input must rank itself #1 ---
for (const name of ['fe01', 'fe30']) {
  const silo = load(name);
  let selfTop = 0;
  for (const a of silo.alloys) {
    const input = {};
    for (const [el, v] of Object.entries(a.composition)) {
      if (typeof v === 'number' && v > 0) input[el] = v;
    }
    const res = rank(input, silo, 1);
    if (res[0] && res[0].std === a.std) selfTop++;
  }
  ok(selfTop === silo.alloys.length, `${name}: identity ${selfTop}/${silo.alloys.length}`);
  console.log(`  ${name}: identity ${selfTop}/${silo.alloys.length}, top score bounded:`,
    rank({ C: 0.082, Cr: 0.94 }, silo, 1)[0].score <= 1);
}

// --- empty input → no results ---
ok(rank({}, load('fe01')).length === 0, 'empty input returns []');

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
