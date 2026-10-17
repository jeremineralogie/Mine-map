// Territoires : une seule zone par camp, qui épouse tout l'espace occupé
// (rayon de main-d'œuvre des villes, bâtiments, routes), fondue en une forme continue.
// Calculée sur une grille de 4 km, recalculée seulement quand les constructions changent.
import { WORK_RANGES } from './defs';
import type { Geo } from './geo';
import type { Faction, GameState } from './state';
import { workRange } from './sim';

const CELL = 4;            // km
const K = 4;               // douceur de la fusion entre les formes (km)
const BUILDING_R = 6;      // emprise d'un bâtiment isolé
const ROAD_R = 4;          // emprise de part et d'autre d'une route
const CORE = 1000;         // priorité des bâtiments et routes : on garde toujours ce qu'on a construit

export interface TerritoryMap {
  key: string; w: number; h: number; x0: number; y0: number; cell: number;
  /** propriétaire de chaque case : -1 personne, 0 joueur, i+1 rival n°i */
  owner: Int8Array;
  /** couleur et contours (segments en km) de chaque camp, index = propriétaire */
  outlines: Float32Array[];
}

let geo: Geo | null = null;
let cache: TerritoryMap | null = null;
let shapeCache: { key: string; camps: Shape[][] } | null = null;
export function setTerritoryGeo(g: Geo) { geo = g; cache = null; shapeCache = null; }
function camps(s: GameState) {
  const key = keyOf(s);
  if (shapeCache?.key !== key) shapeCache = { key, camps: shapes(s) };
  return shapeCache;
}
const dist = (sh: Shape, x: number, y: number) => {
  if (sh.kind === 'c') return Math.hypot(x - sh.x, y - sh.y);
  const dx = sh.bx - sh.ax, dy = sh.by - sh.ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - sh.ax) * dx + (y - sh.ay) * dy) / L)) : 0;
  return Math.hypot(x - sh.ax - t * dx, y - sh.ay - t * dy);
};

type Shape = { kind: 'c'; x: number; y: number; r: number; core: boolean } | { kind: 's'; ax: number; ay: number; bx: number; by: number; r: number };

function shapes(s: GameState): Shape[][] {
  const out: Shape[][] = [];
  const mine: Shape[] = [];
  const nodes = new Map(s.nodes.map(n => [n.id, n]));
  for (const b of s.buildings) {
    if (b.partner || b.type === 'comptoir') continue;
    mine.push({ kind: 'c', x: b.x, y: b.y, r: BUILDING_R, core: true });
    if (b.city && b.built !== false) mine.push({ kind: 'c', x: b.x, y: b.y, r: workRange(b, s), core: false });
  }
  for (const e of s.edges) {
    const a = nodes.get(e.a), b = nodes.get(e.b);
    if (a && b) mine.push({ kind: 's', ax: a.x, ay: a.y, bx: b.x, by: b.y, r: ROAD_R });
  }
  out.push(mine);
  for (const f of s.factions ?? []) {
    const l: Shape[] = [];
    if (!f.dead) {
      for (const b of f.b) {
        l.push({ kind: 'c', x: b.x, y: b.y, r: BUILDING_R, core: true });
        if (b.type === 'village') l.push({ kind: 'c', x: b.x, y: b.y, r: WORK_RANGES[b.tier ?? 0] ?? WORK_RANGES[0], core: false });
      }
      for (const [ax, ay, bx, by] of f.roads) l.push({ kind: 's', ax, ay, bx, by, r: ROAD_R });
    }
    out.push(l);
  }
  return out;
}

function keyOf(s: GameState) {
  let k = `${s.techs.includes('cite_prospere') ? 1 : 0}|${s.edges.length}|${s.nodes.length}|`;
  for (const b of s.buildings) k += `${b.id}:${b.city?.tier ?? ''}:${b.built === false ? 0 : 1},`;
  for (const f of s.factions ?? []) { k += `|${f.dead ? 'x' : ''}${f.roads.length}:`; for (const b of f.b) k += `${b.id}:${b.tier ?? ''},`; }
  return k;
}

/** Carte des territoires (mise en cache tant que rien ne change) */
export function territories(s: GameState): TerritoryMap | null {
  if (!geo) return null;
  const { key, camps: all } = camps(s);
  if (cache && cache.key === key) return cache;
  const e = geo.data.extent, w = Math.ceil((e.x1 - e.x0) / CELL), h = Math.ceil((e.y1 - e.y0) / CELL);
  const n = w * h;
  const best = new Float32Array(n).fill(-Infinity), owner = new Int8Array(n).fill(-1);
  const sum = new Float32Array(n), core = new Uint8Array(n);
  all.forEach((list, o) => {
    if (!list.length) return;
    sum.fill(0); core.fill(0);
    for (const sh of list) {
      const r = sh.r, pad = r + 3 * K;
      const minx = sh.kind === 'c' ? sh.x - pad : Math.min(sh.ax, sh.bx) - pad, maxx = sh.kind === 'c' ? sh.x + pad : Math.max(sh.ax, sh.bx) + pad;
      const miny = sh.kind === 'c' ? sh.y - pad : Math.min(sh.ay, sh.by) - pad, maxy = sh.kind === 'c' ? sh.y + pad : Math.max(sh.ay, sh.by) + pad;
      const i0 = Math.max(0, Math.floor((minx - e.x0) / CELL)), i1 = Math.min(w - 1, Math.floor((maxx - e.x0) / CELL));
      const j0 = Math.max(0, Math.floor((miny - e.y0) / CELL)), j1 = Math.min(h - 1, Math.floor((maxy - e.y0) / CELL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = e.x0 + (i + 0.5) * CELL, y = e.y0 + (j + 0.5) * CELL;
        const d = dist(sh, x, y);
        if (d > pad) continue;
        const k = j * w + i;
        sum[k] += Math.exp((r - d) / K);
        if ((sh.kind === 's' || sh.core) && d <= r) core[k] = 1;
      }
    }
    for (let k = 0; k < n; k++) {
      if (sum[k] <= 1) continue; // fusion douce : dedans quand la somme dépasse 1
      const m = geo!.maskAt(e.x0 + ((k % w) + 0.5) * CELL, e.y0 + (Math.floor(k / w) + 0.5) * CELL);
      if (m === 0) continue; // pas de territoire en mer
      const f = K * Math.log(sum[k]) + (core[k] ? CORE : 0);
      if (f > best[k]) { best[k] = f; owner[k] = o; }
    }
  });
  const outlines = all.map((_, o) => contour(owner, w, h, o, e.x0, e.y0));
  cache = { key, w, h, x0: e.x0, y0: e.y0, cell: CELL, owner, outlines };
  return cache;
}

/** Contour lissé d'un camp (carrés marchants sur l'appartenance adoucie) */
function contour(owner: Int8Array, w: number, h: number, o: number, x0: number, y0: number) {
  let v = new Float32Array(w * h);
  for (let k = 0; k < v.length; k++) v[k] = owner[k] === o ? 1 : 0;
  for (let pass = 0; pass < 2; pass++) { // deux flous 3×3 pour arrondir les marches d'escalier
    const t = new Float32Array(v.length);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let a = 0, c = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue; a += v[jj * w + ii]; c++; }
      t[j * w + i] = a / c;
    }
    v = t;
  }
  const seg: number[] = [], th = 0.5;
  const P = (i: number, j: number): [number, number] => [x0 + (i + 0.5) * CELL, y0 + (j + 0.5) * CELL];
  const lerp = (a: [number, number], b: [number, number], va: number, vb: number): [number, number] => { const t = (th - va) / (vb - va); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
    const a = v[j * w + i], b = v[j * w + i + 1], c = v[(j + 1) * w + i + 1], d = v[(j + 1) * w + i];
    const idx = (a > th ? 8 : 0) | (b > th ? 4 : 0) | (c > th ? 2 : 0) | (d > th ? 1 : 0);
    if (idx === 0 || idx === 15) continue;
    const pa = P(i, j), pb = P(i + 1, j), pc = P(i + 1, j + 1), pd = P(i, j + 1);
    const top = () => lerp(pa, pb, a, b), right = () => lerp(pb, pc, b, c), bottom = () => lerp(pd, pc, d, c), left = () => lerp(pa, pd, a, d);
    const add = (p: [number, number], q: [number, number]) => seg.push(p[0], p[1], q[0], q[1]);
    switch (idx) {
      case 1: case 14: add(left(), bottom()); break;
      case 2: case 13: add(bottom(), right()); break;
      case 3: case 12: add(left(), right()); break;
      case 4: case 11: add(top(), right()); break;
      case 6: case 9: add(top(), bottom()); break;
      case 7: case 8: add(left(), top()); break;
      case 5: add(left(), top()); add(bottom(), right()); break;
      case 10: add(top(), right()); add(left(), bottom()); break;
    }
  }
  return new Float32Array(seg);
}

/** Propriétaire d'un point : 'player', un rival, ou null. Calcul exact au point (même règle que la carte dessinée). */
export function ownerAt(s: GameState, x: number, y: number): 'player' | Faction | null {
  if (!geo || geo.maskAt(x, y) === 0) return null;
  let best = -Infinity, who = -1;
  camps(s).camps.forEach((list, o) => {
    let sum = 0, core = false;
    for (const sh of list) {
      const d = dist(sh, x, y);
      if (d > sh.r + 3 * K) continue;
      sum += Math.exp((sh.r - d) / K);
      if ((sh.kind === 's' || sh.core) && d <= sh.r) core = true;
    }
    if (sum <= 1) return;
    const f = K * Math.log(sum) + (core ? CORE : 0);
    if (f > best) { best = f; who = o; }
  });
  if (who < 0) return null;
  return who === 0 ? 'player' : s.factions?.[who - 1] ?? null;
}
/** La carte des territoires est-elle disponible (sinon on se replie sur des cercles) */
export const territoryReady = () => !!geo;
