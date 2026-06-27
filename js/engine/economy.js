// ============================================================
// STARVORA — js/engine/economy.js
// Tick économique, population, natalité, horloge
// ============================================================

// ===== HORLOGE =====
// 1h réelle = 1 an de jeu (2387)
// 1 min réelle = ~5 jours de jeu
const GAME_START_YEAR = 2387;
let gameStartTime = Date.now();

function getGameDate() {
  const elapsed   = Date.now() - gameStartTime;
  const totalDays = Math.floor(elapsed / (1000 * 60 / 5)); // 1min = 5 jours
  const year      = GAME_START_YEAR + Math.floor(totalDays / 365);
  const dayOfYear = totalDays % 365 + 1;
  const month     = Math.floor((dayOfYear - 1) / 30) + 1;
  const day       = ((dayOfYear - 1) % 30) + 1;
  return { year, month, day, totalDays };
}

function updateGameClock() {
  const d   = getGameDate();
  const el  = document.getElementById('hud-date');
  if (el) el.textContent = `📅 An ${d.year} — Mois ${d.month} Jour ${d.day}`;
}

// ===== TAUX DE NATALITÉ =====
const BASE_BIRTH_RATE = 0.05; // 5%

function getBirthRate() {
  let rate = BASE_BIRTH_RATE;
  // Bonus hôpitaux
  for (const [key, type] of Object.entries(state.buildings)) {
    if (type === 'hospital') {
      const level = state.buildingLevels[key] ?? 0;
      const workers = state.assignedWorkers[key] ?? 0;
      if (workers > 0) { // hôpital doit avoir des workers
        rate += 0.02 + level * 0.005;
      }
    }
  }
  // Bonus recherches (futur)
  rate += state.researchBirthBonus ?? 0;
  return Math.min(rate, 0.5); // plafonné à 50%
}

// ===== TICK ÉCONOMIQUE (toutes les 60s) =====
function startEconomyTick() {
  setInterval(economyTick, 60000);
  setInterval(updateGameClock, 5000); // horloge toutes les 5s
  setInterval(natalityTick, 9 * 60 * 1000); // natalité toutes les 9min
  setInterval(agingTick, 60000); // vieillissement toutes les minutes
  updateGameClock();
}

function economyTick() {
  const homelessCost  = state.homeless * 2;
  const totalAssigned = Object.values(state.assignedWorkers).reduce((a,b)=>a+b,0);
  const chomeurs      = Math.max(0, state.housed - totalAssigned);
  const chomeurCost   = chomeurs * 0.5;
  const gain          = totalAssigned * 3;
  const delta         = Math.floor(gain - homelessCost - chomeurCost);
  state.money         = Math.max(0, state.money + delta);
  updateStats();
}

// ===== VIEILLISSEMENT =====
// Chaque habitant a un âge en minutes de jeu
// 18 minutes = 18 ans → devient travailleur
function agingTick() {
  let changed = false;
  for (const [key, occ] of Object.entries(state.houseOccupants ?? {})) {
    const residents = occ.residents ?? [];
    for (const r of residents) {
      r.age = (r.age ?? 0) + 1; // +1 minute = +1 an
      if (r.age === 18 && r.type === 'child') {
        r.type = 'adult';
        r.workplace = null;
        changed = true;
        notify('🎓 Un enfant est devenu adulte !', 'ok');
      }
    }
  }
  if (changed) { updatePopulation(); updateAvailableWorkers(); }
}

// ===== NATALITÉ =====
// Toutes les 9 minutes si conditions remplies
function natalityTick() {
  const birthRate = getBirthRate();

  for (const [key, type] of Object.entries(state.buildings)) {
    if (type !== 'house') continue;
    const level    = state.buildingLevels[key] ?? 0;
    const cap      = houseCapacity(level);
    const occ      = state.houseOccupants[key];
    if (!occ) continue;

    const residents = occ.residents ?? [];
    const adults    = residents.filter(r => r.type === 'adult');
    const count     = residents.length;

    // Bonus natalité de la maison (+0.1% par niveau)
    const houseLevel = state.buildingLevels[key] ?? 0;
    const houseBonus = houseLevel * 0.001;
    // Conditions : 2+ adultes, place disponible, tirage aléatoire
    if (adults.length >= 2 && count < cap && Math.random() < birthRate + houseBonus) {
      residents.push({ type: 'child', age: 0 });
      state.population++;
      notify('👶 Naissance dans une résidence !', 'ok');
      updatePopulation();
      continue;
    }

    // Adultes cherchent une autre maison si pleine
    if (adults.length >= 2 && count >= cap) {
      tryFindNewHome(key, adults);
    }
  }
}

function tryFindNewHome(fromKey, adults) {
  // Chercher une maison avec de la place et un autre adulte
  for (const [key, type] of Object.entries(state.buildings)) {
    if (type !== 'house' || key === fromKey) continue;
    const level = state.buildingLevels[key] ?? 0;
    const cap   = houseCapacity(level);
    const occ   = state.houseOccupants[key];
    if (!occ) continue;
    const residents  = occ.residents ?? [];
    const otherAdult = residents.find(r => r.type === 'adult');
    if (otherAdult && residents.length < cap) {
      // Déplacer un adulte
      const fromOcc = state.houseOccupants[fromKey];
      const idx     = fromOcc.residents.findIndex(r => r.type === 'adult');
      if (idx >= 0) {
        const adult = fromOcc.residents.splice(idx, 1)[0];
        residents.push(adult);
        updatePopulation();
        return;
      }
    }
  }
}

// ===== POPULATION =====
function updatePopulation() {
  let housed = 0, adults = 0, children = 0;
  for (const [key, occ] of Object.entries(state.houseOccupants ?? {})) {
    if (!occ || !occ.residents) continue;
    for (const r of occ.residents) {
      housed++;
      if (r.type === 'adult') adults++;
      else children++;
    }
  }
  state.housed   = housed;
  state.adults   = adults;
  state.children = children;
  state.homeless = Math.max(0, state.population - housed);
  updateAvailableWorkers();
  updateStats();
}

function updateAvailableWorkers() {
  const totalAssigned = Object.values(state.assignedWorkers).reduce((a,b)=>a+b,0);
  // Seuls les adultes logés peuvent travailler
  const adultsCount = state.adults ?? 0;
  state.availableWorkers = Math.max(0, adultsCount - totalAssigned);
}

function houseCapacity(level) {
  if (typeof level === 'string') level = state.buildingLevels[level] ?? 0;
  return 4 + Math.floor(level / 5) * 2;
}

// Peuplement initial d'une résidence
function scheduleHousing(key, type) {
  if (type !== 'house') return;

  // +1 habitant créé immédiatement à la construction
  if (!state.houseOccupants[key]) {
    state.houseOccupants[key] = { residents: [] };
  }
  const level = state.buildingLevels[key] ?? 0;
  const cap   = houseCapacity(level);
  const occ   = state.houseOccupants[key];

  if (occ.residents.length < cap) {
    occ.residents.push({ type: 'adult', age: 18 + Math.floor(Math.random() * 30), workplace: null });
    state.population++;
    updatePopulation();
    notify('🏠 1 nouvel habitant a emménagé !', 'ok');
  }

  // Boucle continue : toutes les 30s, faire emménager 1 sans-abri si place et dispo
  const interval = setInterval(() => {
    // Maison détruite entre temps → arrêter la boucle
    if (state.buildings[key] !== 'house') {
      clearInterval(interval);
      return;
    }
    const lvl = state.buildingLevels[key] ?? 0;
    const c   = houseCapacity(lvl);
    const o   = state.houseOccupants[key];
    if (!o) { clearInterval(interval); return; }

    if (o.residents.length >= c) {
      clearInterval(interval); // maison pleine, plus besoin de vérifier
      return;
    }
    if (state.homeless > 0) {
      o.residents.push({ type: 'adult', age: 18 + Math.floor(Math.random() * 30), workplace: null });
      updatePopulation();
      notify('🏠 1 sans-abri a emménagé !', 'ok');
    }
    // Si pas de sans-abri ce tour, on ne fait rien et on réessaiera au prochain tick
  }, 30000);
}

function evictResidents(key) {
  const occ = state.houseOccupants[key];
  if (!occ || !occ.residents) return;
  state.population -= occ.residents.length;
  delete state.houseOccupants[key];
  updatePopulation();
}

// ===== ASSIGNATION TRAVAILLEURS =====
function assignWorker(key, type, delta) {
  const level      = state.buildingLevels[key] ?? 0;
  const maxWorkers = (BASE_WORKERS[type] ?? 0) + Math.floor(level / 5);
  const current    = state.assignedWorkers[key] ?? 0;

  if (delta > 0) {
    if (current >= maxWorkers) return;
    // Chercher un adulte disponible (sans emploi) dans n'importe quelle maison
    let found = null;
    for (const occ of Object.values(state.houseOccupants ?? {})) {
      found = occ.residents?.find(r => r.type === 'adult' && !r.workplace);
      if (found) break;
    }
    if (!found) return notify('Pas de travailleur disponible !', 'err');
    found.workplace = key;
    state.assignedWorkers[key] = current + 1;
  } else {
    if (current <= 0) return;
    // Libérer un résident travaillant à ce bâtiment précis
    let freed = false;
    for (const occ of Object.values(state.houseOccupants ?? {})) {
      const r = occ.residents?.find(r => r.workplace === key);
      if (r) { r.workplace = null; freed = true; break; }
    }
    if (freed) state.assignedWorkers[key] = Math.max(0, current - 1);
  }

  updateAvailableWorkers();
  if (type === 'townhall') refreshBuildPanel();
  openBuildingPanel(key, type);
}
window.assignWorker = assignWorker;

// ===== HdV =====
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

// ===== STATS UI =====
function updateStats() {
  const el = document.getElementById('hud-money');
  if (el) el.textContent = '💰 ' + state.money;
  const p = document.getElementById('hud-pop');
  if (p) p.textContent = '👥 ' + state.population + (state.homeless > 0 ? ' (🏚️' + state.homeless + ')' : '');
  const w = document.getElementById('hud-workers');
  if (w) w.textContent = '👷 ' + state.availableWorkers;
}

window.updatePopulation      = updatePopulation;
window.updateAvailableWorkers = updateAvailableWorkers;
window.houseCapacity         = houseCapacity;
window.getBirthRate          = getBirthRate;

window.startEconomyTick = startEconomyTick;

// ============================================================
// MARCHÉ — Vente de ressources contre crédits
// ============================================================

const MARKET_BASE_PRICES = {
  stone:    2,  iron:     4,  coal:     3,  water:    2,
  stone_r: 8,  iron_r:  15,  coal_r:  10,  water_r:  6,
  waste:    1,  incin:    3,  limestone: 3,
};

// Prix courants (fluctuent)
if (!state.marketPrices) state.marketPrices = {};

function initMarketPrices() {
  if (!state.marketPrices) state.marketPrices = {};
  for (const [res, base] of Object.entries(MARKET_BASE_PRICES)) {
    if (!state.marketPrices[res]) state.marketPrices[res] = base;
  }
}

function fluctuateMarketPrices() {
  for (const [res, base] of Object.entries(MARKET_BASE_PRICES)) {
    const mult = 0.7 + Math.random() * 0.8; // 0.7x à 1.5x
    state.marketPrices[res] = Math.round(base * mult * 10) / 10;
  }
}

function marketCapacity(level) {
  return [50, 100, 200, 400][level ?? 0] ?? 50;
}

function marketSellRate(level) {
  return [5, 10, 20, 40][level ?? 0] ?? 5;
}

function marketCycleMs(level) {
  return [60000, 45000, 30000, 20000][level ?? 0] ?? 60000;
}

function updateMarkets() {
  const now = Date.now();
  for (const [key, type] of Object.entries(state.buildings)) {
    if (type !== 'market') continue;
    if ((state.assignedWorkers[key] ?? 0) === 0) continue;
    const level = state.buildingLevels[key] ?? 0;
    const cycle = marketCycleMs(level);
    if (!state._marketLastSell) state._marketLastSell = {};
    if (!state._marketLastSell[key]) state._marketLastSell[key] = now;
    if (now - state._marketLastSell[key] < cycle) continue;
    state._marketLastSell[key] = now;

    const stock = state.warehouseStock[key];
    if (!stock) continue;
    let units = marketSellRate(level);
    let earned = 0;
    for (const [res, qty] of Object.entries(stock)) {
      if (units <= 0) break;
      if (!qty || qty <= 0) continue;
      const price = state.marketPrices?.[res] ?? MARKET_BASE_PRICES[res] ?? 1;
      const sell = Math.min(qty, units);
      stock[res] = qty - sell;
      earned += Math.round(sell * price);
      units -= sell;
    }
    if (earned > 0) {
      state.money += earned;
      updateStats();
      notify(`🏪 Marché : +${earned} 💰`, 'ok');
    }
  }
}
window.updateMarkets      = updateMarkets;
window.initMarketPrices   = initMarketPrices;
window.fluctuateMarketPrices = fluctuateMarketPrices;
window.marketCapacity     = marketCapacity;
window.marketSellRate     = marketSellRate;
window.marketCycleMs      = marketCycleMs;
window.MARKET_BASE_PRICES = MARKET_BASE_PRICES;

// ============================================================
// SYSTÈME EAU — Distribution & effets manque d'eau
// ============================================================

const WATER_TOWER_RADIUS  = [2, 3, 4, 5]; // rayon par niveau
const WATER_CONSUMPTION   = 0.01; // unités/tick par habitant (toutes les 30s)
const WATER_GRACE_DAYS    = 7;    // jours avant effet
const WATER_DEATH_DAYS    = 90;   // jours avant mort/hospitalisation

function waterTowerRadius(level) {
  return WATER_TOWER_RADIUS[Math.min(level, WATER_TOWER_RADIUS.length-1)] ?? 2;
}

// Recalcule quels bâtiments sont couverts par l'eau
function updateWaterCoverage() {
  if (!state.waterCoverage) state.waterCoverage = {};
  const covered = {};

  // L'Hôtel de Ville distribue toujours l'eau sur 5×5 (rayon 2)
  for (const [key, type] of Object.entries(state.buildings)) {
    if (type !== 'townhall') continue;
    const [col, row] = key.split(',').map(Number);
    for (let r = row - 2; r <= row + 2; r++)
      for (let c = col - 2; c <= col + 2; c++)
        if (state.buildings[`${c},${r}`]) covered[`${c},${r}`] = true;
  }

  // Châteaux d'eau avec stock et travailleurs
  for (const [key, type] of Object.entries(state.buildings)) {
    if (type !== 'water_tower') continue;
    const stock = state.warehouseStock[key];
    if (!stock || Object.values(stock).reduce((a,b)=>a+b,0) === 0) continue;
    const assigned = state.assignedWorkers[key] ?? 0;
    if (assigned === 0) continue;

    const [col, row] = key.split(',').map(Number);
    const level  = state.buildingLevels[key] ?? 0;
    const radius = waterTowerRadius(level);

    for (let r = row - radius; r <= row + radius; r++)
      for (let c = col - radius; c <= col + radius; c++)
        if (state.buildings[`${c},${r}`]) covered[`${c},${r}`] = true;
  }

  state.waterCoverage = covered;
}

// Consommation d'eau par les châteaux d'eau
function consumeWater() {
  for (const [key, type] of Object.entries(state.buildings)) {
    if (type !== 'water_tower') continue;
    const stock = state.warehouseStock[key];
    if (!stock) continue;
    const [col, row] = key.split(',').map(Number);
    const level = state.buildingLevels[key] ?? 0;
    const radius = waterTowerRadius(level);
    // Consommation basée sur le nombre total d'habitants
    const consume = (state.population ?? 0) * WATER_CONSUMPTION;
    const current = stock['water_r'] ?? 0;
    stock['water_r'] = Math.max(0, current - consume);
  }
}

// Appliquer les effets de manque d'eau
function applyWaterDeprivation() {
  if (!state.waterDeprivation) state.waterDeprivation = {};
  if (!state.waterCoverage)    state.waterCoverage    = {};
  const dayMs = (state.dayDuration ?? 60000);
  const now   = Date.now();

  for (const [key, type] of Object.entries(state.buildings)) {
    // Seuls les bâtiments avec travailleurs sont affectés (pas les extracteurs ni l'HdV)
    if ((state.assignedWorkers[key] ?? 0) === 0) continue;
    if (['road','water_tower','well','mine','quarry','townhall','water_plant'].includes(type)) continue;

    const covered = !!state.waterCoverage[key];
    if (covered) {
      // Couvert → reset timer
      delete state.waterDeprivation[key];
      continue;
    }

    // Pas couvert → incrémenter timer
    if (!state.waterDeprivation[key]) {
      state.waterDeprivation[key] = { startDay: state.day ?? 0, startTime: now };
    }

    const dep  = state.waterDeprivation[key];
    const days = Math.floor((now - dep.startTime) / dayMs);

    // Après 7 jours : icône sur le bâtiment (géré dans renderer)
    // Après 90 jours : effets mortels
    if (days > WATER_DEATH_DAYS) {
      if (!dep.lastDeathTime || now - dep.lastDeathTime > dayMs * 7) {
        dep.lastDeathTime = now;
        // Aléatoire : mort ou hospitalisation
        if (Math.random() < 0.5 && state.population > 1) {
          state.population = Math.max(0, (state.population ?? 1) - 1);
          state.availableWorkers = Math.max(0, (state.availableWorkers ?? 0) - 1);
          notify(`💀 Un habitant est décédé par manque d'eau !`, 'err');
        } else {
          notify(`🏥 Un habitant est hospitalisé par manque d'eau !`, 'err');
        }
        updateStats();
      }
    }
  }
}

function updateWaterSystem() {
  updateWaterCoverage();
  consumeWater();
  applyWaterDeprivation();
}

window.updateWaterSystem    = updateWaterSystem;
window.updateWaterCoverage  = updateWaterCoverage;
window.waterTowerRadius     = waterTowerRadius;
window.WATER_GRACE_DAYS     = WATER_GRACE_DAYS;
window.WATER_DEATH_DAYS     = WATER_DEATH_DAYS;
