// tabs.js — minimal accessible tab controller (ARIA tabs pattern).
const tablist = document.querySelector('[role="tablist"]');
const tabs = [...document.querySelectorAll('[role="tab"]')];

function select(tab) {
  for (const t of tabs) {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
  }
}

tablist.addEventListener('click', (e) => {
  const tab = e.target.closest('[role="tab"]');
  if (tab) select(tab);
});

// left/right arrow navigation between tabs
tablist.addEventListener('keydown', (e) => {
  const i = tabs.indexOf(document.activeElement);
  if (i === -1) return;
  let next = null;
  if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
  else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
  if (next) { e.preventDefault(); next.focus(); select(next); }
});
