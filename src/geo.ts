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

function segInter(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
