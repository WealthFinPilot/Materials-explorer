# Materials Explorer

![Status](https://img.shields.io/badge/status-in%20active%20use-brightgreen)
![ISO/IEC 17025](https://img.shields.io/badge/ISO%2FIEC-17025-0A66C2)

A browser-based tool that matches a client's steel sample against a reference database — and returns the top matching grade candidates, ranked by confidence score.

🔗  **Démo en ligne** : **[Materials-explorer.netlify.app](https://materials-selector-wealthfinpilot.netlify.app)** 👆

![Materials Identifier interface](assets/Materials-Identifier.jpeg)

---

## The problem

In the steel industry, thousands of commercial grades exist — each manufacturer produces its own alloy variants with specific chemical compositions, all derived from international standards. When a client submits a steel sample for analysis, the question is always the same: which grade does it match, and do we have something comparable in stock?

Answering that question manually means comparing a dozen chemical element values against reference tables, one by one — a slow, operator-dependent process prone to inconsistency under workload.

This tool automates that comparison: enter the measured chemical composition, and the engine instantly ranks the closest matching grades from the reference database, with a confidence score for each candidate.

The real value of this solution is twofold:

 - It replaces subjective technician judgment with an objective, quantified, and reproducible decision.
 - It transfers specialized know-how from individual experts into a process fully owned by the organization.

## The solution

The tool compares a measured composition against a reference database of known alloys using a weighted chemical-similarity metric. Each element is assigned a metallurgical weight that reflects its discriminating power (carbon and manganese matter more than trace elements in carbon steels; chromium and nickel dominate in stainless). For each reference alloy, the tool computes:

```
sim_i = min(x_i, s_i) / max(x_i, s_i)          per element, ∈ [0, 1]
Score = Σ(w_i · sim_i) / Σ w_i                  weighted average
```

where `x_i` is the measured value and `s_i` the reference composition for element `i`. Only the elements actually entered by the user contribute to the score, so a partial reading still produces a ranked result. The output is a sorted shortlist of the most probable grades with a percentage score.

**The tool also works in reverse**.
Given a target grade, it returns the full requirement profile — element by element, with accepted ranges and maximum thresholds — along with its documented applications (product forms, material family).
For compliance verification, the engine runs a requirement-aware scoring pass: each element in the client composition is checked against the grade's specification. Elements that fall within tolerance contribute positively to the score; elements outside their required range are flagged as non-conforming. The output is a ranked shortlist of the best candidate grades, each labeled PASS or FAIL, with a per-element breakdown showing exactly which values conform and which do not.

## Databases

| Database | Alloy family | Reference alloys | Elements |
|---|---|---|---|
| Carbon & Low-Alloy Steel | Fe-C base | 203 | 18 |
| Stainless Steel (Fe-Cr-Ni) | Austenitic / martensitic | 183 | 18 |

Reference compositions are sourced from certified standard materials and ASTM specifications (BCS, IARM, CRM series, UNS code).

## Stack

Vanilla HTML / CSS / JavaScript — no framework, no build step, no backend. All computation runs in the browser. The reference data is loaded as static JSON at startup.

Deployed as a static site on Netlify.

## Local setup

```bash
# any static file server works — needed for ES module imports
python -m http.server 8000
# then open http://localhost:8000
```

Run the engine unit tests (Node, no dependencies):

```bash
node test/engine.test.mjs
```

## Repository layout

```
data/          reference databases (JSON, extracted from the source workbook)
src/
  engine.js    pure matching engine — normalisation, similarity, ranking
  main.js      UI — form, silo selection, result rendering
  style.css    design system (OKLCH palette, WCAG AA)
test/
  engine.test.mjs   identity and unit tests (44/44 Fe01, 12/12 Fe30)
docs/
  source-analysis.md   algorithm derivation and data inventory
  architecture.md      technical decisions
```
