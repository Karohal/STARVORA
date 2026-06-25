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
// Surbrillance de la tuile sélectionnée (panel bâtiment ouvert)
function drawSelectedTileHighlight(ctx) {
  if (!state.selectedTileKey) return;
  const [col, row] = state.selectedTileKey.split(',').map(Number);
  const { cam } = state;
  const s  = tileToScreen(col, row);
  const tw = TW * cam.zoom;
  const th = TH * cam.zoom;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s.x,        s.y);
  ctx.lineTo(s.x + tw/2, s.y + th/2);
  ctx.lineTo(s.x,        s.y + th);
  ctx.lineTo(s.x - tw/2, s.y + th/2);
  ctx.closePath();
  ctx.strokeStyle = '#f0c040';
  ctx.lineWidth   = 2.5 * cam.zoom;
  ctx.stroke();
  ctx.restore();
}

// Dessine une voie routière traversant toute la tuile selon un axe (NS ou OE)
function drawRoadSegment(ctx, s, tw, th, orientation, cam, roadColor, dashColor) {
  const RC   = roadColor ?? '#8B6914';
  const RC2  = roadColor ?? '#8B6914';
  const DASH = dashColor ?? 'rgba(255,255,255,0.7)';
  const N = { x: s.x,        y: s.y        };
  const Sp= { x: s.x,        y: s.y + th   };
  const E = { x: s.x + tw/2, y: s.y + th/2 };
  const O = { x: s.x - tw/2, y: s.y + th/2 };
  const cy = s.y + th/2;
  const cx = s.x;
  const mid = (a, b) => ({ x: (a.x+b.x)/2, y: (a.y+b.y)/2 });

  // Croisement 4 côtés
  if (orientation === 'X') {
    const midNO = mid(N, O), midNE = mid(N, E), midOSp = mid(O, Sp), midSpE = mid(Sp, E);
    const center = { x: cx, y: cy };

    const axU = { x: midSpE.x - midNO.x, y: midSpE.y - midNO.y };
    const axLen = Math.sqrt(axU.x*axU.x + axU.y*axU.y) || 1;
    const axUN = { x: axU.x/axLen, y: axU.y/axLen };
    const axV  = { x: -axUN.y, y: axUN.x };
    const dxp  = midNE.x - midNO.x, dyp = midNE.y - midNO.y;
    const halfWidth = Math.abs(dxp*axV.x + dyp*axV.y) * 0.55 * 0.70;

    const sv = (p1, p2) => {
      const dx = p2.x-p1.x, dy = p2.y-p1.y;
      const l = Math.sqrt(dx*dx+dy*dy) || 1;
      return { x: dx/l, y: dy/l };
    };

    // Vecteur de largeur propre à chaque bras = direction du côté du losange auquel il appartient
    const arms = [
      { from: midNO,  w: sv(N, O)  },
      { from: midNE,  w: sv(N, E)  },
      { from: midOSp, w: sv(Sp, O) },  // inversé
      { from: midSpE, w: sv(E, Sp) },  // inversé
    ];

    arms.forEach(({ from, w }) => {
      ctx.beginPath();
      ctx.moveTo(from.x + w.x*halfWidth, from.y + w.y*halfWidth);
      ctx.lineTo(center.x + w.x*halfWidth, center.y + w.y*halfWidth);
      ctx.lineTo(center.x - w.x*halfWidth, center.y - w.y*halfWidth);
      ctx.lineTo(from.x - w.x*halfWidth, from.y - w.y*halfWidth);
      ctx.closePath();
      ctx.fillStyle = RC;
      ctx.fill();
    });

    // Centre : losange formé par les 4 points de jonction
    const wNO = sv(N, O), wNE = sv(N, E);
    ctx.beginPath();
    ctx.moveTo(center.x + wNO.x*halfWidth, center.y + wNO.y*halfWidth);
    ctx.lineTo(center.x + wNE.x*halfWidth, center.y + wNE.y*halfWidth);
    ctx.lineTo(center.x - wNO.x*halfWidth, center.y - wNO.y*halfWidth);
    ctx.lineTo(center.x - wNE.x*halfWidth, center.y - wNE.y*halfWidth);
    ctx.closePath();
    ctx.fillStyle = RC;
    ctx.fill();

    // Traits blancs médians
    ctx.strokeStyle = DASH;
    ctx.lineWidth   = Math.max(1, 1.2 * cam.zoom);
    ctx.setLineDash([4 * cam.zoom, 3 * cam.zoom]);
    [midNO, midNE, midOSp, midSpE].forEach(from => {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(center.x, center.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    return;
  }

  // Routes en T (4 orientations : bras manquant = NO, NE, OSp, SpE)
  if (orientation === 'TNO' || orientation === 'TNE' || orientation === 'TOSp' || orientation === 'TSpE') {
    const midNO = mid(N, O), midNE = mid(N, E), midOSp = mid(O, Sp), midSpE = mid(Sp, E);
    const center = { x: cx, y: cy };

    const axU = { x: midSpE.x - midNO.x, y: midSpE.y - midNO.y };
    const axLen = Math.sqrt(axU.x*axU.x + axU.y*axU.y) || 1;
    const axUN = { x: axU.x/axLen, y: axU.y/axLen };
    const axV  = { x: -axUN.y, y: axUN.x };
    const dxp  = midNE.x - midNO.x, dyp = midNE.y - midNO.y;
    const halfWidth = Math.abs(dxp*axV.x + dyp*axV.y) * 0.55 * 0.70;

    const sv = (p1, p2) => {
      const dx = p2.x-p1.x, dy = p2.y-p1.y;
      const l = Math.sqrt(dx*dx+dy*dy) || 1;
      return { x: dx/l, y: dy/l };
    };

    const allArms = [
      { from: midNO,  w: sv(N, O),  name: 'TNO'  },
      { from: midNE,  w: sv(N, E),  name: 'TNE'  },
      { from: midOSp, w: sv(Sp, O), name: 'TOSp' },
      { from: midSpE, w: sv(E, Sp), name: 'TSpE' },
    ];

    // Dessiner les 3 bras actifs (tout sauf celui dont le nom = orientation)
    allArms.filter(a => a.name !== orientation).forEach(({ from, w }) => {
      ctx.beginPath();
      ctx.moveTo(from.x + w.x*halfWidth, from.y + w.y*halfWidth);
      ctx.lineTo(center.x + w.x*halfWidth, center.y + w.y*halfWidth);
      ctx.lineTo(center.x - w.x*halfWidth, center.y - w.y*halfWidth);
      ctx.lineTo(from.x - w.x*halfWidth, from.y - w.y*halfWidth);
      ctx.closePath();
      ctx.fillStyle = RC;
      ctx.fill();
    });

    // Centre
    const wNO = sv(N, O), wNE = sv(N, E);
    ctx.beginPath();
    ctx.moveTo(center.x + wNO.x*halfWidth, center.y + wNO.y*halfWidth);
    ctx.lineTo(center.x + wNE.x*halfWidth, center.y + wNE.y*halfWidth);
    ctx.lineTo(center.x - wNO.x*halfWidth, center.y - wNO.y*halfWidth);
    ctx.lineTo(center.x - wNE.x*halfWidth, center.y - wNE.y*halfWidth);
    ctx.closePath();
    ctx.fillStyle = RC;
    ctx.fill();

    // Traits blancs médians
    ctx.strokeStyle = DASH;
    ctx.lineWidth   = Math.max(1, 1.2 * cam.zoom);
    ctx.setLineDash([4 * cam.zoom, 3 * cam.zoom]);
    allArms.filter(a => a.name !== orientation).forEach(({ from }) => {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(center.x, center.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    return;
  }

  // Virages 90° (4 orientations, arc rond compensé pour la perspective iso)
  if (orientation === 'NE' || orientation === 'NO' || orientation === 'SE' || orientation === 'SO') {
    const isoRatio = th / tw;

    const toIso   = (p, pivot) => ({ x: p.x - pivot.x, y: (p.y - pivot.y) / isoRatio });
    const fromIso = (p, pivot) => ({ x: p.x + pivot.x, y: p.y * isoRatio + pivot.y });

    const configs = {
      NE: { pivot: N,  sideA: [N, O], sideB: [N, E]  },
      NO: { pivot: O,  sideA: [N, O], sideB: [O, Sp] },
      SE: { pivot: E,  sideA: [N, E], sideB: [E, Sp] },
      SO: { pivot: Sp, sideA: [O, Sp],sideB: [E, Sp] },
    };
    const { pivot, sideA, sideB } = configs[orientation];
    const midA = mid(sideA[0], sideA[1]);
    const midB = mid(sideB[0], sideB[1]);

    // Largeur identique à la route droite (perpDist*0.55)
    const midNO = mid(N, O), midNE = mid(N, E), midSpE = mid(Sp, E);
    const axU = { x: midSpE.x - midNO.x, y: midSpE.y - midNO.y };
    const axLen = Math.sqrt(axU.x*axU.x + axU.y*axU.y) || 1;
    const axUN = { x: axU.x/axLen, y: axU.y/axLen };
    const axV  = { x: -axUN.y, y: axUN.x };
    const dxp  = midNE.x - midNO.x, dyp = midNE.y - midNO.y;
    const halfWidth = Math.abs(dxp*axV.x + dyp*axV.y) * 0.55;

    const midA_iso = toIso(midA, pivot);
    const midB_iso = toIso(midB, pivot);
    const rMidIso = Math.sqrt(midA_iso.x*midA_iso.x + midA_iso.y*midA_iso.y);
    const rExtIso = rMidIso + halfWidth;
    const rIntIso = rMidIso - halfWidth;

    let angA = Math.atan2(midA_iso.y, midA_iso.x);
    let angB = Math.atan2(midB_iso.y, midB_iso.x);
    let diff = angB - angA;
    if (diff > Math.PI) angB -= 2*Math.PI;
    else if (diff < -Math.PI) angB += 2*Math.PI;

    const arcPts = (r, a1, a2, steps) => {
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const a = a1 + (a2-a1)*i/steps;
        const pIso = { x: r*Math.cos(a), y: r*Math.sin(a) };
        pts.push(fromIso(pIso, pivot));
      }
      return pts;
    };

    const arcIn  = arcPts(rIntIso, angA, angB, 24);
    const arcOut = arcPts(rExtIso, angB, angA, 24);

    ctx.beginPath();
    ctx.moveTo(arcIn[0].x, arcIn[0].y);
    for (let i = 1; i < arcIn.length; i++) ctx.lineTo(arcIn[i].x, arcIn[i].y);
    for (let i = 0; i < arcOut.length; i++) ctx.lineTo(arcOut[i].x, arcOut[i].y);
    ctx.closePath();
    ctx.fillStyle = RC;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Trait blanc médian (arc à rayon moyen)
    const rMidArc = (rExtIso + rIntIso) / 2;
    const arcMid = arcPts(rMidArc, angA, angB, 24);
    ctx.strokeStyle = DASH;
    ctx.lineWidth   = Math.max(1, 1.2 * cam.zoom);
    ctx.setLineDash([4 * cam.zoom, 3 * cam.zoom]);
    ctx.beginPath();
    ctx.moveTo(arcMid[0].x, arcMid[0].y);
    for (let i = 1; i < arcMid.length; i++) ctx.lineTo(arcMid[i].x, arcMid[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  // 2 orientations distinctes : axe1 (N-O / Sp-E) ou axe2 (N-E / Sp-O)
  const isAxis1 = (orientation === 'N');
  const from = isAxis1 ? mid(N, O) : mid(N, E);
  const to   = isAxis1 ? mid(Sp, E) : mid(Sp, O);

  const ux = to.x - from.x, uy = to.y - from.y;
  const ulen = Math.sqrt(ux*ux + uy*uy) || 1;
  const uxN = ux/ulen, uyN = uy/ulen;
  const vxN = -uyN, vyN = uxN;

  // Largeur max sans dépasser : distance perpendiculaire à l'autre paire de milieux
  const otherFrom = isAxis1 ? mid(N, E) : mid(N, O);
  const dxp = otherFrom.x - from.x, dyp = otherFrom.y - from.y;
  const perpDist = Math.abs(dxp*vxN + dyp*vyN);

  const halfWidth = perpDist * 0.55 * 0.70;
  const halfLen   = ulen / 2;

  // Direction du côté du losange proche de 'from' (N-O pour axe1, N-E pour axe2)
  // Les extrémités de la route sont parallèles à ce côté, pas perpendiculaires à l'axe
  const sideRef = isAxis1 ? { x: O.x - N.x, y: O.y - N.y } : { x: E.x - N.x, y: E.y - N.y };
  const sideLen = Math.sqrt(sideRef.x*sideRef.x + sideRef.y*sideRef.y) || 1;
  const wxN = sideRef.x / sideLen, wyN = sideRef.y / sideLen;

  const centerTo   = { x: cx + uxN*halfLen, y: cy + uyN*halfLen };
  const centerFrom = { x: cx - uxN*halfLen, y: cy - uyN*halfLen };

  const p1 = { x: centerFrom.x + wxN*halfWidth, y: centerFrom.y + wyN*halfWidth };
  const p2 = { x: centerTo.x   + wxN*halfWidth, y: centerTo.y   + wyN*halfWidth };
  const p3 = { x: centerTo.x   - wxN*halfWidth, y: centerTo.y   - wyN*halfWidth };
  const p4 = { x: centerFrom.x - wxN*halfWidth, y: centerFrom.y - wyN*halfWidth };

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.closePath();
  ctx.fillStyle = RC;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.strokeStyle = DASH;
  ctx.lineWidth   = Math.max(1, 1.2 * cam.zoom);
  ctx.setLineDash([4 * cam.zoom, 3 * cam.zoom]);
  ctx.beginPath();
  ctx.moveTo(cx - uxN*halfLen, cy - uyN*halfLen);
  ctx.lineTo(cx + uxN*halfLen, cy + uyN*halfLen);
  ctx.stroke();
  ctx.setLineDash([]);
}

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
  const cy   = s.y + th/2;
  const bw   = tw / 2;

  // Sprite PNG si disponible
  if (BUILDING_SPRITES[type]) {
    // Sprites désactivés temporairement - on utilise les cubes
  }

  // Route
  if (type === 'road') {
    const orientation = state.buildingOrientation?.[`${col},${row}`] ?? 'N';
    const roadLevel = state.buildingLevels[`${col},${row}`] ?? 0;
    const roadDef   = getRoadDef(roadLevel);
    drawRoadSegment(ctx, s, tw, th, orientation, cam, roadDef.color, roadDef.dashColor);
    return;
  }

  // Citerne = cylindre
  if (type === 'warehouse_liquid') {
    drawCylinder(ctx, cx, cy, tw/3.5, th/7, bh, def.color, cam);
    drawBuildingLabel(ctx, cx, cy, bh, th/7, col, row, def, cam);
    drawTruckActivityIndicator(ctx, `${col},${row}`, cx, cy, bh, cam);
    return;
  }

  // Réservoir gaz = sphère
  if (type === 'warehouse_gas') {
    drawSphere(ctx, cx, cy, tw/3, bh, def.color, cam);
    drawBuildingLabel(ctx, cx, cy - tw/3, 0, 0, col, row, def, cam);
    drawTruckActivityIndicator(ctx, `${col},${row}`, cx, cy, bh, cam);
    return;
  }

  // Cube standard
  drawCube(ctx, cx, cy, bw, bh, th, def.color);
  drawBuildingLabel(ctx, cx, cy, bh, th/4, col, row, def, cam);
  drawTruckActivityIndicator(ctx, `${col},${row}`, cx, cy, bh, cam);
}

function drawCube(ctx, cx, cy, bw, bh, th, color) {
  // cy = centre du losange (s.y + th/2)
  // Base du cube = cy + th/4 (coin bas-centre du losange)
  // Les 4 coins de la base iso :
  //   bas-gauche : cx-bw/2, cy
  //   bas-droite : cx+bw/2, cy
  //   bas-centre : cx, cy+th/4
  //   haut-centre: cx, cy-th/4  (pas utilisé)

  // Face gauche
  ctx.beginPath();
  ctx.moveTo(cx - bw/2, cy);
  ctx.lineTo(cx,         cy + th/4);
  ctx.lineTo(cx,         cy + th/4 - bh);
  ctx.lineTo(cx - bw/2,  cy - bh);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -30);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Face droite
  ctx.beginPath();
  ctx.moveTo(cx,         cy + th/4);
  ctx.lineTo(cx + bw/2,  cy);
  ctx.lineTo(cx + bw/2,  cy - bh);
  ctx.lineTo(cx,         cy + th/4 - bh);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -15);
  ctx.fill(); ctx.stroke();

  // Toit (losange)
  ctx.beginPath();
  ctx.moveTo(cx,         cy - bh - th/4);
  ctx.lineTo(cx + bw/2,  cy - bh);
  ctx.lineTo(cx,         cy + th/4 - bh);
  ctx.lineTo(cx - bw/2,  cy - bh);
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

// Indicateur d'activité camion (chargement/déchargement) avec pulsation lente
function drawTruckActivityIndicator(ctx, key, cx, cy, bh, cam) {
  const truck = Object.values(state.trucks).find(t =>
    t.atStop && t.route[t.routeIndex % t.route.length]?.key === key &&
    (t.status === 'loading' || t.status === 'unloading')
  );
  if (!truck) return;

  const isLoading = truck.status === 'loading';
  const size  = 14 * cam.zoom;
  const ix    = cx;
  const iy    = cy - bh - 26 * cam.zoom;

  // Pulsation sur 3 secondes : opacité 0.3 → 1.0 → 0.3
  const t     = (Date.now() % 3000) / 3000;
  const pulse = 0.3 + 0.7 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2));

  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = isLoading ? '#60c060' : '#f0c040';
  ctx.lineWidth   = 2 * cam.zoom;
  ctx.lineCap     = 'round';

  // Bac en U (3 côtés : gauche, bas, droite)
  ctx.beginPath();
  ctx.moveTo(ix - size/2, iy - size/2);
  ctx.lineTo(ix - size/2, iy + size/2);
  ctx.lineTo(ix + size/2, iy + size/2);
  ctx.lineTo(ix + size/2, iy - size/2);
  ctx.stroke();

  // Flèche : vers le bas pour chargement (entre dans le bac), vers le haut pour déchargement
  ctx.beginPath();
  if (isLoading) {
    ctx.moveTo(ix, iy - size/2);
    ctx.lineTo(ix, iy + size/4);
    ctx.lineTo(ix - size/4, iy);
    ctx.moveTo(ix, iy + size/4);
    ctx.lineTo(ix + size/4, iy);
  } else {
    ctx.moveTo(ix, iy + size/2);
    ctx.lineTo(ix, iy - size/4);
    ctx.lineTo(ix - size/4, iy);
    ctx.moveTo(ix, iy - size/4);
    ctx.lineTo(ix + size/4, iy);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBuildingLabel(ctx, cx, cy, bh, topOffset, col, row, def, cam) {
  if (cam.zoom <= 0.4) return;
  const key  = `${col},${row}`;
  const lvl  = state.buildingLevels[key] ?? 0;
  const labelY = cy - bh - topOffset - 8 * cam.zoom;

  ctx.font = `${Math.floor(13 * cam.zoom)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.icon, cx, labelY);

  // Icône manque d'eau
  if (state.waterDeprivation?.[key] && def?.type !== 'water_tower') {
    const dep   = state.waterDeprivation[key];
    const days  = Math.floor((Date.now() - dep.startTime) / (state.dayDuration ?? 60000));
    if (days >= WATER_GRACE_DAYS) {
      ctx.font = `${Math.floor(11 * cam.zoom)}px serif`;
      ctx.fillText('🚱', cx + 10 * cam.zoom, labelY);
    }
  }

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
function drawWaterZones(ctx) {
  if (!state._showWaterZone) return;
  const { cam } = state;
  for (const [key, type] of Object.entries(state.buildings ?? {})) {
    if (type !== 'water_tower') continue;
    const [col, row] = key.split(',').map(Number);
    const level  = state.buildingLevels[key] ?? 0;
    const radius = waterTowerRadius(level);
    const hasWater = Object.values(state.warehouseStock?.[key] ?? {}).reduce((a,b)=>a+b,0) > 0;
    ctx.globalAlpha = 0.15;
    ctx.fillStyle   = hasWater ? '#2080ff' : '#ff4040';
    for (let r = row - radius; r <= row + radius; r++) {
      for (let c = col - radius; c <= col + radius; c++) {
        const ts = tileToScreen(c, r);
        const tw2 = TW * cam.zoom, th2 = TH * cam.zoom;
        ctx.beginPath();
        ctx.moveTo(ts.x, ts.y);
        ctx.lineTo(ts.x + tw2/2, ts.y + th2/2);
        ctx.lineTo(ts.x, ts.y + th2);
        ctx.lineTo(ts.x - tw2/2, ts.y + th2/2);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
window.drawWaterZones = drawWaterZones;

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
    const cy   = s.y + th/2;
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
    if (t.atStop && (t.status === 'loading' || t.status === 'unloading') && t.route.length > 0) continue;
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
    const cy   = s.y + th/2;
    const bw    = tw / 2;

    // Surligner la tuile
    ctx.beginPath();
    ctx.moveTo(s.x,         s.y);
    ctx.lineTo(s.x + tw/2,  s.y + th/2);
    ctx.lineTo(s.x,         s.y + th);
    ctx.lineTo(s.x - tw/2,  s.y + th/2);
    ctx.closePath();
    ctx.fillStyle = g.valid ? 'rgba(80,220,80,0.25)' : 'rgba(220,60,60,0.25)';
    ctx.fill();
    ctx.strokeStyle = g.valid ? 'rgba(80,220,80,0.8)' : 'rgba(220,60,60,0.8)';
    ctx.lineWidth = 2; ctx.stroke();

    // Zone de distribution fantôme pour château d'eau
    if (g.type === 'water_tower') {
      const radius = waterTowerRadius(0);
      const { cam } = state;
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#2080ff';
      for (let r = g.row - radius; r <= g.row + radius; r++) {
        for (let c = g.col - radius; c <= g.col + radius; c++) {
          if (c === g.col && r === g.row) continue;
          const ts = tileToScreen(c, r);
          const tw2 = TW * cam.zoom, th2 = TH * cam.zoom;
          ctx.beginPath();
          ctx.moveTo(ts.x, ts.y);
          ctx.lineTo(ts.x + tw2/2, ts.y + th2/2);
          ctx.lineTo(ts.x, ts.y + th2);
          ctx.lineTo(ts.x - tw2/2, ts.y + th2/2);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    // Bâtiment fantôme semi-transparent
    ctx.globalAlpha = 0.5;
    if (g.type === 'road') {
      drawRoadSegment(ctx, s, tw, th, g.orientation ?? 'N', cam);
    } else {
      drawCube(ctx, cx, cy, bw, bh, th, def?.color ?? '#888');
    }
    ctx.globalAlpha = 1;

    // Icône
    if (cam.zoom > 0.4 && def && g.type !== 'road') {
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

// ============================================================
// SPRITES PNG — chargement au démarrage
// ============================================================
const BUILDING_SPRITES = {};
const SPRITE_FILES = {
  townhall: 'assets/buildings/townhall.png',
};

function loadBuildingSprites() {
  for (const [type, src] of Object.entries(SPRITE_FILES)) {
    const img = new Image();
    img.onload = () => { BUILDING_SPRITES[type] = img; };
    img.src = src;
  }
}
loadBuildingSprites();

window.resizeCanvas  = resizeCanvas;
window.centerCamera  = centerCamera;
window.drawFrame_start = drawFrame_start;
