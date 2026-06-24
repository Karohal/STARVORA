// ============================================================
// STARVORA — js/core/main.js
// Point d'entrée — initialisation et boucle principale
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  window.onerror = function(msg, src, line, col, err) {
    showError('JS: ' + msg + ' | src:' + src + ' L' + line + ':' + col + (err ? ' | ' + err.stack : ''));
    return false;
  };
  window.addEventListener('unhandledrejection', function(e) {
    showError('Promise: ' + (e.reason?.message || e.reason || 'unknown'));
  });

  // Charger sauvegarde ou générer nouvelle carte EN PREMIER
  const hasSave = loadGame();
  if (!hasSave) initNewGame();

  // Canvas APRÈS init
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  if (!hasSave) centerCamera();

  // UI
  updateStats();
  updatePopulation();
  updateAvailableWorkers();
  refreshBuildPanel();
  updateExploreArrows();

  // Ticks
  startEconomyTick();
  setInterval(productionTick, 60000);
  setInterval(() => { saveGame(); showSaveIndicator(); }, 60000);

  // Événements
  setupInputEvents();
  setInterval(() => refreshBuildingPanelTrucks(), 500);

  // Boucle de rendu
  drawFrame_start();
});

function initNewGame() {
  const startMap     = getPlanetMap(START_MAP_X, START_MAP_Y);
  startMap.map       = generateTerrain(COLS, ROWS, true, START_MAP_X, START_MAP_Y);
  startMap.resources = placeResources(startMap.map, STARTING_MAP_RESOURCES, COLS, ROWS);
  state.map          = startMap.map;
  state.resources    = startMap.resources;
  state.planet[mapKey(START_MAP_X, START_MAP_Y)] = startMap;
}

// ============================================================
// BOUCLE PRINCIPALE
// ============================================================
function drawFrame_start() {
  requestAnimationFrame(ts => {
    updateTrucks(ts);
    updateBuildingQueue();
    updateTruckBuildQueue();
    updateExploration();
    drawFrame();
  });
}

function drawFrame() {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!state.map || state.map.length === 0) {
    requestAnimationFrame(ts => { updateTrucks(ts); updateBuilderTrucks((ts - (window._lastTs??ts))/1000); window._lastTs=ts; updateBuildingQueue(); updateTruckBuildQueue(); updateExploration(); drawFrame(); });
    return;
  }

  drawMap(ctx);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${c},${r}`;
      if (state.buildings[key]) drawBuilding(ctx, c, r, state.buildings[key]);
    }
  }

  drawSelectedTileHighlight(ctx);
  drawBuildingQueue(ctx);
  drawGhostPreview(ctx);
  drawTrucks(ctx);

  requestAnimationFrame(ts => { updateTrucks(ts); updateBuilderTrucks((ts - (window._lastTs??ts))/1000); window._lastTs=ts; updateBuildingQueue(); updateTruckBuildQueue(); updateExploration(); drawFrame(); });
}

// File de construction bâtiments
function updateBuildingQueue() {
  const now = Date.now();
  for (const [key, q] of Object.entries(state.buildingQueue)) {
    // Vérifier si un builder est assigné et pas encore arrivé
    const builder = Object.values(state.trucks).find(t =>
      t.truckType === 'builder' && t._buildTarget === key
    );
    if (builder && builder._buildPhase !== 'building') {
      // Builder en route — geler le timer
      q.startTime = now;
      q.progress  = 0;
      continue;
    }
    q.progress = Math.min(1, (now - q.startTime) / q.duration);
    if (q.progress >= 1) finalizeBuild(key, q.type, q.col, q.row, q.orientation);
  }
}

function finalizeBuild(key, type, col, row, orientation) {
  delete state.buildingQueue[key];
  state.buildings[key]      = type;
  state.buildingLevels[key] = 0;
  if (orientation) state.buildingOrientation[key] = orientation;

  if (['mine','quarry','well'].includes(type)) {
    state.internalStock[key] = { solid: {}, liquid: {}, waste: 0 };
  }
  if (['sorting','crusher','refinery','water_plant'].includes(type)) {
    state.internalStock[key] = { input: {}, output: {} };
  }
  if (Object.keys(WAREHOUSE_CATEGORIES).includes(type)) {
    state.warehouseStock[key] = {};
  }
  if (type === 'research_warehouse') {
    state.warehouseStock[key] = {};
  }
  if (type === 'townhall') {
    state.hasTownhall = true;
    refreshBuildPanel();
  }
  if (type === 'house') scheduleHousing(key, type);
  maybeShowBuildingInfo(type);

  updateAvailableWorkers();
  updateStats();
  refreshBuildPanel();
  notify('✅ ' + (BUILDING_DEF[type]?.icon ?? '') + ' ' + (BUILDING_DEF[type]?.name ?? type) + ' construit !', 'ok');
}

function showError(msg) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c00;color:white;padding:10px;z-index:99999;font-size:11px;font-family:monospace;word-break:break-all;max-height:40vh;overflow:auto';
  div.textContent = msg;
  div.onclick = () => div.remove();
  document.body.appendChild(div);
}

// Exposer sur window
window.setTool            = setTool;
window.adjustZoom         = adjustZoom;
window.selectBuilding     = selectBuilding;
window.toggleSection      = toggleSection;
window.buildingLevelUp    = buildingLevelUp;
window.openTruckPanel     = openTruckPanel;
window.closeTruckPanel    = closeTruckPanel;
window.openBuildingPanel  = openBuildingPanel;
window.closeBuildingPanel = closeBuildingPanel;
window.removeStop         = removeStop;
window.confirmStop        = confirmStop;
window.cancelStop         = cancelStop;
window.deleteTruck        = deleteTruck;
window.buildTruck         = buildTruck;
window.assignWorker       = assignWorker;
window.saveGame           = saveGame;
window.resetGame          = resetGame;
window.showSaveIndicator  = showSaveIndicator;
window.openExplorePanel   = openExplorePanel;
window.closeExplorePanel  = closeExplorePanel;
window.navigateToMap      = navigateToMap;
window.startExploration   = startExploration;
window.openBuildingInfo   = openBuildingInfo;
window.closeBuildingInfo  = closeBuildingInfo;
window.confirmBuild       = confirmBuild;
window.cancelBuild        = cancelBuild;
window.showDestroyConfirm = showDestroyConfirm;
window.cancelDestroy      = cancelDestroy;
window.confirmDestroy     = confirmDestroy;
