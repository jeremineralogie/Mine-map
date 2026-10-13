// Rendu de la carte sur un canvas (coordonnées monde en km).
import { BUILD, RES, ROADS, SEA_PARTNERS, VEH, WATER_RANGE, WORK_RANGE, type BType, type ResId } from './defs';
import type { Geo } from './geo';
import { BICON, VICON } from './icons';
import { findPath } from './roads';
import type { Building, GameState, Line } from './state';

export class Camera {
  cx = 0; cy = 0; scale = 0.6; w = 0; h = 0; minScale = 0.35;
  toScreen(x: number, y: number): [number, number] { return [(x - this.cx) * this.scale + this.w / 2, (y - this.cy) * this.scale + this.h / 2]; }
  toWorld(sx: number, sy: number): [number, number] { return [(sx - this.w / 2) / this.scale + this.cx, (sy - this.h / 2) / this.scale + this.cy]; }
  zoomAt(sx: number, sy: number, f: number) {
    const [wx, wy] = this.toWorld(sx, sy);
    this.scale = Math.min(40, Math.max(this.minScale, this.scale * f));
    const [nx, ny] = this.toWorld(sx, sy);
    this.cx += wx - nx; this.cy += wy - ny;
  }
}

export interface View {
  layers: { deposits: boolean; water: boolean; workers: boolean; trade: boolean };
  depositFilter: ResId | 'all';
  selected: { kind: 'building' | 'vehicle' | 'edge'; id: number } | null;
  selectedLine: number | null;
  /** lignes à afficher sur la carte (tracé, sens, départ et arrivée) */
  showLines: number[];
  /** ligne survolée dans un panneau : mise en surbrillance */
  hoverLine: number | null;
  /** état d'un bâtiment (pastille d'alerte sur la carte) */
  status?: (b: Building) => { level: 'good' | 'info' | 'warn' | 'bad' };
  draft: { pts: { x: number; y: number }[]; cursor: { x: number; y: number } | null; valid: boolean; snap?: 'building' | 'node' | 'edge' | null } | null;
  ghost: { type: BType; x: number; y: number; ok: boolean } | null;
  hoverEdge: number | null;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  dpr = 1;
  private france = new Path2D();
  private neigh = new Path2D();
  private lakes = new Path2D();
  private rivers: { p: Path2D; w: number }[] = [];
  private waterLayer: HTMLCanvasElement;
  private gardSite: [number, number];

  constructor(public canvas: HTMLCanvasElement, public geo: Geo, public cam: Camera) {
    this.ctx = canvas.getContext('2d')!;
    const ring = (p: Path2D, r: [number, number][]) => { r.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); };
    for (const poly of geo.data.france) for (const r of poly) ring(this.france, r);
    for (const n of geo.data.neighbours) for (const r of n.rings) ring(this.neigh, r);
    for (const poly of geo.data.lakes) for (const r of poly) ring(this.lakes, r);
    const groups = new Map<number, Path2D>();
    for (const r of geo.data.rivers) {
      const w = r.r <= 5 ? 2.4 : r.r <= 8 ? 1.7 : 1.1;
      if (!groups.has(w)) groups.set(w, new Path2D());
      const p = groups.get(w)!;
      r.p.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y));
    }
    this.rivers = [...groups].map(([w, p]) => ({ w, p }));
    // calque de l'eau disponible (une case = 2 km)
    const g = geo.data.grid;
    this.waterLayer = document.createElement('canvas');
    this.waterLayer.width = g.w; this.waterLayer.height = g.h;
    const wc = this.waterLayer.getContext('2d')!, id = wc.createImageData(g.w, g.h);
    for (let k = 0; k < g.w * g.h; k++) if (geo.mask[k] === 1 && geo.water[k] <= WATER_RANGE) {
      id.data[k * 4] = 40; id.data[k * 4 + 1] = 120; id.data[k * 4 + 2] = 220; id.data[k * 4 + 3] = 90;
    }
    wc.putImageData(id, 0, 0);
    this.gardSite = geo.proj(BUILD.pont_du_gard.site![0], BUILD.pont_du_gard.site![1]);
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    this.cam.w = r.width; this.cam.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr); this.canvas.height = Math.round(r.height * this.dpr);
    const e = this.geo.data.extent;
    this.cam.minScale = Math.min(r.width / (e.x1 - e.x0), r.height / (e.y1 - e.y0)) * 0.9;
  }

  private world() {
    const c = this.cam, d = this.dpr;
    this.ctx.setTransform(d * c.scale, 0, 0, d * c.scale, d * (c.w / 2 - c.cx * c.scale), d * (c.h / 2 - c.cy * c.scale));
  }
  private screen() { this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); }
  private px(n: number) { return n / this.cam.scale; }

  draw(s: GameState, v: View, time: number) {
    const ctx = this.ctx, cam = this.cam, geo = this.geo, e = geo.data.extent, rl = geo.data.relief;
    this.screen();
    ctx.fillStyle = '#d8cfbd'; ctx.fillRect(0, 0, cam.w, cam.h);
    // la caméra reste au-dessus de la carte
    cam.cx = Math.min(e.x1, Math.max(e.x0, cam.cx)); cam.cy = Math.min(e.y1, Math.max(e.y0, cam.cy));
    this.world();
    // la carte est une feuille posée sur la table : rien n'est dessiné au-delà
    ctx.save();
    ctx.shadowColor = 'rgba(60,45,30,.35)'; ctx.shadowBlur = 18 * this.dpr;
    ctx.fillStyle = '#a9c6dc'; ctx.fillRect(e.x0, e.y0, e.x1 - e.x0, e.y1 - e.y0);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(e.x0, e.y0, e.x1 - e.x0, e.y1 - e.y0); ctx.clip();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(geo.relief, e.x0, e.y0, rl.w * rl.cell, rl.h * rl.cell);
    // voile sur les pays voisins
    ctx.fillStyle = 'rgba(246,244,238,0.55)'; ctx.fill(this.neigh, 'evenodd');
    ctx.fillStyle = '#a9cbe3'; ctx.fill(this.lakes, 'evenodd');
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const rz = Math.min(1.8, Math.max(0.8, cam.scale / 1.2));
    ctx.strokeStyle = '#4f8fc9';
    for (const r of this.rivers) { ctx.lineWidth = this.px(r.w * rz); ctx.stroke(r.p); }
    ctx.setLineDash([this.px(5), this.px(4)]);
    ctx.strokeStyle = 'rgba(110,98,84,.75)'; ctx.lineWidth = this.px(1); ctx.stroke(this.neigh);
    ctx.setLineDash([]);
    ctx.strokeStyle = '#6b5b4b'; ctx.lineWidth = this.px(1.6); ctx.stroke(this.france);
    ctx.restore();

    if (v.layers.water) this.drawWater(s);
    if (v.layers.workers) this.drawWorkers(s);
    if (v.layers.deposits) this.drawDeposits(s, v);
    this.drawGardSite(s);
    this.drawRoads(s, v);
    const ids = v.hoverLine !== null && !v.showLines.includes(v.hoverLine) ? [...v.showLines, v.hoverLine] : v.showLines;
    const lines = ids.map(id => s.lines.find(l => l.id === id)).filter(Boolean) as Line[];
    const hl = v.hoverLine !== null ? lines.find(l => l.id === v.hoverLine) : undefined;
    // ligne survolée : les autres s'estompent, elle passe au premier plan
    for (const l of lines) if (l !== hl) this.drawLinePath(s, l, !hl && (v.selectedLine === l.id || lines.length === 1), hl ? 0.18 : 1);
    if (hl) this.drawLinePath(s, hl, true, 1, true);
    this.drawSeaRoutes(s, v);
    this.drawBuildings(s, v, time);
    this.drawVehicles(s, v);
    for (const l of hl ? [hl] : lines) this.drawLineBadges(s, l);
    this.drawDraft(v);
    this.drawGhost(s, v);
  }

  private drawWater(s: GameState) {
    const ctx = this.ctx, g = this.geo.data.grid, e = this.geo.data.extent;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.waterLayer, e.x0, e.y0, g.w * g.cell, g.h * g.cell);
    ctx.imageSmoothingEnabled = true;
    for (const b of s.buildings) {
      const r = BUILD[b.type].waterRange; if (!r || !b.built) continue;
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(40,120,220,.25)'; ctx.fill();
      ctx.strokeStyle = 'rgba(40,120,220,.8)'; ctx.lineWidth = this.px(1.5); ctx.stroke();
    }
  }
  private drawWorkers(s: GameState) {
    const ctx = this.ctx;
    for (const b of s.buildings) if (b.city && b.built) {
      ctx.beginPath(); ctx.arc(b.x, b.y, WORK_RANGE, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(214,120,40,.12)'; ctx.fill();
      ctx.setLineDash([this.px(6), this.px(4)]);
      ctx.strokeStyle = 'rgba(190,100,30,.8)'; ctx.lineWidth = this.px(1.5); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  private drawDeposits(s: GameState, v: View) {
    const ctx = this.ctx, showLabels = this.cam.scale > 1.3;
    // seuls les gisements de l'époque en cours (ou passées) sont visibles : les autres se découvrent plus tard
    const shown = this.geo.deposits.filter(d => RES[d.res].era <= s.era
      && (v.depositFilter === 'all' ? d.res !== 'cereales' : d.res === v.depositFilter)); // les terres fertiles ont leur propre filtre
    const fade = this.cam.scale > 4 ? 0.5 : 1; // plus discret quand on zoome, pour laisser voir le relief
    for (const d of shown) {
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, Math.PI * 2);
      const col = RES[d.res].color;
      ctx.globalAlpha = (0.18 + 0.12 * d.rich) * fade; ctx.fillStyle = col; ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = col === '#f1f1f1' ? '#9aa' : col;
      ctx.lineWidth = this.px(1.6);
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (!showLabels) return;
    this.screen();
    ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const d of shown) {
      const [x, y] = this.cam.toScreen(d.x, d.y);
      if (x < -100 || y < -20 || x > this.cam.w + 100 || y > this.cam.h + 20) continue;
      halo(ctx, RES[d.res].name, x, y - 6, '#222');
      ctx.font = '10px system-ui, sans-serif'; halo(ctx, d.name, x, y + 7, '#555'); ctx.font = '600 11px system-ui, sans-serif';
    }
    this.world();
  }
  /** Port de commerce sélectionné : routes maritimes vers ses partenaires */
  private drawSeaRoutes(s: GameState, v: View) {
    if (v.selected?.kind !== 'building') return;
    const b = s.buildings.find(x => x.id === v.selected!.id);
    if (!b || b.type !== 'port_mer' || !b.sea) return;
    const ctx = this.ctx;
    for (const p of SEA_PARTNERS) {
      const to = p.to[b.sea]; if (!to) continue;
      const [tx, ty] = this.geo.proj(to[0], to[1]);
      const mx = (b.x + tx) / 2, my = (b.y + ty) / 2, dx = tx - b.x, dy = ty - b.y, L = Math.hypot(dx, dy) || 1;
      const cx = mx - dy / L * L * 0.18, cy = my + dx / L * L * 0.18;   // légère courbe vers le large
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(cx, cy, tx, ty);
      ctx.setLineDash([this.px(8), this.px(6)]); ctx.strokeStyle = 'rgba(25,80,140,.85)'; ctx.lineWidth = this.px(2.5); ctx.stroke(); ctx.setLineDash([]);
      this.screen(); const [sx, sy] = this.cam.toScreen(tx, ty);
      ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center'; halo(ctx, '⛵ ' + p.name, sx, sy, '#14406e'); this.world();
    }
  }
  private drawGardSite(s: GameState) {
    if (s.buildings.some(b => b.type === 'pont_du_gard')) return;
    const ctx = this.ctx, [x, y] = this.gardSite;
    ctx.beginPath(); ctx.arc(x, y, Math.max(3, this.px(14)), 0, Math.PI * 2);
    ctx.setLineDash([this.px(3), this.px(3)]); ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = this.px(2); ctx.stroke(); ctx.setLineDash([]);
    if (this.cam.scale > 0.9) {
      this.screen(); const [sx, sy] = this.cam.toScreen(x, y);
      ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      halo(ctx, 'Site du Pont du Gard', sx, sy - 18, '#6b4500'); this.world();
    }
  }
  private drawRoads(s: GameState, v: View) {
    const ctx = this.ctx, nodes = new Map(s.nodes.map(n => [n.id, n]));
    const z = Math.min(1.6, Math.max(0.8, this.cam.scale / 2));
    for (const pass of [0, 1]) for (const e of s.edges) {
      const a = nodes.get(e.a), b = nodes.get(e.b); if (!a || !b) continue;
      const sel = v.selected?.kind === 'edge' && v.selected.id === e.id, hov = v.hoverEdge === e.id;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      if (pass === 0) {
        ctx.strokeStyle = sel || hov ? '#d9480f' : e.type === 'voie' ? '#4a4a4a' : '#6e5232';
        ctx.lineWidth = this.px((e.type === 'voie' ? 5 : 3.6) * z + (sel || hov ? 2 : 0)); ctx.stroke();
      } else {
        ctx.strokeStyle = e.type === 'voie' ? '#d9d4c7' : '#c9a774';
        ctx.lineWidth = this.px((e.type === 'voie' ? 2.6 : 1.6) * z); ctx.stroke();
        if (e.bridges && this.cam.scale > 1.5) {
          ctx.fillStyle = '#5a5a5a'; const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          ctx.fillRect(mx - this.px(2), my - this.px(2), this.px(4), this.px(4));
        }
      }
    }
    if (this.cam.scale > 1.2) {
      const deg = new Map<number, number>();
      for (const e of s.edges) { deg.set(e.a, (deg.get(e.a) ?? 0) + 1); deg.set(e.b, (deg.get(e.b) ?? 0) + 1); }
      ctx.fillStyle = '#5a4630';
      for (const n of s.nodes) if (n.b === undefined && deg.get(n.id) !== 2) { ctx.beginPath(); ctx.arc(n.x, n.y, this.px(3), 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // ---- Lignes de transport ----
  private legCache = new Map<string, { x: number; y: number }[][]>();
  /** Itinéraire routier de chaque étape d'une ligne (mis en cache tant que le réseau ne change pas) */
  private legs(s: GameState, l: Line) {
    const key = `${l.id}|${l.vtype}|${l.stops.map(st => st.bid).join(',')}|${s.edges.length}|${s.edges[s.edges.length - 1]?.id ?? 0}|${s.nodes.length}`;
    let legs = this.legCache.get(key);
    if (!legs) {
      legs = [];
      const n = l.stops.length;
      for (let i = 0; i < n && n >= 2; i++) {
        const a = s.buildings.find(b => b.id === l.stops[i].bid), b = s.buildings.find(b => b.id === l.stops[(i + 1) % n].bid);
        if (!a || !b) { legs.push([]); continue; }
        // barge : itinéraire par le fleuve ; sinon par la route
        const p = VEH[l.vtype].water ? this.geo.riverPath(a.x, a.y, b.x, b.y) : a.node !== null && b.node !== null ? findPath(s, a.node, b.node) : null;
        legs.push(p ? p.pts : []);
      }
      if (this.legCache.size > 200) this.legCache.clear();
      this.legCache.set(key, legs);
    }
    return legs;
  }
  private drawLinePath(s: GameState, l: Line, strong: boolean, alpha = 1, glow = false) {
    const ctx = this.ctx, legs = this.legs(s, l), n = l.stops.length;
    this.screen();
    legs.forEach((pts, i) => {
      const ret = i === n - 1 && n >= 2; // retour vers le départ
      const a = s.buildings.find(b => b.id === l.stops[i].bid), b = s.buildings.find(b => b.id === l.stops[(i + 1) % n].bid);
      const sp = (pts.length ? pts : a && b ? [a, b] : []).map(p => this.cam.toScreen(p.x, p.y));
      if (sp.length < 2) return;
      const path = () => { ctx.beginPath(); sp.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.globalAlpha = (strong ? 1 : 0.75) * alpha;
      if (glow) { path(); ctx.strokeStyle = l.color; ctx.globalAlpha = 0.25; ctx.lineWidth = 18; ctx.stroke(); ctx.globalAlpha = 1; }
      if (!pts.length) ctx.setLineDash([6, 6]);           // pas d'itinéraire : tracé en pointillés
      else if (ret) ctx.setLineDash([2, 7]);              // trajet retour : pointillés fins
      path(); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = (ret ? 4 : strong ? 9 : 6); ctx.stroke();
      path(); ctx.strokeStyle = pts.length ? l.color : '#c92a2a'; ctx.lineWidth = (ret ? 2 : strong ? 5 : 3); ctx.stroke();
      ctx.setLineDash([]);
      // flèches indiquant le sens de circulation
      if (!ret) {
        let acc = 35;
        for (let k = 1; k < sp.length; k++) {
          const [x0, y0] = sp[k - 1], [x1, y1] = sp[k], L = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
          let d = acc;
          while (d < L) {
            const x = x0 + (x1 - x0) * d / L, y = y0 + (y1 - y0) * d / L, r = strong ? 6 : 4.5;
            ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
            ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.8, -r * 0.8); ctx.lineTo(-r * 0.3, 0); ctx.lineTo(-r * 0.8, r * 0.8); ctx.closePath();
            ctx.fillStyle = '#fff'; ctx.strokeStyle = l.color; ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke(); ctx.restore();
            d += 80;
          }
          acc = d - L;
        }
      }
      ctx.globalAlpha = 1;
    });
    this.world();
  }
  /** Pastilles des arrêts : numéro, « Départ », « Arrivée » et matériaux chargés */
  private drawLineBadges(s: GameState, l: Line) {
    const ctx = this.ctx, n = l.stops.length, S = this.iconSize();
    this.screen();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    l.stops.forEach((st, i) => {
      const b = s.buildings.find(x => x.id === st.bid); if (!b) return;
      const [x, y] = this.cam.toScreen(b.x, b.y), bx = x - S * 0.5, by = y - S * 0.5;
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2);
      ctx.fillStyle = l.color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.fillText(String(i + 1), bx, by + 0.5);
      const tag = n >= 2 && i === 0 ? 'Départ' : n >= 2 && i === n - 1 ? 'Arrivée' : '';
      const res = st.action === 'load' ? st.res : [];
      if (!tag && !res.length) return;
      // étiquette au-dessus du bâtiment
      ctx.font = '700 11px system-ui, sans-serif';
      const label = tag + (res.length ? (tag ? ' · ' : '') + 'charge : ' + res.map(r => RES[r].name).join(', ') : st.action === 'unload' && tag ? ' · décharge' : '');
      // départ au-dessus du bâtiment, arrivée en dessous : les étiquettes ne se chevauchent pas
      const w = ctx.measureText(label).width + 16 + res.length * 12, h = 20;
      const lx = Math.max(4, Math.min(this.cam.w - w - 4, x - w / 2));
      const ly = n >= 2 && i === n - 1 && i > 0 ? y + S * 0.5 + 18 : by - 30;
      ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.strokeStyle = l.color; ctx.lineWidth = 2;
      roundRect(ctx, lx, ly, w, h, 10); ctx.fill(); ctx.stroke();
      let cx = lx + 8;
      for (const r of res) { ctx.fillStyle = RES[r].color; ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.fillRect(cx, ly + 6, 8, 8); ctx.strokeRect(cx, ly + 6, 8, 8); cx += 12; }
      ctx.fillStyle = '#2b2118'; ctx.textAlign = 'left'; ctx.fillText(label, cx, ly + h / 2 + 0.5); ctx.textAlign = 'center';
    });
    ctx.textBaseline = 'alphabetic';
    this.world();
  }
  iconSize() { return Math.min(56, Math.max(24, this.cam.scale * 7)); }
  private drawBuildings(s: GameState, v: View, time: number) {
    const ctx = this.ctx; this.screen();
    const S = this.iconSize();
    ctx.textAlign = 'center';
    for (const b of s.buildings) {
      const [x, y] = this.cam.toScreen(b.x, b.y);
      if (x < -S || y < -S || x > this.cam.w + S || y > this.cam.h + S) continue;
      const size = b.city ? S * (1 + Math.min(0.6, (b.city.tier) * 0.2)) : b.type === 'pont_du_gard' ? S * 1.3 : S;
      const sel = v.selected?.kind === 'building' && v.selected.id === b.id;
      if (sel) { ctx.beginPath(); ctx.arc(x, y, size * 0.72, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,200,0,.45)'; ctx.fill(); }
      ctx.globalAlpha = b.built ? 1 : 0.5;
      ctx.drawImage(BICON[b.type], x - size / 2, y - size / 2, size, size);
      ctx.globalAlpha = 1;
      if (!b.built || b.upgrading) {
        const left = Object.values(b.need).reduce((a, q) => a + (q ?? 0), 0);
        const total = Object.values(BUILD[b.type].cost).reduce((a, q) => a + (q ?? 0), 0) || 1;
        const p = left > 0 ? 0.5 * (1 - Math.min(1, left / total)) : 0.5 + 0.5 * Math.min(1, b.work / Math.max(1, BUILD[b.type].days));
        ctx.beginPath(); ctx.arc(x, y, size * 0.6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
        ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 3; ctx.stroke();
        // marques de chantier
        ctx.fillStyle = '#f08c00'; ctx.beginPath(); ctx.arc(x + size * 0.42, y - size * 0.42, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui'; ctx.fillText('⚒', x + size * 0.42, y - size * 0.42 + 3);
      } else if (v.status) {
        // pastille d'alerte : orange (attention), rouge (bloqué), clignotante
        const lv = v.status(b).level;
        if ((lv === 'warn' || lv === 'bad') && (lv === 'bad' || Math.floor(time / 700) % 2)) {
          const px = x + size * 0.42, py = y - size * 0.42;
          ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fillStyle = lv === 'bad' ? '#d92d20' : '#f08c00'; ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.fillText('!', px, py + 4);
        }
      }
      if (b.node === null && b.type !== 'poste' && b.type !== 'pont_du_gard') {
        // non relié par la route
        const px = x - size * 0.42, py = y - size * 0.42;
        ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fillStyle = '#868e96'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px - 3, py + 3); ctx.lineTo(px + 3, py - 3); ctx.stroke();
      }
      // jauge de stock sous l'icône (production ou entrepôt) quand on zoome
      const d = BUILD[b.type];
      if (b.built && this.cam.scale > 2 && (d.recipe || b.type === 'entrepot')) {
        let fill = 0, col = '#8a7a5c';
        if (d.recipe) { const r = Object.keys(d.recipe.out)[0] as ResId; fill = (b.stock[r] ?? 0) / (d.storage * b.level); col = RES[r].color; }
        else fill = Object.values(b.stock).reduce((a, q) => a + (q ?? 0), 0) / (d.storage * b.level);
        const gw = size * 0.8, gx = x - gw / 2, gy = y + size / 2 + 1;
        ctx.fillStyle = 'rgba(255,255,255,.92)'; roundRect(ctx, gx - 1.5, gy - 1.5, gw + 3, 8, 4); ctx.fill();
        ctx.fillStyle = fill >= 0.95 ? '#d92d20' : col; roundRect(ctx, gx, gy, Math.max(3, gw * Math.min(1, fill)), 5, 2.5); ctx.fill();
      }
      const label = b.city ? `${b.name} · ${Math.round(b.city.pop)} hab.` : b.partner ? b.name : this.cam.scale > 2.5 ? b.name : '';
      if (label) { ctx.font = b.city || b.partner ? '700 12px system-ui, sans-serif' : '11px system-ui, sans-serif'; halo(ctx, label, x, y + size / 2 + (b.built && this.cam.scale > 2 && (BUILD[b.type].recipe || b.type === 'entrepot') ? 18 : 12), b.partner ? '#7a1f2b' : '#1f1a14'); }
    }
    this.world();
  }
  private drawVehicles(s: GameState, v: View) {
    const ctx = this.ctx; this.screen();
    const S = Math.min(34, Math.max(16, this.cam.scale * 4));
    for (const veh of s.vehicles) {
      if (veh.at !== null && veh.state !== 'go') continue; // à quai, caché sous le bâtiment
      const [x, y] = this.cam.toScreen(veh.x, veh.y);
      if (x < -S || y < -S || x > this.cam.w + S || y > this.cam.h + S) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(veh.angle);
      if (v.selected?.kind === 'vehicle' && v.selected.id === veh.id) { ctx.beginPath(); ctx.arc(0, 0, S * 0.7, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,200,0,.6)'; ctx.fill(); }
      ctx.drawImage(VICON[veh.type], -S / 2, -S / 2, S, S);
      ctx.restore();
      // pastilles de chargement : une par matériau transporté
      const load = (Object.entries(veh.cargo) as [ResId, number][]).filter(([, q]) => q > 0);
      if (load.length && this.cam.scale > 1.5) {
        load.forEach(([r], k) => {
          ctx.fillStyle = RES[r].color; ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x + (k - (load.length - 1) / 2) * 9, y - S * 0.55, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        });
      }
    }
    this.world();
  }
  private drawDraft(v: View) {
    const d = v.draft; if (!d) return;
    const ctx = this.ctx;
    if (d.pts.length) {
      ctx.beginPath(); d.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = this.px(4); ctx.stroke();
      if (d.cursor) {
        const l = d.pts[d.pts.length - 1];
        ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(d.cursor.x, d.cursor.y);
        ctx.setLineDash([this.px(6), this.px(4)]); ctx.strokeStyle = d.valid ? '#e8590c' : '#c92a2a'; ctx.lineWidth = this.px(3); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle = '#e8590c';
      for (const p of d.pts) { ctx.beginPath(); ctx.arc(p.x, p.y, this.px(4), 0, Math.PI * 2); ctx.fill(); }
    }
    // point d'accroche sous le curseur : bâtiment, carrefour ou route existante
    if (d.cursor && d.snap) {
      ctx.beginPath(); ctx.arc(d.cursor.x, d.cursor.y, this.px(d.snap === 'building' ? 13 : 8), 0, Math.PI * 2);
      ctx.fillStyle = d.snap === 'edge' ? 'rgba(25,113,194,.25)' : 'rgba(47,158,68,.25)'; ctx.fill();
      ctx.strokeStyle = d.snap === 'edge' ? '#1971c2' : '#2f9e44'; ctx.lineWidth = this.px(2.5); ctx.stroke();
      if (d.snap === 'edge') {
        this.screen(); const [sx, sy] = this.cam.toScreen(d.cursor.x, d.cursor.y);
        ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'center'; halo(ctx, 'carrefour', sx, sy - 14, '#1971c2'); this.world();
      }
    }
  }
  private drawGhost(s: GameState, v: View) {
    const g = v.ghost; if (!g) return;
    const ctx = this.ctx; this.screen();
    const [x, y] = this.cam.toScreen(g.x, g.y), S = this.iconSize();
    if (g.type === 'village') {
      ctx.beginPath(); ctx.arc(x, y, WORK_RANGE * this.cam.scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(214,120,40,.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(190,100,30,.6)'; ctx.stroke();
    }
    ctx.globalAlpha = 0.75; ctx.drawImage(BICON[g.type], x - S / 2, y - S / 2, S, S); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(x, y, S * 0.65, 0, Math.PI * 2); ctx.strokeStyle = g.ok ? '#2f9e44' : '#e03131'; ctx.lineWidth = 3; ctx.stroke();
    void s; this.world();
  }

  /** Objet sous le pointeur (coordonnées écran) */
  pick(s: GameState, sx: number, sy: number): View['selected'] {
    const S = this.iconSize();
    for (const veh of s.vehicles) {
      if (veh.at !== null && veh.state !== 'go') continue;
      const [x, y] = this.cam.toScreen(veh.x, veh.y);
      if (Math.hypot(x - sx, y - sy) < 12) return { kind: 'vehicle', id: veh.id };
    }
    let best: Building | null = null, bd = S * 0.6;
    for (const b of s.buildings) { const [x, y] = this.cam.toScreen(b.x, b.y), d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; best = b; } }
    if (best) return { kind: 'building', id: best.id };
    const e = this.pickEdge(s, sx, sy);
    return e !== null ? { kind: 'edge', id: e } : null;
  }
  pickEdge(s: GameState, sx: number, sy: number) {
    const nodes = new Map(s.nodes.map(n => [n.id, n]));
    let best: number | null = null, bd = 9;
    for (const e of s.edges) {
      const a = nodes.get(e.a), b = nodes.get(e.b); if (!a || !b) continue;
      const [ax, ay] = this.cam.toScreen(a.x, a.y), [bx, by] = this.cam.toScreen(b.x, b.y);
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((sx - ax) * dx + (sy - ay) * dy) / L2));
      const d = Math.hypot(ax + dx * t - sx, ay + dy * t - sy);
      if (d < bd) { bd = d; best = e.id; }
    }
    return best;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function halo(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, col: string) {
  ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.strokeText(t, x, y);
  ctx.fillStyle = col; ctx.fillText(t, x, y);
}

export const ROAD_LABEL = (t: keyof typeof ROADS) => ROADS[t].name;
