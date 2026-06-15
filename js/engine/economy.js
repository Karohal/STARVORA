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
    const cap   = houseCapacity(key);
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
  state.availableWorkers = Math.max(0, (state.adults ?? state.housed) - totalAssigned);
}

function houseCapacity(level) {
  if (typeof level === 'string') level = state.buildingLevels[level] ?? 0;
  return 4 + Math.floor(level / 5) * 2;
}

// Peuplement initial d'une résidence
function scheduleHousing(key, type) {
  if (type !== 'house') return;
  setTimeout(() => {
    const level = state.buildingLevels[key] ?? 0;
    const cap   = houseCapacity(level);
    if (!state.houseOccupants[key]) {
      state.houseOccupants[key] = { residents: [] };
    }
    const occ      = state.houseOccupants[key];
    const toMove   = Math.min(cap, state.homeless);
    for (let i = 0; i < toMove; i++) {
      occ.residents.push({ type: 'adult', age: 18 + Math.floor(Math.random() * 30) });
    }
    updatePopulation();
    notify(`🏠 ${toMove} habitant(s) ont emménagé !`, 'ok');
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
  const newVal     = Math.max(0, Math.min(maxWorkers, current + delta));
  if (delta > 0 && state.availableWorkers <= 0) return notify('Pas de travailleur disponible !', 'err');
  state.assignedWorkers[key] = newVal;
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
