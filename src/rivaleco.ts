// Économie des rivaux : mêmes règles et mêmes chiffres que le joueur.
// Simulation « comptable » mensuelle : un stock commun par rival, des ateliers qui produisent selon
// leur recette, la richesse du gisement, leurs ouvriers et leur distance au cœur du réseau ;
// des villes qui consomment selon leur palier et ne grandissent que si elles sont approvisionnées.
import { BUILD, DIFFICULTY, IMPORT_MULT, ROADS, VEH, LEVEL_COST, LEVEL_MULT, LOCAL_SALE, OLD_NEEDS_MULT, RES, START_MONEY, START_STOCK, TIERS, TIER_NEEDS_2, WAGE, WORK_RANGES, type BType, type ResId } from './defs';
import type { Geo } from './geo';
import type { Faction, GameState, RBuilding } from './state';

type Stock = Partial<Record<ResId, number>>;
/** Une ville du joueur fournit 40 % de ses habitants comme ouvriers */
const WORKER_SHARE = 0.4;
/** Il faut un mois de céréales d'avance pour grandir (comme le joueur) */
const RESERVE_TO_GROW = 1;
/** Le rival garde de quoi construire */
const BUILD_RESERVE: Stock = { bois: 40, pierre: 20 };

export const diffMult = (s: GameState) => DIFFICULTY[s.difficulty ?? 'equilibre'].mult;
/** Argent et matériaux de départ d'un rival : ceux du joueur, selon la difficulté */
export function rivalStart(s: GameState, f: Faction) {
  f.money = Math.round(START_MONEY * diffMult(s));
  f.stock = { ...START_STOCK };
}
/** Repères du joueur : un rival ne le dépasse jamais de beaucoup (selon la difficulté) */
const playerPop = (s: GameState) => s.buildings.reduce((a, b) => a + (b.city && b.built ? b.city.pop : 0), 0);
const playerWorkshops = (s: GameState) => s.buildings.filter(b => !b.partner && BUILD[b.type].recipe).reduce((a, b) => a + b.level, 0);
const playerCities = (s: GameState) => s.buildings.filter(b => b.city).length;
/** Population maximale d'un rival : celle du joueur × difficulté, plus une petite avance */
export const rivalPopCap = (s: GameState) => playerPop(s) * diffMult(s) + 300;
/** Ateliers maximum (niveaux compris) : ceux du joueur × difficulté, plus deux */
const rivalWorkshopCap = (s: GameState) => Math.floor(playerWorkshops(s) * diffMult(s)) + 2;
const workshopCount = (f: Faction) => f.b.filter(b => BUILD[b.type].recipe).reduce((a, b) => a + (b.level ?? 1), 0);
/** Comme le joueur : chaque atelier a son chariot (achat et entretien) et sa route (au kilomètre) */
const CART = VEH.charrette;
export const isReady = (s: GameState, b: RBuilding) => !b.ready || b.ready <= s.day;
export const rivalCities = (f: Faction) => f.b.filter(b => b.type === 'village');
const hubs = (f: Faction) => f.b.filter(b => b.type === 'village' || b.type === 'entrepot');
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
export const rivalWorkRange = (f: Faction, c: RBuilding) => (WORK_RANGES[c.tier ?? 0] ?? WORK_RANGES[0]) + ((f.techs ?? []).includes('cite_prospere') ? 15 : 0);

/** Besoins mensuels d'une ville rivale (même formule que cityNeeds) */
export function rivalNeeds(s: GameState, c: RBuilding): Stock {
  const t = TIERS[c.tier ?? 0], out: Stock = {}, k = (c.pop ?? 0) / 100, old = c.modern ? OLD_NEEDS_MULT : 1;
  for (const [r, q] of Object.entries(t.needs)) out[r as ResId] = q! * k * old;
  if (s.era >= 2) for (const [r, q] of Object.entries(TIER_NEEDS_2[c.tier ?? 0] ?? {})) out[r as ResId] = (out[r as ResId] ?? 0) + q! * k;
  return out;
}
const tierGoods = (s: GameState, tier: number) => {
  const g = Object.keys(TIERS[tier]?.needs ?? {}) as ResId[];
  if (s.era >= 2) g.push(...(Object.keys(TIER_NEEDS_2[tier] ?? {}) as ResId[]));
  return [...new Set(g)];
};

/** Ateliers dont les ouvriers viennent d'une ville du rival (comme pour le joueur : rayon de main-d'œuvre) */
function staffed(s: GameState, f: Faction) {
  const cities = rivalCities(f).filter(c => isReady(s, c));
  const prods = f.b.filter(b => isReady(s, b) && BUILD[b.type].recipe && cities.some(c => dist(b, c) <= rivalWorkRange(f, c)));
  const need = prods.reduce((a, b) => a + workersOf(b), 0);
  const avail = cities.reduce((a, c) => a + Math.floor((c.pop ?? 0) * WORKER_SHARE), 0);
  return { prods, need, avail, ratio: need ? Math.min(1, avail / need) : 1 };
}
/** Ouvriers d'un atelier selon son niveau (comme le joueur) */
const workersOf = (b: RBuilding) => Math.round(BUILD[b.type].workers * (1 + 0.5 * ((b.level ?? 1) - 1)));
/** Niveau maximal des ateliers selon ses technologies (comme le joueur) */
const maxLevel = (f: Faction) => (f.techs ?? []).includes('urbanisme') ? 3 : (f.techs ?? []).includes('metallurgie') ? 2 : 1;
/** Le transport coûte : un atelier loin de ses villes et entrepôts rend moins */
const distFactor = (f: Faction, b: RBuilding) => {
  const d = Math.min(Infinity, ...hubs(f).filter(h => h !== b).map(h => dist(h, b)));
  return Math.max(0.5, Math.min(1, 1 - (d - 15) / 150));
};
/** Production mensuelle attendue d'un atelier (unités de son produit principal) */
function rateOf(s: GameState, f: Faction, b: RBuilding, ratio: number) {
  const d = BUILD[b.type], out = Object.values(d.recipe!.out)[0]!;
  const skilled = (f.techs ?? []).includes('ouvrier_qualifie') && (d.deposit === 'bois' || d.deposit === 'pierre' || d.deposit === 'cereales') ? 1.2 : 1;
  return out * LEVEL_MULT[b.level ?? 1] * ratio * (d.deposit ? b.rich ?? 1 : 1) * distFactor(f, b) * skilled * diffMult(s);
}

/** Un mois d'économie pour un rival : production, consommation, croissance, argent, puis décisions */
export function rivalMonth(s: GameState, geo: Geo, f: Faction) {
  const st = f.stock ??= {};
  const made: Stock = {}, bought = f.bought ?? {};
  f.bought = {};
  const add = (o: Stock, r: ResId, q: number) => { o[r] = (o[r] ?? 0) + q; };
  // ----- production : d'abord les matières premières, puis les ateliers de transformation -----
  const { prods, need: workers, avail, ratio } = staffed(s, f);
  const order = [...prods].sort((a, z) => Object.keys(BUILD[a.type].recipe!.in).length - Object.keys(BUILD[z.type].recipe!.in).length);
  for (const b of order) {
    const rc = BUILD[b.type].recipe!, out = Object.values(rc.out)[0]!;
    let k = rateOf(s, f, b, ratio) / out;
    for (const [r, q] of Object.entries(rc.in) as [ResId, number][]) k = Math.min(k, (st[r] ?? 0) / q);
    if (k <= 0) continue;
    for (const [r, q] of Object.entries(rc.in) as [ResId, number][]) st[r] = (st[r] ?? 0) - q * k;
    for (const [r, q] of Object.entries(rc.out) as [ResId, number][]) { add(st, r, q * k); add(made, r, q * k); }
  }
  f.made = made;
  // ----- consommation des villes, à partir du stock commun -----
  const cities = rivalCities(f).filter(c => isReady(s, c));
  const needs = cities.map(c => rivalNeeds(s, c)), total: Stock = {};
  needs.forEach(n => { for (const [r, q] of Object.entries(n) as [ResId, number][]) add(total, r, q); });
  const share: Stock = {};
  let income = 0;
  for (const [r, q] of Object.entries(total) as [ResId, number][]) {
    const got = Math.min(q, st[r] ?? 0);
    share[r] = q > 0 ? got / q : 1;
    st[r] = (st[r] ?? 0) - got;
  }
  // ----- croissance : exactement la règle du joueur -----
  const growthMult = (f.techs ?? []).includes('urbanisme') ? 1.25 : 1;
  const foodNeed = total.cereales ?? 0;
  // comme une ville du joueur : elle doit recevoir au moins ce qu'elle mange (production ou achats)
  const supplied = (made.cereales ?? 0) + (bought.cereales ?? 0) >= foodNeed * 0.98;
  const reserveOk = foodNeed <= 0 || (st.cereales ?? 0) / foodNeed >= RESERVE_TO_GROW;
  // plafond : il ne dépasse pas le joueur de plus que sa difficulté ne le permet
  const capped = cities.reduce((a, c) => a + (c.pop ?? 0), 0) >= rivalPopCap(s);
  cities.forEach((c, i) => {
    const n = needs[i]; let satSum = 0, k = 0;
    for (const [r, q] of Object.entries(n) as [ResId, number][]) {
      income += q * (share[r] ?? 0) * RES[r].price * (1 + 0.1 * (c.tier ?? 0)); // les habitants paient ce qu'ils reçoivent
      if (r !== 'cereales') { satSum += share[r] ?? 0; k++; }
    }
    const foodSat = share.cereales ?? 1, sat = k ? satSum / k : 1;
    c.modern = s.era >= 2 && Object.keys(TIER_NEEDS_2[c.tier ?? 0] ?? {}).some(r => (share[r as ResId] ?? 0) > 0);
    c.growing = foodSat >= 0.98 && supplied && reserveOk && !capped;
    c.short = (Object.keys(n) as ResId[]).filter(r => (share[r] ?? 1) < 0.98);
    if (c.growing) {
      let rate = (0.012 + 0.03 * sat) * growthMult;
      const tier = c.tier ?? 0, next = TIERS[tier + 1];
      if (next && (c.pop ?? 0) * (1 + rate) >= next.minPop) {
        // passer au palier suivant demande d'avoir déjà ses nouveaux biens en réserve
        const cur = tierGoods(s, tier), fresh = tierGoods(s, tier + 1).filter(r => !cur.includes(r));
        const blocked = fresh.filter(r => (st[r] ?? 0) <= 0);
        const allowed = tier + 1 < 4 || (f.techs ?? []).includes('capitales');
        if (!allowed || blocked.length) { rate = 0; c.pop = Math.min(c.pop ?? 0, next.minPop - 1); c.short = [...new Set([...c.short, ...blocked])]; }
      }
      c.pop = (c.pop ?? 0) * (1 + rate);
    } else if (foodSat < 0.98) {
      c.pop = Math.max(20, (c.pop ?? 0) * (1 - Math.min(0.06, 0.3 * (1 - foodSat))));
    }
    let t = 0; for (let j = 0; j < TIERS.length; j++) if ((c.pop ?? 0) >= TIERS[j].minPop) t = j;
    c.tier = Math.min(t, (f.techs ?? []).includes('capitales') ? 4 : 3);
  });
  // ----- argent : recettes des villes, salaires, surplus vendu sur place -----
  const carts = f.b.filter(b => BUILD[b.type].recipe).length;
  f.money += income - Math.min(workers, avail) * WAGE - carts * CART.upkeep;
  for (const r of Object.keys(st) as ResId[]) {
    const keep = Math.max(60, (total[r] ?? 0) * 12, (BUILD_RESERVE[r] ?? 0) * 3, inputNeed(f, r) * 6);
    if ((st[r] ?? 0) > keep) { const q = st[r]! - keep; st[r] = keep; f.money += q * RES[r].price * LOCAL_SALE; }
    if ((st[r] ?? 0) < 0.001) delete st[r];
  }
  // ----- décisions : ce qui manque le plus -----
  decide(s, geo, f, total);
}

/** Matières consommées chaque mois par les ateliers de transformation du rival */
function inputNeed(f: Faction, r: ResId) {
  return f.b.reduce((a, b) => a + (BUILD[b.type].recipe?.in[r] ?? 0), 0);
}

/** Ressources qui manquent, de la plus urgente à la moins urgente */
function shortages(s: GameState, f: Faction, total: Stock): ResId[] {
  const st = f.stock ?? {}, made = f.made ?? {}, list: { r: ResId; p: number }[] = [];
  // capacité installée (chantiers compris), même si l'atelier attend ses matières :
  // il ne rebâtit pas un atelier qui chôme, il cherche plutôt ce qui lui manque
  const cap: Stock = {};
  for (const b of f.b) {
    const rc = BUILD[b.type].recipe; if (!rc) continue;
    for (const [r, q] of Object.entries(rc.out) as [ResId, number][]) cap[r] = (cap[r] ?? 0) + q * LEVEL_MULT[b.level ?? 1] * (BUILD[b.type].deposit ? b.rich ?? 1 : 1) * distFactor(f, b) * diffMult(s);
  }
  const deficit = (r: ResId, want: number) => want - (cap[r] ?? 0);
  // 1. la nourriture, avec une marge pour grandir
  const food = deficit('cereales', (total.cereales ?? 0) * 1.3 + 0.5);
  if (food > 0) list.push({ r: 'cereales', p: 100 + food });
  // 2. de quoi construire
  for (const r of ['bois', 'pierre'] as ResId[]) {
    const d = deficit(r, (total[r] ?? 0) + inputNeed(f, r) + 0.5);
    if (d > 0 || (st[r] ?? 0) < BUILD_RESERVE[r]! && (cap[r] ?? 0) < 3) list.push({ r, p: 80 + Math.max(0, d) });
  }
  // 3. les autres besoins des villes
  for (const [r, q] of Object.entries(total) as [ResId, number][]) if (r !== 'cereales' && r !== 'bois' && r !== 'pierre') {
    const d = deficit(r, q * 1.1); if (d > 0) list.push({ r, p: 60 + d / Math.max(0.01, q) });
  }
  // 4. les biens du palier suivant, quand une ville s'en approche
  for (const c of rivalCities(f)) {
    const tier = c.tier ?? 0, next = TIERS[tier + 1];
    if (!next || (c.pop ?? 0) < next.minPop * 0.6) continue;
    const cur = tierGoods(s, tier);
    for (const r of tierGoods(s, tier + 1).filter(x => !cur.includes(x))) if ((cap[r] ?? 0) <= 0 && (made[r] ?? 0) <= 0) list.push({ r, p: 40 });
  }
  // 5. les matières des ateliers de transformation
  for (const r of Object.keys(RES) as ResId[]) { const q = inputNeed(f, r); if (q > 0 && deficit(r, q) > 0) list.push({ r, p: 30 }); }
  const seen = new Set<ResId>();
  return list.sort((a, z) => z.p - a.p).map(x => x.r).filter(r => RES[r].era <= s.era && !seen.has(r) && seen.add(r));
}

/** Types de bâtiments que ce rival sait construire pour produire r */
const producersOf = (s: GameState, f: Faction, r: ResId) => (Object.keys(BUILD) as BType[]).filter(t => {
  const d = BUILD[t];
  return d.recipe?.out[r] && !d.hidden && !d.wonder && !d.coast && !d.river && d.era <= s.era && (!d.tech || (f.techs ?? []).includes(d.tech));
}).sort((a, z) => (Object.values(BUILD[z].recipe!.out)[0] ?? 0) - (Object.values(BUILD[a].recipe!.out)[0] ?? 0));

export interface Placer {
  freeDeposits(f: Faction, res: ResId, maxDist: number): { x: number; y: number; dep: number; name: string; d: number }[];
  spot(f: Faction, near: { x: number; y: number }, water: boolean, maxR?: number): { x: number; y: number } | null;
  foundCity(f: Faction, near?: { x: number; y: number }): RBuilding | null;
}
let placer: Placer | null = null;
export function setPlacer(p: Placer) { placer = p; }

/** Peut-il payer ce bâtiment (argent et matériaux) ? sinon, ce qui lui manque */
function payable(f: Faction, t: BType): ResId | true | false {
  const d = BUILD[t];
  if (f.money < d.money) return false;
  for (const [r, q] of Object.entries(d.cost) as [ResId, number][]) if ((f.stock?.[r] ?? 0) < q) return r;
  return true;
}
function pay(f: Faction, t: BType) {
  const d = BUILD[t]; f.money -= d.money;
  for (const [r, q] of Object.entries(d.cost) as [ResId, number][]) f.stock![r] = (f.stock![r] ?? 0) - q;
}

/** Essaie de bâtir un atelier qui produit r ; renvoie 'ok', 'cost' (matériau manquant) ou 'none' (impossible ici) */
function tryBuild(s: GameState, geo: Geo, f: Faction, r: ResId, depth = 0): 'ok' | 'none' | 'wait' | { lack: ResId } {
  if (!placer) return 'none';
  const cities = rivalCities(f).filter(c => isReady(s, c));
  for (const t of producersOf(s, f, r)) {
    const d = BUILD[t];
    let pos: { x: number; y: number; dep?: number; name?: string; rich?: number } | null = null;
    if (d.deposit) {
      // un gisement libre à portée de main-d'œuvre d'une de ses villes
      const deps = placer.freeDeposits(f, d.deposit, 0).filter(p => cities.some(c => Math.hypot(c.x - p.x, c.y - p.y) <= rivalWorkRange(f, c) - 2));
      const best = deps.map(p => ({ p, rich: 1 })).sort((a, z) => a.p.d - z.p.d)[0];
      if (best) pos = { x: best.p.x, y: best.p.y, dep: best.p.dep, name: best.p.name, rich: best.rich };
      // les céréales poussent partout (terres ordinaires), comme pour le joueur
      if (!pos && d.deposit === 'cereales') {
        for (const c of [...cities].sort((a, z) => (z.pop ?? 0) - (a.pop ?? 0))) {
          const p = placer.spot(f, c, false, rivalWorkRange(f, c) - 3);
          if (p) { pos = { ...p, rich: 0.45 }; break; } // terres ordinaires
        }
      }
    } else {
      // atelier de transformation : seulement s'il produit lui-même ses matières (pas d'atelier nourri d'importations)
      if ((Object.keys(d.recipe!.in) as ResId[]).some(r => !f.b.some(b => BUILD[b.type].deposit && BUILD[b.type].recipe?.out[r]))) continue;
      // près d'une ville, avec de l'eau s'il le faut
      const c = [...cities].sort((a, z) => (z.pop ?? 0) - (a.pop ?? 0))[0];
      const p = c && placer.spot(f, c, !!d.needsWater);
      if (p) pos = { ...p, rich: 1 };
    }
    if (!pos) {
      // plus de place : il améliore un atelier existant (niveaux 2 et 3, comme le joueur)
      const up = f.b.filter(b => b.type === t && isReady(s, b) && (b.level ?? 1) < maxLevel(f)).sort((a, z) => (z.rich ?? 1) - (a.rich ?? 1))[0];
      if (!up) continue;
      const next = (up.level ?? 1) + 1, money = Math.round(d.money * LEVEL_COST[next]), mats: Stock = {};
      for (const [rr, q] of Object.entries(d.upgrade ?? d.cost) as [ResId, number][]) mats[rr] = Math.ceil(q * (d.upgrade ? (next >= 3 ? 1.5 : 1) : LEVEL_COST[next]));
      if (f.money < money) return 'wait';
      const lack = (Object.keys(mats) as ResId[]).find(rr => (f.stock?.[rr] ?? 0) < mats[rr]!);
      if (lack) { const sub = depth < 1 ? tryBuild(s, geo, f, lack, depth + 1) : 'none'; return sub === 'ok' ? 'ok' : sub === 'wait' ? 'wait' : { lack }; }
      f.money -= money;
      for (const [rr, q] of Object.entries(mats) as [ResId, number][]) f.stock![rr] = (f.stock![rr] ?? 0) - q;
      up.level = next; up.ready = s.day + Math.round(d.days * (next === 2 ? 2 : 3.5));
      return 'ok';
    }
    const near0 = hubs(f).sort((a, z) => dist(a, pos!) - dist(z, pos!))[0];
    const transport = CART.price + Math.round((near0 ? dist(near0, pos) : 0) * ROADS.chemin.perKm);
    const ok = f.money < transport + BUILD[t].money ? false : payable(f, t);
    if (ok === false) return 'wait';
    if (ok !== true) {
      // un matériau manque : il bâtit de quoi le produire, sinon il devra l'acheter
      const sub = depth < 1 ? tryBuild(s, geo, f, ok, depth + 1) : 'none';
      return sub === 'ok' ? 'ok' : sub === 'wait' ? 'wait' : { lack: ok };
    }
    pay(f, t); f.money -= transport;
    const nb: RBuilding = { id: s.nextId++, type: t, x: pos.x, y: pos.y, name: `${d.name}${pos.name ? ' — ' + pos.name : ''}`, dep: pos.dep ?? null, rich: pos.rich, ready: s.day + d.days };
    f.b.push(nb);
    const near = hubs(f).filter(h => h !== nb).sort((a, z) => dist(a, nb) - dist(z, nb))[0];
    if (near) f.roads.push([near.x, near.y, nb.x, nb.y]);
    return 'ok';
  }
  return 'none';
}

/** Ressource introuvable chez lui : il l'achète (aux autres rivaux, sinon à Rome) */
function buy(s: GameState, f: Faction, r: ResId, total: Stock) {
  const flow = (total[r] ?? 0) * 1.05 + inputNeed(f, r) - (f.made?.[r] ?? 0);
  const want = Math.max(Math.max(2, (total[r] ?? 0) * 3 + inputNeed(f, r) * 2) - (f.stock?.[r] ?? 0), flow);
  if (want <= 0) return;
  let got = 0; f.bought ??= {};
  // un autre rival en a de trop : il le lui vend
  for (const o of s.factions ?? []) {
    if (o === f || o.dead || o.foes?.includes(f.id)) continue;
    // il ne vend que ce qui dépasse ses propres besoins de trois mois et sa réserve de chantier
    const own = rivalCities(o).reduce((a, c) => a + (rivalNeeds(s, c)[r] ?? 0), 0) + inputNeed(o, r);
    const spare = (o.stock?.[r] ?? 0) - Math.max(30, own * 3 + (BUILD_RESERVE[r] ?? 0));
    if (spare <= 1) continue;
    const price = RES[r].price * 1.2, q = Math.min(want - got, spare, Math.floor(f.money * 0.4 / price));
    if (q < 1) continue;
    o.stock![r]! -= q; f.stock![r] = (f.stock![r] ?? 0) + q; f.money -= q * price; o.money += q * price; got += q;
    f.bought![r] = (f.bought![r] ?? 0) + q;
    if (got >= want) return;
  }
  // le reste chez les marchands romains, deux fois plus cher (comme le joueur)
  const price = RES[r].price * IMPORT_MULT, q = Math.min(want - got, Math.floor(f.money * 0.3 / price));
  if (q >= 1) { f.stock![r] = (f.stock![r] ?? 0) + q; f.money -= q * price; f.bought![r] = (f.bought![r] ?? 0) + q; }
}

/** Premières décisions d'un rival qui s'installe */
export function rivalKickoff(s: GameState, geo: Geo, f: Faction) {
  const total: Stock = {};
  for (const c of rivalCities(f)) for (const [r, q] of Object.entries(rivalNeeds(s, c)) as [ResId, number][]) total[r] = (total[r] ?? 0) + q;
  decide(s, geo, f, total);
}
function decide(s: GameState, geo: Geo, f: Faction, total: Stock) {
  // pas plus d'ateliers que le joueur (selon la difficulté) : au-delà, il achète ce qui manque
  const builds = workshopCount(f) >= rivalWorkshopCap(s) ? 0 : s.difficulty === 'ambitieux' ? 2 : 1;
  let done = 0;
  for (const r of shortages(s, f, total)) {
    // chantiers du mois épuisés : il comble au moins ce qui manque à ses villes en l'achetant
    if (done >= builds) { if ((total[r] ?? 0) > 0 && (f.stock?.[r] ?? 0) < (total[r] ?? 0)) buy(s, f, r, total); continue; }
    const res = tryBuild(s, geo, f, r);
    if (res === 'ok') { done++; continue; }
    if (res === 'wait') continue; // il économise pour ce chantier
    if (typeof res === 'object') {
      // il achète le matériau qui manque, puis relance le chantier tout de suite
      buy(s, f, res.lack, { ...total, [res.lack]: Math.max(total[res.lack] ?? 0, 10) });
      if (tryBuild(s, geo, f, r) === 'ok') done++;
      continue;
    }
    // aucun gisement à portée : il achète, ou part s'installer près d'un gisement libre (selon son caractère)
    const settler = f.character === 'guerrier' || f.character === 'opportuniste' || f.money < RES[r].price * IMPORT_MULT * 3;
    const capital = rivalCities(f)[0];
    const dep = BUILD[producersOf(s, f, r)[0]]?.deposit;
    if (settler && dep && placer && capital && (capital.pop ?? 0) >= 300 && f.money >= BUILD.village.money + 200 && rivalCities(f).length < Math.min(6, playerCities(s) + 1)) {
      const target = placer.freeDeposits(f, dep, 220)[0];
      if (target && placer.foundCity(f, target)) { f.money -= BUILD.village.money; done++; continue; }
    }
    buy(s, f, r, total);
  }
  // nouvelles villes : quand les villes existantes sont prospères
  const cities = rivalCities(f), big = cities.reduce((a, c) => Math.max(a, c.pop ?? 0), 0);
  if (placer && cities.length < Math.min(6, playerCities(s) + 1) && big >= 350 * cities.length && cities.every(c => c.growing) && f.money >= BUILD.village.money + 300 && Math.random() < 0.25) {
    if (placer.foundCity(f)) f.money -= BUILD.village.money;
  }
  // un entrepôt près de chaque ville d'au moins un bourg
  for (const c of cities) if ((c.tier ?? 0) >= 1 && !f.b.some(b => b.type === 'entrepot' && dist(b, c) < 12) && payable(f, 'entrepot') === true) {
    pay(f, 'entrepot');
    const e: RBuilding = { id: s.nextId++, type: 'entrepot', x: c.x + 4, y: c.y + 3, name: `Entrepôt de ${c.name}`, dep: null, ready: s.day + BUILD.entrepot.days };
    f.b.push(e); f.roads.push([c.x, c.y, e.x, e.y]);
  }
}
