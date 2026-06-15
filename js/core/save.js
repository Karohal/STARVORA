// ============================================================
// STARVORA — js/core/save.js
// Sauvegarde / chargement localStorage
// ============================================================

const GAME_VERSION = '0.032.0';
const SAVE_KEY     = 'starvora_save';
const VERSION_KEY  = 'starvora_version';

function saveGame() {
  try {
    const save = {
      version:          GAME_VERSION,
      money:            state.money,
      population:       state.population,
      homeless:         state.homeless,
      housed:           state.housed,
      availableWorkers: state.availableWorkers,
      activeMap:        state.activeMap,
      planet:           state.planet,
      // Map active (raccourcis)
      map:              state.map,
      resources:        state.resources,
      buildings:        state.buildings,
      buildingLevels:   state.buildingLevels,
      buildingQueue:    state.buildingQueue,
      internalStock:    state.internalStock,
      warehouseStock:   state.warehouseStock,
      assignedWorkers:  state.assignedWorkers,
      houseOccupants:   state.houseOccupants,
      trucks:           state.trucks,
      truckCounter:     state.truckCounter,
      truckBuildQueue:  state.truckBuildQueue,
      hasTownhall:      state.hasTownhall,
      hdvStock:         state.hdvStock,
      exploredMaps:     state.exploredMaps,
      explorationQueue: state.explorationQueue,
      explorationCount: state.explorationCount,
      cam:              state.cam,
      savedAt:          Date.now(),
    };
    localStorage.setItem(SAVE_KEY,    JSON.stringify(save));
    localStorage.setItem(VERSION_KEY, GAME_VERSION);
    return true;
  } catch(e) {
    console.error('Sauvegarde échouée:', e);
    return false;
  }
}

function loadGame() {
  try {
    const savedVersion = localStorage.getItem(VERSION_KEY);
    if (savedVersion !== GAME_VERSION) {
      console.log(`Version sauvegarde (${savedVersion}) ≠ version jeu (${GAME_VERSION}) — nouvelle partie`);
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(VERSION_KEY);
      return false;
    }

    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const save = JSON.parse(raw);

    state.money            = save.money            ?? 10000;
    state.population       = save.population       ?? 10;
    state.homeless         = save.homeless         ?? 10;
    state.housed           = save.housed           ?? 0;
    state.availableWorkers = save.availableWorkers ?? 0;
    state.activeMap        = save.activeMap        ?? { x: START_MAP_X, y: START_MAP_Y };
    state.planet           = save.planet           ?? {};
    state.map              = save.map              ?? [];
    state.resources        = save.resources        ?? [];
    state.buildings        = save.buildings        ?? {};
    state.buildingLevels   = save.buildingLevels   ?? {};
    state.buildingQueue    = save.buildingQueue    ?? {};
    state.internalStock    = save.internalStock    ?? {};
    state.warehouseStock   = save.warehouseStock   ?? {};
    state.assignedWorkers  = save.assignedWorkers  ?? {};
    state.houseOccupants   = save.houseOccupants   ?? {};
    state.trucks           = save.trucks           ?? {};
    state.truckCounter     = save.truckCounter     ?? 0;
    state.truckBuildQueue  = save.truckBuildQueue  ?? {};
    state.hasTownhall      = save.hasTownhall      ?? false;
    state.hdvStock         = save.hdvStock         ?? { stone:30, iron:20, coal:20, water:10 };
    state.exploredMaps     = save.exploredMaps     ?? { '1,1': true };
    state.explorationQueue = save.explorationQueue ?? null;
    state.explorationCount = save.explorationCount ?? 0;

    if (save.cam) {
      state.cam.x    = save.cam.x    ?? 0;
      state.cam.y    = save.cam.y    ?? 0;
      state.cam.zoom = save.cam.zoom ?? 1;
    }

    // Recalculer hasTownhall
    state.hasTownhall = Object.values(state.buildings).includes('townhall');

    // Migrer les anciens stocks d'usines
    for (const [key, type] of Object.entries(state.buildings)) {
      if (['sorting','crusher','refinery','water_plant'].includes(type)) {
        const s = state.internalStock[key];
        if (s && (!s.input || !s.output)) {
          state.internalStock[key] = { input: {}, output: {} };
        }
      }
    }

    console.log('✅ Partie chargée ! (v' + GAME_VERSION + ')');
    return true;
  } catch(e) {
    console.error('Chargement échoué:', e);
    return false;
  }
}

function resetGame() {
  if (!confirm('Recommencer une nouvelle partie ? La sauvegarde sera effacée.')) return;
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(VERSION_KEY);
  location.reload();
}

function showSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 2000);
}

window.saveGame          = saveGame;
window.resetGame         = resetGame;
window.showSaveIndicator = showSaveIndicator;
