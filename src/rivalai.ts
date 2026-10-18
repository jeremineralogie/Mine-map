// Rivaux : chacun a sa propre économie complète, simulée par le même moteur que le joueur
// (bâtiments, chantiers livrés par convois, routes, lignes, véhicules, ouvriers, besoins des villes,
// croissance, salaires et entretien). L'ordinateur ne fait que donner les ordres d'un joueur :
// construire, tracer une route, créer une ligne, acheter ou revendre un véhicule.
import { BUILD, DIFFICULTY, IMPORT_MULT, LEVEL_MULT, RES, START_MONEY, START_STOCK, TIERS, TIER_NEEDS_2, VEH, WATER_RANGE, WORK_RANGES, type BType, type ResId, type VType } from './defs';
import type { Geo } from './geo';
import { addEdge, components, invalidate, quoteSegment } from './roads';
import {
  Sim, attachNode, buildMoney, buyVehicle, checkPlace, cities, cityNeeds, demolish, isStore, maxLevelAllowed, place, sellVehicle, tierGoods, upgrade, workRange,
  type Notifier,
} from './sim';
import { cargoTotal, type Building, type Faction, type GameState, type Line, type RBuilding, type Stock } from './state';

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
    eco.money = f.money; eco.era = s.era; eco.techs = f.techs ?? [];
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
  f.roads = eco.edges.map(e => { const a = nodes.get(e.a)!, b = nodes.get(e.b)!; return [a.x, a.y, b.x, b.y] as [number, number, number, number]; }).filter(r => r.every(Number.isFinite));
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
/** Fait passer des bâtiments d'une économie à l'autre, avec les routes entre eux, les lignes qui ne desservent qu'eux et leurs véhicules */
export function transfer(from: GameState, to: GameState, ids: Set<number>) {
  const moved = from.buildings.filter(b => ids.has(b.id));
  if (!moved.length) return 0;
  from.buildings = from.buildings.filter(b => !ids.has(b.id));
  to.buildings.push(...moved);
  const nodeIds = new Set(moved.map(b => b.node).filter((n): n is number => n !== null));
  // routes entre deux bâtiments conquis (ou carrefours reliés uniquement à eux) : elles changent de main
  const edgesIn = from.edges.filter(e => nodeIds.has(e.a) && nodeIds.has(e.b));
  from.edges = from.edges.filter(e => !(nodeIds.has(e.a) && nodeIds.has(e.b)));
  // routes coupées par la nouvelle frontière : abandonnées
  from.edges = from.edges.filter(e => !nodeIds.has(e.a) && !nodeIds.has(e.b));
  to.nodes.push(...from.nodes.filter(n => nodeIds.has(n.id)));
  from.nodes = from.nodes.filter(n => !nodeIds.has(n.id));
  to.edges.push(...edgesIn);
  for (const n of to.nodes) if (n.b !== undefined && !to.buildings.some(b => b.id === n.b)) delete n.b;
  // lignes : entièrement conquises → transférées avec leurs véhicules ; à cheval → les arrêts conquis sont retirés
  for (const l of [...from.lines]) {
    const inside = l.stops.filter(st => ids.has(st.bid)).length;
    if (!inside) continue;
    if (inside === l.stops.length) {
      from.lines = from.lines.filter(x => x !== l); to.lines.push(l);
      const vs = from.vehicles.filter(v => v.line === l.id);
      from.vehicles = from.vehicles.filter(v => v.line !== l.id); to.vehicles.push(...vs);
      for (const v of vs) { v.state = 'lost'; v.timer = 0; }
    } else {
      l.stops = l.stops.filter(st => !ids.has(st.bid));
      if (l.stops.length < 2) { from.lines = from.lines.filter(x => x !== l); from.vehicles = from.vehicles.filter(v => v.line !== l.id); }
    }
  }
  // convois de chantier vers les bâtiments perdus : annulés
  from.vehicles = from.vehicles.filter(v => !(v.line === -1 && (ids.has(v.target!) || ids.has(v.from!))));
  invalidate();
  return moved.length;
}

// ---------- Décisions mensuelles de l'ordinateur ----------
export interface Placer {
  free(f: Faction, x: number, y: number): boolean;
  freeDeposits(f: Faction, res: ResId): { x: number; y: number; dep: number; name: string }[];
  cityName(x: number, y: number): string;
}
let placer: Placer | null = null;
export function setPlacer(p: Placer) { placer = p; }

/** Entrepôt principal (celui de la capitale) */
function hub(eco: GameState): Building | undefined {
  const stores = eco.buildings.filter(b => isStore(b) && b.built);
  const cap = cities(eco).sort((a, z) => z.city!.pop - a.city!.pop)[0];
  return cap ? stores.sort((a, z) => dist(a, cap) - dist(z, cap))[0] : stores[0];
}
const producersOf = (eco: GameState, r: ResId) => (Object.keys(BUILD) as BType[]).filter(t => {
  const d = BUILD[t];
  return d.recipe?.out[r] && !d.hidden && !d.wonder && !d.coast && !d.river && d.era <= eco.era && (!d.tech || eco.techs.includes(d.tech));
}).sort((a, z) => (Object.values(BUILD[z].recipe!.out)[0] ?? 0) - (Object.values(BUILD[a].recipe!.out)[0] ?? 0));
const inputsOf = (eco: GameState, r: ResId) => eco.buildings.reduce((a, b) => a + (BUILD[b.type].recipe?.in[r] ?? 0) * LEVEL_MULT[b.level], 0);

/** Besoins mensuels des villes (et un peu des biens du palier suivant quand elles s'en approchent) */
function demand(eco: GameState): Stock {
  const out: Stock = {};
  for (const c of cities(eco)) {
    for (const [r, q] of Object.entries(cityNeeds(c)) as [ResId, number][]) out[r] = (out[r] ?? 0) + q;
    const next = TIERS[c.city!.tier + 1];
    if (next && c.city!.pop >= next.minPop * 0.6) {
      const cur = tierGoods(c.city!.tier, eco.era);
      for (const r of tierGoods(c.city!.tier + 1, eco.era)) if (!cur.includes(r)) {
        const q = ((next.needs[r] ?? 0) + (eco.era >= 2 ? TIER_NEEDS_2[c.city!.tier + 1]?.[r] ?? 0 : 0)) * c.city!.pop / 100;
        out[r] = (out[r] ?? 0) + q;
      }
    }
  }
  return out;
}
/** Capacité installée (chantiers compris) */
function capacity(eco: GameState): Stock {
  const cap: Stock = {};
  for (const b of eco.buildings) {
    const rc = BUILD[b.type].recipe; if (!rc) continue;
    for (const [r, q] of Object.entries(rc.out) as [ResId, number][]) cap[r] = (cap[r] ?? 0) + q * LEVEL_MULT[b.level] * (b.dep === null && BUILD[b.type].deposit ? b.rich : 1);
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
  const cands = eco.nodes.filter(n => !own.has(n.id) && eco.edges.some(e => e.a === n.id || e.b === n.id)).sort((p, q) => dist(p, b) - dist(q, b)).slice(0, 8);
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

/** Construit un bâtiment : vérifications, chantier, route ; null si impossible */
function build(s: GameState, f: Faction, geo: Geo, t: BType, x: number, y: number, name?: string): Building | null {
  const eco = f.eco!;
  if (!placer?.free(f, x, y)) return null;
  const chk = checkPlace(eco, geo, t, x, y);
  if (!chk.ok) return null;
  if (eco.money < buildMoney(eco, t) + 150) return null;
  const b = place(eco, geo, t, x, y, name ?? (t === 'village' ? placer.cityName(x, y) : `${BUILD[t].name}${chk.depName && BUILD[t].deposit ? ' — ' + chk.depName : ''}`));
  if (!connect(f, geo, b)) { demolish(eco, b); eco.money += buildMoney(eco, t); return null; }
  return b;
}

/** Cherche où produire r : gisement libre le plus proche de son réseau (même loin : il y trace une route), sinon près d'une ville */
function tryBuild(s: GameState, f: Faction, geo: Geo, r: ResId, depth = 0): 'ok' | 'none' | 'wait' {
  const eco = f.eco!, cs = cities(eco);
  if (!cs.length || !placer) return 'none';
  for (const t of producersOf(eco, r)) {
    const d = BUILD[t];
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
    // gisement : les plus proches de son réseau d'abord, même hors de son territoire
    const spots = d.deposit === 'cereales' ? [] : placer.freeDeposits(f, d.deposit)
      .map(p => ({ p, dn: Math.min(...eco.nodes.map(n => dist(n, p))) })).filter(o => o.dn < 260).sort((a, z) => a.dn - z.dn).slice(0, 4);
    for (const { p } of spots) {
      // trop loin de ses villes pour y trouver des ouvriers : il y fonde d'abord un village,
      // mais seulement quand sa capitale est assez grande pour fournir des colons et qu'il en a les moyens
      if (!cs.some(c => dist(c, p) <= workRange(c, eco) - 2)) {
        if (Math.max(...cs.map(c => c.city!.pop)) < 300 || eco.money < 1500) continue;
        for (let k = 0; k < 25; k++) {
          const a = Math.random() * 6.283, rr = 6 + Math.random() * 14, x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr;
          if (geo.waterDist(x, y) > WATER_RANGE || cs.some(c => dist(c, { x, y }) < 30)) continue;
          if (build(s, f, geo, 'village', x, y)) return 'ok';
        }
        continue;
      }
      if (build(s, f, geo, t, p.x, p.y, `${d.name} — ${p.name}`)) return 'ok';
    }
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
    const up = eco.buildings.filter(b => b.type === t && b.built && !b.upgrading && b.level < Math.min(BUILD[t].maxLevel, maxLevelAllowed(eco)))[0];
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
/** Lignes de transport : ateliers → entrepôt, entrepôt → ateliers de transformation → entrepôt, entrepôt → villes */
function manageLines(f: Faction) {
  const eco = f.eco!, h = hub(eco); if (!h || h.node === null) return;
  const comp = components(eco), linked = (b: Building) => b.node !== null && comp.get(b.node) === comp.get(h.node!);
  const stops = (b: Building) => eco.lines.filter(l => l.stops.some(st => st.bid === b.id));
  for (const b of eco.buildings) {
    if (!b.built || b === h || !linked(b)) continue;
    const d = BUILD[b.type];
    if (b.city) {
      // deux lignes par ville : les céréales d'un côté, les autres marchandises de l'autre
      // (un chariot plein de blé que la ville a déjà ne bloque pas le bois et la pierre)
      const goods = [...new Set([...tierGoods(b.city.tier, eco.era), ...(TIERS[b.city.tier + 1] ? tierGoods(b.city.tier + 1, eco.era) : [])])];
      for (const group of [['cereales'] as ResId[], goods.filter(r => r !== 'cereales')]) {
        const res = group.filter(r => goods.includes(r)); if (!res.length) continue;
        // le chariot revient déposer à l'entrepôt ce que la ville n'a pas pris, puis repart avec un chargement frais
        const l = lineOf(eco, x => x.stops.length === 3 && x.stops[0].bid === h.id && x.stops[1].bid === b.id && (x.stops[0].res[0] === 'cereales') === (res[0] === 'cereales'));
        if (l) l.stops[0].res = res;
        else if (res.some(r => (h.stock[r] ?? 0) >= 2)) addLine(eco, [{ bid: h.id, action: 'load', res }, { bid: b.id, action: 'unload', res: [] }, { bid: h.id, action: 'unload', res: [] }]);
      }
    } else if (d.recipe && !stops(b).length) {
      const outs = Object.keys(d.recipe.out) as ResId[], ins = Object.keys(d.recipe.in) as ResId[];
      if (ins.length) addLine(eco, [{ bid: h.id, action: 'load', res: ins }, { bid: b.id, action: 'unload', res: [] }, { bid: b.id, action: 'load', res: outs }, { bid: h.id, action: 'unload', res: [] }]);
      else addLine(eco, [{ bid: b.id, action: 'load', res: outs }, { bid: h.id, action: 'unload', res: [] }]);
    }
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
    const vs = eco.vehicles.filter(v => v.line === l.id), first = eco.buildings.find(b => b.id === l.stops[0].bid);
    const target = eco.buildings.find(b => b.id === l.stops[1].bid);
    if (!first || !target) continue;
    const memo = (l as Line & { last?: number }), idle = vs.filter(v => v.state === 'load' && cargoTotal(v.cargo) < 1).length;
    let level = 0, more = false, less = false;
    if (first !== h) {
      // atelier → entrepôt : sa production s'entasse ?
      const r = l.stops[0].res[0], cap = BUILD[first.type].storage * first.level;
      level = first.stock[r] ?? 0;
      more = level >= cap * 0.3 && level > (memo.last ?? 0) && idle === 0;
      less = level < 2 && idle >= 2;
    } else if (target.city) {
      // entrepôt → ville : elle manque d'un bien que l'entrepôt possède, et tous les chariots sont en route ?
      const q = (r: ResId) => Math.max(0.3, cityNeeds(target)[r] ?? 0);
      more = l.stops[0].res.some(r => (target.city!.stock[r] ?? 0) < q(r) * 2 && (h.stock[r] ?? 0) >= 4) && idle === 0;
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
  if (room() < BUILD[h.type].storage * h.level * 0.2 && h.level < Math.min(BUILD[h.type].maxLevel, maxLevelAllowed(eco)) && !h.upgrading) upgrade(eco, h);
}

/** Un mois de décisions pour un rival */
export function rivalMonth(s: GameState, geo: Geo, f: Faction) {
  const eco = f.eco; if (!eco) return;
  eco.techs = f.techs ?? []; eco.era = s.era; eco.money = f.money;
  const need = demand(eco);
  manageStock(f, need);
  manageLines(f);
  manageVehicles(f);
  // chantiers : pas plus de deux à la fois (trois en mode ambitieux), comme un joueur prudent
  const sites = eco.buildings.filter(b => !b.built || b.upgrading).length;
  const maxSites = s.difficulty === 'ambitieux' ? 3 : 2;
  let started = 0;
  if (sites < maxSites) for (const r of shortages(eco, need)) {
    const res = tryBuild(s, f, geo, r);
    if (res === 'ok' && ++started + sites >= maxSites) break;
    if (res === 'wait') break;
  }
  // nouvelle ville quand les existantes prospèrent
  const cs = cities(eco), big = Math.max(0, ...cs.map(c => c.city!.pop));
  if (started + sites < maxSites && cs.length < 6 && big >= 350 * cs.length && cs.every(c => c.city!.growing) && eco.money > 900 && Math.random() < 0.3) {
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
