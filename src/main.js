// main.js — UI glue: load silo data, build the form, run the engine, render.
import { rank } from './engine.js';

const SILOS = ['fe01', 'fe30'];
const CONFIDENCE_THRESHOLD = 0.5;
const data = {};
let current = 'fe01';

// Example compositions — realistic "unknown samples" to let non-specialists try the tool.
// Fe01: medium-carbon steel, close to C45/1045 range.
// Fe30: austenitic stainless, close to 316L.
const EXAMPLES = {
  fe01: { C: 0.42, Si: 0.25, Mn: 0.68, P: 0.016, S: 0.020, Cr: 0.12, Ni: 0.09, Cu: 0.14 },
  fe30: { C: 0.022, Si: 0.44, Mn: 1.65, P: 0.030, S: 0.020, Cr: 16.8, Mo: 2.05, Ni: 10.1 },
};

const $ = (sel) => document.querySelector(sel);
const grid = $('#element-grid');
const seg = $('#silo-seg');
const siloMeta = $('#silo-meta');

async function boot() {
  const loaded = await Promise.all(
    SILOS.map((s) => fetch(`data/${s}.json`).then((r) => r.json()))
  );
  SILOS.forEach((s, i) => { data[s] = loaded[i]; });
  buildSiloSegments();
  buildGrid();
  $('#oes-form').addEventListener('submit', onAnalyze);
  $('#btn-clear').addEventListener('click', clearInput);
  $('#btn-example').addEventListener('click', loadExample);
}

function buildSiloSegments() {
  seg.innerHTML = '';
  for (const s of SILOS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = data[s].label;
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
  buildGrid();
}

function updateSiloMeta() {
  siloMeta.textContent = `${data[current].alloys.length} reference alloys · ${data[current].elements.length} elements`;
}

function buildGrid() {
  const { elements, weights } = data[current];
  const prev = readInput().values; // preserve valid values across silo switch
  grid.innerHTML = '';
  for (const el of elements) {
    const field = document.createElement('div');
    field.className = 'field';
    field.innerHTML = `
      <label for="el-${el}">
        <span class="sym">${el}</span>
        <span class="w" title="metallurgical weight">w ${weights[el]}</span>
      </label>
      <input id="el-${el}" name="${el}" type="text" inputmode="decimal"
             placeholder="—" autocomplete="off" spellcheck="false"
             aria-label="${el} value in % weight (0 – 50)" />
      <span class="field__err" aria-live="polite"></span>`;
    grid.appendChild(field);
    const inp = field.querySelector('input');
    if (prev[el] !== undefined) inp.value = prev[el];
    // real-time comma→dot normalisation so the field always shows parseable text
    inp.addEventListener('input', () => {
      const pos = inp.selectionStart;
      const had = inp.value.includes(',');
      inp.value = inp.value.replace(',', '.');
      if (had) inp.setSelectionRange(pos, pos);
      validateField(inp);
    });
    inp.addEventListener('blur', () => validateField(inp));
  }
}

// Returns { values: {elem: number}, errors: [{el, msg}] }
function readInput() {
  const values = {};
  const errors = [];
  for (const inp of grid.querySelectorAll('input')) {
    const raw = inp.value.replace(',', '.').trim();
    if (raw === '') continue;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) {
      errors.push({ el: inp.name, msg: 'Not a number' });
      continue;
    }
    if (n < 0) {
      errors.push({ el: inp.name, msg: 'Must be ≥ 0' });
      continue;
    }
    if (n > 50) {
      errors.push({ el: inp.name, msg: 'Must be ≤ 50 %' });
      continue;
    }
    values[inp.name] = n;
  }
  return { values, errors };
}

function validateField(inp) {
  const errSpan = inp.closest('.field')?.querySelector('.field__err');
  if (!errSpan) return;
  const raw = inp.value.replace(',', '.').trim();
  if (raw === '') { clearFieldErr(inp, errSpan); return; }
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return setFieldErr(inp, errSpan, 'Not a number');
  if (n < 0) return setFieldErr(inp, errSpan, '≥ 0 required');
  if (n > 50) return setFieldErr(inp, errSpan, '≤ 50 % max');
  clearFieldErr(inp, errSpan);
}

function setFieldErr(inp, span, msg) {
  inp.classList.add('input--err');
  span.textContent = msg;
}
function clearFieldErr(inp, span) {
  inp.classList.remove('input--err');
  span.textContent = '';
}

function clearInput() {
  for (const inp of grid.querySelectorAll('input')) {
    inp.value = '';
    clearFieldErr(inp, inp.closest('.field')?.querySelector('.field__err'));
  }
  $('#results-panel').hidden = true;
}

function loadExample() {
  const ex = EXAMPLES[current] ?? {};
  for (const inp of grid.querySelectorAll('input')) {
    const v = ex[inp.name];
    inp.value = v !== undefined ? String(v) : '';
    clearFieldErr(inp, inp.closest('.field')?.querySelector('.field__err'));
  }
}

function onAnalyze(e) {
  e.preventDefault();
  // run validation on all fields first
  grid.querySelectorAll('input').forEach((inp) => validateField(inp));
  const { values, errors } = readInput();
  if (errors.length) {
    showFormError(`${errors.length} value${errors.length > 1 ? 's are' : ' is'} out of range — correct the highlighted fields.`);
    return;
  }
  clearFormError();
  if (Object.keys(values).length === 0) {
    renderEmpty();
    return;
  }
  const results = rank(values, data[current], 10);
  render(results, Object.keys(values).length);
}

function showFormError(msg) {
  let el = $('#form-error');
  if (!el) {
    el = document.createElement('p');
    el.id = 'form-error';
    el.className = 'form-error';
    el.setAttribute('role', 'alert');
    $('#oes-form').querySelector('.actions').before(el);
  }
  el.textContent = msg;
}
function clearFormError() {
  $('#form-error')?.remove();
}

function renderEmpty() {
  $('#results-panel').hidden = false;
  $('#results-hint').textContent = '';
  $('#warning').hidden = true;
  $('#results').innerHTML =
    '<p class="empty">Enter at least one measured value above, then run the match.</p>';
}

function render(results, nEntered) {
  $('#results-panel').hidden = false;
  $('#results-hint').textContent =
    `Ranked by weighted similarity over ${nEntered} entered element${nEntered > 1 ? 's' : ''}, against ${data[current].alloys.length} ${data[current].label} references.`;

  const warning = $('#warning');
  if (results.length && results[0].score < CONFIDENCE_THRESHOLD) {
    warning.hidden = false;
    warning.innerHTML =
      `<strong>Low confidence.</strong><span>Best match scores ${pct(results[0].score)}. The sample may not belong to this family, or too few discriminating elements were entered.</span>`;
  } else {
    warning.hidden = true;
  }

  $('#results').innerHTML = results.map(rowHtml).join('');
}

function rowHtml(r, i) {
  const grade = r.grade
    ? `<span class="result__grade">${escapeHtml(r.grade)}</span>`
    : `<span class="result__grade result__grade--none">grade n/a</span>`;
  return `
    <div class="result ${i === 0 ? 'result--top' : ''}" style="--d:${Math.min(i * 28, 224)}ms">
      <div class="result__rank">${i + 1}</div>
      <div>
        <div class="result__std">${escapeHtml(r.std)}</div>
        ${grade}
      </div>
      <div class="result__score">
        <span class="result__pct">${pct(r.score)}</span>
        <span class="bar"><span style="width:${(r.score * 100).toFixed(1)}%"></span></span>
      </div>
    </div>`;
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

boot();
