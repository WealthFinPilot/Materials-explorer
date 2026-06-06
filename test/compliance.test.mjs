// Node test for compliance.js — no dependencies. Run: node test/compliance.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseRequirement, satisfies, evaluateGrade, checkCompliance,
} from '../src/compliance.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => JSON.parse(readFileSync(join(root, 'data', f), 'utf-8'));

let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.error('  FAIL:', msg); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

// --- parseRequirement ---
ok(parseRequirement('') === null, 'empty -> null');
ok(parseRequirement(null) === null, 'null -> null');
const max = parseRequirement('0.10');
ok(max.kind === 'max' && near(max.max, 0.10), 'number -> max');
const rng = parseRequirement('0.30–0.50'); // EN DASH
ok(rng.kind === 'range' && near(rng.min, 0.30) && near(rng.max, 0.50), 'en-dash range');
const rngHyphen = parseRequirement('0.30-0.50'); // plain hyphen also accepted
ok(rngHyphen.kind === 'range' && near(rngHyphen.max, 0.50), 'hyphen range');
const mn = parseRequirement('0.15 min');
ok(mn.kind === 'min' && near(mn.min, 0.15), 'min constraint');
const mx = parseRequirement('0.13 max');
ok(mx.kind === 'max' && near(mx.max, 0.13), 'max constraint');

// --- satisfies ---
ok(satisfies({ kind: 'max', max: 0.10 }, 0.08) === true, 'max ok');
ok(satisfies({ kind: 'max', max: 0.10 }, 0.12) === false, 'max exceeded');
ok(satisfies({ kind: 'min', min: 0.15 }, 0.20) === true, 'min ok');
ok(satisfies({ kind: 'min', min: 0.15 }, 0.10) === false, 'min not met');
ok(satisfies({ kind: 'range', min: 0.30, max: 0.50 }, 0.40) === true, 'range in');
ok(satisfies({ kind: 'range', min: 0.30, max: 0.50 }, 0.60) === false, 'range out');

// --- evaluateGrade on a real grade (AISI 1008: C≤0.10, Mn 0.30–0.50, P≤0.04, S≤0.05) ---
const fe01 = load('fe01.json');
const fe01req = load('fe01_requis.json');
const g1008 = fe01req.find((g) => g.grade === '1008');
ok(g1008 && g1008.nb_requis === 4, '1008 has 4 requirements');

const pass = evaluateGrade({ C: 0.08, Mn: 0.40, P: 0.02, S: 0.03 }, fe01.weights, g1008);
ok(pass.verdict === 'PASS' && near(pass.match, 1) && pass.validated === 4, '1008 fully compliant -> PASS 100%');

// Fail only on C (w=500). Applicable weight = 500+400+50+50 = 1000 -> match = 500/1000.
const failC = evaluateGrade({ C: 0.20, Mn: 0.40, P: 0.02, S: 0.03 }, fe01.weights, g1008);
ok(failC.verdict === 'FAIL' && failC.validated === 3, 'C out of spec -> FAIL');
ok(near(failC.match, 0.5), `C fail weighted match = 0.5 (got ${failC.match})`);

// A trace-only miss must score higher than a C miss (weighting works).
// Synthetic grade: C≤0.10 (w500) + Pb≤0.01 (w10). Miss Pb -> match 500/510; miss C -> 10/510.
const synth = { nb_requis: 2, requirements: { C: '0.10', Pb: '0.01' } };
const missTrace = evaluateGrade({ C: 0.05, Pb: 0.5 }, fe01.weights, synth);
const missMajor = evaluateGrade({ C: 0.5, Pb: 0.005 }, fe01.weights, synth);
ok(missTrace.match > missMajor.match, 'trace miss ranks above major miss');

// --- checkCompliance: PASS grades come first ---
const ranked = checkCompliance({ C: 0.08, Mn: 0.40, P: 0.02, S: 0.03 }, fe01.weights, fe01req, 10);
ok(ranked.length > 0 && ranked[0].verdict === 'PASS', 'top result is a PASS');
ok(ranked.every((r) => r.match <= 1), 'match never exceeds 100%');
const firstFail = ranked.findIndex((r) => r.verdict === 'FAIL');
const lastPass = ranked.map((r) => r.verdict).lastIndexOf('PASS');
ok(firstFail === -1 || firstFail > lastPass, 'all PASS ranked before any FAIL');

// empty input -> no results
ok(checkCompliance({}, fe01.weights, fe01req).length === 0, 'empty input -> []');

console.log(failures === 0 ? 'ALL COMPLIANCE TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
