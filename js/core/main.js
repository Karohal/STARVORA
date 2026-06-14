// ============================================================
// STARVORA — js/core/main.js
// Point d'entrée — initialisation et boucle principale
// ============================================================

let lastTruckUpdate = null;

document.addEventListener('DOMContentLoaded', () => {
  // Erreurs globales
  window.onerror = function(msg, src, line, col, err) {
    showError('JS: ' + msg + ' | src:' + src + ' L' + line + ':' + col + (err ? ' | ' + err.stack : ''));
    return false;
  };
  window.addEventListener('unhandledrejection', function(e) {
    showError('Promise: ' + (e.reason?.message || e.reason || 'unknown'));
  });

  // Canvas
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Charger sauvegarde ou générer nouvelle carte
  const hasSave = loadGame();
  if (!hasSave) {
    initNewGame();
  }

  // UI
  updateStats();
  updatePopulation();
  updateAvailableWorkers();
  refreshBuildPanel();

  // Ticks
  startEconomyTick();
  setInterval(productionTick, 60000);

  // Sauvegarde auto toutes les 60s
  setInterval(() => {
    if (typeof saveGame === 'function') saveGame();
    if (typeof showSaveIndicator === 'function') showSaveIndicator();
  }, 60000);

  // Événements
  setupInputEvents();

  // Boucle de rendu
  drawFrame_start();
});

function initNewGame() {
  // Générer la map de départ (centre de la planète)
  const startMap = getPlanetMap(START_MAP_X, START_MAP_Y);
  startMap.map       = generateTerrain(COLS, ROWS, true, START_MAP_X, START_MAP_Y);
  startMap.resources = placeResources(startMap.map, STARTING_MAP_RESOURCES, COLS, ROWS);

  // Charger comme map active
  state.map       = startMap.map;
  state.resources = startMap.resources;
  state.planet[mapKey(START_MAP_X, START_MAP_Y)] = startMap;

  // Centrer la caméra
  const midCol = COLS / 2, midRow = ROWS / 2;
  const midX   = (midCol - midRow) * (TW / 2);
  const midY   = (midCol + midRow) * (TH / 2);
  state.cam.x  = window.innerWidth  / 2 - midX * state.cam.zoom;
  state.cam.y  = window.innerHeight / 2 - midY * state.cam.zoom - 40;
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

  // Tuiles
  drawMap(ctx);

  // Bâtiments construits
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${c},${r}`;
      if (state.buildings[key]) {
        drawBuilding(ctx, c, r, state.buildings[key]);
      }
    }
  }

  // Bâtiments en construction
  drawBuildingQueue(ctx);

  // Ghost preview
  drawGhostPreview(ctx);

  // Camions
  drawTrucks(ctx);

  // Flèches d'exploration
  drawExploreArrows(ctx);

  requestAnimationFrame(ts => {
    updateTrucks(ts);
    updateBuildingQueue();
    updateTruckBuildQueue();
    updateExploration();
    drawFrame();
  });
}

function showError(msg) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c00;color:white;padding:10px;z-index:99999;font-size:11px;font-family:monospace;word-break:break-all;max-height:40vh;overflow:auto';
  div.textContent = msg;
  div.onclick = () => div.remove();
  document.body.appendChild(div);
}
