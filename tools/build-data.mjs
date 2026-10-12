// Génère les données géographiques du jeu (à lancer une seule fois : `npm run data`).
// Sources : Natural Earth (domaine public) et tuiles d'altitude Terrarium (Mapzen / AWS Open Data).
// Les fichiers produits sont versionnés dans public/data : le jeu ne dépend d'aucun service externe.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const NE = process.argv[2] || 'tools/.cache';
const OUT = 'public/data';
fs.mkdirSync(OUT, { recursive: true });

// ---- Projection (sinusoïdale centrée sur la France, en km, y vers le bas) ----
const LON0 = 2.5, LAT0 = 46.5, KX = 111.32, KY = 110.57;
const BBOX = { lonMin: -6.2, lonMax: 10.6, latMin: 40.9, latMax: 51.7 };
const proj = (lon, lat) => [(lon - LON0) * KX * Math.cos(lat * Math.PI / 180), (LAT0 - lat) * KY];
const unproj = (x, y) => { const lat = LAT0 - y / KY; return [LON0 + x / (KX * Math.cos(lat * Math.PI / 180)), lat]; };

// Emprise en km
const corners = [];
for (const lon of [BBOX.lonMin, BBOX.lonMax]) for (let lat = BBOX.latMin; lat <= BBOX.latMax; lat += 0.5) corners.push(proj(lon, lat));
const X0 = Math.floor(Math.min(...corners.map(c => c[0]))), X1 = Math.ceil(Math.max(...corners.map(c => c[0])));
const Y0 = Math.floor(proj(0, BBOX.latMax)[1]), Y1 = Math.ceil(proj(0, BBOX.latMin)[1]);
console.log('emprise km', X0, X1, Y0, Y1);

// ---- Lecture Natural Earth ----
const rd = f => JSON.parse(fs.readFileSync(path.join(NE, f + '.geojson'), 'utf8'));
const inBox = (lon, lat) => lon > BBOX.lonMin - 1 && lon < BBOX.lonMax + 1 && lat > BBOX.latMin - 1 && lat < BBOX.latMax + 1;
const polysOf = g => !g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
const linesOf = g => !g ? [] : g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];

// Douglas-Peucker
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) {
      // segment dégénéré (anneau fermé) : distance au point
      const d = L < 1e-9 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L;
      if (d > md) { md = d; mi = i; }
    }
    if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const r1 = v => Math.round(v * 10) / 10;
const projRing = (ring, eps) => simplify(ring.map(([lo, la]) => proj(lo, la)), eps).map(([x, y]) => [r1(x), r1(y)]);

const countries = rd('ne_10m_admin_0_countries').features;
const france = [], neighbours = [], allLand = [];
for (const f of countries) {
  const iso = f.properties.ADM0_A3;
  for (const poly of polysOf(f.geometry)) {
    if (!poly[0].some(([lo, la]) => inBox(lo, la))) continue;
    // Pour la France, on ne garde que la métropole et la Corse
    if (iso === 'FRA' && !poly[0].every(([lo, la]) => inBox(lo, la))) continue;
    const rings = poly.map(r => projRing(r, 0.4)).filter(r => r.length > 3);
    if (!rings.length) continue;
    allLand.push(rings);
    if (iso === 'FRA') france.push(rings);
    else neighbours.push({ iso, name: f.properties.NAME_FR || f.properties.NAME, rings });
  }
}
console.log('France polygones', france.length, 'voisins', neighbours.length);

const rivers = [];
for (const file of ['ne_10m_rivers_lake_centerlines', 'ne_10m_rivers_europe']) {
  for (const f of rd(file).features) {
    const rank = f.properties.scalerank ?? 10;
    for (const line of linesOf(f.geometry)) {
      if (!line.some(([lo, la]) => inBox(lo, la))) continue;
      const pts = simplify(line.map(([lo, la]) => proj(lo, la)), 0.3).map(([x, y]) => [r1(x), r1(y)]);
      if (pts.length > 1) rivers.push({ name: f.properties.name_fr || f.properties.name || '', rank, pts });
    }
  }
}
const lakes = [];
for (const file of ['ne_10m_lakes', 'ne_10m_lakes_europe']) {
  for (const f of rd(file).features) for (const poly of polysOf(f.geometry)) {
    if (!poly[0].some(([lo, la]) => inBox(lo, la))) continue;
    const rings = poly.map(r => projRing(r, 0.3)).filter(r => r.length > 3);
    if (rings.length) lakes.push(rings);
  }
}
console.log('rivières', rivers.length, 'lacs', lakes.length);

// ---- Rasterisation de polygones (règle pair-impair) ----
function rasterize(polys, W, H, cell, ox, oy, mask, value) {
  for (const rings of polys) {
    let ymin = Infinity, ymax = -Infinity;
    for (const r of rings) for (const p of r) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
    const j0 = Math.max(0, Math.floor((ymin - oy) / cell)), j1 = Math.min(H - 1, Math.ceil((ymax - oy) / cell));
    for (let j = j0; j <= j1; j++) {
      const y = oy + (j + 0.5) * cell, xs = [];
      for (const r of rings) for (let i = 0, k = r.length - 1; i < r.length; k = i++) {
        const [xa, ya] = r[k], [xb, yb] = r[i];
        if ((ya > y) !== (yb > y)) xs.push(xa + (y - ya) / (yb - ya) * (xb - xa));
      }
      xs.sort((a, b) => a - b);
      for (let q = 0; q + 1 < xs.length; q += 2) {
        const i0 = Math.max(0, Math.ceil((xs[q] - ox) / cell - 0.5)), i1 = Math.min(W - 1, Math.floor((xs[q + 1] - ox) / cell - 0.5));
        for (let i = i0; i <= i1; i++) mask[j * W + i] = value;
      }
    }
  }
}

// ---- Altitudes (tuiles Terrarium zoom 8) ----
const Z = 8, TS = 256, N = 2 ** Z;
const tileX = lon => (lon + 180) / 360 * N;
const tileY = lat => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * N; };
const tiles = new Map();
const cacheDir = path.join(NE, 'terrarium'); fs.mkdirSync(cacheDir, { recursive: true });
async function loadTiles() {
  // l'emprise projetée déborde de la boîte lon/lat aux coins : on couvre tout le rectangle en km
  const cs = [];
  for (let t = 0; t <= 1; t += 0.05) cs.push(unproj(X0 + (X1 - X0) * t, Y0), unproj(X0 + (X1 - X0) * t, Y1), unproj(X0, Y0 + (Y1 - Y0) * t), unproj(X1, Y0 + (Y1 - Y0) * t));
  const tx0 = Math.floor(tileX(Math.min(...cs.map(c => c[0])) - 0.2)), tx1 = Math.floor(tileX(Math.max(...cs.map(c => c[0])) + 0.2));
  const ty0 = Math.floor(tileY(Math.max(...cs.map(c => c[1])) + 0.2)), ty1 = Math.floor(tileY(Math.min(...cs.map(c => c[1])) - 0.2));
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) {
    const f = path.join(cacheDir, `${Z}_${tx}_${ty}.png`);
    if (!fs.existsSync(f)) {
      const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`);
      fs.writeFileSync(f, Buffer.from(await res.arrayBuffer()));
    }
    const png = PNG.sync.read(fs.readFileSync(f));
    const e = new Float32Array(TS * TS);
    for (let i = 0; i < TS * TS; i++) e[i] = png.data[i * 4] * 256 + png.data[i * 4 + 1] + png.data[i * 4 + 2] / 256 - 32768;
    tiles.set(`${tx}_${ty}`, e);
  }
  console.log('tuiles', tiles.size);
}
function elevAt(lon, lat) {
  const fx = tileX(lon) * TS - 0.5, fy = tileY(lat) * TS - 0.5;
  const get = (px, py) => { const t = tiles.get(`${Math.floor(px / TS)}_${Math.floor(py / TS)}`); return t ? t[(py % TS) * TS + (px % TS)] : 0; };
  const x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
  return get(x0, y0) * (1 - ax) * (1 - ay) + get(x0 + 1, y0) * ax * (1 - ay) + get(x0, y0 + 1) * (1 - ax) * ay + get(x0 + 1, y0 + 1) * ax * ay;
}

await loadTiles();

// ---- Image de relief (0,8 km par pixel) ----
const CELL = 0.8, W = Math.round((X1 - X0) / CELL), H = Math.round((Y1 - Y0) / CELL);
const elev = new Float32Array(W * H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const [lo, la] = unproj(X0 + (i + 0.5) * CELL, Y0 + (j + 0.5) * CELL);
  elev[j * W + i] = elevAt(lo, la);
}
const land = new Uint8Array(W * H); rasterize(allLand, W, H, CELL, X0, Y0, land, 1);
const lakeMask = new Uint8Array(W * H); rasterize(lakes, W, H, CELL, X0, Y0, lakeMask, 1);

const ramp = [[-4000, [150, 186, 212]], [-200, [176, 205, 225]], [0, [196, 220, 234]],
  [1, [214, 228, 196]], [150, [226, 232, 200]], [400, [234, 228, 196]], [800, [226, 212, 176]],
  [1300, [212, 194, 160]], [1900, [196, 180, 156]], [2500, [214, 208, 202]], [3200, [244, 244, 244]]];
function tint(e) {
  if (e <= ramp[0][0]) return ramp[0][1];
  for (let k = 1; k < ramp.length; k++) if (e <= ramp[k][0]) {
    const [ea, ca] = ramp[k - 1], [eb, cb] = ramp[k], t = (e - ea) / (eb - ea);
    return ca.map((c, q) => c + (cb[q] - c) * t);
  }
  return ramp[ramp.length - 1][1];
}
const png = new PNG({ width: W, height: H });
const az = 315 * Math.PI / 180, alt = 45 * Math.PI / 180, zf = 2.2;
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const k = j * W + i, isLand = land[k] && !lakeMask[k];
  const e = isLand ? Math.max(1, elev[k]) : Math.min(0, elev[k]);
  const g = (a, b) => elev[Math.min(H - 1, Math.max(0, b)) * W + Math.min(W - 1, Math.max(0, a))];
  let col = tint(e);
  if (isLand) {
    const dzdx = ((g(i + 1, j - 1) + 2 * g(i + 1, j) + g(i + 1, j + 1)) - (g(i - 1, j - 1) + 2 * g(i - 1, j) + g(i - 1, j + 1))) / (8 * CELL * 1000);
    const dzdy = ((g(i - 1, j + 1) + 2 * g(i, j + 1) + g(i + 1, j + 1)) - (g(i - 1, j - 1) + 2 * g(i, j - 1) + g(i + 1, j - 1))) / (8 * CELL * 1000);
    const slope = Math.atan(zf * Math.hypot(dzdx, dzdy)), aspect = Math.atan2(dzdy, -dzdx);
    let sh = Math.cos(alt) * Math.cos(slope) + Math.sin(alt) * Math.sin(slope) * Math.cos(az - Math.PI / 2 - aspect);
    sh = Math.max(0, Math.min(1, sh));
    const f = 0.62 + 0.5 * (sh - Math.cos(alt) * 1); // ombrage relatif au plat
    col = col.map(c => c * Math.max(0.55, Math.min(1.12, f + 0.38)));
  } else if (lakeMask[k]) col = [176, 205, 225];
  png.data[k * 4] = Math.min(255, col[0]); png.data[k * 4 + 1] = Math.min(255, col[1]); png.data[k * 4 + 2] = Math.min(255, col[2]); png.data[k * 4 + 3] = 255;
}
fs.writeFileSync(path.join(OUT, 'relief.png'), PNG.sync.write(png, { colorType: 2 }));
console.log('relief.png', W, H);

// ---- Grilles de jeu (2 km par case) ----
const GC = 2, GW = Math.ceil((X1 - X0) / GC), GH = Math.ceil((Y1 - Y0) / GC);
const gElev = new Int16Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
  const [lo, la] = unproj(X0 + (i + 0.5) * GC, Y0 + (j + 0.5) * GC);
  gElev[j * GW + i] = Math.round(elevAt(lo, la));
}
// 0 = mer, 1 = France, 2 = autre terre, 3 = lac
const gMask = new Uint8Array(GW * GH);
rasterize(neighbours.map(n => n.rings), GW, GH, GC, X0, Y0, gMask, 2);
rasterize(france, GW, GH, GC, X0, Y0, gMask, 1);
rasterize(lakes, GW, GH, GC, X0, Y0, gMask, 3);
// Distance à l'eau (fleuve, lac ou côte), en km, plafonnée à 250
const INF = 65535, dist = new Uint16Array(GW * GH).fill(INF);
const seed = (i, j) => { if (i >= 0 && j >= 0 && i < GW && j < GH) dist[j * GW + i] = 0; };
for (const r of rivers) if (r.rank <= 11) for (let q = 1; q < r.pts.length; q++) {
  const [xa, ya] = r.pts[q - 1], [xb, yb] = r.pts[q], n = Math.ceil(Math.hypot(xb - xa, yb - ya) / (GC / 2));
  for (let s = 0; s <= n; s++) seed(Math.floor((xa + (xb - xa) * s / n - X0) / GC), Math.floor((ya + (yb - ya) * s / n - Y0) / GC));
}
for (let k = 0; k < GW * GH; k++) if (gMask[k] === 0 || gMask[k] === 3) dist[k] = 0;
// chanfrein 3-4 (en demi-km)
for (let pass = 0; pass < 2; pass++) {
  const fw = pass === 0;
  for (let jj = 0; jj < GH; jj++) for (let ii = 0; ii < GW; ii++) {
    const j = fw ? jj : GH - 1 - jj, i = fw ? ii : GW - 1 - ii, k = j * GW + i, s = fw ? -1 : 1;
    const nb = [[i + s, j, 3], [i, j + s, 3], [i + s, j + s, 4], [i - s, j + s, 4]];
    for (const [a, b, w] of nb) if (a >= 0 && b >= 0 && a < GW && b < GH) dist[k] = Math.min(dist[k], dist[b * GW + a] + w);
  }
}
const gWater = new Uint8Array(GW * GH);
for (let k = 0; k < GW * GH; k++) gWater[k] = Math.min(250, Math.round(dist[k] / 3 * GC));

const buf = Buffer.concat([Buffer.from(gElev.buffer), Buffer.from(gMask.buffer), Buffer.from(gWater.buffer)]);
fs.writeFileSync(path.join(OUT, 'grid.bin'), buf);

fs.writeFileSync(path.join(OUT, 'geo.json'), JSON.stringify({
  proj: { lon0: LON0, lat0: LAT0, kx: KX, ky: KY },
  extent: { x0: X0, y0: Y0, x1: X1, y1: Y1 },
  relief: { w: W, h: H, cell: CELL },
  grid: { w: GW, h: GH, cell: GC },
  france, neighbours, lakes,
  rivers: rivers.filter(r => r.rank <= 11).map(r => ({ n: r.name, r: r.rank, p: r.pts })),
}));
console.log('grille', GW, GH, 'ok');
