// Rendu de la carte sur un canvas (coordonnées monde en km).
import { BUILD, PLAYER_COLOR, RES, ROADS, VEH, WATER_RANGE, type BType, type ResId } from './defs';
import type { DepositKm, Geo } from './geo';
import { BICON, VICON } from './icons';
import { findPath } from './roads';
import { workRange } from './sim';
import { territoryRadius } from './rivals';
import { PLAYER, hostile, ownerColor, targetPos } from './war';
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
  layers: { deposits: boolean; water: boolean; workers: boolean; trade: boolean; territory?: boolean };
  depositFilter: ResId | 'all';
  selected: { kind: 'building' | 'vehicle' | 'edge' | 'rival' | 'army'; id: number } | null;
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
    if (v.layers.territory !== false) this.drawTerritories(s);
    this.drawRivals(s, v);
    this.drawRoads(s, v);
    const ids = v.hoverLine !== null && !v.showLines.includes(v.hoverLine) ? [...v.showLines, v.hoverLine] : v.showLines;
    const lines = ids.map(id => s.lines.find(l => l.id === id)).filter(Boolean) as Line[];
    const hl = v.hoverLine !== null ? lines.find(l => l.id === v.hoverLine) : undefined;
    // ligne survolée : les autres s'estompent, elle passe au premier plan
    for (const l of lines) if (l !== hl) this.drawLinePath(s, l, !hl && (v.selectedLine === l.id || lines.length === 1), hl ? 0.18 : 1);
    if (hl) this.drawLinePath(s, hl, true, 1, true);
    this.drawSeaRoutes(s, v);
    this.drawWonder(s, v);
    this.drawBuildings(s, v, time);
    this.drawVehicles(s, v);
    this.drawArmies(s, v);
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
      ctx.beginPath(); ctx.arc(b.x, b.y, workRange(b, s), 0, Math.PI * 2);
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
    const style = (window as unknown as { __depStyle?: number }).__depStyle ?? 0;
    if (style) { this.drawDepositsStyled(shown, style); }
    else for (const d of shown) {
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
  /** Contour irrégulier d'un gisement (bruit déterministe propre à chaque gisement) */
  private blob(d: DepositKm, k = 1, n = 72) {
    const rnd = mulberry(d.id * 7919 + 13), p1 = rnd() * 6.28, p2 = rnd() * 6.28, p3 = rnd() * 6.28, p4 = rnd() * 6.28;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const r = k * (1 + 0.16 * Math.sin(3 * a + p1) + 0.09 * Math.sin(5 * a + p2) + 0.05 * Math.sin(9 * a + p3) + 0.03 * Math.sin(15 * a + p4));
      pts.push([d.x + Math.cos(a) * d.rx * r, d.y + Math.sin(a) * d.ry * r]);
    }
    return pts;
  }
  private blobPath(pts: [number, number][]) { const ctx = this.ctx; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }
  /** Propositions de rendu des gisements (maquettes) */
  private drawDepositsStyled(shown: DepositKm[], style: number) {
    const ctx = this.ctx, px = (v: number) => this.px(v);
    for (const d of shown) {
      const col = RES[d.res].color, dark = shade(col, -0.35), rnd = mulberry(d.id * 31 + 7);
      if (style === 1) {
        // A. teinte du relief : couleur « multipliée » sur le relief, bords fondus
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = `blur(${Math.max(2, px(9))}px)`;
        for (const [k, a] of [[1, 0.22], [0.75, 0.2], [0.45, 0.18]] as [number, number][]) { this.blobPath(this.blob(d, k)); ctx.globalAlpha = a * (0.8 + 0.25 * d.rich); ctx.fillStyle = col; ctx.fill(); }
        ctx.restore();
      } else if (style === 2) {
        // B. texture naturelle : motif propre à la ressource, fondu sur les bords
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = `blur(${Math.max(2, px(7))}px)`;
        this.blobPath(this.blob(d, 1)); ctx.globalAlpha = 0.16; ctx.fillStyle = col; ctx.fill(); ctx.restore();
        ctx.save(); this.blobPath(this.blob(d, 0.97)); ctx.clip();
        const area = d.rx * d.ry, n = Math.min(900, Math.round(area / 6 * (0.6 + 0.4 * d.rich)));
        for (let i = 0; i < n; i++) {
          const a = rnd() * 6.283, r = Math.sqrt(rnd()), x = d.x + Math.cos(a) * d.rx * r * 1.15, y = d.y + Math.sin(a) * d.ry * r * 1.15;
          const edge = 1 - r * r; ctx.globalAlpha = 0.15 + 0.5 * edge;
          this.motif(d.res, x, y, rnd, col, dark);
        }
        ctx.restore();
      } else if (style === 3) {
        // C. aquarelle : plusieurs lavis décalés et un liseré irrégulier
        ctx.save(); ctx.globalCompositeOperation = 'multiply';
        for (let i = 0; i < 4; i++) {
          const dx = (rnd() - 0.5) * d.rx * 0.25, dy = (rnd() - 0.5) * d.ry * 0.25, k = 0.65 + rnd() * 0.4;
          const pts = this.blob({ ...d, id: d.id * 10 + i, x: d.x + dx, y: d.y + dy }, k);
          ctx.filter = `blur(${Math.max(1, px(3))}px)`; this.blobPath(pts); ctx.globalAlpha = 0.13; ctx.fillStyle = col; ctx.fill();
        }
        ctx.filter = `blur(${Math.max(0.5, px(1.2))}px)`; this.blobPath(this.blob(d, 1.02)); ctx.globalAlpha = 0.45; ctx.strokeStyle = dark; ctx.lineWidth = px(2.2); ctx.stroke();
        ctx.restore();
      } else if (style === 4) {
        // D. carte ancienne : symboles semés, teinte très légère
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = `blur(${Math.max(2, px(8))}px)`;
        this.blobPath(this.blob(d, 1)); ctx.globalAlpha = 0.12; ctx.fillStyle = col; ctx.fill(); ctx.restore();
        ctx.save(); this.blobPath(this.blob(d, 0.95)); ctx.clip();
        const step = Math.max(2.2, 9 / Math.max(0.6, this.cam.scale)) * 1.6;
        for (let gx = d.x - d.rx * 1.2; gx < d.x + d.rx * 1.2; gx += step) for (let gy = d.y - d.ry * 1.2; gy < d.y + d.ry * 1.2; gy += step * 0.87) {
          const x = gx + (rnd() - 0.5) * step * 0.8 + ((Math.round(gy / step) % 2) ? step / 2 : 0), y = gy + (rnd() - 0.5) * step * 0.6;
          const q = ((x - d.x) / d.rx) ** 2 + ((y - d.y) / d.ry) ** 2; if (q > 1.2) continue;
          ctx.globalAlpha = 0.85 * (1 - Math.min(1, q) * 0.6);
          this.symbol(d.res, x, y, step * 0.42, col, dark);
        }
        ctx.restore();
      }
    }
  }
  /** Petits motifs de texture (proposition B) */
  private motif(res: ResId, x: number, y: number, rnd: () => number, col: string, dark: string) {
    const ctx = this.ctx, s = this.px(2.2);
    if (res === 'bois') { ctx.beginPath(); ctx.arc(x, y, s * (0.8 + rnd()), 0, 6.283); ctx.fillStyle = rnd() < 0.5 ? col : dark; ctx.fill(); }
    else if (res === 'cereales') { ctx.beginPath(); ctx.moveTo(x - s * 2, y); ctx.lineTo(x + s * 2, y - s * 0.6); ctx.strokeStyle = dark; ctx.lineWidth = s * 0.5; ctx.stroke(); }
    else if (res === 'pierre' || res === 'calcaire' || res === 'marbre') { ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.6); ctx.lineTo(x - s * 0.2, y - s); ctx.lineTo(x + s, y - s * 0.2); ctx.lineTo(x + s * 0.6, y + s * 0.8); ctx.closePath(); ctx.fillStyle = rnd() < 0.5 ? col : dark; ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(x, y, s * 0.55, 0, 6.283); ctx.fillStyle = dark; ctx.fill(); }
  }
  /** Symboles de carte ancienne (proposition D) */
  private symbol(res: ResId, x: number, y: number, r: number, col: string, dark: string) {
    const ctx = this.ctx;
    ctx.lineWidth = Math.max(this.px(1), r * 0.12); ctx.strokeStyle = dark; ctx.fillStyle = col;
    if (res === 'bois') { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.6, y + r * 0.35); ctx.lineTo(x - r * 0.6, y + r * 0.35); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y + r * 0.35); ctx.lineTo(x, y + r * 0.75); ctx.stroke(); }
    else if (res === 'cereales') { ctx.beginPath(); ctx.moveTo(x, y + r * 0.7); ctx.lineTo(x, y - r * 0.7); ctx.moveTo(x, y - r * 0.2); ctx.lineTo(x - r * 0.35, y - r * 0.55); ctx.moveTo(x, y - r * 0.2); ctx.lineTo(x + r * 0.35, y - r * 0.55); ctx.moveTo(x, y + r * 0.2); ctx.lineTo(x - r * 0.35, y - r * 0.15); ctx.moveTo(x, y + r * 0.2); ctx.lineTo(x + r * 0.35, y - r * 0.15); ctx.stroke(); }
    else if (res === 'pierre' || res === 'calcaire' || res === 'marbre') { ctx.beginPath(); ctx.moveTo(x - r * 0.7, y + r * 0.5); ctx.lineTo(x - r * 0.2, y - r * 0.5); ctx.lineTo(x + r * 0.2, y - r * 0.1); ctx.lineTo(x + r * 0.45, y - r * 0.6); ctx.lineTo(x + r * 0.8, y + r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (res === 'vin') { for (const [dx, dy] of [[-0.3, -0.3], [0.3, -0.3], [0, 0.15], [-0.15, 0.55], [0.15, 0.55]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, r * 0.22, 0, 6.283); ctx.fill(); ctx.stroke(); } }
    else { ctx.beginPath(); ctx.moveTo(x - r * 0.6, y + r * 0.4); ctx.lineTo(x, y - r * 0.5); ctx.lineTo(x + r * 0.6, y + r * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  /** Port de commerce sélectionné : routes maritimes vers ses partenaires */
  /** Merveille sélectionnée (ou en projet) : rayons d'effet */
  private drawWonder(s: GameState, v: View) {
    // merveille ou bâtiment à effet sélectionné : rayons d'effet
    const sel = v.selected?.kind === 'building' ? s.buildings.find(x => x.id === v.selected!.id) : undefined;
    if (!sel) return;
    const d = BUILD[sel.type], w = d.wonder, e = d.effect;
    const rings: [number, string, string, string][] = [];
    if (w) {
      const fx = [d.waterRange ? 'eau' : '', w.needMult < 1 ? `consommation −${Math.round((1 - w.needMult) * 100)} %` : '', w.growth ? `croissance +${Math.round((w.growth - 1) * 100)} %` : ''].filter(Boolean).join(', ');
      rings.push([w.range, 'rgba(12,124,140,.07)', 'rgba(12,124,140,.8)', `${fx} (${w.range} km)`]);
      if (w.prodRange && w.prodMult > 1) rings.push([w.prodRange, 'rgba(217,72,15,.10)', 'rgba(217,72,15,.85)', `Carrières et bûcherons +${Math.round((w.prodMult - 1) * 100)} % (${w.prodRange} km)`]);
    } else if (e) {
      if (e.protect) rings.push([e.protect, 'rgba(90,90,110,.10)', 'rgba(60,60,80,.85)', `Protégé des invasions (${e.protect} km)`]);
      if (e.growth) rings.push([e.range ?? 8, 'rgba(12,124,140,.07)', 'rgba(12,124,140,.8)', `Croissance +${Math.round((e.growth - 1) * 100)} % (${e.range ?? 8} km)`]);
      if (e.speed) rings.push([e.range ?? 30, 'rgba(217,72,15,.08)', 'rgba(217,72,15,.8)', `Véhicules +${Math.round((e.speed - 1) * 100)} % (${e.range ?? 30} km)`]);
    }
    if (!rings.length) return;
    const ctx = this.ctx;
    for (const [r, fill, stroke] of rings) {
      ctx.beginPath(); ctx.arc(sel.x, sel.y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
      ctx.setLineDash([this.px(7), this.px(5)]); ctx.strokeStyle = stroke; ctx.lineWidth = this.px(2); ctx.stroke(); ctx.setLineDash([]);
    }
    this.screen();
    ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const [r, , stroke, label] of rings) { const [sx, sy] = this.cam.toScreen(sel.x, sel.y - r); halo(ctx, label.charAt(0).toUpperCase() + label.slice(1), sx, sy - 6, stroke.replace(/,\.\d+\)/, ',1)')); }
    this.world();
  }
  private drawSeaRoutes(s: GameState, v: View) {
    // port de commerce sélectionné : routes maritimes réelles vers les comptoirs de sa mer
    const sel = v.selected?.kind === 'building' ? s.buildings.find(x => x.id === v.selected!.id) : undefined;
    if (!sel || sel.type !== 'port_mer' || !sel.sea || !sel.built) return;
    const ctx = this.ctx;
    for (const c of s.buildings) {
      if (c.type !== 'comptoir' || c.sea !== sel.sea) continue;
      const p = this.geo.seaPath(sel.x, sel.y, c.x, c.y); if (!p) continue;
      ctx.beginPath(); p.pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y));
      ctx.setLineDash([this.px(8), this.px(6)]); ctx.strokeStyle = 'rgba(25,80,140,.8)'; ctx.lineWidth = this.px(2.5); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  /** Sites historiques des monuments de l'époque (Pont du Gard, Arènes de Nîmes…) */
  private drawGardSite(s: GameState) {
    const ctx = this.ctx;
    for (const t of Object.keys(BUILD) as BType[]) {
      const d = BUILD[t];
      if (!d.site || d.era > s.era || s.buildings.some(b => b.type === t)) continue;
      const [x, y] = this.geo.proj(d.site[0], d.site[1]);
      ctx.beginPath(); ctx.arc(x, y, Math.max(3, this.px(14)), 0, Math.PI * 2);
      ctx.setLineDash([this.px(3), this.px(3)]); ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = this.px(2); ctx.stroke(); ctx.setLineDash([]);
      if (this.cam.scale > 0.9) {
        this.screen(); const [sx, sy] = this.cam.toScreen(x, y);
        ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
        halo(ctx, `Site : ${d.name}`, sx, sy - 18, '#6b4500'); this.world();
      }
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
        const p = VEH[l.vtype].sea ? this.geo.seaPath(a.x, a.y, b.x, b.y) : VEH[l.vtype].water ? this.geo.riverPath(a.x, a.y, b.x, b.y) : a.node !== null && b.node !== null ? findPath(s, a.node, b.node) : null;
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
  /** Territoires : zones d'influence du joueur et des rivaux (contour des cercles réunis) */
  private drawTerritories(s: GameState) {
    if (!s.factions?.length) return;
    const ctx = this.ctx;
    const zones: { color: string; c: [number, number, number][] }[] = [
      { color: PLAYER_COLOR, c: s.buildings.filter(b => !b.partner && b.type !== 'comptoir').map(b => [b.x, b.y, b.city ? 18 + 8 * b.city.tier : 6] as [number, number, number]) },
      ...s.factions.map(f => ({ color: f.color, c: f.b.map(b => [b.x, b.y, territoryRadius(b)] as [number, number, number]) })),
    ];
    for (const z of zones) {
      if (!z.c.length) continue;
      ctx.beginPath();
      for (const [x, y, r] of z.c) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
      ctx.globalAlpha = 0.09; ctx.fillStyle = z.color; ctx.fill('nonzero'); ctx.globalAlpha = 1;
      // contour extérieur seulement : on ne trace que les arcs hors des autres cercles
      ctx.beginPath();
      for (const [x, y, r] of z.c) {
        let pen = false;
        for (let k = 0; k <= 72; k++) {
          const a = k / 72 * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
          const inside = z.c.some(([ox, oy, or]) => (ox !== x || oy !== y) && Math.hypot(px - ox, py - oy) < or - 0.01);
          if (inside) { pen = false; continue; }
          if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
        }
      }
      ctx.setLineDash([this.px(6), this.px(4)]); ctx.strokeStyle = z.color; ctx.globalAlpha = 0.7; ctx.lineWidth = this.px(1.8); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
  }
  /** Armées : pastille aux couleurs du camp, effectif et barre de vie ; trajet vers la cible */
  private drawArmies(s: GameState, v: View) {
    const list = s.armies ?? []; if (!list.length) return;
    const ctx = this.ctx;
    for (const a of list) {
      const p = targetPos(s, a.target ?? null);
      if (!p || (a.owner !== PLAYER && !(v.selected?.kind === 'army' && v.selected.id === a.id) && !hostile(s, a.owner, PLAYER))) continue;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y);
      ctx.setLineDash([this.px(6), this.px(5)]); ctx.strokeStyle = ownerColor(s, a.owner); ctx.lineWidth = this.px(2); ctx.globalAlpha = 0.8; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    this.screen();
    for (const a of list) {
      const [x, y] = this.cam.toScreen(a.x, a.y), col = ownerColor(s, a.owner), sel = v.selected?.kind === 'army' && v.selected.id === a.id;
      const r = 12 + Math.min(6, a.men / 60);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = sel ? 3.5 : 2; ctx.strokeStyle = sel ? '#ffd43b' : '#fff'; ctx.stroke();
      // aigle stylisé : deux épées croisées
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(x - r * 0.45, y - r * 0.45); ctx.lineTo(x + r * 0.45, y + r * 0.45); ctx.moveTo(x + r * 0.45, y - r * 0.45); ctx.lineTo(x - r * 0.45, y + r * 0.45); ctx.stroke();
      if (a.state === 'fight' || a.state === 'siege') { ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.strokeStyle = '#e03131'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); }
      ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      halo(ctx, `${Math.round(a.men)} hommes`, x, y - r - 6, col);
      const w = 30, hp = Math.max(0, Math.min(1, a.hp / 100));
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - w / 2, y + r + 4, w, 5);
      ctx.fillStyle = hp > 0.6 ? '#40c057' : hp > 0.3 ? '#fab005' : '#fa5252'; ctx.fillRect(x - w / 2, y + r + 4, w * hp, 5);
    }
    this.world();
  }
  /** Rivaux : routes, villes et ateliers à leurs couleurs */
  private drawRivals(s: GameState, v: View) {
    if (!s.factions?.length) return;
    const ctx = this.ctx, S = this.iconSize() * 0.82;
    for (const f of s.factions) {
      ctx.beginPath();
      for (const [ax, ay, bx, by] of f.roads) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
      ctx.strokeStyle = f.color; ctx.globalAlpha = 0.55; ctx.lineWidth = this.px(2.2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    this.screen();
    for (const f of s.factions) for (const b of f.b) {
      const [x, y] = this.cam.toScreen(b.x, b.y);
      if (x < -60 || y < -60 || x > this.cam.w + 60 || y > this.cam.h + 60) continue;
      const size = b.type === 'village' ? S * (1 + Math.min(0.6, (b.tier ?? 0) * 0.2)) : S;
      const sel = v.selected?.kind === 'rival' && v.selected.id === b.id;
      ctx.beginPath(); ctx.arc(x, y, size * 0.56, 0, Math.PI * 2); ctx.fillStyle = f.color; ctx.globalAlpha = sel ? 0.9 : 0.75; ctx.fill(); ctx.globalAlpha = 1;
      if (sel) { ctx.lineWidth = 3; ctx.strokeStyle = '#ffd43b'; ctx.stroke(); }
      ctx.drawImage(BICON[b.type], x - size * 0.45, y - size * 0.45, size * 0.9, size * 0.9);
      // vue d'ensemble : seulement les capitales ; en zoomant, toutes les villes puis les ateliers
      const capital = b === f.b[0], far = this.cam.scale < 1.1;
      const label = b.type === 'village' ? (far ? (capital ? `${b.name} (${f.short})` : '') : `${b.name} · ${Math.round(b.pop ?? 0)} hab.`) : this.cam.scale > 2.5 ? b.name : '';
      if (label) { ctx.font = b.type === 'village' ? '700 12px system-ui, sans-serif' : '11px system-ui, sans-serif'; ctx.textAlign = 'center'; halo(ctx, label, x, y + size / 2 + 12, f.color); }
      if (b.type === 'village' && !far && capital) { ctx.font = '600 10px system-ui, sans-serif'; ctx.textAlign = 'center'; halo(ctx, f.short, x, y - size / 2 - 6, f.color); }
    }
    this.world();
  }
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
      ctx.globalAlpha = (b.built ? 1 : 0.5) * (b.paused ? 0.65 : 1);
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
      if (b.paused) {
        // bâtiment ou chantier en pause : pastille « pause » sur l'icône
        const px = x + size * 0.36, py = y + size * 0.36, r = Math.max(8, size * 0.2);
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fillStyle = '#343a40'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; const bw = r * 0.28, bh = r * 0.95;
        ctx.fillRect(px - bw * 1.6, py - bh / 2, bw, bh); ctx.fillRect(px + bw * 0.6, py - bh / 2, bw, bh);
      }
      if (b.node === null && b.type !== 'poste' && b.type !== 'comptoir' && b.type !== 'pont_du_gard') {
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
      const foreign = !!b.partner || b.type === 'comptoir';
      const label = b.city ? `${b.name} · ${Math.round(b.city.pop)} hab.` : foreign ? b.name : this.cam.scale > 2.5 ? b.name : '';
      if (label) { ctx.font = b.city || foreign ? '700 12px system-ui, sans-serif' : '11px system-ui, sans-serif'; halo(ctx, label, x, y + size / 2 + (b.built && this.cam.scale > 2 && (BUILD[b.type].recipe || b.type === 'entrepot') ? 18 : 12), b.type === 'comptoir' ? '#14406e' : b.partner ? '#7a1f2b' : '#1f1a14'); }
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
      ctx.beginPath(); ctx.arc(x, y, workRange({ city: { tier: 0 } } as Building, s) * this.cam.scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(214,120,40,.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(190,100,30,.6)'; ctx.stroke();
    }
    ctx.globalAlpha = 0.75; ctx.drawImage(BICON[g.type], x - S / 2, y - S / 2, S, S); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(x, y, S * 0.65, 0, Math.PI * 2); ctx.strokeStyle = g.ok ? '#2f9e44' : '#e03131'; ctx.lineWidth = 3; ctx.stroke();
    void s; this.world();
  }

  /** Objet sous le pointeur (coordonnées écran) */
  pick(s: GameState, sx: number, sy: number): View['selected'] {
    const S = this.iconSize();
    for (const a of s.armies ?? []) { const [x, y] = this.cam.toScreen(a.x, a.y); if (Math.hypot(x - sx, y - sy) < 16) return { kind: 'army', id: a.id }; }
    for (const veh of s.vehicles) {
      if (veh.at !== null && veh.state !== 'go') continue;
      const [x, y] = this.cam.toScreen(veh.x, veh.y);
      if (Math.hypot(x - sx, y - sy) < 12) return { kind: 'vehicle', id: veh.id };
    }
    let best: Building | null = null, bd = S * 0.6;
    for (const b of s.buildings) { const [x, y] = this.cam.toScreen(b.x, b.y), d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; best = b; } }
    if (best) return { kind: 'building', id: best.id };
    // bâtiments des rivaux
    let rb: number | null = null; bd = S * 0.6;
    for (const f of s.factions ?? []) for (const b of f.b) { const [x, y] = this.cam.toScreen(b.x, b.y), d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; rb = b.id; } }
    if (rb !== null) return { kind: 'rival', id: rb };
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

/** Générateur pseudo-aléatoire déterministe */
function mulberry(a: number) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/** Couleur assombrie (k < 0) ou éclaircie (k > 0) */
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16), f = (c: number) => Math.round(Math.max(0, Math.min(255, k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
