// Données géographiques : projection, relief, masque terre/mer, distance à l'eau, gisements, fleuves.
import { DEPOSITS, type Deposit, type ResId } from './defs';

type Ring = [number, number][];
interface GeoFile {
  proj: { lon0: number; lat0: number; kx: number; ky: number };
  extent: { x0: number; y0: number; x1: number; y1: number };
  relief: { w: number; h: number; cell: number };
  grid: { w: number; h: number; cell: number };
  france: Ring[][];
  neighbours: { iso: string; name: string; rings: Ring[] }[];
  lakes: Ring[][];
  rivers: { n: string; r: number; p: Ring }[];
}

export interface DepositKm extends Deposit { x: number; y: number; }

export class Geo {
  data!: GeoFile;
  relief!: HTMLImageElement;
  elev!: Int16Array;
  mask!: Uint8Array;
  water!: Uint8Array;
  deposits: DepositKm[] = [];
  private riverIndex = new Map<string, [number, number, number, number, number][]>();
  // réseau navigable : sommets des fleuves principaux reliés entre eux (confluences comprises)
  private navPts: { x: number; y: number }[] = [];
  private navAdj: { to: number; len: number }[][] = [];
  private navGrid = new Map<string, number[]>();

  async load(base: string) {
    const [geo, bin, img] = await Promise.all([
      fetch(base + 'data/geo.json').then(r => r.json() as Promise<GeoFile>),
      fetch(base + 'data/grid.bin').then(r => r.arrayBuffer()),
      new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = base + 'data/relief.png'; }),
    ]);
    this.data = geo; this.relief = img;
    const n = geo.grid.w * geo.grid.h;
    this.elev = new Int16Array(bin, 0, n);
    this.mask = new Uint8Array(bin, n * 2, n);
    this.water = new Uint8Array(bin, n * 3, n);
    this.deposits = DEPOSITS.map(d => { const [x, y] = this.proj(d.lon, d.lat); return { ...d, x, y }; });
    this.buildNavigation();
    // index spatial des fleuves (cases de 20 km) pour détecter les ponts
    geo.rivers.forEach((r, ri) => {
      for (let i = 1; i < r.p.length; i++) {
        const [ax, ay] = r.p[i - 1], [bx, by] = r.p[i];
        for (let gx = Math.floor(Math.min(ax, bx) / 20); gx <= Math.floor(Math.max(ax, bx) / 20); gx++)
          for (let gy = Math.floor(Math.min(ay, by) / 20); gy <= Math.floor(Math.max(ay, by) / 20); gy++) {
            const k = gx + ',' + gy;
            if (!this.riverIndex.has(k)) this.riverIndex.set(k, []);
            this.riverIndex.get(k)!.push([ax, ay, bx, by, ri]);
          }
      }
    });
  }

  // ---------- Navigation fluviale ----------
  static readonly NAV_RANK = 10;
  static readonly NAV_REACH = 8;  // distance maximale entre un arrêt de barge et le fleuve (km)   // rang Natural Earth maximal d'un fleuve navigable
  private buildNavigation() {
    const pts = this.navPts, adj = this.navAdj, key = (x: number, y: number) => `${Math.floor(x / 5)},${Math.floor(y / 5)}`;
    const ends: { id: number; line: number }[] = [];
    this.data.rivers.forEach((r, li) => {
      if (r.r > Geo.NAV_RANK || r.p.length < 2) return;
      let prev = -1;
      r.p.forEach(([x, y], i) => {
        const id = pts.length; pts.push({ x, y }); adj.push([]);
        const k = key(x, y); if (!this.navGrid.has(k)) this.navGrid.set(k, []); this.navGrid.get(k)!.push(id);
        (pts[id] as { line?: number }).line = li;
        if (prev >= 0) { const L = Math.hypot(x - pts[prev].x, y - pts[prev].y); adj[prev].push({ to: id, len: L }); adj[id].push({ to: prev, len: L }); }
        if (i === 0 || i === r.p.length - 1) ends.push({ id, line: li });
        prev = id;
      });
    });
    // raccorde chaque extrémité au sommet le plus proche d'un autre tronçon (confluences, tronçons découpés)
    for (const e of ends) {
      const p = pts[e.id]; let best = -1, bd = 5;
      for (const q of this.navNear(p.x, p.y)) {
        if ((pts[q] as { line?: number }).line === e.line) continue;
        const d = Math.hypot(pts[q].x - p.x, pts[q].y - p.y);
        if (d < bd) { bd = d; best = q; }
      }
      if (best >= 0) { adj[e.id].push({ to: best, len: bd }); adj[best].push({ to: e.id, len: bd }); }
    }
    // estuaires que le tracé simplifié ne relie pas : la Dordogne rejoint la Garonne au bec d'Ambès (Gironde)
    for (const [ra, rb] of [['Dordogne', 'Garonne']]) {
      const found: { best: [number, number, number] | null } = { best: null };
      pts.forEach((p, i) => {
        if (this.data.rivers[(p as { line?: number }).line!].n !== ra) return;
        pts.forEach((q, j) => {
          if (this.data.rivers[(q as { line?: number }).line!].n !== rb) return;
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d < 15 && (!found.best || d < found.best[0])) found.best = [d, i, j];
        });
      });
      if (found.best) { const [d, i, j] = found.best; adj[i].push({ to: j, len: d }); adj[j].push({ to: i, len: d }); }
    }
  }
  private navNear(x: number, y: number) {
    const out: number[] = [], gx = Math.floor(x / 5), gy = Math.floor(y / 5);
    for (let i = gx - 1; i <= gx + 1; i++) for (let j = gy - 1; j <= gy + 1; j++) out.push(...(this.navGrid.get(`${i},${j}`) ?? []));
    return out;
  }
  /** Sommet navigable le plus proche (et sa distance), dans un rayon donné */
  nearestNav(x: number, y: number, max = 4) {
    let best = -1, bd = max;
    for (const q of this.navNear(x, y)) { const d = Math.hypot(this.navPts[q].x - x, this.navPts[q].y - y); if (d < bd) { bd = d; best = q; } }
    if (best < 0 && max > 5) { // recherche élargie
      this.navPts.forEach((p, q) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = q; } });
    }
    return best < 0 ? null : { id: best, d: bd, name: this.data.rivers[(this.navPts[best] as { line?: number }).line!].n };
  }
  /** Itinéraire par le fleuve entre deux points situés au bord de l'eau */
  riverPath(ax: number, ay: number, bx: number, by: number): { pts: { x: number; y: number }[]; len: number } | null {
    // un arrêt peut être un peu à l'écart du fleuve (quai, entrepôt riverain) : jusqu'à NAV_REACH km
    const a = this.nearestNav(ax, ay, Geo.NAV_REACH), b = this.nearestNav(bx, by, Geo.NAV_REACH);
    if (!a || !b) return null;
    const dist = new Map<number, number>([[a.id, 0]]), prev = new Map<number, number>(), heap: [number, number][] = [[0, a.id]];
    while (heap.length) {
      const [d, n] = heapPop(heap);
      if (n === b.id) break;
      if (d > (dist.get(n) ?? Infinity)) continue;
      for (const { to, len } of this.navAdj[n]) {
        const nd = d + len;
        if (nd < (dist.get(to) ?? Infinity)) { dist.set(to, nd); prev.set(to, n); heapPush(heap, [nd, to]); }
      }
    }
    if (!dist.has(b.id)) return null;
    const ids = [b.id]; while (ids[0] !== a.id) ids.unshift(prev.get(ids[0])!);
    const pts = [{ x: ax, y: ay }, ...ids.map(i => this.navPts[i]), { x: bx, y: by }];
    return { pts, len: dist.get(b.id)! + a.d + b.d };
  }

  proj(lon: number, lat: number): [number, number] {
    const p = this.data.proj;
    return [(lon - p.lon0) * p.kx * Math.cos(lat * Math.PI / 180), (p.lat0 - lat) * p.ky];
  }

  private cell(x: number, y: number) {
    const g = this.data.grid, e = this.data.extent;
    const i = Math.floor((x - e.x0) / g.cell), j = Math.floor((y - e.y0) / g.cell);
    if (i < 0 || j < 0 || i >= g.w || j >= g.h) return -1;
    return j * g.w + i;
  }
  /** 0 mer, 1 France, 2 pays voisin, 3 lac */
  maskAt(x: number, y: number) { const k = this.cell(x, y); return k < 0 ? 0 : this.mask[k]; }
  isFrance(x: number, y: number) { return this.maskAt(x, y) === 1; }
  /** Coordonnées géographiques d'un point (inverse de la projection) */
  unproj(x: number, y: number): [number, number] {
    const p = this.data.proj, lat = p.lat0 - y / p.ky;
    return [p.lon0 + x / (p.kx * Math.cos(lat * Math.PI / 180)), lat];
  }
  // ---------- Navigation maritime ----------
  /** Grille grossière (cases de 6 km) des cases de mer, construite à la demande */
  private seaG: { w: number; h: number; c: number; ok: Uint8Array } | null = null;
  private seaCache = new Map<string, { pts: { x: number; y: number }[]; len: number } | null>();
  private seaGrid() {
    if (this.seaG) return this.seaG;
    const c = 6, e = this.data.extent, w = Math.ceil((e.x1 - e.x0) / c), h = Math.ceil((e.y1 - e.y0) / c), ok = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      // une case est navigable si la mer en occupe la majorité (les détroits étroits restent ouverts)
      let n = 0;
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (this.maskAt(e.x0 + (i + (a + 0.5) / 3) * c, e.y0 + (j + (b + 0.5) / 3) * c) === 0) n++;
      ok[j * w + i] = n >= 4 ? 1 : 0;
    }
    return (this.seaG = { w, h, c, ok });
  }
  private seaCellOf(x: number, y: number, maxKm = 30) {
    const g = this.seaGrid(), e = this.data.extent;
    const ci = Math.floor((x - e.x0) / g.c), cj = Math.floor((y - e.y0) / g.c), R = Math.ceil(maxKm / g.c);
    let best = -1, bd = Infinity;
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= g.w || j >= g.h || !g.ok[j * g.w + i]) continue;
      const d = di * di + dj * dj; if (d < bd) { bd = d; best = j * g.w + i; }
    }
    return best;
  }
  /** Centre de la case de mer la plus proche (pour placer un comptoir au large) */
  nearestSea(x: number, y: number): [number, number] {
    const g = this.seaGrid(), e = this.data.extent, k = this.seaCellOf(x, y, 60);
    if (k < 0) return [x, y];
    return [e.x0 + ((k % g.w) + 0.5) * g.c, e.y0 + (Math.floor(k / g.w) + 0.5) * g.c];
  }
  /** Itinéraire d'un navire par la mer (contourne les côtes) */
  seaPath(ax: number, ay: number, bx: number, by: number): { pts: { x: number; y: number }[]; len: number } | null {
    const g = this.seaGrid(), e = this.data.extent;
    const a = this.seaCellOf(ax, ay), b = this.seaCellOf(bx, by);
    if (a < 0 || b < 0) return null;
    const key = a + ':' + b;
    if (!this.seaCache.has(key)) {
      const dist = new Float64Array(g.w * g.h).fill(Infinity), prev = new Int32Array(g.w * g.h).fill(-1), heap: [number, number][] = [[0, a]];
      dist[a] = 0;
      const bxC = b % g.w, byC = Math.floor(b / g.w);
      while (heap.length) {
        const [, n] = heapPop(heap);
        if (n === b) break;
        const ni = n % g.w, nj = Math.floor(n / g.w);
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const i = ni + di, j = nj + dj; if (i < 0 || j < 0 || i >= g.w || j >= g.h) continue;
          const m = j * g.w + i; if (!g.ok[m]) continue;
          const nd = dist[n] + (di && dj ? Math.SQRT2 : 1);
          if (nd < dist[m]) { dist[m] = nd; prev[m] = n; heapPush(heap, [nd + Math.hypot(i - bxC, j - byC), m]); }
        }
      }
      if (!isFinite(dist[b])) this.seaCache.set(key, null);
      else {
        const cells = [b]; while (cells[0] !== a) cells.unshift(prev[cells[0]]);
        // allège le tracé : un point toutes les trois cases
        const pts = cells.filter((_, k) => k % 3 === 0 || k === cells.length - 1).map(k => ({ x: e.x0 + ((k % g.w) + 0.5) * g.c, y: e.y0 + (Math.floor(k / g.w) + 0.5) * g.c }));
        this.seaCache.set(key, { pts, len: dist[b] * g.c });
      }
    }
    const p = this.seaCache.get(key);
    if (!p) return null;
    const pts = [{ x: ax, y: ay }, ...p.pts, { x: bx, y: by }];
    let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
    return { pts, len };
  }

  /** Le point est-il à moins de `km` de la mer ? */
  nearSea(x: number, y: number, km = 3) {
    for (let r = 1; r <= km; r += 1) for (let a = 0; a < 16; a++) {
      const px = x + r * Math.cos(a * Math.PI / 8), py = y + r * Math.sin(a * Math.PI / 8);
      if (this.maskAt(px, py) === 0) return true;
    }
    return false;
  }
  /** Mer bordant un point de la côte française */
  seaOf(x: number, y: number): 'atlantique' | 'mediterranee' {
    const [lon, lat] = this.unproj(x, y);
    return lon > 1 && lat < 44.6 ? 'mediterranee' : 'atlantique';
  }
  elevAt(x: number, y: number) { const k = this.cell(x, y); return k < 0 ? 0 : this.elev[k]; }
  waterDist(x: number, y: number) { const k = this.cell(x, y); return k < 0 ? 0 : this.water[k]; }

  /** Richesse d'une ressource en un point (0 = absente), et le gisement principal */
  richness(res: ResId, x: number, y: number): { value: number; dep: DepositKm | null } {
    let best = 0, dep: DepositKm | null = null;
    for (const d of this.deposits) {
      if (d.res !== res) continue;
      const u = (x - d.x) / d.rx, v = (y - d.y) / d.ry, k = depositShape(d, Math.atan2(v, u)), q = (u * u + v * v) / (k * k);
      if (q >= 1) continue;
      const val = d.rich * (1 - 0.5 * q);
      if (val > best) { best = val; dep = d; }
    }
    return { value: best, dep };
  }

  /** Nombre de fleuves franchis par un segment (et le plus grand rang franchi) */
  riverCrossings(ax: number, ay: number, bx: number, by: number): { n: number; names: string[] } {
    const seen = new Set<string>(); let n = 0; const names: string[] = [];
    for (let gx = Math.floor(Math.min(ax, bx) / 20); gx <= Math.floor(Math.max(ax, bx) / 20); gx++)
      for (let gy = Math.floor(Math.min(ay, by) / 20); gy <= Math.floor(Math.max(ay, by) / 20); gy++) {
        for (const s of this.riverIndex.get(gx + ',' + gy) || []) {
          const key = s.join(',');
          if (seen.has(key)) continue; seen.add(key);
          if (segInter(ax, ay, bx, by, s[0], s[1], s[2], s[3])) {
            n++;
            const nm = this.data.rivers[s[4]].n;
            if (nm && !names.includes(nm)) names.push(nm);
          }
        }
      }
    return { n, names };
  }

  /** Analyse d'un tronçon : longueur, dénivelé moyen, validité (sur le territoire français) */
  analyseSegment(ax: number, ay: number, bx: number, by: number, foreign = false) {
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(2, Math.ceil(len / 1.5));
    let climb = 0, prev = this.elevAt(ax, ay), ok = true, maxGrad = 0;
    for (let s = 1; s <= steps; s++) {
      const x = ax + (bx - ax) * s / steps, y = ay + (by - ay) * s / steps;
      const m = this.maskAt(x, y);
      // près d'un poste-frontière, la route peut mordre sur le pays voisin
      if (m !== 1 && !(foreign && m === 2)) ok = false;
      const e = this.elevAt(x, y), d = Math.abs(e - prev);
      climb += d; maxGrad = Math.max(maxGrad, d / (len / steps)); prev = e;
    }
    // la pente moyenne sur ~5 km est plus représentative que la pente d'une seule case
    const grad = len > 0 ? climb / len : 0;
    return { len, grad, maxGrad, ok };
  }
}

// tas binaire minimal sur la première valeur
/** Contour irrégulier d'un gisement : facteur de rayon selon l'angle (bruit déterministe propre au gisement) */
export function depositShape(d: { id: number }, a: number) {
  let t = d.id * 7919 + 13;
  const rnd = () => { t = t + 0x6D2B79F5 | 0; let z = Math.imul(t ^ t >>> 15, 1 | t); z = z + Math.imul(z ^ z >>> 7, 61 | z) ^ z; return ((z ^ z >>> 14) >>> 0) / 4294967296; };
  const p1 = rnd() * 6.28, p2 = rnd() * 6.28, p3 = rnd() * 6.28, p4 = rnd() * 6.28;
  return 1 + 0.16 * Math.sin(3 * a + p1) + 0.09 * Math.sin(5 * a + p2) + 0.05 * Math.sin(9 * a + p3) + 0.03 * Math.sin(15 * a + p4);
}
function heapPush(h: [number, number][], v: [number, number]) {
  h.push(v); let i = h.length - 1;
  while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; }
}
function heapPop(h: [number, number][]) {
  const top = h[0], last = h.pop()!;
  if (h.length) {
    h[0] = last; let i = 0;
    for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; }
  }
  return top;
}

function segInter(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
