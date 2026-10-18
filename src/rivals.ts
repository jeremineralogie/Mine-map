// Rivaux : grandes familles et cités romaines gérées par l'ordinateur.
// Simulation volontairement simplifiée : villes, ateliers sur les gisements, routes dessinées,
// croissance réglée sur celle du joueur selon la difficulté.
import { ALT_HOMES, ANCIENT, SPARE_NAMES, BUILD, RES, RIVALS, TECHS, TIERS, WATER_RANGE, type BType, type ResId } from './defs';
import type { DepositKm, Geo } from './geo';
import type { Building, Faction, GameState, RBuilding } from './state';
import { ownerAt, territoryReady } from './territory';
import { rivalCities, rivalKickoff, rivalMonth, rivalStart, setPlacer } from './rivaleco';

/** Rayon de territoire d'un bâtiment (km) : les villes rayonnent selon leur palier */
export const territoryRadius = (b: { tier?: number; pop?: number; type: BType }) => b.type === 'village' ? 18 + 8 * (b.tier ?? 0) : 6;
/** Rayon de territoire d'une ville du joueur */
const playerRadius = (b: Building) => b.city ? 18 + 8 * b.city.tier : 6;

/** Faction dont le territoire couvre ce point (hors alliés) */
export function rivalAt(s: GameState, x: number, y: number): Faction | null {
  if (territoryReady()) { const o = ownerAt(s, x, y); return o && o !== 'player' ? o : null; }
  for (const f of s.factions ?? []) for (const b of f.b) if (Math.hypot(b.x - x, b.y - y) <= territoryRadius(b)) return f;
  return null;
}
/** Faction qui exploite déjà ce gisement */
export const depOwner = (s: GameState, dep: number) => (s.factions ?? []).find(f => f.b.some(b => b.dep === dep)) ?? null;
/** Bâtiment rival trop proche (espacement minimal) */
export const rivalTooClose = (s: GameState, x: number, y: number, d = 2.5) => (s.factions ?? []).some(f => f.b.some(b => Math.hypot(b.x - x, b.y - y) < d));
export const findRival = (s: GameState, id: number) => { for (const f of s.factions ?? []) { const b = f.b.find(x => x.id === id); if (b) return { f, b }; } return null; };

const inPlayerLand = (s: GameState, x: number, y: number, margin = 0) => territoryReady()
  ? [[0, 0], ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => [Math.cos(k * Math.PI / 4) * margin, Math.sin(k * Math.PI / 4) * margin])].some(([dx, dy]) => ownerAt(s, x + dx, y + dy) === 'player')
  : s.buildings.some(b => !b.partner && b.type !== 'comptoir' && Math.hypot(b.x - x, b.y - y) <= playerRadius(b) + margin);
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
    const f: Faction = { id: r.id, name: r.name, short: r.short, capital, color: r.color, character: r.character, frontier: r.frontier, money: 0, b: [], roads: [], drive: 0.9 + Math.random() * 0.2 };
    rivalStart(s, f); // même argent et mêmes matériaux de départ que le joueur (selon la difficulté)
    s.factions.push(f);
    const city: RBuilding = { id: s.nextId++, type: 'village', x: home[0], y: home[1], name: capital, pop: 80, tier: 0 };
    const store: RBuilding = { id: s.nextId++, type: 'entrepot', x: home[0] + 4, y: home[1] + 3, name: `Entrepôt ${r.short.toLowerCase().startsWith('é') ? 'des ' : 'de '}${r.short}`, dep: null };
    f.b.push(city, store); f.roads.push([city.x, city.y, store.x, store.y]);
    initPlacer(s, geo);
    rivalKickoff(s, geo, f);
  }
  function score(a: { home: [number, number] }) {
    const [x, y] = geo.proj(a.home[0], a.home[1]);
    return Math.min(...taken.map(([tx, ty]) => Math.hypot(tx - x, ty - y)));
  }
}

/** Où un rival peut construire : gisements libres, emplacements près d'une ville, nouvelles villes */
function initPlacer(s: GameState, geo: Geo) {
  const free = (f: Faction, x: number, y: number) => {
    if (!land(geo, f, x, y) || inPlayerLand(s, x, y, 2) || rivalTooClose(s, x, y, 3) || s.buildings.some(b => Math.hypot(b.x - x, b.y - y) < 4)) return false;
    const o = rivalAt(s, x, y); return !o || o === f;
  };
  setPlacer({
    freeDeposits(f, res: ResId, maxDist) {
      const cities = rivalCities(f), out: { x: number; y: number; dep: number; name: string; d: number }[] = [];
      for (const d of geo.deposits as DepositKm[]) {
        if (d.res !== res || RES[d.res].era > s.era || s.buildings.some(b => b.dep === d.id)) continue;
        const own = depOwner(s, d.id); if (own && own !== f) continue;
        if (f.b.filter(b => b.dep === d.id).length >= 3) continue;
        const dd = Math.min(...cities.map(c => Math.hypot(c.x - d.x, c.y - d.y)));
        if (maxDist && dd > maxDist) continue;
        for (let k = 0; k < 12; k++) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * 0.55;
          const x = d.x + Math.cos(a) * d.rx * r, y = d.y + Math.sin(a) * d.ry * r;
          if (!free(f, x, y)) continue;
          out.push({ x, y, dep: d.id, name: d.name, d: Math.min(...cities.map(c => Math.hypot(c.x - x, c.y - y))) });
          break;
        }
      }
      return out.sort((a, z) => a.d - z.d);
    },
    spot(f, near, water, maxR = 8) {
      for (let k = 0; k < 40; k++) {
        const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * (maxR - 3), x = near.x + Math.cos(a) * r, y = near.y + Math.sin(a) * r;
        if (water && geo.waterDist(x, y) > WATER_RANGE) continue;
        if (free(f, x, y)) return { x, y };
      }
      return null;
    },
    foundCity(f, near) { return foundCity(s, geo, f, near); },
  });
}

/** Le rival fonde une nouvelle ville (à quelques dizaines de km des siennes, ou près d'un gisement visé) */
function foundCity(s: GameState, geo: Geo, f: Faction, near?: { x: number; y: number }) {
  const cities = rivalCities(f);
  const allCities = [...s.buildings.filter(b => b.city), ...(s.factions ?? []).flatMap(o => o.b.filter(b => b.type === 'village'))];
  let best: { x: number; y: number; sc: number } | null = null;
  for (let k = 0; k < 80; k++) {
    const c = near ?? cities[Math.floor(Math.random() * cities.length)], a = Math.random() * Math.PI * 2, r = near ? 5 + Math.random() * 20 : 45 + Math.random() * 60;
    const x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r;
    if (!land(geo, f, x, y) || geo.waterDist(x, y) > WATER_RANGE || inPlayerLand(s, x, y, 15)) continue;
    if (allCities.some(o => Math.hypot(o.x - x, o.y - y) < 35)) continue;
    const o = rivalAt(s, x, y); if (o && o !== f) continue;
    const sc = near ? -Math.hypot(near.x - x, near.y - y) : -Math.hypot(cities[0].x - x, cities[0].y - y) + Math.random() * 30;
    if (!best || sc > best.sc) best = { x, y, sc };
  }
  if (!best) return null;
  // les colons viennent de la plus grande ville
  const from = [...cities].sort((p, q) => (q.pop ?? 0) - (p.pop ?? 0))[0];
  const settlers = Math.min(60, Math.max(0, (from.pop ?? 0) - 100));
  if (settlers < 30) return null;
  from.pop = (from.pop ?? 0) - settlers;
  const nc: RBuilding = { id: s.nextId++, type: 'village', x: best.x, y: best.y, name: cityName(s, geo, best.x, best.y), pop: settlers, tier: 0, ready: s.day + BUILD.village.days };
  f.b.push(nc);
  const link = [...cities].sort((p, q) => Math.hypot(p.x - nc.x, p.y - nc.y) - Math.hypot(q.x - nc.x, q.y - nc.y))[0];
  f.roads.push([link.x, link.y, nc.x, nc.y]);
  s.log.unshift({ day: s.day, text: `${f.name} fondent ${nc.name}.` });
  return nc;
}

/** Population totale du joueur et d'un rival */
export const playerPop = (s: GameState) => s.buildings.reduce((a, b) => a + (b.city?.pop ?? 0), 0);
export const factionPop = (f: Faction) => f.b.reduce((a, b) => a + (b.pop ?? 0), 0);

/** Le rival découvre autant de technologies que le joueur, mais choisit les siennes selon sa situation :
 *  gisements proches, fleuves ou côte, caractère. Pas de copie de l'arbre du joueur. */
function syncTechs(s: GameState, geo: Geo, f: Faction) {
  f.techs ??= [];
  const known = new Set(TECHS.map(t => t.id));
  const playerCount = s.techs.filter(t => known.has(t)).length;
  const cities = f.b.filter(b => b.type === 'village');
  // biens des paliers à venir et leurs matières premières
  const top = Math.min(TIERS.length - 1, Math.max(0, ...cities.map(c => c.tier ?? 0)) + 1), wanted = new Set<ResId>();
  for (let t = 0; t <= top; t++) for (const r of Object.keys(TIERS[t].needs) as ResId[]) wanted.add(r);
  for (const r of [...wanted]) for (const k of Object.keys(BUILD) as BType[]) if (BUILD[k].recipe?.out[r]) for (const i of Object.keys(BUILD[k].recipe!.in) as ResId[]) wanted.add(i);
  for (const r of ['minerai_fer'] as ResId[]) if (wanted.has('fer')) wanted.add(r);
  let guard = 0;
  while (f.techs.length < playerCount && guard++ < 40) {
    const avail = TECHS.filter(t => t.era <= s.era && !f.techs!.includes(t.id) && t.req.every(r => f.techs!.includes(r)));
    if (!avail.length) break;
    const score = (t: typeof TECHS[number]) => {
      let sc = Math.random() * 12 - t.cost / 8;
      // ateliers débloqués : intéressants s'il y a des gisements près de ses villes
      for (const b of (Object.keys(BUILD) as BType[]).filter(k => BUILD[k].tech === t.id)) {
        const res = BUILD[b].deposit;
        if (res && geo.deposits.some(d => d.res === res && cities.some(c => Math.hypot(c.x - d.x, c.y - d.y) < 90))) sc += 20;
        if (BUILD[b].river && cities.some(c => geo.nearestNav(c.x, c.y, 20))) sc += 8;
        if (BUILD[b].coast && cities.some(c => geo.nearSea(c.x, c.y, 25))) sc += 10;
      }
      // priorité aux technologies qui donnent ce que réclament ses villes pour passer le palier suivant
      for (const b of (Object.keys(BUILD) as BType[]).filter(k => BUILD[k].tech === t.id)) {
        const outs = Object.keys(BUILD[b].recipe?.out ?? {}) as ResId[];
        if (outs.some(r => wanted.has(r))) sc += 25;
      }
      const bias: Record<string, string[]> = { commercant: ['negoce', 'monnaie', 'negoce_maritime', 'peche', 'phares'], guerrier: ['metallurgie', 'forge', 'remparts', 'relais', 'charronnerie'], fidele: ['aqueduc', 'urbanisme', 'voie_romaine', 'thermes', 'spectacles'], opportuniste: ['navigation', 'negoce_maritime', 'viticulture', 'batellerie'] };
      if (bias[f.character]?.includes(t.id)) sc += 10;
      return sc;
    };
    const pick = avail.map(t => ({ t, sc: score(t) })).sort((a, z) => z.sc - a.sc)[0].t;
    f.techs.push(pick.id);
    s.log.unshift({ day: s.day, text: `Les ${f.name} découvrent : ${pick.name}.` });
  }
}

/** Évolution mensuelle des rivaux : même économie que le joueur (production, besoins, croissance) */
export function monthlyRivals(s: GameState, geo: Geo) {
  if (!s.factions?.length) return;
  initPlacer(s, geo);
  for (const f of s.factions) {
    const cities = f.b.filter(b => b.type === 'village');
    if (f.dead || !cities.length) continue;
    syncTechs(s, geo, f);
    // partie déjà commencée : un atelier construit avant que la technologie soit connue disparaît
    const locked = f.b.filter(b => BUILD[b.type].tech && !(f.techs ?? []).includes(BUILD[b.type].tech!));
    if (locked.length) { f.b = f.b.filter(b => !locked.includes(b)); f.roads = f.roads.filter(([, , x, y]) => !locked.some(b => b.x === x && b.y === y)); }
    // ancienne partie : richesse des gisements déjà exploités
    // même rendement partout dans un gisement (terres ordinaires : rendement réduit)
    for (const b of f.b) if (BUILD[b.type].deposit) b.rich = BUILD[b.type].deposit === 'cereales' && b.dep == null ? 0.45 : 1;
    rivalMonth(s, geo, f);
  }
}
