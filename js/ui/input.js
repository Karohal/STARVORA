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
  if (e.touches.length === 2 && _pinchDist) {
    const dist  = getPinchDist(e);
    const delta = (dist - _pinchDist) * 0.005;
    state.cam.zoom = Math.max(0.3, Math.min(2.5, state.cam.zoom + delta));
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
function onMouseDown(e) {
  _mouseDown = true;
  _panStart  = { x: e.clientX, y: e.clientY, camX: state.cam.x, camY: state.cam.y };
}
function onMouseMove(e) {
  if (!_mouseDown || !_panStart) return;
  const dist = Math.hypot(e.clientX-_panStart.x, e.clientY-_panStart.y);
  if (dist > 5) {
    state.cam.x = _panStart.camX + (e.clientX - _panStart.x);
    state.cam.y = _panStart.camY + (e.clientY - _panStart.y);
  }
  // Ghost preview
  const tile = screenToTile(e.clientX, e.clientY);
  _ghostTile = tile;
}
function onMouseUp(e) {
  const dist = _panStart ? Math.hypot(e.clientX-_panStart.x, e.clientY-_panStart.y) : 0;
  if (dist < 5) handleTap(e.clientX, e.clientY);
  _mouseDown = false;
  _panStart  = null;
}
function onWheel(e) {
  e.preventDefault();
  const delta = -e.deltaY * 0.001;
  state.cam.zoom = Math.max(0.3, Math.min(2.5, state.cam.zoom + delta));
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
    closeBuildingPanel();
    closeTruckPanel();
    closeExplorePanel();
    setTool('select');
  }
}

// ===== GESTION TAP =====
function handleTap(sx, sy) {
  const { col, row } = screenToTile(sx, sy);

  // Construire
  if (state.tool === 'build' && state.selectedBuilding) {
    placeBuilding(col, row);
    return;
  }

  // Sélectionner camion ou bâtiment
  const truck = findTruckAt(sx, sy);
  if (truck) {
    // Mode ajout de stop
    if (window._activeTruckId) {
      const key = `${col},${row}`;
      if (state.buildings[key] || state.buildingQueue[key]) {
        showStopPicker(window._activeTruckId, key);
      }
      return;
    }
    openTruckPanel(truck.id);
    return;
  }

  // Bâtiment
  const key = `${col},${row}`;
  if (state.buildings[key]) {
    openBuildingPanel(key, state.buildings[key]);
  } else {
    closeBuildingPanel();
    closeTruckPanel();
  }
}

// Trouver un camion sous le curseur
function findTruckAt(sx, sy) {
  const { cam } = state;
  for (const t of Object.values(state.trucks)) {
    if (t.atStop && (t.status === 'loading' || t.status === 'unloading')) continue;
    const ts = {
      x: (t.x - t.y) * (TW/2) * cam.zoom + cam.x,
      y: (t.x + t.y) * (TH/2) * cam.zoom + cam.y + (TH/2-4) * cam.zoom,
    };
    if (Math.hypot(sx-ts.x, sy-ts.y) < 16 * cam.zoom) return t;
  }
  return null;
}

// Montrer le sélecteur load/unload
function showStopPicker(truckId, key) {
  window._pendingStop = null;
  const btype = state.buildings[key];
  const bdef  = BUILDING_DEF[btype];
  if (!bdef) return;

  const picker = document.getElementById('stop-picker');
  if (!picker) return;
  document.getElementById('sp-building').textContent = bdef.icon + ' ' + bdef.name;
  document.getElementById('sp-truck-id').textContent = truckId;
  picker.classList.add('open');
}

function confirmStop(truckId, action) {
  if (!window._pendingStopKey) return;
  const t = state.trucks[truckId];
  if (!t) return;
  t.route.push({ key: window._pendingStopKey, action });
  window._pendingStopKey = null;
  document.getElementById('stop-picker')?.classList.remove('open');
  refreshTruckPanel(truckId);
}
window.confirmStop = confirmStop;

function cancelStopUI() {
  document.getElementById('stop-picker')?.classList.remove('open');
  window._pendingStopKey = null;
}
window.cancelStop = cancelStopUI;

// Placement de bâtiment
function placeBuilding(col, row) {
  const type = state.selectedBuilding;
  if (!type) return notify('Sélectionne un bâtiment !', 'err');
  if (!isValidPlacement(col, row, type)) {
    const req = EXTRACTOR_RESOURCES[type];
    if (req) return notify('⛏️ Pose sur : ' + req.map(r => RESOURCE_LABELS[r]??r).join(' ou ') + ' !', 'err');
    return notify('Impossible ici !', 'err');
  }
  const def = BUILDING_DEF[type];
  if (!def) return;
  if (state.money < def.cost) return notify('Pas assez d\'argent ! (' + def.cost + ' 💰)', 'err');
  if (type === 'townhall' && (state.hasTownhall || Object.values(state.buildingQueue).some(q=>q.type==='townhall')))
    return notify('Hôtel de Ville déjà construit !', 'err');
  if (state.buildingQueue[`${col},${row}`])
    return notify('Construction déjà en cours ici !', 'err');
  if (!['townhall','house','road'].includes(type) && state.hasTownhall && getTownhallEfficiency() === 0)
    return notify("🏛️ Assignez un travailleur a l'Hotel de Ville !", 'err');

  const hdvEff  = getTownhallEfficiency();
  const baseDur = BUILD_TIME[type] ?? 10;
  const duration= hdvEff > 0 ? Math.round(baseDur / hdvEff) : baseDur;

  state.money -= def.cost;
  state.buildingQueue[`${col},${row}`] = { type, col, row, startTime: Date.now(), duration: duration*1000, progress: 0 };
  updateStats();
  notify('🏗️ ' + def.icon + ' ' + def.name + ' en construction (' + duration + 's)...', 'ok');
}

function isValidPlacement(col, row, type) {
  if (col<0||row<0||col>=COLS||row>=ROWS) return false;
  if (state.map[row]?.[col]?.terrain === 'mountain') return false;
  if (state.buildings[`${col},${row}`]) return false;
  if (state.buildingQueue[`${col},${row}`]) return false;
  if (EXTRACTOR_RESOURCES[type]) {
    const res = state.resources[row]?.[col];
    if (!res || !EXTRACTOR_RESOURCES[type].includes(res)) return false;
  }
  return true;
}
