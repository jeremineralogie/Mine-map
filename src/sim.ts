// Simulation : production, chantiers, main-d'œuvre, villes, véhicules, marché, objectifs, événements.
import {
  ANCIENT, BUILD, EVENTS, SPARE_NAMES, IMPORT_MULT, LOCAL_SALE, SEA_PARTNERS, type SeaPartner, LEVEL_COST, LEVEL_MONEY, LEVEL_DAYS, LEVEL_MULT, OBJECTIVES, PARTNERS, RES, START_MONEY, START_STOCK,
  START_YEAR, TECHS, TIERS, TIER_NEEDS_2, OLD_NEEDS_MULT, RHINE, CITY_BUILD_RANGE, VEH, WAGE, WATER_RANGE, WORK_RANGE, WORK_RANGES, type BType, type ResId, type VType,
  RP_TIER,
} from './defs';
import type { Geo } from './geo';
import { addNode, components, dijkstra, findPath, invalidate, nodeById, roadKm } from './roads';
import { depOwner, monthlyRivals, rivalAt, rivalTooClose } from './rivals';
import { monthlyWar, warStep } from './war';
import { stepRivals } from './rivalai';
import { monthlyDiplomacy, tavernAccepts, tavernSell, tradeFaction } from './diplomacy';
import { addFlow, cargoTotal, type Building, type GameState, type Stock, type Vehicle } from './state';

export const MONTH = 30.4375;
export const YEAR = 365.25;
/** 1 heure de jeu = 10 ans à vitesse ×1 */
export const DAYS_PER_SEC = (10 * YEAR) / 3600;

export interface Notifier { toast(text: string, kind?: 'info' | 'good' | 'bad'): void; event(title: string, text: string): void; chapter(): void; gameOver(text?: string): void; ask?(title: string, text: string, yes: () => void): void; choose?(title: string, text: string, options: { label: string; fn: () => void }[]): void; }

// ---------- Création ----------
export function newGame(geo: Geo): GameState {
  const s: GameState = {
    version: 3, day: 0, money: START_MONEY, rp: 0, era: 1, techs: [], nextId: 1,
    nodes: [], edges: [], buildings: [], lines: [], vehicles: [], extracted: {},
    stats: { produced: {}, food: 0, sold: {}, soldMonth: {}, income: 0, expenses: 0 },
    objectives: [], events: [], mods: [], market: {}, negMonths: 0, over: false, chapterDone: false, factions: [], difficulty: 'equilibre',
    log: [], ledger: [],
  };
  for (const p of PARTNERS) {
    const [x, y] = geo.proj(p.lon, p.lat);
    const b = makeBuilding(s, 'poste', x, y, p.name);
    b.built = true; b.partner = p.id;
    attachNode(s, b);
  }
  return s;
}

function makeBuilding(s: GameState, type: BType, x: number, y: number, name: string): Building {
  const b: Building = {
    id: s.nextId++, type, x, y, name, level: 1, built: false, need: { ...BUILD[type].cost }, incoming: {}, work: 0,
    upgrading: false, stock: {}, acc: 0, staff: 0, rich: 1, dep: null, node: null, produced: 0,
  };
  s.buildings.push(b);
  return b;
}

export function attachNode(s: GameState, b: Building) {
  if (b.node !== null) return nodeById(s, b.node)!;
  const n = addNode(s, b.x, b.y, b.id);
  b.node = n.id;
  return n;
}

export const year = (s: GameState) => { const y = START_YEAR + Math.floor(s.day / YEAR); return y >= 0 ? y + 1 : y; };
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export function dateLabel(s: GameState, short = false) {
  const y = year(s), m = Math.floor((s.day % YEAR) / (YEAR / 12));
  const mo = short && MONTHS[m].length > 5 ? MONTHS[m].slice(0, MONTHS[m] === 'juillet' ? 5 : 4) + '.' : MONTHS[m];
  return `${mo} ${y < 0 ? -y + (short ? ' av. J.C.' : ' av. J.-C.') : y + (short ? '' : ' apr. J.-C.')}`;
}
export const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');

export const hasTech = (s: GameState, t?: string) => !t || s.techs.includes(t);
export const getB = (s: GameState, id: number) => s.buildings.find(b => b.id === id);
/** Bâtiments qui stockent toutes les ressources */
export const isStore = (b: Building) => b.type === 'entrepot' || b.type === 'port' || b.type === 'port_mer';
export const cities = (s: GameState) => s.buildings.filter(b => b.type === 'village' && b.built && b.city);

// ---------- Placement ----------
export interface PlaceCheck { ok: boolean; reason?: string; rich?: number; depName?: string; water?: boolean; }

export function hasWater(s: GameState, geo: Geo, x: number, y: number) {
  if (geo.waterDist(x, y) <= WATER_RANGE) return true;
  return s.buildings.some(b => b.built && BUILD[b.type].waterRange && Math.hypot(b.x - x, b.y - y) <= BUILD[b.type].waterRange!);
}

export function checkPlace(s: GameState, geo: Geo, type: BType, x: number, y: number, free = false): PlaceCheck {
  const d = BUILD[type];
  if (!geo.isFrance(x, y) && !(s.abroad && geo.maskAt(x, y) === 2)) return { ok: false, reason: 'Il faut construire en France, sur la terre ferme.' };
  if (d.site) {
    const [sx, sy] = geo.proj(d.site[0], d.site[1]);
    if (Math.hypot(sx - x, sy - y) > 6) return { ok: false, reason: 'Ce monument doit être bâti sur son site historique (marqué sur la carte).' };
    if (s.buildings.some(b => b.type === type)) return { ok: false, reason: 'Déjà construit.' };
  }
  if (s.buildings.some(b => Math.hypot(b.x - x, b.y - y) < 2.5) || rivalTooClose(s, x, y)) return { ok: false, reason: 'Trop près d\'un autre bâtiment.' };
  // territoire d'un rival : on ne peut pas y construire (sauf alliance, plus tard à la taverne)
  const owner = rivalAt(s, x, y);
  if (owner && !free && !owner.alliance) return { ok: false, reason: `Territoire des ${owner.name} : impossible d'y construire sans alliance.` };
  if (!free && s.money < buildMoney(s, type)) return { ok: false, reason: `Pas assez d'argent (${fmt(buildMoney(s, type))} sesterces).` };
  const r: PlaceCheck = { ok: true, rich: 1 };
  if (d.deposit) {
    const { dep } = geo.richness(d.deposit, x, y);
    // une ferme rend partout à 100 %, sur des terres fertiles comme ordinaires
    if (d.deposit === 'cereales') { r.rich = 1; r.depName = dep?.name ?? 'Terres ordinaires'; }
    else if (!dep) return { ok: false, reason: `Il faut un gisement de ${RES[d.deposit].name.toLowerCase()} (calque Gisements).` };
    else if (depOwner(s, dep.id) && !depOwner(s, dep.id)!.alliance) return { ok: false, reason: `Ce gisement est déjà exploité par les ${depOwner(s, dep.id)!.name}.` };
    else { r.rich = 1; r.depName = dep.name; } // même rendement partout dans le gisement
  }
  if (type === 'taverne' && s.buildings.some(b => b.type === 'taverne' && Math.hypot(b.x - x, b.y - y) < 12))
    return { ok: false, reason: 'Une seule taverne par ville : il y en a déjà une tout près.' };
  if (d.city && !cities(s).some(c => Math.hypot(c.x - x, c.y - y) <= CITY_BUILD_RANGE))
    return { ok: false, reason: `${d.name} : à construire à moins de ${CITY_BUILD_RANGE} km d'une ville.` };
  if (d.coast) {
    if (!geo.nearSea(x, y, 3)) return { ok: false, reason: `${d.name} : à construire sur la côte (à moins de 3 km de la mer).` };
    r.depName = geo.seaOf(x, y) === 'mediterranee' ? 'Méditerranée' : 'Atlantique et Manche';
  }
  if (d.river) {
    const n = geo.nearestNav(x, y, 3);
    if (!n) return { ok: false, reason: 'Un port fluvial doit être construit au bord d\'un grand fleuve navigable (à moins de 3 km).' };
    r.depName = n.name || 'fleuve';
  }
  if (d.needsWater) {
    r.water = hasWater(s, geo, x, y);
    if (!r.water) return { ok: false, reason: `Pas d'eau : il faut être à moins de ${WATER_RANGE} km d'un fleuve, d'un lac ou de la côte (ou près d'un aqueduc).` };
  }
  return r;
}

export function suggestName(s: GameState, geo: Geo, type: BType, x: number, y: number) {
  if (type === 'village') {
    let best = '', bd = 30;
    for (const [n, lo, la] of ANCIENT) {
      const [ax, ay] = geo.proj(lo, la), d = Math.hypot(ax - x, ay - y);
      if (d < bd && !s.buildings.some(b => b.name === n)) { bd = d; best = n; }
    }
    if (best) return best;
    // aucun lieu antique libre à proximité : un nom de réserve jamais utilisé
    const used = new Set(s.buildings.map(b => b.name));
    const spare = SPARE_NAMES.find(n => !used.has(n));
    if (spare) return spare;
    let i = 1; while (used.has('Vicus ' + i)) i++;
    return 'Vicus ' + i;
  }
  const d = BUILD[type];
  if (d.deposit && d.deposit !== 'cereales') { const r = geo.richness(d.deposit, x, y); if (r.dep) return `${d.name} — ${r.dep.name}`; }
  if (d.coast) { const c = nearestCity(s, x, y); return c ? `Port de commerce de ${c.name}` : `Port de commerce (${geo.seaOf(x, y) === 'mediterranee' ? 'Méditerranée' : 'Atlantique'})`; }
  if (d.river) {
    const c = nearestCity(s, x, y), n = geo.nearestNav(x, y, 3);
    if (c) return `Port de ${c.name}`;
    if (n?.name) return `Port fluvial (${n.name})`;
  }
  const near = nearestCity(s, x, y);
  return near ? `${d.name} de ${near.name}` : d.name;
}

function nearestCity(s: GameState, x: number, y: number) {
  let best: Building | null = null, bd = 60;
  for (const c of cities(s)) { const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = c; } }
  return best;
}

export function place(s: GameState, geo: Geo, type: BType, x: number, y: number, name: string, free = false) {
  const d = BUILD[type];
  const b = makeBuilding(s, type, x, y, name);
  if (!free) { const m = buildMoney(s, type); s.money -= m; s.stats.expenses += m; b.need = scaleStock(d.cost, costMult(s)); }
  if (d.deposit) {
    const { dep } = geo.richness(d.deposit, x, y);
    b.rich = 1; b.dep = dep ? dep.id : null;
  }
  if (free) { b.built = true; b.need = {}; }
  if (d.coast) b.sea = geo.seaOf(x, y);
  if (type === 'village') b.city = { pop: 80, stock: { cereales: 12, bois: 6 }, sat: 1, foodSat: 1, tier: 0 };
  return b;
}

export function upgrade(s: GameState, b: Building) {
  const d = BUILD[b.type];
  const next = b.level + 1;
  const cost = Math.round(d.money * LEVEL_MONEY[next] * costMult(s));
  if (s.money < cost) return `Pas assez d'argent (${fmt(cost)}).`;
  s.money -= cost; s.stats.expenses += cost;
  b.upgrading = true; b.work = 0;
  b.need = scaleStock(upgradeCost(b), costMult(s));
  return null;
}
/** Matériaux nécessaires pour passer au niveau suivant */
export function upgradeCost(b: Building): Stock {
  const d = BUILD[b.type], next = b.level + 1, out: Stock = {};
  if (d.upgrade) for (const [r, q] of Object.entries(d.upgrade)) out[r as ResId] = Math.ceil(q! * (next >= 3 ? 1.5 : 1));
  else for (const [r, q] of Object.entries(d.cost)) out[r as ResId] = Math.ceil(q! * LEVEL_COST[next]);
  return out;
}
/** Rayon de main-d'œuvre d'une ville (il grandit avec elle) */
export const workRange = (c: Building, s?: GameState) => (WORK_RANGES[c.city?.tier ?? 0] ?? WORK_RANGE) + (s?.techs.includes('cite_prospere') ? 15 : 0);
export function maxLevelAllowed(s: GameState) { return s.techs.includes('urbanisme') ? 3 : s.techs.includes('metallurgie') ? 2 : 1; }

export function demolish(s: GameState, b: Building) {
  if (b.type === 'poste' || b.type === 'comptoir') return;
  s.buildings = s.buildings.filter(x => x.id !== b.id);
  // le nœud routier reste comme simple carrefour s'il est relié, sinon il disparaît
  if (b.node !== null) {
    const n = nodeById(s, b.node);
    if (n) { delete n.b; if (!s.edges.some(e => e.a === n.id || e.b === n.id)) s.nodes = s.nodes.filter(x => x.id !== n.id); }
  }
  for (const l of s.lines) l.stops = l.stops.filter(st => st.bid !== b.id);
  s.vehicles = s.vehicles.filter(v => !(v.line === -1 && v.target === b.id));
  invalidate();
}

// ---------- Véhicules et lignes ----------
export function buyVehicle(s: GameState, lineId: number) {
  const l = s.lines.find(x => x.id === lineId); if (!l || !l.stops.length) return 'La ligne n\'a pas d\'arrêt.';
  const d = VEH[l.vtype];
  if (s.money < d.price) return 'Pas assez d\'argent.';
  const b = getB(s, l.stops[0].bid); if (!b) return 'Arrêt introuvable.';
  s.money -= d.price; s.stats.expenses += d.price;
  const v = newVehicle(s, l.vtype, l.id, b);
  v.state = l.stops[0].action;
  s.vehicles.push(v);
  return null;
}
function newVehicle(s: GameState, type: VType, line: number, at: Building): Vehicle {
  return { id: s.nextId++, type, line, stop: 0, cargo: {}, state: line === -1 ? 'go' : 'load', path: [], speeds: [], seg: 0, segPos: 0, timer: 0, x: at.x, y: at.y, angle: 0, at: at.id, income: 0 };
}
export function sellVehicle(s: GameState, v: Vehicle) {
  s.vehicles = s.vehicles.filter(x => x.id !== v.id);
  const p = Math.round(VEH[v.type].price * 0.5); s.money += p;
}

// ---------- Prix ----------
function partnerMods(s: GameState, pid: string) {
  let closed = false, mult = 1;
  for (const m of s.mods) if (m.partner === pid && m.until > s.day) { if (m.kind === 'closed') closed = true; if (m.kind === 'boost') mult *= m.mult; }
  return { closed, mult };
}
export function priceAt(s: GameState, b: Building, res: ResId) {
  const base = RES[res].price * (s.market[b.id + ':' + res] ?? 1) * priceMult(s);
  if (b.partner) { const p = PARTNERS.find(x => x.id === b.partner)!; return base * p.mult * partnerMods(s, p.id).mult * (s.techs.includes('negoce') ? 1.2 : 1); }
  return base * (1 + 0.1 * (b.city?.tier ?? 0)) * demandMult(s, res);
}
/** Merveilles construites dont le rayon couvre ce point */
const wondersNear = (s: GameState, x: number, y: number, key: 'range' | 'prodRange') =>
  s.buildings.filter(w => w.built && BUILD[w.type].wonder && Math.hypot(w.x - x, w.y - y) <= BUILD[w.type].wonder![key]);
/** Réduction de consommation d'une ville grâce aux merveilles proches */
export const wonderNeedMult = (s: GameState, b: Building) => wondersNear(s, b.x, b.y, 'range').reduce((a, w) => a * BUILD[w.type].wonder!.needMult, 1);
/** Bonus de production d'un atelier grâce aux merveilles proches */
export const wonderProdMult = (s: GameState, b: Building) => wondersNear(s, b.x, b.y, 'prodRange').filter(w => BUILD[w.type].wonder!.prodTypes.includes(b.type)).reduce((a, w) => a * BUILD[w.type].wonder!.prodMult, 1);
/** Stock minimal qu'une ville accepte pour chaque bien dont elle a besoin (en tonnes) */
export const CITY_MIN_STOCK = 10;
/** Réserve de céréales d'une ville, en mois de consommation */
export function foodReserve(b: Building) {
  const q = cityNeeds(b).cereales ?? 0;
  return q > 0 ? (b.city!.stock.cereales ?? 0) / q : 99;
}
/** Biens du palier suivant qui manquent encore à la ville (sa croissance est bloquée juste avant le palier) */
export function missingNextGoods(b: Building): ResId[] {
  const c = b.city!, next = TIERS[c.tier + 1], era = c.era ?? 1;
  if (!next || c.pop < next.minPop * 0.94) return [];
  const cur = tierGoods(c.tier, era);
  return tierGoods(c.tier + 1, era).filter(r => !cur.includes(r) && (c.stock[r] ?? 0) <= 0);
}
/** Ce qui manque à une ville : besoins actuels sans stock, puis biens du palier suivant */
export function cityShortages(b: Building): ResId[] {
  const c = b.city!, cur = (Object.keys(cityNeeds(b)) as ResId[]).filter(r => r !== 'cereales' && (c.stock[r] ?? 0) < 0.5);
  return [...new Set([...cur, ...missingNextGoods(b)])];
}
const manque = (rs: ResId[]) => rs.map(r => `Manque ${RES[r].name.toLowerCase()}`).join(' · ');
/** Une ville ne grandit que si elle est nourrie, garde au moins un mois de céréales d'avance
 *  et reçoit au moins ce qu'elle mange (elle ne grandit pas en vidant sa réserve) */
export const RESERVE_TO_GROW = 1;
export function cityNeeds(b: Building): Stock {
  const c = b.city!; const t = TIERS[c.tier], out: Stock = {}, k = c.pop / 100 * (c.needMult ?? 1);
  // dès qu'elle reçoit les produits de la Gaule romaine, la ville consomme moins des anciens
  const old = c.modern ? OLD_NEEDS_MULT : 1;
  for (const [r, q] of Object.entries(t.needs)) out[r as ResId] = q! * k * old;
  if ((c.era ?? 1) >= 2) for (const [r, q] of Object.entries(TIER_NEEDS_2[c.tier] ?? {})) out[r as ResId] = (out[r as ResId] ?? 0) + q! * k;
  return out;
}
/** Biens demandés par un palier de ville à une époque donnée */
export function tierGoods(tier: number, era: number): ResId[] {
  const g = Object.keys(TIERS[tier]?.needs ?? {}) as ResId[];
  if (era >= 2) g.push(...(Object.keys(TIER_NEEDS_2[tier] ?? {}) as ResId[]));
  return [...new Set(g)];
}
/** Le palier suivant est-il accessible ? (la capitale demande une technologie) */
export const tierAllowed = (s: GameState, tier: number) => tier < 4 || s.techs.includes('capitales');
/** Quantité qu'un bâtiment accepte de recevoir */
export function accepts(s: GameState, b: Building, res: ResId): number {
  const d = BUILD[b.type];
  if (b.city) {
    const need = cityNeeds(b)[res] ?? 0;
    // la ville achète aussi un peu des biens du palier suivant pour pouvoir y accéder
    const era = b.city.era ?? 1, nextT = TIERS[b.city.tier + 1];
    const nextQ = nextT ? (nextT.needs[res] ?? 0) + (era >= 2 ? TIER_NEEDS_2[b.city.tier + 1]?.[res] ?? 0 : 0) : 0;
    const future = nextQ && !tierGoods(b.city.tier, era).includes(res) ? nextQ * b.city.pop / 100 : 0;
    if (need + future <= 0) return 0;
    // réserve d'un an au plus, mais toujours de quoi recevoir au moins deux chargements complets
    const cap = Math.max((need + future) * 12, CITY_MIN_STOCK);
    return Math.max(0, cap - (b.city.stock[res] ?? 0));
  }
  if (b.partner) {
    const p = PARTNERS.find(x => x.id === b.partner)!;
    if (!p.buys.includes(res) || partnerMods(s, p.id).closed) return 0;
    return Math.max(0, partnerVolume(s, p.id) - (s.stats.soldMonth[p.id] ?? 0));
  }
  if (b.type === 'taverne' && b.built) return tavernAccepts(s, b, res);
  if (b.type === 'comptoir') {
    const p = SEA_PARTNERS.find(x => x.id === b.sp);
    if (!p || !p.buys.includes(res)) return 0;
    return Math.max(0, seaVolume(s, p) - (s.stats.soldMonth['mer:' + p.id] ?? 0));
  }
  // chantier : accepte les matériaux qui lui manquent encore (livrés par une ligne)
  if (!b.built || b.upgrading) {
    const left = (b.need[res] ?? 0) - (b.incoming[res] ?? 0);
    if (left > 0) return left;
    if (!b.built) return 0;
  }
  if (isStore(b)) {
    const total = Object.values(b.stock).reduce((a, q) => a + (q ?? 0), 0);
    return Math.max(0, d.storage * b.level - total);
  }
  if (d.recipe && d.recipe.in[res]) return Math.max(0, d.storage * b.level - (b.stock[res] ?? 0));
  return 0;
}

function deliver(s: GameState, b: Building, res: ResId, qty: number, v: Vehicle | null) {
  if (qty <= 0) return;
  if (b.city || b.partner) {
    const price = priceAt(s, b, res), gain = price * qty;
    s.money += gain; s.stats.income += gain; if (v) v.income += gain;
    const key = b.id + ':' + res;
    s.market[key] = Math.max(0.4, (s.market[key] ?? 1) * (1 - (b.partner ? 0.012 : 0.004) * qty));
    if (b.city) { b.city.stock[res] = (b.city.stock[res] ?? 0) + qty; const got = b.city.got ??= {}; got[res] = (got[res] ?? 0) + qty; if (res === 'cereales') s.stats.food += qty; }
    else { s.stats.sold[b.partner!] = (s.stats.sold[b.partner!] ?? 0) + qty; s.stats.soldMonth[b.partner!] = (s.stats.soldMonth[b.partner!] ?? 0) + qty; }
  } else if (b.type === 'taverne' && b.built) {
    const g = tavernSell(s, b, res, qty); if (v) v.income += g;
  } else if (b.type === 'comptoir') {
    // vente outre-mer, dans la limite du volume mensuel du partenaire
    const p = SEA_PARTNERS.find(x => x.id === b.sp)!;
    const gain = seaPrice(s, b, p, res) * qty;
    s.money += gain; s.stats.income += gain; if (v) v.income += gain;
    const k = 'mer:' + p.id;
    s.stats.soldMonth[k] = (s.stats.soldMonth[k] ?? 0) + qty; s.stats.sold[k] = (s.stats.sold[k] ?? 0) + qty;
    s.market[k + ':' + res] = Math.max(0.4, (s.market[k + ':' + res] ?? 1) * (1 - 0.01 * qty));
  } else if ((!b.built || b.upgrading) && (b.need[res] ?? 0) > 0) {
    // matériaux livrés directement sur le chantier
    const used = Math.min(qty, b.need[res]!);
    b.need[res]! -= used; if (b.need[res]! <= 0.001) delete b.need[res];
    if (qty > used) { b.stock[res] = (b.stock[res] ?? 0) + qty - used; }
  } else { b.stock[res] = (b.stock[res] ?? 0) + qty; addFlow(b, 'in', res, qty); }
}

// ---------- Effets temporaires (événements historiques) ----------
export const activeMods = (s: GameState) => s.mods.filter(m => m.until > s.day);
/** Multiplicateur de coût des constructions et améliorations (remise en cours) */
export const costMult = (s: GameState) => activeMods(s).filter(m => m.kind === 'discount').reduce((a, m) => a * m.mult, 1);
export const prodMult = (s: GameState, res?: ResId) => activeMods(s).filter(m => m.kind === 'prod' && (!m.res || (res && m.res.includes(res)))).reduce((a, m) => a * m.mult, 1);
/** Crise monétaire : tous les prix de vente multipliés */
export const priceMult = (s: GameState) => activeMods(s).filter(m => m.kind === 'prices').reduce((a, m) => a * m.mult, 1);
export const demandMult = (s: GameState, res: ResId) => activeMods(s).filter(m => m.kind === 'demand' && m.res?.includes(res)).reduce((a, m) => a * m.mult, 1);
/** Coût en argent d'une construction, remise comprise */
export const buildMoney = (s: GameState, type: BType) => Math.round(BUILD[type].money * costMult(s));
export function scaleStock(c: Stock, k: number): Stock { const o: Stock = {}; for (const [r, q] of Object.entries(c)) o[r as ResId] = Math.ceil(q! * k); return o; }

// ---------- Commerce ----------
export function partnerVolume(s: GameState, pid: string) { return PARTNERS.find(p => p.id === pid)!.volume * (s.techs.includes('monnaie') ? 2 : 1); }
export const partnerClosed = (s: GameState, pid: string) => partnerMods(s, pid).closed;
/** Prix d'achat d'une ressource importée à un poste-frontière */
export function importPrice(s: GameState, b: Building, res: ResId) {
  const p = RES[res].price * IMPORT_MULT * (s.market['imp:' + b.id + ':' + res] ?? 1) * (s.techs.includes('negoce') ? 0.9 : 1);
  // un marchand ne revend jamais moins cher qu'il ne rachète
  const buys = PARTNERS.find(x => x.id === b.partner)!.buys.includes(res);
  return buys ? Math.max(p, priceAt(s, b, res) * 1.15) : p;
}
/** Achète des marchandises à l'étranger : elles arrivent dans le stock du poste-frontière */
export function buyImport(s: GameState, b: Building, res: ResId, qty: number): string | null {
  if (partnerClosed(s, b.partner!)) return 'Frontière fermée pour le moment.';
  const room = BUILD.poste.storage - Object.values(b.stock).reduce((a, q) => a + (q ?? 0), 0);
  qty = Math.min(qty, Math.floor(room));
  if (qty <= 0) return 'Le poste-frontière est plein : fais d\'abord enlever les marchandises.';
  const cost = importPrice(s, b, res) * qty;
  if (s.money < cost) return `Pas assez d'argent (${fmt(cost)} sesterces).`;
  s.money -= cost; s.stats.expenses += cost;
  b.stock[res] = (b.stock[res] ?? 0) + qty;
  const k = 'imp:' + b.id + ':' + res; s.market[k] = Math.min(1.6, (s.market[k] ?? 1) * (1 + 0.008 * qty));
  return null;
}
/** Prix de vente à un marchand local depuis un entrepôt */
export function localPrice(s: GameState, res: ResId) {
  return RES[res].price * LOCAL_SALE * (s.techs.includes('monnaie') ? 1.25 : 1) * (s.market['local:' + res] ?? 1) * priceMult(s);
}
export function sellLocal(s: GameState, b: Building, res: ResId, qty: number) {
  qty = Math.min(qty, Math.floor(b.stock[res] ?? 0));
  if (qty <= 0) return 0;
  const gain = localPrice(s, res) * qty;
  b.stock[res]! -= qty; addFlow(b, 'out', res, qty);
  s.money += gain; s.stats.income += gain;
  const k = 'local:' + res; s.market[k] = Math.max(0.4, (s.market[k] ?? 1) * (1 - 0.006 * qty));
  return gain;
}

// ---------- Commerce maritime ----------
/** Comptoir maritime d'un partenaire sur une mer donnée */
export const comptoirOf = (s: GameState, pid: string, sea: string) => s.buildings.find(b => b.type === 'comptoir' && b.sp === pid && b.sea === sea);
/** Avec le négoce maritime, chaque partenaire d'outre-mer a son comptoir au large, sur chaque mer qu'il borde */
export function ensureComptoirs(s: GameState, geo: Geo) {
  if (!s.techs.includes('negoce_maritime')) return 0;
  let n = 0;
  for (const p of SEA_PARTNERS) for (const sea of p.seas) {
    if (comptoirOf(s, p.id, sea)) continue;
    const [lon, lat] = p.to[sea]!, [x, y] = geo.nearestSea(...geo.proj(lon, lat));
    const b = makeBuilding(s, 'comptoir', x, y, p.name);
    b.built = true; b.need = {}; b.sp = p.id; b.sea = sea; n++;
  }
  return n;
}
export function seaPartnersOf(s: GameState, b: Building): SeaPartner[] {
  const sea = b.sea ?? 'atlantique';
  void s; return SEA_PARTNERS.filter(p => p.seas.includes(sea));
}
export function seaVolume(s: GameState, p: SeaPartner) {
  const phares = Math.min(2, s.buildings.filter(b => b.type === 'phare' && b.built).length);
  return Math.round(p.volume * (s.techs.includes('monnaie') ? 2 : 1) * (1 + 0.25 * phares));
}
export function seaPrice(s: GameState, b: Building, p: SeaPartner, res: ResId) {
  void b; return RES[res].price * p.mult * (s.market['mer:' + p.id + ':' + res] ?? 1) * (s.techs.includes('negoce') ? 1.2 : 1) * priceMult(s);
}
/** Prix d'une importation par la mer (toujours plus cher que ce que le partenaire rachète) */
export function seaImportPrice(s: GameState, b: Building, p: SeaPartner, res: ResId) {
  const base = RES[res].price * IMPORT_MULT * (s.market['imp:mer:' + p.id + ':' + res] ?? 1) * (s.techs.includes('negoce') ? 0.9 : 1);
  return p.buys.includes(res) ? Math.max(base, seaPrice(s, b, p, res) * 1.15) : base;
}
export function buySea(s: GameState, b: Building, pid: string, res: ResId, qty: number): string | null {
  const p = SEA_PARTNERS.find(x => x.id === pid)!;
  const room = BUILD[b.type].storage * b.level - Object.values(b.stock).reduce((a, q) => a + (q ?? 0), 0);
  qty = Math.min(qty, Math.floor(room));
  if (qty <= 0) return b.type === 'comptoir' ? 'Le comptoir est plein : envoie un navire chercher les marchandises.' : 'Le port est plein.';
  const cost = seaImportPrice(s, b, p, res) * qty;
  if (s.money < cost) return `Pas assez d'argent (${fmt(cost)} sesterces).`;
  s.money -= cost; s.stats.expenses += cost;
  b.stock[res] = (b.stock[res] ?? 0) + qty; addFlow(b, 'in', res, qty);
  const k = 'imp:mer:' + p.id + ':' + res; s.market[k] = Math.min(1.6, (s.market[k] ?? 1) * (1 + 0.008 * qty));
  return null;
}

// ---------- Boucle ----------
export class Sim {
  s: GameState;
  private dispatchTimer = 0;
  constructor(state: GameState, public geo: Geo, public notify: Notifier) { this.s = state; ensureComptoirs(state, geo); }

  step(dtDays: number) {
    const s = this.s;
    if (s.over) return;
    const m0 = Math.floor(s.day / MONTH);
    s.day += dtDays;
    this.staffing();
    this.construction(dtDays);
    this.production(dtDays);
    this.consumption(dtDays);
    this.vehicles(dtDays);
    if (!s.ai) { warStep(s, this.geo, dtDays, this.notify); stepRivals(s, this.geo, dtDays); }
    this.dispatchTimer -= dtDays;
    if (this.dispatchTimer <= 0) { this.dispatchTimer = 1; this.dispatchConvoys(); }
    if (Math.floor(s.day / MONTH) !== m0) this.monthly();
  }

  // ----- Main-d'œuvre -----
  staffing() {
    const s = this.s, cs = cities(s);
    const avail = new Map<number, number>();
    for (const c of cs) {
      avail.set(c.id, Math.floor(c.city!.pop * 0.4));
      const city = c.city!;
      city.needMult = wonderNeedMult(s, c); city.era = s.era;
      city.modern = s.era >= 2 && Object.keys(TIER_NEEDS_2[city.tier] ?? {}).some(r => (city.stock[r as ResId] ?? 0) >= 0.5);
    }
    const jobs = s.buildings.filter(b => b.built && !b.paused && !b.damaged && BUILD[b.type].workers);
    const near = new Map(jobs.map(b => [b.id, cs.map(c => ({ c, d: Math.hypot(c.x - b.x, c.y - b.y) })).filter(o => o.d <= workRange(o.c, s)).sort((a, z) => a.d - z.d)]));
    const take = (b: Building, want: number) => {
      for (const { c } of near.get(b.id)!) {
        const a = avail.get(c.id)!, t = Math.min(a, want);
        b.staff += t; want -= t; avail.set(c.id, a - t);
        if (want <= 0) break;
      }
    };
    for (const b of s.buildings) b.staff = 0;
    // 1) chaque atelier reçoit d'abord les ouvriers dont il a besoin
    for (const b of jobs) take(b, this.workersNeeded(b));
    // 2) les villes qui ont des bras en trop renforcent les ateliers voisins (jusqu'à +50 % d'équipe)
    for (const b of jobs) if (BUILD[b.type].recipe) take(b, Math.ceil(this.workersNeeded(b) * 1.5) - b.staff);
  }
  workersNeeded(b: Building) { return Math.round(BUILD[b.type].workers * (b.level === 1 ? 1 : 1 + 0.5 * (b.level - 1))); }

  // ----- Chantiers -----
  construction(dt: number) {
    const s = this.s;
    for (const b of s.buildings) {
      if ((b.built && !b.upgrading) || b.paused) continue;   // chantier en pause : les travaux s'arrêtent
      // amélioration : le bâtiment utilise d'abord ce qu'il a lui-même produit (bûches d'un camp de bûcherons…)
      if (b.upgrading) for (const r of Object.keys(b.need) as ResId[]) {
        const free = Math.max(0, (b.need[r] ?? 0) - (b.incoming[r] ?? 0)), own = Math.floor(b.stock[r] ?? 0), t = Math.min(free, own);
        if (t > 0) { b.stock[r]! -= t; addFlow(b, 'out', r, t); b.need[r]! -= t; if (b.need[r]! <= 0.001) delete b.need[r]; }
      }
      const left = Object.values(b.need).reduce((a, q) => a + (q ?? 0), 0);
      if (left > 0.001) continue;
      b.work += dt;
      const d = BUILD[b.type];
      const total = b.repair ? d.days * 0.5 : b.upgrading ? d.days * LEVEL_DAYS[b.level + 1] : d.days;
      if (b.work >= total) {
        if (b.repair) { b.repair = false; b.upgrading = false; b.damaged = false; this.notify.toast(`${b.name} est réparé.`, 'good'); }
        else if (b.upgrading) { b.upgrading = false; b.level++; this.notify.toast(`${b.name} passe au niveau ${b.level}.`, 'good'); }
        else { b.built = true; this.notify.toast(`Construction terminée : ${b.name}.`, 'good'); }
        b.work = 0;
      }
    }
  }
  constructionProgress(b: Building) {
    const d = BUILD[b.type];
    const total = b.repair ? d.days * 0.5 : b.upgrading ? d.days * LEVEL_DAYS[b.level + 1] : d.days;
    return Math.min(1, b.work / Math.max(1, total));
  }

  dispatchConvoys() {
    const s = this.s;
    const sites = s.buildings.filter(b => (!b.built || b.upgrading) && !b.paused && (b.node !== null || BUILD[b.type].river));
    if (!sites.length) return;
    const stores = s.buildings.filter(b => isStore(b) && b.built);
    for (const site of sites) {
      const active = s.vehicles.filter(v => v.line === -1 && v.target === site.id).length;
      if (active >= 3) continue;
      const missing = (Object.keys(site.need) as ResId[]).filter(r => (site.need[r] ?? 0) - (site.incoming[r] ?? 0) > 0.001);
      if (!missing.length) continue;
      const has = (w: Building) => w.id !== site.id && missing.some(r => (w.stock[r] ?? 0) >= 1);
      // 1) par la route, depuis l'entrepôt relié le plus proche
      let w: Building | undefined, path: { pts: { x: number; y: number }[]; speed: number[] } | null = null, boat = false;
      if (site.node !== null) {
        const { dist } = dijkstra(s, site.node);
        w = stores.filter(x => x.node !== null && dist.has(x.node) && has(x)).sort((a, z) => dist.get(a.node!)! - dist.get(z.node!)!)[0];
        if (w) path = findPath(s, w.node!, site.node);
      }
      // 2) un port en chantier peut être ravitaillé par bateau depuis un entrepôt ou un port au bord d'un fleuve
      if (!path && BUILD[site.type].river) {
        const cands = stores.filter(x => has(x) && this.geo.nearestNav(x.x, x.y, 4))
          .map(x => ({ x, p: this.geo.riverPath(x.x, x.y, site.x, site.y) })).filter(o => o.p).sort((a, z) => a.p!.len - z.p!.len);
        if (cands[0]) { w = cands[0].x; const p = cands[0].p!; path = { pts: p.pts, speed: p.pts.slice(1).map(() => 1) }; boat = true; }
      }
      if (!w || !path) continue;
      const type: VType = boat ? 'chaland' : 'convoi';
      const r = missing.find(x => (w!.stock[x] ?? 0) >= 1)!;
      const qty = Math.min(VEH[type].cap, Math.floor(w.stock[r]!), Math.ceil(site.need[r]! - (site.incoming[r] ?? 0)));
      if (qty <= 0) continue;
      w.stock[r]! -= qty; addFlow(w, 'out', r, qty);
      site.incoming[r] = (site.incoming[r] ?? 0) + qty;
      const v = newVehicle(s, type, -1, w);
      v.cargo = { [r]: qty }; v.target = site.id; v.from = w.id; v.at = null;
      setPath(v, path);
      s.vehicles.push(v);
    }
  }

  // ----- Production -----
  depositFactor(b: Building) {
    // pas d'épuisement, même rendement partout (fermes comprises, sur toutes les terres)
    if (b.dep === null) return 1;
    const exhaure = this.s.techs.includes('exhaure');
    return exhaure && BUILD[b.type].deposit !== 'cereales' && BUILD[b.type].deposit !== 'bois' ? 1.3 : 1;
  }
  rate(b: Building) {
    const d = BUILD[b.type];
    if (!d.recipe || !b.built) return 0;
    const need = this.workersNeeded(b);
    // équipe complète = 100 % ; chaque ouvrier en renfort ajoute la moitié de sa part (jusqu'à +25 %)
    const staffRatio = need ? Math.min(b.staff, need) / need + 0.5 * Math.max(0, b.staff - need) / need : 1;
    const out = Object.values(d.recipe.out)[0]!;
    const event = prodMult(this.s, Object.keys(d.recipe.out)[0] as ResId);
    const skilled = event * (this.s.techs.includes('ouvrier_qualifie') && (d.deposit === 'bois' || d.deposit === 'pierre' || d.deposit === 'cereales') ? 1.2 : 1);
    return out * LEVEL_MULT[b.level] * staffRatio * skilled * wonderProdMult(this.s, b) * (d.deposit ? this.depositFactor(b) : 1);
  }
  production(dt: number) {
    const s = this.s;
    for (const b of s.buildings) {
      const d = BUILD[b.type];
      if (!d.recipe || !b.built) continue;
      if ((b.halted && b.halted > s.day) || b.paused || b.damaged) continue;
      const outs = Object.entries(d.recipe.out) as [ResId, number][];
      const primary = outs[0][1];
      b.acc += this.rate(b) * dt / MONTH;
      while (b.acc >= 1) {
        const k = 1 / primary;
        const ins = Object.entries(d.recipe.in) as [ResId, number][];
        if (ins.some(([r, q]) => (b.stock[r] ?? 0) < q * k - 1e-9)) { b.acc = Math.min(b.acc, 1); break; }
        if (outs.some(([r, q]) => (b.stock[r] ?? 0) + q * k > d.storage * b.level)) { b.acc = Math.min(b.acc, 1); break; }
        for (const [r, q] of ins) { b.stock[r] = (b.stock[r] ?? 0) - q * k; addFlow(b, 'out', r, q * k); }
        for (const [r, q] of outs) {
          b.stock[r] = (b.stock[r] ?? 0) + q * k; addFlow(b, 'in', r, q * k);
          s.stats.produced[r] = (s.stats.produced[r] ?? 0) + q * k;
        }
        b.produced += 1;
        if (b.dep !== null) s.extracted[b.dep] = (s.extracted[b.dep] ?? 0) + 1;
        b.acc -= 1;
      }
    }
  }

  // ----- Consommation des villes, au jour le jour -----
  consumption(dt: number) {
    for (const c of cities(this.s)) {
      const city = c.city!, want = city.want ??= {}, ate = city.ate ??= {};
      for (const [r, q] of Object.entries(cityNeeds(c)) as [ResId, number][]) {
        const w = q * dt / MONTH, have = city.stock[r] ?? 0, t = Math.min(have, w);
        city.stock[r] = have - t;
        want[r] = (want[r] ?? 0) + w; ate[r] = (ate[r] ?? 0) + t;
      }
    }
  }

  // ----- Véhicules -----
  vehicles(dt: number) {
    const s = this.s;
    const paused = new Set(s.lines.filter(l => l.paused).map(l => l.id));
    for (const v of [...s.vehicles]) {
      if (paused.has(v.line)) {
        // ligne en pause : un véhicule chargé termine sa livraison ; vide, il s'arrête où il est
        if (v.state === 'parked') continue;
        if (cargoTotal(v.cargo) < 0.5 && v.state !== 'unload') { v.state = 'parked'; continue; }
      } else if (v.state === 'parked') { v.state = 'lost'; v.timer = 0; } // reprise : recalcule l'itinéraire
      if (v.state === 'go' || v.state === 'lost') this.move(v, dt);
      else this.atStop(v, dt);
    }
  }
  private move(v: Vehicle, dt: number) {
    if (v.state === 'lost') {
      v.timer -= dt; if (v.timer > 0) return;
      if (!this.route(v)) { v.timer = 2; return; }
    }
    let travel = VEH[v.type].speed * dt * (VEH[v.type].water || VEH[v.type].sea ? 1 : relaisMult(this.s, v.x, v.y));
    while (travel > 0 && v.seg < v.path.length - 1) {
      const a = v.path[v.seg], b = v.path[v.seg + 1];
      const L = Math.hypot(b.x - a.x, b.y - a.y), sp = v.speeds[v.seg] ?? 1;
      const room = L - v.segPos, can = travel * sp;
      v.angle = Math.atan2(b.y - a.y, b.x - a.x);
      if (can < room) { v.segPos += can; travel = 0; }
      else { travel -= room / sp; v.seg++; v.segPos = 0; }
      const t = L > 0 ? v.segPos / L : 0;
      const p = v.path[v.seg], q = v.path[Math.min(v.seg + 1, v.path.length - 1)];
      v.x = p.x + (q.x - p.x) * t; v.y = p.y + (q.y - p.y) * t;
    }
    if (v.seg >= v.path.length - 1) this.arrive(v);
  }
  private route(v: Vehicle) {
    const s = this.s;
    const dest = this.destination(v);
    if (dest && VEH[v.type].sea) {
      // navire : de port de commerce en comptoir, par la mer
      const p = this.geo.seaPath(v.x, v.y, dest.x, dest.y);
      if (!p) return false;
      setPath(v, { pts: p.pts, speed: p.pts.slice(1).map(() => 1) }); v.state = 'go'; v.at = null;
      return true;
    }
    if (dest && VEH[v.type].water) {
      // barge : de port en port, par le fleuve
      const p = this.geo.riverPath(v.x, v.y, dest.x, dest.y);
      if (!p) return false;
      setPath(v, { pts: p.pts, speed: p.pts.slice(1).map(() => 1) }); v.state = 'go'; v.at = null;
      return true;
    }
    if (!dest || dest.node === null) return false;
    // départ : le nœud le plus proche de la position actuelle
    let from: number | null = null;
    if (v.at !== null) from = getB(s, v.at)?.node ?? null;
    if (from === null) {
      let bd = Infinity;
      for (const n of s.nodes) { const d = Math.hypot(n.x - v.x, n.y - v.y); if (d < bd) { bd = d; from = n.id; } }
    }
    if (from === null) return false;
    const p = findPath(s, from, dest.node, VEH[v.type].voie);
    if (!p) return false;
    setPath(v, p); v.state = 'go'; v.at = null;
    return true;
  }
  private destination(v: Vehicle) {
    const s = this.s;
    if (v.line === -1) return getB(s, v.target!);
    const l = s.lines.find(x => x.id === v.line);
    if (!l || !l.stops.length) return null;
    return getB(s, l.stops[v.stop % l.stops.length].bid) ?? null;
  }
  private arrive(v: Vehicle) {
    const s = this.s;
    const dest = this.destination(v);
    if (v.line === -1) {
      if (dest) for (const [r, q] of Object.entries(v.cargo) as [ResId, number][]) {
        dest.need[r] = Math.max(0, (dest.need[r] ?? 0) - q);
        dest.incoming[r] = Math.max(0, (dest.incoming[r] ?? 0) - q);
        for (const r of Object.keys(dest.need) as ResId[]) if ((dest.need[r] ?? 0) <= 0.001) delete dest.need[r];
      }
      s.vehicles = s.vehicles.filter(x => x.id !== v.id);
      return;
    }
    if (!dest) { v.state = 'lost'; v.timer = 2; return; }
    v.at = dest.id; v.x = dest.x; v.y = dest.y;
    const l = s.lines.find(x => x.id === v.line)!;
    const st = l.stops[v.stop % l.stops.length];
    v.state = st.action === 'load' ? 'load' : 'unload';
    v.timer = 0;
  }
  private atStop(v: Vehicle, dt: number) {
    const s = this.s;
    const l = s.lines.find(x => x.id === v.line);
    if (!l || !l.stops.length) return;
    const st = l.stops[v.stop % l.stops.length];
    const b = getB(s, st.bid);
    if (!b) { this.next(v); return; }
    v.timer += dt;
    const cap = VEH[v.type].cap;
    if (v.state === 'load' && l.paused) { if (v.timer >= 0.5) this.next(v); return; } // en pause : ne charge plus rien
    if (v.state === 'load') {
      // charge les ressources demandées à tour de rôle, tonne par tonne, jusqu'à remplir le véhicule
      // le joueur peut ne remplir le véhicule qu'en partie (au moins 1 t)
      // chaque ressource peut avoir sa part fixe du véhicule (ex. 75 % céréales + 25 % bois) ; les autres se partagent le reste
      const quota = (r: ResId) => { const p = st.pct?.[r]; return p ? Math.max(1, Math.round(cap * p / 100)) : null; };
      const allFixed = st.res.length > 0 && st.res.every(r => quota(r) !== null);
      const target = allFixed ? Math.min(cap, st.res.reduce((a, r) => a + quota(r)!, 0))
        : Math.max(1, Math.floor(cap * Math.min(100, st.share ?? 100) / 100));
      if (!b.city) {
        let room = target - cargoTotal(v.cargo), moved = true;
        // chez un partenaire étranger, le véhicule achète sur place ce qu'il charge (au prix d'importation)
        const sells = (r: ResId) => b.partner ? PARTNERS.find(p => p.id === b.partner)!.sells.includes(r)
          : b.type === 'comptoir' ? !!SEA_PARTNERS.find(p => p.id === b.sp)?.sells.includes(r) : false;
        while (room >= 1 && moved) {
          moved = false;
          for (const r of st.res) {
            const reserved = b.upgrading ? Math.max(0, (b.need[r] ?? 0) - (b.incoming[r] ?? 0)) : 0;
            const q = quota(r);
            if (room < 1 || (q !== null && (v.cargo[r] ?? 0) >= q)) continue;
            if ((b.stock[r] ?? 0) - reserved < 1 && sells(r)) {
              const m0 = s.money;
              if (!(b.partner ? buyImport(s, b, r, 1) : buySea(s, b, b.sp!, r, 1))) { v.income -= m0 - s.money; addFlow(b, 'in', r, 1); }
            }
            if ((b.stock[r] ?? 0) - reserved < 1) continue;
            b.stock[r]! -= 1; addFlow(b, 'out', r, 1); v.cargo[r] = (v.cargo[r] ?? 0) + 1; room -= 1; moved = true;
            lineMoved(l, v.stop % l.stops.length, r, 1);
          }
        }
      }
      // attend d'être plein, au plus 6 jours
      if ((cargoTotal(v.cargo) >= target || v.timer >= 6 || !st.res.length) && v.timer >= 0.5) this.next(v);
    } else {
      const share = st.share ?? 100, drop = v.drop ??= {};
      for (const [r, q] of Object.entries(v.cargo) as [ResId, number][]) {
        if (st.res.length && !st.res.includes(r)) continue;   // arrêt limité à certaines ressources
        // part à déposer ici : un pourcentage du chargement de départ (100 % = tout ce qui reste)
        const allow = share >= 100 ? q : Math.max(0, Math.round((v.ref?.[r] ?? q) * share / 100) - (drop[r] ?? 0));
        const n = Math.min(q, allow, Math.floor(accepts(s, b, r)));
        if (n > 0) { deliver(s, b, r, n, v); v.cargo[r] = q - n; drop[r] = (drop[r] ?? 0) + n; lineMoved(l, v.stop % l.stops.length, r, n); }
        if ((v.cargo[r] ?? 0) <= 0) delete v.cargo[r];
      }
      if (v.timer >= 0.5) this.next(v);
    }
  }
  private next(v: Vehicle) {
    const l = this.s.lines.find(x => x.id === v.line)!;
    // en quittant un arrêt de chargement, on mémorise le chargement (base des pourcentages de déchargement)
    if (l.stops[v.stop % l.stops.length]?.action === 'load') v.ref = { ...v.cargo };
    v.drop = {};
    // saute les arrêts de déchargement où il n'y a plus rien à déposer : pas de trajet à vide
    const n = l.stops.length;
    let next = (v.stop + 1) % n;
    for (let k = 0; k < n; k++) {
      const st = l.stops[next];
      if (st.action === 'load') break;
      const useful = (Object.entries(v.cargo) as [ResId, number][]).some(([r, q]) => q >= 0.5 && (!st.res.length || st.res.includes(r)));
      if (useful) break;
      next = (next + 1) % n;
    }
    v.stop = next;
    if (!this.route(v)) { v.state = 'lost'; v.timer = 2; }
  }

  // ----- Mensuel -----
  monthly() {
    const s = this.s;
    let expenses = 0;
    for (const b of s.buildings) expenses += b.staff * WAGE;
    for (const v of s.vehicles) expenses += VEH[v.type].upkeep;
    s.money -= expenses; s.stats.expenses += expenses;

    const growthMult = s.mods.filter(m => m.kind === 'growth' && m.until > s.day).reduce((a, m) => a * m.mult, 1) * (s.techs.includes('urbanisme') ? 1.25 : 1);
    for (const c of cities(s)) {
      const city = c.city!;
      const want = city.want ?? {}, ate = city.ate ?? {};
      let satSum = 0, n = 0;
      for (const r of Object.keys(cityNeeds(c)) as ResId[]) {
        const w = want[r] ?? 0, sat = w > 0 ? Math.min(1, (ate[r] ?? 0) / w) : 1;
        if (r === 'cereales') city.foodSat = sat; else { satSum += sat; n++; }
      }
      const supplied = (city.got?.cereales ?? 0) >= (want.cereales ?? 0) * 0.98;
      city.lastGot = city.got?.cereales ?? 0;
      city.want = {}; city.ate = {}; city.got = {};
      city.sat = n ? satSum / n : 1;
      city.growing = city.foodSat >= 0.98 && supplied && foodReserve(c) >= RESERVE_TO_GROW;
      if (city.growing) {
        let rate = (0.012 + 0.03 * city.sat) * growthMult * localGrowth(s, c);
        const next = TIERS[city.tier + 1];
        // pour passer au palier suivant, la ville doit déjà recevoir ses nouveaux biens
        if (next && city.pop * (1 + rate) >= next.minPop) {
          const cur = tierGoods(city.tier, s.era), newGoods = tierGoods(city.tier + 1, s.era).filter(r => !cur.includes(r));
          if (!tierAllowed(s, city.tier + 1) || newGoods.some(r => (city.stock[r] ?? 0) <= 0)) { rate = 0; city.pop = Math.min(city.pop, next.minPop - 1); }
        }
        city.pop *= 1 + rate;
      } else if (city.foodSat < 0.98) {
        // ville mal nourrie : une partie des habitants s'en va, jusqu'à ce que la nourriture suffise
        city.pop = Math.max(20, city.pop * (1 - Math.min(0.06, 0.3 * (1 - city.foodSat))));
      }
      let t = 0; for (let i = 0; i < TIERS.length; i++) if (city.pop >= TIERS[i].minPop) t = i;
      if (t > city.tier) this.notify.toast(`${c.name} devient un${t === 3 ? 'e' : ''} ${TIERS[t].name.toLowerCase()} !`, 'good');
      city.tier = t;
      s.rp += RP_TIER[city.tier];   // recherche volontairement lente : chaque technologie se mérite
    }
    // bâtiments de culture et merveilles : points de recherche, revenus des jeux
    for (const b of s.buildings) {
      if (!b.built || b.damaged) continue;
      const d = BUILD[b.type];
      if (d.effect?.rp) s.rp += d.effect.rp;
      if (d.wonder?.rp) s.rp += d.wonder.rp;
      if (d.wonder?.games) {
        const pop = cities(s).filter(c => Math.hypot(c.x - b.x, c.y - b.y) <= d.wonder!.range).reduce((a, c) => a + c.city!.pop, 0);
        const g = pop * d.wonder.games; s.money += g; s.stats.income += g;
      }
    }
    for (const k of Object.keys(s.market)) {
      const m = s.market[k] + (1 - s.market[k]) * 0.08 + (Math.random() - 0.5) * 0.04;
      s.market[k] = Math.min(1.5, Math.max(0.4, m));
    }
    s.stats.soldMonth = {};
    for (const l of s.lines) if (l.moved) l.moved = { cur: {}, prev: l.moved.cur, total: l.moved.total };
    for (const b of s.buildings) if (b.flow) b.flow = { in: {}, out: {}, pin: b.flow.in, pout: b.flow.out };
    s.mods = s.mods.filter(m => m.until > s.day);
    s.ledger.push({ month: Math.floor(s.day / MONTH), income: s.stats.income, expenses: s.stats.expenses });
    if (s.ledger.length > 120) s.ledger.shift();

    // économie d'un rival : mêmes objectifs que le joueur (argent et points de recherche) et mêmes
    // apports des événements historiques à la recherche ; l'ordinateur décide depuis monthlyRivals
    if (s.ai) {
      this.objectives();
      const y = year(s);
      EVENTS.forEach((e, i) => {
        if (s.events.includes(i) || e.year > y) return;
        s.events.push(i);
        for (const f of e.effects) if (f.kind === 'rp') s.rp += f.amount;
      });
      return;
    }
    this.objectives();
    monthlyRivals(s, this.geo);
    monthlyDiplomacy(s, this.notify);
    monthlyWar(s, this.notify);
    this.events();
    this.randomEvents();

    if (s.money < 0) {
      s.negMonths++;
      if (s.negMonths === 1) this.notify.toast('Trésorerie négative ! Au bout de 6 mois, c\'est la faillite.', 'bad');
      if (s.negMonths >= 6) { s.over = true; this.notify.gameOver(); }
    } else s.negMonths = 0;
  }

  objectiveDone(id: string): boolean {
    const s = this.s, cs = cities(s), maxPop = Math.max(0, ...cs.map(c => c.city!.pop));
    switch (id) {
      case 'ville': return cs.length > 0;
      case 'routes': return roadKm(s) >= 60;
      case 'ravitaillement': return s.stats.food >= 60;
      case 'batisseurs': return (s.stats.produced.pierre ?? 0) >= 200;
      case 'bourg': return maxPop >= 400;
      case 'fer': return (s.stats.produced.fer ?? 0) >= 40;
      case 'rome': return (s.stats.sold.italie ?? 0) >= 30;
      case 'ville2': return maxPop >= 1500;
      case 'gard': return s.buildings.some(b => b.type === 'pont_du_gard' && b.built);
      case 'vin2': return (s.stats.produced.vin ?? 0) >= 150;
      case 'sigillee2': return (s.stats.produced.sigillee ?? 0) >= 150;
      case 'thermes2': return s.buildings.some(b => b.type === 'thermes' && b.built);
      case 'remparts2': return s.buildings.some(b => b.type === 'remparts' && b.built);
      case 'capitale2': return cities(s).some(c => c.city!.pop >= 15000);
      case 'arenes': return s.buildings.some(b => b.type === 'arenes' && b.built);
      case 'via': {
        const comp = components(s);
        for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
          const a = cs[i], b = cs[j];
          if (a.node !== null && b.node !== null && comp.get(a.node) === comp.get(b.node) && Math.hypot(a.x - b.x, a.y - b.y) >= 250) return true;
        }
        return false;
      }
    }
    return false;
  }
  objectives() {
    const s = this.s;
    for (const o of OBJECTIVES) {
      if (o.era !== s.era || s.objectives.includes(o.id)) continue;
      if (this.objectiveDone(o.id)) {
        s.objectives.push(o.id); s.money += o.money; s.rp += o.rp;
        this.notify.toast(`Objectif atteint : ${o.name} (+${fmt(o.money)} sesterces, +${o.rp} points de recherche)`, 'good');
      }
    }
    this.checkChapter();
  }
  checkChapter() {
    const s = this.s;
    if (s.chapterDone) return;
    // l'époque s'achève quand tout son arbre de recherche est débloqué (les objectifs sont des bonus)
    if (chapterReady(s)) { s.chapterDone = true; this.notify.chapter(); }
  }
  research(id: string) {
    const s = this.s, t = TECHS.find(x => x.id === id)!;
    if (s.techs.includes(id) || s.rp < t.cost || !t.req.every(r => s.techs.includes(r))) return false;
    s.rp -= t.cost; s.techs.push(id);
    this.notify.toast(`Technologie découverte : ${t.name}`, 'good');
    if (ensureComptoirs(s, this.geo)) this.notify.event('Les routes maritimes s\'ouvrent', 'Des comptoirs apparaissent au large : Bretagne insulaire, Hibernie, Frise, Hispanie, Sardaigne, Italie, Afrique et Grèce. Construis un port de commerce sur la côte, puis crée une ligne de navire marchand vers un comptoir pour y vendre tes marchandises ou rapporter ce que tu y achètes.');
    this.checkChapter();
    return true;
  }
  events() {
    const s = this.s, y = year(s);
    EVENTS.forEach((e, i) => {
      if (s.events.includes(i) || e.year > y) return;
      s.events.push(i);
      for (const f of e.effects) {
        if (f.kind === 'money') s.money += f.amount;
        else if (f.kind === 'rp') s.rp += f.amount;
        else if (f.kind === 'growth') s.mods.push({ kind: 'growth', mult: f.mult, until: s.day + f.months * MONTH });
        else if (f.kind === 'pop') for (const c of cities(s)) c.city!.pop *= f.mult;
        else if (f.kind === 'partnerClosed') s.mods.push({ kind: 'closed', partner: f.partner, mult: 1, until: s.day + f.months * MONTH });
        else if (f.kind === 'partnerBoost') s.mods.push({ kind: 'boost', partner: f.partner, mult: f.mult, until: s.day + f.months * MONTH });
        else if (f.kind === 'discount') s.mods.push({ kind: 'discount', mult: f.mult, until: s.day + f.months * MONTH });
        else if (f.kind === 'demand') s.mods.push({ kind: 'demand', res: f.res, mult: f.mult, until: s.day + f.months * MONTH });
        else if (f.kind === 'prod') s.mods.push({ kind: 'prod', mult: f.mult, res: f.res, until: s.day + f.months * MONTH });
        else if (f.kind === 'prices') s.mods.push({ kind: 'prices', mult: f.mult, until: s.day + f.months * MONTH });
        else if (f.kind === 'raid') this.raid(f.share, f.range, f.rhin ? undefined : this.geo.proj(f.lon!, f.lat!));
        else if (f.kind === 'revolt') {
          const ws = s.buildings.filter(b => b.built && !b.damaged && BUILD[b.type].recipe).sort(() => Math.random() - 0.5).slice(0, f.count);
          for (const b of ws) { b.halted = s.day + f.months * MONTH; b.haltWhy = 'révolte'; }
        }
      }
      s.log.unshift({ day: s.day, text: `${e.title} — ${e.text}` });
      this.notify.event(`${y < 0 ? -y + ' av. J.-C.' : y} — ${e.title}`, e.text);
    });
  }
  randomEvents() {
    const s = this.s;
    if (Math.random() < 0.006) {
      // pas d'accident pendant les premières années d'exploitation
      const mines = s.buildings.filter(b => b.built && b.dep !== null && b.produced > 150 && BUILD[b.type].deposit !== 'cereales' && BUILD[b.type].deposit !== 'bois');
      if (mines.length) {
        const b = mines[Math.floor(Math.random() * mines.length)];
        b.halted = s.day + 2 * MONTH; b.haltWhy = 'éboulement';
        const t = `Éboulement à ${b.name} : production arrêtée pendant 2 mois.`;
        s.log.unshift({ day: s.day, text: t }); this.notify.toast(t, 'bad');
      }
    }
    if (Math.random() < 0.006) {
      const cs = cities(s).filter(c => this.geo.waterDist(c.x, c.y) <= 2);
      if (cs.length) {
        const c = cs[Math.floor(Math.random() * cs.length)];
        for (const r of Object.keys(c.city!.stock) as ResId[]) c.city!.stock[r]! *= 0.6;
        const t = `Crue à ${c.name} : une partie des réserves de la ville est perdue.`;
        s.log.unshift({ day: s.day, text: t }); this.notify.toast(t, 'bad');
      }
    }
    // crise du IIIe siècle : raids barbares imprévisibles sur le Rhin
    const y = year(s);
    if (s.era >= 2 && y >= 235 && y <= 284 && Math.random() < 0.03) {
      const n = this.raid(0.2, 80);
      if (n) this.notify.event(`${y} — Raid barbare`, `Une bande de Francs ou d'Alamans franchit le Rhin : ${n} bâtiment${n > 1 ? 's' : ''} sans remparts endommagé${n > 1 ? 's' : ''}. Répare-les depuis leur fiche.`);
    }
    if (s.log.length > 60) s.log.length = 60;
  }
  /** Distance au Rhin (km) */
  rhineDist(x: number, y: number) {
    const pts = RHINE.map(([lo, la]) => this.geo.proj(lo, la));
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      best = Math.min(best, Math.hypot(ax + dx * t - x, ay + dy * t - y));
    }
    return best;
  }
  /** Invasion : une part des bâtiments non protégés de la zone est endommagée ; renvoie leur nombre */
  raid(share: number, range: number, center?: [number, number]) {
    const s = this.s;
    const walls = s.buildings.filter(b => b.built && BUILD[b.type].effect?.protect);
    const hit = s.buildings.filter(b => {
      const d = BUILD[b.type];
      if (!b.built || b.damaged || b.city || b.partner || b.type === 'comptoir' || d.wonder || d.effect?.protect) return false;
      const dist = center ? Math.hypot(b.x - center[0], b.y - center[1]) : this.rhineDist(b.x, b.y);
      if (dist > range) return false;
      if (walls.some(w => Math.hypot(w.x - b.x, w.y - b.y) <= BUILD[w.type].effect!.protect!)) return false;
      return Math.random() < share;
    });
    for (const b of hit) { b.damaged = true; b.paused = false; }
    if (hit.length) s.log.unshift({ day: s.day, text: `Invasion : ${hit.length} bâtiment(s) endommagé(s) (${hit.slice(0, 4).map(b => b.name).join(', ')}${hit.length > 4 ? '…' : ''}).` });
    return hit.length;
  }
}

/** Conditions de fin d'époque : arbre complet ; au chapitre II, aussi la merveille et la date (476, à 50 ans près) */
export const ERA_END: Record<number, { year: number; wonder: BType } | undefined> = { 2: { year: 476, wonder: 'arenes' } };
export function chapterConditions(s: GameState) {
  const techs = TECHS.filter(t => t.era === s.era), end = ERA_END[s.era];
  return {
    techs: techs.every(t => s.techs.includes(t.id)),
    wonder: !end || s.buildings.some(b => b.type === end.wonder && b.built),
    date: !end || year(s) >= end.year - 50,
    end,
  };
}
export const chapterReady = (s: GameState) => { const c = chapterConditions(s); return c.techs && c.wonder && c.date; };
/** Passage à l'époque suivante */
export function startEra(s: GameState, era: number) {
  s.era = era; s.chapterDone = false;
  s.log.unshift({ day: s.day, text: `Début du chapitre ${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][era]}.` });
}

/** Coût d'une réparation : 30 % du prix du bâtiment (argent et matériaux) */
export function repairCost(b: Building) {
  const d = BUILD[b.type], k = 0.3 * LEVEL_COST[b.level];
  const need: Stock = {};
  for (const [r, q] of Object.entries(d.cost) as [ResId, number][]) need[r] = Math.max(1, Math.ceil(q * k));
  return { money: Math.round(d.money * k), need };
}
export function startRepair(s: GameState, b: Building): string | null {
  if (!b.damaged || b.repair) return null;
  const c = repairCost(b);
  if (s.money < c.money) return `Pas assez d'argent (${fmt(c.money)} sesterces).`;
  s.money -= c.money; s.stats.expenses += c.money;
  b.repair = true; b.upgrading = true; b.need = c.need; b.incoming = {}; b.work = 0;
  return null;
}
/** Croissance propre à une ville : thermes, amphithéâtres et merveilles proches */
export function localGrowth(s: GameState, c: Building) {
  let m = 1;
  for (const b of s.buildings) {
    if (!b.built || b.damaged) continue;
    const d = BUILD[b.type], dist = Math.hypot(b.x - c.x, b.y - c.y);
    if (d.effect?.growth && dist <= (d.effect.range ?? 8)) m *= d.effect.growth;
    if (d.wonder?.growth && dist <= d.wonder.range) m *= d.wonder.growth;
  }
  return m;
}
/** Relais routiers : bonus de vitesse autour d'eux */
export function relaisMult(s: GameState, x: number, y: number) {
  for (const b of s.buildings) if (b.built && BUILD[b.type].effect?.speed && Math.hypot(b.x - x, b.y - y) <= (BUILD[b.type].effect!.range ?? 30)) return BUILD[b.type].effect!.speed!;
  return 1;
}

function lineMoved(l: { moved?: { cur: Record<number, Stock>; prev: Record<number, Stock>; total?: Record<number, Stock> } }, i: number, r: ResId, q: number) {
  const m = l.moved ??= { cur: {}, prev: {} };
  const st = m.cur[i] ??= {};
  st[r] = (st[r] ?? 0) + q;
  const tt = (m.total ??= {})[i] ??= {};
  tt[r] = (tt[r] ?? 0) + q;
}

function setPath(v: Vehicle, p: { pts: { x: number; y: number }[]; speed: number[] }) {
  v.path = p.pts; v.speeds = p.speed; v.seg = 0; v.segPos = 0;
  if (p.pts.length) { v.x = p.pts[0].x; v.y = p.pts[0].y; }
}

export function startingCamp(s: GameState, geo: Geo, x: number, y: number) {
  const b = place(s, geo, 'entrepot', x, y, 'Entrepôt de départ', true);
  b.stock = { ...START_STOCK };
  attachNode(s, b);
  return b;
}

// ---------- État d'un bâtiment (fiche et carte) ----------
export type StatusLevel = 'good' | 'info' | 'warn' | 'bad';
export interface BStatus { label: string; level: StatusLevel; hint?: string; }

export function buildingStatus(sim: Sim, b: Building): BStatus {
  const s = sim.s, d = BUILD[b.type];
  if (b.partner) {
    const closed = s.mods.some(m => m.kind === 'closed' && m.partner === b.partner && m.until > s.day);
    if (closed) return { label: 'Frontière fermée', level: 'bad' };
    if (b.node === null) return { label: 'Non relié', level: 'info', hint: 'Trace une route jusqu\'à ce poste pour y commercer.' };
    return { label: 'Commerce ouvert', level: 'good' };
  }
  if (b.type === 'taverne' && b.built && s.factions?.length) {
    const f = tradeFaction(s, b);
    if (f) return { label: `Commerce avec ${f.short}`, level: 'good' };
    if (s.factions.some(o => o.trade)) return { label: 'Sans route commerciale', level: 'warn', hint: 'Trace une route depuis cette taverne jusqu\'à une ville du rival avec qui tu as un accord.' };
    return { label: 'Diplomatie ouverte', level: 'info', hint: 'Signe un accord commercial avec un rival pour commercer par cette taverne.' };
  }
  if (b.type === 'comptoir') {
    const p = SEA_PARTNERS.find(x => x.id === b.sp)!, sold = s.stats.soldMonth['mer:' + p.id] ?? 0;
    return sold >= seaVolume(s, p) ? { label: 'Volume du mois atteint', level: 'info' } : { label: 'Route maritime ouverte', level: 'good' };
  }
  if ((!b.built || b.upgrading) && b.paused) return { label: 'Chantier en pause', level: 'info', hint: 'Les livraisons et les travaux sont suspendus.' };
  if (!b.built || b.upgrading) {
    if (b.node === null && d.river) return { label: 'Chantier : livraison par bateau', level: 'info', hint: 'Sans route, les matériaux arrivent par le fleuve depuis un entrepôt ou un port au bord de l\'eau.' };
    if (b.node === null) return { label: 'Chantier non relié', level: 'warn', hint: 'Trace une route jusqu\'à un entrepôt pour livrer les matériaux.' };
    const left = Object.values(b.need).reduce((a, q) => a + (q ?? 0), 0);
    return { label: left > 0 ? (b.upgrading ? 'Amélioration : livraison' : 'Chantier : livraison') : (b.upgrading ? 'Amélioration en cours' : 'Travaux en cours'), level: 'info' };
  }
  if (b.repair) {
    const left = Object.values(b.need).reduce((a, q) => a + (q ?? 0), 0);
    return { label: left > 0 ? 'Réparation : livraison' : 'Réparation en cours', level: 'info', hint: 'Les matériaux de réparation arrivent par convoi depuis un entrepôt.' };
  }
  if (b.damaged) return { label: 'Endommagé', level: 'bad', hint: 'Pillé lors d\'une invasion : il ne produit plus. Répare-le (bouton en haut de la fiche) ; des remparts proches le protégeront à l\'avenir.' };
  if (b.halted && b.halted > s.day) return { label: b.haltWhy === 'révolte' ? 'Arrêt (révolte des Bagaudes)' : 'Arrêt (éboulement)', level: 'bad' };
  if (b.paused) return { label: 'En pause', level: 'info', hint: 'Production arrêtée : les ouvriers sont libérés et ne sont pas payés.' };
  if (b.city) {
    const c = b.city;
    if (c.foodSat < 0.5) return { label: 'Famine', level: 'bad', hint: 'Livre des céréales à la ville.' };
    if (c.foodSat < 0.9) return { label: 'Mal nourrie', level: 'warn', hint: 'La ville manque de céréales.' };
    if (c.foodSat < 0.98) return { label: 'Un peu juste', level: 'warn', hint: 'Il manque un peu de céréales : quelques habitants partent.' };
    const miss = missingNextGoods(b);
    if (miss.length) return { label: 'Bloquée avant le palier', level: 'warn', hint: manque(cityShortages(b)) };
    if (foodReserve(b) < RESERVE_TO_GROW) return { label: 'Stable', level: 'info', hint: 'La ville est nourrie mais ne grandit pas : il lui faut au moins un mois de céréales en réserve.' };
    if (c.growing === false) return { label: 'Stable', level: 'info', hint: 'La ville vit sur sa réserve : livre-lui au moins ce qu\'elle mange chaque mois pour qu\'elle grandisse.' };
    if (c.sat < 0.5) return { label: 'Nourrie, peu de confort', level: 'warn', hint: manque(cityShortages(b)) || 'Livre aussi les autres biens demandés pour accélérer la croissance.' };
    return { label: 'En croissance', level: 'good' };
  }
  if (isStore(b)) {
    const total = Object.values(b.stock).reduce((a, q) => a + (q ?? 0), 0), cap = d.storage * b.level;
    if (total >= cap * 0.95) return { label: 'Plein', level: 'bad', hint: 'Les livraisons sont refusées : évacue des marchandises ou améliore l\'entrepôt.' };
    if (total >= cap * 0.8) return { label: 'Presque plein', level: 'warn' };
    return { label: 'Opérationnel', level: 'good' };
  }
  if (d.recipe) {
    const need = sim.workersNeeded(b);
    if (b.staff === 0) return { label: 'Sans ouvriers', level: 'bad', hint: `Fonde une ville à moins de ${WORK_RANGE} km.` };
    const outs = Object.keys(d.recipe.out) as ResId[];
    if (outs.some(r => (b.stock[r] ?? 0) >= d.storage * b.level - 0.5)) return { label: 'Stock plein', level: 'warn', hint: 'La production est arrêtée : crée une ligne pour évacuer la production.' };
    const ins = Object.keys(d.recipe.in) as ResId[];
    if (ins.some(r => (b.stock[r] ?? 0) < d.recipe!.in[r]! / outs.length / (Object.values(d.recipe!.out)[0]!) )) return { label: 'Attend des matières', level: 'warn', hint: 'Livre les matières premières avec une ligne.' };
    if (b.staff < need) return { label: 'Manque d\'ouvriers', level: 'warn', hint: `Fais grandir une ville proche (rayon ${WORK_RANGE} km).` };
    return { label: 'En production', level: 'good' };
  }
  if (b.node === null && b.type !== 'pont_du_gard') return { label: 'Non relié', level: 'info' };
  return { label: 'Opérationnel', level: 'good' };
}
