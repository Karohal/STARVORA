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
    sorted.map(s => {
      const key   = catId + '.' + s.id;
      const items = RESEARCH_ITEMS[key];
      const itemsHtml = items
        ? items.map(it => renderResearchItem(key, it)).join('')
        : `<div class="th-muted" style="padding:6px 0;font-size:0.65rem">Bientôt</div>`;
      return `
        <div style="margin-bottom:10px">
          <button onclick="toggleResearchGroup('${s.id}')" style="
            display:flex;align-items:center;justify-content:space-between;width:100%;
            background:rgba(240,192,64,0.05);border:1px solid var(--border);
            color:var(--gold);padding:10px;font-size:0.78rem;cursor:pointer;text-align:left;
          ">
            <span>${s.label}</span>
            <span id="research-arrow-${s.id}">▸</span>
          </button>
          <div id="research-group-${s.id}" style="display:none;padding:8px 4px 0">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join('');
}
window.showResearchSubcategories = showResearchSubcategories;

function toggleResearchGroup(subId) {
  const el    = document.getElementById('research-group-' + subId);
  const arrow = document.getElementById('research-arrow-' + subId);
  if (!el) return;
  const open = el.style.display === 'block';
  el.style.display = open ? 'none' : 'block';
  if (arrow) arrow.textContent = open ? '▸' : '▾';
}
window.toggleResearchGroup = toggleResearchGroup;

function renderResearchItem(key, item) {
  const unlocked = !!(state.unlockedResearch && state.unlockedResearch[item.id]);
  const resHtml = Object.entries(item.resources || {})
    .map(([r,q]) => (RESOURCE_LABELS[r] ?? r) + ' x' + q).join(', ');
  if (unlocked) {
    return `<div class="th-row" style="padding:8px 0;color:var(--success)"><span>✅ ${item.label}</span></div>`;
  }
  return `
    <div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div class="th-row"><span>${item.label}</span><span class="th-val">${item.cost} 💰</span></div>
      <div class="th-muted" style="font-size:0.62rem;margin-bottom:6px">${resHtml}</div>
      <button onclick="unlockResearch('${item.id}','${key}')" class="assign-btn" style="width:100%;border-color:var(--cyan);color:var(--cyan)">Débloquer</button>
    </div>
  `;
}

function getResearchWarehouseStock() {
  const total = {};
  for (const [key, type] of Object.entries(state.buildings)) {
    if (type !== 'research_warehouse') continue;
    const ws = state.warehouseStock[key] ?? {};
    for (const [r, q] of Object.entries(ws)) total[r] = (total[r] ?? 0) + q;
  }
  return total;
}

function unlockResearch(itemId, key) {
  const item = (RESEARCH_ITEMS[key] || []).find(i => i.id === itemId);
  if (!item) return;
  if (state.money < item.cost) return notify('Pas assez d\'argent !', 'err');

  const stockTotal = getResearchWarehouseStock();
  for (const [r, q] of Object.entries(item.resources || {})) {
    if ((stockTotal[r] ?? 0) < q) return notify('Ressources insuffisantes : ' + (RESOURCE_LABELS[r] ?? r), 'err');
  }

  state.money -= item.cost;
  // Déduire en piochant dans les entrepôts de recherche disponibles
  for (const [r, q] of Object.entries(item.resources || {})) {
    let remaining = q;
    for (const [whKey, type] of Object.entries(state.buildings)) {
      if (type !== 'research_warehouse' || remaining <= 0) continue;
      const ws = state.warehouseStock[whKey];
      if (!ws || !ws[r]) continue;
      const take = Math.min(ws[r], remaining);
      ws[r] -= take;
      remaining -= take;
    }
  }

  if (!state.unlockedResearch) state.unlockedResearch = {};
  state.unlockedResearch[itemId] = true;
  updateStats();
  if (typeof refreshBuildPanel === 'function') refreshBuildPanel();
  notify('🔬 ' + item.label + ' débloqué !', 'ok');
  showResearchSubcategories(key.split('.')[0]);
}
window.unlockResearch = unlockResearch;
