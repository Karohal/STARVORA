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
    icon: '🚙', name: 'Véhicule d\'Exploration',
    cost: 500, capacity: 0,
    category: 'explorer',
    color: '#406020', truckColor: '#304010',
    buildTime: 60,
    badge: '🗺️',
  },
};

// Badges visuels (camion + badge)
const TRUCK_BADGES = {
  standard:  '🚛⛏️',
  tanker:    '🚛💧',
  waste:     '🚛🗑️',
  hazmat:    '🚛☢️',
  gas_truck: '🚛🌀',
  explorer:  '🚙🗺️',
};

// Catégories acceptées par chaque entrepôt
const WAREHOUSE_CATEGORIES = {
  warehouse:        'solid',
  warehouse_liquid: 'liquid',
  warehouse_waste:  'waste',
  warehouse_hazmat: 'hazardous',
  warehouse_gas:    'gas',
};
