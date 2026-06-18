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
