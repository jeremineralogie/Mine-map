// Réseau routier : nœuds, tronçons, coûts selon le relief, itinéraires.
import { BRIDGE_COST, MAX_GRADIENT, ROADS, type RoadType } from './defs';
import type { Geo } from './geo';
import type { GameState, RNode, Edge } from './state';

export interface SegmentQuote { len: number; cost: number; bridges: number; rivers: string[]; grad: number; error?: string; }

export function quoteSegment(geo: Geo, ax: number, ay: number, bx: number, by: number, type: RoadType, foreign: boolean): SegmentQuote {
  const a = geo.analyseSegment(ax, ay, bx, by, foreign);
  const cr = geo.riverCrossings(ax, ay, bx, by);
  const slopeMult = 1 + a.grad / 15;
  const cost = Math.round(a.len * ROADS[type].perKm * slopeMult + cr.n * BRIDGE_COST);
  let error: string | undefined;
  if (!a.ok) error = 'Le tracé sort du territoire (mer, lac ou pays étranger).';
  else if (a.grad > MAX_GRADIENT) error = `Pente trop forte (${Math.round(a.grad)} m/km). Contourne la montagne par une vallée.`;
  else if (a.len < 0.3) error = 'Tronçon trop court.';
  return { len: a.len, cost, bridges: cr.n, rivers: cr.names, grad: a.grad, error };
}

export function nodeById(s: GameState, id: number) { return s.nodes.find(n => n.id === id); }

export function addNode(s: GameState, x: number, y: number, bid?: number): RNode {
  const n: RNode = { id: s.nextId++, x, y };
  if (bid !== undefined) n.b = bid;
  s.nodes.push(n);
  return n;
}

export function addEdge(s: GameState, a: number, b: number, type: RoadType, len: number, bridges: number): Edge {
  const e: Edge = { id: s.nextId++, a, b, type, len, bridges };
  s.edges.push(e);
  invalidate();
  return e;
}

export function removeEdge(s: GameState, id: number) {
  s.edges = s.edges.filter(e => e.id !== id);
  // supprime les nœuds isolés qui ne sont pas rattachés à un bâtiment
  const used = new Set<number>();
  for (const e of s.edges) { used.add(e.a); used.add(e.b); }
  s.nodes = s.nodes.filter(n => used.has(n.id) || n.b !== undefined);
  invalidate();
}

export function roadKm(s: GameState) { return s.edges.reduce((t, e) => t + e.len, 0); }

// ---- Graphe et plus court chemin (en temps de trajet) ----
// un graphe par économie (joueur et chaque rival), reconstruit seulement après une modification du réseau
let adjCache = new WeakMap<GameState, { n: number; m: Map<number, { to: number; e: Edge }[]> }>();
export function invalidate() { adjCache = new WeakMap(); }
function adj(s: GameState) {
  const c = adjCache.get(s);
  if (c && c.n === s.edges.length) return c.m;
  const m = new Map<number, { to: number; e: Edge }[]>();
  for (const e of s.edges) {
    if (!m.has(e.a)) m.set(e.a, []);
    if (!m.has(e.b)) m.set(e.b, []);
    m.get(e.a)!.push({ to: e.b, e }); m.get(e.b)!.push({ to: e.a, e });
  }
  adjCache.set(s, { n: s.edges.length, m });
  return m;
}

/** Dijkstra depuis un nœud : distances (en jours-équivalents) et prédécesseurs */
export function dijkstra(s: GameState, from: number, voieOnly = false) {
  const g = adj(s), dist = new Map<number, number>(), prev = new Map<number, { n: number; e: Edge }>();
  const heap: [number, number][] = [[0, from]]; dist.set(from, 0);
  while (heap.length) {
    // tas binaire minimal
    const top = heap[0], last = heap.pop()!;
    if (heap.length) { heap[0] = last; siftDown(heap); }
    const [d, n] = top;
    if (d > (dist.get(n) ?? Infinity)) continue;
    for (const { to, e } of g.get(n) || []) {
      if (voieOnly && e.type !== 'voie') continue;   // carpentum : voies romaines seulement
      const nd = d + e.len / ROADS[e.type].speed;
      if (nd < (dist.get(to) ?? Infinity)) { dist.set(to, nd); prev.set(to, { n, e }); heap.push([nd, to]); siftUp(heap); }
    }
  }
  return { dist, prev };
}
function siftUp(h: [number, number][]) {
  let i = h.length - 1;
  while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; }
}
function siftDown(h: [number, number][]) {
  let i = 0;
  for (;;) {
    const l = 2 * i + 1, r = l + 1; let m = i;
    if (l < h.length && h[l][0] < h[m][0]) m = l;
    if (r < h.length && h[r][0] < h[m][0]) m = r;
    if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m;
  }
}

export interface Path { pts: { x: number; y: number }[]; speed: number[]; len: number; }

export function findPath(s: GameState, from: number, to: number, voieOnly = false): Path | null {
  if (from === to) { const n = nodeById(s, from)!; return { pts: [{ x: n.x, y: n.y }], speed: [], len: 0 }; }
  const { dist, prev } = dijkstra(s, from, voieOnly);
  if (!dist.has(to)) return null;
  const nodes: number[] = [to], speeds: number[] = [];
  let len = 0, cur = to;
  while (cur !== from) {
    const p = prev.get(cur)!;
    speeds.unshift(ROADS[p.e.type].speed); len += p.e.len;
    cur = p.n; nodes.unshift(cur);
  }
  const pts = nodes.map(id => { const n = nodeById(s, id)!; return { x: n.x, y: n.y }; });
  return { pts, speed: speeds, len };
}

/** Composantes connexes : nœud -> numéro de composante */
export function components(s: GameState) {
  const g = adj(s), comp = new Map<number, number>(); let c = 0;
  for (const n of s.nodes) {
    if (comp.has(n.id)) continue;
    const st = [n.id]; comp.set(n.id, c);
    while (st.length) { const k = st.pop()!; for (const { to } of g.get(k) || []) if (!comp.has(to)) { comp.set(to, c); st.push(to); } }
    c++;
  }
  return comp;
}

// ---- Carrefours ----

/** Point d'un tronçon le plus proche de (x, y) */
export function projectOnEdge(s: GameState, e: Edge, x: number, y: number) {
  const a = nodeById(s, e.a)!, b = nodeById(s, e.b)!;
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0.02, Math.min(0.98, ((x - a.x) * dx + (y - a.y) * dy) / L2));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

/** Coupe un tronçon en deux pour y créer un carrefour (sans frais) */
export function splitEdge(s: GameState, geo: Geo, edgeId: number, x: number, y: number): RNode {
  const e = s.edges.find(x => x.id === edgeId)!;
  const p = projectOnEdge(s, e, x, y);
  const n = addNode(s, p.x, p.y);
  s.edges = s.edges.filter(x => x.id !== e.id);
  for (const [u, v] of [[e.a, n.id], [n.id, e.b]]) {
    const A = nodeById(s, u)!, B = nodeById(s, v)!;
    s.edges.push({ id: s.nextId++, a: u, b: v, type: e.type, len: Math.hypot(B.x - A.x, B.y - A.y), bridges: geo.riverCrossings(A.x, A.y, B.x, B.y).n });
  }
  invalidate();
  return n;
}

/** Premier croisement entre le segment A→B et une route existante (hors routes touchant A ou B) */
export function firstCrossing(s: GameState, a: RNode, b: RNode) {
  let best: { edge: number; t: number; x: number; y: number } | null = null;
  for (const e of s.edges) {
    if (e.a === a.id || e.b === a.id || e.a === b.id || e.b === b.id) continue;
    const c = nodeById(s, e.a)!, d = nodeById(s, e.b)!;
    const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y, den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den, u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
    if (t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999 && (!best || t < best.t)) best = { edge: e.id, t, x: a.x + rx * t, y: a.y + ry * t };
  }
  return best;
}
