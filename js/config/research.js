// ============================================================
// STARVORA — js/config/research.js
// Catégories de recherche civiles et militaires
// ============================================================

const RESEARCH_CATEGORIES = {
  civil: {
    label: 'Civiles',
    icon: '🔬',
    subcategories: [
      { id: 'aeronautique', label: 'Aéronautique' },
      { id: 'energie',      label: 'Énergie' },
      { id: 'industrie',    label: 'Industrie' },
      { id: 'infrastructure', label: 'Infrastructure' },
      { id: 'informatique', label: 'Informatique' },
      { id: 'medical',      label: 'Médical' },
      { id: 'transport',    label: 'Transport' },
    ],
  },
  military: {
    label: 'Militaires',
    icon: '⚔️',
    subcategories: [
      { id: 'aeronautique', label: 'Aéronautique' },
      { id: 'energie',      label: 'Énergie' },
      { id: 'industrie',    label: 'Industrie' },
      { id: 'informatique', label: 'Informatique' },
      { id: 'transport',    label: 'Transport' },
      { id: 'troupe',       label: 'Troupe' },
    ],
  },
};

// Recherches par sous-catégorie : "civil.industrie", "military.industrie", etc.
const RESEARCH_ITEMS = {
  'civil.industrie': [
    { id: 'sorting_unlock',     label: 'Usine de traitement', cost: 300,  resources: { stone: 10 } },
    { id: 'crusher_unlock',     label: 'Concasseur',          cost: 500,  resources: { stone: 20 } },
    { id: 'refinery_unlock',    label: 'Raffinerie',          cost: 800,  resources: { iron_r: 30 } },
    { id: 'water_plant_unlock', label: "Usine d'eau",         cost: 600,  resources: { stone: 15 } },
    { id: 'forge_unlock',       label: 'Usine de forge',      cost: 1200, resources: { iron_r: 50, coal_r: 30 } },
    { id: 'metallurgy_unlock',  label: 'Usine métallurgique', cost: 1500, resources: { iron_r: 60, coal_r: 40 } },
  ],
  'civil.infrastructure': [
    { id: 'hospital_unlock',         label: 'Hôpital',              cost: 600,  resources: { stone: 10, water_r: 5 } },
    { id: 'warehouse_liquid_unlock', label: 'Citerne',              cost: 400,  resources: { stone: 8 } },
    { id: 'warehouse_waste_unlock',  label: 'Dépôt déchets',        cost: 400,  resources: { stone: 8 } },
    { id: 'warehouse_hazmat_unlock', label: 'Entrepôt dangereux',   cost: 700,  resources: { iron_r: 10 } },
    { id: 'warehouse_gas_unlock',    label: 'Réservoir gaz',        cost: 800,  resources: { iron_r: 12 } },
    { id: 'stargate_unlock',         label: 'Portail Stargate',     cost: 2000, resources: { iron_r: 50, coal_r: 30 } },
  ],
};
