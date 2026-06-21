// ============================================================
// STARVORA — js/core/state.js
// State global du jeu
// ============================================================

const state = {
  // Économie
  money:            10000,
  population:       10,
  homeless:         10,
  housed:           0,
  adults:           0,
  children:         0,
  availableWorkers: 0,

  // Carte active
  activeMap: { x: START_MAP_X, y: START_MAP_Y },

  // Maps de la planète (3x3)
  // Chaque map contient: { map[][], resources[][], buildings{}, ... }
  planet: {},

  // Données de la map active (raccourcis)
  map:       [],
  resources: [],

  // Bâtiments & niveaux (map active)
  buildings:       {},
  buildingLevels:  {},
  buildingQueue:   {},

  // Stocks internes (mines, usines)
  internalStock:  {},
  warehouseStock: {},

  // Travailleurs
  assignedWorkers: {},
  houseOccupants:  {},

  // Camions
  trucks:          {},
  truckCounter:    0,
  truckBuildQueue: {},

  // Exploration planète
  exploredMaps:    { '1,1': true },  // map de départ explorée
  explorationQueue: null,  // { mapX, mapY, startTime, duration, vehicleId }
  explorationCount: 0,     // nombre d'explorations effectuées

  // HdV
  hasTownhall: false,
  unlockedResearch: {},
  selectedTileKey: null,
  buildingOrientation: {},
  hdvStock: {
    stone: 30,
    iron:  20,
    coal:  20,
    water: 10,
  },

  // Caméra
  cam: { x: 0, y: 0, zoom: 1 },

  // UI
  tool:              'select',
  selectedBuilding:  null,
  _warehouseUpdated: null,
  _activePanel:      null,
};

// Clé d'une map dans planet
function mapKey(x, y) { return `${x},${y}`; }

// Accéder à une map de la planète
function getPlanetMap(x, y) {
  const k = mapKey(x, y);
  if (!state.planet[k]) {
    state.planet[k] = {
      map:            [],
      resources:      [],
      buildings:      {},
      buildingLevels: {},
      buildingQueue:  {},
      internalStock:  {},
      warehouseStock: {},
      assignedWorkers:{},
      houseOccupants: {},
      trucks:         {},
      truckBuildQueue:{},
      hasTownhall:    false,
    };
  }
  return state.planet[k];
}

// Charger une map comme map active
function setActiveMap(x, y) {
  // Sauvegarder l'état de la map courante dans planet
  const oldKey = mapKey(state.activeMap.x, state.activeMap.y);
  state.planet[oldKey] = {
    map:            state.map,
    resources:      state.resources,
    buildings:      state.buildings,
    buildingLevels: state.buildingLevels,
    buildingQueue:  state.buildingQueue,
    internalStock:  state.internalStock,
    warehouseStock: state.warehouseStock,
    assignedWorkers:state.assignedWorkers,
    houseOccupants: state.houseOccupants,
    trucks:         state.trucks,
    truckBuildQueue:state.truckBuildQueue,
    hasTownhall:    state.hasTownhall,
  };

  // Charger la nouvelle map
  state.activeMap = { x, y };
  const newMap = getPlanetMap(x, y);
  state.map            = newMap.map;
  state.resources      = newMap.resources;
  state.buildings      = newMap.buildings;
  state.buildingLevels = newMap.buildingLevels;
  state.buildingQueue  = newMap.buildingQueue;
  state.internalStock  = newMap.internalStock;
  state.warehouseStock = newMap.warehouseStock;
  state.assignedWorkers= newMap.assignedWorkers;
  state.houseOccupants = newMap.houseOccupants;
  state.trucks         = newMap.trucks;
  state.truckBuildQueue= newMap.truckBuildQueue;
  state.hasTownhall    = newMap.hasTownhall;

  // Recentrer caméra sur la nouvelle map
  state.cam = { x: 0, y: 0, zoom: state.cam.zoom };
  centerCamera();
}
