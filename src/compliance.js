// compliance.js — V2 reverse compliance engine. Pure, no DOM, no side effects.
//
// Weighted boolean conformity (adopted variant of CLAUDE.md V2 spec):
//   For each grade G and each element e carrying a requirement (weight w_e):
//     pass_e = 1 if the client value satisfies the constraint, else 0
//   verdict = PASS  iff  validated === G.nb_requis   (every applicable constraint met)
//   match%  = Σ(w_e · pass_e) / Σ(w_e)   over applicable constraints   ∈ [0, 1]
//
// Rationale: compliance is boolean per constraint. Weighting by w_e ranks a grade
// that only misses a trace element (Pb, w=10) above one that misses C (w=500),
// while staying bounded in [0, 1] — no value-scaled penalties, no >100% capping.

const EN_DASH = '–';

/**
 * Parse a raw requirement cell into a constraint, or null for "no constraint".
 *   ''            -> null
 *   '0.10'        -> { kind:'max', max:0.10 }
 *   '0.30–0.50'   -> { kind:'range', min:0.30, max:0.50 }   (EN DASH or hyphen)
 *   '0.15 min'    -> { kind:'min', min:0.15 }
 *   '0.13 max'    -> { kind:'max', max:0.13 }
 * @param {string|number|null} raw
 * @returns {{kind:string, min?:number, max?:number}|null}
 */
export function parseRequirement(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === '') return null;

  const lower = s.toLowerCase();
  if (lower.endsWith('min')) {
    const n = parseFloat(lower);
    return Number.isNaN(n) ? null : { kind: 'min', min: n };
  }
  if (lower.endsWith('max')) {
    const n = parseFloat(lower);
    return Number.isNaN(n) ? null : { kind: 'max', max: n };
  }

  const norm = s.replace(EN_DASH, '-');
  const parts = norm.split('-').filter((p) => p !== '');
  if (parts.length === 2) {
    const lo = parseFloat(parts[0]);
    const hi = parseFloat(parts[1]);
    if (!Number.isNaN(lo) && !Number.isNaN(hi)) return { kind: 'range', min: lo, max: hi };
  }
  const n = parseFloat(norm);
  return Number.isNaN(n) ? null : { kind: 'max', max: n };
}

/**
 * Is a client value within a parsed constraint?
 * @param {{kind:string, min?:number, max?:number}} c
 * @param {number} v
 */
export function satisfies(c, v) {
  switch (c.kind) {
    case 'max': return v <= c.max;
    case 'min': return v >= c.min;
    case 'range': return v >= c.min && v <= c.max;
    default: return false;
  }
}

/**
 * Score one grade against the client composition.
 * @param {Object<string,number>} input   client values (% weight); missing omitted
 * @param {Object<string,number>} weights element → weight
 * @param {{requirements:Object, nb_requis:number}} grade
 * @returns {{verdict:string, match:number, validated:number, applicable:number,
 *            nb_requis:number, details:Array}}
 */
export function evaluateGrade(input, weights, grade) {
  let wPass = 0;
  let wTotal = 0;
  let validated = 0;
  let applicable = 0;
  const details = [];

  for (const [el, raw] of Object.entries(grade.requirements)) {
    const c = parseRequirement(raw);
    if (!c) continue;
    applicable++;
    const w = weights[el] ?? 0;
    wTotal += w;

    const v = input[el];
    const hasValue = typeof v === 'number' && !Number.isNaN(v);
    const pass = hasValue && satisfies(c, v);
    if (pass) { validated++; wPass += w; }
    details.push({ el, raw, constraint: c, value: hasValue ? v : null, pass });
  }

  const match = wTotal > 0 ? wPass / wTotal : 0;
  const verdict = validated === grade.nb_requis ? 'PASS' : 'FAIL';
  return { verdict, match, validated, applicable, nb_requis: grade.nb_requis, details };
}

/**
 * Rank every grade of a requis dataset against the client composition.
 * PASS grades first, then FAIL grades with a non-zero match, each by match desc.
 * @param {Object<string,number>} input
 * @param {Object<string,number>} weights
 * @param {Array} requisList
 * @param {number} [limit=10]
 * @returns {Array<{grade:Object, verdict:string, match:number, ...}>}
 */
export function checkCompliance(input, weights, requisList, limit = 10) {
  const entered = {};
  for (const [el, v] of Object.entries(input)) {
    if (v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))) {
      entered[el] = Number(v);
    }
  }
  if (Object.keys(entered).length === 0) return [];

  const scored = requisList
    .map((g) => ({ grade: g, ...evaluateGrade(entered, weights, g) }))
    .filter((r) => r.verdict === 'PASS' || r.match > 0);

  scored.sort((a, b) => {
    if (a.verdict !== b.verdict) return a.verdict === 'PASS' ? -1 : 1;
    if (b.match !== a.match) return b.match - a.match;
    return b.nb_requis - a.nb_requis; // among ties, the tighter spec ranks higher
  });

  return scored.slice(0, limit);
}
