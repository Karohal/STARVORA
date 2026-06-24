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
    info: "<p>L'<strong style='color:var(--gold)'>Hôtel de Ville</strong> est le cœur de votre colonie. Sans lui, rien ne peut être construit.</p>"
      + "<div style='border-left:2px solid var(--gold);padding-left:10px;margin-top:10px'>"
      + "<div style='color:var(--gold);font-size:0.7rem;letter-spacing:0.1em;margin-bottom:4px'>⚙️ FONCTIONNEMENT</div>"
      + "<p>Assignez des travailleurs pour accélérer la vitesse de construction de tous vos bâtiments.</p>"
      + "<p style='margin-top:6px'>0 travailleur → construction <strong style='color:var(--error)'>bloquée</strong><br>"
      + "50% → vitesse <strong style='color:var(--gold)'>normale</strong><br>"
      + "100% → vitesse <strong style='color:var(--success)'>maximale</strong></p></div>"
      + "<div style='border-left:2px solid var(--cyan);padding-left:10px;margin-top:10px'>"
      + "<div style='color:var(--cyan);font-size:0.7rem;letter-spacing:0.1em;margin-bottom:4px'>🔓 DÉBLOCAGE PROGRESSIF</div>"
      + "<p>🏛️ HdV → 🏠 Résidences + 🛣️ Routes<br>"
      + "🏠 Résidence → ⛏️ Mines + 🪨 Carrières + 💧 Puits<br>"
      + "⛏️ Extracteur → 📦 Entrepôts<br>"
      + "📦 Entrepôt → 🔬 Centre de Recherche<br>"
      + "🔬 Recherche → 🏭 Toutes les usines</p></div>"
      + "<p style='margin-top:10px;color:var(--muted);font-size:0.68rem'>Votre HdV contient des ressources de départ (visibles dans son panel) pour vous aider à démarrer.</p>",
    unlockCondition: () => true,
  },
  house: {
    icon: '🏠', name: 'Résidence',
    cost: 50, color: '#4080c0',
    workers: 0, w: 1, h: 1,
    group: 'infrastructure',
    description: 'Loge 4 habitants. +2 par niveau tous les 5 niveaux.',

    info: "<p>La <strong style='color:var(--gold)'>Résidence</strong> loge vos habitants.</p>"
      + "<p style='margin-top:8px'>Chaque résidence accueille <strong>4 habitants</strong> de base (+2 par tranche de 5 niveaux).</p>"
      + "<p style='margin-top:8px'>2 adultes dans une même résidence ont une chance de donner naissance à un enfant toutes les 9 minutes de jeu. Les enfants deviennent adultes à 18 ans (18 minutes de jeu) et peuvent alors travailler.</p>"
      + "<p style='margin-top:8px;color:var(--muted);font-size:0.68rem'>Astuce : améliorez vos hôpitaux pour augmenter le taux de natalité.</p>",
    unlockCondition: (s) => s.hasTownhall,
  },
  hospital: {
    icon: '🏥', name: 'Hôpital',
    cost: 400, color: '#c04040',
    workers: 6, w: 1, h: 1,
    group: 'infrastructure',
    description: 'Augmente le taux de natalité. +2% par hôpital, +0.5% par niveau.',

    info: "<p>L'<strong style='color:var(--gold)'>Hôpital</strong> augmente le taux de natalité global de votre colonie.</p>"
      + "<p style='margin-top:8px'>Chaque hôpital actif (avec des travailleurs assignés) apporte <strong>+2%</strong> de natalité, plus <strong>+0.5%</strong> par niveau.</p>"
      + "<p style='margin-top:8px;color:var(--muted);font-size:0.68rem'>Un hôpital sans travailleur n'apporte aucun bonus.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'research_center'),
  },
  road: {
    icon: '🛣️', name: 'Route',
    cost: 10, color: '#605040',
    workers: 0, w: 1, h: 1,
    group: 'infrastructure',
    description: 'Accélère les camions (x5).',

    info: "<p>La <strong style='color:var(--gold)'>Route</strong> accélère vos camions sur le trajet.</p>"
      + "<p style='margin-top:8px'>Construisez des routes entre vos extracteurs, usines et entrepôts pour optimiser votre logistique.</p>",
    unlockCondition: (s) => s.hasTownhall,
  },
  stargate: {
    icon: '🌀', name: 'Portail de Transfert',
    cost: 500, color: '#4040c0',
    workers: 2, w: 1, h: 1,
    group: 'infrastructure',
    description: 'Transfère ressources et camions vers une autre map.',

    info: "<p>Le <strong style='color:var(--gold)'>Portail de Transfert</strong> permet d'échanger ressources et véhicules entre deux maps.</p>"
      + "<p style='margin-top:8px;color:var(--muted);font-size:0.68rem'>Fonctionnalité en cours de développement.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'vehiclefactory'),
  },

  // ===== EXTRACTION =====
  mine: {
    icon: '⛏️', name: 'Mine',
    cost: 150, color: '#806040',
    workers: 4, w: 1, h: 1,
    group: 'extraction',
    description: 'Extrait minerais de fer, charbon, or, uranium, rutile, bauxite.',

    info: "<p>La <strong style='color:var(--gold)'>Mine</strong> extrait des minerais bruts du sol.</p>"
      + "<p style='margin-top:8px'>Elle ne peut être posée que sur une tuile contenant du <strong>Minerai de Fer</strong>, de <strong>Charbon</strong>, d'<strong>Or</strong>, d'<strong>Uranium</strong>, de <strong>Rutile</strong> ou de <strong>Bauxite</strong>.</p>"
      + "<p style='margin-top:8px'>Assignez des travailleurs pour démarrer l'extraction. Les minerais sont stockés dans son entrepôt interne, à récupérer par camion.</p>"
      + "<p style='margin-top:8px;color:var(--muted);font-size:0.68rem'>Les minerais bruts doivent être traités dans une usine pour devenir utilisables.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'house') ||
                            Object.values(s.buildingQueue).some(q => q.type === 'house'),
  },
  quarry: {
    icon: '🪨', name: 'Carrière',
    cost: 120, color: '#907060',
    workers: 3, w: 1, h: 1,
    group: 'extraction',
    description: 'Extrait pierre brute.',

    info: "<p>La <strong style='color:var(--gold)'>Carrière</strong> extrait de la pierre brute.</p>"
      + "<p style='margin-top:8px'>Elle ne peut être posée que sur une tuile de <strong>Pierre Brute</strong>.</p>"
      + "<p style='margin-top:8px'>La pierre brute doit être envoyée vers un <strong>Concasseur</strong> pour être transformée en pierre traitée, cristaux et pierres précieuses.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'house') ||
                            Object.values(s.buildingQueue).some(q => q.type === 'house'),
  },
  well: {
    icon: '💧', name: 'Puits',
    cost: 80, color: '#4090a0',
    workers: 2, w: 1, h: 1,
    group: 'extraction',
    description: 'Extrait eau brute et pétrole brut.',

    info: "<p>Le <strong style='color:var(--gold)'>Puits</strong> extrait des liquides bruts.</p>"
      + "<p style='margin-top:8px'>Il ne peut être posé que sur une tuile d'<strong>Eau Brute</strong> ou de <strong>Pétrole Brut</strong>.</p>"
      + "<p style='margin-top:8px'>L'eau brute doit aller vers l'<strong>Usine de Traitement de l'Eau</strong>, le pétrole vers la <strong>Raffinerie</strong>.</p>",
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

    info: "<p>L'<strong style='color:var(--gold)'>Entrepôt</strong> stocke les ressources <strong>solides</strong> uniquement.</p>"
      + "<p style='margin-top:8px'>Seuls les camions transportant des solides (minerais, pierre, gravats...) peuvent y décharger.</p>"
      + "<p style='margin-top:8px;color:var(--muted);font-size:0.68rem'>Les liquides, déchets et matières dangereuses nécessitent leurs propres entrepôts.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      ['mine','quarry','well'].includes(t)),
  },
  warehouse_liquid: {
    icon: '🛢️', name: 'Citerne',
    cost: 200, color: '#304080',
    workers: 2, w: 1, h: 1,
    group: 'storage',
    description: 'Stocke les liquides (eau, pétrole, carburant, eau potable).',

    info: "<p>La <strong style='color:var(--gold)'>Citerne</strong> stocke uniquement les <strong>liquides</strong> (eau, pétrole, carburant...).</p>"
      + "<p style='margin-top:8px'>Sa forme cylindrique est spécialement conçue pour le stockage de fluides sous pression.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      ['mine','quarry','well'].includes(t)),
  },
  warehouse_waste: {
    icon: '☣️', name: 'Dépôt Déchets',
    cost: 220, color: '#404820',
    workers: 2, w: 1, h: 1,
    group: 'storage',
    description: 'Stocke les déchets et incinérables.',

    info: "<p>Le <strong style='color:var(--gold)'>Dépôt Déchets</strong> stocke les déchets issus du traitement des ressources.</p>"
      + "<p style='margin-top:8px'>Pensez à vider régulièrement vos usines vers ce dépôt pour ne pas bloquer la production.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      ['mine','quarry','well'].includes(t)),
  },
  warehouse_hazmat: {
    icon: '☢️', name: 'Entrepôt Dangereux',
    cost: 300, color: '#602010',
    workers: 2, w: 1, h: 1,
    group: 'storage',
    description: 'Stocke les matières dangereuses (uranium, hazmat).',

    info: "<p>L'<strong style='color:var(--gold)'>Entrepôt Dangereux</strong> stocke les matières radioactives ou toxiques (uranium...).</p>"
      + "<p style='margin-top:8px;color:var(--error)'>⚠️ Manipulez ces matériaux avec précaution — seul le Camion Dangereux peut les transporter.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      ['mine','quarry','well'].includes(t)),
  },
  warehouse_gas: {
    icon: '🌀', name: 'Réservoir de Gaz',
    cost: 350, color: '#204060',
    workers: 2, w: 1, h: 1,
    group: 'storage',
    description: 'Stocke le gaz. Forme sphérique pressurisée.',

    info: "<p>Le <strong style='color:var(--gold)'>Réservoir de Gaz</strong> stocke le gaz extrait lors du raffinage du pétrole.</p>"
      + "<p style='margin-top:8px'>Sa forme sphérique résiste à la pression interne du gaz stocké.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'refinery'),
  },

  // ===== USINES =====
  sorting: {
    icon: '🔻', name: 'Usine de Traitement',
    cost: 200, color: '#806020',
    workers: 5, w: 1, h: 1,
    group: 'factory',
    description: 'Traite les minerais solides bruts. Input: fer, charbon, or, uranium, rutile, bauxite.',

    info: "<p>L'<strong style='color:var(--gold)'>Usine de Traitement</strong> transforme les minerais bruts en ressources utilisables.</p>"
      + "<p style='margin-top:8px'>Elle dispose de deux quais : un quai de <strong>déchargement</strong> (input) où les camions déposent les minerais bruts, et un quai de <strong>chargement</strong> (output) où ils récupèrent les ressources traitées.</p>"
      + "<p style='margin-top:8px'>Rendement de base : <strong>30%</strong> ressource utile, <strong>50%</strong> gravats, <strong>20%</strong> déchets. Le niveau améliore ce rendement.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      ['mine','quarry','well'].includes(t)),
  },
  crusher: {
    icon: '🪨', name: 'Concasseur',
    cost: 250, color: '#705030',
    workers: 4, w: 1, h: 1,
    group: 'factory',
    description: 'Concasse la pierre brute → pierre traitée, cristaux, gemmes.',

    info: "<p>Le <strong style='color:var(--gold)'>Concasseur</strong> transforme la pierre brute en pierre traitée, cristaux et pierres précieuses.</p>"
      + "<p style='margin-top:8px'>Rendement : 50% pierre traitée, 30% déchets, 15% cristaux de roche, 5% pierres précieuses.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'quarry') && !!s.unlockedResearch?.crusher_unlock,
  },
  refinery: {
    icon: '🏭', name: 'Raffinerie',
    cost: 350, color: '#604020',
    workers: 6, w: 1, h: 1,
    group: 'factory',
    description: 'Raffine le pétrole brut → gaz, carburant, résidu.',

    info: "<p>La <strong style='color:var(--gold)'>Raffinerie</strong> transforme le pétrole brut en produits dérivés.</p>"
      + "<p style='margin-top:8px'>Rendement : 20% gaz, 30% carburant, 30% résidu pétrolier (réutilisable plus tard), 20% déchets.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'well') && !!s.unlockedResearch?.refinery_unlock,
  },
  water_plant: {
    icon: '💧', name: 'Usine de Traitement de l\'Eau',
    cost: 300, color: '#204060',
    workers: 4, w: 1, h: 1,
    group: 'factory',
    description: 'Traite l\'eau brute → eau potable, calcaire.',

    info: "<p>L'<strong style='color:var(--gold)'>Usine de Traitement de l'Eau</strong> purifie l'eau brute.</p>"
      + "<p style='margin-top:8px'>Rendement : 50% eau potable, 20% calcaire, 30% déchets.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'well') && !!s.unlockedResearch?.water_plant_unlock,
  },
  research_center: {
    icon: '🔬', name: 'Centre de Recherche Industriel',
    cost: 500, color: '#4040a0',
    workers: 8, w: 1, h: 1,
    group: 'factory',
    description: "Débloque les usines de traitement via l'arbre de recherche.",

    info: "<p>Le <strong style='color:var(--gold)'>Centre de Recherche Industriel</strong> débloque les usines de transformation avancées.</p>"
      + "<p style='margin-top:8px'>Une fois construit, vous pourrez bâtir : Usine de Traitement, Concasseur, Raffinerie, Usine d'Eau et Usine de Véhicules.</p>"
      + "<p style='margin-top:8px;color:var(--muted);font-size:0.68rem'>Un arbre de recherche plus complet sera disponible prochainement.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t =>
      Object.keys(WAREHOUSE_TYPES ?? {}).includes(t)
    ),
  },
  research_warehouse: {
    icon: '📦', name: 'Entrepôt de Recherche',
    cost: 350, color: '#806040',
    workers: 2, w: 1, h: 1,
    group: 'factory',
    description: "Stocke toutes les ressources nécessaires aux recherches. Doit être construit autour du Centre de Recherche.",
    info: "<p>L'<strong style='color:var(--gold)'>Entrepôt de Recherche</strong> accepte toutes les catégories de ressources (solide, liquide, gaz, déchet, dangereux).</p>"
      + "<p style='margin-top:8px'>Il doit être construit sur une tuile adjacente au Centre de Recherche Industriel.</p>"
      + "<p style='margin-top:8px;color:var(--muted);font-size:0.68rem'>Les ressources stockées ici sont consommées lors du déblocage des recherches.</p>",
    unlockCondition: (s) => Object.values(s.buildings).some(t => t === 'research_center'),
  },
  vehiclefactory: {
    icon: '🏗️', name: 'Usine de Véhicules',
    cost: 300, color: '#505050',
    workers: 6, w: 1, h: 1,
    group: 'factory',
    description: 'Construit camions et véhicules d\'exploration.',

    info: "<p>L'<strong style='color:var(--gold)'>Usine de Véhicules</strong> construit vos camions et véhicules d'exploration.</p>"
      + "<p style='margin-top:8px'>Choisissez le type de camion adapté à la ressource à transporter : Minerais, Citerne, Déchets ou Dangereux.</p>"
      + "<p style='margin-top:8px;color:var(--muted);font-size:0.68rem'>Un seul véhicule peut être en construction à la fois par usine.</p>",
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
    types: ['research_center', 'research_warehouse', 'sorting', 'crusher', 'refinery', 'water_plant', 'vehiclefactory'],
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
  research_warehouse: 30,
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
  townhall: 50, house: 30, hospital: 80, research_center: 120, research_warehouse: 90,
  mine: 80, quarry: 60, well: 40,
  road: 5, stargate: 200,
  sorting: 100, crusher: 100, refinery: 150, water_plant: 120,
  warehouse: 90, warehouse_liquid: 100,
  warehouse_waste: 110, warehouse_hazmat: 150, warehouse_gas: 160,
  vehiclefactory: 150,
};

// Coûts en ressources par bâtiment et niveau (index = niveau cible, ex: [0] = passer de 0 à 1)
// Bâtiments gratuits lvl 0 : townhall, house, mine, well, warehouse (pas de coût ressource au lvl 0)
const LEVELUP_RESOURCE_COST = {
  warehouse: [
    null,                                        // lvl 0 gratuit
    { stone_r: 5 },                              // lvl 1
    { stone_r: 10, wood_r: 5 },                  // lvl 2
    { stone_r: 20, wood_r: 10, iron_r: 5 },      // lvl 3
  ],
  vehiclefactory: [
    null,                                        // lvl 0 : coût crédit seul
    { stone_r: 10, iron_r: 5 },                  // lvl 1
    { stone_r: 20, iron_r: 15, coal_r: 5 },      // lvl 2
    { stone_r: 30, iron_r: 25, coal_r: 15 },     // lvl 3
  ],
  sorting: [
    null,
    { stone_r: 8, water_r: 5 },                  // lvl 1
    { stone_r: 15, water_r: 10, iron_r: 5 },     // lvl 2
    { stone_r: 25, water_r: 20, iron_r: 10 },    // lvl 3
  ],
  hospital: [
    null,
    { stone_r: 10, water_r: 5 },                 // lvl 1
    { stone_r: 20, water_r: 10, iron_r: 5 },     // lvl 2
    { stone_r: 35, water_r: 20, iron_r: 15 },    // lvl 3
  ],
  research_center: [
    null,
    { stone_r: 15, iron_r: 8 },                  // lvl 1
    { stone_r: 25, iron_r: 15, coal_r: 10 },     // lvl 2
    { stone_r: 40, iron_r: 30, coal_r: 20 },     // lvl 3
  ],
  research_warehouse: [
    null,
    { stone_r: 8, iron_r: 3 },                   // lvl 1
    { stone_r: 15, iron_r: 8, coal_r: 5 },       // lvl 2
    { stone_r: 25, iron_r: 15, coal_r: 10 },     // lvl 3
  ],
};

// Workers de base par bâtiment
const BASE_WORKERS = {
  townhall: 2, house: 0, road: 0, hospital: 6, research_center: 8, research_warehouse: 2, stargate: 2,
  mine: 4, quarry: 3, well: 2,
  sorting: 5, crusher: 4, refinery: 6, water_plant: 4,
  warehouse: 2, warehouse_liquid: 2, warehouse_waste: 2,
  warehouse_hazmat: 2, warehouse_gas: 2,
  vehiclefactory: 6,
};

// ============================================================
// CONDITIONS DE DÉVERROUILLAGE
// Logique de progression : certains bâtiments se débloquent
// en construisant les précédents, d'autres via recherche.
// ============================================================

function hasBuilt(state, type) {
  return Object.values(state.buildings).includes(type);
}
function hasResearch(state, id) {
  return !!(state.unlockedResearch?.[id]);
}

// Patch des unlockConditions sur BUILDING_DEF
Object.assign(BUILDING_DEF.townhall, { unlockCondition: () => true });
Object.assign(BUILDING_DEF.road,     { unlockCondition: () => true });
Object.assign(BUILDING_DEF.mine,     { unlockCondition: s => Object.values(s.buildings).includes('house') });
Object.assign(BUILDING_DEF.well,     { unlockCondition: s => Object.values(s.buildings).includes('house') });

// Déverrouillés par chaîne de construction
Object.assign(BUILDING_DEF.house,          { unlockCondition: s => s.hasTownhall });
Object.assign(BUILDING_DEF.warehouse,      { unlockCondition: s => hasBuilt(s, 'mine') || hasBuilt(s, 'well') || hasBuilt(s, 'quarry') });
Object.assign(BUILDING_DEF.vehiclefactory, { unlockCondition: s => hasBuilt(s, 'warehouse') });
Object.assign(BUILDING_DEF.research_center,{ unlockCondition: s => hasBuilt(s, 'vehiclefactory') });
Object.assign(BUILDING_DEF.research_warehouse,{ unlockCondition: s => hasBuilt(s, 'research_center') });

// Nécessitent une recherche dans le CRI
Object.assign(BUILDING_DEF.hospital,          { unlockCondition: s => hasResearch(s, 'hospital_unlock') });
Object.assign(BUILDING_DEF.stargate,          { unlockCondition: s => hasResearch(s, 'stargate_unlock') });
Object.assign(BUILDING_DEF.quarry,            { unlockCondition: s => Object.values(s.buildings).includes('house') });
Object.assign(BUILDING_DEF.warehouse_liquid,  { unlockCondition: s => hasResearch(s, 'warehouse_liquid_unlock') });
Object.assign(BUILDING_DEF.warehouse_waste,   { unlockCondition: s => hasResearch(s, 'warehouse_waste_unlock') });
Object.assign(BUILDING_DEF.warehouse_hazmat,  { unlockCondition: s => hasResearch(s, 'warehouse_hazmat_unlock') });
Object.assign(BUILDING_DEF.warehouse_gas,     { unlockCondition: s => hasResearch(s, 'warehouse_gas_unlock') });
Object.assign(BUILDING_DEF.sorting,           { unlockCondition: s => hasResearch(s, 'sorting_unlock') });
Object.assign(BUILDING_DEF.crusher,           { unlockCondition: s => hasResearch(s, 'crusher_unlock') });
Object.assign(BUILDING_DEF.refinery,          { unlockCondition: s => hasResearch(s, 'refinery_unlock') });
Object.assign(BUILDING_DEF.water_plant,       { unlockCondition: s => hasResearch(s, 'water_plant_unlock') });
