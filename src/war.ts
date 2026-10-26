// Guerre : casernes, armées sur la carte, batailles, sièges, conquête, pillage, tribut.
import { BUILD, PLAYER_COLOR, type ResId } from './defs';
import { changeRel, relLabel, relOf, takeFromStores, storeTotal } from './diplomacy';
import type { Geo } from './geo';
import { factionPop, territoryRadius } from './rivals';
import { cityDomain, ecoBuilding, syncAllyRoads, syncLent, syncView, transfer } from './rivalai';
import type { Army, Building, Faction, GameState, RBuilding } from './state';
import { prepareConquest, settleNow, takeRivalCity, tookPlayerCity } from './vikings';

const YEAR = 365.25;
export const PLAYER = 'player';
export interface WarNotify {
  event(title: string, text: string): void; toast(t: string, k?: 'info' | 'good' | 'bad'): void;
  ask?(title: string, text: string, yes: () => void): void;
  choose?(title: string, text: string, options: { label: string; fn: () => void }[]): void;
  gameOver(text?: string): void;
}

/** Recrutement : coût par groupe de 50 hommes */
export const RECRUIT = {
  leg: { name: 'Légionnaires', men: 50, money: 400, res: { fer: 8, outils: 4 } as Partial<Record<ResId, number>>, leg: 1 },
  aux: { name: 'Auxiliaires', men: 50, money: 200, res: { fer: 3 } as Partial<Record<ResId, number>>, leg: 0 },
};
export const MERC = { men: 40, money: 900 };
export const warAllowed = (s: GameState) => s.era >= 2;
const year = (s: GameState) => { const y = -50 + Math.floor(s.day / YEAR); return y >= 0 ? y + 1 : y; };
export const armies = (s: GameState) => (s.armies ??= []);
export const ownerColor = (s: GameState, o: string) => o === PLAYER ? PLAYER_COLOR : s.factions?.find(f => f.id === o)?.color ?? '#555';
export const ownerName = (s: GameState, o: string) => o === PLAYER ? 'Toi' : s.factions?.find(f => f.id === o)?.name ?? '?';
export const strength = (a: Army) => a.men * (1 + 0.4 * a.leg) * a.hp / 100;
const speedOf = (a: Army) => 22 + 10 * (1 - a.leg);   // km par jour

/** Deux camps sont-ils en guerre ? */
export function hostile(s: GameState, a: string, b: string) {
  if (a === b) return false;
  if (a === PLAYER || b === PLAYER) { const f = s.factions?.find(x => x.id === (a === PLAYER ? b : a)); return !!f?.war; }
  const fa = s.factions?.find(x => x.id === a);
  return !!fa?.foes?.includes(b);
}
const playerCities = (s: GameState) => s.buildings.filter(b => b.city && b.built);
const rivalCities = (f: Faction) => f.b.filter(b => b.type === 'village');

/** Garnison d'une ville du joueur : milice des habitants (comme chez les rivaux), doublée par des remparts proches
 *  (`walls = false` : sans compter les remparts) */
export function playerGarrison(s: GameState, c: Building, walls = true) {
  const w = walls && s.buildings.some(b => b.built && !b.damaged && BUILD[b.type].effect?.protect && Math.hypot(b.x - c.x, b.y - c.y) <= 20);
  return c.city!.pop * 0.025 * (s.era >= 2 && c.city!.tier >= 1 ? 1.5 : 1) * (w ? 2 : 1);
}
export const rivalGarrison = (s: GameState, c: RBuilding) => (c.pop ?? 0) * 0.025 * (s.era >= 2 && (c.tier ?? 0) >= 1 ? 1.5 : 1);

// ---------- Actions du joueur ----------
function nearestCity(s: GameState, x: number, y: number) { return playerCities(s).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]; }
function addTroops(s: GameState, x: number, y: number, men: number, leg: number, merc = false) {
  const ex = armies(s).find(a => a.owner === PLAYER && a.state === 'idle' && !!a.merc === merc && Math.hypot(a.x - x, a.y - y) < 3);
  if (ex) { ex.leg = (ex.leg * ex.men + leg * men) / (ex.men + men); ex.hp = (ex.hp * ex.men + 100 * men) / (ex.men + men); ex.men += men; return ex; }
  const a: Army = { id: s.nextId++, owner: PLAYER, x: x + 2, y: y - 2, men, leg, hp: 100, merc, state: 'idle' };
  armies(s).push(a); return a;
}
export function recruit(s: GameState, b: Building, kind: 'leg' | 'aux'): string | null {
  if (!warAllowed(s)) return 'Les armées se lèvent à partir du chapitre II.';
  const r = RECRUIT[kind], c = nearestCity(s, b.x, b.y);
  if (!c || Math.hypot(c.x - b.x, c.y - b.y) > 30) return 'Il faut une ville à moins de 30 km.';
  if (c.city!.pop < 150 + r.men) return `${c.name} n'a pas assez d'habitants pour fournir ${r.men} hommes.`;
  if (s.money < r.money) return `Pas assez d'argent (${r.money} sesterces).`;
  for (const [res, q] of Object.entries(r.res) as [ResId, number][]) if (storeTotal(s, res) < q) return `Il faut ${q} t de ${res} dans tes entrepôts.`;
  for (const [res, q] of Object.entries(r.res) as [ResId, number][]) takeFromStores(s, res, q);
  s.money -= r.money; s.stats.expenses += r.money;
  c.city!.pop -= r.men;
  addTroops(s, b.x, b.y, r.men, r.leg);
  return null;
}
export function hireMercs(s: GameState, b: Building): string | null {
  if (!warAllowed(s)) return 'Les mercenaires se louent à partir du chapitre II.';
  if (s.money < MERC.money) return `Pas assez d'argent (${MERC.money} sesterces).`;
  s.money -= MERC.money; s.stats.expenses += MERC.money;
  addTroops(s, b.x, b.y, MERC.men, 0.5, true);
  return null;
}
export function disband(s: GameState, a: Army) {
  const c = nearestCity(s, a.x, a.y);
  if (c && !a.merc) c.city!.pop += a.men;
  s.armies = armies(s).filter(x => x !== a);
}
export function targetPos(s: GameState, t: Army['target']): { x: number; y: number } | null {
  if (!t) return null;
  if (t.kind === 'army') return armies(s).find(a => a.id === t.id) ?? null;
  if (t.kind === 'b') return s.buildings.find(b => b.id === t.id) ?? null;
  for (const f of s.factions ?? []) { const b = f.b.find(x => x.id === t.id); if (b) return b; }
  return null;
}
export function declareWar(s: GameState, f: Faction): string {
  if (!warAllowed(s)) return 'La guerre n\'est possible qu\'à partir du chapitre II.';
  const broke = !!(f.pact && f.pact > s.day);
  f.war = true; f.warSince = s.day; f.trade = false; f.alliance = false; f.pact = undefined; syncAllyRoads(s);
  f.rel = Math.min(relOf(f), -70);
  for (const o of s.factions ?? []) if (o !== f) changeRel(o, broke ? -15 : -5);
  s.log.unshift({ day: s.day, text: `Tu déclares la guerre aux ${f.name}.` });
  return `Guerre déclarée aux ${f.name}${broke ? ' : le pacte rompu choque tous les rivaux' : ''}.`;
}
/** Conditions de paix : le rival accepte-t-il sans contrepartie, et quelle indemnité (ou Danegeld) demande-t-il ? */
export function peaceTerms(s: GameState, f: Faction) {
  const mine = armies(s).filter(a => a.owner === PLAYER).reduce((t, a) => t + strength(a), 0);
  const theirs = armies(s).filter(a => a.owner === f.id).reduce((t, a) => t + strength(a), 0);
  const long = s.day - (f.warSince ?? s.day) > 3 * YEAR;
  // Vikings pillards : pas de paix, seulement un tribut (Danegeld) qui les détourne de tes villes pendant 5 ans
  const cost = f.raider ? Math.round(800 + s.buildings.reduce((t, b) => t + (b.city?.pop ?? 0), 0) * 0.05) : Math.round(500 + factionPop(f) * 0.3);
  return { free: !f.raider && (theirs < mine * 0.8 || long || f.character === 'commercant'), cost };
}
/** Proposition de paix : acceptée si le rival est en position de faiblesse, ou contre une indemnité */
export function proposePeace(s: GameState, f: Faction, pay: boolean): string {
  const { free, cost } = peaceTerms(s, f);
  if (f.raider && !pay) return `Les Vikings ne négocient pas : ils veulent de l'argent. Un tribut (Danegeld) de ${cost} sesterces les éloignerait de tes villes pendant 5 ans.`;
  // une paix qu'ils acceptent d'eux-mêmes ne coûte rien
  if (pay && !free) {
    if (s.money < cost) return `Il faut ${cost} sesterces d'indemnité.`;
    s.money -= cost; s.stats.expenses += cost; f.money += cost;
  } else if (!free) return `Les ${f.name} refusent la paix. Une indemnité de ${cost} sesterces pourrait les convaincre.`;
  makePeace(s, f);
  if (f.raider) return `Tribut payé : les Vikings laissent tes villes en paix pendant 5 ans.`;
  return `Paix signée avec les ${f.name} (pacte de non-agression de 5 ans).`;
}
export function makePeace(s: GameState, f: Faction) {
  f.war = false; f.pact = s.day + 5 * YEAR; f.rel = Math.max(relOf(f), -30);
  // tes alliés, entrés en guerre à tes côtés, signent la paix avec toi
  for (const o of s.factions ?? []) if (o !== f && o.alliance && o.foes?.includes(f.id)) rivalPeace(s, o, f);
  // ses armées rentrent chez elles
  for (const a of armies(s)) if (a.owner === f.id) { a.target = null; a.state = 'idle'; }
  for (const a of armies(s)) if (a.owner === PLAYER && a.target && targetOwner(s, a.target) === f.id) { a.target = null; a.state = 'idle'; }
  s.log.unshift({ day: s.day, text: `Paix avec les ${f.name}.` });
}
/** Paix entre deux rivaux */
export function rivalPeace(s: GameState, a: Faction, b: Faction) {
  a.foes = (a.foes ?? []).filter(id => id !== b.id); b.foes = (b.foes ?? []).filter(id => id !== a.id);
  for (const x of armies(s)) if ((x.owner === a.id || x.owner === b.id) && x.target && x.target.kind !== 'b') { x.target = null; x.state = 'idle'; x.siege = undefined; }
  s.log.unshift({ day: s.day, text: `Paix entre les ${a.name} et les ${b.name}.` });
}
/** Un rival n'a plus aucune ville : il disparaît (fin des guerres, des traités et des tributs) */
export function killFaction(s: GameState, f: Faction) {
  f.dead = true; f.war = false; f.pact = undefined; f.b = []; f.roads = []; f.trade = false; f.alliance = false; f.eco = undefined; syncLent(s);
  s.armies = armies(s).filter(x => x.owner !== f.id);
  for (const a of armies(s)) if (a.target && targetOwner(s, a.target) === undefined) { a.target = null; a.state = 'idle'; a.siege = undefined; }
  for (const o of s.factions ?? []) o.foes = (o.foes ?? []).filter(id => id !== f.id);
  f.foes = [];
  s.tributes = (s.tributes ?? []).filter(t => t.f !== f.id);
}
function targetOwner(s: GameState, t: NonNullable<Army['target']>) {
  if (t.kind === 'army') return armies(s).find(a => a.id === t.id)?.owner;
  if (t.kind === 'b') return PLAYER;
  return s.factions?.find(f => f.b.some(b => b.id === t.id))?.id;
}

// ---------- Simulation quotidienne : marches, batailles, sièges ----------
export function warStep(s: GameState, geo: Geo, dt: number, n: WarNotify) {
  const list = armies(s);
  if (!list.length) return;
  for (const a of list) {
    // armée supprimée pendant ce pas (bande viking installée, rival éliminé) : elle ne compte plus
    if (a.men <= 0 || (s.armies !== list && !s.armies!.includes(a))) continue;
    // une armée ennemie toute proche : bataille
    const foe = armies(s).find(o => o !== a && o.men > 0 && hostile(s, a.owner, o.owner) && Math.hypot(o.x - a.x, o.y - a.y) < 4);
    if (foe) {
      a.state = 'fight';
      const loss = strength(foe) * 0.05 * dt / (1 + 0.4 * a.leg);
      a.men = Math.max(0, a.men - loss); a.hp = Math.max(0, a.hp - loss / Math.max(20, a.men) * 60);
      continue;
    }
    if (a.state === 'fight') a.state = a.target ? 'march' : 'idle';
    const p = targetPos(s, a.target ?? null);
    if (!p) { if (a.target) { a.target = null; a.state = 'idle'; a.siege = undefined; } continue; }
    const d = Math.hypot(p.x - a.x, p.y - a.y);
    if (a.target!.kind === 'army' || d > 3) {
      a.state = 'march';
      march(s, geo, a, p, dt);
      continue;
    }
    // siège d'une ville
    a.state = 'siege';
    siege(s, geo, a, n, dt);
  }
  // fin des armées détruites ou démoralisées (dans la liste à jour : des armées ont pu être ajoutées ou retirées)
  for (const a of armies(s)) if (a.men > 0 && (a.men < 5 || a.hp < 12)) {
    s.log.unshift({ day: s.day, text: `${a.owner === PLAYER ? 'Ton armée' : 'L\'armée des ' + ownerName(s, a.owner)} est vaincue (${Math.round(a.men)} survivants dispersés).` });
    if (a.owner === PLAYER) n.toast('Ton armée a été vaincue.', 'bad'); else if (hostile(s, a.owner, PLAYER)) n.toast(`L'armée des ${ownerName(s, a.owner)} a été vaincue !`, 'good');
    a.men = 0;
  }
  s.armies = armies(s).filter(a => a.men > 0);
}

/** Marche par la terre : l'armée suit son itinéraire (lacs, mer et montagnes raides contournés),
 *  recalculé quand sa cible s'est déplacée */
function march(s: GameState, geo: Geo, a: Army, p: { x: number; y: number }, dt: number) {
  const k = `${a.target!.kind}${a.target!.id}`;
  const moved = !a.routeTo || Math.hypot(a.routeTo.x - p.x, a.routeTo.y - p.y) > 6;
  if (!a.route || a.routeTo?.k !== k || (moved && s.day - (a.routeDay ?? -99) >= 1)) {
    a.route = geo.landPath(a.x, a.y, p.x, p.y) ?? [{ x: p.x, y: p.y }];
    a.routeTo = { x: p.x, y: p.y, k }; a.routeDay = s.day;
  }
  // la cible bouge un peu : le dernier point la suit
  if (a.route.length) a.route[a.route.length - 1] = { x: p.x, y: p.y };
  let step = speedOf(a) * dt;
  while (step > 0 && a.route.length) {
    const q = a.route[0], d = Math.hypot(q.x - a.x, q.y - a.y);
    if (d <= step) { a.x = q.x; a.y = q.y; step -= d; if (a.route.length > 1) a.route.shift(); else break; }
    else { a.x += (q.x - a.x) / d * step; a.y += (q.y - a.y) / d * step; step = 0; }
  }
}

function siege(s: GameState, geo: Geo, a: Army, n: WarNotify, dt: number) {
  const t = a.target!;
  // nouvelle cible : le siège repart de zéro (garnison complète)
  if (a.siegeOn !== t.id) { a.siege = undefined; a.siegeOn = t.id; }
  if (t.kind === 'rb') {
    const f = s.factions!.find(x => x.b.some(b => b.id === t.id))!, c = f.b.find(b => b.id === t.id)!;
    // une autre armée vient de la piller : il n'y a plus rien à prendre (le joueur, lui, peut encore la conquérir)
    if (!hostile(s, a.owner, f.id) || (a.owner !== PLAYER && recentlyPillaged(s, ecoBuilding(f, c.id)))) { a.target = null; a.state = 'idle'; a.siege = undefined; return; }
    a.siege ??= rivalGarrison(s, c);
    const g = a.siege;
    a.men = Math.max(0, a.men - g * 0.04 * dt); a.hp = Math.max(0, a.hp - g * 0.04 * dt / Math.max(20, a.men) * 40);
    a.siege = Math.max(0, g - strength(a) * 0.05 * dt);
    if (a.siege <= 0 && a.men > 0) { a.siege = undefined; a.target = null; a.state = 'idle'; victory(s, geo, a, f, c, n); }
    return;
  }
  if (t.kind === 'b') {
    const c = s.buildings.find(b => b.id === t.id);
    if (!c?.city || !hostile(s, a.owner, PLAYER) || recentlyPillaged(s, c)) { a.target = null; a.state = 'idle'; a.siege = undefined; return; }
    a.siege ??= playerGarrison(s, c);
    const g = a.siege;
    a.men = Math.max(0, a.men - g * 0.04 * dt); a.hp = Math.max(0, a.hp - g * 0.04 * dt / Math.max(20, a.men) * 40);
    a.siege = Math.max(0, g - strength(a) * 0.05 * dt);
    if (a.siege <= 0 && a.men > 0) { a.siege = undefined; a.target = null; a.state = 'idle'; defeat(s, geo, a, c, n); }
  }
}

/** Une ville rivale perd une partie de ses habitants (pillage, conquête) */
function shrink(s: GameState, f: Faction, c: RBuilding, k: number) {
  const b = ecoBuilding(f, c.id); if (b?.city) b.city.pop *= k;
  c.pop = (c.pop ?? 0) * k;
  void s;
}

/** Le joueur (ou un rival allié) prend une ville rivale */
function victory(s: GameState, geo: Geo, a: Army, f: Faction, c: RBuilding, n: WarNotify) {
  if (a.owner !== PLAYER) {
    // guerre entre rivaux : le vainqueur pille la ville
    const w = s.factions!.find(x => x.id === a.owner);
    // Vikings : à partir de 880, la bande peut garder la ville
    if (w && settleNow(s, w)) { takeRivalCity(s, geo, w, f, c, n); return; }
    if (w?.raider) w.raids = (w.raids ?? 0) + 1;
    if (w) { const loot = Math.max(0, Math.min(f.money, (c.pop ?? 0) * 1.5)); f.money -= loot; w.money += loot; shrink(s, f, c, 0.85); const e = ecoBuilding(f, c.id); if (e?.city) e.city.pillaged = s.day; }
    s.log.unshift({ day: s.day, text: `Les ${ownerName(s, a.owner)} pillent ${c.name} (${f.short}).` });
    return;
  }
  // une ville pillée depuis moins d'un an n'a presque plus rien à prendre
  const fresh = !recentlyPillaged(s, ecoBuilding(f, c.id) ?? undefined);
  const loot = fresh ? Math.round(Math.min(Math.max(0, f.money) * 0.3 + (c.pop ?? 0) * 1.5, 20000)) : 0;
  const tribute = Math.round(Math.max(60, factionPop(f) * 0.05));
  const conquer = () => {
    const r = territoryRadius(c);
    // la ville, son entrepôt, les exploitations que desservent ses lignes et ses environs (sauf les autres villes)
    // passent au joueur, en état de marche : routes, lignes et véhicules
    const city = ecoBuilding(f, c.id);
    const ids = f.eco && city ? cityDomain(f.eco, city, r) : new Set([c.id]);
    const taken = f.b.filter(b => ids.has(b.id));
    shrink(s, f, c, 0.85);
    syncAllyRoads(s);
    if (f.eco) transfer(f.eco, s, ids, { x: c.x, y: c.y, r }, f.id, PLAYER);
    syncView(s, f);
    changeRel(f, -30); for (const o of s.factions ?? []) if (o !== f) changeRel(o, -8);
    s.log.unshift({ day: s.day, text: `Tu conquiers ${c.name} et ses environs (${taken.length} bâtiment(s)).` });
    n.toast(`${c.name} est à toi ! Relie-la par la route à ton réseau.`, 'good');
    if (!rivalCities(f).length) {
      // plus de ville : le rival se soumet, ses derniers bâtiments sont abandonnés
      makePeace(s, f); killFaction(s, f);
      n.event(`Les ${f.name} se soumettent`, 'Ils n\'ont plus aucune ville : leurs terres sont désormais libres.');
    }
  };
  const pillage = () => {
    s.money += loot; s.stats.income += loot; f.money = Math.max(0, f.money - loot); if (f.eco) f.eco.money = f.money;
    if (fresh) shrink(s, f, c, 0.8);
    const e = ecoBuilding(f, c.id); if (e?.city) e.city.pillaged = s.day;
    changeRel(f, -20);
    s.log.unshift({ day: s.day, text: fresh ? `Tu pilles ${c.name} : ${loot} sesterces.` : `Tu pilles ${c.name}, déjà pillée cette année : il n'y avait plus rien à prendre.` });
  };
  const tribut = () => {
    (s.tributes ??= []).push({ f: f.id, amount: tribute, until: s.day + 5 * YEAR });
    makePeace(s, f); changeRel(f, -10);
    s.log.unshift({ day: s.day, text: `Les ${f.name} acceptent de te verser ${tribute} sesterces par mois pendant 5 ans.` });
  };
  if (n.choose) n.choose(`Victoire à ${c.name} !`, `La garnison des ${f.name} est vaincue. Que fais-tu de la ville ?`, [
    { label: 'Conquérir', fn: conquer }, { label: fresh ? `Piller (${loot})` : 'Piller (déjà pillée)', fn: pillage }, { label: `Tribut (${tribute}/mois, paix)`, fn: tribut }]);
  else pillage();
}

/** Un rival prend une ville du joueur : conquête (ambitieux ou hostile) ou pillage */
function defeat(s: GameState, geo: Geo, a: Army, c: Building, n: WarNotify) {
  const f = s.factions!.find(x => x.id === a.owner)!;
  // les Vikings pillent ; à partir de 880, ils peuvent garder la ville
  const conquer = f.raider ? settleNow(s, f) : s.difficulty === 'ambitieux' || relLabel(f).label === 'Hostile';
  if (conquer && f.raider) prepareConquest(s, f);
  const r = 18 + 8 * c.city!.tier;
  if (conquer) {
    const ids = cityDomain(s, c, r), taken = s.buildings.filter(b => ids.has(b.id));
    // le rival récupère la ville, son entrepôt et ses exploitations en état de marche (routes, lignes, véhicules)
    syncAllyRoads(s);
    if (f.eco) transfer(s, f.eco, ids, { x: c.x, y: c.y, r }, PLAYER, f.id);
    syncView(s, f);
    // défaite totale : la dernière ville vient de tomber
    if (!playerCities(s).length) { s.over = true; n.gameOver(`${c.name}, ta dernière ville, est tombée aux mains des ${f.name}. Tes rivaux se partagent la province.`); return; }
    if (f.raider) { tookPlayerCity(s, geo, f, c, n); return; }
    n.event(`${c.name} est tombée !`, `Les ${f.name} ont pris la ville et ${taken.length - 1} bâtiment(s) autour. Lève une armée pour la reprendre.`);
    s.log.unshift({ day: s.day, text: `Les ${f.name} conquièrent ${c.name}.` });
  } else {
    const loss = Math.round(Math.min(Math.max(0, s.money) * 0.15, 2000));
    s.money -= loss; f.money += loss; c.city!.pop *= 0.8; c.city!.pillaged = s.day;
    if (f.raider) f.raids = (f.raids ?? 0) + 1;
    for (const b of s.buildings) if (b !== c && b.built && !b.city && !BUILD[b.type].wonder && Math.hypot(b.x - c.x, b.y - c.y) <= r && Math.random() < 0.5) b.damaged = true;
    n.event(`${c.name} est pillée !`, `Les ${f.name} ont pillé la ville : ${loss} sesterces volés, des habitants tués et des bâtiments endommagés.`);
    s.log.unshift({ day: s.day, text: `Les ${f.name} pillent ${c.name}.` });
  }
}

/** Des hommes rejoignent (men > 0) ou quittent (men < 0) les villes d'un rival, au prorata de leur population */
function giveBackMen(f: Faction, men: number) {
  const cs = rivalCities(f), pop = cs.reduce((t, c) => t + (c.pop ?? 0), 0);
  if (pop <= 0) return;
  for (const c of cs) {
    const k = Math.max(0.5, 1 + men / pop);
    c.pop = (c.pop ?? 0) * k;
    const b = ecoBuilding(f, c.id); if (b?.city) b.city.pop *= k;
  }
}

/** Ville pillée depuis moins d'un an */
export const recentlyPillaged = (s: GameState, c?: Building) => !!c?.city?.pillaged && s.day - c.city.pillaged < YEAR;

// ---------- Mensuel : solde, tributs, décisions des rivaux ----------
export function monthlyWar(s: GameState, n: WarNotify) {
  const list = armies(s);
  // solde et vivres de tes armées
  for (const a of list.filter(x => x.owner === PLAYER)) {
    const pay = a.men * (a.merc ? 2.4 : 1.2);
    s.money -= pay; s.stats.expenses += pay;
    const food = Math.ceil(a.men * 0.01), got = takeFromStores(s, 'cereales', food);
    if (got < food) { a.hp = Math.max(0, a.hp - 8); if (a.hp < 40) n.toast('Ton armée manque de céréales : elle s\'affaiblit.', 'bad'); }
    else a.hp = Math.min(100, a.hp + (a.state === 'idle' ? 6 : 1));
  }
  // tributs
  for (const t of s.tributes ?? []) {
    const f = s.factions?.find(x => x.id === t.f); if (!f || f.dead || t.until < s.day) continue;
    const p = Math.max(0, Math.min(f.money, t.amount)); f.money -= p; s.money += p; s.stats.income += p;
  }
  s.tributes = (s.tributes ?? []).filter(t => t.until >= s.day);
  if (!warAllowed(s)) return;
  const y = year(s);
  for (const f of (s.factions ?? []).filter(x => !x.dead && !x.raider)) {
    // déclaration de guerre
    if (!f.war && !f.alliance && !(f.pact && f.pact > s.day) && playerCities(s).length) {
      // crise du IIIe siècle et invasions : beaucoup de guerres ; au Moyen Âge, des guerres plus espacées
      const period = y >= 235 && y <= 284 ? 0.02 : y >= 400 && y < 500 ? 0.015 : y >= 500 ? 0.005 : y >= 150 ? 0.006 : 0.003;
      const mood = relOf(f) < -60 ? 3 : relOf(f) < -20 ? 1 : 0.15;
      const char = ({ guerrier: 2, opportuniste: 1.3, fidele: 0.5, commercant: 0.4 } as Record<string, number>)[f.character] ?? 1;
      const diff = s.difficulty === 'ambitieux' ? 1.5 : s.difficulty === 'facile' ? 0.6 : 1;
      if (Math.random() < period * mood * char * diff) {
        f.war = true; f.warSince = s.day; f.trade = false; f.rel = Math.min(relOf(f), -60);
        n.event(`Les ${f.name} te déclarent la guerre !`, `Leurs troupes vont marcher sur tes villes. Construis une caserne pour lever une armée, des remparts pour protéger tes villes, ou négocie la paix depuis la Diplomatie.`);
        s.log.unshift({ day: s.day, text: `Les ${f.name} déclarent la guerre.` });
        // défense commune : tes alliés entrent en guerre contre l'agresseur
        for (const o of s.factions ?? []) if (o !== f && o.alliance) { (o.foes ??= []).push(f.id); (f.foes ??= []).push(o.id); s.log.unshift({ day: s.day, text: `Tes alliés ${o.name} entrent en guerre à tes côtés.` }); }
      }
    }
    // recrutement et offensives des rivaux en guerre (des pillards sans ville ne justifient pas une armée)
    const enemies = [...(f.war ? [PLAYER] : []), ...(f.foes ?? []).filter(id => !s.factions?.find(o => o.id === id)?.raider)];
    const mine = armies(s).filter(a => a.owner === f.id);
    if (!enemies.length) {
      // en paix : ses armées rentrent et se dispersent (les hommes retournent dans ses villes)
      if (mine.length) { for (const a of mine) giveBackMen(f, a.men); s.armies = armies(s).filter(a => a.owner !== f.id); }
      continue;
    }
    // guerre entre rivaux : elle finit par s'arrêter (lassitude, environ 4 ans en moyenne)
    for (const id of [...(f.foes ?? [])]) {
      const o = s.factions?.find(x => x.id === id);
      if (o && !o.raider && !o.dead && Math.random() < 0.02) rivalPeace(s, f, o);
    }
    const pop = factionPop(f);
    const total = mine.reduce((t, a) => t + a.men, 0);
    // une armée à la mesure de sa population (au plus 1 500 hommes), levée parmi ses habitants
    if (f.money > 300 && total < Math.min(pop * 0.05, 1500)) {
      const men = Math.min(Math.floor(f.money / 8), Math.floor(pop * 0.03), 120);
      const cap = rivalCities(f).sort((p, q) => (q.pop ?? 0) - (p.pop ?? 0))[0];
      if (men >= 10 && cap) {
        f.money -= men * 8; giveBackMen(f, -men);
        // les renforts rejoignent une armée au repos près de sa ville, sinon forment une nouvelle armée
        const ex = mine.find(a => a.state === 'idle' && Math.hypot(a.x - cap.x, a.y - cap.y) < 30);
        if (ex) { ex.hp = (ex.hp * ex.men + 100 * men) / (ex.men + men); ex.men += men; }
        else armies(s).push({ id: s.nextId++, owner: f.id, x: cap.x + 3, y: cap.y + 2, men, leg: f.character === 'guerrier' ? 0.7 : 0.5, hp: 100, state: 'idle' });
      }
    }
    f.money = Math.max(0, f.money - total * 0.5);
    if (f.eco) f.eco.money = f.money;
    // une armée assez forte part attaquer la ville ennemie la plus proche
    for (const a of mine) {
      if (a.state !== 'idle' || a.men < 40) continue;
      const targets: { kind: 'b' | 'rb'; id: number; x: number; y: number }[] = [];
      // une ville pillée depuis moins d'un an n'a plus rien à prendre
      if (f.war) for (const c of playerCities(s)) if (!recentlyPillaged(s, c)) targets.push({ kind: 'b', id: c.id, x: c.x, y: c.y });
      for (const o of s.factions ?? []) if (f.foes?.includes(o.id)) for (const c of rivalCities(o)) if (!recentlyPillaged(s, ecoBuilding(o, c.id))) targets.push({ kind: 'rb', id: c.id, x: c.x, y: c.y });
      const t = targets.sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
      if (t) { a.target = { kind: t.kind, id: t.id }; a.state = 'march'; }
    }
    // lassitude : après une lourde défaite ou de longues années, le rival propose la paix
    // (ou, au bout de quatre ans, même s'il lui reste des troupes)
    const tired = s.day - (f.warSince ?? s.day);
    if (f.war && n.ask && tired > 2 * YEAR && (!mine.length || tired > 4 * YEAR) && Math.random() < 0.08)
      n.ask(`Les ${f.name} demandent la paix`, `${mine.length ? 'La guerre s\'éternise' : 'Leurs armées sont épuisées'}. Accepter la paix (pacte de non-agression de 5 ans) ?`, () => makePeace(s, f));
  }
}
