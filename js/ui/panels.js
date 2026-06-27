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
    group.types.forEach(type => {
      const el = document.querySelector(`.build-item[data-type="${type}"]`);
      if (!el) return;
      const unlocked = BUILDING_DEF[type]?.unlockCondition?.(state) ?? true;
      el.classList.toggle('locked', !unlocked);
      // Afficher un cadenas si verrouillé
      const costEl = el.querySelector('.b-cost');
      if (costEl && !unlocked) costEl.textContent = '🔒';
      else if (costEl && unlocked) {
        const def = BUILDING_DEF[type];
        costEl.textContent = def?.cost === 0 ? 'Gratuit' : (def?.cost ?? 0) + ' 💰';
      }
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
  // Annuler fantôme si on change d'outil
  if (state.ghostBuilding && t !== 'build') {
    state.ghostBuilding = null;
    document.getElementById('build-confirm-bar').style.display = 'none';
  }
  state.tool = t;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tool-'+t)?.classList.add('active');
  const bp = document.getElementById('build-panel');
  if (t === 'build') {
    bp?.classList.add('open');
    switchBuildTab(window._activeBuildTab ?? 'infrastructure');
    refreshBuildPanel();
  } else {
    bp?.classList.remove('open');
    state.selectedBuilding = null;
    document.querySelectorAll('.build-item').forEach(b => b.classList.remove('selected'));
  }
}
window._ui = { setTool, selectBuilding, toggleResLayer, adjustZoom };

function switchBuildTab(group) {
  window._activeBuildTab = group;
  ['infrastructure','extraction','storage','factory'].forEach(g => {
    const el = document.getElementById('build-group-' + g);
    if (!el) return;
    el.classList.toggle('hidden', g !== group);
  });
  document.querySelectorAll('.build-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.group === group);
  });
}
window.switchBuildTab = switchBuildTab;

function selectBuilding(type, el) {
  state.selectedBuilding = type;
  document.querySelectorAll('.build-item').forEach(b => b.classList.remove('selected'));
  el?.classList.add('selected');
  // Fermer le panel et passer en mode construction
  document.getElementById('build-panel')?.classList.remove('open');
  state.tool = 'build';
  notify('🏗️ ' + (BUILDING_DEF[type]?.icon??'') + ' ' + (BUILDING_DEF[type]?.name??type) + ' sélectionné — tapez pour placer', 'ok');
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
  state.selectedTileKey = key;

  // Stocker key/type pour mises à jour
  const btn = document.getElementById('bp-levelup-btn');
  if (btn) { btn.dataset.key = key; btn.dataset.type = type; }

  document.getElementById('bp-title').innerHTML = (def?.icon ?? '') + ' ' + (def?.name ?? type) +
    (def?.info ? ' <button onclick="openBuildingInfo(\''+type+'\')" style="background:transparent;border:1px solid var(--border);color:var(--gold);width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:0.65rem;margin-left:4px;vertical-align:middle">ℹ️</button>' : '');
  document.getElementById('bp-level').textContent    = 'Niveau ' + level;
  document.getElementById('bp-levelup-cost').textContent = levelUpCost(type, level) + ' 💰';

  // Afficher les ressources requises pour l'upgrade
  const resCost = (LEVELUP_RESOURCE_COST[type] ?? [])[level + 1] ?? null;
  let resEl = document.getElementById('bp-levelup-res');
  if (!resEl) {
    resEl = document.createElement('div');
    resEl.id = 'bp-levelup-res';
    resEl.style.cssText = 'font-size:0.62rem;color:var(--muted);margin-top:2px;';
    document.getElementById('bp-levelup-cost')?.parentNode?.appendChild(resEl);
  }
  if (resCost) {
    const totalStock = getTotalWarehouseStock();
    resEl.innerHTML = Object.entries(resCost).map(([res, qty]) => {
      const have = totalStock[res] ?? 0;
      const ok = have >= qty;
      const label = RESOURCE_LABELS?.[res] ?? res;
      return `<span style="color:${ok ? 'var(--success)' : '#c04040'}">${label} ${have}/${qty}</span>`;
    }).join(' · ');
  } else {
    resEl.innerHTML = '';
  }

  const isProducer  = ['mine','quarry','well','sorting','crusher','refinery','water_plant'].includes(type);
  const isFactory   = type === 'vehiclefactory';
  const isWarehouse = Object.keys(WAREHOUSE_CATEGORIES).includes(type) || type === 'research_warehouse' || type === 'market' || type === 'water_tower';
  const isMarket     = type === 'market';
  const isWaterTower = type === 'water_tower';
  const hasWorkers  = (BASE_WORKERS[type] ?? 0) > 0;

  document.getElementById('bp-prod-section').style.display      = isProducer  ? 'block' : 'none';
  const houseEl = document.getElementById('bp-house-section');
  if (houseEl) houseEl.style.display = 'none';
  const hdvEl = document.getElementById('bp-hdv-stock');
  if (hdvEl) hdvEl.style.display = 'none';
  document.getElementById('bp-factory-section').style.display   = isFactory   ? 'block' : 'none';
  document.getElementById('bp-warehouse-section').style.display = isWarehouse ? 'block' : 'none';
  document.getElementById('bp-workers-section').style.display   = hasWorkers  ? 'block' : 'none';
  document.getElementById('bp-prod-status').style.display       = (hasWorkers && type !== 'road') ? 'block' : 'none';
  const researchEl = document.getElementById('bp-research-section');
  if (researchEl) researchEl.style.display = (type === 'research_center') ? 'block' : 'none';

  if (isProducer)  refreshProductionPanel(key, type);
  if (isFactory)   refreshFactoryPanel(key);
  if (isWarehouse) refreshWarehousePanel(key, type);
  if (isMarket)    refreshMarketPanel(key);
  if (hasWorkers)  refreshWorkersPanel(key, type);
  if (type === 'house')    refreshHousePanel(key);
  if (type === 'hospital') refreshHospitalPanel(key);
  if (type === 'townhall') refreshHdvStockPanel();

  // Affichage spécial pour les routes
  if (type === 'road') {
    const rl      = state.buildingLevels[key] ?? 0;
    const def     = getRoadDef(rl);
    const nextDef = ROAD_LEVELS.find(r => r.level > rl) ?? null;
    const costEl  = document.getElementById('bp-levelup-cost');
    const btn     = document.getElementById('bp-levelup-btn');
    if (costEl) costEl.textContent = nextDef ? `${getRoadUpgradeCost(rl)} 💰` : 'MAX';
    if (btn) { btn.dataset.key = key; btn.dataset.type = type; }
    let roadInfoEl = document.getElementById('bp-road-info');
    if (!roadInfoEl) {
      roadInfoEl = document.createElement('div');
      roadInfoEl.id = 'bp-road-info';
      roadInfoEl.style.cssText = 'font-size:0.65rem;margin:6px 0;padding:6px;background:rgba(255,255,255,0.05);border-radius:4px;';
      document.getElementById('bp-levelup-cost')?.parentNode?.insertBefore(roadInfoEl, document.getElementById('bp-levelup-cost'));
    }
    roadInfoEl.innerHTML = `<div class="th-row"><span>🛣️ ${def.name}</span><span class="th-val" style="color:var(--gold)">Niv. ${rl}</span></div>`
      + (nextDef ? `<div class="th-muted" style="font-size:0.6rem">Prochain : ${nextDef.name} (x${nextDef.speedMult} vitesse)</div>`
        + (nextDef.resources ? `<div class="th-muted" style="font-size:0.58rem">${Object.entries(nextDef.resources).map(([r,q])=>(RESOURCE_LABELS?.[r]??r)+' x'+q).join(', ')}</div>` : '')
                 : `<div style="color:var(--success);font-size:0.6rem">Qualite maximale !</div>`);
  } else {
    document.getElementById('bp-road-info')?.remove();
  }

  document.getElementById('building-panel')?.classList.add('open');
  refreshBuildingPanelTrucks(key);
}
window.openBuildingPanel = openBuildingPanel;

function refreshBuildingPanelTrucks(key) {
  if (!key) key = state.selectedTileKey;
  if (!key) return;
  const panel = document.getElementById('building-panel');
  if (!panel || !panel.classList.contains('open')) return;
  const waitingEl = document.getElementById('bp-waiting-trucks');
  if (!waitingEl) return;
  const [bCol, bRow] = key.split(',').map(Number);
  const waiting = Object.values(state.trucks).filter(t => {
    if (t.driver === 0) return false;
    const onThisStop = t.route.some(s => s.key === key);
    if (!onThisStop) return false;
    const atThisStop = t.atStop && t.route[t.routeIndex % t.route.length]?.key === key;
    const nearBy = Math.abs(t.x - bCol) < 0.5 && Math.abs(t.y - bRow) < 0.5;
    return atThisStop || nearBy;
  });
  const newHtml = waiting.map(t => {
    const badge  = TRUCK_BADGES[t.truckType ?? 'standard'] ?? '🚛';
    const stop   = t.route[t.routeIndex % t.route.length];
    const action = stop?.action === 'load' ? 'chargement' : 'déchargement';
    const status = t.atStop ? `en attente de ${action}` : 'en approche';
    return `<button onclick="closeBuildingPanel();openTruckPanel('${t.id}')" class="th-row" style="width:100%;background:transparent;border:none;color:var(--gold);font-size:0.7rem;cursor:pointer;text-align:left">${badge} ${status} →</button>`;
  }).join('');
  // Ne réécrire que si le contenu a vraiment changé
  if (waitingEl.innerHTML !== newHtml) {
    waitingEl.innerHTML = newHtml;
    waitingEl.style.display = waiting.length > 0 ? 'block' : 'none';
  }
}
window.refreshBuildingPanelTrucks = refreshBuildingPanelTrucks;

function closeBuildingPanel() {
  document.getElementById('building-panel')?.classList.remove('open');
  state.selectedTileKey = null;
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
    const outputRows = Object.entries(stock.output??{})
      .filter(([,q])=>q>0)
      .map(([r,q])=>`<div class="th-row"><span>${RESOURCE_LABELS[r]??r}</span><span class="th-val">${q}</span></div>`)
      .join('') || '<div class="th-muted">Vide</div>';

    if (prodEl) prodEl.textContent = '⬇ Input : ' + inputHtml;
    if (capEl)  capEl.textContent  = `In ${inTotal}/${inCap} · Out ${outTotal}/${outCap}`;
    if (wRow)   { wRow.style.display='block'; document.getElementById('bp-prod-waste').innerHTML='<div style="margin-bottom:2px">⬆ Output :</div>'+outputRows; }
    if (yRow)   { yRow.style.display='flex'; document.getElementById('bp-prod-yield').textContent='30% ressource / 50% gravats / 20% déchets'; }
  }
}

// ===== WAREHOUSE PANEL =====
function refreshWarehousePanel(key, type) {
  type = type || state.buildings[key];
  const level    = state.buildingLevels[key] ?? 0;
  const capacity = warehouseCapacity(level);
  const stock    = state.warehouseStock[key] ?? {};
  const isResearchWh = type === 'research_warehouse';
  const allowCat = WAREHOUSE_CATEGORIES[type] ?? 'solid';

  const filtered = isResearchWh
    ? Object.entries(RESOURCE_LABELS)
    : Object.entries(RESOURCE_LABELS).filter(([res]) =>
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

function openResourceFilterPanel() {
  const t = state.trucks[window._activeTruckId];
  if (!t) return;
  const cat = TRUCK_TYPES[t.truckType ?? 'standard']?.category ?? 'solid';
  const candidates = Object.entries(RESOURCE_LABELS).filter(([r]) => (RESOURCE_CATEGORY[r] ?? 'solid') === cat);

  const body = document.getElementById('resfilter-body');
  body.innerHTML = candidates.map(([r, label]) => {
    const checked = !t.resourceFilter || t.resourceFilter.includes(r);
    return `<label style="display:flex;align-items:center;gap:8px;padding:7px 0;font-size:0.75rem">
      <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleResourceFilterItem('${r}', this.checked)">
      ${label}
    </label>`;
  }).join('') || '<div class="th-muted">Aucune ressource pour ce type de camion</div>';

  document.getElementById('resfilter-panel').style.display    = 'flex';
  document.getElementById('resfilter-overlay').style.display  = 'block';
}
window.openResourceFilterPanel = openResourceFilterPanel;

function closeResourceFilterPanel() {
  document.getElementById('resfilter-panel').style.display   = 'none';
  document.getElementById('resfilter-overlay').style.display = 'none';
}
window.closeResourceFilterPanel = closeResourceFilterPanel;

function toggleResourceFilterItem(resKey, checked) {
  const t = state.trucks[window._activeTruckId];
  if (!t) return;
  const cat = TRUCK_TYPES[t.truckType ?? 'standard']?.category ?? 'solid';
  const all = Object.keys(RESOURCE_LABELS).filter(r => (RESOURCE_CATEGORY[r] ?? 'solid') === cat);

  if (!t.resourceFilter) t.resourceFilter = [...all];
  if (checked) {
    if (!t.resourceFilter.includes(resKey)) t.resourceFilter.push(resKey);
  } else {
    t.resourceFilter = t.resourceFilter.filter(r => r !== resKey);
  }
  // Si tout est coché, revenir à null (= aucun filtre actif)
  if (t.resourceFilter.length === all.length) t.resourceFilter = null;
}
window.toggleResourceFilterItem = toggleResourceFilterItem;

function refreshTruckPanel(truckId) {
  const t = state.trucks[truckId];
  if (!t) return;
  const statuses = { idle:'En attente', moving:'En route 🚛', loading:'Chargement ⬆', unloading:'Déchargement ⬇' };
  const loaded   = Object.values(t.cargo).reduce((a,b)=>a+b,0);
  const cargo    = Object.entries(t.cargo).map(([r,q])=>`${RESOURCE_LABELS[r]??r}: ${q}`).join(', ') || '—';
  const level    = t.level ?? 0;
  const cap      = (TRUCK_TYPES[t.truckType]?.capacity ?? 5) + level * 2;

  document.getElementById('tp-status').textContent  = statuses[t.status] ?? t.status;
  document.getElementById('tp-cargo').textContent   = `${loaded}/${cap} — ${cargo}`;
  document.getElementById('tp-driver').textContent  = t.driver > 0 ? '✅ Assigné' : '❌ Sans conducteur';

  // Niveau + bouton améliorer
  let upgradeEl = document.getElementById('tp-upgrade');
  if (!upgradeEl) {
    upgradeEl = document.createElement('div');
    upgradeEl.id = 'tp-upgrade';
    upgradeEl.style.cssText = 'margin:8px 0;padding:8px;background:rgba(255,255,255,0.05);border-radius:4px;';
    document.getElementById('tp-status')?.parentNode?.insertBefore(upgradeEl, document.getElementById('tp-status'));
  }
  const maxLevel = 3;
  const creditCost = [100,300,600][level] ?? null;
  const resCost = (TRUCK_LEVEL_RESOURCE_COST[t.truckType] ?? [])[level+1] ?? null;
  const resText = resCost ? Object.entries(resCost).map(([r,q])=>`${RESOURCE_LABELS?.[r]??r} x${q}`).join(', ') : '';
  upgradeEl.innerHTML = level >= maxLevel
    ? `<div class="th-row"><span>⭐ Niveau ${level} (MAX)</span><span class="th-val">Cap: ${cap} · Vit: +${level*10}%</span></div>`
    : `<div class="th-row"><span>⭐ Niveau ${level}</span><span class="th-val">Cap: ${cap} · Vit: +${level*10}%</span></div>
       <div class="th-muted" style="font-size:0.62rem;margin:2px 0">${resText}</div>
       <button onclick="upgradeTruck('${truckId}')" class="assign-btn" style="width:100%;border-color:var(--cyan);color:var(--cyan);margin-top:4px">Améliorer — ${creditCost}💰</button>`;

  const stopsEl = document.getElementById('tp-stops');
  if (stopsEl) {
    stopsEl.innerHTML = t.route.map((stop, i) => {
      const btype  = state.buildings[stop.key];
      const bdef   = BUILDING_DEF[btype];
      const active = i === t.routeIndex % t.route.length ? ' style="border-color:var(--gold)"' : '';
      const label  = bdef ? bdef.icon+' '+bdef.name : stop.key;
      const action = stop.action === 'load' ? '⬆ Charger' : '⬇ Vider';
      const waitFull = stop.waitFull ?? false;
      return `<div class="th-row"${active} style="justify-content:space-between;align-items:center">
        <span style="flex:1;font-size:0.7rem">${i+1}. ${label} — ${action}</span>
        <label style="font-size:0.62rem;color:var(--muted);margin:0 6px;white-space:nowrap;cursor:pointer">
          Rester <input type="checkbox" ${waitFull?'checked':''} onchange="toggleStopWait('${truckId}',${i})" style="cursor:pointer;vertical-align:middle">
        </label>
        <button onclick="removeStop('${truckId}',${i})" style="width:22px;height:22px;flex-shrink:0;background:#c00;border:none;color:#fff;font-size:0.8rem;cursor:pointer;border-radius:2px">✕</button>
      </div>`;
    }).join('') || '<div class="th-muted">Aucun itinéraire défini</div>';
  }

  // Adapter bouton selon type de camion
  const addBtn = document.getElementById('btn-add-stop');
  if (addBtn) {
    if (t.truckType === 'builder') {
      addBtn.textContent = '📍 Déplacer';
      addBtn.title = 'Envoyer le camion constructeur vers un bâtiment';
    } else if (t.truckType === 'explorer') {
      addBtn.textContent = '🌍 Explorer';
      addBtn.title = 'Lancer une mission d\'exploration';
      addBtn.onclick = () => { closeTruckPanel(); document.getElementById('explore-panel')?.classList.add('open'); };
    } else {
      addBtn.textContent = '🗺 Ajouter un itinéraire';
      addBtn.title = '';
      addBtn.onclick = () => addStopOrMove();
    }
  }

  // Masquer les stops pour builder et explorer
  const stopsEl2 = document.getElementById('tp-stops');
  if (stopsEl2) {
    stopsEl2.style.display = (t.truckType === 'builder' || t.truckType === 'explorer') ? 'none' : '';
  }
}

function refreshWaterTowerPanel(key) {
  const level   = state.buildingLevels[key] ?? 0;
  const stock   = state.warehouseStock[key] ?? {};
  const water   = stock['water_r'] ?? 0;
  const cap     = 50 + level * 50;
  const radius  = waterTowerRadius(level);
  const active  = !!state._showWaterZone;

  const wEl = document.getElementById('bp-warehouse-stock');
  if (!wEl) return;

  // Compter bâtiments couverts
  const [col, row] = key.split(',').map(Number);
  let covered = 0;
  for (let r = row - radius; r <= row + radius; r++)
    for (let c = col - radius; c <= col + radius; c++)
      if (state.buildings[`${c},${r}`]) covered++;

  wEl.innerHTML = `
    <div class="th-row" style="margin-bottom:6px">
      <span style="color:#4aa0ff">💧 Eau potable</span>
      <span class="th-val">${Math.round(water)}/${cap}</span>
    </div>
    <div class="th-muted" style="font-size:0.62rem;margin-bottom:4px">Rayon : ${radius} cases · ${covered} bâtiments couverts</div>
    <div class="th-row" style="margin-top:8px">
      <span style="font-size:0.65rem">Zone de distribution</span>
      <label style="cursor:pointer;font-size:0.65rem">
        <input type="checkbox" ${active?'checked':''} onchange="toggleWaterZone()" style="cursor:pointer;vertical-align:middle"> Afficher
      </label>
    </div>
  `;
}
window.refreshWaterTowerPanel = refreshWaterTowerPanel;

function toggleWaterZone() {
  state._showWaterZone = !state._showWaterZone;
}
window.toggleWaterZone = toggleWaterZone;

function refreshMarketPanel(key) {
  const level    = state.buildingLevels[key] ?? 0;
  const stock    = state.warehouseStock[key] ?? {};
  const cap      = marketCapacity(level);
  const sellRate = marketSellRate(level);
  const cycleS   = marketCycleMs(level) / 1000;
  const prices   = state.marketPrices ?? {};
  const loaded   = Object.values(stock).reduce((a,b)=>a+b,0);

  const wEl = document.getElementById('bp-warehouse-stock');
  if (!wEl) return;

  let html = `<div class="th-row" style="margin-bottom:6px">
    <span style="color:var(--gold)">🏪 Stock à vendre</span>
    <span class="th-val">${loaded}/${cap}</span>
  </div>
  <div class="th-muted" style="font-size:0.62rem;margin-bottom:8px">Vend ${sellRate} unités toutes les ${cycleS}s</div>`;

  // Bouton graphique
  html += `<button onclick="openMarketChartPanel('${key}')" class="assign-btn" style="width:100%;border-color:var(--cyan);color:var(--cyan);margin-bottom:8px">📊 Cours & Tendances</button>`;

  // Stock en vente avec prix
  html += `<div style="font-size:0.62rem;color:var(--muted);margin-bottom:4px">En vente :</div>`;
  let hasStock = false;
  for (const [res, qty] of Object.entries(stock)) {
    if (!qty) continue;
    hasStock = true;
    const price = prices[res] ?? MARKET_BASE_PRICES[res] ?? 1;
    const base  = MARKET_BASE_PRICES[res] ?? 1;
    const trend = price > base ? '📈' : price < base ? '📉' : '➡️';
    const color = price > base ? 'var(--success)' : price < base ? '#c04040' : 'var(--muted)';
    html += `<div class="th-row">
      <span>${RESOURCE_ICONS?.[res] ?? ''} ${RESOURCE_LABELS?.[res] ?? res} (${qty})</span>
      <span style="color:${color}">${trend} ${price}💰/u</span>
    </div>`;
  }
  if (!hasStock) html += `<div class="th-muted" style="font-size:0.62rem">Aucune ressource en stock</div>`;

  wEl.innerHTML = html;
}
window.refreshMarketPanel = refreshMarketPanel;

// ===== PANEL TRADING MARCHÉ =====
let _marketSelectedRes  = null;
let _marketKey          = null;
let _marketAutoSell     = true; // vente automatique ON par défaut

function openMarketChartPanel(key) {
  if (key) _marketKey = key;
  document.getElementById('building-panel')?.classList.remove('open');
  document.getElementById('truck-panel')?.classList.remove('open');
  const panel = document.getElementById('market-chart-panel');
  if (!panel) return;
  panel.style.display       = 'flex';
  panel.style.flexDirection = 'column';
  // Brancher le bouton fermer via JS (évite les problèmes onclick inline Safari)
  // Brancher tous les boutons via JS
  const closeBtn = document.getElementById('mkt-close-btn');
  if (closeBtn) { closeBtn.onclick = null; closeBtn.addEventListener('click', closeMarketChartPanel); }
  const sellBtn  = document.getElementById('mkt-sell-btn');
  if (sellBtn)  { sellBtn.onclick  = null; sellBtn.addEventListener('click',  mktSellNow); }
  const maxBtn   = document.getElementById('mkt-max-btn');
  if (maxBtn)   { maxBtn.onclick   = null; maxBtn.addEventListener('click',   mktSellMax); }
  const autoBtn  = document.getElementById('mkt-auto-btn');
  if (autoBtn)  { autoBtn.onclick  = null; autoBtn.addEventListener('click',  mktToggleAuto); }
  _marketSelectedRes = _marketSelectedRes ?? Object.keys(MARKET_BASE_PRICES)[0];
  requestAnimationFrame(() => renderMarketChart());
}
window.openMarketChartPanel = openMarketChartPanel;

function closeMarketChartPanel() {
  const panel = document.getElementById('market-chart-panel');
  if (panel) { panel.style.display = 'none'; panel.style.flexDirection = ''; }
}
window.closeMarketChartPanel = closeMarketChartPanel;

function selectMarketRes(res) {
  _marketSelectedRes = res;
  renderMarketChart();
}
window.selectMarketRes = selectMarketRes;

function mktSellMax() {
  const res   = _marketSelectedRes;
  const key   = _marketKey;
  if (!res || !key) return;
  const stock = state.warehouseStock[key] ?? {};
  const qty   = stock[res] ?? 0;
  const input = document.getElementById('mkt-sell-qty');
  if (input) input.value = qty;
  updateSellPreview();
}
window.mktSellMax = mktSellMax;

function mktSellNow() {
  const res   = _marketSelectedRes;
  const key   = _marketKey;
  if (!res || !key) return;
  const qty   = parseInt(document.getElementById('mkt-sell-qty')?.value ?? 0);
  if (!qty || qty <= 0) return notify('Quantité invalide !', 'err');
  const stock = state.warehouseStock[key] ?? {};
  const have  = stock[res] ?? 0;
  if (have <= 0) return notify('Pas de stock à vendre !', 'err');
  const sell  = Math.min(qty, have);
  const price = state.marketPrices?.[res] ?? MARKET_BASE_PRICES[res] ?? 1;
  const earned = Math.round(sell * price);
  stock[res] = have - sell;
  state.money += earned;
  updateStats();
  notify(`✅ Vendu ${sell} ${RESOURCE_LABELS?.[res]??res} → +${earned} 💰`, 'ok');
  renderMarketChart();
}
window.mktSellNow = mktSellNow;

function mktToggleAuto() {
  _marketAutoSell = !_marketAutoSell;
  const btn = document.getElementById('mkt-auto-btn');
  if (btn) {
    btn.textContent = `AUTO: ${_marketAutoSell ? 'ON' : 'OFF'}`;
    btn.style.borderColor = _marketAutoSell ? '#f0b90b' : '#848e9c';
    btn.style.color       = _marketAutoSell ? '#f0b90b' : '#848e9c';
  }
  notify(`Vente automatique ${_marketAutoSell ? 'activée' : 'désactivée'}`, 'ok');
}
window.mktToggleAuto   = mktToggleAuto;
window.getMktAutoSell  = () => _marketAutoSell;

function updateSellPreview() {
  const res   = _marketSelectedRes;
  const qty   = parseInt(document.getElementById('mkt-sell-qty')?.value ?? 0);
  const price = state.marketPrices?.[res] ?? MARKET_BASE_PRICES[res] ?? 1;
  const preview = document.getElementById('mkt-sell-preview');
  if (preview && qty > 0) {
    const total = Math.round(qty * price);
    preview.textContent = `≈ ${total} 💰 au cours actuel (${price}💰/u)`;
  }
}
window.updateSellPreview = updateSellPreview;

function renderMarketChart() {
  const prices  = state.marketPrices ?? {};
  const history = state.marketHistory ?? {};
  const res     = _marketSelectedRes ?? Object.keys(MARKET_BASE_PRICES)[0];
  const base    = MARKET_BASE_PRICES[res] ?? 1;
  const current = prices[res] ?? base;
  const hist    = history[res] ?? [];
  const key     = _marketKey;
  const stock   = key ? (state.warehouseStock[key] ?? {}) : {};

  // Badge ressource sélectionnée
  const badge = document.getElementById('mkt-selected-badge');
  if (badge) badge.textContent = (RESOURCE_ICONS?.[res]??'') + ' ' + (RESOURCE_LABELS?.[res]??res);

  // Prix big
  const priceBig = document.getElementById('mkt-price-big');
  const pct = Math.round((current - base) / base * 100);
  const up  = current >= base;
  if (priceBig) { priceBig.textContent = current + ' 💰'; priceBig.style.color = up ? '#02c076' : '#f6465d'; }
  const changeEl = document.getElementById('mkt-price-change');
  if (changeEl) {
    const sign = pct >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${pct}%`;
    changeEl.style.background = up ? 'rgba(2,192,118,0.15)' : 'rgba(246,70,93,0.15)';
    changeEl.style.color      = up ? '#02c076' : '#f6465d';
  }

  // Stats
  const statBase  = document.getElementById('mkt-stat-base');
  const statRange = document.getElementById('mkt-stat-range');
  const statStock = document.getElementById('mkt-stat-stock');
  if (statBase)  statBase.textContent  = base + ' 💰';
  if (statRange && hist.length > 0) {
    const mn = Math.min(...hist).toFixed(1), mx = Math.max(...hist).toFixed(1);
    statRange.textContent = mn + ' / ' + mx;
  }
  if (statStock) {
    const qty = stock[res] ?? 0;
    statStock.textContent = qty + ' u';
    statStock.style.color = qty > 0 ? '#f0b90b' : '#848e9c';
  }

  // Onglets ressources
  const tabsEl = document.getElementById('market-res-tabs');
  if (tabsEl) {
    tabsEl.innerHTML = Object.keys(MARKET_BASE_PRICES).map(r => {
      const p    = prices[r] ?? MARKET_BASE_PRICES[r];
      const b    = MARKET_BASE_PRICES[r];
      const up2  = p >= b;
      const sel  = r === res;
      const col  = up2 ? '#02c076' : '#f6465d';
      return `<button onclick="selectMarketRes('${r}')"
        style="flex-shrink:0;padding:5px 10px;border-radius:4px;cursor:pointer;white-space:nowrap;
        background:${sel ? '#2b3139' : 'transparent'};
        border:1px solid ${sel ? col : '#2b3139'};
        color:${sel ? col : '#848e9c'};font-size:0.65rem;font-weight:${sel?'700':'400'}">
        ${RESOURCE_ICONS?.[r]??''} ${RESOURCE_LABELS?.[r]??r}
        <span style="color:${col};margin-left:4px">${p}💰</span>
      </button>`;
    }).join('');
  }

  // Graphique canvas
  const canvas = document.getElementById('market-chart-canvas');
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    canvas.width  = Math.round(rect.width  * devicePixelRatio) || 600;
    canvas.height = Math.round(rect.height * devicePixelRatio) || 300;
    const ctx2 = canvas.getContext('2d');
    ctx2.scale(devicePixelRatio, devicePixelRatio);
    const W = rect.width || 280, H = rect.height || 150;
    ctx2.clearRect(0, 0, W, H);

    // Grille
    ctx2.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx2.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx2.beginPath(); ctx2.moveTo(0, H*i/4); ctx2.lineTo(W, H*i/4); ctx2.stroke();
    }

    if (hist.length >= 2) {
      const maxP  = Math.max(...hist, base) * 1.05;
      const minP  = Math.min(...hist, base) * 0.95;
      const range = maxP - minP || 1;
      const toY   = p => H - ((p - minP) / range) * H;
      const step  = W / (hist.length - 1);
      const color = up ? '#02c076' : '#f6465d';

      // Ligne de base
      ctx2.strokeStyle = 'rgba(240,185,11,0.4)';
      ctx2.lineWidth = 1;
      ctx2.setLineDash([4,4]);
      const baseY = toY(base);
      ctx2.beginPath(); ctx2.moveTo(0, baseY); ctx2.lineTo(W, baseY); ctx2.stroke();
      ctx2.setLineDash([]);

      // Zone remplie
      ctx2.beginPath();
      ctx2.moveTo(0, toY(hist[0]));
      hist.forEach((p, i) => ctx2.lineTo(i * step, toY(p)));
      ctx2.lineTo((hist.length-1)*step, H);
      ctx2.lineTo(0, H);
      ctx2.closePath();
      const grad = ctx2.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, color.replace(')', ',0.3)').replace('rgb', 'rgba'));
      grad.addColorStop(1, color.replace(')', ',0.02)').replace('rgb', 'rgba'));
      ctx2.fillStyle = grad;
      ctx2.fill();

      // Ligne courbe
      ctx2.beginPath();
      ctx2.strokeStyle = color;
      ctx2.lineWidth = 2;
      hist.forEach((p, i) => i===0 ? ctx2.moveTo(0, toY(p)) : ctx2.lineTo(i*step, toY(p)));
      ctx2.stroke();

      // Point actuel
      const lx = (hist.length-1)*step, ly = toY(hist[hist.length-1]);
      ctx2.beginPath(); ctx2.arc(lx, ly, 5, 0, Math.PI*2);
      ctx2.fillStyle = color; ctx2.fill();
      ctx2.strokeStyle = '#0b0e11'; ctx2.lineWidth = 2; ctx2.stroke();

      // Label prix actuel
      ctx2.fillStyle = color;
      ctx2.font = 'bold 11px monospace';
      ctx2.textAlign = 'right';
      ctx2.fillText(current + '💰', W - 4, ly - 8);
    } else {
      ctx2.fillStyle = '#848e9c';
      ctx2.font = '12px sans-serif';
      ctx2.textAlign = 'center';
      ctx2.fillText('En attente de données (fluctuations toutes les 2min)...', W/2, H/2);
    }
  }

  // Tous les cours — liste colonne unique triée alphabétiquement
  const allEl = document.getElementById('mkt-all-prices');
  if (allEl) {
    const sorted = Object.entries(MARKET_BASE_PRICES).sort((a,b) =>
      (RESOURCE_LABELS?.[a[0]]??a[0]).localeCompare(RESOURCE_LABELS?.[b[0]]??b[0])
    );
    allEl.innerHTML = sorted.map(([r, b]) => {
      const p    = prices[r] ?? b;
      const up2  = p >= b;
      const col  = up2 ? '#02c076' : '#f6465d';
      const pct2 = Math.round((p-b)/b*100);
      const sign = pct2 >= 0 ? '+' : '';
      const sel  = r === res;
      return `<div data-res="${r}" style="display:flex;align-items:center;justify-content:space-between;
        padding:10px 10px;border-radius:6px;margin-bottom:4px;cursor:pointer;
        background:${sel?'#2b3139':'transparent'};
        border:1px solid ${sel?col:'rgba(255,255,255,0.04)'}">
        <span style="font-size:0.75rem;color:#f0f0f0">${RESOURCE_ICONS?.[r]??''} ${RESOURCE_LABELS?.[r]??r}</span>
        <span style="font-size:0.8rem;font-weight:700;color:${col}">${p}💰&nbsp;<span style="font-size:0.62rem">${sign}${pct2}%</span></span>
      </div>`;
    }).join('');
    // Brancher les clics via event delegation
    allEl.onclick = e => {
      const row = e.target.closest('[data-res]');
      if (row) selectMarketRes(row.dataset.res);
    };
  }

  // Bouton auto
  const autoBtn = document.getElementById('mkt-auto-btn');
  if (autoBtn) {
    autoBtn.textContent   = `AUTO: ${_marketAutoSell ? 'ON' : 'OFF'}`;
    autoBtn.style.borderColor = _marketAutoSell ? '#f0b90b' : '#848e9c';
    autoBtn.style.color       = _marketAutoSell ? '#f0b90b' : '#848e9c';
  }

  // Preview vente
  updateSellPreview();
}
window.renderMarketChart = renderMarketChart;

// ===== LEVEL UP =====
function getTotalWarehouseStock() {
  const total = {};
  for (const stock of Object.values(state.warehouseStock ?? {})) {
    for (const [res, qty] of Object.entries(stock)) {
      total[res] = (total[res] ?? 0) + qty;
    }
  }
  return total;
}

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
  // Routes : coût selon palier de matériau
  if (type === 'road') {
    const nextDef = ROAD_LEVELS.find(r => r.level > level);
    if (!nextDef) return notify('Niveau maximum atteint !', 'err');
    const cost = getRoadUpgradeCost(level);
    if (state.money < cost) return notify("Pas assez d'argent !", 'err');
    // Vérifier ressources du prochain palier
    const resCost = nextDef.resources ?? null;
    if (resCost) {
      const total = getTotalWarehouseStock();
      for (const [res, qty] of Object.entries(resCost)) {
        if ((total[res]??0) < qty) {
          const label = RESOURCE_LABELS?.[res] ?? res;
          return notify(`Pas assez de ${label} ! (${qty} requis)`, 'err');
        }
      }
      for (const [res, qty] of Object.entries(resCost)) {
        let rem = qty;
        for (const wKey of Object.keys(state.warehouseStock ?? {})) {
          if (rem <= 0) break;
          const s = state.warehouseStock[wKey][res] ?? 0;
          const take = Math.min(s, rem);
          state.warehouseStock[wKey][res] = s - take;
          rem -= take;
        }
      }
    }
    state.money -= cost;
    state.buildingLevels[key] = level + 1;
    updateStats();
    openBuildingPanel(key, type);
    const def = getRoadDef(level + 1);
    notify(`🛣️ Route améliorée : ${def.name} !`, 'ok');
    return;
  }
  const cost  = levelUpCost(type, level);
  const resCost = (LEVELUP_RESOURCE_COST[type] ?? [])[level + 1] ?? null;

  if (state.money < cost) return notify("Pas assez d'argent !", 'err');

  // Vérifier les ressources dans les entrepôts
  if (resCost) {
    const totalStock = getTotalWarehouseStock();
    for (const [res, qty] of Object.entries(resCost)) {
      if ((totalStock[res] ?? 0) < qty) {
        const label = RESOURCE_LABELS?.[res] ?? res;
        return notify(`Pas assez de ${label} ! (${qty} requis)`, 'err');
      }
    }
    // Prélever les ressources dans les entrepôts
    for (const [res, qty] of Object.entries(resCost)) {
      let remaining = qty;
      for (const wKey of Object.keys(state.warehouseStock)) {
        if (remaining <= 0) break;
        const stock = state.warehouseStock[wKey][res] ?? 0;
        const take = Math.min(stock, remaining);
        state.warehouseStock[wKey][res] = stock - take;
        remaining -= take;
      }
    }
  }

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

// ===== PANEL RÉSIDENCE =====
function refreshHousePanel(key) {
  const el = document.getElementById('bp-house-section');
  if (!el) return;

  const level     = state.buildingLevels[key] ?? 0;
  const cap       = houseCapacity(level);
  const occ       = state.houseOccupants[key];
  const residents = occ?.residents ?? [];
  const adults    = residents.filter(r => r.type === 'adult').length;
  const children  = residents.filter(r => r.type === 'child').length;
  const total     = residents.length;
  const assigned  = residents.filter(r => r.type === 'adult' && r.workplace).length;
  const birthBase = Math.round(getBirthRate() * 100);
  const birthBonus= (level * 0.1).toFixed(1);

  el.style.display = 'block';
  el.innerHTML =
    `<div class="th-row"><span>👥 Habitants</span><span class="th-val">${total}/${cap}</span></div>` +
    `<div class="th-row"><span>👨 Adultes</span><span class="th-val">${adults}</span></div>` +
    `<div class="th-row"><span>👶 Enfants</span><span class="th-val">${children}</span></div>` +
    `<div class="th-row"><span>👷 Travailleurs</span><span class="th-val">${assigned}/${adults}</span></div>` +
    `<div class="th-row"><span>😴 Sans travail</span><span class="th-val">${Math.max(0, adults - assigned)}</span></div>` +
    `<div style="border-top:1px solid var(--border);margin:4px 0"></div>` +
    `<div class="th-row"><span>🍼 Natalité globale</span><span class="th-val">${birthBase}%</span></div>` +
    `<div class="th-row"><span>➕ Bonus lvl ${level}</span><span class="th-val">+${birthBonus}%</span></div>`;
}

// ===== PANEL HÔPITAL =====
function refreshHospitalPanel(key) {
  const el = document.getElementById('bp-house-section');
  if (!el) return;

  const level   = state.buildingLevels[key] ?? 0;
  const workers = state.assignedWorkers[key] ?? 0;
  const bonus   = workers > 0 ? (0.02 + level * 0.005) : 0;
  const total   = Math.round(getBirthRate() * 100);

  el.style.display = 'block';
  el.innerHTML =
    `<div class="th-row"><span>🍼 Natalité globale</span><span class="th-val">${total}%</span></div>` +
    `<div class="th-row"><span>➕ Bonus hôpital</span><span class="th-val" style="color:var(--success)">+${Math.round(bonus * 100)}%</span></div>` +
    `<div class="th-row" style="font-size:0.65rem;color:var(--muted)">` +
      (workers === 0 ? '⚠️ Inactif — assignez des travailleurs' : `✅ Actif — ${workers} travailleur(s)`) +
    `</div>`;
}

// ===== STOCK HdV =====
function refreshHdvStockPanel() {
  const el = document.getElementById('bp-hdv-stock');
  if (!el) return;
  const stock = state.hdvStock ?? {};
  const total = Object.values(stock).reduce((a,b)=>a+b,0);

  el.style.display = 'block';

  if (total === 0) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }

  el.innerHTML = '<div style="font-size:0.65rem;color:var(--gold);margin-bottom:4px;letter-spacing:0.1em">📦 STOCKS DE DÉPART</div>'
    + Object.entries(stock)
      .filter(([,q]) => q > 0)
      .map(([r,q]) => `<div class="th-row"><span>${RESOURCE_LABELS[r]??r}</span><span class="th-val">${q}</span></div>`)
      .join('');
}

// ===== PANEL INFO GÉNÉRIQUE BÂTIMENTS =====
function openBuildingInfo(type) {
  const def = BUILDING_DEF[type];
  if (!def || !def.info) return;
  document.getElementById('building-info-title').textContent = (def.icon ?? '') + ' ' + (def.name ?? type);
  document.getElementById('building-info-body').innerHTML    = def.info;
  document.getElementById('building-info-panel').style.display   = 'block';
  document.getElementById('building-info-overlay').style.display = 'block';
}
function closeBuildingInfo() {
  document.getElementById('building-info-panel').style.display   = 'none';
  document.getElementById('building-info-overlay').style.display = 'none';
}
// Afficher automatiquement à la 1ère construction de ce type
function maybeShowBuildingInfo(type) {
  if (!state.seenBuildingInfo) state.seenBuildingInfo = {};
  if (state.seenBuildingInfo[type]) return;
  state.seenBuildingInfo[type] = true;
  setTimeout(() => openBuildingInfo(type), 500);
}
window.openBuildingInfo      = openBuildingInfo;
window.closeBuildingInfo     = closeBuildingInfo;
window.maybeShowBuildingInfo = maybeShowBuildingInfo;

// ===== EXPOSITION GLOBALE =====
window.refreshBuildPanel    = refreshBuildPanel;
window.updateStats          = updateStats;
window.notify               = notify;
window.refreshHdvStockPanel = refreshHdvStockPanel;
