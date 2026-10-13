// État d'une partie (sérialisable en JSON pour la sauvegarde).
import type { BType, ResId, RoadType, VType } from './defs';

export type Stock = Partial<Record<ResId, number>>;

export interface RNode { id: number; x: number; y: number; b?: number; }
export interface Edge { id: number; a: number; b: number; type: RoadType; len: number; bridges: number; }

export interface City { pop: number; stock: Stock; sat: number; foodSat: number; tier: number; }

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
}

/** Arrêt d'une ligne : au chargement, `res` liste les ressources à prendre (dans la limite de la capacité) */
export interface Stop {
  bid: number; action: 'load' | 'unload'; res: ResId[];
  /** déchargement : part du chargement de départ à déposer ici (en %, 100 = tout ce qui reste) */
  share?: number;
}
/** `name` vide : le nom est déduit des arrêts (départ → arrivée) */
export interface Line { id: number; name: string; vtype: VType; stops: Stop[]; color: string; paused?: boolean; }

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
  mods: { kind: 'growth' | 'closed' | 'boost'; partner?: string; mult: number; until: number }[];
  market: Record<string, number>;
  negMonths: number;
  over: boolean;
  chapterDone: boolean;
  log: { day: number; text: string }[];
  ledger: { month: number; income: number; expenses: number }[];
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
  return s;
}
