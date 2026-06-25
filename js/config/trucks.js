// ============================================================
// STARVORA — js/config/trucks.js
// Types de véhicules
// ============================================================

const TRUCK_TYPES = {
  standard: {
    icon: '🚛', name: 'Camion Minerais',
    cost: 100, capacity: 5,
    category: 'solid',
    color: '#c8a020', truckColor: '#c8a020',
    buildTime: 10,
    badge: '⛏️',
  },
  tanker: {
    icon: '🚛', name: 'Camion Citerne',
    cost: 120, capacity: 5,
    category: 'liquid',
    color: '#4090c0', truckColor: '#2060a0',
    buildTime: 12,
    badge: '💧',
  },
  waste: {
    icon: '🚛', name: 'Camion Déchets',
    cost: 80, capacity: 5,
    category: 'waste',
    color: '#607040', truckColor: '#304820',
    buildTime: 8,
    badge: '🗑️',
  },
  hazmat: {
    icon: '🚛', name: 'Camion Dangereux',
    cost: 200, capacity: 1,
    category: 'hazardous',
    color: '#a03020', truckColor: '#801010',
    buildTime: 20,
    badge: '☢️',
  },
  gas_truck: {
    icon: '🚛', name: 'Camion Gaz',
    cost: 250, capacity: 3,
    category: 'gas',
    color: '#204060', truckColor: '#102040',
    buildTime: 15,
    badge: '🌀',
  },
  explorer: {
    icon: '🚗', name: 'Jeep d\'Exploration',
    cost: 500, capacity: 0,
    category: 'explorer',
    color: '#406020', truckColor: '#304010',
    buildTime: 60,
    badge: '🌍',
  },
  builder: {
    icon: '🚧', name: 'Camion Constructeur',
    cost: 300, capacity: 0,
    category: 'builder',
    color: '#e0a000', truckColor: '#c08000',
    buildTime: 30,
    badge: '🏗️',
  },
};

// Badges visuels (camion + badge)
const TRUCK_BADGES = {
  standard:  '🚛⛏️',
  tanker:    '🚛💧',
  waste:     '🚛🗑️',
  hazmat:    '🚛☢️',
  gas_truck: '🚛🌀',
  explorer:  '🚗🌍',
  builder:   '🚧🏗️',
};

// Catégories acceptées par chaque entrepôt
const WAREHOUSE_CATEGORIES = {
  warehouse:        'solid',
  warehouse_liquid: 'liquid',
  warehouse_waste:  'waste',
  warehouse_hazmat: 'hazardous',
  warehouse_gas:    'gas',
  market:       'all',    // le marché accepte toutes les ressources vendables
  water_tower:  'liquid', // le château d'eau accepte les citernes d'eau potable
};

// Coûts en ressources pour passer au niveau supérieur (lvl 1 -> 2, 2 -> 3...)
// index = niveau cible (1 = passer de 0 à 1, etc.)
const TRUCK_LEVEL_RESOURCE_COST = {
  standard:  [null, { iron_r: 3 },  { iron_r: 8 },  { iron_r: 15 }],
  tanker:    [null, { iron_r: 3 },  { iron_r: 8 },  { iron_r: 15 }],
  waste:     [null, { iron_r: 3 },  { iron_r: 8 },  { iron_r: 15 }],
  hazmat:    [null, { iron_r: 5 },  { iron_r: 12 }, { iron_r: 20 }],
  gas_truck: [null, { iron_r: 5 },  { iron_r: 12 }, { iron_r: 20 }],
  explorer:  [null, { iron_r: 5 },  { iron_r: 12 }, { iron_r: 20 }],
  builder:   [null, { iron_r: 5 },  { iron_r: 12 }, { iron_r: 20 }],
};
