// Rivaux : grandes familles et cités romaines gérées par l'ordinateur.
// Chacun a sa propre économie, simulée par le même moteur que le joueur (voir rivalai.ts).
import { ALT_HOMES, ANCIENT, SPARE_NAMES, BUILD, MEDIEVAL, RES, RIVALS, TECHS, TIERS, type BType, type ResId } from './defs';
import type { DepositKm, Geo } from './geo';
import type { Building, Faction, GameState } from './state';
import { ownerAt, territoryReady } from './territory';
import { alliedRivals, foundHome, newEco, nextRivalEra, rivalEra, rivalMonth, setPlacer, syncAllyRoads, syncLent } from './rivalai';
import { fallOfRome, year } from './sim';

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

// (y compris les chantiers du mois en cours, pas encore visibles sur la carte)
function usedNames(s: GameState) { return new Set([...s.buildings.map(b => b.name), ...(s.factions ?? []).flatMap(f => [...f.b, ...(f.eco?.buildings ?? [])].map(b => b.name))]); }
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
  // ressources à portée d'une capitale : distance au bord du gisement le plus proche (km)
  const reach = (x: number, y: number, res: ResId) => Math.min(...geo.deposits.filter(d => d.res === res).map(d => Math.max(0, Math.hypot(d.x - x, d.y - y) - Math.min(d.rx, d.ry))));
  const LIMITS: [ResId, number][] = [['bois', 35], ['pierre', 35], ['cereales', 35], ['argile', 50], ['sel', 90], ['minerai_fer', 110], ['plomb', 150]];
  // le minimum vital (forêt, pierre, terres, argile) à portée, puis le reste
  const vital = (x: number, y: number) => LIMITS.slice(0, 4).every(([r, l]) => reach(x, y, r) <= l);
  const wealth = (x: number, y: number) => LIMITS.reduce((a, [r, l]) => a + Math.max(0, 1 - reach(x, y, r) / (l * 2)), 0) + (vital(x, y) ? 10 : 0);
  const spaced = (x: number, y: number) => !taken.some(([tx, ty]) => Math.hypot(tx - x, ty - y) < (tx === px && ty === py ? 160 : 140));
  // un rival qui déménage ne s'installe pas sur la région historique d'un autre
  const others = (r: typeof RIVALS[number]) => RIVALS.filter(o => o !== r && !(s.factions ?? []).some(f => f.id === o.id)).map(o => geo.proj(o.home[0], o.home[1]));
  for (const r of RIVALS) {
    let home = geo.proj(r.home[0], r.home[1]), capital = r.capital;
    // sa région historique si elle offre le nécessaire et n'est pas trop près d'un autre ; sinon la région historique la mieux pourvue
    if (!spaced(...home) || !vital(...home)) {
      const best = alts.map(a => ({ a, p: geo.proj(a.home[0], a.home[1]) })).filter(o => spaced(...o.p) && others(r).every(([hx, hy]) => Math.hypot(hx - o.p[0], hy - o.p[1]) >= 140))
        .sort((u, v) => wealth(...v.p) - wealth(...u.p))[0];
      if (best && (!spaced(...home) || wealth(...best.p) > wealth(...home))) { home = best.p; capital = best.a.capital; alts.splice(alts.indexOf(best.a), 1); }
    }
    taken.push(home);
    const f: Faction = { id: r.id, name: r.name, short: r.short, capital, color: r.color, character: r.character, frontier: r.frontier, money: 0, b: [], roads: [], drive: 1, techs: [] };
    // chaque rival a sa propre économie ; ses identifiants ne croisent jamais ceux du joueur
    f.eco = newEco(s, f, (s.factions.length + 1) * 10_000_000);
    f.money = f.eco.money;
    s.factions.push(f);
    initPlacer(s, geo);
    foundHome(s, geo, f, home[0], home[1], capital);
  }
}

/** Où un rival peut construire : hors du territoire du joueur et des autres rivaux, sur la terre ferme */
function initPlacer(s: GameState, geo: Geo) {
  // chez un allié (le joueur ou un autre rival), il peut construire et exploiter les gisements
  const free = (f: Faction, x: number, y: number) => {
    if (!land(geo, f, x, y) || (!f.alliance && inPlayerLand(s, x, y, 2)) || s.buildings.some(b => Math.hypot(b.x - x, b.y - y) < 4)) return false;
    if ((s.factions ?? []).some(o => o !== f && o.b.some(b => Math.hypot(b.x - x, b.y - y) < 4))) return false;
    const o = rivalAt(s, x, y); return !o || o === f || alliedRivals(f, o);
  };
  /** Qui empêche ce rival d'exploiter ce gisement (null : personne) */
  const blocker = (f: Faction, d: DepositKm): 'player' | Faction | null => {
    if (!f.alliance && (s.buildings.some(b => b.dep === d.id) || inPlayerLand(s, d.x, d.y))) return 'player';
    const own = depOwner(s, d.id); if (own && own !== f && !alliedRivals(f, own)) return own;
    const o = rivalAt(s, d.x, d.y); if (o && o !== f && !alliedRivals(f, o)) return o;
    return null;
  };
  setPlacer({
    free,
    freeDeposits(f, res: ResId) {
      const out: { x: number; y: number; dep: number; name: string }[] = [];
      for (const d of geo.deposits as DepositKm[]) {
        if (d.res !== res || RES[d.res].era > rivalEra(f)) continue;
        if (!f.alliance && s.buildings.some(b => b.dep === d.id)) continue;
        const own = depOwner(s, d.id); if (own && own !== f && !alliedRivals(f, own)) continue;
        if (f.b.filter(b => b.dep === d.id).length >= 3) continue;
        // l'emplacement libre le plus proche de ses villes, n'importe où dans le gisement (une grande forêt a une lisière proche)
        const cities = f.b.filter(b => b.type === 'village');
        let best: { x: number; y: number; dd: number } | null = null;
        for (let k = 0; k < 30; k++) {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.9;
          const x = d.x + Math.cos(a) * d.rx * r, y = d.y + Math.sin(a) * d.ry * r;
          if (geo.richness(res, x, y).dep?.id !== d.id) continue;
          if (!free(f, x, y) || f.b.some(b => Math.hypot(b.x - x, b.y - y) < 3)) continue;
          const dd = Math.min(Infinity, ...cities.map(c => Math.hypot(c.x - x, c.y - y)));
          if (!best || dd < best.dd) best = { x, y, dd };
        }
        if (best) out.push({ x: best.x, y: best.y, dep: d.id, name: d.name });
      }
      return out;
    },
    blockedDeposits(f, res: ResId) {
      const out: { x: number; y: number; name: string; owner: 'player' | Faction }[] = [];
      for (const d of geo.deposits as DepositKm[]) {
        if (d.res !== res || RES[d.res].era > rivalEra(f)) continue;
        const owner = blocker(f, d); if (owner) out.push({ x: d.x, y: d.y, name: d.name, owner });
      }
      return out;
    },
    cityName: (x, y) => cityName(s, geo, x, y),
  });
}

/** Population totale du joueur et d'un rival */
export const playerPop = (s: GameState) => s.buildings.reduce((a, b) => a + (b.city?.pop ?? 0), 0);
export const factionPop = (f: Faction) => f.b.reduce((a, b) => a + (b.pop ?? 0), 0);

/** Recherche du rival : comme le joueur, il gagne des points avec ses villes et paie ses technologies.
 *  Il se fixe un objectif selon sa situation (gisements proches, besoins de ses villes, caractère)
 *  et économise jusqu'à pouvoir l'acheter. Il ne reçoit rien quand le joueur découvre une technologie. */
function syncTechs(s: GameState, geo: Geo, f: Faction) {
  f.techs ??= [];
  const eco = f.eco; if (!eco) return;
  const cities = f.b.filter(b => b.type === 'village');
  // biens des paliers à venir et leurs matières premières
  const top = Math.min(TIERS.length - 1, Math.max(0, ...cities.map(c => c.tier ?? 0)) + 1), wanted = new Set<ResId>();
  for (let t = 0; t <= top; t++) for (const r of Object.keys(TIERS[t].needs) as ResId[]) wanted.add(r);
  for (const r of [...wanted]) for (const k of Object.keys(BUILD) as BType[]) if (BUILD[k].recipe?.out[r]) for (const i of Object.keys(BUILD[k].recipe!.in) as ResId[]) wanted.add(i);
  for (const r of ['minerai_fer'] as ResId[]) if (wanted.has('fer')) wanted.add(r);
  let guard = 0;
  while (guard++ < 5) {
    // comme le joueur : les technologies du chapitre suivant seulement une fois tout l'arbre du chapitre en cours découvert
    const avail = TECHS.filter(t => t.era <= rivalEra(f) && !f.techs!.includes(t.id) && t.req.every(r => f.techs!.includes(r)));
    if (!avail.length) break;
    // objectif déjà fixé : il économise pour lui
    const goal = avail.find(t => t.id === f.goal);
    if (goal) {
      if (eco.rp < goal.cost) break;
      eco.rp -= goal.cost; f.techs.push(goal.id); f.goal = undefined; s.log.unshift({ day: s.day, text: `Les ${f.name} découvrent : ${goal.name}.` });
      continue;
    }
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
      const bias: Record<string, string[]> = { commercant: ['negoce', 'monnaie', 'negoce_maritime', 'peche', 'phares', 'foires', 'lettre_change', 'hanse'], guerrier: ['metallurgie', 'forge', 'remparts', 'relais', 'charronnerie', 'chateaux_forts', 'haut_fourneau', 'collier'], fidele: ['aqueduc', 'urbanisme', 'voie_romaine', 'thermes', 'spectacles', 'monasteres', 'art_roman', 'chartes'], opportuniste: ['navigation', 'negoce_maritime', 'viticulture', 'batellerie', 'charrue', 'moulin_hydraulique', 'coche_eau'] };
      if (bias[f.character]?.includes(t.id)) sc += 10;
      return sc;
    };
    f.goal = avail.map(t => ({ t, sc: score(t) })).sort((a, z) => z.sc - a.sc)[0].t.id;
  }
}

/** Passage d'un rival au chapitre suivant (arbre terminé) ; au Moyen Âge, il subit la chute de Rome
 *  et devient une grande maison médiévale (celle dont le cœur est le plus proche de sa capitale) */
function advanceEra(s: GameState, geo: Geo, f: Faction) {
  const roman = ['', 'I', 'II', 'III'], e0 = rivalEra(f), e1 = nextRivalEra(f, year(s));
  for (let e = e0 + 1; e <= e1; e++) {
    f.era = e;
    s.log.unshift({ day: s.day, text: `Les ${f.name} ont terminé l'arbre du chapitre ${roman[e - 1]} et entrent dans le chapitre ${roman[e]}.` });
    if (e === 3 && f.eco) {
      fallOfRome(f.eco);
      const cap = f.b.find(b => b.type === 'village') ?? f.b[0];
      const taken = new Set((s.factions ?? []).filter(o => o !== f).map(o => o.short));
      const m = MEDIEVAL.filter(x => !taken.has(x.short)).map(x => ({ x, d: cap ? Math.hypot(geo.proj(...x.at)[0] - cap.x, geo.proj(...x.at)[1] - cap.y) : 0 })).sort((a, z) => a.d - z.d)[0]?.x;
      if (m) { s.log.unshift({ day: s.day, text: `Les ${f.name} deviennent les ${m.name}.` }); f.name = m.name; f.short = m.short; }
    }
  }
}

/** Évolution mensuelle des rivaux : technologies, puis décisions de l'ordinateur sur leur économie */
export function monthlyRivals(s: GameState, geo: Geo) {
  if (!s.factions?.length) return;
  initPlacer(s, geo);
  for (const f of s.factions) {
    if (f.dead || !f.eco || !f.b.some(b => b.type === 'village')) continue;
    advanceEra(s, geo, f);
    syncTechs(s, geo, f);
    rivalMonth(s, geo, f);
  }
  syncAllyRoads(s);
  syncLent(s);
}
