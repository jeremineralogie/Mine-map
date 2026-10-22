// Vikings (chapitre III) : une cinquième faction. De 799 à 911, des bandes débarquent sur les côtes de l'Atlantique
// et de la Manche ou remontent les fleuves pour piller les villes (celles du joueur comme celles des rivaux).
// À partir de 880, une bande victorieuse peut garder la ville qu'elle vient de prendre ; sinon, en 911, les Vikings
// fondent leur propre ville sur la côte. Une fois installés, ils deviennent un rival comme les autres, avec leur économie.
import { TECHS } from './defs';
import type { Geo } from './geo';
import { cityDomain, ecoBuilding, foundHome, newEco, settleSpot, spotName, syncAllyRoads, syncLent, syncView, transfer } from './rivalai';
import type { Army, Building, Faction, GameState, RBuilding } from './state';
import { PLAYER, armies, makePeace, playerGarrison, recentlyPillaged, rivalGarrison, type WarNotify } from './war';

export const VIKINGS = 'vikings';
/** Premiers raids, premières installations possibles, installation de force (traité de Saint-Clair-sur-Epte) */
export const RAIDS_FROM = 799, SETTLE_FROM = 880, SETTLE_BY = 911;
const YEAR = 365.25;
const year = (s: GameState) => { const y = -50 + Math.floor(s.day / YEAR); return y >= 0 ? y + 1 : y; };
/** Fleuves que remontent les drakkars */
const RIVERS = new Set(['Seine', 'Loire', 'Garonne', 'Somme', 'Dordogne', 'Charente', 'Vilaine', 'Schelde', 'Maas', 'Marne', 'Yonne', 'Eure', 'Sarthe', 'Vienne', 'Cher', 'Lot', 'Tarn', 'Adour', 'Aube']);
/** Lieux où ils s'installent d'eux-mêmes en 911, dans l'ordre (estuaire de la Seine d'abord) */
const SITES: [number, number][] = [[1.0, 49.4], [-0.6, 49.25], [-1.4, 49.4], [-1.9, 47.3], [1.7, 50.1], [-1.0, 45.4]];
const ROUEN: [number, number] = [1.09, 49.44];

export const vikings = (s: GameState) => s.factions?.find(f => f.id === VIKINGS);
const rivalsOf = (s: GameState) => (s.factions ?? []).filter(f => f.id !== VIKINGS && !f.dead);

/** Une ville est-elle à portée des drakkars (côte atlantique ou fleuve navigable) ? */
function reachable(geo: Geo, x: number, y: number) {
  if (geo.nearSea(x, y, 40) && geo.seaOf(x, y) === 'atlantique') return true;
  const n = geo.nearestNav(x, y, 15);
  return !!n && RIVERS.has(n.name);
}
/** Point de débarquement : au bord de la mer ou du fleuve, à 15–35 km de la ville */
function landing(geo: Geo, c: { x: number; y: number }): { x: number; y: number } {
  let best: { x: number; y: number } | null = null;
  for (let k = 0; k < 60 && !best; k++) {
    const a = Math.random() * Math.PI * 2, r = 15 + Math.random() * 20, x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r;
    if (geo.maskAt(x, y) !== 1) continue;
    if (geo.nearSea(x, y, 3) || geo.nearestNav(x, y, 3)) best = { x, y };
  }
  if (best) return best;
  for (let k = 0; k < 30; k++) { const a = Math.random() * Math.PI * 2, x = c.x + Math.cos(a) * 15, y = c.y + Math.sin(a) * 15; if (geo.maskAt(x, y) === 1) return { x, y }; }
  return { x: c.x + 10, y: c.y };
}

/** Arrivée des Vikings : en guerre avec tout le monde, sans ville ni économie */
function arrive(s: GameState, n: WarNotify): Faction {
  const others = rivalsOf(s);
  const f: Faction = { id: VIKINGS, name: 'Vikings', short: 'Vikings', capital: '', color: '#0c8599', character: 'guerrier', money: 0, b: [], roads: [], drive: 1,
    techs: [], era: 3, raider: true, raids: 0, war: true, warSince: s.day, rel: -100, foes: others.map(o => o.id) };
  for (const o of others) o.foes = [...new Set([...(o.foes ?? []), VIKINGS])];
  s.factions!.push(f);
  s.log.unshift({ day: s.day, text: 'Les premiers drakkars vikings apparaissent sur les côtes.' });
  n.event(`${year(s)} — Les Vikings !`, 'Venus de Scandinavie, des pirates abordent les côtes de la Manche et de l\'Atlantique et remontent les fleuves (Seine, Loire, Garonne…) pour piller les villes. Remparts et châteaux forts doublent la défense d\'une ville ; tes armées peuvent aussi intercepter les bandes. Tu peux aussi leur payer un tribut (Danegeld) depuis Guerre et paix. Un jour, ils s\'installeront…');
  return f;
}

/** Lance un raid sur une ville : le joueur (une fois sur trois s'il a une ville à portée) ou un rival */
function raid(s: GameState, geo: Geo, f: Faction, n: WarNotify, paris = false) {
  const mine = f.war ? s.buildings.filter(b => b.city && b.built && !recentlyPillaged(s, b) && reachable(geo, b.x, b.y)) : [];
  const theirs: { o: Faction; c: RBuilding }[] = [];
  for (const o of rivalsOf(s)) for (const c of o.b) if (c.type === 'village' && !recentlyPillaged(s, ecoBuilding(o, c.id)) && reachable(geo, c.x, c.y)) theirs.push({ o, c });
  let t: { kind: 'b' | 'rb'; c: Building | RBuilding; o?: Faction; g: number } | null = null;
  if (paris) {
    // siège de Paris (845) : la ville la plus proche de Lutèce
    const [px, py] = geo.proj(2.35, 48.85), d = (c: { x: number; y: number }) => Math.hypot(c.x - px, c.y - py);
    const all = [...mine.map(c => ({ kind: 'b' as const, c, g: playerGarrison(s, c) })), ...theirs.map(x => ({ kind: 'rb' as const, c: x.c, o: x.o, g: rivalGarrison(s, x.c) }))];
    t = all.sort((a, z) => d(a.c) - d(z.c))[0] ?? null;
  } else if (mine.length && (Math.random() < 1 / 3 || !theirs.length)) {
    const c = mine[Math.floor(Math.random() * mine.length)]; t = { kind: 'b', c, g: playerGarrison(s, c) };
  } else if (theirs.length) {
    const x = theirs[Math.floor(Math.random() * theirs.length)]; t = { kind: 'rb', c: x.c, o: x.o, g: rivalGarrison(s, x.c) };
  }
  if (!t) return;
  const at = landing(geo, t.c), men = Math.round(Math.min(paris ? 600 : 400, Math.max(60, t.g * (paris ? 1.8 : 1.4) + 30)));
  const a: Army = { id: s.nextId++, owner: VIKINGS, x: at.x, y: at.y, men, leg: 0.6, hp: 100, state: 'march', target: { kind: t.kind, id: t.c.id } };
  armies(s).push(a);
  const how = geo.nearSea(at.x, at.y, 3) ? 'abordent la côte' : 'remontent le fleuve';
  if (t.kind === 'b') n.event(`${year(s)} — ${paris ? 'Les Vikings assiègent Paris !' : 'Raid viking !'}`, `Des drakkars ${how} : ${men} guerriers marchent sur ${t.c.name}. Remparts ou château fort à moins de 20 km doublent sa défense ; une armée peut aussi les intercepter.`);
  else s.log.unshift({ day: s.day, text: `${paris ? 'Siège de Paris : ' : ''}des Vikings débarquent et marchent sur ${t.c.name} (${t.o!.short}).` });
}

/** Chaque mois : arrivée, nouveaux raids, retour des bandes, installation de force en 911 */
export function monthlyVikings(s: GameState, geo: Geo, n: WarNotify) {
  if (!s.factions?.length || s.era < 3) return;
  const y = year(s);
  let f = vikings(s);
  if (!f) { if (y < RAIDS_FROM || y > SETTLE_BY + 40) return; f = arrive(s, n); }
  if (f.dead || !f.raider) return;
  // une bande qui a pillé sa ville (ou dont la cible a disparu) rembarque avec son butin
  s.armies = armies(s).filter(a => !(a.owner === VIKINGS && a.state === 'idle'));
  // Danegeld payé : la trêve finie, ils reviennent
  if (!f.war && !(f.pact && f.pact > s.day)) { f.war = true; f.warSince = s.day; f.pact = undefined; }
  if (y >= SETTLE_BY && found(s, geo, f, n)) return;
  const bands = armies(s).filter(a => a.owner === VIKINGS).length;
  if (y >= 845 && !f.paris) { f.paris = true; raid(s, geo, f, n, true); return; }
  const p = y >= 840 && y <= 892 ? 0.07 : 0.035;
  if (bands < 2 && Math.random() < p) raid(s, geo, f, n);
}

/** Une bande victorieuse garde la ville qu'elle vient de prendre (à partir de 880, une fois sur deux) */
export const settleNow = (s: GameState, f: Faction) => !!f.raider && year(s) >= SETTLE_FROM && Math.random() < 0.5;

/** Économie des Vikings installés : les techniques des chapitres I et II, et le butin des raids */
function ensureEco(s: GameState, f: Faction) {
  f.techs = TECHS.filter(t => t.era <= 2).map(t => t.id);
  if (!f.eco) { f.eco = newEco(s, f, (s.factions!.indexOf(f) + 1) * 10_000_000); f.eco.era = 3; }
  f.money = Math.max(f.money, 4000); f.eco.money = f.money;
}

/** Les Vikings s'installent : fin des raids, paix avec tous et trêve de 5 ans avec le joueur */
function settled(s: GameState, geo: Geo, f: Faction, c: { name: string; x: number; y: number }, n: WarNotify, fromPlayer: boolean) {
  f.raider = false; f.capital = c.name;
  const [rx, ry] = geo.proj(ROUEN[0], ROUEN[1]);
  if (Math.hypot(c.x - rx, c.y - ry) < 120 && !(s.factions ?? []).some(o => o.short === 'Normandie')) { f.name = 'Ducs de Normandie'; f.short = 'Normandie'; }
  else { f.name = `Normands de ${c.name}`; f.short = 'Normands'; }
  s.armies = armies(s).filter(a => a.owner !== VIKINGS);
  for (const o of s.factions ?? []) o.foes = (o.foes ?? []).filter(id => id !== VIKINGS);
  f.foes = [];
  // comme au traité de Saint-Clair-sur-Epte (911) : une trêve de 5 ans avec tout le monde, même avec le joueur dont ils ont pris la ville
  if (f.war) makePeace(s, f);
  f.rel = Math.min(f.rel ?? -30, -30);
  s.log.unshift({ day: s.day, text: `Les Vikings s'installent à ${c.name} et deviennent les ${f.name}.` });
  n.event(`${year(s)} — Les Vikings s'installent`, `Les Vikings se fixent à ${c.name} et deviennent les ${f.name}. Fini les raids : ils bâtissent désormais leur propre économie, comme tes autres rivaux. Ils signent une trêve de 5 ans${fromPlayer ? ' : ensuite, tu pourras leur déclarer la guerre pour reprendre ta ville' : ''}.`);
}

/** Ils prennent la ville d'un rival (et ses environs) */
export function takeRivalCity(s: GameState, geo: Geo, f: Faction, o: Faction, c: RBuilding, n: WarNotify) {
  ensureEco(s, f);
  const city = ecoBuilding(o, c.id), r = 18 + 8 * (c.tier ?? 0);
  const ids = o.eco && city ? cityDomain(o.eco, city, r) : new Set([c.id]);
  if (city?.city) city.city.pop *= 0.85;
  syncAllyRoads(s);
  if (o.eco) transfer(o.eco, f.eco!, ids, { x: c.x, y: c.y, r }, o.id, f.id);
  syncView(s, o); syncView(s, f);
  s.log.unshift({ day: s.day, text: `Les Vikings prennent ${c.name} aux ${o.name}.` });
  if (!o.b.some(b => b.type === 'village')) {
    o.dead = true; o.b = []; o.roads = []; o.trade = false; o.alliance = false; o.eco = undefined; syncLent(s);
    s.armies = armies(s).filter(x => x.owner !== o.id);
    for (const q of s.factions ?? []) q.foes = (q.foes ?? []).filter(id => id !== o.id);
    s.log.unshift({ day: s.day, text: `Les ${o.name} n'ont plus aucune ville.` });
  }
  settled(s, geo, f, c, n, false);
}
/** Ils prennent une ville du joueur (appelé par la guerre, après le transfert) */
export function tookPlayerCity(s: GameState, geo: Geo, f: Faction, c: { name: string; x: number; y: number }, n: WarNotify) { settled(s, geo, f, c, n, true); }
/** Prépare l'économie qui recevra une ville conquise */
export const prepareConquest = (s: GameState, f: Faction) => ensureEco(s, f);

/** Installation de force : ils fondent leur ville à l'estuaire de la Seine (sinon ailleurs sur la côte) */
function found(s: GameState, geo: Geo, f: Faction, n: WarNotify) {
  for (const [lo, la] of SITES) {
    const [sx, sy] = geo.proj(lo, la);
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 30, x = sx + Math.cos(a) * r, y = sy + Math.sin(a) * r;
      if (geo.maskAt(x, y) !== 1 || geo.waterDist(x, y) > 5 || !settleSpot(f, x, y) || !settleSpot(f, x + 4, y + 3)) continue;
      ensureEco(s, f);
      const name = spotName(x, y);
      foundHome(s, geo, f, x, y, name);
      settled(s, geo, f, { name, x, y }, n, false);
      return true;
    }
  }
  return false;
}
export const isRaider = (f?: Faction | null) => !!f?.raider;
export { PLAYER };
