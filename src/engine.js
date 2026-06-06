// engine.js — pure matching engine. No DOM, no side effects.
//
// Algorithm (faithful to the source VBA tool — see docs/source-analysis.md §3.4):
//   For each element i actually entered by the user (x_i provided):
//       W_total += w_i
//       sim_i  = 1                       if x_i === s_i
//              = min(x_i, s_i) / max(x_i, s_i)   otherwise   ∈ [0, 1]
//       (a missing reference value s_i is treated as 0 → sim_i = 0)
//   score_j = Σ (w_i · sim_i) / W_total                      ∈ [0, 1]
//   Ranking: descending by score_j.
//
// No normalisation: OES input and reference compositions share the same %
// scale, so normalising would destroy absolute-level information.

/**
 * Element-wise ratio similarity in [0, 1].
 * @param {number} x measured value (> 0 expected)
 * @param {number} s reference value (0 if not measured)
 */
export function similarity(x, s) {
  if (x === s) return 1;
  const hi = Math.max(x, s);
  if (hi === 0) return 1; // both zero
  return Math.min(x, s) / hi;
}

/**
 * Score a single alloy against the input.
 * @param {Object<string,number>} input  entered elements → value
 * @param {Object<string,number>} weights element → weight
 * @param {Object<string,number|null>} composition element → reference value
 * @returns {number} score in [0, 1]
 */
export function scoreAlloy(input, weights, composition) {
  let weighted = 0;
  let wTotal = 0;
  for (const el of Object.keys(input)) {
    const w = weights[el] ?? 0;
    if (w === 0) continue;
    const s = composition[el] ?? 0;
    weighted += similarity(input[el], s) * w;
    wTotal += w;
  }
  return wTotal === 0 ? 0 : weighted / wTotal;
}

/**
 * Rank every alloy of a silo against the user input.
 * @param {Object<string,number>} input entered elements → value (empty values omitted)
 * @param {{weights:Object, alloys:Array}} silo loaded silo dataset
 * @param {number} [limit=10] number of results to return
 * @returns {Array<{std:string, grade:?string, composition:Object, score:number}>}
 */
export function rank(input, silo, limit = 10) {
  const entered = {};
  for (const [el, v] of Object.entries(input)) {
    if (v !== null && v !== undefined && v !== '' && !Number.isNaN(v)) {
      entered[el] = Number(v);
    }
  }
  if (Object.keys(entered).length === 0) return [];

  return silo.alloys
    .map((a) => ({
      std: a.std,
      grade: a.grade,
      composition: a.composition,
      score: scoreAlloy(entered, silo.weights, a.composition),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
