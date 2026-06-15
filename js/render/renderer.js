// ============================================================
// STARVORA — js/render/renderer.js
// Dessin carte, bâtiments, camions, construction
// ============================================================

// Canvas
let canvas, ctx;
function resizeCanvas() {
  canvas = document.getElementById('game-canvas');
  ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function centerCamera() {
  canvas = document.getElementById('game-canvas');
  const midCol = COLS / 2, midRow = ROWS / 2;
  const midX   = (midCol - midRow) * (TW / 2);
  const midY   = (midCol + midRow) * (TH / 2);
  state.cam.x  = canvas.width  / 2 - midX * state.cam.zoom;
  state.cam.y  = canvas.height / 2 - midY * state.cam.zoom - 40;
}

// Coordonnées iso
function tileToScreen(col, row) {
  const { cam } = state;
  return {
    x: (col - row) * (TW / 2) * cam.zoom + cam.x,
    y: (col + row) * (TH / 2) * cam.zoom + cam.y,
  };
}
function screenToTile(sx, sy) {
  const { cam } = state;
  const wx  = (sx - cam.x) / cam.zoom;
  const wy  = (sy - cam.y) / cam.zoom - TH/2; // centre visuel du losange
  const col = Math.floor((wx / (TW/2) + wy / (TH/2)) / 2);
  const row = Math.floor((wy / (TH/2) - wx / (TW/2)) / 2);
  return { col, row };
}

// ============================================================
// DESSIN CARTE
// ============================================================
function drawMap(ctx) {
  const { cam } = state;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = state.map[r]?.[c];
      if (!tile) continue;
      const s  = tileToScreen(c, r);
      const tw = TW * cam.zoom;
      const th = TH * cam.zoom;

      const isMountain = tile.terrain === 'mountain';
      const res        = state.resources[r]?.[c];

      // Couleur : montagne=gris, ressource=couleur ressource, sinon vert gazon
      let tColor;
      if (isMountain)  tColor = '#555560';
      else if (res)    tColor = RESOURCE_COLORS[res] ?? '#4a7a3a';
      else             tColor = '#4a7a3a';

      // Tuile plate
      ctx.beginPath();
      ctx.moveTo(s.x,        s.y);
      ctx.lineTo(s.x + tw/2, s.y + th/2);
      ctx.lineTo(s.x,        s.y + th);
      ctx.lineTo(s.x - tw/2, s.y + th/2);
      ctx.closePath();
      ctx.fillStyle = tColor;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth   = 0.5;
      ctx.stroke();

      // Motif montagne
      if (isMountain && cam.zoom > 0.4) {
        const mx = s.x, my = s.y + th/2;
        ctx.beginPath();
        ctx.moveTo(mx - tw/6, my + th/8);
        ctx.lineTo(mx - tw/10, my - th/6);
        ctx.lineTo(mx,         my + th/8);
        ctx.closePath();
        ctx.fillStyle = '#373740'; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(mx,         my + th/8);
        ctx.lineTo(mx + tw/8,  my - th/8);
        ctx.lineTo(mx + tw/5,  my + th/8);
        ctx.closePath();
        ctx.fillStyle = '#434350'; ctx.fill();
      }

      // Nom de la ressource
      if (res && cam.zoom > 0.6) {
        ctx.font         = `bold ${Math.floor(8 * cam.zoom)}px sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = '#fff';
        ctx.strokeStyle  = 'rgba(0,0,0,0.6)';
        ctx.lineWidth    = 2;
        ctx.strokeText(RESOURCE_LABELS[res] ?? res, s.x, s.y + th/2);
        ctx.fillText(RESOURCE_LABELS[res] ?? res, s.x, s.y + th/2);
      }
    }
  }
}

// ============================================================
// DESSIN BÂTIMENTS
// ============================================================
function shadeColor(color, pct) {
  const num = parseInt(color.replace('#',''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + pct));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + pct));
  const b = Math.min(255, Math.max(0, (num & 0xff) + pct));
  return '#' + ((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);
}

function drawBuilding(ctx, col, row, type) {
  const def  = BUILDING_DEF[type];
  const tile = state.map[row]?.[col];
  if (!tile || !def) return;

  const { cam } = state;
  const s    = tileToScreen(col, row);
  const tw   = TW * cam.zoom;
  const th   = TH * cam.zoom;
  const bh   = (type === 'townhall' ? 36 : type === 'road' ? 4 : 22) * cam.zoom;
  const cx   = s.x;
  const cy   = s.y + th - th/4;  // base au coin bas du losange
  const bw   = tw / 2;

  // Route
  if (type === 'road') {
    ctx.beginPath();
    ctx.moveTo(s.x,        s.y);
    ctx.lineTo(s.x + tw/2, s.y + th/2);
    ctx.lineTo(s.x,        s.y + th);
    ctx.lineTo(s.x - tw/2, s.y + th/2);
    ctx.closePath();
    ctx.fillStyle = '#605040';
    ctx.fill();
    return;
  }

  // Citerne = cylindre
  if (type === 'warehouse_liquid') {
    drawCylinder(ctx, cx, cy, tw/3.5, th/7, bh, def.color, cam);
    drawBuildingLabel(ctx, cx, cy, bh, th/7, col, row, def, cam);  
    return;
  }

  // Réservoir gaz = sphère
  if (type === 'warehouse_gas') {
    drawSphere(ctx, cx, cy, tw/3, bh, def.color, cam);
    drawBuildingLabel(ctx, cx, cy - tw/3, 0, 0, col, row, def, cam);
    return;
  }

  // Cube standard
  drawCube(ctx, cx, cy, bw, bh, th, def.color);
  drawBuildingLabel(ctx, cx, cy, bh, th/4, col, row, def, cam);
}

function drawCube(ctx, cx, cy, bw, bh, th, color) {
  // Face gauche
  ctx.beginPath();
  ctx.moveTo(cx - bw/2, cy);
  ctx.lineTo(cx,        cy + th/4);
  ctx.lineTo(cx,        cy + th/4 - bh);
  ctx.lineTo(cx - bw/2, cy - bh);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -30);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  // Face droite
  ctx.beginPath();
  ctx.moveTo(cx,        cy + th/4);
  ctx.lineTo(cx + bw/2, cy);
  ctx.lineTo(cx + bw/2, cy - bh);
  ctx.lineTo(cx,        cy + th/4 - bh);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -15);
  ctx.fill(); ctx.stroke();
  // Toit
  ctx.beginPath();
  ctx.moveTo(cx,        cy - bh - th/4);
  ctx.lineTo(cx + bw/2, cy - bh);
  ctx.lineTo(cx,        cy + th/4 - bh);
  ctx.lineTo(cx - bw/2, cy - bh);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill(); ctx.stroke();
}

function drawCylinder(ctx, cx, cy, rx, ry, cylH, color, cam) {
  const k = 0.5523;
  // Corps
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy);
  ctx.lineTo(cx - rx, cy - cylH);
  ctx.bezierCurveTo(cx-rx,cy-cylH-ry*k, cx-rx*k,cy-cylH-ry, cx,cy-cylH-ry);
  ctx.bezierCurveTo(cx+rx*k,cy-cylH-ry, cx+rx,cy-cylH-ry*k, cx+rx,cy-cylH);
  ctx.lineTo(cx + rx, cy);
  ctx.bezierCurveTo(cx+rx,cy+ry*k, cx+rx*k,cy+ry, cx,cy+ry);
  ctx.bezierCurveTo(cx-rx*k,cy+ry, cx-rx,cy+ry*k, cx-rx,cy);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.8; ctx.stroke();
  // Toit
  ctx.beginPath();
  ctx.moveTo(cx-rx, cy-cylH);
  ctx.bezierCurveTo(cx-rx,cy-cylH-ry*k, cx-rx*k,cy-cylH-ry, cx,cy-cylH-ry);
  ctx.bezierCurveTo(cx+rx*k,cy-cylH-ry, cx+rx,cy-cylH-ry*k, cx+rx,cy-cylH);
  ctx.bezierCurveTo(cx+rx,cy-cylH+ry*k, cx+rx*k,cy-cylH+ry, cx,cy-cylH+ry);
  ctx.bezierCurveTo(cx-rx*k,cy-cylH+ry, cx-rx,cy-cylH+ry*k, cx-rx,cy-cylH);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.stroke();
}

function drawSphere(ctx, cx, cy, r, bh, color, cam) {
  // Sphère isométrique = cercle avec ombre
  const centerY = cy - bh/2;
  const grad = ctx.createRadialGradient(cx - r*0.3, centerY - r*0.3, r*0.1, cx, centerY, r);
  grad.addColorStop(0, shadeColor(color, 40));
  grad.addColorStop(1, shadeColor(color, -40));
  ctx.beginPath();
  ctx.arc(cx, centerY, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.8; ctx.stroke();
  // Reflet
  ctx.beginPath();
  ctx.arc(cx - r*0.25, centerY - r*0.25, r*0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();
}

function drawBuildingLabel(ctx, cx, cy, bh, topOffset, col, row, def, cam) {
  if (cam.zoom <= 0.4) return;
  const lvl = state.buildingLevels[`${col},${row}`] ?? 0;
  const labelY = cy - bh - topOffset - 8 * cam.zoom;

  ctx.font = `${Math.floor(13 * cam.zoom)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.icon, cx, labelY);

  if (cam.zoom > 0.55) {
    ctx.font = `bold ${Math.floor(9 * cam.zoom)}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 2 * cam.zoom;
    ctx.strokeText(String(lvl), cx, cy - bh + 4 * cam.zoom);
    ctx.fillText(String(lvl), cx, cy - bh + 4 * cam.zoom);
  }
}

// ============================================================
// DESSIN BÂTIMENTS EN CONSTRUCTION
// ============================================================
function drawBuildingQueue(ctx) {
  const { cam } = state;
  const now = Date.now();

  for (const [key, q] of Object.entries(state.buildingQueue)) {
    const tile = state.map[q.row]?.[q.col];
    if (!tile) continue;
    const s    = tileToScreen(q.col, q.row);
    const def  = BUILDING_DEF[q.type];
    const prog = q.progress ?? 0;
    const tw   = TW * cam.zoom;
    const th   = TH * cam.zoom;
    const bh   = (q.type === 'townhall' ? 36 : q.type === 'road' ? 4 : 22) * cam.zoom;
    const cx   = s.x;
    const cy   = s.y + th - th/4;  // base au coin bas du losange
    const bw   = tw / 2;
    const r2   = Math.round(200 * (1-prog));
    const g2   = Math.round(180 * prog);
    const bodyCol = `rgba(${r2},${g2},40,0.7)`;

    if (q.type === 'warehouse_liquid') {
      // Cylindre en construction
      const rx = tw/3.5, ry = th/7, k = 0.5523;
      ctx.beginPath();
      ctx.moveTo(cx-rx,cy); ctx.lineTo(cx-rx,cy-bh);
      ctx.bezierCurveTo(cx-rx,cy-bh-ry*k,cx-rx*k,cy-bh-ry,cx,cy-bh-ry);
      ctx.bezierCurveTo(cx+rx*k,cy-bh-ry,cx+rx,cy-bh-ry*k,cx+rx,cy-bh);
      ctx.lineTo(cx+rx,cy);
      ctx.bezierCurveTo(cx+rx,cy+ry*k,cx+rx*k,cy+ry,cx,cy+ry);
      ctx.bezierCurveTo(cx-rx*k,cy+ry,cx-rx,cy+ry*k,cx-rx,cy);
      ctx.closePath();
      ctx.fillStyle = bodyCol; ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=0.5; ctx.stroke();
    } else if (q.type !== 'road') {
      // Cube en construction
      ctx.beginPath(); ctx.moveTo(cx-bw/2,cy); ctx.lineTo(cx,cy+th/4);
      ctx.lineTo(cx,cy+th/4-bh); ctx.lineTo(cx-bw/2,cy-bh); ctx.closePath();
      ctx.fillStyle=`rgba(${r2},${Math.round(g2*0.7)},20,0.6)`; ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx,cy+th/4); ctx.lineTo(cx+bw/2,cy);
      ctx.lineTo(cx+bw/2,cy-bh); ctx.lineTo(cx,cy+th/4-bh); ctx.closePath();
      ctx.fillStyle=`rgba(${r2},${Math.round(g2*0.85)},30,0.6)`; ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx,cy-bh-th/4); ctx.lineTo(cx+bw/2,cy-bh);
      ctx.lineTo(cx,cy+th/4-bh); ctx.lineTo(cx-bw/2,cy-bh); ctx.closePath();
      ctx.fillStyle=bodyCol; ctx.fill();

      // Remplissage "eau" de bas en haut
      if (prog > 0 && prog < 1) {
        const baseY  = cy + th/4;
        const topY   = cy - bh - th/4;
        const frontY = baseY - (baseY - topY) * prog;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx-bw/2,cy); ctx.lineTo(cx,cy+th/4);
        ctx.lineTo(cx,cy+th/4-bh); ctx.lineTo(cx-bw/2,cy-bh); ctx.closePath();
        ctx.moveTo(cx,cy+th/4); ctx.lineTo(cx+bw/2,cy);
        ctx.lineTo(cx+bw/2,cy-bh); ctx.lineTo(cx,cy+th/4-bh); ctx.closePath();
        ctx.moveTo(cx,cy-bh-th/4); ctx.lineTo(cx+bw/2,cy-bh);
        ctx.lineTo(cx,cy+th/4-bh); ctx.lineTo(cx-bw/2,cy-bh); ctx.closePath();
        ctx.clip();
        ctx.fillStyle = 'rgba(80,220,80,0.5)';
        ctx.fillRect(cx-tw, frontY, tw*2, baseY-frontY);
        ctx.restore();
      }
    }

    // Étincelles
    if (prog > 0 && prog < 1 && Math.random() < 0.25) {
      const frontY = (cy+th/4-bh) - ((cy+th/4-bh)-(cy-bh-th/4)) * prog;
      ctx.beginPath();
      ctx.arc(cx+(Math.random()-0.5)*bw, frontY+(Math.random()-0.5)*6*cam.zoom,
        (0.8+Math.random()*1.5)*cam.zoom, 0, Math.PI*2);
      ctx.fillStyle = Math.random()>0.5 ? '#ffee44' : '#ff9900';
      ctx.fill();
    }

    // Timer
    if (cam.zoom > 0.4 && def) {
      const remaining = Math.max(0, Math.ceil((q.duration-(now-q.startTime))/1000));
      ctx.font = `${Math.floor(13*cam.zoom)}px serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(def.icon, cx, cy-bh-14*cam.zoom);
      ctx.font=`bold ${Math.floor(9*cam.zoom)}px monospace`;
      ctx.fillStyle='#fff'; ctx.strokeStyle='rgba(0,0,0,0.8)'; ctx.lineWidth=2*cam.zoom;
      ctx.strokeText(remaining+'s',cx,cy-bh-4*cam.zoom);
      ctx.fillText(remaining+'s',cx,cy-bh-4*cam.zoom);
    }
  }
}

// ============================================================
// DESSIN CAMIONS
// ============================================================
function drawTrucks(ctx) {
  const { cam } = state;
  for (const t of Object.values(state.trucks)) {
    if (t.driver === 0) continue;
    if (t.atStop && (t.status === 'loading' || t.status === 'unloading')) continue;
    const s = {
      x: (t.x - t.y) * (TW/2) * cam.zoom + cam.x,
      y: (t.x + t.y) * (TH/2) * cam.zoom + cam.y,
    };
    const size = 14 * cam.zoom;
    ctx.font = `${Math.floor(size)}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🚛', s.x, s.y + (TH/2-4)*cam.zoom);
    if (cam.zoom > 0.4) {
      const badge = TRUCK_TYPES[t.truckType ?? 'standard']?.badge ?? '⛏️';
      ctx.font = `${Math.floor(size*0.55)}px serif`;
      ctx.fillText(badge, s.x + size*0.45, s.y + (TH/2-4)*cam.zoom - size*0.5);
    }
    // Barre cargo
    const loaded = Object.values(t.cargo).reduce((a,b)=>a+b,0);
    if (loaded > 0 && cam.zoom > 0.5) {
      const bw = 16*cam.zoom, bh2=3*cam.zoom;
      const bx = s.x - bw/2, by2 = s.y + (TH/2)*cam.zoom + 2*cam.zoom;
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(bx,by2,bw,bh2);
      ctx.fillStyle='#4fc'; ctx.fillRect(bx,by2,(loaded/t.capacity)*bw,bh2);
    }
  }
}

// Ghost preview
let _ghostTile = null;
function drawGhostPreview(ctx) {
  // Fantôme posé (en attente de confirmation)
  if (state.ghostBuilding) {
    const g     = state.ghostBuilding;
    const s     = tileToScreen(g.col, g.row);
    const { cam } = state;
    const tw    = TW * cam.zoom;
    const th    = TH * cam.zoom;
    const def   = BUILDING_DEF[g.type];
    const bh    = 22 * cam.zoom;
    const cx    = s.x;
    const cy    = s.y + th - th/4;  // base au coin bas du losange
    const bw    = tw / 2;

    // Surligner la tuile
    ctx.beginPath();
    ctx.moveTo(cx, s.y); ctx.lineTo(cx+tw/2, s.y+th/2);
    ctx.lineTo(cx, s.y+th); ctx.lineTo(cx-tw/2, s.y+th/2);
    ctx.closePath();
    ctx.fillStyle = g.valid ? 'rgba(80,220,80,0.25)' : 'rgba(220,60,60,0.25)';
    ctx.fill();
    ctx.strokeStyle = g.valid ? 'rgba(80,220,80,0.8)' : 'rgba(220,60,60,0.8)';
    ctx.lineWidth = 2; ctx.stroke();

    // Bâtiment fantôme semi-transparent
    ctx.globalAlpha = 0.5;
    drawCube(ctx, cx, cy, bw, bh, th, def?.color ?? '#888');
    ctx.globalAlpha = 1;

    // Icône
    if (cam.zoom > 0.4 && def) {
      ctx.font = `${Math.floor(14 * cam.zoom)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, cx, cy - bh - 8 * cam.zoom);
    }
    return;
  }

  // Surlignage de survol : juste une bordure dorée sur la tuile
  if (state.tool === 'build' && state.selectedBuilding && _ghostTile && !state.ghostBuilding) {
    const { col, row } = _ghostTile;
    const valid = isValidPlacement(col, row, state.selectedBuilding);
    const s   = tileToScreen(col, row);
    const { cam } = state;
    const tw = TW*cam.zoom, th = TH*cam.zoom;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y); ctx.lineTo(s.x+tw/2, s.y+th/2);
    ctx.lineTo(s.x, s.y+th); ctx.lineTo(s.x-tw/2, s.y+th/2);
    ctx.closePath();
    ctx.strokeStyle = valid ? 'rgba(240,192,64,0.8)' : 'rgba(220,60,60,0.6)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.fillStyle   = valid ? 'rgba(240,192,64,0.08)' : 'rgba(220,60,60,0.08)';
    ctx.fill();
  }
}

// Flèches d'exploration
function drawExploreArrows() {
  // Les flèches sont des éléments HTML, pas canvas
  updateExploreArrows();
}
