// Rivaux : grandes familles et cités romaines gérées par l'ordinateur.
// Simulation volontairement simplifiée : villes, ateliers sur les gisements, routes dessinées,
// croissance réglée sur celle du joueur selon la difficulté.
import { ALT_HOMES, ANCIENT, SPARE_NAMES, BUILD, DIFFICULTY, RES, RIVALS, TIERS, type BType } from './defs';
import type { DepositKm, Geo } from './geo';
import type { Building, Faction, GameState, RBuilding } from './state';

/** Rayon de territoire d'un bâtiment (km) : les villes rayonnent selon leur palier */
export const territoryRadius = (b: { tier?: number; pop?: number; type: BType }) => b.type === 'village' ? 18 + 8 * (b.tier ?? 0) : 6;
/** Rayon de territoire d'une ville du joueur */
const playerRadius = (b: Building) => b.city ? 18 + 8 * b.city.tier : 6;

/** Faction dont le territoire couvre ce point (hors alliés) */
export function rivalAt(s: GameState, x: number, y: number): Faction | null {
  for (const f of s.factions ?? []) for (const b of f.b) if (Math.hypot(b.x - x, b.y - y) <= territoryRadius(b)) return f;
  return null;
}
/** Faction qui exploite déjà ce gisement */
export const depOwner = (s: GameState, dep: number) => (s.factions ?? []).find(f => f.b.some(b => b.dep === dep)) ?? null;
/** Bâtiment rival trop proche (espacement minimal) */
export const rivalTooClose = (s: GameState, x: number, y: number, d = 2.5) => (s.factions ?? []).some(f => f.b.some(b => Math.hypot(b.x - x, b.y - y) < d));
export const findRival = (s: GameState, id: number) => { for (const f of s.factions ?? []) { const b = f.b.find(x => x.id === id); if (b) return { f, b }; } return null; };

const inPlayerLand = (s: GameState, x: number, y: number, margin = 0) => s.buildings.some(b => !b.partner && b.type !== 'comptoir' && Math.hypot(b.x - x, b.y - y) <= playerRadius(b) + margin);
const tierOf = (pop: number) => { let t = 0; for (let i = 0; i < TIERS.length; i++) if (pop >= TIERS[i].minPop) t = i; return Math.min(t, 3); };
const land = (geo: Geo, f: Faction, x: number, y: number) => { const m = geo.maskAt(x, y); return m === 1 || (m === 2 && !!f.frontier); };

function usedNames(s: GameState) { return new Set([...s.buildings.map(b => b.name), ...(s.factions ?? []).flatMap(f => f.b.map(b => b.name))]); }
function cityName(s: GameState, geo: Geo, x: number, y: number) {
  const used = usedNames(s);
  let best = '', bd = 70;
  for (const [n, lo, la] of ANCIENT) { const [ax, ay] = geo.proj(lo, la), d = Math.hypot(ax - x, ay - y); if (d < bd && !used.has(n)) { bd = d; best = n; } }
  if (best) return best;
  const spare = SPARE_NAMES.find(n => !used.has(n));
  if (spare) return spare;
  let i = 2; while (used.has(`Vicus ${i}`)) i++; return `Vicus ${i}`;
}

/** Crée les quatre rivaux au moment où le joueur pose son entrepôt de départ */
export function initRivals(s: GameState, geo: Geo, px: number, py: number) {
  s.factions = [];
  const taken: [number, number][] = [[px, py]];
  const alts = ALT_HOMES.slice();
  for (const r of RIVALS) {
    let home = geo.proj(r.home[0], r.home[1]), capital = r.capital;
    // trop près du joueur ou d'un autre rival : on s'installe dans une autre région historique
    if (taken.some(([x, y]) => Math.hypot(x - home[0], y - home[1]) < (x === px && y === py ? 160 : 140))) {
      alts.sort((a, z) => score(z) - score(a));
      const alt = alts.shift();
      if (alt) { home = geo.proj(alt.home[0], alt.home[1]); capital = alt.capital; }
    }
    taken.push(home);
    const f: Faction = { id: r.id, name: r.name, short: r.short, capital, color: r.color, character: r.character, frontier: r.frontier, money: 800, b: [], roads: [], drive: 0.9 + Math.random() * 0.2 };
    s.factions.push(f);
    const city: RBuilding = { id: s.nextId++, type: 'village', x: home[0], y: home[1], name: capital, pop: 160, tier: 0 };
    const store: RBuilding = { id: s.nextId++, type: 'entrepot', x: home[0] + 4, y: home[1] + 3, name: `Entrepôt ${r.short.toLowerCase().startsWith('é') ? 'des ' : 'de '}${r.short}`, dep: null };
    f.b.push(city, store); f.roads.push([city.x, city.y, store.x, store.y]);
    for (let i = 0; i < 2; i++) buildProducer(s, geo, f);
  }
  function score(a: { home: [number, number] }) {
    const [x, y] = geo.proj(a.home[0], a.home[1]);
    return Math.min(...taken.map(([tx, ty]) => Math.hypot(tx - x, ty - y)));
  }
}

/** Le rival construit un atelier sur un gisement libre proche de ses villes */
function buildProducer(s: GameState, geo: Geo, f: Faction) {
  const cities = f.b.filter(b => b.type === 'village');
  // les rivaux débloquent leurs ateliers en même temps que le joueur (mêmes technologies)
  const kinds = (Object.keys(BUILD) as BType[]).filter(t => BUILD[t].deposit && BUILD[t].era <= s.era && !BUILD[t].hidden && (!BUILD[t].tech || s.techs.includes(BUILD[t].tech!)));
  const count = (t: BType) => f.b.filter(b => b.type === t).length;
  const deps = geo.deposits.filter((d: DepositKm) => RES[d.res].era <= s.era && kinds.some(t => BUILD[t].deposit === d.res)
    && cities.some(c => Math.hypot(c.x - d.x, c.y - d.y) < 95)
    && !s.buildings.some(b => b.dep === d.id) && (!depOwner(s, d.id) || depOwner(s, d.id) === f) && f.b.filter(b => b.dep === d.id).length < 3);
  if (!deps.length) return false;
  // priorité aux types d'ateliers qu'il possède le moins, puis aux gisements riches et proches
  const pick = deps.map(d => {
    const t = kinds.filter(k => BUILD[k].deposit === d.res).sort((a, z) => BUILD[z].era - BUILD[a].era)[0];
    const near = Math.min(...cities.map(c => Math.hypot(c.x - d.x, c.y - d.y)));
    return { d, t, sc: d.rich * 40 - near * 0.4 - count(t) * 25 + Math.random() * 10 };
  }).sort((a, z) => z.sc - a.sc);
  for (const { d, t } of pick.slice(0, 6)) {
    for (let k = 0; k < 12; k++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.55;
      const x = d.x + Math.cos(a) * d.rx * r, y = d.y + Math.sin(a) * d.ry * r;
      if (!land(geo, f, x, y) || inPlayerLand(s, x, y, 2) || rivalTooClose(s, x, y, 3) || s.buildings.some(b => Math.hypot(b.x - x, b.y - y) < 4)) continue;
      const o = rivalAt(s, x, y); if (o && o !== f) continue;
      const nb: RBuilding = { id: s.nextId++, type: t, x, y, name: `${BUILD[t].name} — ${d.name}`, dep: d.id };
      f.b.push(nb);
      const near = f.b.filter(b => b !== nb && (b.type === 'village' || b.type === 'entrepot')).sort((p, q) => Math.hypot(p.x - x, p.y - y) - Math.hypot(q.x - x, q.y - y))[0];
      if (near) f.roads.push([near.x, near.y, x, y]);
      return true;
    }
  }
  return false;
}

/** Le rival fonde une nouvelle ville à quelques dizaines de kilomètres des siennes */
function foundCity(s: GameState, geo: Geo, f: Faction) {
  const cities = f.b.filter(b => b.type === 'village');
  const allCities = [...s.buildings.filter(b => b.city), ...(s.factions ?? []).flatMap(o => o.b.filter(b => b.type === 'village'))];
  let best: { x: number; y: number; sc: number } | null = null;
  for (let k = 0; k < 80; k++) {
    const c = cities[Math.floor(Math.random() * cities.length)], a = Math.random() * Math.PI * 2, r = 45 + Math.random() * 60;
    const x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r;
    if (!land(geo, f, x, y) || geo.waterDist(x, y) > 6 || inPlayerLand(s, x, y, 15)) continue;
    if (allCities.some(o => Math.hypot(o.x - x, o.y - y) < 35)) continue;
    const o = rivalAt(s, x, y); if (o && o !== f) continue;
    const home = cities[0], sc = -Math.hypot(home.x - x, home.y - y) + Math.random() * 30;
    if (!best || sc > best.sc) best = { x, y, sc };
  }
  if (!best) return false;
  const nc: RBuilding = { id: s.nextId++, type: 'village', x: best.x, y: best.y, name: cityName(s, geo, best.x, best.y), pop: 90, tier: 0 };
  f.b.push(nc);
  const near = cities.sort((p, q) => Math.hypot(p.x - nc.x, p.y - nc.y) - Math.hypot(q.x - nc.x, q.y - nc.y))[0];
  f.roads.push([near.x, near.y, nc.x, nc.y]);
  s.log.unshift({ day: s.day, text: `${f.name} fondent ${nc.name}.` });
  return true;
}

/** Population totale du joueur et d'un rival */
export const playerPop = (s: GameState) => s.buildings.reduce((a, b) => a + (b.city?.pop ?? 0), 0);
export const factionPop = (f: Faction) => f.b.reduce((a, b) => a + (b.pop ?? 0), 0);

/** Évolution mensuelle des rivaux : ils suivent la croissance du joueur selon la difficulté */
export function monthlyRivals(s: GameState, geo: Geo) {
  if (!s.factions?.length) return;
  const mult = DIFFICULTY[s.difficulty ?? 'equilibre'].mult, pp = playerPop(s);
  for (const f of s.factions) {
    const cities = f.b.filter(b => b.type === 'village');
    if (f.dead || !cities.length) continue;
    // partie déjà commencée : un atelier construit avant que la technologie soit connue disparaît
    const locked = f.b.filter(b => BUILD[b.type].tech && !s.techs.includes(BUILD[b.type].tech!));
    if (locked.length) { f.b = f.b.filter(b => !locked.includes(b)); f.roads = f.roads.filter(([, , x, y]) => !locked.some(b => b.x === x && b.y === y)); }
    const fp = factionPop(f);
    const target = Math.max(160, pp * mult * f.drive);
    const gap = target - fp;
    const delta = gap > 0 ? Math.min(gap * 0.06, fp * 0.05 + 6) : Math.max(gap * 0.01, -fp * 0.01);
    // la croissance se répartit entre les villes, les plus petites rattrapent les grandes
    const w = cities.map(c => 1 / Math.sqrt(c.pop ?? 1)), wt = w.reduce((a, b) => a + b, 0);
    cities.forEach((c, i) => { c.pop = Math.max(40, (c.pop ?? 0) + delta * w[i] / wt); c.tier = tierOf(c.pop); });
    f.money += fp * 0.04;
    // nouvelles villes et nouveaux ateliers selon la taille
    const wantCities = Math.min(6, 1 + Math.floor(fp / 1400));
    if (cities.length < wantCities && Math.random() < 0.35) foundCity(s, geo, f);
    const producers = f.b.filter(b => b.dep !== undefined && b.dep !== null).length;
    const wantProd = Math.min(24, 2 + Math.floor(fp / 220 * (s.difficulty === 'ambitieux' ? 1.2 : 1)));
    for (let k = 0; k < 3 && producers + k < wantProd; k++) if (!buildProducer(s, geo, f)) break;
    // un entrepôt pour chaque ville un peu importante
    for (const c of cities) if ((c.tier ?? 0) >= 1 && !f.b.some(b => b.type === 'entrepot' && Math.hypot(b.x - c.x, b.y - c.y) < 12)) {
      const e: RBuilding = { id: s.nextId++, type: 'entrepot', x: c.x + 4, y: c.y + 3, name: `Entrepôt de ${c.name}`, dep: null };
      f.b.push(e); f.roads.push([c.x, c.y, e.x, e.y]);
    }
  }
}
