// ============================================================
// STARVORA — js/ui/input.js
// Gestion touch, souris, clavier
// ============================================================

let _lastTap = 0, _tapPos = null;
let _panStart = null;
let _pinchDist = null;

function setupInputEvents() {
  const canvas = document.getElementById('game-canvas');

  // Touch
  canvas.addEventListener('touchstart',  onTouchStart,  { passive: false });
  canvas.addEventListener('touchmove',   onTouchMove,   { passive: false });
  canvas.addEventListener('touchend',    onTouchEnd,    { passive: false });

  // Souris
  canvas.addEventListener('mousedown',  onMouseDown);
  canvas.addEventListener('mousemove',  onMouseMove);
  canvas.addEventListener('mouseup',    onMouseUp);
  canvas.addEventListener('wheel',      onWheel, { passive: false });

  // Clavier
  document.addEventListener('keydown', onKeyDown);
}

// ===== TOUCH =====
function onTouchStart(e) {
  e.preventDefault();
  if (e.touches.length === 2) {
    _pinchDist = getPinchDist(e);
    return;
  }
  const t = e.touches[0];
  _panStart = { x: t.clientX, y: t.clientY, camX: state.cam.x, camY: state.cam.y };
}

function onTouchMove(e) {
  e.preventDefault();
  if (e.touches.length === 1 && state.ghostBuilding) {
    const t    = e.touches[0];
    const tile = screenToTile(t.clientX, t.clientY);
    state.ghostBuilding.col   = tile.col;
    state.ghostBuilding.row   = tile.row;
    state.ghostBuilding.valid = isValidPlacement(tile.col, tile.row, state.ghostBuilding.type);
    updateConfirmBar();
    return;
  }
  if (e.touches.length === 2 && _pinchDist) {
    const dist    = getPinchDist(e);
    const oldZoom = state.cam.zoom;
    const delta   = (dist - _pinchDist) * 0.005;
    const newZoom = Math.max(0.3, Math.min(2.5, oldZoom + delta));
    // Centrer sur le milieu des deux doigts
    const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    state.cam.x = mx - (mx - state.cam.x) * (newZoom / oldZoom);
    state.cam.y = my - (my - state.cam.y) * (newZoom / oldZoom);
    state.cam.zoom = newZoom;
    _pinchDist = dist;
    return;
  }
  if (_panStart && e.touches.length === 1) {
    const t = e.touches[0];
    state.cam.x = _panStart.camX + (t.clientX - _panStart.x);
    state.cam.y = _panStart.camY + (t.clientY - _panStart.y);
  }
}

function onTouchEnd(e) {
  e.preventDefault();
  _pinchDist = null;
  if (e.changedTouches.length === 1) {
    const t    = e.changedTouches[0];
    const now  = Date.now();
    const dist = _panStart ? Math.hypot(t.clientX-_panStart.x, t.clientY-_panStart.y) : 0;
    if (dist < 10 && now - _lastTap < 500) return; // double tap ignoré
    if (dist < 10) {
      handleTap(t.clientX, t.clientY);
      _lastTap = now;
    }
  }
  _panStart = null;
}

function getPinchDist(e) {
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx*dx + dy*dy);
}

// ===== SOURIS =====
let _mouseDown = false;
let _isPanning = false;
function onMouseDown(e) {
  _mouseDown = true;
  _isPanning = false;
  _panStart  = { x: e.clientX, y: e.clientY, camX: state.cam.x, camY: state.cam.y };
}
function onMouseMove(e) {
  const tile = screenToTile(e.clientX, e.clientY);

  if (_mouseDown && _panStart) {
    const dist = Math.hypot(e.clientX-_panStart.x, e.clientY-_panStart.y);
    if (dist > 5) {
      state.cam.x = _panStart.camX + (e.clientX - _panStart.x);
      state.cam.y = _panStart.camY + (e.clientY - _panStart.y);
      _isPanning = true;
    }
  }

  // Surlignage de survol uniquement (pas de fantôme posé)
  _ghostTile = tile;
}
function onMouseUp(e) {
  if (!_isPanning) {
    handleTap(e.clientX, e.clientY);
  }
  _mouseDown = false;
  _isPanning = false;
  _panStart  = null;
}
function onWheel(e) {
  e.preventDefault();
  const oldZoom = state.cam.zoom;
  const delta   = -e.deltaY * 0.001;
  const newZoom = Math.max(0.3, Math.min(2.5, oldZoom + delta));
  // Zoomer centré sur le curseur
  const rect = document.getElementById('game-canvas').getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;
  state.cam.x = mx - (mx - state.cam.x) * (newZoom / oldZoom);
  state.cam.y = my - (my - state.cam.y) * (newZoom / oldZoom);
  state.cam.zoom = newZoom;
}

// ===== CLAVIER =====
function onKeyDown(e) {
  const speed = 20;
  if (e.key === 'ArrowLeft')  state.cam.x += speed;
  if (e.key === 'ArrowRight') state.cam.x -= speed;
  if (e.key === 'ArrowUp')    state.cam.y += speed;
  if (e.key === 'ArrowDown')  state.cam.y -= speed;
  if (e.key === '+' || e.key === '=') adjustZoom(0.1);
  if (e.key === '-')                  adjustZoom(-0.1);
  if (e.key === 'Escape') {
    if (state.ghostBuilding) { cancelBuild(); return; }
    closeBuildingPanel();
    closeTruckPanel();
    closeExplorePanel();
    setTool('select');
  }
}

// ===== GESTION TAP =====
function handleTap(sx, sy) {
  const { col, row } = screenToTile(sx, sy);

  // Mode destruction
  if (state.tool === 'destroy') {
    const key = `${col},${row}`;
    if (state.buildings[key]) {
      showDestroyConfirm(key);
    }
    return;
  }

  // Mode construction
  if (state.tool === 'build' && state.selectedBuilding) {
    if (state.ghostBuilding) {
      // Déplacer le fantôme à la nouvelle position
      state.ghostBuilding.col   = col;
      state.ghostBuilding.row   = row;
      state.ghostBuilding.valid = isValidPlacement(col, row, state.ghostBuilding.type);
      updateConfirmBar();
    } else {
      // Poser le fantôme sur la tuile cliquée
      placeGhost(col, row);
    }
    return;
  }

  // Mode ajout de stop (panel camion ouvert + bouton "Ajouter un itinéraire" actif)
  if (window._addingStop && window._addingStopTruckId) {
    const key = `${col},${row}`;
    if (state.buildings[key] || state.buildingQueue[key]) {
      const truckId = window._addingStopTruckId;
      window._addingStop = false;
      window._addingStopTruckId = null;

      if (window._builderMoveMode) {
        // Mode déplacement builder : ajouter un stop temporaire sans load/unload
        window._builderMoveMode = false;
        const t = state.trucks[truckId];
        if (t) {
          // Vider les stops existants et ajouter un stop de déplacement
          t.route = [{ key, action: 'move' }];
          t.routeIndex = 0;
          t.status = 'moving';
          t.atStop = false;
          t.path = findPath(t.x, t.y, col, row);
          t._pathDest = key;
          notify('📍 Camion constructeur en route !', 'ok');
          openTruckPanel(truckId);
        }
      } else {
        showStopPicker(truckId, key);
      }
      return;
    }
  }

  // Sélectionner camion ou bâtiment
  const truck = findTruckAt(sx, sy);
  if (truck) {
    openTruckPanel(truck.id);
    return;
  }

  // Bâtiment
  const key = `${col},${row}`;
  if (state.buildings[key]) {
    closeTruckPanel();
    openBuildingPanel(key, state.buildings[key]);
  } else {
    // Case ressource ? Cherche sur la tuile et les adjacentes
    let res = state.resources?.[row]?.[col];
    if (!res) {
      for (const [dc,dr] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        res = state.resources?.[row+dr]?.[col+dc];
        if (res) break;
      }
    }
    if (res) {
      openResourceInfoPanel(res, col, row);
    } else {
      closeBuildingPanel();
      closeTruckPanel();
      closeResourceInfoPanel();
    }
  }
}

// Trouver un camion sous le curseur
function findTruckAt(sx, sy) {
  const { cam } = state;
  for (const t of Object.values(state.trucks)) {
    if (t.driver === 0) continue;
    if (t.atStop && (t.status === 'loading' || t.status === 'unloading') && t.route.length > 0) continue;
    const ts = {
      x: (t.x - t.y) * (TW/2) * cam.zoom + cam.x,
      y: (t.x + t.y) * (TH/2) * cam.zoom + cam.y + (TH/2-4) * cam.zoom,
    };
    if (Math.hypot(sx-ts.x, sy-ts.y) < 24 * cam.zoom) return t;
  }
  return null;
}

// Montrer le sélecteur load/unload
function showStopPicker(truckId, key) {
  window._pendingStopKey = key;
  const btype = state.buildings[key];
  const bdef  = BUILDING_DEF[btype];
  if (!bdef) return;

  const picker = document.getElementById('stop-picker');
  if (!picker) return;
  document.getElementById('sp-building').textContent = bdef.icon + ' ' + bdef.name;
  document.getElementById('sp-truck-id').textContent = truckId;
  picker.dataset.truckId = truckId;
  picker.classList.add('open');
  const overlay = document.getElementById('stop-picker-overlay');
  if (overlay) overlay.style.display = 'block';
}

function confirmStop(truckId, action) {
  if (!window._pendingStopKey) return;
  const t = state.trucks[truckId];
  if (!t) return;
  t.route.push({ key: window._pendingStopKey, action });
  window._pendingStopKey = null;
  document.getElementById('stop-picker')?.classList.remove('open');
  document.getElementById('stop-picker-overlay').style.display = 'none';
  openTruckPanel(truckId);
}
window.confirmStop = confirmStop;

function cancelStopUI() {
  document.getElementById('stop-picker')?.classList.remove('open');
  document.getElementById('stop-picker-overlay').style.display = 'none';
  const truckId = document.getElementById('stop-picker')?.dataset.truckId;
  window._pendingStopKey = null;
  if (truckId) openTruckPanel(truckId);
}
window.cancelStop = cancelStopUI;

function addStopOrMove() {
  const truckId = window._activeTruckId;
  const t = state.trucks[truckId];
  if (!t) return;
  if (t.truckType === 'builder') {
    window._addingStopTruckId = truckId;
    window._addingStop = true;
    window._builderMoveMode = true;
    closeTruckPanel();
    notify('📍 Tapez sur un bâtiment pour y déplacer le camion constructeur', 'ok');
  } else {
    window._addingStopTruckId = truckId;
    window._addingStop = true;
    window._builderMoveMode = false;
    closeTruckPanel();
    notify("Tapez sur un bâtiment pour l'ajouter à l'itinéraire", 'ok');
  }
}
window.addStopOrMove = addStopOrMove;

// Placement de bâtiment
function placeBuilding(col, row) {
  const type = state.selectedBuilding;
  if (!type) return notify('Sélectionne un bâtiment !', 'err');
  if (!isValidPlacement(col, row, type)) {
    const req = EXTRACTOR_RESOURCES[type];
    if (req) return notify('⛏️ Pose sur : ' + req.map(r => RESOURCE_LABELS[r]??r).join(' ou ') + ' !', 'err');
    if (type === 'research_warehouse') return notify('📦 Doit être adjacent au Centre de Recherche !', 'err');
    return notify('Impossible ici !', 'err');
  }
  const def = BUILDING_DEF[type];
  if (!def) return;
  if (state.money < def.cost) return notify("Pas assez d'argent ! (" + def.cost + " 💰)", 'err');
  if (type === 'townhall' && (state.hasTownhall || Object.values(state.buildingQueue).some(q=>q.type==='townhall')))
    return notify('Hôtel de Ville déjà construit !', 'err');
  if (state.buildingQueue[`${col},${row}`])
    return notify('Construction déjà en cours ici !', 'err');
  if (!['townhall','house','road'].includes(type) && state.hasTownhall && getTownhallEfficiency() === 0)
    return notify("🏛️ Assignez un travailleur a l'Hotel de Ville !", 'err');

  // Vérifier camion constructeur (sauf bâtiments de base gratuits)
  const needsBuilder = !FREE_BUILD_TYPES.has(type);
  if (needsBuilder && !getAvailableBuilder()) {
    return notify('🚧 Aucun camion constructeur disponible !', 'err');
  }

  const hdvEff  = getTownhallEfficiency();
  const baseDur = BUILD_TIME[type] ?? 10;
  const duration= hdvEff > 0 ? Math.round(baseDur / hdvEff) : baseDur;
  const key = `${col},${row}`;
  const orientation = state.ghostBuilding?.orientation ?? 'N';

  state.money -= def.cost;
  state.buildingQueue[key] = { type, col, row, startTime: Date.now(), duration: duration*1000, progress: 0, orientation };

  // Assigner le camion constructeur si nécessaire
  if (needsBuilder) {
    assignBuilderToConstruction(key, type, duration*1000);
  }

  updateStats();
  notify('🏗️ ' + def.icon + ' ' + def.name + ' en construction (' + duration + 's)...', 'ok');
}


// ===== FANTÔME DE CONSTRUCTION =====
function placeGhost(col, row) {
  const type  = state.selectedBuilding;
  const valid = isValidPlacement(col, row, type);
  state.ghostBuilding = { type, col, row, valid, orientation: 'N' };
  showConfirmBar();
}

function rotateGhostRoad() {
  if (!state.ghostBuilding || state.ghostBuilding.type !== 'road') return;
  const order = ['N', 'O', 'NE', 'NO', 'SE', 'SO', 'X', 'TNO', 'TNE', 'TOSp', 'TSpE'];
  const idx = order.indexOf(state.ghostBuilding.orientation ?? 'N');
  state.ghostBuilding.orientation = order[(idx + 1) % order.length];
}
window.rotateGhostRoad = rotateGhostRoad;

function showConfirmBar() {
  const bar = document.getElementById('build-confirm-bar');
  if (bar) bar.style.display = 'flex';
  updateConfirmBar();
}

function updateConfirmBar() {
  const g   = state.ghostBuilding;
  if (!g) return;
  const def = BUILDING_DEF[g.type];
  const el  = document.getElementById('build-confirm-info');
  if (el) {
    const valid = g.valid;
    const orientText = g.type === 'road' ? ' (' + (g.orientation ?? 'N') + ')' : '';
    el.textContent = (def?.icon ?? '') + ' ' + (def?.name ?? g.type) + orientText +
      ' — ' + (valid ? '✅ Emplacement valide' : '❌ Emplacement invalide');
    el.style.color = valid ? 'var(--success)' : 'var(--error)';
  }
  const rotateBtn = document.getElementById('btn-rotate-road');
  if (rotateBtn) rotateBtn.style.display = g.type === 'road' ? 'block' : 'none';
}

function confirmBuild() {
  const g = state.ghostBuilding;
  if (!g) return;
  if (!g.valid) return notify('Emplacement invalide !', 'err');
  placeBuilding(g.col, g.row);
  cancelBuild();
}

function cancelBuild() {
  state.ghostBuilding = null;
  const bar = document.getElementById('build-confirm-bar');
  if (bar) bar.style.display = 'none';
}

window.confirmBuild = confirmBuild;
window.cancelBuild  = cancelBuild;

function isValidPlacement(col, row, type) {
  if (col<0||row<0||col>=COLS||row>=ROWS) return false;
  if (state.map[row]?.[col]?.terrain === 'mountain') return false;
  if (state.buildings[`${col},${row}`]) return false;
  if (state.buildingQueue[`${col},${row}`]) return false;
  if (EXTRACTOR_RESOURCES[type]) {
    const res = state.resources[row]?.[col];
    if (!res || !EXTRACTOR_RESOURCES[type].includes(res)) return false;
  }
  if (type === 'research_warehouse') {
    const adjacent = Object.entries(state.buildings).some(([key, t]) => {
      if (t !== 'research_center') return false;
      const [bc, br] = key.split(',').map(Number);
      return Math.abs(bc - col) <= 1 && Math.abs(br - row) <= 1 && !(bc === col && br === row);
    });
    if (!adjacent) return false;
  }
  return true;
}

// ===== DESTRUCTION =====
let _destroyKey = null;

function showDestroyConfirm(key) {
  _destroyKey = key;
  const type  = state.buildings[key];
  const def   = BUILDING_DEF[type];
  const level = state.buildingLevels[key] ?? 0;
  const refund = Math.round((LEVELUP_BASE_COST[type] ?? 0) * 0.5);

  document.getElementById('destroy-info').innerHTML =
    `${def?.icon ?? ''} ${def?.name ?? type} (Niv.${level})<br>` +
    `Remboursement matériaux : ~${refund} 💰 équivalent`;

  document.getElementById('destroy-confirm').style.display = 'block';
  document.getElementById('destroy-overlay').style.display = 'block';
}

function cancelDestroy() {
  _destroyKey = null;
  document.getElementById('destroy-confirm').style.display = 'none';
  document.getElementById('destroy-overlay').style.display = 'none';
}

function confirmDestroy() {
  if (!_destroyKey) return;
  const key  = _destroyKey;
  const type = state.buildings[key];
  const def  = BUILDING_DEF[type];
  const level = state.buildingLevels[key] ?? 0;

  // Libérer le camion constructeur si construction en cours
  if (state.buildingQueue[key]) {
    freeBuilderTruck(key);
    delete state.buildingQueue[key];
    // Argent et ressources perdus (pas de remboursement)
  }

  // Rembourser 50% matériaux dans stock HdV
  const refundMat = getDestroyRefund(type, level);
  addToHdvStock(refundMat);

  // Libérer les travailleurs
  delete state.assignedWorkers[key];
  for (const occ of Object.values(state.houseOccupants ?? {})) {
    occ.residents?.forEach(r => { if (r.workplace === key) r.workplace = null; });
  }

  // Libérer les résidents si résidence
  if (type === 'house') {
    const occ = state.houseOccupants[key];
    if (occ?.residents) {
      // Les résidents deviennent sans-abris
      occ.residents.forEach(r => {
        // Chercher une autre maison
        let moved = false;
        for (const [k2, t2] of Object.entries(state.buildings)) {
          if (t2 !== 'house' || k2 === key) continue;
          const cap2 = houseCapacity(state.buildingLevels[k2] ?? 0);
          const occ2 = state.houseOccupants[k2];
          if (occ2?.residents && occ2.residents.length < cap2) {
            occ2.residents.push(r);
            moved = true;
            break;
          }
        }
        if (!moved) state.homeless++;
      });
    }
    delete state.houseOccupants[key];
  }

  // Supprimer le bâtiment
  delete state.buildings[key];
  delete state.buildingLevels[key];
  delete state.internalStock[key];
  delete state.warehouseStock[key];

  updatePopulation();
  updateAvailableWorkers();
  updateStats();
  refreshBuildPanel();
  closeBuildingPanel();
  cancelDestroy();
  notify(`🗑️ ${def?.icon ?? ''} ${def?.name ?? type} détruit !`, 'ok');
}

function getDestroyRefund(type, level) {
  // 50% des ressources de construction
  const base = {
    townhall: { stone: 10, iron: 5 },
    house:    { stone: 5,  iron: 2 },
    mine:     { stone: 8,  iron: 5 },
    quarry:   { stone: 6,  iron: 3 },
    well:     { stone: 4,  iron: 2 },
    hospital: { stone: 10, iron: 8 },
    research_center: { stone: 15, iron: 12 },
    sorting:  { stone: 10, iron: 8 },
    warehouse:{ stone: 8,  iron: 4 },
    road:     { stone: 2 },
  };
  const mat = base[type] ?? { stone: 5 };
  const mult = 1 + level * 0.2; // niveaux augmentent le remboursement
  const result = {};
  for (const [r, q] of Object.entries(mat)) {
    result[r] = Math.floor(q * mult * 0.5);
  }
  return result;
}

function addToHdvStock(materials) {
  const hdvKey = Object.entries(state.buildings).find(([,t]) => t === 'townhall')?.[0];
  if (!hdvKey) return;
  if (!state.hdvStock) state.hdvStock = {};
  for (const [res, qty] of Object.entries(materials)) {
    if (res !== 'water_r') continue; // HdV accepte uniquement l'eau potable
    state.hdvStock[res] = (state.hdvStock[res] ?? 0) + qty;
  }
}

window.showDestroyConfirm = showDestroyConfirm;
window.cancelDestroy      = cancelDestroy;
window.confirmDestroy     = confirmDestroy;

window.setupInputEvents = setupInputEvents;
