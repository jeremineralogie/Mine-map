// Guerre : casernes, armées sur la carte, batailles, sièges, conquête, pillage, tribut.
import { BUILD, PLAYER_COLOR, type ResId } from './defs';
import { changeRel, relLabel, relOf, takeFromStores, storeTotal } from './diplomacy';
import type { Geo } from './geo';
import { factionPop, territoryRadius } from './rivals';
import { cityDomain, ecoBuilding, syncAllyRoads, syncLent, syncView, transfer } from './rivalai';
import type { Army, Building, Faction, GameState, RBuilding } from './state';

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

/** Garnison d'une ville du joueur : milice des habitants, doublée par des remparts proches */
export function playerGarrison(s: GameState, c: Building) {
  const walls = s.buildings.some(b => b.built && BUILD[b.type].effect?.protect && Math.hypot(b.x - c.x, b.y - c.y) <= 20);
  return c.city!.pop * 0.02 * (walls ? 2 : 1);
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
/** Proposition de paix : acceptée si le rival est en position de faiblesse, ou contre une indemnité */
export function proposePeace(s: GameState, f: Faction, pay: boolean): string {
  const mine = armies(s).filter(a => a.owner === PLAYER).reduce((t, a) => t + strength(a), 0);
  const theirs = armies(s).filter(a => a.owner === f.id).reduce((t, a) => t + strength(a), 0);
  const long = s.day - (f.warSince ?? s.day) > 3 * YEAR;
  const cost = Math.round(500 + factionPop(f) * 0.3);
  if (pay) {
    if (s.money < cost) return `Il faut ${cost} sesterces d'indemnité.`;
    s.money -= cost; s.stats.expenses += cost; f.money += cost;
  } else if (!(theirs < mine * 0.8 || long || f.character === 'commercant')) return `Les ${f.name} refusent la paix. Une indemnité de ${cost} sesterces pourrait les convaincre.`;
  makePeace(s, f);
  return `Paix signée avec les ${f.name} (pacte de non-agression de 5 ans).`;
}
export function makePeace(s: GameState, f: Faction) {
  f.war = false; f.pact = s.day + 5 * YEAR; f.rel = Math.max(relOf(f), -30);
  // ses armées rentrent chez elles
  for (const a of armies(s)) if (a.owner === f.id) { a.target = null; a.state = 'idle'; }
  for (const a of armies(s)) if (a.owner === PLAYER && a.target && targetOwner(s, a.target) === f.id) { a.target = null; a.state = 'idle'; }
  s.log.unshift({ day: s.day, text: `Paix avec les ${f.name}.` });
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
    if (a.men <= 0) continue;
    // une armée ennemie toute proche : bataille
    const foe = list.find(o => o !== a && o.men > 0 && hostile(s, a.owner, o.owner) && Math.hypot(o.x - a.x, o.y - a.y) < 4);
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
      const step = Math.min(d, speedOf(a) * dt);
      const nx = a.x + (p.x - a.x) / d * step, ny = a.y + (p.y - a.y) / d * step;
      // les armées contournent la mer : elles s'arrêtent sur la côte
      if (geo.maskAt(nx, ny) !== 0 || d < 3) { a.x = nx; a.y = ny; }
      continue;
    }
    // siège d'une ville
    a.state = 'siege';
    siege(s, geo, a, n, dt);
  }
  // fin des armées détruites ou démoralisées
  for (const a of list) if (a.men > 0 && (a.men < 5 || a.hp < 12)) {
    s.log.unshift({ day: s.day, text: `${a.owner === PLAYER ? 'Ton armée' : 'L\'armée des ' + ownerName(s, a.owner)} est vaincue (${Math.round(a.men)} survivants dispersés).` });
    if (a.owner === PLAYER) n.toast('Ton armée a été vaincue.', 'bad'); else if (hostile(s, a.owner, PLAYER)) n.toast(`L'armée des ${ownerName(s, a.owner)} a été vaincue !`, 'good');
    a.men = 0;
  }
  s.armies = list.filter(a => a.men > 0);
}

function siege(s: GameState, geo: Geo, a: Army, n: WarNotify, dt: number) {
  const t = a.target!;
  if (t.kind === 'rb') {
    const f = s.factions!.find(x => x.b.some(b => b.id === t.id))!, c = f.b.find(b => b.id === t.id)!;
    if (!hostile(s, a.owner, f.id)) { a.target = null; a.state = 'idle'; return; }
    a.siege ??= rivalGarrison(s, c);
    const g = a.siege;
    a.men = Math.max(0, a.men - g * 0.04 * dt); a.hp = Math.max(0, a.hp - g * 0.04 * dt / Math.max(20, a.men) * 40);
    a.siege = Math.max(0, g - strength(a) * 0.05 * dt);
    if (a.siege <= 0 && a.men > 0) { a.siege = undefined; a.target = null; a.state = 'idle'; victory(s, geo, a, f, c, n); }
    return;
  }
  if (t.kind === 'b') {
    const c = s.buildings.find(b => b.id === t.id);
    if (!c?.city) { a.target = null; a.state = 'idle'; return; }
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
    if (w) { const loot = Math.min(f.money, (c.pop ?? 0) * 1.5); f.money -= loot; w.money += loot; shrink(s, f, c, 0.85); }
    s.log.unshift({ day: s.day, text: `Les ${ownerName(s, a.owner)} pillent ${c.name} (${f.short}).` });
    return;
  }
  const loot = Math.round(Math.min(f.money * 0.3 + (c.pop ?? 0) * 1.5, 20000));
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
      makePeace(s, f); f.dead = true; f.b = []; f.roads = []; f.trade = false; f.alliance = false; f.eco = undefined; syncLent(s);
      s.armies = armies(s).filter(x => x.owner !== f.id);
      for (const o of s.factions ?? []) o.foes = (o.foes ?? []).filter(id => id !== f.id);
      n.event(`Les ${f.name} se soumettent`, 'Ils n\'ont plus aucune ville : leurs terres sont désormais libres.');
    }
  };
  const pillage = () => {
    s.money += loot; s.stats.income += loot; f.money = Math.max(0, f.money - loot); shrink(s, f, c, 0.8);
    changeRel(f, -20);
    s.log.unshift({ day: s.day, text: `Tu pilles ${c.name} : ${loot} sesterces.` });
  };
  const tribut = () => {
    (s.tributes ??= []).push({ f: f.id, amount: tribute, until: s.day + 5 * YEAR });
    makePeace(s, f); changeRel(f, -10);
    s.log.unshift({ day: s.day, text: `Les ${f.name} acceptent de te verser ${tribute} sesterces par mois pendant 5 ans.` });
  };
  if (n.choose) n.choose(`Victoire à ${c.name} !`, `La garnison des ${f.name} est vaincue. Que fais-tu de la ville ?`, [
    { label: 'Conquérir', fn: conquer }, { label: `Piller (${loot})`, fn: pillage }, { label: `Tribut (${tribute}/mois, paix)`, fn: tribut }]);
  else pillage();
}

/** Un rival prend une ville du joueur : conquête (ambitieux ou hostile) ou pillage */
function defeat(s: GameState, geo: Geo, a: Army, c: Building, n: WarNotify) {
  void geo;
  const f = s.factions!.find(x => x.id === a.owner)!;
  const conquer = s.difficulty === 'ambitieux' || relLabel(f).label === 'Hostile';
  const r = 18 + 8 * c.city!.tier;
  if (conquer) {
    const ids = cityDomain(s, c, r), taken = s.buildings.filter(b => ids.has(b.id));
    // le rival récupère la ville, son entrepôt et ses exploitations en état de marche (routes, lignes, véhicules)
    syncAllyRoads(s);
    if (f.eco) transfer(s, f.eco, ids, { x: c.x, y: c.y, r }, PLAYER, f.id);
    syncView(s, f);
    // défaite totale : la dernière ville vient de tomber
    if (!playerCities(s).length) { s.over = true; n.gameOver(`${c.name}, ta dernière ville, est tombée aux mains des ${f.name}. Tes rivaux se partagent la province.`); return; }
    n.event(`${c.name} est tombée !`, `Les ${f.name} ont pris la ville et ${taken.length - 1} bâtiment(s) autour. Lève une armée pour la reprendre.`);
    s.log.unshift({ day: s.day, text: `Les ${f.name} conquièrent ${c.name}.` });
  } else {
    const loss = Math.round(Math.min(s.money * 0.15, 2000));
    s.money -= loss; f.money += loss; c.city!.pop *= 0.8;
    for (const b of s.buildings) if (b !== c && b.built && !b.city && !BUILD[b.type].wonder && Math.hypot(b.x - c.x, b.y - c.y) <= r && Math.random() < 0.5) b.damaged = true;
    n.event(`${c.name} est pillée !`, `Les ${f.name} ont pillé la ville : ${loss} sesterces volés, des habitants tués et des bâtiments endommagés.`);
    s.log.unshift({ day: s.day, text: `Les ${f.name} pillent ${c.name}.` });
  }
}

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
    const f = s.factions?.find(x => x.id === t.f); if (!f || t.until < s.day) continue;
    const p = Math.min(f.money, t.amount); f.money -= p; s.money += p; s.stats.income += p;
  }
  s.tributes = (s.tributes ?? []).filter(t => t.until >= s.day);
  if (!warAllowed(s)) return;
  const y = year(s);
  for (const f of (s.factions ?? []).filter(x => !x.dead)) {
    // déclaration de guerre
    if (!f.war && !f.alliance && !(f.pact && f.pact > s.day) && playerCities(s).length) {
      const period = y >= 235 && y <= 284 ? 0.02 : y >= 400 ? 0.015 : y >= 150 ? 0.006 : 0.003;
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
    // recrutement et offensives des rivaux en guerre
    const enemies = [...(f.war ? [PLAYER] : []), ...(f.foes ?? [])];
    if (!enemies.length) continue;
    const pop = factionPop(f), mine = list.filter(a => a.owner === f.id);
    const total = mine.reduce((t, a) => t + a.men, 0);
    if (f.money > 300 && total < pop * 0.08) {
      const men = Math.min(Math.floor(f.money / 8), Math.floor(pop * 0.03), 120);
      if (men >= 10) {
        f.money -= men * 8;
        const cap = rivalCities(f)[0];
        if (cap) {
          const ex = mine.find(a => a.state === 'idle');
          if (ex) { ex.men += men; } else list.push({ id: s.nextId++, owner: f.id, x: cap.x + 3, y: cap.y + 2, men, leg: f.character === 'guerrier' ? 0.7 : 0.5, hp: 100, state: 'idle' });
        }
      }
    }
    f.money -= total * 0.5;
    // une armée assez forte part attaquer la ville ennemie la plus proche
    for (const a of mine) {
      if (a.state !== 'idle' || a.men < 40) continue;
      const targets: { kind: 'b' | 'rb'; id: number; x: number; y: number }[] = [];
      if (f.war) for (const c of playerCities(s)) targets.push({ kind: 'b', id: c.id, x: c.x, y: c.y });
      for (const o of s.factions ?? []) if (f.foes?.includes(o.id)) for (const c of rivalCities(o)) targets.push({ kind: 'rb', id: c.id, x: c.x, y: c.y });
      const t = targets.sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
      if (t) { a.target = { kind: t.kind, id: t.id }; a.state = 'march'; }
    }
    // lassitude : après une lourde défaite ou de longues années, le rival propose la paix
    if (f.war && n.ask && s.day - (f.warSince ?? s.day) > 2 * YEAR && !mine.length && Math.random() < 0.08)
      n.ask(`Les ${f.name} demandent la paix`, 'Leurs armées sont épuisées. Accepter la paix (pacte de non-agression de 5 ans) ?', () => makePeace(s, f));
  }
}
