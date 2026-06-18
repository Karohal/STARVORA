// ============================================================
// STARVORA — js/engine/logistics.js
// Gestion des camions, routes, chargement/déchargement
// ============================================================

let lastTruckUpdate = null;

function createTruck(factoryKey, truckType) {
  const [col, row] = factoryKey.split(',').map(Number);
  const def = TRUCK_TYPES[truckType] ?? TRUCK_TYPES.standard;
  const id  = 'truck_' + (++state.truckCounter);
  state.trucks[id] = {
    id, factoryKey,
    truckType: truckType ?? 'standard',
    x: col, y: row,
    route: [], routeIndex: 0,
    driver: 0, cargo: {},
    capacity: def.capacity,
    status: 'idle',
    atStop: false, atStopTs: 0,
  };
  return id;
}

function deleteTruck(id) {
  const t = state.trucks[id];
  if (!t) return;
  if (t.driver > 0) { state.availableWorkers++; }
  delete state.trucks[id];
  updateStats();
  closeTruckPanel();
}
window.deleteTruck = deleteTruck;

function buildTruck(factoryKey, truckType) {
  const def = TRUCK_TYPES[truckType] ?? TRUCK_TYPES.standard;
  if (state.money < def.cost) return notify(`Pas assez d'argent ! (${def.cost} 💰)`, 'err');
  if (state.availableWorkers <= 0) return notify('Pas de conducteur disponible !', 'err');
  if (state.truckBuildQueue[factoryKey]) return notify('Construction déjà en cours dans cette usine !', 'err');
  state.money -= def.cost;
  state.availableWorkers--;
  state.truckBuildQueue[factoryKey] = {
    truckType,
    startTime: Date.now(),
    duration: (def.buildTime ?? 10) * 1000,
    progress: 0,
  };
  updateStats();
  notify(`🏗️ ${TRUCK_BADGES[truckType] ?? '🚛'} ${def.name} en construction (${def.buildTime}s)...`, 'ok');
  refreshFactoryPanel(factoryKey);
}
window.buildTruck = buildTruck;

function updateTruckBuildQueue() {
  const now = Date.now();
  for (const [factoryKey, q] of Object.entries(state.truckBuildQueue)) {
    q.progress = Math.min(1, (now - q.startTime) / q.duration);
    const fkSafe = factoryKey.replace(',', '-');
    const timerEl = document.getElementById('truck-build-timer-' + fkSafe);
    const barEl   = document.getElementById('truck-build-bar-' + fkSafe);
    if (timerEl) timerEl.textContent = Math.max(0, Math.ceil((q.duration - (now - q.startTime)) / 1000)) + 's restantes';
    if (barEl)   barEl.style.width   = Math.round(q.progress * 100) + '%';
    if (q.progress >= 1) {
      delete state.truckBuildQueue[factoryKey];
      const def = TRUCK_TYPES[q.truckType] ?? TRUCK_TYPES.standard;
      const id  = createTruck(factoryKey, q.truckType ?? 'standard');
      state.trucks[id].driver = 1;
      updateStats();
      notify(`✅ ${TRUCK_BADGES[q.truckType] ?? '🚛'} ${def.name} prêt !`, 'ok');
      refreshFactoryPanel(factoryKey);
    }
  }
}

// ============================================================
// MISE À JOUR POSITION CAMIONS
// ============================================================
function updateTrucks(timestamp) {
  if (!lastTruckUpdate) lastTruckUpdate = timestamp;
  const dt = (timestamp - lastTruckUpdate) / 1000;
  lastTruckUpdate = timestamp;

  for (const t of Object.values(state.trucks)) {
    if (t.driver === 0 || t.route.length === 0) continue;

    const stop     = t.route[t.routeIndex % t.route.length];
    const [tx, ty] = stop.key.split(',').map(Number);
    const dx = tx - t.x, dy = ty - t.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < 0.05) {
      t.x = tx; t.y = ty;
      t.status = stop.action === 'load' ? 'loading' : 'unloading';
      if (!t.atStop) {
        t.atStop = true; t.atStopTs = Date.now();
        handleTruckStop(t, stop);
      } else if (Date.now() - (t.atStopTs ?? 0) > 1000) {
        t.atStopTs = Date.now();
        handleTruckStop(t, stop);
      }
    } else {
      const speed = TRUCK_SPEED_ROUTE;
      const move  = Math.min(speed * dt, dist);
      t.x += (dx / dist) * move;
      t.y += (dy / dist) * move;
      t.status = 'moving';
      t.atStop = false; t.atStopTs = 0;
    }
  }
}

const TRUCK_SPEED_ROUTE   = 0.3;
const TRUCK_SPEED_NOROUTE = 0.05;

// ============================================================
// CHARGEMENT / DÉCHARGEMENT
// ============================================================
function handleTruckStop(t, stop) {
  if (stop.action === 'load') {
    const bldTypeLoad = state.buildings[stop.key];
    const isWarehouseLoad = bldTypeLoad && (WAREHOUSE_CATEGORIES[bldTypeLoad] !== undefined || bldTypeLoad === 'research_warehouse');

    if (isWarehouseLoad) {
      const assignedW = state.assignedWorkers[stop.key] ?? 0;
      if (assignedW === 0) { t.status = 'loading'; return; }

      const ws = state.warehouseStock[stop.key];
      if (!ws) { t.status = 'loading'; return; }

      const loaded2 = Object.values(t.cargo).reduce((a,b)=>a+b,0);
      const space2  = t.capacity - loaded2;
      if (space2 <= 0) { advanceTruck(t); return; }

      const truckCat2 = TRUCK_TYPES[t.truckType ?? 'standard']?.category ?? 'solid';
      let resKey = null, availQty = 0;
      for (const [r, q] of Object.entries(ws)) {
        if (q > 0 && (RESOURCE_CATEGORY[r] ?? 'solid') === truckCat2) { resKey = r; availQty = q; break; }
      }
      if (!resKey) { t.status = 'loading'; return; }

      const qty2 = Math.min(space2, availQty);
      t.cargo[resKey] = (t.cargo[resKey] ?? 0) + qty2;
      ws[resKey] -= qty2;
      t.status = 'loading';
      updateProductionUI();

      const newLoaded2 = Object.values(t.cargo).reduce((a,b)=>a+b,0);
      if (newLoaded2 >= t.capacity) advanceTruck(t);
      return;
    }

    const stock  = state.internalStock[stop.key];
    if (!stock) { t.status = 'loading'; return; }

    const loaded = Object.values(t.cargo).reduce((a,b)=>a+b,0);
    const space  = t.capacity - loaded;
    if (space <= 0) { advanceTruck(t); return; }

    const found = getLoadableResource(stock, t.truckType ?? 'standard');
    if (!found) { t.status = 'loading'; return; }

    const qty = Math.min(space, found.availQty);
    t.cargo[found.resKey] = (t.cargo[found.resKey] ?? 0) + qty;

    // Déduire du bon compartiment
    if (found.src === 'output')   stock.output[found.resKey]  -= qty;
    else if (found.src === 'solid')  stock.solid[found.resKey]   -= qty;
    else if (found.src === 'liquid') stock.liquid[found.resKey]  -= qty;
    else if (found.src === 'waste')  stock.waste                 -= qty;

    t.status = 'loading';
    updateProductionUI();

    const newLoaded = Object.values(t.cargo).reduce((a,b)=>a+b,0);
    if (newLoaded >= t.capacity) advanceTruck(t);

  } else if (stop.action === 'unload') {
    const loaded = Object.values(t.cargo).reduce((a,b)=>a+b,0);
    if (loaded === 0) { advanceTruck(t); return; }

    const bldType = state.buildings[stop.key];

    // Usines : décharger dans input
    if (['sorting','crusher','refinery','water_plant'].includes(bldType)) {
      if (!state.internalStock[stop.key]) state.internalStock[stop.key] = { input: {}, output: {} };
      const s    = state.internalStock[stop.key];
      if (!s.input) s.input = {};
      const recipe    = PRODUCTION_RECIPES[bldType];
      const validIn   = recipe ? recipe.recipes.map(r => r.input) : [];
      const inCap     = recipe ? recipe.inputCapacity(state.buildingLevels[stop.key] ?? 0) : 5;
      const inTotal   = Object.values(s.input).reduce((a,b)=>a+b,0);
      if (inTotal < inCap) {
        let free = inCap - inTotal;
        const remainingCargo = {};
        for (const [res, qty] of Object.entries(t.cargo)) {
          if (validIn.includes(res) && free > 0) {
            const add = Math.min(qty, free);
            s.input[res] = (s.input[res] ?? 0) + add;
            free -= add;
            if (qty - add > 0) remainingCargo[res] = qty - add;
          } else {
            remainingCargo[res] = qty;
          }
        }
        t.cargo = remainingCargo;
        if (Object.keys(t.cargo).length === 0) {
          advanceTruck(t);
        } else {
          t.status = 'unloading';
        }
        updateProductionUI();
      } else { t.status = 'unloading'; }
      return;
    }

    // Entrepôts
    const ws       = state.warehouseStock[stop.key];
    const isResearchWh = bldType === 'research_warehouse';
    const allowCat = WAREHOUSE_CATEGORIES[bldType] ?? 'solid';
    const truckCat = TRUCK_TYPES[t.truckType ?? 'standard']?.category ?? 'solid';
    const assigned = state.assignedWorkers[stop.key] ?? 0;
    if (ws !== undefined && assigned === 0) {
      t.status = 'unloading'; // pas de travailleur, camion attend
    } else if (ws !== undefined && (isResearchWh || allowCat === truckCat)) {
      for (const [res, qty] of Object.entries(t.cargo)) ws[res] = (ws[res] ?? 0) + qty;
      t.cargo = {};
      advanceTruck(t);
      updateProductionUI();
    } else if (ws === undefined) {
      t.status = 'unloading';
    } else {
      notify("⚠️ Mauvais type d'entrepot pour ce camion !", 'err');
      advanceTruck(t);
    }
  }
}

function advanceTruck(t) {
  t.status = 'moving';
  t.atStop = false; t.atStopTs = 0;
  t.routeIndex = (t.routeIndex + 1) % t.route.length;
}

// Routes du camion
function removeStop(truckId, index) {
  const t = state.trucks[truckId];
  if (!t) return;
  t.route.splice(index, 1);
  if (t.routeIndex >= t.route.length) t.routeIndex = 0;
  refreshTruckPanel(truckId);
}
window.removeStop = removeStop;

function confirmStop(truckId) {
  const t = state.trucks[truckId];
  if (!t || !window._pendingStop) return;
  t.route.push(window._pendingStop);
  window._pendingStop = null;
  refreshTruckPanel(truckId);
  closeTruckPanel();
  openTruckPanel(truckId);
}
window.confirmStop = confirmStop;

function cancelStop() {
  window._pendingStop = null;
  cancelStopUI();
}
window.cancelStop = cancelStop;
