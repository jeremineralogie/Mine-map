// Diplomatie avec les rivaux : relations, traités, cadeaux, espionnage, commerce par la taverne.
import { BUILD, RES, TIERS, TIER_NEEDS_2, type ResId } from './defs';
import { factionPop, territoryRadius } from './rivals';
import type { Building, Faction, GameState } from './state';

type Char = 'fidele' | 'commercant' | 'opportuniste' | 'guerrier';
const ch = (f: Faction) => f.character as Char;
/** Relation de départ et point d'équilibre selon le caractère */
export const BASE_REL: Record<Char, number> = { fidele: 10, commercant: 5, opportuniste: 0, guerrier: -15 };
/** Relation minimale pour accepter chaque traité */
export const THRESHOLD: Record<'trade' | 'pact' | 'alliance', Record<Char, number>> = {
  trade: { commercant: -10, fidele: 10, opportuniste: 0, guerrier: 20 },
  pact: { commercant: -25, fidele: -20, opportuniste: -20, guerrier: 0 },
  alliance: { commercant: 60, fidele: 55, opportuniste: 60, guerrier: 70 },
};
const GIFT_MULT: Record<Char, number> = { fidele: 1, commercant: 1, opportuniste: 1.3, guerrier: 0.7 };
const MONTH = 30.4375;

export const relOf = (f: Faction) => f.rel ?? BASE_REL[ch(f)] ?? 0;
export function changeRel(f: Faction, d: number) { f.rel = Math.max(-100, Math.min(100, relOf(f) + d)); }
export function relLabel(f: Faction): { label: string; level: 'good' | 'info' | 'warn' | 'bad' } {
  const r = relOf(f);
  if (f.alliance) return { label: 'Allié', level: 'good' };
  if (r >= 40) return { label: 'Cordial', level: 'good' };
  if (r >= -20) return { label: 'Neutre', level: 'info' };
  if (r >= -60) return { label: 'Méfiant', level: 'warn' };
  return { label: 'Hostile', level: 'bad' };
}
export const tavernes = (s: GameState) => s.buildings.filter(b => b.type === 'taverne' && b.built);
export const hasTavern = (s: GameState) => tavernes(s).length > 0;
const cityDist = (f: Faction, x: number, y: number) => Math.min(...f.b.filter(b => b.type === 'village').map(c => Math.hypot(c.x - x, c.y - y)), Infinity);

/** Biens que les villes d'un rival achètent (selon le palier de sa plus grande ville) */
export function factionBuys(s: GameState, f: Faction): ResId[] {
  const tier = Math.max(0, ...f.b.map(b => b.tier ?? 0));
  const g = new Set<ResId>();
  for (let t = 0; t <= Math.min(tier + 1, TIERS.length - 1); t++) {
    for (const r of Object.keys(TIERS[t].needs) as ResId[]) g.add(r);
    if (s.era >= 2) for (const r of Object.keys(TIER_NEEDS_2[t] ?? {}) as ResId[]) g.add(r);
  }
  return [...g].filter(r => RES[r].era <= s.era);
}
/** Ce que produisent ses ateliers (et qu'il peut vendre) */
export function factionSells(f: Faction): ResId[] {
  // il ne vend que ce qu'il a en réserve
  return (Object.keys(f.stock ?? {}) as ResId[]).filter(r => (f.stock![r] ?? 0) >= 5);
}
export const rivalPrice = (f: Faction, r: ResId) => RES[r].price * 1.2 * (f.alliance ? 1.1 : 1);
/** Toujours plus cher que ce que le rival rachète (pas d'achat-revente) */
export const rivalImportPrice = (f: Faction, r: ResId) => Math.max(RES[r].price * (f.alliance ? 1.25 : 1.45), rivalPrice(f, r) * 1.15);
export const rivalVolume = (f: Faction) => f.alliance ? 60 : 40;
/** Rival avec qui commerce une taverne : celui choisi, sinon le plus proche ayant signé un accord */
export function tradeFaction(s: GameState, b: Building): Faction | null {
  const fs = (s.factions ?? []).filter(f => f.trade);
  return fs.find(f => f.id === b.tf) ?? fs.sort((a, z) => cityDist(a, b.x, b.y) - cityDist(z, b.x, b.y))[0] ?? null;
}

/** Retire des marchandises des entrepôts du joueur ; renvoie la quantité obtenue */
export function takeFromStores(s: GameState, r: ResId, q: number) {
  let got = 0;
  for (const b of s.buildings) {
    if (got >= q || !b.built || !(b.type === 'entrepot' || b.type === 'port' || b.type === 'port_mer')) continue;
    const t = Math.min(q - got, Math.floor(b.stock[r] ?? 0));
    if (t > 0) { b.stock[r]! -= t; got += t; }
  }
  return got;
}
export const storeTotal = (s: GameState, r: ResId) => s.buildings.filter(b => b.built && (b.type === 'entrepot' || b.type === 'port' || b.type === 'port_mer')).reduce((a, b) => a + Math.floor(b.stock[r] ?? 0), 0);

// ---------- Actions du joueur ----------
export function giftMoney(s: GameState, f: Faction, amount: number): string {
  if (s.money < amount) return 'Pas assez d\'argent.';
  s.money -= amount; s.stats.expenses += amount; f.money += amount;
  const recent = f.lastGift !== undefined && s.day - f.lastGift < 6 * MONTH;
  const gain = amount / 50 * GIFT_MULT[ch(f)] * (recent ? 0.5 : 1);
  changeRel(f, gain); f.lastGift = s.day;
  return `Cadeau accepté : relation +${Math.round(gain)}${recent ? ' (cadeau récent : effet réduit)' : ''}.`;
}
export function giftRes(s: GameState, f: Faction, r: ResId, q: number): string {
  const got = takeFromStores(s, r, q);
  if (got <= 0) return `Pas de ${RES[r].name.toLowerCase()} dans tes entrepôts.`;
  const recent = f.lastGift !== undefined && s.day - f.lastGift < 6 * MONTH;
  const gain = got * RES[r].price / 45 * GIFT_MULT[ch(f)] * (recent ? 0.5 : 1) * (factionBuys(s, f).includes(r) ? 1.3 : 1);
  changeRel(f, gain); f.lastGift = s.day;
  return `${got} t de ${RES[r].name.toLowerCase()} offertes : relation +${Math.round(gain)}.`;
}
export function propose(s: GameState, f: Faction, kind: 'trade' | 'pact' | 'alliance'): { ok: boolean; msg: string } {
  const need = THRESHOLD[kind][ch(f)], r = relOf(f);
  if (kind === 'alliance' && !f.trade) return { ok: false, msg: 'Une alliance demande d\'abord un accord commercial.' };
  if (r < need) { changeRel(f, -2); return { ok: false, msg: `Refusé : il faut une relation d'au moins ${need} (actuellement ${Math.round(r)}).` }; }
  if (kind === 'trade') { f.trade = true; changeRel(f, 4); return { ok: true, msg: `Accord commercial signé avec les ${f.name} : tes tavernes peuvent leur vendre et leur acheter.` }; }
  if (kind === 'pact') { f.pact = s.day + 10 * 365.25; changeRel(f, 3); return { ok: true, msg: `Pacte de non-agression de 10 ans signé avec les ${f.name}.` }; }
  f.alliance = true; changeRel(f, 6);
  return { ok: true, msg: `Alliance conclue avec les ${f.name} : gisements et territoires partagés, défense commune.` };
}
export function breakTreaty(s: GameState, f: Faction, kind: 'trade' | 'alliance'): string {
  if (kind === 'trade') { f.trade = false; f.alliance = false; changeRel(f, -10); }
  else { f.alliance = false; changeRel(f, -25 * (ch(f) === 'fidele' ? 1.5 : 1)); }
  // les autres rivaux jugent la parole donnée
  for (const o of s.factions ?? []) if (o !== f) changeRel(o, -3);
  return kind === 'trade' ? `Accord commercial rompu avec les ${f.name}.` : `Alliance rompue avec les ${f.name} : ils ne l'oublieront pas.`;
}
export const SPY_COST = 300;
export function spy(s: GameState, f: Faction): string {
  if (s.money < SPY_COST) return 'Pas assez d\'argent.';
  s.money -= SPY_COST; s.stats.expenses += SPY_COST;
  // plus il y a de tavernes près de lui, plus l'espion passe inaperçu
  const near = tavernes(s).filter(t => cityDist(f, t.x, t.y) < 200).length;
  if (Math.random() < 0.25 - 0.05 * Math.min(3, near)) { changeRel(f, -12); return `L'espion a été démasqué ! Les ${f.name} sont furieux (relation −12).`; }
  f.intel = s.day + 365.25;
  return `Rapport de l'espion reçu : tu connais les finances et les projets des ${f.name} pendant un an.`;
}
/** Achat à un rival, livré à la taverne */
export function buyFromRival(s: GameState, b: Building, r: ResId, qty: number): string | null {
  const f = tradeFaction(s, b);
  if (!f) return 'Aucun accord commercial.';
  if (!factionSells(f).includes(r)) return `Les ${f.name} ne vendent pas cette ressource.`;
  const room = BUILD.taverne.storage - Object.values(b.stock).reduce((a, q) => a + (q ?? 0), 0);
  qty = Math.min(qty, Math.floor(room), Math.floor(f.stock?.[r] ?? 0));
  if (qty <= 0) return Math.floor(f.stock?.[r] ?? 0) <= 0 ? `Les ${f.name} n'en ont plus en réserve.` : 'La taverne est pleine : fais enlever les marchandises.';
  const cost = rivalImportPrice(f, r) * qty;
  if (s.money < cost) return 'Pas assez d\'argent.';
  s.money -= cost; s.stats.expenses += cost; f.money += cost;
  f.stock![r] = (f.stock![r] ?? 0) - qty;
  b.stock[r] = (b.stock[r] ?? 0) + qty;
  changeRel(f, qty * 0.03);
  return null;
}

/** Ce que la taverne accepte (vente au rival partenaire, dans la limite de son volume mensuel) */
export function tavernAccepts(s: GameState, b: Building, r: ResId) {
  const f = tradeFaction(s, b);
  if (!f || !factionBuys(s, f).includes(r)) return 0;
  // il n'achète que ce qu'il peut payer
  return Math.max(0, Math.min(rivalVolume(f) - (s.stats.soldMonth['riv:' + f.id] ?? 0), Math.floor(f.money / rivalPrice(f, r))));
}
export function tavernSell(s: GameState, b: Building, r: ResId, qty: number) {
  const f = tradeFaction(s, b)!;
  const gain = rivalPrice(f, r) * qty;
  s.money += gain; s.stats.income += gain; f.money = Math.max(0, f.money - gain);
  // la marchandise rejoint ses réserves
  f.stock ??= {}; f.stock[r] = (f.stock[r] ?? 0) + qty;
  const k = 'riv:' + f.id;
  s.stats.soldMonth[k] = (s.stats.soldMonth[k] ?? 0) + qty; s.stats.sold[k] = (s.stats.sold[k] ?? 0) + qty;
  changeRel(f, qty * 0.05 * (ch(f) === 'commercant' ? 1.5 : 1));
  return gain;
}

/** Le joueur construit : les rivaux voisins s'en offusquent (gisements convoités, ville près de leur frontière) */
export function notePlayerBuild(s: GameState, b: Building) {
  for (const f of s.factions ?? []) {
    const d = cityDist(f, b.x, b.y);
    if (b.city && d < 90) changeRel(f, -5 * (ch(f) === 'guerrier' ? 1.5 : 1));
    else if (BUILD[b.type].deposit && d < 60) changeRel(f, -2 * (ch(f) === 'guerrier' ? 1.5 : 1));
  }
}

export interface DiploNotify { event(title: string, text: string): void; ask?(title: string, text: string, yes: () => void): void; toast(t: string, k?: 'info' | 'good' | 'bad'): void; }
/** Évolution mensuelle des relations, propositions des rivaux */
export function monthlyDiplomacy(s: GameState, n: DiploNotify) {
  const fs = s.factions ?? [];
  const tv = tavernes(s);
  for (const f of fs) {
    if (f.dead) continue;
    const before = relLabel(f).label;
    f.rel = relOf(f);
    // retour lent vers son humeur naturelle
    changeRel(f, (BASE_REL[ch(f)] - f.rel) * 0.02);
    // tavernes : chaque taverne rapproche, surtout si elle est près de ses villes
    let tb = 0;
    for (const t of tv) { const d = cityDist(f, t.x, t.y); tb += 0.45 * (d < 150 ? 1 : d < 300 ? 0.6 : 0.3); }
    changeRel(f, Math.min(1.6, tb));
    if (f.trade) changeRel(f, 0.3 * (ch(f) === 'commercant' ? 1.5 : 1));
    if (f.alliance) changeRel(f, 0.3);
    // frontières qui se touchent : frictions
    const touching = s.buildings.some(b => !b.partner && b.type !== 'comptoir' && f.b.some(r => Math.hypot(r.x - b.x, r.y - b.y) < territoryRadius(r) + (b.city ? 18 + 8 * b.city.tier : 6) + 8));
    if (touching && !f.alliance) changeRel(f, -0.4 * (ch(f) === 'guerrier' ? 2 : ch(f) === 'opportuniste' ? 1.5 : 1));
    // une alliance ne survit pas à une relation dégradée
    if (f.alliance && relOf(f) < 20) { f.alliance = false; n.event(`Fin de l'alliance avec les ${f.name}`, 'Vos relations se sont trop dégradées : l\'alliance est dissoute.'); }
    if (f.pact && f.pact < s.day) { f.pact = undefined; s.log.unshift({ day: s.day, text: `Le pacte de non-agression avec les ${f.name} a expiré.` }); }
    const after = relLabel(f).label;
    if (after !== before) s.log.unshift({ day: s.day, text: `Relation avec les ${f.name} : ${after.toLowerCase()}.` });
    // propositions spontanées des rivaux
    if (n.ask && hasTavern(s)) {
      const r = relOf(f);
      if (!f.trade && r >= THRESHOLD.trade[ch(f)] + 15 && Math.random() < 0.05)
        n.ask(`Proposition des ${f.name}`, `Les ${f.name} te proposent un accord commercial : vos tavernes pourront échanger leurs marchandises.`, () => { f.trade = true; changeRel(f, 4); });
      else if (f.trade && !f.alliance && r >= THRESHOLD.alliance[ch(f)] + 10 && Math.random() < 0.03)
        n.ask(`Proposition d'alliance`, `Les ${f.name} te proposent une alliance : gisements et territoires partagés, défense commune.`, () => { f.alliance = true; changeRel(f, 6); });
    }
  }
  // relations entre rivaux (pour les alliances contre le joueur, à l'étape de la guerre)
  for (const f of fs.filter(x => !x.dead && x.b.length)) {
    f.rels ??= {};
    for (const o of fs) if (o !== f && !o.dead && o.b.length) {
      const v = f.rels[o.id] ?? 0, near = Math.min(...f.b.map(a => Math.min(...o.b.map(b => Math.hypot(a.x - b.x, a.y - b.y)))));
      f.rels[o.id] = Math.max(-100, Math.min(100, v * 0.97 + (Math.random() - 0.5) * 6 + (near < 60 ? -1.5 : 0.3)));
    }
  }
  void factionPop;
}
