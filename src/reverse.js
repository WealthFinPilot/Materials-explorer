// reverse.js — V2 "Reverse" tab: grade lookup (A) + compliance check (B).
import { checkCompliance, parseRequirement } from './compliance.js';

const SILOS = ['fe01', 'fe30'];
const db = {};       // fe01/fe30 similarity datasets (compositions)
const requis = {};   // fe01/fe30 compliance datasets
let current = 'fe01';

// Example measured compositions (realistic) — should yield at least one PASS.
const EXAMPLES = {
  fe01: { C: 0.45, Mn: 0.75, P: 0.02, S: 0.03, Si: 0.22 },          // ~ AISI 1045
  fe30: { C: 0.02, Mn: 1.6, P: 0.03, S: 0.02, Si: 0.5, Ni: 10.2, Cr: 17.0, Mo: 2.1 }, // ~ 316L
};

const $ = (s) => document.querySelector(s);
const seg = $('#rev-silo-seg');
const siloMeta = $('#rev-silo-meta');
const grid = $('#comply-grid');
const gradeList = $('#grade-list');

async function boot() {
  const loaded = await Promise.all(
    SILOS.flatMap((s) => [
      fetch(`data/${s}.json`).then((r) => r.json()),
      fetch(`data/${s}_requis.json`).then((r) => r.json()),
    ])
  );
  SILOS.forEach((s, i) => { db[s] = loaded[i * 2]; requis[s] = loaded[i * 2 + 1]; });

  buildSiloSegments();
  buildComplyGrid();
  buildGradeList();

  $('#lookup-input').addEventListener('input', onLookup);
  $('#comply-form').addEventListener('submit', onComply);
  $('#btn-comply-clear').addEventListener('click', clearComply);
  $('#btn-comply-example').addEventListener('click', loadExample);
}

// ---------- shared silo selector ----------
function buildSiloSegments() {
  seg.innerHTML = '';
  for (const s of SILOS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = db[s].label;
    b.setAttribute('aria-pressed', String(s === current));
    b.addEventListener('click', () => selectSilo(s));
    seg.appendChild(b);
  }
  updateSiloMeta();
}

function selectSilo(s) {
  if (s === current) return;
  current = s;
  [...seg.children].forEach((b, i) => b.setAttribute('aria-pressed', String(SILOS[i] === s)));
  updateSiloMeta();
  buildComplyGrid();
  buildGradeList();
  // reset both sections — stale results across silos are misleading
  $('#lookup-input').value = '';
  $('#lookup-result').innerHTML = '';
  $('#comply-results-panel').hidden = true;
}

function updateSiloMeta() {
  siloMeta.textContent = `${requis[current].length} graded specs`;
}

// elements that actually carry a constraint somewhere in the current silo
function constrainedElements() {
  const els = db[current].elements;
  const used = new Set();
  for (const g of requis[current]) {
    for (const [el, raw] of Object.entries(g.requirements)) {
      if (parseRequirement(raw)) used.add(el);
    }
  }
  return els.filter((el) => used.has(el));
}

// ---------- Section A — grade lookup ----------
function buildGradeList() {
  gradeList.innerHTML = '';
  for (const g of requis[current]) {
    const opt = document.createElement('option');
    opt.value = g.grade;
    opt.label = g.std;
    gradeList.appendChild(opt);
  }
}

function findGrade(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return requis[current].find(
    (g) => g.grade.toLowerCase() === q || g.std.toLowerCase() === q
  ) || null;
}

function prettyConstraint(c) {
  if (c.kind === 'max') return `≤ ${c.max}`;
  if (c.kind === 'min') return `≥ ${c.min}`;
  return `${c.min}–${c.max}`;
}

function onLookup() {
  const g = findGrade($('#lookup-input').value);
  const box = $('#lookup-result');
  if (!g) { box.innerHTML = ''; return; }

  const alloy = db[current].alloys.find((a) => a.std === g.std);
  const shape = g.shape.length
    ? `<div class="chips">${g.shape.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('')}</div>`
    : '';

  const rows = Object.entries(g.requirements)
    .map(([el, raw]) => [el, parseRequirement(raw)])
    .filter(([, c]) => c)
    .map(([el, c]) => {
      const nominal = alloy && alloy.composition[el] != null ? `${alloy.composition[el]}` : '—';
      return `<tr><td class="spec__el">${el}</td><td class="spec__lim">${prettyConstraint(c)}</td><td class="spec__nom">${nominal}</td></tr>`;
    })
    .join('');

  box.innerHTML = `
    <div class="lookup__card">
      <div class="lookup__head">
        <div>
          <div class="lookup__std">${escapeHtml(g.std)}</div>
          ${g.type ? `<div class="lookup__type">${escapeHtml(g.type)}</div>` : ''}
        </div>
        <span class="lookup__count">${g.nb_requis} requirement${g.nb_requis > 1 ? 's' : ''}</span>
      </div>
      ${shape}
      <table class="spec">
        <thead><tr><th>Element</th><th>Specified limit (%)</th><th>Nominal (%)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ---------- Section B — compliance check ----------
function buildComplyGrid() {
  const prev = readGrid();
  grid.innerHTML = '';
  for (const el of constrainedElements()) {
    const field = document.createElement('div');
    field.className = 'field';
    field.innerHTML = `
      <label for="cmp-${el}">
        <span class="sym">${el}</span>
        <span class="w" title="metallurgical weight">w ${db[current].weights[el] ?? 0}</span>
      </label>
      <input id="cmp-${el}" name="${el}" type="text" inputmode="decimal"
             placeholder="—" autocomplete="off" spellcheck="false"
             aria-label="${el} value in % weight" />
      <span class="field__err" aria-live="polite"></span>`;
    grid.appendChild(field);
    const inp = field.querySelector('input');
    if (prev[el] !== undefined) inp.value = prev[el];
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(',', '.');
      validateField(inp);
    });
    inp.addEventListener('blur', () => validateField(inp));
  }
}

function readGrid() {
  const values = {};
  const errors = [];
  for (const inp of grid.querySelectorAll('input')) {
    const raw = inp.value.replace(',', '.').trim();
    if (raw === '') continue;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) { errors.push(inp.name); continue; }
    if (n < 0 || n > 100) { errors.push(inp.name); continue; }
    values[inp.name] = n;
  }
  return Object.assign(values, { errors });
}

function validateField(inp) {
  const span = inp.closest('.field')?.querySelector('.field__err');
  if (!span) return;
  const raw = inp.value.replace(',', '.').trim();
  if (raw === '') { inp.classList.remove('input--err'); span.textContent = ''; return; }
  const n = parseFloat(raw);
  let msg = '';
  if (Number.isNaN(n)) msg = 'Not a number';
  else if (n < 0) msg = '≥ 0 required';
  else if (n > 100) msg = '≤ 100 % max';
  inp.classList.toggle('input--err', !!msg);
  span.textContent = msg;
}

function clearComply() {
  for (const inp of grid.querySelectorAll('input')) {
    inp.value = '';
    inp.classList.remove('input--err');
    inp.closest('.field').querySelector('.field__err').textContent = '';
  }
  $('#comply-results-panel').hidden = true;
}

function loadExample() {
  const ex = EXAMPLES[current] ?? {};
  for (const inp of grid.querySelectorAll('input')) {
    inp.value = ex[inp.name] !== undefined ? String(ex[inp.name]) : '';
    inp.classList.remove('input--err');
    inp.closest('.field').querySelector('.field__err').textContent = '';
  }
}

function onComply(e) {
  e.preventDefault();
  grid.querySelectorAll('input').forEach(validateField);
  const input = readGrid();
  const { errors } = input;
  delete input.errors;
  if (errors.length) return;

  const results = checkCompliance(input, db[current].weights, requis[current], 10);
  renderComply(results, Object.keys(input).length);
}

function renderComply(results, nEntered) {
  $('#comply-results-panel').hidden = false;
  $('#comply-results-hint').textContent = nEntered === 0
    ? 'Enter at least one measured value above.'
    : `Tested ${nEntered} entered element${nEntered > 1 ? 's' : ''} against ${requis[current].length} ${db[current].label} specifications.`;

  const box = $('#comply-results');
  if (!results.length) {
    box.innerHTML = '<p class="empty">No grade matches the entered values. Try more elements, or switch database.</p>';
    return;
  }
  box.innerHTML = results.map((r, i) => complyRow(r, i)).join('');
}

function complyRow(r, i) {
  const pct = `${Math.round(r.match * 100)}%`;
  const badge = r.verdict === 'PASS'
    ? '<span class="verdict verdict--pass">PASS</span>'
    : '<span class="verdict verdict--fail">FAIL</span>';

  const chips = r.details.map((d) => {
    const cls = d.value === null ? 'dchip--na' : (d.pass ? 'dchip--ok' : 'dchip--bad');
    const val = d.value === null ? 'n/a' : d.value;
    return `<span class="dchip ${cls}" title="${escapeHtml(d.el)}: limit ${escapeHtml(String(d.raw))}, measured ${val}">${d.el}</span>`;
  }).join('');

  return `
    <div class="result ${r.verdict === 'PASS' ? 'result--pass' : ''}" style="--d:${Math.min(i * 28, 224)}ms">
      <div class="result__rank">${i + 1}</div>
      <div>
        <div class="result__std">${escapeHtml(r.grade.std)} ${badge}</div>
        ${r.grade.type ? `<div class="lookup__type">${escapeHtml(r.grade.type)}</div>` : ''}
        <div class="dchips">${chips}</div>
        <div class="result__meta">${r.validated}/${r.nb_requis} requirements met</div>
      </div>
      <div class="result__score">
        <span class="result__pct">${pct}</span>
        <span class="bar"><span style="width:${(r.match * 100).toFixed(1)}%"></span></span>
      </div>
    </div>`;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

boot();
