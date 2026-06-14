// ============================================================
// STARVORA — js/config/resources.js
// Base de données complète des ressources
// ============================================================

// Catégories de stockage
const RESOURCE_CATEGORY = {
  // Solides bruts
  iron:         'solid',
  coal:         'solid',
  stone:        'solid',
  gold_ore:     'solid',
  uranium_ore:  'solid',
  rutile_ore:   'solid',
  bauxite_ore:  'solid',
  // Solides traités
  iron_r:       'solid',   // Fer Brut
  coal_r:       'solid',   // Charbon Brut
  stone_r:      'solid',   // Pierre Traitée
  gold:         'solid',   // Or
  titanium:     'solid',   // Titane
  aluminum:     'solid',   // Aluminium
  silicon:      'solid',   // Silicium
  sand:         'solid',   // Sable
  limestone:    'solid',   // Calcaire
  crystal:      'solid',   // Cristal de Roche
  gem:          'solid',   // Pierres Précieuses
  gravel:       'solid',   // Gravats
  residue:      'solid',   // Résidu pétrolier (déchet réutilisable)
  // Liquides bruts
  water:        'liquid',
  oil:          'liquid',
  // Liquides traités
  water_r:      'liquid',  // Eau Potable
  fuel:         'liquid',  // Carburant
  gas:          'gas',     // Gaz (entrepôt sphérique)
  // Déchets
  waste:        'waste',
  incin:        'waste',
  // Dangereux
  uranium:      'hazardous',
  hazardous:    'hazardous',
};

// Noms affichés
const RESOURCE_LABELS = {
  // Bruts
  iron:         'Minerais de Fer',
  coal:         'Minerais de Charbon',
  stone:        'Pierre Brute',
  water:        'Eau Brute',
  oil:          'Pétrole Brut',
  gold_ore:     'Minerais d\'Or',
  uranium_ore:  'Minerais d\'Uranium',
  rutile_ore:   'Minerais de Rutile',
  bauxite_ore:  'Minerais de Bauxite',
  // Traités solides
  iron_r:       'Fer Brut',
  coal_r:       'Charbon Brut',
  stone_r:      'Pierre Traitée',
  gold:         'Or',
  titanium:     'Titane',
  aluminum:     'Aluminium',
  silicon:      'Silicium',
  sand:         'Sable',
  limestone:    'Calcaire',
  crystal:      'Cristal de Roche',
  gem:          'Pierres Précieuses',
  gravel:       'Gravats',
  residue:      'Résidu Pétrolier',
  // Traités liquides
  water_r:      'Eau Potable',
  fuel:         'Carburant',
  gas:          'Gaz',
  // Déchets
  waste:        'Déchets',
  incin:        'Incinérable',
  // Dangereux
  uranium:      'Uranium',
  hazardous:    'Matière Dangereuse',
};

// Icônes des ressources
const RESOURCE_ICONS = {
  iron:         '⛏️',
  coal:         '⛏️',
  stone:        '🪨',
  water:        '💧',
  oil:          '🛢️',
  gold_ore:     '✨',
  uranium_ore:  '☢️',
  rutile_ore:   '🔩',
  bauxite_ore:  '🧱',
  iron_r:       '🔩',
  coal_r:       '🪨',
  stone_r:      '🧱',
  gold:         '🥇',
  titanium:     '⚙️',
  aluminum:     '🔧',
  silicon:      '💎',
  sand:         '🏖️',
  limestone:    '🧱',
  crystal:      '💎',
  gem:          '💍',
  gravel:       '🪨',
  residue:      '🟫',
  water_r:      '💧',
  fuel:         '⛽',
  gas:          '🌀',
  waste:        '🗑️',
  incin:        '🔥',
  uranium:      '☢️',
  hazardous:    '⚠️',
};

// ============================================================
// RECETTES DE PRODUCTION
// Chaque usine a une liste de recettes input → outputs
// ============================================================
const PRODUCTION_RECIPES = {

  // Usine de Traitement (solides bruts)
  sorting: {
    interval: (level) => Math.max(10000, 60000 - Math.floor(level / 5) * 1000),
    inputCapacity:  (level) => 5  + Math.floor(level / 5) * 2,
    outputCapacity: (level) => 15 + Math.floor(level / 5) * 2,
    recipes: [
      {
        input:  'iron',
        amount: 1,
        outputs: [
          { resource: 'iron_r',  pct: 0.30 },
          { resource: 'stone',   pct: 0.20 },
          { resource: 'waste',   pct: 0.50 },
        ],
      },
      {
        input:  'coal',
        amount: 1,
        outputs: [
          { resource: 'coal_r',  pct: 0.30 },
          { resource: 'stone',   pct: 0.20 },
          { resource: 'waste',   pct: 0.50 },
        ],
      },
      {
        input:  'gold_ore',
        amount: 1,
        outputs: [
          { resource: 'gold',    pct: 0.05 },
          { resource: 'stone',   pct: 0.60 },
          { resource: 'waste',   pct: 0.25 },
          { resource: 'gravel',  pct: 0.10 },
        ],
      },
      {
        input:  'uranium_ore',
        amount: 1,
        outputs: [
          { resource: 'uranium', pct: 0.02 },
          { resource: 'stone',   pct: 0.60 },
          { resource: 'waste',   pct: 0.38 },
        ],
      },
      {
        input:  'rutile_ore',
        amount: 1,
        outputs: [
          { resource: 'titanium', pct: 0.20 },
          { resource: 'sand',     pct: 0.30 },
          { resource: 'waste',    pct: 0.50 },
        ],
      },
      {
        input:  'bauxite_ore',
        amount: 1,
        outputs: [
          { resource: 'aluminum', pct: 0.20 },
          { resource: 'stone',    pct: 0.55 },
          { resource: 'waste',    pct: 0.20 },
          { resource: 'silicon',  pct: 0.05 },
        ],
      },
    ],
  },

  // Concasseur (pierre brute)
  crusher: {
    interval: (level) => Math.max(10000, 60000 - Math.floor(level / 5) * 1000),
    inputCapacity:  (level) => 5  + Math.floor(level / 5) * 2,
    outputCapacity: (level) => 15 + Math.floor(level / 5) * 2,
    recipes: [
      {
        input:  'stone',
        amount: 1,
        outputs: [
          { resource: 'stone_r', pct: 0.50 },
          { resource: 'waste',   pct: 0.30 },
          { resource: 'crystal', pct: 0.15 },
          { resource: 'gem',     pct: 0.05 },
        ],
      },
    ],
  },

  // Raffinerie (liquides)
  refinery: {
    interval: (level) => Math.max(10000, 60000 - Math.floor(level / 5) * 1000),
    inputCapacity:  (level) => 5  + Math.floor(level / 5) * 2,
    outputCapacity: (level) => 15 + Math.floor(level / 5) * 2,
    recipes: [
      {
        input:  'oil',
        amount: 1,
        outputs: [
          { resource: 'gas',     pct: 0.20 },
          { resource: 'fuel',    pct: 0.30 },
          { resource: 'residue', pct: 0.30 },
          { resource: 'waste',   pct: 0.20 },
        ],
      },
    ],
  },

  // Usine de traitement de l'eau
  water_plant: {
    interval: (level) => Math.max(10000, 60000 - Math.floor(level / 5) * 1000),
    inputCapacity:  (level) => 5  + Math.floor(level / 5) * 2,
    outputCapacity: (level) => 15 + Math.floor(level / 5) * 2,
    recipes: [
      {
        input:  'water',
        amount: 1,
        outputs: [
          { resource: 'water_r',  pct: 0.50 },
          { resource: 'limestone',pct: 0.20 },
          { resource: 'waste',    pct: 0.30 },
        ],
      },
    ],
  },

};

// ============================================================
// RESSOURCES PAR TYPE D'EXTRACTEUR
// ============================================================
const EXTRACTOR_RESOURCES = {
  mine:   ['iron', 'coal', 'gold_ore', 'uranium_ore', 'rutile_ore', 'bauxite_ore'],
  quarry: ['stone'],
  well:   ['oil', 'water'],
};

// Ressources acceptées par chaque type d'usine (input)
const FACTORY_INPUT = {
  sorting:    ['iron', 'coal', 'gold_ore', 'uranium_ore', 'rutile_ore', 'bauxite_ore'],
  crusher:    ['stone'],
  refinery:   ['oil'],
  water_plant:['water'],
};

// Type de stockage accepté par chaque entrepôt
const WAREHOUSE_TYPES = {
  warehouse:        { category: 'solid',    label: 'Entrepôt'            },
  warehouse_liquid: { category: 'liquid',   label: 'Citerne'             },
  warehouse_waste:  { category: 'waste',    label: 'Entrepôt Déchets'    },
  warehouse_hazmat: { category: 'hazardous',label: 'Entrepôt Dangereux'  },
  warehouse_gas:    { category: 'gas',      label: 'Réservoir de Gaz'    },
};

// ============================================================
// RESSOURCES DE LA MAP DE DÉPART (garanties)
// ============================================================
const STARTING_MAP_RESOURCES = [
  { type: 'stone', min: 1, max: 2 },
  { type: 'iron',  min: 1, max: 2 },
  { type: 'coal',  min: 1, max: 2 },
  { type: 'oil',   min: 1, max: 1 },
  { type: 'water', min: 1, max: 2 },
];

// Ressources des maps secondaires (probabilités)
const SECONDARY_MAP_RESOURCES = [
  { type: 'water',       chance: 0.50, min: 1, max: 2 },
  { type: 'oil',         chance: 0.20, min: 1, max: 1 },
  { type: 'coal',        chance: 0.15, min: 1, max: 2 },
  { type: 'iron',        chance: 0.20, min: 1, max: 2 },
  { type: 'stone',       chance: 0.50, min: 1, max: 2 },
  { type: 'gold_ore',    chance: 0.05, min: 1, max: 1 },
  { type: 'uranium_ore', chance: 0.01, min: 1, max: 1 },
  { type: 'rutile_ore',  chance: 0.10, min: 1, max: 2 },
  { type: 'bauxite_ore', chance: 0.15, min: 1, max: 2 },
];
