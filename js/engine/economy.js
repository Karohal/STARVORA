// ============================================================
// STARVORA — js/engine/economy.js
// Tick économique, population, travailleurs
// ============================================================

// ===== TICK ÉCONOMIQUE =====
function startEconomyTick() {
  setInterval(economyTick, 60000);
}

function economyTick() {
  // Sans-abris coûtent -2/min
  const homelessCost = state.homeless * 2;

  // Chômeurs logés coûtent -0.5/min
  const totalAssigned = Object.values(state.assignedWorkers).reduce((a,b) => a+b, 0);
  const chomeurs      = Math.max(0, state.housed - totalAssigned);
  const chomeurCost   = chomeurs * 0.5;

  // Travailleurs assignés rapportent +3/min
  const gain = totalAssigned * 3;

  const delta = Math.floor(gain - homelessCost - chomeurCost);
  state.money = Math.max(0, state.money + delta);

  updateStats();
}

// ===== POPULATION =====
function updatePopulation() {
  // Compter les logés depuis houseOccupants
  let housed = 0;
  for (const occ of Object.values(state.houseOccupants)) {
    housed += occ;
  }
  state.housed   = housed;
  state.homeless = Math.max(0, state.population - housed);
  updateAvailableWorkers();
  updateStats();
}

function updateAvailableWorkers() {
  const totalAssigned = Object.values(state.assignedWorkers).reduce((a,b) => a+b, 0);
  state.availableWorkers = Math.max(0, state.housed - totalAssigned);
}

// Capacité d'une résidence selon niveau
function houseCapacity(level) {
  return 4 + Math.floor(level / 5) * 2;
}

// ===== PEUPLEMENT AUTOMATIQUE =====
// Quand une résidence est construite, les sans-abris emménagent après 30s
function scheduleHousing(key, type) {
  if (type !== 'house') return;
  setTimeout(() => {
    const level  = state.buildingLevels[key] ?? 0;
    const cap    = houseCapacity(level);
    const toMove = Math.min(cap, state.homeless);
    state.houseOccupants[key] = (state.houseOccupants[key] ?? 0) + toMove;
    updatePopulation();
    notify(`🏠 ${toMove} habitant(s) ont emménagé !`, 'ok');
  }, 30000);
}

// Quand on détruit une résidence
function evictResidents(key) {
  const occ = state.houseOccupants[key] ?? 0;
  if (occ > 0) {
    state.population -= occ;
    delete state.houseOccupants[key];
    updatePopulation();
  }
}

// ===== ASSIGNATION TRAVAILLEURS =====
function assignWorker(key, type, delta) {
  const level      = state.buildingLevels[key] ?? 0;
  const maxWorkers = (BASE_WORKERS[type] ?? 0) + Math.floor(level / 5);
  const current    = state.assignedWorkers[key] ?? 0;
  const newVal     = Math.max(0, Math.min(maxWorkers, current + delta));

  if (delta > 0 && state.availableWorkers <= 0) {
    return notify('Pas de travailleur disponible !', 'err');
  }

  state.assignedWorkers[key] = newVal;
  updateAvailableWorkers();
  if (type === 'townhall') refreshBuildPanel();
  openBuildingPanel(key, type);
}
window.assignWorker = assignWorker;

// ===== EFFICACITÉ HdV =====
function getTownhallEfficiency() {
  const key = Object.entries(state.buildings).find(([,t]) => t === 'townhall')?.[0];
  if (!key) return 1;
  const level      = state.buildingLevels[key] ?? 0;
  const assigned   = state.assignedWorkers[key] ?? 0;
  const maxWorkers = 2 + Math.floor(level / 5);
  if (assigned === 0) return 0;
  return Math.min(1, assigned / maxWorkers);
}

function findTownhallKey() {
  return Object.entries(state.buildings).find(([,t]) => t === 'townhall')?.[0] ?? null;
}
