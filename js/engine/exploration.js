// ============================================================
// STARVORA — js/engine/exploration.js
// Système d'exploration de la planète 3x3
// ============================================================

// Vérifier si une map est explorée
function isMapExplored(x, y) {
  return !!state.exploredMaps[mapKey(x, y)];
}

// Vérifier si une map est adjacente à une map explorée
function isMapAdjacent(x, y) {
  return EXPLORE_DIRECTIONS.some(d => {
    const nx = x + d.dx;
    const ny = y + d.dy;
    return nx >= 0 && nx < PLANET_COLS &&
           ny >= 0 && ny < PLANET_ROWS &&
           isMapExplored(nx, ny);
  });
}

// Lancer une exploration
function startExploration(mapX, mapY, vehicleId) {
  if (state.explorationQueue) {
    return notify('Vos unités d\'exploration sont déjà en mission. Veuillez patienter.', 'err');
  }
  if (!isMapAdjacent(mapX, mapY)) {
    return notify('Cette map n\'est pas accessible depuis votre position actuelle.', 'err');
  }
  if (isMapExplored(mapX, mapY)) {
    return notify('Cette zone est déjà explorée !', 'err');
  }

  const order    = state.explorationCount + 1;
  const duration = explorationTime(order);
  const mins     = Math.round(duration / 60000);

  state.explorationQueue = {
    mapX, mapY, vehicleId,
    startTime: Date.now(),
    duration,
    progress: 0,
  };

  notify(`🗺️ Exploration lancée ! Durée : ${mins} minute(s).`, 'ok');
  updateExploreArrows();
}
window.startExploration = startExploration;

// Tick d'exploration (appelé chaque frame)
function updateExploration() {
  if (!state.explorationQueue) return;

  const q   = state.explorationQueue;
  const now = Date.now();
  q.progress = Math.min(1, (now - q.startTime) / q.duration);

  // Mettre à jour le panel si ouvert
  const timerEl = document.getElementById('explore-timer');
  const barEl   = document.getElementById('explore-bar');
  if (timerEl) {
    const remaining = Math.max(0, Math.ceil((q.duration - (now - q.startTime)) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timerEl.textContent = `${mins}:${secs.toString().padStart(2,'0')}`;
  }
  if (barEl) {
    barEl.style.width = Math.round(q.progress * 100) + '%';
  }

  if (q.progress >= 1) {
    finalizeExploration(q);
  }
}

function finalizeExploration(q) {
  state.explorationQueue = null;
  state.explorationCount++;

  // Marquer comme explorée
  state.exploredMaps[mapKey(q.mapX, q.mapY)] = true;

  // Générer la nouvelle map
  const newMap = getPlanetMap(q.mapX, q.mapY);
  newMap.map       = generateTerrain(COLS, ROWS, false, q.mapX, q.mapY);
  newMap.resources = placeResources(newMap.map, SECONDARY_MAP_RESOURCES, COLS, ROWS);

  // Le véhicule reste sur la nouvelle map
  if (q.vehicleId && state.trucks[q.vehicleId]) {
    const vehicle = state.trucks[q.vehicleId];
    delete state.trucks[q.vehicleId];
    newMap.trucks = newMap.trucks ?? {};
    newMap.trucks[q.vehicleId] = vehicle;
    vehicle.x = Math.floor(COLS / 2);
    vehicle.y = Math.floor(ROWS / 2);
    vehicle.status = 'idle';
  }

  notify('🌍 Nouvelle zone découverte ! Cliquez sur la flèche pour y accéder.', 'ok');
  updateExploreArrows();
}

// Ouvrir le panel d'exploration pour une direction
function openExplorePanel(dx, dy) {
  const targetX = state.activeMap.x + dx;
  const targetY = state.activeMap.y + dy;

  if (targetX < 0 || targetX >= PLANET_COLS || targetY < 0 || targetY >= PLANET_ROWS) return;

  const explored  = isMapExplored(targetX, targetY);
  const exploring = state.explorationQueue &&
                    state.explorationQueue.mapX === targetX &&
                    state.explorationQueue.mapY === targetY;

  const panel = document.getElementById('explore-panel');
  if (!panel) return;

  document.getElementById('explore-title').textContent =
    explored ? '🌍 Zone explorée' : '🗺️ Zone inexplorée';

  const content = document.getElementById('explore-content');

  if (explored) {
    content.innerHTML = `
      <button class="assign-btn" onclick="navigateToMap(${targetX},${targetY})">
        🚀 Aller sur cette map
      </button>`;
  } else if (exploring) {
    const q = state.explorationQueue;
    const remaining = Math.max(0, Math.ceil((q.duration - (Date.now() - q.startTime)) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    content.innerHTML = `
      <div style="margin-bottom:8px;font-size:0.75rem;color:var(--gold)">Exploration en cours...</div>
      <div style="background:rgba(0,0,0,0.3);height:6px;border-radius:2px;overflow:hidden;margin-bottom:4px">
        <div id="explore-bar" style="height:100%;width:${Math.round(q.progress*100)}%;background:linear-gradient(90deg,var(--cyan),var(--gold))"></div>
      </div>
      <div id="explore-timer" style="font-size:0.65rem;color:var(--muted);text-align:right">${mins}:${secs.toString().padStart(2,'0')}</div>`;
  } else {
    // Vérifier les véhicules d'exploration disponibles
    const explorers = Object.entries(state.trucks)
      .filter(([,t]) => t.truckType === 'explorer' && t.status === 'idle');
    const order    = state.explorationCount + 1;
    const duration = explorationTime(order);
    const mins     = Math.round(duration / 60000);

    if (explorers.length === 0) {
      content.innerHTML = `<div class="th-muted">Aucun véhicule d\'exploration disponible.<br>Construisez-en un dans l\'usine de véhicules.</div>`;
    } else {
      content.innerHTML = `
        <div style="margin-bottom:8px;font-size:0.75rem;color:var(--muted)">Durée : ~${mins} minute(s)</div>
        ${explorers.map(([id, t]) => `
          <button class="assign-btn" onclick="startExploration(${targetX},${targetY},'${id}');closeExplorePanel()">
            ${TRUCK_BADGES.explorer} Envoyer ${id}
          </button>
        `).join('')}`;
    }
  }

  panel.classList.add('open');
  document.getElementById('explore-panel-overlay').style.display = 'block';
}
window.openExplorePanel = openExplorePanel;

function closeExplorePanel() {
  document.getElementById('explore-panel')?.classList.remove('open');
  document.getElementById('explore-panel-overlay').style.display = 'none';
}
window.closeExplorePanel = closeExplorePanel;

// Naviguer vers une map explorée
function navigateToMap(x, y) {
  closeExplorePanel();
  setActiveMap(x, y);
  updateStats();
  refreshBuildPanel();
  notify(`🗺️ Map (${x},${y}) chargée !`, 'ok');
}
window.navigateToMap = navigateToMap;

// Mettre à jour les flèches d'exploration
function updateExploreArrows() {
  EXPLORE_DIRECTIONS.forEach(d => {
    const tx = state.activeMap.x + d.dx;
    const ty = state.activeMap.y + d.dy;
    const btn = document.getElementById(`explore-arrow-${d.id}`);
    if (!btn) return;

    const inBounds  = tx >= 0 && tx < PLANET_COLS && ty >= 0 && ty < PLANET_ROWS;
    const explored  = inBounds && isMapExplored(tx, ty);
    const exploring = inBounds && state.explorationQueue?.mapX === tx &&
                      state.explorationQueue?.mapY === ty;

    if (!inBounds) {
      btn.style.display = 'none';
    } else if (explored) {
      btn.style.display = 'flex';
      btn.style.opacity = '1';
      btn.style.background = 'rgba(64,160,80,0.4)';
      btn.title = 'Zone explorée — cliquer pour naviguer';
    } else if (exploring) {
      btn.style.display = 'flex';
      btn.style.opacity = '0.8';
      btn.style.background = 'rgba(240,192,64,0.3)';
      btn.title = 'Exploration en cours...';
    } else {
      btn.style.display = 'flex';
      btn.style.opacity = '0.6';
      btn.style.background = 'rgba(5,5,15,0.7)';
      btn.title = 'Zone inexplorée';
    }
  });
}

window.updateExploreArrows = updateExploreArrows;
