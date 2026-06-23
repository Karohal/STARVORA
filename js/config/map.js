// ============================================================
// STARVORA — js/config/map.js
// Configuration carte, planète, exploration
// ============================================================

// Dimensions
const COLS        = 25;
const ROWS        = 25;
const TW          = 64;   // largeur tuile
const TH          = 32;   // hauteur tuile

// Grille planète 3x3 (9 maps)
const PLANET_COLS = 3;
const PLANET_ROWS = 3;
const START_MAP_X = 1;  // map de départ = centre
const START_MAP_Y = 1;

// Temps d'exploration (ms) selon ordre de découverte
// 1er: 5min, 2ème: 10min, 3ème: 20min, 4ème: 40min...
function explorationTime(discoveryOrder) {
  if (discoveryOrder <= 0) return 0;
  return 5 * 60 * 1000 * Math.pow(2, discoveryOrder - 1);
}

// Terrains
const TERRAIN_TYPES = {
  grass:    { color: '#3a5a2a', label: 'Plaine'    },
  dirt:     { color: '#6a4a2a', label: 'Terre'     },
  sand:     { color: '#a09060', label: 'Sable'     },
  rock:     { color: '#505050', label: 'Roche'     },
  mountain: { color: '#404040', label: 'Montagne'  },
  water:    { color: '#204060', label: 'Eau'       },
};

// Couleurs des ressources sur la carte
const RESOURCE_COLORS = {
  iron:        '#8b4513',
  coal:        '#2a2a2a',
  stone:       '#808080',
  water:       '#4090c0',
  oil:         '#1a1a1a',
  gold_ore:    '#ffd700',
  uranium_ore: '#7fff00',
  rutile_ore:  '#ff6347',
  bauxite_ore: '#cd853f',
};

// Directions d'exploration (flèches)
const EXPLORE_DIRECTIONS = [
  { id: 'north', label: '↑', dx:  0, dy: -1, pos: 'top'    },
  { id: 'south', label: '↓', dx:  0, dy:  1, pos: 'bottom' },
  { id: 'west',  label: '←', dx: -1, dy:  0, pos: 'left'   },
  { id: 'east',  label: '→', dx:  1, dy:  0, pos: 'right'  },
];

// ============================================================
// GÉNÉRATION DE CARTE
// ============================================================

function generateTerrain(cols, rows, isStartMap, mapX, mapY) {
  const map = [];
  for (let r = 0; r < rows; r++) {
    map[r] = [];
    for (let c = 0; c < cols; c++) {
      // Montagnes sur les bords non-explorables
      const onEdge = (c === 0 || c === cols-1 || r === 0 || r === rows-1);
      const neighborUnexplored = onEdge && isBorderUnexplorable(c, r, cols, rows, mapX, mapY);

      if (neighborUnexplored) {
        map[r][c] = { terrain: 'mountain', elevation: 3 };
      } else {
        const noise = Math.random();
        let terrain, elevation;
        if (noise < 0.05)      { terrain = 'water';    elevation = 0; }
        else if (noise < 0.15) { terrain = 'sand';     elevation = 0.5; }
        else if (noise < 0.55) { terrain = 'grass';    elevation = 1; }
        else if (noise < 0.75) { terrain = 'dirt';     elevation = 1.5; }
        else if (noise < 0.90) { terrain = 'rock';     elevation = 2; }
        else                   { terrain = 'mountain'; elevation = 3; }
        map[r][c] = { terrain, elevation };
      }
    }
  }

  // Sur la map de départ : garantir entre 1 et 3 cases d'eau
  if (isStartMap) {
    const waterCells = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (map[r][c].terrain === 'water') waterCells.push([r, c]);

    if (waterCells.length === 0) {
      // Forcer 1 à 3 cases d'eau sur des cases grass/dirt intérieures
      const target = 1 + Math.floor(Math.random() * 3);
      const candidates = [];
      for (let r = 2; r < rows-2; r++)
        for (let c = 2; c < cols-2; c++)
          if (map[r][c].terrain === 'grass' || map[r][c].terrain === 'dirt')
            candidates.push([r, c]);
      // Mélanger et prendre les premiers
      candidates.sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(target, candidates.length); i++) {
        const [r, c] = candidates[i];
        map[r][c] = { terrain: 'water', elevation: 0 };
      }
    } else if (waterCells.length > 3) {
      // Trop d'eau : convertir le surplus en grass
      waterCells.sort(() => Math.random() - 0.5);
      for (let i = 3; i < waterCells.length; i++) {
        const [r, c] = waterCells[i];
        map[r][c] = { terrain: 'grass', elevation: 1 };
      }
    }
  }

  return map;
}

// Détermine si un bord de map est inexplorable
// (c-à-d qu'il n'y a pas de map adjacente explorée dans cette direction)
function isBorderUnexplorable(c, r, cols, rows, mapX, mapY) {
  if (r === 0      && mapY === 0)            return true;
  if (r === rows-1 && mapY === PLANET_ROWS-1) return true;
  if (c === 0      && mapX === 0)            return true;
  if (c === cols-1 && mapX === PLANET_COLS-1) return true;
  return false;
}

// Placer les ressources sur la carte
function placeResources(map, resourceDefs, cols, rows) {
  const resources = Array.from({ length: rows }, () => Array(cols).fill(null));

  for (const def of resourceDefs) {
    const count = def.min + Math.floor(Math.random() * (def.max - def.min + 1));
    let placed = 0;
    let attempts = 0;

    while (placed < count && attempts < 200) {
      attempts++;
      // Éviter les bords (2 tuiles) et les montagnes
      const c = 2 + Math.floor(Math.random() * (cols - 4));
      const r = 2 + Math.floor(Math.random() * (rows - 4));

      if (map[r][c].terrain === 'mountain') continue;
      if (map[r][c].terrain === 'water')    continue;
      if (resources[r][c] !== null)          continue;

      // Placer 1 à 3 tuiles de ressource groupées
      const groupSize = 1 + Math.floor(Math.random() * 3);
      for (let g = 0; g < groupSize; g++) {
        const gc = Math.max(2, Math.min(cols-3, c + Math.floor(Math.random() * 3) - 1));
        const gr = Math.max(2, Math.min(rows-3, r + Math.floor(Math.random() * 3) - 1));
        if (map[gr][gc].terrain !== 'mountain' && map[gr][gc].terrain !== 'water') {
          resources[gr][gc] = def.type;
        }
      }
      placed++;
    }
  }

  return resources;
}
