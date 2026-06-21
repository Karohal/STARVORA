// ============================================================
// STARVORA — js/engine/production.js
// Tick de production, mines, usines
// ============================================================

// Unités produites/min selon niveau
function productionRate(level) {
  return 1 + Math.floor(level / 5);
}

// Capacité entrepôt interne selon niveau
function internalCapacity(level) {
  return 10 + Math.floor(level / 5) * 2;
}

// Capacité entrepôt warehouse
function warehouseCapacity(level) {
  return 20 + Math.floor(level / 5) * 5;
}

// ============================================================
// TICK DE PRODUCTION (toutes les 60s)
// ============================================================
function productionTick() {

  // === MINES / PUITS / CARRIÈRES ===
  for (const [key, type] of Object.entries(state.buildings)) {
    if (!['mine','quarry','well'].includes(type)) continue;

    const [col, row]  = key.split(',').map(Number);
    const level       = state.buildingLevels[key] ?? 0;
    const assigned    = state.assignedWorkers[key] ?? 0;
    const maxW        = (BASE_WORKERS[type] ?? 2) + Math.floor(level / 5);
    if (assigned === 0) continue;

    const efficiency = Math.min(1, assigned / maxW);
    const produced   = Math.round(productionRate(level) * efficiency);
    if (produced === 0) continue;

    const resType  = state.resources[row]?.[col];
    if (!resType) continue;

    if (!state.internalStock[key]) state.internalStock[key] = { solid: {}, liquid: {}, waste: 0 };
    const stock    = state.internalStock[key];
    const capacity = internalCapacity(level);

    const solidTotal  = Object.values(stock.solid  ?? {}).reduce((a,b)=>a+b,0);
    const liquidTotal = Object.values(stock.liquid ?? {}).reduce((a,b)=>a+b,0);
    const total       = solidTotal + liquidTotal + (stock.waste ?? 0);

    const free      = capacity - total;
    const actualRes = Math.min(produced, free);
    const cat       = RESOURCE_CATEGORY[resType] ?? 'solid';

    if (cat === 'liquid') {
      stock.liquid[resType] = (stock.liquid[resType] ?? 0) + actualRes;
    } else {
      stock.solid[resType]  = (stock.solid[resType]  ?? 0) + actualRes;
    }
  }

  // === USINES (sorting, crusher, refinery, water_plant) ===
  const FACTORY_TYPES = ['sorting', 'crusher', 'refinery', 'water_plant'];

  for (const [key, type] of Object.entries(state.buildings)) {
    if (!FACTORY_TYPES.includes(type)) continue;

    const level    = state.buildingLevels[key] ?? 0;
    const assigned = state.assignedWorkers[key] ?? 0;
    const maxW     = (BASE_WORKERS[type] ?? 4) + Math.floor(level / 5);
    if (assigned === 0) continue;

    if (!state.internalStock[key]) state.internalStock[key] = { input: {}, output: {} };
    const stock = state.internalStock[key];
    if (!stock.input)  stock.input  = {};
    if (!stock.output) stock.output = {};

    const recipe  = PRODUCTION_RECIPES[type];
    if (!recipe) continue;

    const efficiency = Math.min(1, assigned / maxW);
    const outCap     = recipe.outputCapacity(level);
    const outTotal   = Object.values(stock.output).reduce((a,b)=>a+b,0);
    if (outTotal >= outCap) continue;

    // Traiter chaque recette
    for (const r of recipe.recipes) {
      const inQty = stock.input[r.input] ?? 0;
      if (inQty <= 0) continue;

      const take = Math.min(inQty, Math.max(1, Math.round(r.amount * efficiency)));
      if (take <= 0) continue;

      stock.input[r.input] = Math.max(0, inQty - take);

      // Accumulateur de fractions par bâtiment+ressource (évite la perte d'arrondi)
      if (!state.factoryRemainder) state.factoryRemainder = {};
      if (!state.factoryRemainder[key]) state.factoryRemainder[key] = {};
      const remainder = state.factoryRemainder[key];

      const outputs = r.outputs.map(o => {
        const exact = take * o.pct + (remainder[o.resource] ?? 0);
        const qty   = Math.floor(exact * 100) / 100; // précision 2 décimales en mémoire
        const whole = Math.floor(qty);
        remainder[o.resource] = Math.round((qty - whole) * 100) / 100;
        return { resource: o.resource, qty: whole };
      });

      // Stocker dans output
      const free = outCap - outTotal;
      let added  = 0;
      for (const o of outputs) {
        const add = Math.min(o.qty, free - added);
        if (add > 0) {
          stock.output[o.resource] = (stock.output[o.resource] ?? 0) + add;
          added += add;
        }
      }
      break; // Une recette à la fois
    }
  }

  updateProductionUI();
}

// ============================================================
// UI PRODUCTION
// ============================================================
function updateProductionUI() {
  const bldPanel = document.getElementById('building-panel');
  if (!bldPanel?.classList.contains('open')) return;

  const key  = document.getElementById('bp-levelup-btn')?.dataset.key;
  const type = document.getElementById('bp-levelup-btn')?.dataset.type;
  if (!key) return;

  if (['mine','quarry','well','sorting','crusher','refinery','water_plant'].includes(type)) {
    refreshProductionPanel(key, type);
  }
  if (['warehouse','warehouse_liquid','warehouse_waste','warehouse_hazmat','warehouse_gas'].includes(type)) {
    refreshWarehousePanel(key, type);
  }

  // Camions en attente
  const waitingEl = document.getElementById('bp-waiting-trucks');
  if (waitingEl) {
    const waiting = Object.values(state.trucks).filter(t =>
      t.atStop && t.route[t.routeIndex % t.route.length]?.key === key
    );
    if (waiting.length > 0) {
      waitingEl.innerHTML = waiting.map(t => {
        const badge  = TRUCK_BADGES[t.truckType ?? 'standard'] ?? '🚛';
        const action = t.status === 'loading' ? 'chargement' : 'déchargement';
        return `<div class="th-row" style="color:var(--gold);font-size:0.7rem">${badge} en attente de ${action}</div>`;
      }).join('');
      waitingEl.style.display = 'block';
    } else {
      waitingEl.innerHTML = '';
      waitingEl.style.display = 'none';
    }
  }
}

// ============================================================
// LOGIQUE DE CHARGEMENT CAMION (chercher dans le bon stock)
// ============================================================
function getLoadableResource(stock, truckType, filter) {
  const truckCat = TRUCK_TYPES[truckType]?.category ?? 'solid';
  const allow = (r) => !filter || filter.includes(r);

  if (truckCat === 'solid') {
    const src = stock.output ?? stock.solid ?? {};
    for (const [r, q] of Object.entries(src)) {
      if (q > 0 && (RESOURCE_CATEGORY[r] ?? 'solid') === 'solid' && allow(r)) {
        return { resKey: r, availQty: q, src: stock.output ? 'output' : 'solid' };
      }
    }
  } else if (truckCat === 'liquid') {
    const src = stock.output ?? stock.liquid ?? {};
    for (const [r, q] of Object.entries(src)) {
      if (q > 0 && (RESOURCE_CATEGORY[r] ?? 'solid') === 'liquid' && allow(r)) {
        return { resKey: r, availQty: q, src: stock.output ? 'output' : 'liquid' };
      }
    }
  } else if (truckCat === 'gas') {
    const src = stock.output ?? {};
    for (const [r, q] of Object.entries(src)) {
      if (q > 0 && RESOURCE_CATEGORY[r] === 'gas' && allow(r)) {
        return { resKey: r, availQty: q, src: 'output' };
      }
    }
  } else if (truckCat === 'waste') {
    const qty = stock.waste ?? stock.output?.waste ?? 0;
    if (qty > 0 && allow('waste')) return { resKey: 'waste', availQty: qty, src: stock.waste !== undefined ? 'waste' : 'output' };
  } else if (truckCat === 'hazardous') {
    const src = stock.output ?? stock.solid ?? {};
    for (const [r, q] of Object.entries(src)) {
      if (q > 0 && RESOURCE_CATEGORY[r] === 'hazardous' && allow(r)) {
        return { resKey: r, availQty: q, src: stock.output ? 'output' : 'solid' };
      }
    }
  }
  return null;
}

window.productionTick    = productionTick;
window.updateProductionUI = updateProductionUI;
window.getLoadableResource = getLoadableResource;
window.internalCapacity  = internalCapacity;
window.warehouseCapacity = warehouseCapacity;
