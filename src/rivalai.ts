// Rivaux : chacun a sa propre économie complète, simulée par le même moteur que le joueur
// (bâtiments, chantiers livrés par convois, routes, lignes, véhicules, ouvriers, besoins des villes,
// croissance, salaires et entretien). L'ordinateur ne fait que donner les ordres d'un joueur :
// construire, tracer une route, créer une ligne, acheter ou revendre un véhicule.
import { BUILD, DIFFICULTY, IMPORT_MULT, LAST_CHAPTER, LEVEL_MULT, RES, START_MONEY, START_STOCK, TECHS, TIERS, VEH, WATER_RANGE, WORK_RANGES, type BType, type ResId, type VType } from './defs';
import type { Geo } from './geo';
import { addEdge, components, dijkstra, invalidate, quoteSegment } from './roads';
import {
  Sim, attachNode, buildMoney, buyVehicle, checkPlace, cities, cityNeeds, demolish, isStore, levelAllowed, place, sellVehicle, tierGoods, upgrade, upgradeCost, workRange,
  type Notifier,
} from './sim';
import { cargoTotal, type Building, type Edge, type Faction, type GameState, type Line, type RBuilding, type Stock } from './state';

const SILENT: Notifier = { toast() {}, event() {}, chapter() {}, gameOver() {} };
/** Ce que les marchands romains vendent aux rivaux (livré à leur entrepôt, au double du prix) */
const ROME_SELLS: ResId[] = ['cereales', 'bois', 'pierre'];
/** Réserve de chantier gardée à l'entrepôt */
const RESERVE: Stock = { bois: 40, pierre: 25 };
const MAX_VEH_PER_LINE = 8;
/** Prix d'export du surplus d'un rival (fraction du prix de base) */
const EXPORT = 0.9;

export const diffMult = (s: GameState) => DIFFICULTY[s.difficulty ?? 'equilibre'].mult;
export const rivalWorkRange = (f: Faction, c: RBuilding) => (WORK_RANGES[c.tier ?? 0] ?? WORK_RANGES[0]) + ((f.techs ?? []).includes('cite_prospere') ? 15 : 0);
export const rivalCities = (f: Faction) => f.b.filter(b => b.type === 'village');
/** Époque d'un rival (mise à jour chaque mois par nextRivalEra) */
export const rivalEra = (f: Faction) => f.era ?? 1;
/** Époque que le rival peut atteindre : comme le joueur, il passe au chapitre suivant quand il a découvert
 *  tout l'arbre du chapitre en cours (et, pour quitter la Gaule romaine, une fois arrivée la fin de l'Empire) */
export function nextRivalEra(f: Faction, year: number) {
  let e = rivalEra(f);
  while (e < LAST_CHAPTER && TECHS.filter(t => t.era === e).every(t => (f.techs ?? []).includes(t.id)) && (e !== 2 || year >= 426)) e++;
  return e;
}
/** Deux rivaux sont-ils alliés ? */
export const alliedRivals = (f: Faction, o: Faction) => (f.allies ?? []).includes(o.id);
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

// ---------- Économie d'un rival ----------
/** Crée l'économie d'un rival : un village et un entrepôt reliés par une route, l'argent et le stock de départ du joueur */
export function newEco(s: GameState, f: Faction, idBase: number): GameState {
  const m = diffMult(s);
  return {
    version: 3, day: s.day, money: Math.round(START_MONEY * m), rp: 0, era: s.era, techs: [...(f.techs ?? [])], nextId: idBase,
    nodes: [], edges: [], buildings: [], lines: [], vehicles: [], extracted: {},
    stats: { produced: {}, food: 0, sold: {}, soldMonth: {}, income: 0, expenses: 0 },
    objectives: [], events: [], market: {}, negMonths: 0, over: false, chapterDone: false, log: [], ledger: [],
    // la difficulté joue sur la production (±20 %)
    mods: m !== 1 ? [{ kind: 'prod', mult: m, until: 1e12 }] : [],
    difficulty: s.difficulty, ai: true, abroad: !!f.frontier,
  };
}
/** Installe la capitale et l'entrepôt de départ d'un rival */
export function foundHome(s: GameState, geo: Geo, f: Faction, x: number, y: number, capital: string) {
  const eco = f.eco!;
  const city = place(eco, geo, 'village', x, y, capital, true);
  city.built = true;
  const store = place(eco, geo, 'entrepot', x + 4, y + 3, `Entrepôt ${f.short.toLowerCase().startsWith('é') ? 'des ' : 'de '}${f.short}`, true);
  store.stock = { ...START_STOCK };
  attachNode(eco, city); attachNode(eco, store);
  const q = quoteSegment(geo, city.x, city.y, store.x, store.y, 'chemin', !!f.frontier);
  addEdge(eco, city.node!, store.node!, 'chemin', q.len, q.bridges);
  syncView(s, f);
}

const sims = new WeakMap<GameState, Sim>();
const simOf = (eco: GameState, geo: Geo) => { let m = sims.get(eco); if (!m) { m = new Sim(eco, geo, SILENT); sims.set(eco, m); } return m; };

/** Fait vivre l'économie des rivaux (appelé à chaque pas de temps du joueur) */
export function stepRivals(s: GameState, geo: Geo, dt: number) {
  for (const f of s.factions ?? []) {
    const eco = f.eco; if (!eco || f.dead) continue;
    eco.money = f.money; eco.era = rivalEra(f); eco.techs = f.techs ?? [];
    eco.day = s.day - dt;
    simOf(eco, geo).step(dt);
    f.money = eco.money;
  }
}

/** Vue simplifiée des bâtiments et routes du rival (carte, territoire, diplomatie, guerre) */
export function syncView(s: GameState, f: Faction) {
  const eco = f.eco; if (!eco) return;
  const nodes = new Map(eco.nodes.map(n => [n.id, n]));
  const list = eco.buildings.filter(b => !b.partner && b.type !== 'comptoir' && b.type !== 'poste');
  // la capitale d'abord
  list.sort((a, z) => (a.type === 'village' ? 0 : 1) - (z.type === 'village' ? 0 : 1) || (z.city?.pop ?? 0) - (a.city?.pop ?? 0));
  f.b = list.map(b => {
    const r: RBuilding = { id: b.id, type: b.type, x: b.x, y: b.y, name: b.name, dep: b.dep, level: b.level };
    if (!b.built) r.ready = s.day + 1;
    if (b.city) {
      r.pop = b.city.pop; r.tier = b.city.tier; r.growing = b.city.growing;
      const need = cityNeeds(b), short = (Object.keys(need) as ResId[]).filter(x => (b.city!.stock[x] ?? 0) < 0.5);
      const next = TIERS[b.city.tier + 1];
      if (next && b.city.pop >= next.minPop * 0.94) {
        const cur = tierGoods(b.city.tier, s.era);
        for (const x of tierGoods(b.city.tier + 1, s.era)) if (!cur.includes(x) && (b.city.stock[x] ?? 0) <= 0) short.push(x);
      }
      r.short = [...new Set(short)];
    }
    return r;
  });
  f.roads = eco.edges.filter(e => !e.ally).map(e => { const a = nodes.get(e.a)!, b = nodes.get(e.b)!; return [a.x, a.y, b.x, b.y] as [number, number, number, number]; }).filter(r => r.every(Number.isFinite));
  const st: Stock = {};
  for (const b of eco.buildings) if (isStore(b) && b.built) for (const [r, q] of Object.entries(b.stock) as [ResId, number][]) st[r] = (st[r] ?? 0) + q;
  f.stock = st;
}

/** Bâtiment réel d'un rival */
export const ecoBuilding = (f: Faction, id: number) => f.eco?.buildings.find(b => b.id === id);
/** Retire des marchandises des entrepôts d'un rival (commerce à la taverne) */
export function ecoTake(f: Faction, r: ResId, q: number) {
  let got = 0;
  for (const b of f.eco?.buildings ?? []) {
    if (got >= q || !isStore(b) || !b.built) continue;
    const t = Math.min(q - got, Math.floor(b.stock[r] ?? 0));
    if (t > 0) { b.stock[r]! -= t; got += t; }
  }
  if (f.stock) f.stock[r] = Math.max(0, (f.stock[r] ?? 0) - got);
  return got;
}
/** Ajoute des marchandises à l'entrepôt principal d'un rival */
export function ecoAdd(f: Faction, r: ResId, q: number) {
  const h = f.eco && hub(f.eco); if (!h) return;
  h.stock[r] = (h.stock[r] ?? 0) + q;
  if (f.stock) f.stock[r] = (f.stock[r] ?? 0) + q;
}

// ---------- Transfert de territoire (conquête) ----------
/** Ce qui tombe avec une ville : son entrepôt, toutes les exploitations et ateliers que desservent
 *  les lignes de la ville et de cet entrepôt (même loin), et les autres bâtiments de ses environs (pas les autres villes) */
export function cityDomain(eco: GameState, c: Building, r: number): Set<number> {
  const ids = new Set([c.id]);
  const ok = (b: Building) => !b.partner && b.type !== 'comptoir' && b.type !== 'poste' && !BUILD[b.type].wonder && b.type !== 'village';
  for (const b of eco.buildings) if (isStore(b) && ok(b) && dist(b, c) <= STORE_R && nearestCity(eco, b) === c) ids.add(b.id);
  const hubs = new Set(ids);
  for (const l of eco.lines) if (l.stops.some(st => hubs.has(st.bid))) for (const st of l.stops) {
    const b = eco.buildings.find(x => x.id === st.bid);
    if (b && ok(b) && !isStore(b)) ids.add(b.id);
  }
  for (const b of eco.buildings) if (ok(b) && !isStore(b) && dist(b, c) <= r) ids.add(b.id);
  return ids;
}

/** Fait passer des bâtiments d'une économie à l'autre (conquête), en état de marche :
 *  les routes de la zone (virages et carrefours compris), les lignes et leurs véhicules.
 *  Une route qui traverse la nouvelle frontière est partagée en deux au point de passage, sans coupure.
 *  Les routes de l'autre camp qu'empruntent les lignes de chacun restent utilisables (routes empruntées).
 *  `fromTag`/`toTag` : identifiant de chaque camp ('player' ou celui du rival). */
export function transfer(from: GameState, to: GameState, ids: Set<number>, area: { x: number; y: number; r: number }, fromTag: string, toTag: string) {
  const moved = from.buildings.filter(b => ids.has(b.id));
  if (!moved.length) return 0;
  from.buildings = from.buildings.filter(b => !ids.has(b.id));
  to.buildings.push(...moved);
  // nœuds de la zone : ceux des bâtiments conquis et les virages ou carrefours dans le rayon (pas ceux d'un autre bâtiment)
  const inside = (n: { x: number; y: number }) => Math.hypot(n.x - area.x, n.y - area.y) <= area.r;
  const keep = new Set(from.buildings.map(b => b.node).filter((n): n is number => n !== null));
  const zone = new Set(from.nodes.filter(n => !n.ally && (moved.some(b => b.node === n.id) || (inside(n) && n.b === undefined && !keep.has(n.id)))).map(n => n.id));
  const nodeOf = new Map(from.nodes.map(n => [n.id, n]));
  const edgesIn: Edge[] = [], edgesOut: Edge[] = [];
  for (const e of from.edges) {
    if (e.ally) { edgesOut.push(e); continue; }
    const ia = zone.has(e.a), ib = zone.has(e.b);
    if (ia && ib) { edgesIn.push(e); continue; }
    if (!ia && !ib) { edgesOut.push(e); continue; }
    // tronçon à cheval sur la frontière : chaque camp garde son bout, les deux bouts se rejoignent au même carrefour
    const A = nodeOf.get(ia ? e.a : e.b)!, B = nodeOf.get(ia ? e.b : e.a)!;
    const dx = B.x - A.x, dy = B.y - A.y, fx = A.x - area.x, fy = A.y - area.y;
    const qa = dx * dx + dy * dy, qb = 2 * (fx * dx + fy * dy), qc = fx * fx + fy * fy - area.r * area.r, disc = qb * qb - 4 * qa * qc;
    const t0 = qa > 0 && disc >= 0 ? (-qb + Math.sqrt(disc)) / (2 * qa) : 0.5;
    const t = Math.min(0.95, Math.max(0.05, t0 > 0 && t0 < 1 ? t0 : 0.5));
    const L = Math.hypot(dx, dy), id = to.nextId++;
    from.nodes.push({ id, x: A.x + dx * t, y: A.y + dy * t });
    edgesIn.push({ id: to.nextId++, a: A.id, b: id, type: e.type, len: L * t, bridges: 0 });
    edgesOut.push({ id: from.nextId++, a: id, b: B.id, type: e.type, len: L * (1 - t), bridges: e.bridges });
    zone.add(id); keep.add(id);
  }
  // le carrefour de frontière existe des deux côtés
  for (const n of from.nodes) if (zone.has(n.id) && keep.has(n.id)) to.nodes.push({ ...n });
  const inIds = new Set(edgesIn.map(e => e.id)), outIds = new Set(edgesOut.map(e => e.id));
  // les copies d'une route qui change de camp ne servent plus
  from.edges = edgesOut.filter(e => !(e.lent && e.ally === toTag && outIds.has(e.src!)));
  to.edges = [...to.edges.filter(e => !(e.lent && e.ally === fromTag && inIds.has(e.src!))), ...edgesIn];
  to.nodes.push(...from.nodes.filter(n => zone.has(n.id) && !keep.has(n.id)));
  from.nodes = from.nodes.filter(n => !zone.has(n.id) || keep.has(n.id));
  for (const n of to.nodes) if (n.b !== undefined && !to.buildings.some(b => b.id === n.b)) delete n.b;
  // lignes : entièrement conquises → transférées avec leurs véhicules ;
  // une exploitation conquise qui livrait un entrepôt resté de l'autre côté livre désormais l'entrepôt conquis ;
  // sinon les arrêts conquis sont retirés et la ligne continue sur le reste de son trajet
  const isSt = (id: number) => { const b = to.buildings.find(x => x.id === id) ?? from.buildings.find(x => x.id === id); return !!b && isStore(b); };
  const takenStores = moved.filter(isStore);
  const movedLines: Line[] = [];
  const dropLine = (l: Line) => { from.lines = from.lines.filter(x => x !== l); from.vehicles = from.vehicles.filter(v => v.line !== l.id); };
  for (const l of [...from.lines]) {
    const inL = l.stops.filter(st => ids.has(st.bid));
    if (!inL.length) continue;
    const outL = l.stops.filter(st => !ids.has(st.bid));
    if (outL.length && takenStores.length && outL.every(st => isSt(st.bid))) {
      const ref = moved.find(b => inL.some(st => st.bid === b.id && !isStore(b))) ?? takenStores[0];
      const w = takenStores.sort((a, z) => dist(a, ref) - dist(z, ref))[0];
      for (const st of outL) st.bid = w.id;
    }
    if (l.stops.every(st => ids.has(st.bid))) {
      if (new Set(l.stops.map(st => st.bid)).size < 2) { dropLine(l); continue; }
      from.lines = from.lines.filter(x => x !== l); to.lines.push(l); movedLines.push(l);
      const vs = from.vehicles.filter(v => v.line === l.id);
      from.vehicles = from.vehicles.filter(v => v.line !== l.id); to.vehicles.push(...vs);
      for (const v of vs) { v.state = 'lost'; v.timer = 0; }
    } else {
      l.stops = l.stops.filter(st => !ids.has(st.bid));
      if (new Set(l.stops.map(st => st.bid)).size < 2) dropLine(l);
    }
  }
  // routes empruntées : chaque ligne garde son itinéraire, même à travers les routes de l'autre camp
  const merged = { nodes: [...to.nodes, ...from.nodes.filter(n => !to.nodes.some(m => m.id === n.id))], edges: [...to.edges, ...from.edges].filter(e => !e.ally) } as GameState;
  const owner = new Map<number, 'to' | 'from'>();
  for (const e of to.edges) if (!e.ally) owner.set(e.id, 'to');
  for (const e of from.edges) if (!e.ally) owner.set(e.id, 'from');
  const trees = new Map<number, ReturnType<typeof dijkstra>>();
  const lend = (X: GameState, side: 'to' | 'from', tag: string, l: Line) => {
    const ns = l.stops.map(st => X.buildings.find(b => b.id === st.bid)?.node).filter((n): n is number => n != null);
    for (let i = 0; i < ns.length; i++) {
      const a = ns[i], b = ns[(i + 1) % ns.length]; if (a === b) continue;
      let tr = trees.get(a); if (!tr) { tr = dijkstra(merged, a); trees.set(a, tr); }
      if (!tr.dist.has(b)) continue;
      for (let cur = b; cur !== a;) {
        const p = tr.prev.get(cur)!; cur = p.n;
        const e = p.e; if (owner.get(e.id) === side) continue;
        if (X.edges.some(x => x.id === e.id || x.src === e.id)) continue;
        for (const id of [e.a, e.b]) if (!X.nodes.some(n => n.id === id)) { const n = merged.nodes.find(m => m.id === id)!; X.nodes.push({ id, x: n.x, y: n.y, ally: tag }); }
        X.edges.push({ id: e.id, a: e.a, b: e.b, type: e.type, len: e.len, bridges: e.bridges, ally: tag, src: e.id, lent: true });
      }
    }
  };
  for (const l of movedLines) lend(to, 'to', fromTag, l);
  for (const l of from.lines) lend(from, 'from', toTag, l);
  // convois de chantier vers les bâtiments perdus : annulés ; véhicules en route : nouvel itinéraire
  from.vehicles = from.vehicles.filter(v => !(v.line === -1 && (ids.has(v.target!) || ids.has(v.from!))));
  for (const v of [...from.vehicles, ...to.vehicles]) if (v.state === 'go') { v.state = 'lost'; v.timer = 0; }
  invalidate();
  return moved.length;
}

/** Routes empruntées : elles suivent leur propriétaire (revêtement, démolition) ; si le propriétaire disparaît, elles sont à toi */
export function syncLent(s: GameState) {
  const ownerOf = (tag: string) => tag === 'player' ? s : s.factions?.find(f => f.id === tag && !f.dead)?.eco;
  for (const st of [s, ...(s.factions ?? []).filter(f => f.eco && !f.dead).map(f => f.eco!)]) {
    let changed = false;
    for (const e of st.edges.filter(x => x.lent)) {
      const o = ownerOf(e.ally!);
      if (!o) { delete e.ally; delete e.lent; delete e.src; changed = true; continue; }
      const src = o.edges.find(x => x.id === e.src);
      if (src) { if (src.type !== e.type) { e.type = src.type; changed = true; } continue; }
      // tronçon disparu : gardé seulement si son propriétaire relie toujours ses deux bouts (un carrefour l'a coupé en deux)
      const has = (id: number) => o.nodes.some(n => n.id === id);
      if (has(e.a) && has(e.b) && !dijkstra(o, e.a).dist.has(e.b)) { st.edges = st.edges.filter(x => x !== e); changed = true; }
    }
    for (const n of st.nodes) if (n.ally && !ownerOf(n.ally)) { delete n.ally; changed = true; }
    if (changed) { invalidate(); for (const v of st.vehicles) if (v.state === 'go') { v.state = 'lost'; v.timer = 0; } }
  }
}

// ---------- Routes des alliés ----------
/** Tant que dure l'alliance, les routes d'un allié sont recopiées dans le réseau du joueur :
 *  on peut s'y raccorder et les emprunter, pas les démolir. Elles disparaissent si l'alliance est rompue. */
export function syncAllyRoads(s: GameState) {
  let changed = false;
  for (const f of s.factions ?? []) {
    const allied = !!f.alliance && !f.dead && !!f.eco;
    const mine = s.edges.filter(e => e.ally === f.id);
    if (!allied) {
      if (mine.some(e => !e.lent)) { s.edges = s.edges.filter(e => e.ally !== f.id || e.lent); changed = true; }
      continue;
    }
    const eco = f.eco!, srcs = new Set(eco.edges.map(e => e.id)), have = new Set(mine.map(e => e.src));
    // tronçons disparus chez l'allié
    if (mine.some(e => !e.lent && !srcs.has(e.src!))) { s.edges = s.edges.filter(e => e.ally !== f.id || e.lent || srcs.has(e.src!)); changed = true; }
    const nodes = new Map(eco.nodes.map(n => [n.id, n])), known = new Set(s.nodes.map(n => n.id));
    for (const e of eco.edges) {
      if (have.has(e.id) || e.ally) continue;
      for (const id of [e.a, e.b]) if (!known.has(id)) { const n = nodes.get(id)!; s.nodes.push({ id, x: n.x, y: n.y, ally: f.id }); known.add(id); }
      s.edges.push({ id: e.id, a: e.a, b: e.b, type: e.type, len: e.len, bridges: e.bridges, ally: f.id, src: e.id });
      changed = true;
    }
  }
  // nœuds alliés qui ne servent plus à rien
  const used = new Set(s.edges.flatMap(e => [e.a, e.b]));
  const before = s.nodes.length;
  s.nodes = s.nodes.filter(n => !n.ally || used.has(n.id));
  if (changed || s.nodes.length !== before) {
    invalidate();
    for (const v of s.vehicles) if (v.state === 'go') { v.state = 'lost'; v.timer = 0; }
  }
}

// ---------- Décisions mensuelles de l'ordinateur ----------
export interface Placer {
  free(f: Faction, x: number, y: number): boolean;
  freeDeposits(f: Faction, res: ResId): { x: number; y: number; dep: number; name: string }[];
  /** gisements de cette ressource qu'il ne peut pas exploiter : déjà exploités ou sur le territoire d'un autre camp (non allié) */
  blockedDeposits(f: Faction, res: ResId): { x: number; y: number; name: string; owner: 'player' | Faction }[];
  cityName(x: number, y: number): string;
}
let placer: Placer | null = null;
export function setPlacer(p: Placer) { placer = p; }
/** Un camp peut-il s'installer ici (terre libre) ? */
export const settleSpot = (f: Faction, x: number, y: number) => !!placer?.free(f, x, y);
/** Nom d'une nouvelle ville à cet endroit */
export const spotName = (x: number, y: number) => placer?.cityName(x, y) ?? 'Vicus Nortmannorum';

/** Entrepôt principal : celui de la capitale (la plus ancienne de ses villes) */
function hub(eco: GameState): Building | undefined {
  const cap = cities(eco).sort((a, z) => a.id - z.id)[0];
  return (cap && localStore(eco, cap)) ?? eco.buildings.find(b => isStore(b) && b.built);
}
/** Un entrepôt par ville : celui qui est à moins de STORE_R km d'elle (le plus proche) */
export const STORE_R = 15;
function localStore(eco: GameState, c: Building, builtOnly = true) {
  return eco.buildings.filter(b => isStore(b) && (b.built || !builtOnly) && dist(b, c) <= STORE_R).sort((a, z) => dist(a, c) - dist(z, c))[0];
}
/** Ville la plus proche d'un bâtiment */
const nearestCity = (eco: GameState, b: Building) => cities(eco).sort((a, z) => dist(a, b) - dist(z, b))[0];
/** Entrepôt qui sert un bâtiment : celui de sa ville (ou de la ville la plus proche pour une exploitation), sinon l'entrepôt principal */
function storeFor(eco: GameState, b: Building, linked: (a: Building, b: Building) => boolean, h: Building) {
  const ok = (w?: Building) => !!w && linked(w, b);
  if (b.city) {
    const w = localStore(eco, b);
    // tant que son entrepôt est vide, la ville reste servie par l'entrepôt principal
    return ok(w) && (w === h || (w!.stock.cereales ?? 0) >= 2) ? w! : linked(h, b) ? h : undefined;
  }
  for (const c of cities(eco).sort((a, z) => dist(a, b) - dist(z, b))) {
    const w = localStore(eco, c);
    if (ok(w)) return w!;
  }
  return linked(h, b) ? h : undefined;
}
/** Ce dont un entrepôt a besoin pour sa ville et ses ateliers */
function storeNeeds(eco: GameState, w: Building, linked: (a: Building, b: Building) => boolean, h: Building): Stock {
  const out: Stock = {};
  for (const c of cities(eco)) if (localStore(eco, c) === w) addCityDemand(eco, c, out);
  for (const b of eco.buildings) {
    const rc = BUILD[b.type].recipe; if (!rc || b.city || storeFor(eco, b, linked, h) !== w) continue;
    for (const [r, q] of Object.entries(rc.in) as [ResId, number][]) out[r] = (out[r] ?? 0) + q * LEVEL_MULT[b.level];
  }
  return out;
}

const producersOf = (eco: GameState, r: ResId) => (Object.keys(BUILD) as BType[]).filter(t => {
  const d = BUILD[t];
  return d.recipe?.out[r] && !d.hidden && !d.wonder && !d.coast && !d.river && d.era <= eco.era && (!d.tech || eco.techs.includes(d.tech));
}).sort((a, z) => (Object.values(BUILD[z].recipe!.out)[0] ?? 0) - (Object.values(BUILD[a].recipe!.out)[0] ?? 0));
const inputsOf = (eco: GameState, r: ResId) => eco.buildings.reduce((a, b) => a + (BUILD[b.type].recipe?.in[r] ?? 0) * LEVEL_MULT[b.level], 0);

/** Besoins mensuels d'une ville (et un peu des biens du palier suivant quand elle s'en approche) */
function addCityDemand(eco: GameState, c: Building, out: Stock) {
  for (const [r, q] of Object.entries(cityNeeds(c)) as [ResId, number][]) out[r] = (out[r] ?? 0) + q;
  const next = TIERS[c.city!.tier + 1];
  if (next && c.city!.pop >= next.minPop * 0.6) {
    const cur = tierGoods(c.city!.tier, eco.era);
    for (const r of tierGoods(c.city!.tier + 1, eco.era)) if (!cur.includes(r)) {
      const q = (next.needs[r] ?? 0) * c.city!.pop / 100;
      out[r] = (out[r] ?? 0) + q;
    }
  }
}
/** Besoins mensuels de toutes les villes */
function demand(eco: GameState): Stock {
  const out: Stock = {};
  for (const c of cities(eco)) addCityDemand(eco, c, out);
  return out;
}
/** Capacité installée (chantiers compris) */
function capacity(eco: GameState): Stock {
  const cap: Stock = {};
  for (const b of eco.buildings) {
    const rc = BUILD[b.type].recipe; if (!rc) continue;
    for (const [r, q] of Object.entries(rc.out) as [ResId, number][]) cap[r] = (cap[r] ?? 0) + q * LEVEL_MULT[b.level];
  }
  return cap;
}
/** Ce qui manque, du plus urgent au moins urgent */
function shortages(eco: GameState, need: Stock): ResId[] {
  const cap = capacity(eco), list: { r: ResId; p: number }[] = [];
  const deficit = (r: ResId, want: number) => want - (cap[r] ?? 0);
  const food = deficit('cereales', (need.cereales ?? 0) * 1.3 + 0.5);
  if (food > 0) list.push({ r: 'cereales', p: 100 + food });
  for (const r of ['bois', 'pierre'] as ResId[]) { const d = deficit(r, (need[r] ?? 0) + inputsOf(eco, r) + 2); if (d > 0) list.push({ r, p: 80 + d }); }
  for (const [r, q] of Object.entries(need) as [ResId, number][]) if (r !== 'cereales' && r !== 'bois' && r !== 'pierre') { const d = deficit(r, q * 1.1); if (d > 0) list.push({ r, p: 50 + d / Math.max(0.01, q) }); }
  for (const r of Object.keys(RES) as ResId[]) { const q = inputsOf(eco, r); if (q > 0 && deficit(r, q) > 0) list.push({ r, p: 30 }); }
  const seen = new Set<ResId>();
  return list.sort((a, z) => z.p - a.p).map(x => x.r).filter(r => RES[r].era <= eco.era && !seen.has(r) && seen.add(r));
}

/** Relie un bâtiment au réseau du rival par la route la moins chère possible ; faux si impossible */
function connect(f: Faction, geo: Geo, b: Building): boolean {
  const eco = f.eco!;
  attachNode(eco, b);
  const own = new Set(b.node !== null ? [b.node] : []);
  const cands = eco.nodes.filter(n => !own.has(n.id) && !n.ally && eco.edges.some(e => e.a === n.id || e.b === n.id)).sort((p, q) => dist(p, b) - dist(q, b)).slice(0, 8);
  if (!cands.length) return true;
  for (const n of cands) {
    const q = quoteSegment(geo, b.x, b.y, n.x, n.y, 'chemin', !!f.frontier);
    if (q.error || eco.money < q.cost) continue;
    // la route ne doit pas traverser le territoire du joueur ou d'un autre rival
    if (placer && [0.25, 0.5, 0.75].some(t => !placer!.free(f, b.x + (n.x - b.x) * t, b.y + (n.y - b.y) * t))) continue;
    addEdge(eco, b.node!, n.id, 'chemin', q.len, q.bridges);
    eco.money -= q.cost; eco.stats.expenses += q.cost;
    return true;
  }
  return false;
}

/** Un matériau est-il disponible : en stock, produit par un de ses ateliers ou acheté à Rome */
const canGet = (eco: GameState, r: ResId) => ROME_SELLS.includes(r) || eco.buildings.some(b => (b.built && BUILD[b.type].recipe?.out[r]) || (isStore(b) && (b.stock[r] ?? 0) >= 1));

/** Construit un bâtiment : vérifications, chantier, route ; null si impossible */
function build(s: GameState, f: Faction, geo: Geo, t: BType, x: number, y: number, name?: string): Building | null {
  const eco = f.eco!;
  if (!placer?.free(f, x, y)) return null;
  const chk = checkPlace(eco, geo, t, x, y);
  if (!chk.ok || (Object.keys(BUILD[t].cost) as ResId[]).some(r => !canGet(eco, r))) return null;
  if (eco.money < buildMoney(eco, t) + 150) return null;
  const b = place(eco, geo, t, x, y, name ?? (t === 'village' ? placer.cityName(x, y) : `${BUILD[t].name}${chk.depName && BUILD[t].deposit ? ' — ' + chk.depName : ''}`));
  if (!connect(f, geo, b)) { demolish(eco, b); eco.money += buildMoney(eco, t); return null; }
  return b;
}

/** Tous les gisements de r sont pris : il propose une alliance au camp qui exploite le plus proche (une fois par an et par camp).
 *  Au joueur, la demande s'affiche à l'écran ; un autre rival accepte si leurs relations le permettent. */
function askAlliance(s: GameState, f: Faction, r: ResId) {
  const eco = f.eco!, asked = (f.asked ??= {});
  const near = placer!.blockedDeposits(f, r).map(d => ({ d, dn: Math.min(...eco.nodes.map(n => dist(n, d))) })).sort((a, z) => a.dn - z.dn)[0]?.d;
  if (!near) return;
  const key = near.owner === 'player' ? 'player' : near.owner.id;
  if ((asked[key] ?? -1e9) > s.day - 365) return;
  asked[key] = s.day;
  if (near.owner === 'player') { if (!f.war && !f.alliance) f.wantAlly = near.name; return; }
  const o = near.owner;
  if ((f.foes ?? []).includes(o.id) || (o.foes ?? []).includes(f.id) || (o.rels?.[f.id] ?? 0) < 0) {
    s.log.unshift({ day: s.day, text: `Les ${o.name} refusent l'alliance que leur proposent les ${f.name}.` });
    return;
  }
  (f.allies ??= []).push(o.id); (o.allies ??= []).push(f.id);
  s.log.unshift({ day: s.day, text: `Les ${f.name} et les ${o.name} s'allient pour exploiter ensemble : ${near.name}.` });
}

/** Cherche où produire r : gisement libre le plus proche de son réseau (même loin : il y trace une route), sinon près d'une ville */
function tryBuild(s: GameState, f: Faction, geo: Geo, r: ResId, depth = 0): 'ok' | 'none' | 'wait' {
  const eco = f.eco!, cs = cities(eco);
  if (!cs.length || !placer) return 'none';
  for (const t of producersOf(eco, r)) {
    const d = BUILD[t];
    // un matériau de chantier qu'il n'a pas (des planches pour un élevage…) : il installe d'abord de quoi le produire
    const lack = (Object.keys(d.cost) as ResId[]).find(i => !canGet(eco, i));
    if (lack) { if (depth < 2) { const sub = tryBuild(s, f, geo, lack, depth + 1); if (sub !== 'none') return sub; } continue; }
    if (!d.deposit) {
      // atelier de transformation : seulement s'il produit déjà ses matières (sauf les biens de base, achetables)
      const miss = (Object.keys(d.recipe!.in) as ResId[]).find(i => !ROME_SELLS.includes(i) && !eco.buildings.some(b => BUILD[b.type].recipe?.out[i]));
      if (miss) { if (depth < 2) { const sub = tryBuild(s, f, geo, miss, depth + 1); if (sub !== 'none') return sub; } continue; }
      // près de ses villes (les plus grandes d'abord), au bord de l'eau s'il le faut
      for (const c of [...cs].sort((a, z) => z.city!.pop - a.city!.pop)) for (let k = 0; k < 40; k++) {
        const a = Math.random() * 6.283, rr = 3 + Math.random() * 12, x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr;
        if (d.needsWater && geo.waterDist(x, y) > WATER_RANGE) continue;
        if (build(s, f, geo, t, x, y)) return 'ok';
      }
      continue;
    }
    // gisement : les plus proches de son réseau d'abord, proches ou lointains
    const spots = d.deposit === 'cereales' ? [] : placer.freeDeposits(f, d.deposit)
      .map(p => ({ p, dn: Math.min(...cs.map(c => dist(c, p))) })).sort((a, z) => a.dn - z.dn).slice(0, 4);
    for (const { p } of spots) {
      // trop loin de ses villes pour y trouver des ouvriers : il fonde d'abord un village à côté, dès qu'il en a les moyens
      if (!cs.some(c => dist(c, p) <= workRange(c, eco) - 2)) {
        if (eco.money < 1500) return 'wait';
        for (let k = 0; k < 25; k++) {
          const a = Math.random() * 6.283, rr = 6 + Math.random() * 14, x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr;
          if (geo.waterDist(x, y) > WATER_RANGE || cs.some(c => dist(c, { x, y }) < 30)) continue;
          if (build(s, f, geo, 'village', x, y)) return 'ok';
        }
        continue;
      }
      if (build(s, f, geo, t, p.x, p.y, `${d.name} — ${p.name}`)) return 'ok';
    }
    // aucun gisement libre : il demande une alliance à celui qui l'exploite déjà
    if (d.deposit !== 'cereales' && !spots.length) askAlliance(s, f, d.deposit);
    // céréales : terres fertiles proches, sinon terres ordinaires autour des villes
    if (d.deposit === 'cereales') {
      for (const p of placer.freeDeposits(f, 'cereales').filter(p => cs.some(c => dist(c, p) <= workRange(c, eco) - 2)).slice(0, 4))
        if (build(s, f, geo, t, p.x, p.y, `${d.name} — ${p.name}`)) return 'ok';
      for (const c of [...cs].sort((a, z) => z.city!.pop - a.city!.pop)) for (let k = 0; k < 20; k++) {
        const a = Math.random() * 6.283, rr = 3 + Math.random() * Math.max(4, workRange(c, eco) - 8), x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr;
        if (build(s, f, geo, t, x, y)) return 'ok';
      }
    }
    // plus de place : il améliore un atelier existant, comme le joueur
    // seulement s'il a (ou produit) tous les matériaux de l'amélioration
    const up = eco.buildings.filter(b => b.type === t && b.built && !b.upgrading && levelAllowed(eco, b) && (Object.keys(upgradeCost(b)) as ResId[]).every(r => canGet(eco, r)))[0];
    if (up && !upgrade(eco, up)) return 'ok';
  }
  return 'none';
}

const lineOf = (eco: GameState, pred: (l: Line) => boolean) => eco.lines.find(pred);
function addLine(eco: GameState, stops: Line['stops'], vtype: VType = 'charrette') {
  const l: Line = { id: eco.nextId++, name: '', vtype, stops, color: '#888', moved: { cur: {}, prev: {} } };
  eco.lines.push(l);
  buyVehicle(eco, l.id);
  return l;
}
/** Ligne d'équilibrage entre l'entrepôt principal et celui d'une ville : [principal → ville → principal] */
const isBalance = (eco: GameState, l: Line) => l.stops.length === 4 && [0, 1].every(i => { const b = eco.buildings.find(x => x.id === l.stops[i].bid); return !!b && isStore(b); }) && l.stops[0].bid !== l.stops[1].bid;
/** Lignes de transport, autour d'un entrepôt par ville :
 *  exploitations → entrepôt de la ville la plus proche, entrepôt → ateliers de transformation → entrepôt,
 *  entrepôt → sa ville, et entre l'entrepôt principal et chaque entrepôt de ville (ce qui manque d'un côté, le surplus de l'autre) */
function manageLines(f: Faction) {
  const eco = f.eco!, h = hub(eco); if (!h || h.node === null) return;
  const comp = components(eco);
  const linked = (a: Building, b: Building) => a.node !== null && b.node !== null && comp.get(a.node) === comp.get(b.node);
  const byId = (id: number) => eco.buildings.find(x => x.id === id);
  // l'entrepôt d'une ligne change (entrepôt de ville achevé) : mêmes arrêts, même chariots, nouvel entrepôt
  const repoint = (l: Line, from: number, to: Building) => {
    for (const st of l.stops) if (st.bid === from) st.bid = to.id;
    for (const v of eco.vehicles) if (v.line === l.id && v.state === 'go') { v.state = 'lost'; v.timer = 0; }
  };
  // équilibrages qui ne partent plus de l'entrepôt principal (capitale perdue)
  for (const l of eco.lines.filter(x => isBalance(eco, x) && x.stops[0].bid !== h.id)) {
    for (const v of eco.vehicles.filter(x => x.line === l.id)) sellVehicle(eco, v);
    eco.lines = eco.lines.filter(x => x !== l);
  }
  for (const b of eco.buildings) {
    if (!b.built || isStore(b)) continue;
    const d = BUILD[b.type], w = storeFor(eco, b, linked, h);
    if (!w) continue;
    if (b.city) {
      // deux lignes par ville : les céréales d'un côté, les autres marchandises de l'autre
      // (un chariot plein de blé que la ville a déjà ne bloque pas le bois et la pierre)
      const goods = [...new Set([...tierGoods(b.city.tier, eco.era), ...(TIERS[b.city.tier + 1] ? tierGoods(b.city.tier + 1, eco.era) : [])])];
      // ce qui manque le plus à la ville passe en tête du chargement (le chariot est plein avant la fin de la liste)
      const fill = (r: ResId) => (b.city!.stock[r] ?? 0) / Math.max(0.05, cityNeeds(b)[r] ?? 0.05);
      for (const group of [['cereales'] as ResId[], goods.filter(r => r !== 'cereales').sort((a, z) => fill(a) - fill(z))]) {
        const res = group.filter(r => goods.includes(r)); if (!res.length) continue;
        // le chariot revient déposer à l'entrepôt ce que la ville n'a pas pris, puis repart avec un chargement frais
        const l = lineOf(eco, x => x.stops.length === 3 && x.stops[1].bid === b.id && !!byId(x.stops[0].bid) && isStore(byId(x.stops[0].bid)!) && (x.stops[0].res[0] === 'cereales') === (res[0] === 'cereales'));
        if (l) { if (l.stops[0].bid !== w.id) repoint(l, l.stops[0].bid, w); l.stops[0].res = res; }
        else if (res.some(r => (w.stock[r] ?? 0) >= 2)) addLine(eco, [{ bid: w.id, action: 'load', res }, { bid: b.id, action: 'unload', res: [] }, { bid: w.id, action: 'unload', res: [] }]);
      }
    } else if (d.recipe) {
      const mine = eco.lines.filter(l => l.stops.some(st => st.bid === b.id));
      if (mine.length) {
        for (const l of mine) for (const id of [...new Set(l.stops.map(st => st.bid))]) { const o = byId(id); if (o && isStore(o) && o !== w) repoint(l, id, w); }
        continue;
      }
      const outs = Object.keys(d.recipe.out) as ResId[], ins = Object.keys(d.recipe.in) as ResId[];
      if (ins.length) addLine(eco, [{ bid: w.id, action: 'load', res: ins }, { bid: b.id, action: 'unload', res: [] }, { bid: b.id, action: 'load', res: outs }, { bid: w.id, action: 'unload', res: [] }]);
      else addLine(eco, [{ bid: b.id, action: 'load', res: outs }, { bid: w.id, action: 'unload', res: [] }]);
    }
  }
  // entre l'entrepôt principal et ceux des villes : à l'aller ce qui manque à la ville, au retour son surplus
  for (const w of eco.buildings) {
    if (!isStore(w) || !w.built || w === h || !linked(w, h)) continue;
    const need = storeNeeds(eco, w, linked, h);
    const lack = (Object.keys(need) as ResId[]).filter(r => (need[r] ?? 0) > 0 && (w.stock[r] ?? 0) < (need[r] ?? 0) * 2 + 2 && (h.stock[r] ?? 0) >= 4)
      .sort((a, z) => (w.stock[a] ?? 0) / need[a]! - (w.stock[z] ?? 0) / need[z]!);
    const spare = (Object.keys(w.stock) as ResId[]).filter(r => (w.stock[r] ?? 0) > (need[r] ?? 0) * 3 + 5);
    const l = lineOf(eco, x => isBalance(eco, x) && x.stops[0].bid === h.id && x.stops[1].bid === w.id);
    if (l) { l.stops[0].res = lack; l.stops[2].res = spare; }
    else if (lack.length || spare.length) addLine(eco, [{ bid: h.id, action: 'load', res: lack }, { bid: w.id, action: 'unload', res: [] }, { bid: w.id, action: 'load', res: spare }, { bid: h.id, action: 'unload', res: [] }]);
  }
  // lignes vers des bâtiments disparus
  eco.lines = eco.lines.filter(l => l.stops.length >= 2 && l.stops.every(st => eco.buildings.some(b => b.id === st.bid)));
  const lids = new Set(eco.lines.map(l => l.id));
  eco.vehicles = eco.vehicles.filter(v => v.line === -1 || lids.has(v.line));
}
/** Véhicules : il en ajoute quand une ligne n'arrive pas à suivre (le stock s'accumule d'un mois sur l'autre),
 *  en revend quand ils attendent à vide ; jamais plus que ce que son réseau justifie */
function manageVehicles(f: Faction) {
  const eco = f.eco!, h = hub(eco); if (!h) return;
  const fleetMax = 4 + eco.buildings.filter(b => b.built && (b.city || BUILD[b.type].recipe)).length * 2;
  let fleet = eco.vehicles.filter(v => v.line !== -1).length;
  for (const l of eco.lines) {
    if (Math.random() < 0.35) continue; // il ne regarde pas toutes ses lignes chaque mois
    const vs = eco.vehicles.filter(v => v.line === l.id), first = eco.buildings.find(b => b.id === l.stops[0].bid);
    const target = eco.buildings.find(b => b.id === l.stops[1].bid);
    if (!first || !target) continue;
    const memo = (l as Line & { last?: number }), idle = vs.filter(v => v.state === 'load' && cargoTotal(v.cargo) < 1).length;
    let level = 0, more = false, less = false;
    if (!isStore(first)) {
      // atelier → entrepôt : sa production s'entasse ?
      const r = l.stops[0].res[0], cap = BUILD[first.type].storage * first.level;
      level = first.stock[r] ?? 0;
      more = level >= cap * 0.3 && level > (memo.last ?? 0) && idle === 0;
      less = level < 2 && idle >= 2;
    } else if (target.city) {
      // entrepôt → ville : elle manque d'un bien que l'entrepôt possède, et tous les chariots sont en route ?
      const q = (r: ResId) => Math.max(0.3, cityNeeds(target)[r] ?? 0);
      more = l.stops[0].res.some(r => (target.city!.stock[r] ?? 0) < q(r) * 2 && (first.stock[r] ?? 0) >= 4) && idle === 0;
      less = idle >= 2;
    } else if (isStore(target)) {
      // entrepôt principal ↔ entrepôt d'une ville : il manque quelque chose là-bas, ou le surplus s'y entasse
      level = l.stops[2].res.reduce((a, r) => a + (target.stock[r] ?? 0), 0);
      const full = Object.values(target.stock).reduce((a, q) => a + (q ?? 0), 0) >= BUILD[target.type].storage * target.level * 0.8;
      more = idle === 0 && (l.stops[0].res.length > 0 || full || (level > 20 && level > (memo.last ?? 0)));
      less = idle >= 2;
    } else {
      // entrepôt → atelier de transformation → entrepôt
      const outs = Object.keys(BUILD[target.type].recipe?.out ?? {}) as ResId[];
      level = outs.reduce((a, r) => a + (target.stock[r] ?? 0), 0);
      more = level >= BUILD[target.type].storage * target.level * 0.3 && level > (memo.last ?? 0) && idle === 0;
      less = idle >= 2;
    }
    memo.last = level;
    if (more && vs.length < MAX_VEH_PER_LINE && fleet < fleetMax && eco.money > VEH[l.vtype].price + 300) { if (!buyVehicle(eco, l.id)) fleet++; }
    else if (less && vs.length > 1) { const v = vs.find(x => x.state === 'load' && cargoTotal(x.cargo) < 1); if (v) { sellVehicle(eco, v); fleet--; } }
  }
}
/** Biens de base achetés aux marchands romains quand l'entrepôt en manque ; surplus revendu sur place */
function manageStock(f: Faction, need: Stock) {
  const eco = f.eco!, h = hub(eco); if (!h) return;
  // il n'achète que ce que ses ateliers ne fournissent pas assez
  const want: Stock = { cereales: (need.cereales ?? 0) * 2, bois: Math.max(RESERVE.bois!, (need.bois ?? 0) * 2), pierre: Math.max(RESERVE.pierre!, (need.pierre ?? 0) * 2) };
  const room = () => BUILD[h.type].storage * h.level - Object.values(h.stock).reduce((a, q) => a + (q ?? 0), 0);
  for (const r of ROME_SELLS) {
    const lack = Math.ceil((want[r] ?? 0) - (h.stock[r] ?? 0)), price = RES[r].price * IMPORT_MULT;
    const q = Math.min(lack, Math.floor(eco.money * 0.25 / price), Math.floor(room()));
    if (q >= 1) { h.stock[r] = (h.stock[r] ?? 0) + q; eco.money -= q * price; eco.stats.expenses += q * price; }
  }
  // il exporte son surplus (ce qui dépasse six mois de besoins et la réserve de chantier),
  // à 90 % du prix : l'équivalent des ventes du joueur aux postes-frontières, transport compris
  const months = room() < BUILD[h.type].storage * h.level * 0.25 ? 3 : 6;
  for (const r of Object.keys(h.stock) as ResId[]) {
    const keep = Math.max(15, ((need[r] ?? 0) + inputsOf(eco, r)) * months + (RESERVE[r] ?? 0) * 1.5);
    const q = Math.floor((h.stock[r] ?? 0) - keep);
    if (q > 5) { h.stock[r]! -= q; const g = q * RES[r].price * EXPORT; eco.money += g; eco.stats.income += g; }
  }
  // entrepôt presque plein : il l'agrandit
  if (room() < BUILD[h.type].storage * h.level * 0.2 && levelAllowed(eco, h) && !h.upgrading) upgrade(eco, h);
  // entrepôts des villes : un entrepôt plein ne reçoit plus rien et bloque ses exploitations ;
  // il vend sur place ce qui dépasse largement les besoins de sa ville et de ses ateliers, et s'agrandit
  const comp = components(eco), linked = (a: Building, b: Building) => a.node !== null && b.node !== null && comp.get(a.node) === comp.get(b.node);
  for (const w of eco.buildings) {
    if (!isStore(w) || !w.built || w === h) continue;
    const cap = BUILD[w.type].storage * w.level, used = () => Object.values(w.stock).reduce((a, q) => a + (q ?? 0), 0);
    if (used() < cap * 0.75) continue;
    const ns = storeNeeds(eco, w, linked, h);
    for (const r of Object.keys(w.stock) as ResId[]) {
      const q = Math.floor((w.stock[r] ?? 0) - Math.max(20, (ns[r] ?? 0) * 6));
      if (q > 5) { w.stock[r]! -= q; const g = q * RES[r].price * EXPORT; eco.money += g; eco.stats.income += g; }
    }
    if (used() >= cap * 0.75 && levelAllowed(eco, w) && !w.upgrading) upgrade(eco, w);
  }
}

/** Commerce entre rivaux : il achète à un rival qui en a en trop ce qui manque à ses villes ou à ses ateliers.
 *  Prix de base +20 %, plus le transport au kilomètre ; livré par la route au bout du temps de trajet. */
const TRADE_KM = 0.02;
function rivalTrade(s: GameState, f: Faction, need: Stock) {
  const eco = f.eco!, h = hub(eco); if (!h) return;
  // arrivages
  for (const sh of (eco.inbound ?? []).filter(x => x.day <= s.day)) h.stock[sh.r] = (h.stock[sh.r] ?? 0) + sh.q;
  eco.inbound = (eco.inbound ?? []).filter(x => x.day > s.day);
  const coming = (r: ResId) => (eco.inbound ?? []).filter(x => x.r === r).reduce((a, x) => a + x.q, 0);
  const wants = (Object.keys(RES) as ResId[]).filter(r => !ROME_SELLS.includes(r) && ((need[r] ?? 0) > 0 || inputsOf(eco, r) > 0));
  for (const r of wants) {
    // au moins un lot de 5 t : même un tout petit besoin (le sel d'un village qui devient bourg) se commande
    const lack = Math.max(5, ((need[r] ?? 0) + inputsOf(eco, r)) * 3) - (h.stock[r] ?? 0) - coming(r);
    if (lack < 1) continue;
    const sellers = (s.factions ?? []).filter(o => o !== f && o.eco && !o.dead && !(o.foes ?? []).includes(f.id) && !(f.foes ?? []).includes(o.id))
      .map(o => ({ o, oh: hub(o.eco!) })).filter((x): x is { o: Faction; oh: Building } => !!x.oh)
      .sort((a, z) => dist(a.oh, h) - dist(z.oh, h));
    for (const { o, oh } of sellers) {
      const own = demand(o.eco!), keep = ((own[r] ?? 0) + inputsOf(o.eco!, r)) * 4 + 5;
      const spare = Math.floor((oh.stock[r] ?? 0) - keep);
      if (spare < 1) continue;
      const d = dist(oh, h), price = RES[r].price * 1.2 + d * TRADE_KM * RES[r].price / 4 + d * TRADE_KM;
      const q = Math.min(Math.ceil(lack), spare, Math.floor(eco.money * 0.3 / price));
      if (q < 1) continue;
      oh.stock[r]! -= q; eco.money -= q * price; eco.stats.expenses += q * price;
      o.eco!.money += q * price; o.money = o.eco!.money; o.eco!.stats.income += q * price;
      (eco.inbound ??= []).push({ r, q, day: s.day + Math.max(3, d / VEH.charrette.speed), from: o.id });
      break;
    }
  }
}

/** Un mois de décisions pour un rival */
export function rivalMonth(s: GameState, geo: Geo, f: Faction) {
  const eco = f.eco; if (!eco) return;
  eco.techs = f.techs ?? []; eco.era = rivalEra(f); eco.money = f.money;
  const need = demand(eco);
  rivalTrade(s, f, need);
  manageStock(f, need);
  manageLines(f);
  // petites erreurs de gestion, comme un joueur : certains mois il est distrait (rien de neuf),
  // il réagit en retard sur ses lignes, ou ne choisit pas toujours le chantier le plus urgent
  const distracted = Math.random() < 0.2;
  if (!distracted) manageVehicles(f);
  // chantiers : pas plus de deux à la fois (trois en mode ambitieux), comme un joueur prudent
  // amélioration bloquée (un matériau qu'il n'a pas, ou qui n'arrive pas depuis deux ans) : il y renonce,
  // sinon elle occuperait pour toujours une de ses places de chantier
  for (const b of eco.buildings) {
    if (!b.upgrading || b.repair) continue;
    b.upSince ??= s.day;
    const waiting = (Object.keys(b.need) as ResId[]).filter(r => (b.need[r] ?? 0) - (b.incoming[r] ?? 0) > 0.5);
    if (waiting.length && (waiting.some(r => !canGet(eco, r)) || s.day - b.upSince > 2 * 365)) { b.upgrading = false; b.need = {}; b.incoming = {}; b.work = 0; b.upSince = undefined; }
  }
  const sites = eco.buildings.filter(b => !b.built || b.upgrading).length;
  const maxSites = s.difficulty === 'ambitieux' ? 3 : 2;
  let started = 0;
  // Moyen Âge : un relais routier près de chaque ville entretient ses routes
  if (!distracted && eco.era >= 3 && eco.techs.includes('relais')) for (const c of cities(eco)) {
    if (sites + started >= maxSites || eco.buildings.some(b => b.type === 'relais' && dist(b, c) <= 20)) continue;
    for (let k = 0; k < 20; k++) {
      const a = Math.random() * 6.283, rr = 3 + Math.random() * 8;
      if (build(s, f, geo, 'relais', c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr)) { started++; break; }
    }
  }
  // chaque ville a son entrepôt, d'où partent les lignes de la ville et de ses exploitations
  if (!distracted) for (const c of cities(eco)) {
    if (sites + started >= maxSites || localStore(eco, c, false)) continue;
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * 6.283, rr = 2 + Math.random() * 5;
      if (build(s, f, geo, 'entrepot', c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, `Entrepôt de ${c.name}`)) { started++; break; }
    }
  }
  // chaque ville se nourrit d'abord de ses propres fermes (un village lointain ne vit pas du blé de la capitale)
  if (!distracted) for (const c of cities(eco)) {
    if (sites + started >= maxSites) break;
    const want = (cityNeeds(c).cereales ?? 0) * 1.2 + 0.3, range = workRange(c, eco) - 4;
    const local = eco.buildings.filter(b => BUILD[b.type].recipe?.out.cereales && dist(b, c) <= range)
      .reduce((a, b) => a + BUILD[b.type].recipe!.out.cereales! * LEVEL_MULT[b.level], 0);
    if (local >= want) continue;
    const t = producersOf(eco, 'cereales')[0]; if (!t) continue;
    const fertile = placer?.freeDeposits(f, 'cereales').filter(p => dist(c, p) <= range) ?? [];
    let ok = fertile.slice(0, 3).some(p => !!build(s, f, geo, t, p.x, p.y, `${BUILD[t].name} — ${p.name}`));
    for (let k = 0; k < 20 && !ok; k++) {
      const a = Math.random() * 6.283, rr = 3 + Math.random() * Math.max(4, range - 4);
      ok = !!build(s, f, geo, t, c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr);
    }
    if (ok) started++;
  }
  const todo = shortages(eco, need);
  if (todo.length > 1 && Math.random() < 0.3) [todo[0], todo[1]] = [todo[1], todo[0]];
  if (sites + started < maxSites && !distracted) for (const r of todo) {
    const res = tryBuild(s, f, geo, r);
    if (res === 'ok' && ++started + sites >= maxSites) break;
    if (res === 'wait') break;
  }
  // nouvelle ville quand les existantes prospèrent
  const cs = cities(eco), big = Math.max(0, ...cs.map(c => c.city!.pop));
  if (!distracted && started + sites < maxSites && cs.length < 6 && big >= 350 * cs.length && cs.every(c => c.city!.growing) && eco.money > 900 && Math.random() < 0.3) {
    const from = cs[Math.floor(Math.random() * cs.length)];
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * 6.283, rr = 40 + Math.random() * 50, x = from.x + Math.cos(a) * rr, y = from.y + Math.sin(a) * rr;
      if (geo.waterDist(x, y) > WATER_RANGE || cs.some(c => dist(c, { x, y }) < 35)) continue;
      if (build(s, f, geo, 'village', x, y)) break;
    }
  }
  f.money = eco.money;
  syncView(s, f);
}
