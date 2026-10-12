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
  static readonly NAV_RANK = 10;   // rang Natural Earth maximal d'un fleuve navigable
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
      const p = pts[e.id]; let best = -1, bd = 3;
      for (const q of this.navNear(p.x, p.y)) {
        if ((pts[q] as { line?: number }).line === e.line) continue;
        const d = Math.hypot(pts[q].x - p.x, pts[q].y - p.y);
        if (d < bd) { bd = d; best = q; }
      }
      if (best >= 0) { adj[e.id].push({ to: best, len: bd }); adj[best].push({ to: e.id, len: bd }); }
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
    const a = this.nearestNav(ax, ay), b = this.nearestNav(bx, by);
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
  elevAt(x: number, y: number) { const k = this.cell(x, y); return k < 0 ? 0 : this.elev[k]; }
  waterDist(x: number, y: number) { const k = this.cell(x, y); return k < 0 ? 0 : this.water[k]; }

  /** Richesse d'une ressource en un point (0 = absente), et le gisement principal */
  richness(res: ResId, x: number, y: number): { value: number; dep: DepositKm | null } {
    let best = 0, dep: DepositKm | null = null;
    for (const d of this.deposits) {
      if (d.res !== res) continue;
      const u = (x - d.x) / d.rx, v = (y - d.y) / d.ry, q = u * u + v * v;
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
