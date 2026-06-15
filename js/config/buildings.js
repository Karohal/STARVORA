// ============================================================
// STARVORA — js/config/buildings.js
// Base de données complète des bâtiments
// ============================================================

const BUILDING_DEF = {

  // ===== INFRASTRUCTURE =====
  townhall: {
    icon: '🏛️', name: 'Hôtel de Ville',
    cost: 0, color: '#8060a0',
    workers: 2, w: 1, h: 1,
    group: 'infrastructure',
    description: 'Centre de commandement. L\'efficacité des travailleurs affecte la vitesse de construction.',
    unlockCondition: () => true,
  },
  house: {
    icon: '🏠', name: 'Résidence',
    cost: 50, color: '#4080c0',
    workers: 0, w: 1, h: 1,
    group: 'infrastructure',
    description: 'Loge 4 habitants. +2 par niveau tous les 5 niveaux.',
    unlockCondition: (s) => s.hasTownhall,
  },
  hospital: {
    icon: '🏥', name: 'Hôpital',
    cost: 400, color: '#c04040',
    workers: 6, w: 1, h: 1,
    group: 'infrastructure',
    description: 'Augmente le taux de natalité. +2% par hôpital, +0.5% par niveau.',
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'house') ||
                            Object.values(s.buildingQueue ?? {}).some(q => q.type === 'house'),
  },
  road: {
    icon: '🛣️', name: 'Route',
    cost: 10, color: '#605040',
    workers: 0, w: 1, h: 1,
    group: 'infrastructure',
    description: 'Accélère les camions (x5).',
    unlockCondition: (s) => s.hasTownhall,
  },
  stargate: {
    icon: '🌀', name: 'Portail de Transfert',
    cost: 500, color: '#4040c0',
    workers: 2, w: 1, h: 1,
    group: 'infrastructure',
    description: 'Transfère ressources et camions vers une autre map.',
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'vehiclefactory'),
  },

  // ===== EXTRACTION =====
  mine: {
    icon: '⛏️', name: 'Mine',
    cost: 150, color: '#806040',
    workers: 4, w: 1, h: 1,
    group: 'extraction',
    description: 'Extrait minerais de fer, charbon, or, uranium, rutile, bauxite.',
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'house') ||
                            Object.values(s.buildingQueue).some(q => q.type === 'house'),
  },
  quarry: {
    icon: '🪨', name: 'Carrière',
    cost: 120, color: '#907060',
    workers: 3, w: 1, h: 1,
    group: 'extraction',
    description: 'Extrait pierre brute.',
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'house') ||
                            Object.values(s.buildingQueue).some(q => q.type === 'house'),
  },
  well: {
    icon: '💧', name: 'Puits',
    cost: 80, color: '#4090a0',
    workers: 2, w: 1, h: 1,
    group: 'extraction',
    description: 'Extrait eau brute et pétrole brut.',
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'house') ||
                            Object.values(s.buildingQueue).some(q => q.type === 'house'),
  },

  // ===== ENTREPÔTS =====
  warehouse: {
    icon: '🏪', name: 'Entrepôt',
    cost: 180, color: '#806030',
    workers: 2, w: 1, h: 1,
    group: 'storage',
    description: 'Stocke les ressources solides.',
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      ['mine','quarry','well'].includes(t)),
  },
  warehouse_liquid: {
    icon: '🛢️', name: 'Citerne',
    cost: 200, color: '#304080',
    workers: 2, w: 1, h: 1,
    group: 'storage',
    description: 'Stocke les liquides (eau, pétrole, carburant, eau potable).',
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      ['mine','quarry','well'].includes(t)),
  },
  warehouse_waste: {
    icon: '☣️', name: 'Dépôt Déchets',
    cost: 220, color: '#404820',
    workers: 2, w: 1, h: 1,
    group: 'storage',
    description: 'Stocke les déchets et incinérables.',
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      ['mine','quarry','well'].includes(t)),
  },
  warehouse_hazmat: {
    icon: '☢️', name: 'Entrepôt Dangereux',
    cost: 300, color: '#602010',
    workers: 2, w: 1, h: 1,
    group: 'storage',
    description: 'Stocke les matières dangereuses (uranium, hazmat).',
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      ['mine','quarry','well'].includes(t)),
  },
  warehouse_gas: {
    icon: '🌀', name: 'Réservoir de Gaz',
    cost: 350, color: '#204060',
    workers: 2, w: 1, h: 1,
    group: 'storage',
    description: 'Stocke le gaz. Forme sphérique pressurisée.',
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'refinery'),
  },

  // ===== USINES =====
  sorting: {
    icon: '🔻', name: 'Usine de Traitement',
    cost: 200, color: '#806020',
    workers: 5, w: 1, h: 1,
    group: 'factory',
    description: 'Traite les minerais solides bruts. Input: fer, charbon, or, uranium, rutile, bauxite.',
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      ['mine','quarry','well'].includes(t)),
  },
  crusher: {
    icon: '🪨', name: 'Concasseur',
    cost: 250, color: '#705030',
    workers: 4, w: 1, h: 1,
    group: 'factory',
    description: 'Concasse la pierre brute → pierre traitée, cristaux, gemmes.',
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'quarry'),
  },
  refinery: {
    icon: '🏭', name: 'Raffinerie',
    cost: 350, color: '#604020',
    workers: 6, w: 1, h: 1,
    group: 'factory',
    description: 'Raffine le pétrole brut → gaz, carburant, résidu.',
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'well'),
  },
  water_plant: {
    icon: '💧', name: 'Usine de Traitement de l\'Eau',
    cost: 300, color: '#204060',
    workers: 4, w: 1, h: 1,
    group: 'factory',
    description: 'Traite l\'eau brute → eau potable, calcaire.',
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'well'),
  },
  research_center: {
    icon: '🔬', name: 'Centre de Recherche Industriel',
    cost: 500, color: '#4040a0',
    workers: 8, w: 1, h: 1,
    group: 'factory',
    description: 'Débloque les usines de traitement via l'arbre de recherche.',
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      Object.keys(WAREHOUSE_TYPES ?? {}).includes(t)
    ),
  },
  vehiclefactory: {
    icon: '🏗️', name: 'Usine de Véhicules',
    cost: 300, color: '#505050',
    workers: 6, w: 1, h: 1,
    group: 'factory',
    description: 'Construit camions et véhicules d\'exploration.',
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      ['mine','quarry','well'].includes(t)),
  },
};

// ============================================================
// GROUPES DU PANEL CONSTRUCTION
// ============================================================
const BUILD_GROUPS = [
  {
    id: 'infrastructure',
    label: '🏛️ Infrastructure',
    types: ['townhall', 'house', 'road', 'hospital', 'stargate'],
  },
  {
    id: 'extraction',
    label: '⛏️ Extraction',
    types: ['mine', 'quarry', 'well'],
  },
  {
    id: 'storage',
    label: '📦 Entrepôts',
    types: ['warehouse', 'warehouse_liquid', 'warehouse_waste', 'warehouse_hazmat', 'warehouse_gas'],
  },
  {
    id: 'factory',
    label: '🏭 Usines',
    types: ['research_center', 'sorting', 'crusher', 'refinery', 'water_plant', 'vehiclefactory'],
  },
];

// ============================================================
// TEMPS DE CONSTRUCTION (secondes)
// ============================================================
const BUILD_TIME = {
  townhall:     5,
  house:        10,
  road:         3,
  hospital:     30,
  research_center: 45,
  stargate:     60,
  mine:         15,
  quarry:       15,
  well:         15,
  warehouse:    20,
  warehouse_liquid: 20,
  warehouse_waste:  20,
  warehouse_hazmat: 25,
  warehouse_gas:    30,
  sorting:      25,
  crusher:      25,
  refinery:     30,
  water_plant:  30,
  vehiclefactory: 25,
};

// ============================================================
// COÛT DE NIVEAU UP (base × 1.2^niveau)
// ============================================================
const LEVELUP_BASE_COST = {
  townhall: 50, house: 30, hospital: 80, research_center: 120,
  mine: 80, quarry: 60, well: 40,
  road: 5, stargate: 200,
  sorting: 100, crusher: 100, refinery: 150, water_plant: 120,
  warehouse: 90, warehouse_liquid: 100,
  warehouse_waste: 110, warehouse_hazmat: 150, warehouse_gas: 160,
  vehiclefactory: 150,
};

// Workers de base par bâtiment
const BASE_WORKERS = {
  townhall: 2, house: 0, road: 0, hospital: 6, research_center: 8, stargate: 2,
  mine: 4, quarry: 3, well: 2,
  sorting: 5, crusher: 4, refinery: 6, water_plant: 4,
  warehouse: 2, warehouse_liquid: 2, warehouse_waste: 2,
  warehouse_hazmat: 2, warehouse_gas: 2,
  vehiclefactory: 6,
};
