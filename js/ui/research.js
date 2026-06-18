// ============================================================
// STARVORA — js/ui/research.js
// Navigation panel recherche : catégories > sous-catégories
// ============================================================

function openResearchPanel() {
  document.getElementById('research-overlay').style.display = 'block';
  document.getElementById('research-panel').style.display    = 'flex';
  showResearchCategories();
}
window.openResearchPanel = openResearchPanel;

function closeResearchPanel() {
  document.getElementById('research-overlay').style.display = 'none';
  document.getElementById('research-panel').style.display    = 'none';
}
window.closeResearchPanel = closeResearchPanel;

function showResearchCategories() {
  document.getElementById('research-title').textContent = '🔬 Centre de Recherche';
  const body = document.getElementById('research-body');
  body.innerHTML = Object.entries(RESEARCH_CATEGORIES).map(([id, cat]) => `
    <button onclick="showResearchSubcategories('${id}')" style="
      display:flex;align-items:center;gap:10px;width:100%;margin-bottom:10px;
      background:rgba(240,192,64,0.06);border:1px solid var(--border);
      color:var(--text);padding:14px;font-size:0.85rem;cursor:pointer;text-align:left;
    "><span style="font-size:1.2rem">${cat.icon}</span> ${cat.label}</button>
  `).join('');
}
window.showResearchCategories = showResearchCategories;

function showResearchSubcategories(catId) {
  const cat = RESEARCH_CATEGORIES[catId];
  if (!cat) return;
  document.getElementById('research-title').textContent = cat.icon + ' ' + cat.label;
  const body = document.getElementById('research-body');

  const sorted = [...cat.subcategories].sort((a,b) => a.label.localeCompare(b.label, 'fr'));
  body.innerHTML =
    `<button onclick="showResearchCategories()" style="background:transparent;border:1px solid var(--border);color:var(--muted);padding:6px 12px;font-size:0.7rem;cursor:pointer;margin-bottom:10px">← Retour</button>` +
    sorted.map(s => `
      <div class="th-row" style="padding:10px 0;border-bottom:1px solid rgba(240,192,64,0.08)">
        <span>${s.label}</span>
        <span class="th-muted" style="font-size:0.65rem">Bientôt</span>
      </div>
    `).join('');
}
window.showResearchSubcategories = showResearchSubcategories;
