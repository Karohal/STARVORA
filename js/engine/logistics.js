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
    level: 0,
    status: 'idle',
    atStop: false, atStopTs: 0,
    resourceFilter: null,
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
  if ((state.assignedWorkers[factoryKey] ?? 0) === 0) return notify('Assignez un travailleur à l\'usine d\'abord !', 'err');
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
    // Pause si pas de travailleur assigné à l'usine
    const assigned = state.assignedWorkers[factoryKey] ?? 0;
    if (assigned === 0) {
      q.startTime += Date.now() - now; // décaler le timer pour simuler une pause
      const fkSafe = factoryKey.replace(',', '-');
      const timerEl = document.getElementById('truck-build-timer-' + fkSafe);
      if (timerEl) timerEl.textContent = '⏸ En attente de travailleur';
      continue;
    }
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
// ============================================================
// ============================================================
// CAMION CONSTRUCTEUR
// ============================================================

// Bâtiments de base construisibles sans camion constructeur
const FREE_BUILD_TYPES = new Set(['townhall','house','mine','well','warehouse','road','vehiclefactory','quarry']);

function completeBuildingConstruction(buildingKey, buildingType) {
  const [col, row] = buildingKey.split(',').map(Number);
  const orientation = state.buildingQueue[buildingKey]?.orientation;
  finalizeBuild(buildingKey, buildingType, col, row, orientation);
  freeBuilderTruck(buildingKey);
  notify(`✅ ${BUILDING_DEF[buildingType]?.icon ?? ''} ${BUILDING_DEF[buildingType]?.name ?? buildingType} construit !`, 'ok');
}

function getAvailableBuilder() {
  return Object.values(state.trucks).find(t =>
    t.truckType === 'builder' && t.driver > 0 && t.status === 'idle' && t.route.length === 0
  ) ?? null;
}

function assignBuilderToConstruction(buildingKey, buildingType, duration) {
  const builder = getAvailableBuilder();
  if (!builder) return false;

  const [tx, ty] = buildingKey.split(',').map(Number);
  builder.status = 'building';
  builder._buildTarget = buildingKey;
  builder._buildType   = buildingType;
  builder._buildDuration = duration;
  builder._buildPhase  = 'going';  // going -> building -> returning
  builder._buildStart  = null;
  builder.path = findPath(builder.x, builder.y, tx, ty);
  builder._pathDest = buildingKey;
  return true;
}
window.assignBuilderToConstruction = assignBuilderToConstruction;

function freeBuilderTruck(buildingKey) {
  const builder = Object.values(state.trucks).find(t =>
    t.truckType === 'builder' && t._buildTarget === buildingKey
  );
  if (!builder) return;
  builder.status = 'idle';
  builder._buildTarget   = null;
  builder._buildType     = null;
  builder._buildPhase    = null;
  builder._buildStart    = null;
  builder._buildDuration = null;
  builder.path = [];
  builder._pathDest = null;
}
window.freeBuilderTruck = freeBuilderTruck;

function updateBuilderTrucks(dt) {
  for (const t of Object.values(state.trucks)) {
    if (t.truckType !== 'builder' || t.status !== 'building') continue;
    const [tx, ty] = (t._buildTarget ?? '0,0').split(',').map(Number);
    const factoryKey = t.factoryKey;
    const [fx, fy]   = factoryKey.split(',').map(Number);

    if (t._buildPhase === 'going') {
      // Aller vers le chantier
      const waypoint = t.path?.length > 0 ? t.path[0] : { x: tx, y: ty };
      const dx = waypoint.x - t.x, dy = waypoint.y - t.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 0.05) {
        t.x = waypoint.x; t.y = waypoint.y;
        if (t.path?.length > 0) t.path.shift();
        if ((t.path?.length === 0) && Math.abs(t.x-tx) < 0.5 && Math.abs(t.y-ty) < 0.5) {
          t._buildPhase = 'building';
          t._buildStart = Date.now();
        }
      } else {
        const _rl = getRoadLevel(Math.round(t.x), Math.round(t.y)); const speed = truckSpeed(t, _rl >= 0, _rl);
        const move = Math.min(speed * dt, dist);
        t.x += (dx/dist)*move; t.y += (dy/dist)*move;
      }

    } else if (t._buildPhase === 'building') {
      // Attendre la durée de construction
      const elapsed = Date.now() - (t._buildStart ?? Date.now());
      if (elapsed >= (t._buildDuration ?? 0)) {
        // Construction terminée — finaliser le bâtiment
        completeBuildingConstruction(t._buildTarget, t._buildType);
        // Retourner à l'usine
        t._buildPhase = 'returning';
        t.path = findPath(t.x, t.y, fx, fy);
        t._pathDest = factoryKey;
      }

    } else if (t._buildPhase === 'returning') {
      // Retourner à l'usine
      const waypoint = t.path?.length > 0 ? t.path[0] : { x: fx, y: fy };
      const dx = waypoint.x - t.x, dy = waypoint.y - t.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 0.05) {
        t.x = waypoint.x; t.y = waypoint.y;
        if (t.path?.length > 0) t.path.shift();
        if (t.path?.length === 0) {
          t.x = fx; t.y = fy;
          t.status = 'idle';
          t._buildTarget = null; t._buildPhase = null;
          t._buildStart = null; t._buildDuration = null;
        }
      } else {
        const _rl = getRoadLevel(Math.round(t.x), Math.round(t.y)); const speed = truckSpeed(t, _rl >= 0, _rl);
        const move = Math.min(speed * dt, dist);
        t.x += (dx/dist)*move; t.y += (dy/dist)*move;
      }
    }
  }
}

// ============================================================
// PATHFINDING — BFS simple (routes prioritaires, évite montagnes)
// ============================================================
function isRoad(col, row) {
  return state.buildings[`${col},${row}`] === 'road';
}

function isPassable(col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
  const terrain = state.map?.[row]?.[col]?.terrain;
  if (terrain === 'mountain' || terrain === 'water') return false;
  return true;
}

function findPath(fx, fy, tx, ty) {
  const fc = Math.round(fx), fr = Math.round(fy);
  const tc = Math.round(tx), tr = Math.round(ty);
  if (fc === tc && fr === tr) return [];

  const key = (c, r) => `${c},${r}`;
  const neighbors = (c, r) => [
    [c-1,r],[c+1,r],[c,r-1],[c,r+1]
  ].filter(([nc,nr]) => isPassable(nc, nr));

  // BFS avec coût : route = 1, hors route = 3 (on préfère les routes)
  const dist = {}, prev = {};
  const queue = [[fc, fr, 0]];
  dist[key(fc,fr)] = 0;

  while (queue.length) {
    queue.sort((a,b) => a[2]-b[2]);
    const [c, r, d] = queue.shift();
    if (c === tc && r === tr) break;
    for (const [nc, nr] of neighbors(c, r)) {
      const k = key(nc, nr);
      const cost = d + (isRoad(nc, nr) ? 1 : 20);
      if (dist[k] === undefined || cost < dist[k]) {
        dist[k] = cost;
        prev[k] = key(c, r);
        queue.push([nc, nr, cost]);
      }
    }
  }

  // Reconstituer le chemin
  const path = [];
  let cur = key(tc, tr);
  while (cur && cur !== key(fc, fr)) {
    const [c, r] = cur.split(',').map(Number);
    path.unshift({ x: c, y: r });
    cur = prev[cur];
  }
  return path;
}

function updateTrucks(timestamp) {
  if (!lastTruckUpdate) lastTruckUpdate = timestamp;
  const dt = (timestamp - lastTruckUpdate) / 1000;
  lastTruckUpdate = timestamp;

  for (const t of Object.values(state.trucks)) {
    if (t.driver === 0 || t.route.length === 0) continue;

    const stop     = t.route[t.routeIndex % t.route.length];
    const [tx, ty] = stop.key.split(',').map(Number);

    // Recalculer le path si destination changée ou path vide ou camion a bougé de case
    const destKey = stop.key;
    const curKey = `${Math.round(t.x)},${Math.round(t.y)}`;
    if (t._pathDest !== destKey || !t.path || t.path.length === 0 || t._pathFrom !== curKey) {
      t.path = findPath(t.x, t.y, tx, ty);
      t._pathDest = destKey;
      t._pathFrom = curKey;
    }

    // Waypoint courant : prochain point du path, sinon destination directe
    const waypoint = t.path && t.path.length > 0 ? t.path[0] : { x: tx, y: ty };
    const dx = waypoint.x - t.x, dy = waypoint.y - t.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < 0.05) {
      t.x = waypoint.x; t.y = waypoint.y;
      // Waypoint atteint, passer au suivant
      if (t.path && t.path.length > 0) {
        t.path.shift();
      }
      // Destination finale atteinte
      if (t.path.length === 0 && Math.abs(t.x - tx) < 0.05 && Math.abs(t.y - ty) < 0.05) {
        t.x = tx; t.y = ty;
        // Stop de déplacement simple (builder) : arrivée = vider la route
        if (stop.action === 'move') {
          t.route = [];
          t.routeIndex = 0;
          t.status = 'idle';
          t.atStop = false;
          t.path = [];
          break;
        }
        t.status = stop.action === 'load' ? 'loading' : 'unloading';
        if (!t.atStop) {
          t.atStop = true; t.atStopTs = Date.now();
          handleTruckStop(t, stop);
        } else if (Date.now() - (t.atStopTs ?? 0) > 1000) {
          t.atStopTs = Date.now();
          handleTruckStop(t, stop);
        }
      }
    } else {
      const rc = Math.round(t.x), rr = Math.round(t.y);
      const rl = getRoadLevel(rc, rr);
      const speed  = truckSpeed(t, rl >= 0, rl);
      const move   = Math.min(speed * dt, dist);
      t.x += (dx / dist) * move;
      t.y += (dy / dist) * move;
      t.status = 'moving';
      t.atStop = false; t.atStopTs = 0;
    }
  }
}

const TRUCK_SPEED_ROUTE   = 0.3;
const TRUCK_SPEED_NOROUTE = 0.05;

function getRoadLevel(col, row) {
  const key = `${col},${row}`;
  if (state.buildings[key] !== 'road') return -1; // pas une route
  return state.buildingLevels[key] ?? 0;
}

function truckCapacity(t) {
  const base = TRUCK_TYPES[t.truckType ?? 'standard']?.capacity ?? 5;
  return base + (t.level ?? 0) * 2;
}
function truckSpeed(t, onRoad, roadLevel) {
  const truckMult = 1 + (t.level ?? 0) * 0.1;
  if (!onRoad) return TRUCK_SPEED_NOROUTE * truckMult;
  const roadMult = getRoadDef(roadLevel ?? 0)?.speedMult ?? 1.0;
  return TRUCK_SPEED_ROUTE * truckMult * roadMult;
}

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
      const space2  = truckCapacity(t) - loaded2;
      if (space2 <= 0) { advanceTruck(t); return; }

      const truckCat2 = TRUCK_TYPES[t.truckType ?? 'standard']?.category ?? 'solid';
      const whCat2    = WAREHOUSE_CATEGORIES[bldTypeLoad] ?? 'solid';
      let resKey = null, availQty = 0;
      for (const [r, q] of Object.entries(ws)) {
        const resCat = RESOURCE_CATEGORY[r] ?? 'solid';
        const catOk  = whCat2 === 'all' ? true : resCat === truckCat2;
        if (q > 0 && catOk && (!t.resourceFilter || t.resourceFilter.includes(r))) { resKey = r; availQty = q; break; }
      }
      if (!resKey) { if (!(stop.waitFull ?? false)) advanceTruck(t); else t.status = 'loading'; return; }

      const qty2 = Math.min(space2, availQty);
      t.cargo[resKey] = (t.cargo[resKey] ?? 0) + qty2;
      ws[resKey] -= qty2;
      t.status = 'loading';
      updateProductionUI();

      const newLoaded2 = Object.values(t.cargo).reduce((a,b)=>a+b,0);
      if (newLoaded2 >= truckCapacity(t)) { advanceTruck(t); return; }
      if (!(stop.waitFull ?? false)) advanceTruck(t);
      return;
    }

    const stock  = state.internalStock[stop.key];
    if (!stock) { t.status = 'loading'; return; }

    const loaded = Object.values(t.cargo).reduce((a,b)=>a+b,0);
    const space  = truckCapacity(t) - loaded;
    if (space <= 0) { advanceTruck(t); return; }

    const found = getLoadableResource(stock, t.truckType ?? 'standard', t.resourceFilter);
    if (!found) { if (!(stop.waitFull ?? false)) advanceTruck(t); else t.status = 'loading'; return; }

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
    if (newLoaded >= truckCapacity(t)) { advanceTruck(t); return; }
    if (!(stop.waitFull ?? false)) advanceTruck(t);

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
          if (validIn.includes(res) && free > 0 && (!t.resourceFilter || t.resourceFilter.includes(res))) {
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
    } else if (ws !== undefined && (isResearchWh || allowCat === 'all' || allowCat === truckCat)) {
      const wLevel = state.buildingLevels[stop.key] ?? 0;
      const wCap   = warehouseCapacity(wLevel);
      let wTotal   = Object.values(ws).reduce((a,b)=>a+b,0);
      const remainingCargo2 = {};
      for (const [res, qty] of Object.entries(t.cargo)) {
        if (!t.resourceFilter || t.resourceFilter.includes(res)) {
          const free = Math.max(0, wCap - wTotal);
          const add  = Math.min(qty, free);
          if (add > 0) {
            ws[res] = (ws[res] ?? 0) + add;
            wTotal += add;
          }
          if (qty - add > 0) remainingCargo2[res] = qty - add;
        } else {
          remainingCargo2[res] = qty;
        }
      }
      t.cargo = remainingCargo2;
      if (Object.keys(t.cargo).length === 0) {
        advanceTruck(t);
      } else {
        t.status = 'unloading';
      }
      updateProductionUI();
    } else if (ws === undefined) {
      t.status = 'unloading';
    } else {
      notify("⚠️ Mauvais type d'entrepot pour ce camion !", 'err');
      advanceTruck(t);
    }
  }
}

function toggleStopWait(truckId, index) {
  const t = state.trucks[truckId];
  if (!t || !t.route[index]) return;
  t.route[index].waitFull = !(t.route[index].waitFull ?? false);
  refreshTruckPanel(truckId);
}
window.toggleStopWait = toggleStopWait;

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
  // Si plus d'itinéraire : camion reste sur place, visible, en attente
  // Ne pas toucher au status d'un builder en cours de construction
  if (t.route.length === 0 && t.status !== 'building') {
    t.status = 'idle';
    t.atStop = false;
    t.atStopTs = 0;
    t.path = [];
    t._pathDest = null;
  }
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

// ============================================================
// AMÉLIORATION CAMION
// ============================================================
const TRUCK_UPGRADE_COST = [100, 300, 600]; // coût crédits pour passer au niveau 1, 2, 3

function upgradeTruck(truckId) {
  const t = state.trucks[truckId];
  if (!t) return;
  const level = t.level ?? 0;
  const maxLevel = 3;
  if (level >= maxLevel) return notify('Niveau maximum atteint !', 'err');

  const creditCost = TRUCK_UPGRADE_COST[level] ?? 999;
  if (state.money < creditCost) return notify(`Pas assez d'argent ! (${creditCost} 💰)`, 'err');

  // Vérifier ressources
  const resCost = (TRUCK_LEVEL_RESOURCE_COST[t.truckType] ?? [])[level + 1] ?? null;
  if (resCost) {
    const total = {};
    for (const s of Object.values(state.warehouseStock ?? {}))
      for (const [r,q] of Object.entries(s)) total[r] = (total[r]??0)+q;
    for (const [res, qty] of Object.entries(resCost)) {
      if ((total[res]??0) < qty) {
        const label = RESOURCE_LABELS?.[res] ?? res;
        return notify(`Pas assez de ${label} ! (${qty} requis)`, 'err');
      }
    }
    // Prélever
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

  state.money -= creditCost;
  t.level = level + 1;
  updateStats();
  notify(`✅ ${TRUCK_BADGES[t.truckType] ?? '🚛'} Niveau ${t.level} — Capacité +2, Vitesse +10% !`, 'ok');
  openTruckPanel(truckId);
}
window.upgradeTruck = upgradeTruck;
