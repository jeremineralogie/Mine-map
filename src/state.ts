// État d'une partie (sérialisable en JSON pour la sauvegarde).
import type { BType, Difficulty, ResId, RoadType, VType } from './defs';

export type Stock = Partial<Record<ResId, number>>;

export interface RNode { id: number; x: number; y: number; b?: number; }
export interface Edge { id: number; a: number; b: number; type: RoadType; len: number; bridges: number; }

export interface City {
  pop: number; stock: Stock; sat: number; foodSat: number; tier: number;
  /** consommation du mois en cours : quantités voulues et réellement mangées (au jour le jour) */
  want?: Stock; ate?: Stock;
  /** effet des merveilles proches sur la consommation (1 = aucun) */
  needMult?: number;
  /** époque en cours (besoins de la Gaule romaine à partir du chapitre II) ; la ville reçoit-elle déjà les nouveaux produits */
  era?: number; modern?: boolean;
  /** livraisons reçues ce mois-ci */
  got?: Stock;
  /** céréales reçues le mois dernier ; la ville a-t-elle grandi ce mois-ci */
  lastGot?: number; growing?: boolean;
}

export interface Building {
  id: number;
  type: BType;
  x: number; y: number;
  name: string;
  level: number;
  built: boolean;
  /** construction ou amélioration en cours : matériaux restant à livrer */
  need: Stock;
  /** matériaux en route vers le chantier */
  incoming: Stock;
  /** avancement des travaux une fois les matériaux livrés (jours écoulés) */
  work: number;
  upgrading: boolean;
  stock: Stock;
  acc: number;
  staff: number;
  rich: number;           // richesse du gisement à cet endroit
  dep: number | null;     // gisement exploité
  node: number | null;    // nœud routier rattaché
  city?: City;
  partner?: string;
  halted?: number;        // arrêt (accident) jusqu'au jour indiqué
  produced: number;       // production cumulée
  /** flux du mois en cours (in, out) et du mois précédent (pin, pout) */
  flow?: { in: Stock; out: Stock; pin: Stock; pout: Stock };
  paused?: boolean;       // production mise en pause par le joueur
  sea?: 'atlantique' | 'mediterranee';  // port de commerce : mer bordant le port
  sp?: string;           // comptoir maritime : partenaire d'outre-mer
  tf?: string;           // taverne : rival avec qui elle commerce
  damaged?: boolean;     // endommagé par une invasion : à l'arrêt jusqu'à sa réparation
  repair?: boolean;      // chantier de réparation en cours (utilise need/work comme une amélioration)
  haltWhy?: string;      // raison d'un arrêt temporaire (éboulement, révolte…)
}

/** Arrêt d'une ligne : au chargement, `res` liste les ressources à prendre (dans la limite de la capacité) */
export interface Stop {
  bid: number; action: 'load' | 'unload'; res: ResId[];
  /** déchargement : part du chargement de départ à déposer ici (en %, 100 = tout ce qui reste) */
  share?: number;
  /** chargement : part du véhicule réservée à chaque ressource (en %) ; absente = « libre » (remplit la place restante) */
  pct?: Partial<Record<ResId, number>>;
}
/** `name` vide : le nom est déduit des arrêts (départ → arrivée) */
export interface Line {
  id: number; name: string; vtype: VType; stops: Stop[]; color: string; paused?: boolean;
  /** tonnes chargées ou déposées à chaque arrêt : mois en cours (cur) et mois précédent (prev) */
  moved?: { cur: Record<number, Stock>; prev: Record<number, Stock>; total?: Record<number, Stock> };
}

export interface Vehicle {
  id: number;
  type: VType;
  line: number;          // -1 pour un convoi de chantier
  stop: number;
  cargo: Stock;          // chargement, éventuellement plusieurs ressources
  ref?: Stock;           // chargement au départ du dernier arrêt de chargement (base des pourcentages)
  drop?: Stock;          // quantités déjà déposées à l'arrêt en cours
  state: 'go' | 'load' | 'unload' | 'lost' | 'parked';   // parked : ligne en pause, véhicule à l'arrêt
  path: { x: number; y: number }[];
  speeds: number[];
  seg: number;
  segPos: number;
  timer: number;
  x: number; y: number; angle: number;
  at: number | null;     // bâtiment où se trouve le véhicule
  target?: number;       // convoi : chantier à livrer
  from?: number;         // convoi : entrepôt d'origine
  income: number;        // recettes cumulées
}

/** Bâtiment d'un rival (simulation simplifiée, hors de l'économie du joueur) */
export interface RBuilding { id: number; type: BType; x: number; y: number; name: string; pop?: number; tier?: number; dep?: number | null; }
export interface Faction {
  id: string; name: string; short: string; capital: string; color: string; character: string; frontier?: boolean;
  money: number; b: RBuilding[]; roads: [number, number, number, number][];
  /** objectif de taille propre à ce rival (autour de 1) */
  drive: number;
  /** relation avec le joueur (−100 hostile … +100 allié) et traités */
  rel?: number; trade?: boolean; pact?: number; alliance?: boolean; intel?: number; lastGift?: number;
  /** relations avec les autres rivaux */
  rels?: Record<string, number>;
  /** guerre avec le joueur, ennemis parmi les rivaux, début de la guerre */
  war?: boolean; foes?: string[]; warSince?: number;
  /** plus aucune ville : soumis au joueur ou détruit */
  dead?: boolean;
}
/** Armée sur la carte (joueur : owner = 'player') */
export interface Army {
  id: number; owner: string; x: number; y: number;
  men: number; leg: number;      // effectif, part de légionnaires (0-1)
  hp: number;                    // vie / moral (0-100)
  merc?: boolean;                // mercenaires (solde double)
  target?: { kind: 'b' | 'rb' | 'army'; id: number } | null;
  siege?: number;                // garnison restante de la ville assiégée
  state: 'idle' | 'march' | 'fight' | 'siege';
}
export interface GameState {
  version: number;
  day: number;
  money: number;
  rp: number;
  era: number;
  techs: string[];
  nextId: number;
  nodes: RNode[];
  edges: Edge[];
  buildings: Building[];
  lines: Line[];
  vehicles: Vehicle[];
  extracted: Record<number, number>;
  stats: { produced: Stock; food: number; sold: Record<string, number>; soldMonth: Record<string, number>; income: number; expenses: number; };
  objectives: string[];
  events: number[];
  mods: { kind: 'growth' | 'closed' | 'boost' | 'discount' | 'demand' | 'prod' | 'prices'; partner?: string; res?: ResId[]; mult: number; until: number }[];
  market: Record<string, number>;
  negMonths: number;
  over: boolean;
  chapterDone: boolean;
  log: { day: number; text: string }[];
  ledger: { month: number; income: number; expenses: number }[];
  /** rivaux (nouvelles parties uniquement) */
  difficulty?: Difficulty;
  factions?: Faction[];
  armies?: Army[];
  tributes?: { f: string; amount: number; until: number }[];
  hadCity?: boolean;
}

export const SAVE_KEY = 'mine-map-save-v1';

export function addFlow(b: Building, dir: 'in' | 'out', r: ResId, q: number) {
  const f = b.flow ??= { in: {}, out: {}, pin: {}, pout: {} };
  f[dir][r] = (f[dir][r] ?? 0) + q;
}

export const cargoTotal = (c: Stock) => Object.values(c).reduce((a, q) => a + (q ?? 0), 0);

/** Met à niveau une sauvegarde d'une version précédente */
export function migrate(s: GameState): GameState {
  if (s.version < 2) {
    for (const l of s.lines) {
      for (const st of l.stops) {
        const old = (st as unknown as { res?: ResId | ResId[] }).res;
        st.res = Array.isArray(old) ? old : old ? [old] : [];
      }
      if (/→$|^Ligne \d+$/.test(l.name)) l.name = '';
    }
    for (const v of s.vehicles) {
      const o = v as unknown as { res?: ResId | null; qty?: number };
      v.cargo = o.res && o.qty ? { [o.res]: o.qty } : {};
      delete o.res; delete o.qty;
    }
    s.version = 2;
  }
  if (s.version < 3) {
    // les ressources d'un arrêt de déchargement filtrent désormais ce qui est déposé : on repart de « tout »
    for (const l of s.lines) for (const st of l.stops) if (st.action === 'unload') st.res = [];
    s.version = 3;
  }
  // les villages se fondent désormais sans matériaux : les chantiers en cours n'attendent plus rien
  for (const b of s.buildings) if (b.type === 'village' && !b.built) { b.need = {}; b.incoming = {}; }
  return s;
}
