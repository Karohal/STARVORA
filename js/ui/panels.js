// ============================================================
// STARVORA — js/ui/panels.js
// Tous les panels : bâtiment, camion, construction, HUD
// ============================================================

// ===== NOTIFICATIONS =====
function notify(msg, type='ok') {
  const el = document.getElementById('notif');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'notif ' + (type === 'err' ? 'notif-err' : 'notif-ok');
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.style.opacity = '0', 3000);
}

// ===== STATS =====
function updateStats() {
  const el = document.getElementById('hud-money');
  if (el) el.textContent = '💰 ' + state.money;
  const p = document.getElementById('hud-pop');
  if (p) p.textContent = '👥 ' + state.population + ' (' + state.homeless + ' 🏚️)';
  const w = document.getElementById('hud-workers');
  if (w) w.textContent = '👷 ' + state.availableWorkers;
}

// ===== PANEL CONSTRUCTION =====
function refreshBuildPanel() {
  BUILD_GROUPS.forEach(group => {
    const container = document.getElementById('build-group-' + group.id);
    if (!container) return;
    group.types.forEach(type => {
      const el = document.querySelector(`.build-item[data-type="${type}"]`);
      if (!el) return;
      const unlocked = BUILDING_DEF[type]?.unlockCondition?.(state) ?? true;
      el.classList.toggle('locked', !unlocked);
    });
  });

  // Indicateur HdV
  const hdv = document.getElementById('hdv-efficiency-bar');
  if (hdv && state.hasTownhall) {
    const eff = getTownhallEfficiency();
    document.getElementById('hdv-eff-val').textContent   = Math.round(eff*100) + '%';
    document.getElementById('hdv-speed-val').textContent = eff > 0 ? Math.round(100/eff)+'%' : 'Bloqué';
    hdv.style.display = 'block';
    hdv.style.color   = eff===0 ? 'var(--error)' : eff<1 ? 'var(--gold)' : 'var(--success)';
  }
}

function setTool(t) {
  state.tool = t;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tool-'+t)?.classList.add('active');
  const bp = document.getElementById('build-panel');
  if (t === 'build') {
    bp?.classList.add('open');
    refreshBuildPanel();
  } else {
    bp?.classList.remove('open');
    state.selectedBuilding = null;
    document.querySelectorAll('.build-item').forEach(b => b.classList.remove('selected'));
  }
}
window._ui = { setTool, selectBuilding, toggleResLayer, adjustZoom };

function selectBuilding(type, el) {
  state.selectedBuilding = type;
  document.querySelectorAll('.build-item').forEach(b => b.classList.remove('selected'));
  el?.classList.add('selected');
}
window.selectBuilding = selectBuilding;

function adjustZoom(delta) {
  state.cam.zoom = Math.max(0.3, Math.min(2.5, state.cam.zoom + delta));
}

function toggleResLayer() {
  const el = document.getElementById('res-layer-toggle');
  if (el) el.classList.toggle('active');
}

// ===== PANEL BÂTIMENT =====
function openBuildingPanel(key, type) {
  const def   = BUILDING_DEF[type];
  const level = state.buildingLevels[key] ?? 0;

  // Stocker key/type pour mises à jour
  const btn = document.getElementById('bp-levelup-btn');
  if (btn) { btn.dataset.key = key; btn.dataset.type = type; }

  document.getElementById('bp-title').textContent    = (def?.icon ?? '') + ' ' + (def?.name ?? type);
  document.getElementById('bp-level').textContent    = 'Niveau ' + level;
  document.getElementById('bp-levelup-cost').textContent = levelUpCost(type, level) + ' 💰';

  const isProducer  = ['mine','quarry','well','sorting','crusher','refinery','water_plant'].includes(type);
  const isFactory   = type === 'vehiclefactory';
  const isWarehouse = Object.keys(WAREHOUSE_CATEGORIES).includes(type);
  const hasWorkers  = (BASE_WORKERS[type] ?? 0) > 0;

  document.getElementById('bp-prod-section').style.display      = isProducer  ? 'block' : 'none';
  document.getElementById('bp-factory-section').style.display   = isFactory   ? 'block' : 'none';
  document.getElementById('bp-warehouse-section').style.display = isWarehouse ? 'block' : 'none';
  document.getElementById('bp-workers-section').style.display   = hasWorkers  ? 'block' : 'none';

  if (isProducer)  refreshProductionPanel(key, type);
  if (isFactory)   refreshFactoryPanel(key);
  if (isWarehouse) refreshWarehousePanel(key, type);
  if (hasWorkers)  refreshWorkersPanel(key, type);

  // Camions en attente
  const waitingEl = document.getElementById('bp-waiting-trucks');
  if (waitingEl) {
    const waiting = Object.values(state.trucks).filter(t =>
      t.atStop && t.route[t.routeIndex % t.route.length]?.key === key
    );
    waitingEl.innerHTML = waiting.map(t => {
      const badge  = TRUCK_BADGES[t.truckType ?? 'standard'] ?? '🚛';
      const action = t.status === 'loading' ? 'chargement' : 'déchargement';
      return `<div class="th-row" style="color:var(--gold);font-size:0.7rem">${badge} en attente de ${action}</div>`;
    }).join('');
    waitingEl.style.display = waiting.length > 0 ? 'block' : 'none';
  }

  document.getElementById('building-panel')?.classList.add('open');
}
window.openBuildingPanel = openBuildingPanel;

function closeBuildingPanel() {
  document.getElementById('building-panel')?.classList.remove('open');
}
window.closeBuildingPanel = closeBuildingPanel;

// ===== WORKERS PANEL =====
function refreshWorkersPanel(key, type) {
  const level      = state.buildingLevels[key] ?? 0;
  const assigned   = state.assignedWorkers[key] ?? 0;
  const maxWorkers = (BASE_WORKERS[type] ?? 0) + Math.floor(level / 5);
  const eff        = maxWorkers > 0 ? Math.round(assigned/maxWorkers*100) : 0;

  document.getElementById('bp-workers-count').textContent  = `${assigned} / ${maxWorkers}`;
  document.getElementById('bp-workers-eff').textContent    = `${eff}% efficacité`;

  const statusEl = document.getElementById('bp-prod-status');
  if (statusEl) {
    if (assigned === 0) {
      statusEl.textContent = '⛔ Aucun travailleur assigné';
      statusEl.style.color = 'var(--error)';
    } else {
      statusEl.textContent = `✅ En production — ${assigned}/${maxWorkers} travailleur(s) · ${eff}% efficacité`;
      statusEl.style.color = 'var(--success)';
    }
  }
}

// ===== PRODUCTION PANEL =====
function refreshProductionPanel(key, type) {
  const level    = state.buildingLevels[key] ?? 0;
  const stock    = state.internalStock[key] ?? { solid:{}, liquid:{}, waste:0, input:{}, output:{} };

  const isMine    = ['mine','quarry','well'].includes(type);
  const isFactory = ['sorting','crusher','refinery','water_plant'].includes(type);

  const prodEl  = document.getElementById('bp-prod-resource');
  const capEl   = document.getElementById('bp-prod-capacity');
  const wRow    = document.getElementById('bp-prod-waste-row');
  const yRow    = document.getElementById('bp-prod-yield-row');

  if (isMine) {
    const [col, row] = key.split(',').map(Number);
    const resType = state.resources[row]?.[col];
    const cat     = RESOURCE_CATEGORY[resType] ?? 'solid';
    const resQty  = cat === 'liquid'
      ? (stock.liquid?.[resType] ?? 0)
      : (stock.solid?.[resType]  ?? 0);
    const capacity = internalCapacity(level);
    const total    = Object.values(stock.solid??{}).reduce((a,b)=>a+b,0)
                   + Object.values(stock.liquid??{}).reduce((a,b)=>a+b,0);
    if (prodEl) prodEl.textContent = (RESOURCE_LABELS[resType]??'—') + ' : ' + resQty;
    if (capEl)  capEl.textContent  = total + ' / ' + capacity;
    if (wRow)   wRow.style.display = 'none';
    if (yRow)   yRow.style.display = 'none';

  } else if (isFactory) {
    const recipe   = PRODUCTION_RECIPES[type];
    const inTotal  = Object.values(stock.input  ?? {}).reduce((a,b)=>a+b,0);
    const outTotal = Object.values(stock.output ?? {}).reduce((a,b)=>a+b,0);
    const inCap    = recipe?.inputCapacity(level)  ?? 5;
    const outCap   = recipe?.outputCapacity(level) ?? 15;

    const inputHtml = Object.entries(stock.input??{})
      .filter(([,q])=>q>0).map(([r,q])=>(RESOURCE_LABELS[r]??r)+':'+q).join(' | ') || 'Vide';
    const outputHtml = Object.entries(stock.output??{})
      .filter(([,q])=>q>0).map(([r,q])=>(RESOURCE_LABELS[r]??r)+':'+q).join(' | ') || 'Vide';

    if (prodEl) prodEl.textContent = '⬇ Input : ' + inputHtml;
    if (capEl)  capEl.textContent  = `In ${inTotal}/${inCap} · Out ${outTotal}/${outCap}`;
    if (wRow)   { wRow.style.display='flex'; document.getElementById('bp-prod-waste').textContent='⬆ Output : '+outputHtml; }
    if (yRow)   { yRow.style.display='flex'; document.getElementById('bp-prod-yield').textContent='30% ressource / 50% gravats / 20% déchets'; }
  }
}

// ===== WAREHOUSE PANEL =====
function refreshWarehousePanel(key, type) {
  type = type || state.buildings[key];
  const level    = state.buildingLevels[key] ?? 0;
  const capacity = warehouseCapacity(level);
  const stock    = state.warehouseStock[key] ?? {};
  const allowCat = WAREHOUSE_CATEGORIES[type] ?? 'solid';

  const filtered = Object.entries(RESOURCE_LABELS).filter(([res]) =>
    (RESOURCE_CATEGORY[res] ?? 'solid') === allowCat
  );
  const total = filtered.reduce((sum,[res]) => sum+(stock[res]??0), 0);
  const html  = filtered.filter(([res])=>(stock[res]??0)>0)
    .map(([res,label])=>`<div class="th-row"><span>${label}</span><span class="th-val">${stock[res]}</span></div>`)
    .join('') || '<div class="th-muted">Vide</div>';

  document.getElementById('bp-warehouse-stock').innerHTML = html;
  document.getElementById('bp-warehouse-capacity').textContent = total + ' / ' + capacity;
}

// ===== FACTORY PANEL =====
function refreshFactoryPanel(factoryKey) {
  const myTrucks = Object.values(state.trucks).filter(t => t.factoryKey === factoryKey);
  const listEl   = document.getElementById('bp-truck-list');
  if (!listEl) return;

  const inQueue = state.truckBuildQueue[factoryKey];
  let queueHtml = '';
  if (inQueue) {
    const qDef     = TRUCK_TYPES[inQueue.truckType] ?? TRUCK_TYPES.standard;
    const elapsed  = Date.now() - inQueue.startTime;
    const remaining= Math.max(0, Math.ceil((inQueue.duration-elapsed)/1000));
    const pct      = Math.round(Math.min(1,elapsed/inQueue.duration)*100);
    const fkSafe   = factoryKey.replace(',','-');
    queueHtml = '<div style="margin-bottom:8px;padding:6px;border:1px solid rgba(240,192,64,0.3);background:rgba(240,192,64,0.05)">'
      + '<div style="font-size:0.7rem;color:var(--gold);margin-bottom:4px">🏗️ En construction : '+(TRUCK_BADGES[inQueue.truckType]??'🚛')+' '+qDef.name+'</div>'
      + '<div style="background:rgba(0,0,0,0.3);height:6px;border-radius:2px;overflow:hidden">'
      + '<div id="truck-build-bar-'+fkSafe+'" style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,var(--cyan),var(--gold))"></div>'
      + '</div>'
      + '<div id="truck-build-timer-'+fkSafe+'" style="font-size:0.65rem;color:var(--muted);margin-top:3px;text-align:right">'+remaining+'s restantes</div>'
      + '</div>';
  }

  listEl.innerHTML = queueHtml + (myTrucks.length > 0
    ? `<div class="th-row"><span>Véhicules actifs</span><span class="th-val">${myTrucks.length}</span></div>
       <div class="th-muted" style="font-size:0.65rem">Cliquez sur un camion pour le gérer</div>`
    : '<div class="th-muted">Aucun véhicule — cliquez sur un camion pour le gérer</div>');

  const btnsEl = document.getElementById('bp-truck-build-btns');
  if (btnsEl) {
    const isBuilding = !!state.truckBuildQueue[factoryKey];
    btnsEl.innerHTML = Object.entries(TRUCK_TYPES).map(([ttype, def]) =>
      '<button class="assign-btn" data-factory="'+factoryKey+'" data-ttype="'+ttype+'"'
      +' style="flex:1;flex-direction:column;height:auto;padding:6px 2px;font-size:0.6rem;'+(isBuilding?'opacity:0.4;pointer-events:none':'')+'">'
      +'<span style="font-size:1.2rem">'+(TRUCK_BADGES[ttype]??def.icon)+'</span>'
      +'<span>'+def.name+'</span>'
      +'<span style="color:var(--gold)">'+def.cost+' 💰</span>'
      +'</button>'
    ).join('');
    btnsEl.querySelectorAll('button[data-ttype]').forEach(btn => {
      const fkey=btn.dataset.factory, ttype=btn.dataset.ttype;
      btn.addEventListener('click',    e=>{e.stopPropagation();buildTruck(fkey,ttype);});
      btn.addEventListener('touchend', e=>{e.stopPropagation();e.preventDefault();buildTruck(fkey,ttype);});
    });
  }
}

// ===== PANEL CAMION =====
function openTruckPanel(truckId) {
  const t    = state.trucks[truckId];
  if (!t) return;
  const tDef = TRUCK_TYPES[t.truckType ?? 'standard'] ?? TRUCK_TYPES.standard;
  window._activeTruckId = truckId;

  document.getElementById('tp-title').textContent = (TRUCK_BADGES[t.truckType]??'🚛') + ' ' + tDef.name;
  refreshTruckPanel(truckId);
  document.getElementById('truck-panel')?.classList.add('open');
}
window.openTruckPanel = openTruckPanel;

function closeTruckPanel() {
  document.getElementById('truck-panel')?.classList.remove('open');
  window._activeTruckId = null;
}
window.closeTruckPanel = closeTruckPanel;

function refreshTruckPanel(truckId) {
  const t = state.trucks[truckId];
  if (!t) return;
  const statuses = { idle:'En attente', moving:'En route 🚛', loading:'Chargement ⬆', unloading:'Déchargement ⬇' };
  const loaded   = Object.values(t.cargo).reduce((a,b)=>a+b,0);
  const cargo    = Object.entries(t.cargo).map(([r,q])=>`${RESOURCE_LABELS[r]??r}: ${q}`).join(', ') || '—';

  document.getElementById('tp-status').textContent  = statuses[t.status] ?? t.status;
  document.getElementById('tp-cargo').textContent   = `${loaded}/${t.capacity} — ${cargo}`;
  document.getElementById('tp-driver').textContent  = t.driver > 0 ? '✅ Assigné' : '❌ Sans conducteur';

  const stopsEl = document.getElementById('tp-stops');
  if (stopsEl) {
    stopsEl.innerHTML = t.route.map((stop, i) => {
      const btype  = state.buildings[stop.key];
      const bdef   = BUILDING_DEF[btype];
      const active = i === t.routeIndex % t.route.length ? ' style="border-color:var(--gold)"' : '';
      const label  = bdef ? bdef.icon+' '+bdef.name : stop.key;
      const action = stop.action === 'load' ? '⬆ Charger' : '⬇ Vider';
      return `<div class="th-row"${active} style="justify-content:space-between">
        <span style="flex:1">${i+1}. ${label} — ${action}</span>
        <button onclick="removeStop('${truckId}',${i})" style="width:22px;height:22px;flex-shrink:0;margin-left:8px;background:#c00;border:none;color:#fff;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:bold;border-radius:2px">✕</button>
      </div>`;
    }).join('') || '<div class="th-muted">Aucun itinéraire défini</div>';
  }
}

// ===== LEVEL UP =====
function levelUpCost(type, currentLevel) {
  const base = LEVELUP_BASE_COST[type] ?? 50;
  return Math.round(base * Math.pow(1.2, currentLevel));
}

function buildingLevelUp() {
  const btn  = document.getElementById('bp-levelup-btn');
  const key  = btn?.dataset.key;
  const type = btn?.dataset.type;
  if (!key || !type) return;
  const level = state.buildingLevels[key] ?? 0;
  const cost  = levelUpCost(type, level);
  if (state.money < cost) return notify('Pas assez d\'argent !', 'err');
  state.money -= cost;
  state.buildingLevels[key] = level + 1;
  updateStats();
  openBuildingPanel(key, type);
  notify(`✅ ${BUILDING_DEF[type]?.icon} Niveau ${level+1} !`, 'ok');
}
window.buildingLevelUp = buildingLevelUp;

function toggleSection(header) {
  const content = header.nextElementSibling;
  if (content) content.style.display = content.style.display === 'none' ? 'block' : 'none';
}
window.toggleSection = toggleSection;
