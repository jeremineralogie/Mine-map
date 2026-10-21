// Interface : outils, panneaux, gestes (souris et tactile), sauvegarde.
import { CHARACTERS, DIFFICULTY, PLAYER_COLOR, RIVALS, type Difficulty, RP_TIER,
  BRANCHES, BUILD, ERAS, LEVEL_MONEY, START_YEAR, LEVEL_MULT, OBJECTIVES, PARTNERS, SEA_PARTNERS, RES, ROADS, ROAD_WEAR_SLOW, TECHS, TIERS, VEH, WORK_RANGE,
  type BType, type ResId, type RoadType, type VType,
} from './defs';
import type { Geo } from './geo';
import { BCAT, CATEGORY, bIconUrl, cityIconUrl, resImg, vIconUrl } from './icons';
import { IC, LABELS } from './uiicons';
import { Camera, DEP_COLOR, Renderer, type View } from './render';
import { factionPop, findRival, initRivals, playerPop } from './rivals';
import { rivalWorkRange } from './rivalai';
import { MERC, PLAYER, RECRUIT, declareWar, disband, hireMercs, hostile, ownerColor, ownerName, proposePeace, recruit, rivalGarrison, strength, targetPos, warAllowed } from './war';
import { SPY_COST, THRESHOLD, breakTreaty, buyFromRival, factionBuys, factionSells, giftMoney, giftRes, hasTavern, notePlayerBuild, propose, relLabel, relOf, rivalImportPrice, rivalPrice, rivalVolume, spy, storeTotal, tavernes, tradeFaction, linkedTraders, TRADE_LINK_KM } from './diplomacy';
import { addEdge, addNode, findPath, nodeById, firstCrossing, projectOnEdge, quoteSegment, removeEdge, splitEdge } from './roads';
import { cityShortages, tierGoods, chapterConditions, startEra, startRepair, repairCost, wonderProdMult, missingNextGoods, foodReserve, RESERVE_TO_GROW,
  DAYS_PER_SEC, Sim, activeMods, attachNode, buildMoney, buildingStatus, costMult, scaleStock, upgradeCost, workRange, seaPrice, seaImportPrice, seaVolume, buySea, buyImport, importPrice, isStore, localPrice, partnerClosed, partnerVolume, sellLocal, buyVehicle, checkPlace, cityNeeds, dateLabel, demolish, fmt, getB,
  hasTech, levelAllowed, relaisMult, newGame, place, priceAt, sellVehicle, startingCamp, suggestName, upgrade, year,
} from './sim';
import { SAVE_KEY, cargoTotal, migrate, type Building, type Edge, type GameState, type Line, type RNode, type Stock } from './state';

/** Point d'accroche d'une route : bâtiment, carrefour, milieu d'une route existante, ou terrain libre */
interface Snap { node: RNode | null; x: number; y: number; bid?: number; edge?: number; }

type Mode =
  | { kind: 'start' } | { kind: 'select' } | { kind: 'build'; type: BType } | { kind: 'road' }
  | { kind: 'demolish' } | { kind: 'pickStop'; line: number } | { kind: 'target'; army: number };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const LINE_COLORS = ['#e8590c', '#1971c2', '#2f9e44', '#9c36b5', '#c2255c', '#0c8599', '#f08c00', '#5c940d'];
/** Pictogramme d'une ressource : icône dessinée, ou pastille de couleur à défaut */
const resIcon = (r: ResId, cls = 'ri') => { const im = resImg(r); return im ? `<img class="${cls}" src="${im.src}" alt="">` : `<i class="${cls} sw" style="background:${RES[r].color}"></i>`; };
const resChip = (r: ResId, q?: number) => `<span class="res">${resIcon(r)}${RES[r].name}${q !== undefined ? ` <b>${fmt(q)}</b>` : ''}</span>`;
const cargoList = (c: Stock) => (Object.entries(c) as [ResId, number][]).filter(([, q]) => q >= 0.5).map(([r, q]) => resChip(r, q)).join(' ');
const costList = (c: Partial<Record<ResId, number>>) => (Object.entries(c) as [ResId, number][]).map(([r, q]) => resChip(r, q)).join(' ');

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
/** Consommation lisible : « 12,3 t/mois (environ 0,4 t/jour) » */
const perMonth = (q: number) => { const d = q / 30.44; return `${q.toFixed(1).replace('.', ',')} t/mois (${d >= 0.1 ? `environ ${d.toFixed(1).replace('.', ',')}` : 'moins de 0,1'} t/jour)`; };

export class Game {
  s!: GameState;
  sim!: Sim;
  cam = new Camera();
  ren: Renderer;
  mode: Mode = { kind: 'select' };
  speed = 1;
  view: View = {
    layers: { deposits: true, water: false, workers: false, trade: true }, depositFilter: 'all',
    selected: null, selectedLine: null, showLines: [], hoverLine: null, draft: null, ghost: null, hoverEdge: null,
  };
  roadType: RoadType = 'chemin';
  private roadFrom: Snap | null = null;
  private panel: (() => string) | null = null;
  private panelKey = '';
  private last = performance.now();
  private saveTimer = 0;

  constructor(public geo: Geo) {
    const canvas = $<HTMLCanvasElement>('map');
    this.ren = new Renderer(canvas, geo, this.cam);
    this.ren.resize();
    window.addEventListener('resize', () => this.ren.resize());
    this.bindInput(canvas);
    this.bindChrome();
    const saved = this.readSave();
    if (saved) this.load(saved);
    else this.fresh();
    requestAnimationFrame(t => this.frame(t));
    setInterval(() => this.refresh(), 400);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
  }

  // ---------- Partie ----------
  private notifier() {
    return {
      toast: (t: string, k?: 'info' | 'good' | 'bad') => { if (!this.ffwd) this.toast(t, k); },
      // pendant l'avance rapide, les événements sont résumés à la fin au lieu d'interrompre le jeu
      event: (title: string, text: string) => this.ffwd ? void this.ffwd.push(title) : this.modal(`<h2>${esc(title)}</h2><p>${esc(text)}</p>`, [{ label: 'Continuer', primary: true }]),
      ask: (title: string, text: string, yes: () => void) => { if (this.ffwd) { this.ffwd.push(title + ' (sans réponse)'); return; } this.modal(`<h2>${esc(title)}</h2><p>${esc(text)}</p>`, [{ label: 'Refuser' }, { label: 'Accepter', primary: true, fn: () => { yes(); this.toast('Accord conclu.', 'good'); } }]); },
      chapter: () => { if (this.ffwd) this.endFfwd(() => this.chapterModal()); else this.chapterModal(); },
      gameOver: (text?: string) => this.modal(`<h2>${text ? 'Défaite' : 'Faillite'}</h2><p>${text ?? 'Ta trésorerie est restée négative pendant 6 mois. Tes créanciers saisissent tes biens.'}</p>`, [{ label: 'Nouvelle partie', primary: true, fn: () => this.fresh() }]),
      choose: (title: string, text: string, options: { label: string; fn: () => void }[]) => this.modal(`<h2>${esc(title)}</h2><p>${esc(text)}</p>`, options.map((o, i) => ({ label: o.label, primary: i === 0, fn: o.fn }))),
    };
  }
  fresh() {
    this.s = newGame(this.geo);
    this.sim = new Sim(this.s, this.geo, this.notifier());
    this.centerOn(0, -20, Math.min(this.cam.w, this.cam.h) / 1150);
    this.setMode({ kind: 'start' });
    this.closePanel();
    this.modal(`<h2>Bienvenue dans Mine Map</h2>
      <p><b>50 av. J.-C.</b> César vient d'achever la conquête des Gaules. À toi de bâtir l'économie de la province : extraire les ressources, les transformer et les transporter.</p>
      <ol class="steps">
        <li>Choisis l'emplacement de ton <b>entrepôt de départ</b> (il contient du bois, de la pierre et des céréales).</li>
        <li>Fonde un <b>village</b> à proximité : il fournit la main-d'œuvre (rayon ${WORK_RANGE} km).</li>
        <li>Trace des <b>routes</b> : les charrettes de chantier livrent les matériaux depuis l'entrepôt.</li>
        <li>Construis carrières, camps de bûcherons et villas agricoles sur les <b>gisements</b> (calque coloré).</li>
        <li>Crée des <b>lignes</b> de charrettes pour transporter et vendre ta production aux villes et aux partenaires étrangers.</li>
      </ol>
      <h3>Tes rivaux</h3><p>Quatre grandes familles romaines développent aussi leurs cités : <b>${RIVALS.map(r => r.short).join(', ')}</b>. Elles se disputent les gisements et étendent leur territoire. Choisis leur ambition :</p>
      <ul class="intro">${(Object.keys(DIFFICULTY) as Difficulty[]).map(k => `<li><b>${DIFFICULTY[k].name}</b> — ${DIFFICULTY[k].desc}</li>`).join('')}</ul>
      <p class="muted">À vitesse ×1, une heure de jeu équivaut à dix ans. La partie est sauvegardée automatiquement dans ce navigateur.</p>`,
      (Object.keys(DIFFICULTY) as Difficulty[]).map(k => ({ label: DIFFICULTY[k].name, primary: k === 'equilibre', fn: () => { this.s.difficulty = k; } })));
  }
  load(s: GameState) {
    this.s = s = migrate(s);
    this.sim = new Sim(s, this.geo, this.notifier());
    if (s.chapterDone && (s.era === 1 || s.era === 2)) setTimeout(() => this.chapterModal(), 300);
    const camp = s.buildings.find(b => b.type === 'entrepot');
    if (camp) this.centerOn(camp.x, camp.y, 6); else this.centerOn(0, -20, Math.min(this.cam.w, this.cam.h) / 1150);
    this.setMode(camp ? { kind: 'select' } : { kind: 'start' });
  }
  /** Fin d'un chapitre : passage au suivant (ou attente du chapitre III) */
  chapterModal() {
    const s = this.s;
    if (s.era === 1) {
      this.modal(`<h2>Chapitre I terminé !</h2><p>Tu as posé les bases de l'économie de la province : tout l'arbre de recherche de l'Antiquité romaine est débloqué.</p>
        <p>Place au <b>chapitre II — ${ERAS[2]}</b> (jusqu'à la chute de Rome en 476) : l'âge d'or des villes romaines, puis la crise du IIIe siècle et les invasions.</p>`,
        [{ label: 'Commencer le chapitre II', primary: true, fn: () => { startEra(s, 2); this.save(); setTimeout(() => this.introEra2(), 50); } }]);
    } else if (s.era === 2) {
      this.modal(`<h2>Chapitre II terminé !</h2><p>Ta Gaule romaine a traversé l'âge d'or, la crise du IIIe siècle et les invasions. L'Empire d'Occident vit ses dernières années.</p>
        <p>Place au <b>chapitre III — ${ERAS[3]}</b> : Rome tombe, la province doit se reconstruire.</p>`,
        [{ label: 'Commencer le chapitre III', primary: true, fn: () => { startEra(s, 3); this.save(); setTimeout(() => this.introEra3(), 50); } }]);
    } else {
      this.modal(`<h2>Chapitre ${ROMAN[s.era]} terminé !</h2><p>La suite arrive dans une prochaine version. Tu peux continuer à développer ton économie en attendant.</p>`, [{ label: 'Continuer', primary: true }]);
    }
  }
  /** Ouverture du chapitre III : la chute de Rome */
  private introEra3() {
    const item = (t: string, d: string) => `<li><b>${t}</b> — ${d}</li>`;
    this.modal(`<h2>Chapitre III — ${ERAS[3]}</h2>
      <p>476 : le dernier empereur d'Occident est déposé. Sans Rome, la province se replie sur elle-même… avant de renaître autour des monastères, des châteaux et des foires.</p>
      <h3>La chute de Rome</h3><ul class="intro">
        ${item('Villes', 'elles perdent 30 % de leurs habitants')}
        ${item('Commerce d\'outre-mer', 'plus aucun navire pendant 50 ans ; les postes-frontières restent ouverts')}
        ${item('Routes', 'elles ne sont plus entretenues : une route s\'abîme peu à peu et ralentit les véhicules (jusqu\'à moitié). Un relais routier entretient et répare les routes à moins de 30 km')}</ul>
      ${this.s.factions?.length ? `<h3>Tes rivaux</h3><p>Les grandes familles romaines deviennent des maisons médiévales (duchés, comtés) quand elles entrent à leur tour dans le Moyen Âge.</p>` : ''}
      <p class="muted">Les nouvelles productions, les nouveaux paliers de villes et l'arbre de recherche du Moyen Âge arrivent dans une prochaine version.</p>`,
      [{ label: 'Continuer', primary: true }]);
  }
  /** Ouverture du chapitre II : résumé de ce qui se débloque */
  private introEra2() {
    const item = (t: string, d: string) => `<li><b>${t}</b> — ${d}</li>`;
    this.modal(`<h2>Chapitre II — ${ERAS[2]}</h2>
      <p>De l'an 1 à la chute de Rome en 476. Les villes romaines s'embellissent et le commerce s'étend à tout l'Empire… avant la crise du IIIe siècle et les invasions germaniques.</p>
      <h3>Nouvelles productions</h3><ul class="intro">
        ${item('Vin et huile d\'olive', 'vignobles sur les terroirs viticoles (Bourgogne, Rhône, Narbonnaise, Bordelais, Moselle), oliveraies en Provence et Languedoc seulement')}
        ${item('Poterie sigillée, verre, chaux', 'ateliers de potier (argile + bois), verreries sur le sable, fours à chaux sur le calcaire')}
        ${item('Marbre, cuivre, étain, bronze', 'carrières de marbre des Pyrénées, mines et fonderies de bronze')}
        ${item('Poisson, garum, laine, tissus', 'pêcheries sur la côte, saloirs, bergeries sur les pâturages, ateliers de tissage')}</ul>
      <h3>Villes</h3><ul class="intro">
        ${item('Trois nouveaux paliers', 'Cité (4 000 habitants) : poterie sigillée et vin · Métropole (8 000) : huile d\'olive, tissus et verre · Capitale (15 000, technologie Capitales provinciales) : bronze, garum et marbre')}
        ${item('Thermes, amphithéâtres, basiliques', 'croissance plus rapide et points de recherche')}
        ${item('Remparts', 'protègent des invasions les bâtiments à moins de 20 km et doublent la garnison de la ville')}
        ${this.s.factions?.length ? item('Caserne et guerre', 'tes rivaux peuvent désormais te déclarer la guerre : lève des légionnaires et des auxiliaires, engage des mercenaires à la taverne') : ''}</ul>
      <h3>Transport</h3><ul class="intro">
        ${item('Relais routiers', 'véhicules 25 % plus rapides autour d\'eux')}
        ${item('Carpentum, grande barge, oneraria', 'chariot couvert de 6 t (voies romaines), barge de 25 t, navire de 40 t')}</ul>
      <h3>Pour finir le chapitre</h3><ul class="intro">
        ${item('Arbre de recherche', '20 technologies, dont une nouvelle branche Culture et religion')}
        ${item('Arènes de Nîmes', 'la merveille du chapitre, à construire sur son site')}
        ${item('Date', 'atteindre 426 au moins (476, à 50 ans près) ; un bouton permet d\'avancer rapidement si tu es en avance')}</ul>
      <p class="muted">Les nouveaux gisements apparaissent sur la carte (calque Gisements). Attention : à partir de 235, la crise monétaire et les raids barbares frappent le nord-est.</p>`,
      [{ label: 'C\'est parti !', primary: true, fn: () => { this.view.layers.deposits = true; } }]);
  }
  /** Avance rapide jusqu'à la date de fin d'époque */
  ffwd: string[] | null = null;
  startFfwd() { if (!this.ffwd) { this.ffwd = []; this.closePanel(); this.toast('Avance rapide…'); } }
  endFfwd(after?: () => void) {
    if (!this.ffwd) return;
    const log = this.ffwd; this.ffwd = null;
    this.modal(`<h2>Avance rapide terminée</h2><p>Nous sommes en <b>${dateLabel(this.s)}</b>.</p>${log.length ? `<h3>Ce qui s'est passé</h3><ul class="intro">${log.map(t => `<li>${esc(t)}</li>`).join('')}</ul><p class="muted">Le détail est dans le journal (onglet Objectifs).</p>` : ''}`, [{ label: 'Continuer', primary: true, fn: after ? () => setTimeout(after, 50) : undefined }]);
  }
  centerOn(x: number, y: number, scale?: number) { this.cam.cx = x; this.cam.cy = y; if (scale) this.cam.scale = scale; }

  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.s)); } catch { /* stockage indisponible */ } }
  private readSave(): GameState | null {
    try { const t = localStorage.getItem(SAVE_KEY); return t ? JSON.parse(t) as GameState : null; } catch { return null; }
  }

  // ---------- Boucle ----------
  private frame(t: number) {
    const dt = Math.min(0.25, (t - this.last) / 1000); this.last = t;
    if (this.ffwd) {
      // avance rapide : autant de jours que possible en ~14 ms par image (une dizaine d'années par seconde)
      const end = chapterConditions(this.s).end, t0 = performance.now();
      for (let i = 0; i < 2000 && this.ffwd && performance.now() - t0 < 14; i++) this.sim.step(1);
      if (this.ffwd && (!end || chapterConditions(this.s).date || this.s.over)) this.endFfwd();
    } else if (this.mode.kind !== 'start' && this.speed > 0 && !this.s.over && $('modal').hidden) {
      let days = dt * DAYS_PER_SEC * this.speed;
      while (days > 0) { const d = Math.min(0.5, days); this.sim.step(d); days -= d; }
    }
    this.saveTimer += dt;
    if (this.saveTimer > 20) { this.saveTimer = 0; this.save(); }
    this.view.showLines = this.visibleLines();
    this.view.status ??= b => buildingStatus(this.sim, b);
    this.ren.draw(this.s, this.view, t);
    requestAnimationFrame(x => this.frame(x));
  }

  /** Lignes tracées sur la carte : la ligne ouverte, toutes les lignes dans leur panneau, ou celles du bâtiment sélectionné */
  private visibleLines(): number[] {
    const s = this.s, v = this.view;
    if (v.selectedLine !== null) return [v.selectedLine];
    if (v.hoverLine !== null && !this.panel) v.hoverLine = null;
    if (this.panelKind === 'lines') return s.lines.map(l => l.id);
    if (v.selected?.kind === 'building') { const id = v.selected.id; return s.lines.filter(l => l.stops.some(st => st.bid === id)).map(l => l.id); }
    if (v.selected?.kind === 'vehicle') { const veh = s.vehicles.find(x => x.id === v.selected!.id); return veh && veh.line >= 0 ? [veh.line] : []; }
    return [];
  }

  // ---------- Barre du haut ----------
  private refresh() {
    const s = this.s;
    $('date').textContent = dateLabel(s, window.innerWidth < 760);
    $('era').textContent = ERAS[s.era];
    $('money').textContent = fmt(s.money);
    $('money').parentElement!.classList.toggle('neg', s.money < 0);
    $('rp').textContent = fmt(Math.floor(s.rp));
    $('pop').textContent = fmt(playerPop(s));
    document.querySelectorAll<HTMLButtonElement>('#speed button').forEach(b => b.classList.toggle('on', Number(b.dataset.s) === this.speed));
    $('speedCycle').textContent = `×${this.speed || 1}`; $('speedCycle').classList.toggle('on', this.speed > 0);
    if (!$('treeView').hidden) this.renderTree();
    if (this.panel) {
      const html = this.panel();
      if (html !== this.panelKey) {
        // ne pas écraser un champ en cours de saisie
        const active = document.activeElement;
        // ne pas redessiner pendant qu'un champ ou une liste déroulante est utilisé (sinon la liste se referme)
        // ni pendant un défilement (molette, doigt, inertie) : la liste ne doit pas bouger toute seule
        const body = $('panelBody'), scrolling = performance.now() - this.panelScrollAt < 1200;
        if (!this.panelHold && !scrolling && !((active instanceof HTMLInputElement || active instanceof HTMLSelectElement) && body.contains(active))) {
          const top = body.scrollTop;
          body.innerHTML = html; this.panelKey = html;
          body.scrollTop = top;
        }
      }
    }
  }

  private bindChrome() {
    document.querySelectorAll<HTMLButtonElement>('#tools button').forEach(b => { const t = b.dataset.t!; b.innerHTML = `${IC[t]}<span class="lbl">${LABELS[t]}</span>`; b.title = LABELS[t]; });
    document.querySelectorAll<HTMLElement>('[data-ic]').forEach(e => { e.innerHTML = IC[e.dataset.ic!]; });
    $('rpBtn').onclick = () => this.openTree();
    $('treeView').addEventListener('click', e => this.treeClick(e));
    document.querySelectorAll<HTMLButtonElement>('#speed button').forEach(b => b.onclick = () => { this.speed = Number(b.dataset.s); this.refresh(); });
    // téléphone : un seul bouton qui fait défiler les vitesses
    $('speedCycle').onclick = () => { const v = [1, 2, 4, 8]; this.speed = v[(v.indexOf(this.speed) + 1) % v.length] || 1; this.refresh(); };
    document.querySelectorAll<HTMLButtonElement>('#tools button').forEach(b => b.onclick = () => this.tool(b.dataset.t!));
    $('panelClose').onclick = () => this.closePanel();
    // pas de redessin du panneau pendant qu'on appuie dessus : aucun clic perdu
    $('panelBody').addEventListener('pointerdown', () => { this.panelHold = true; });
    window.addEventListener('pointerup', () => setTimeout(() => { this.panelHold = false; }, 60));
    window.addEventListener('pointercancel', () => { this.panelHold = false; });
    $('panelBack').onclick = () => this.back();
    $('menuBtn').onclick = () => this.openPanel(() => this.menuPanel());
    for (const ev of ['scroll', 'wheel', 'touchmove']) $('panelBody').addEventListener(ev, () => { this.panelScrollAt = performance.now(); }, { passive: true });
    $('panelBody').addEventListener('pointerdown', e => this.stopDragStart(e));
    $('panelBody').addEventListener('click', e => this.panelClick(e));
    $('panelBody').addEventListener('mouseover', e => { const c = (e.target as HTMLElement).closest<HTMLElement>('.linebox, .linecard[data-act=line]'); this.view.hoverLine = c ? Number(c.dataset.line ?? c.dataset.id) : null; });
    $('panelBody').addEventListener('mouseleave', () => { this.view.hoverLine = null; });
    $('panelBody').addEventListener('change', e => this.panelChange(e));
    window.addEventListener('keydown', e => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === ' ') { this.speed = this.speed ? 0 : 1; e.preventDefault(); this.refresh(); }
      else if (e.key >= '1' && e.key <= '4') { this.speed = [1, 2, 4, 8][Number(e.key) - 1]; this.refresh(); }
      else if (e.key === 'Escape') { if (!$('treeView').hidden) this.closeTree(); else this.cancel(); }
      else if (e.key === 'r') this.tool('road');
      else if (e.key === 'b') this.tool('build');
      else if (e.key === 'Enter' && this.mode.kind === 'road') this.endRoad();
    });
    $('hint').addEventListener('click', e => {
      const t = (e.target as HTMLElement).closest('button'); if (!t) return;
      const a = t.dataset.a;
      if (a === 'end') this.endRoad();
      else if (a === 'cancel') this.cancel();
      else if (a === 'chemin' || a === 'voie') { this.roadType = a; this.updateHint(); }
    });
  }

  tool(t: string) {
    if (t === 'menu') { this.openPanel(() => this.menuPanel()); return; }
    if (t === 'research') { this.openTree(); return; }
    if (this.mode.kind === 'start') { this.toast('Choisis d\'abord l\'emplacement de ton entrepôt de départ.'); return; }
    this.view.draft = null; this.roadFrom = null; this.view.ghost = null;
    switch (t) {
      case 'select': this.setMode({ kind: 'select' }); break;
      case 'build': this.setMode({ kind: 'select' }); this.openPanel(() => this.buildPanel()); break;
      case 'road': this.setMode({ kind: 'road' }); break;
      case 'demolish': this.setMode({ kind: 'demolish' }); break;
      case 'lines': this.setMode({ kind: 'select' }); this.openPanel(() => this.linesPanel(), 'lines'); break;
      case 'research': this.openTree(); break;
      case 'economy': this.openPanel(() => this.economyPanel()); break;
      case 'objectives': this.openPanel(() => this.objectivesPanel()); break;
      case 'trade': this.openPanel(() => this.tradePanel()); break;
    }
  }
  setMode(m: Mode) {
    this.mode = m;
    // les modes qui demandent de toucher la carte libèrent l'écran (indispensable sur téléphone)
    if (m.kind === 'road' || m.kind === 'demolish' || m.kind === 'build') { if (this.panelKind === 'detail') this.closePanel(); }
    $('panel').classList.toggle('min', m.kind === 'pickStop' || ((m.kind === 'road' || m.kind === 'demolish') && !!this.panel));
    if (m.kind !== 'road') { this.view.draft = null; this.roadFrom = null; }
    if (m.kind !== 'build') this.view.ghost = null;
    document.querySelectorAll<HTMLButtonElement>('#tools button').forEach(b => {
      const t = b.dataset.t;
      b.classList.toggle('on', (t === 'road' && m.kind === 'road') || (t === 'demolish' && m.kind === 'demolish') || (t === 'build' && m.kind === 'build') || (t === 'select' && m.kind === 'select'));
    });
    this.updateHint();
  }
  cancel() {
    if (this.mode.kind === 'road' && this.roadFrom) { this.roadFrom = null; this.view.draft = null; this.updateHint(); return; }
    if (this.mode.kind !== 'start') this.setMode({ kind: 'select' });
  }
  private updateHint() {
    const m = this.mode, h = $('hint');
    let html = '';
    if (m.kind === 'start') html = '<b>Touche la carte</b> pour placer ton entrepôt de départ (en France, de préférence près d\'un fleuve et de gisements).';
    else if (m.kind === 'build') html = `Place : <b>${BUILD[m.type].name}</b>. ${BUILD[m.type].deposit ? 'Sur un gisement de ' + RES[BUILD[m.type].deposit!].name.toLowerCase() + '. ' : ''}<button data-a="cancel">Annuler</button>`;
    else if (m.kind === 'road') {
      const types = (Object.keys(ROADS) as RoadType[]).map(t => `<button data-a="${t}" class="${this.roadType === t ? 'on' : ''}" ${hasTech(this.s, ROADS[t].tech) ? '' : 'disabled'}>${ROADS[t].name} (${ROADS[t].perKm}/km)</button>`).join('');
      html = `${types} <span class="sep"></span>${this.roadFrom ? 'Touche l\'arrivée : un bâtiment ou une route termine le tracé ; un point du terrain ajoute un virage.' : 'Touche un bâtiment, une route existante ou le terrain pour commencer.'} <span id="quote"></span> ${this.roadFrom ? '<button data-a="end" class="primary">Terminer</button>' : ''}<button data-a="cancel">Fermer</button>`;
    }
    else if (m.kind === 'demolish') html = 'Touche une route ou un bâtiment à démolir. <button data-a="cancel">Terminer</button>';
    else if (m.kind === 'pickStop') html = 'Touche un bâtiment pour l\'ajouter comme arrêt de la ligne. <button data-a="cancel">Terminer</button>';
    else if (m.kind === 'target') html = 'Touche une <b>ville ennemie</b> ou une <b>armée ennemie</b> à attaquer. <button data-a="cancel">Annuler</button>';
    h.innerHTML = html; h.hidden = !html;
  }

  // ---------- Entrées ----------
  private bindInput(c: HTMLCanvasElement) {
    const ptrs = new Map<number, { x: number; y: number }>();
    let downAt: { x: number; y: number } | null = null, dragged = false, pinch = 0;
    c.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return; // seul le bouton gauche agit sur la carte
      c.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (ptrs.size === 1) { downAt = { x: e.offsetX, y: e.offsetY }; dragged = false; }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); dragged = true; }
    });
    c.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId);
      if (!p) { this.hover(e.offsetX, e.offsetY); return; }
      if (ptrs.size === 2) {
        p.x = e.offsetX; p.y = e.offsetY;
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) this.cam.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch);
        pinch = d; return;
      }
      const dx = e.offsetX - p.x, dy = e.offsetY - p.y;
      if (downAt && Math.hypot(e.offsetX - downAt.x, e.offsetY - downAt.y) > 6) dragged = true;
      if (dragged) { this.cam.cx -= dx / this.cam.scale; this.cam.cy -= dy / this.cam.scale; }
      p.x = e.offsetX; p.y = e.offsetY;
      if (e.pointerType !== 'mouse') this.hover(e.offsetX, e.offsetY);
    });
    const up = (e: PointerEvent) => {
      const had = ptrs.has(e.pointerId);
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = 0;
      if (had && ptrs.size === 0 && !dragged && e.type === 'pointerup') this.tap(e.offsetX, e.offsetY);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', e => { e.preventDefault(); this.cam.zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    c.addEventListener('dblclick', () => { if (this.mode.kind === 'road') this.endRoad(); });
    // clic droit : ne construit rien, revient simplement à la sélection
    c.addEventListener('contextmenu', e => { e.preventDefault(); this.roadFrom = null; this.view.draft = null; this.view.ghost = null; if (this.mode.kind !== 'start') this.setMode({ kind: 'select' }); });
  }

  private hover(sx: number, sy: number) {
    const [x, y] = this.cam.toWorld(sx, sy);
    const m = this.mode;
    if (m.kind === 'build' || m.kind === 'start') {
      const type: BType = m.kind === 'build' ? m.type : 'entrepot';
      this.view.ghost = { type, x, y, ok: checkPlace(this.s, this.geo, type, x, y, m.kind === 'start').ok };
    }
    if (m.kind === 'road' && !this.roadFrom) {
      const snap = this.snap(sx, sy);
      this.view.draft = { pts: [], cursor: { x: snap.x, y: snap.y }, valid: true, snap: this.snapKind(snap) };
    }
    if (m.kind === 'road' && this.roadFrom) {
      const snap = this.snap(sx, sy);
      const q = quoteSegment(this.geo, this.roadFrom.x, this.roadFrom.y, snap.x, snap.y, this.roadType, this.foreign(snap));
      this.view.draft = { pts: [{ x: this.roadFrom.x, y: this.roadFrom.y }], cursor: { x: snap.x, y: snap.y }, valid: !q.error && q.cost <= this.s.money, snap: this.snapKind(snap) };
      const el = document.getElementById('quote');
      if (el) el.innerHTML = q.error ? `<span class="bad">${esc(q.error)}</span>` : `${q.len.toFixed(1)} km · pente ${Math.round(q.grad)} m/km${q.bridges ? ` · ${q.bridges} pont${q.bridges > 1 ? 's' : ''}${q.rivers.length ? ' (' + esc(q.rivers.join(', ')) + ')' : ''}` : ''} · <b>${fmt(q.cost)} sesterces</b>`;
    }
    this.view.hoverEdge = m.kind === 'demolish' ? this.ren.pickEdge(this.s, sx, sy) : null;
  }

  private tap(sx: number, sy: number) {
    const [x, y] = this.cam.toWorld(sx, sy);
    const m = this.mode, s = this.s;
    if (m.kind === 'start') {
      const c = checkPlace(s, this.geo, 'entrepot', x, y, true);
      if (!c.ok) { this.toast(c.reason!, 'bad'); return; }
      const b = startingCamp(s, this.geo, x, y);
      if (s.factions && !s.factions.length) initRivals(s, this.geo, x, y);
      this.view.ghost = null;
      this.setMode({ kind: 'select' });
      this.centerOn(x, y, Math.max(this.cam.scale, 6));
      this.select({ kind: 'building', id: b.id });
      this.toast('Entrepôt de départ installé. Fonde maintenant un village à proximité (Construire → Village).', 'good');
      this.save();
      return;
    }
    if (m.kind === 'build') {
      const c = checkPlace(s, this.geo, m.type, x, y);
      if (!c.ok) { this.toast(c.reason!, 'bad'); return; }
      const b = place(s, this.geo, m.type, x, y, suggestName(s, this.geo, m.type, x, y));
      const linked = b.type !== 'pont_du_gard' && this.linkToRoad(b);
      notePlayerBuild(s, b);
      this.setMode({ kind: 'select' });
      this.select({ kind: 'building', id: b.id });
      this.toast(linked ? 'Chantier ouvert et relié à la route.' : 'Chantier ouvert. Relie-le par une route à un entrepôt qui contient les matériaux.', linked ? 'good' : undefined);
      return;
    }
    if (m.kind === 'road') { this.roadClick(sx, sy); return; }
    if (m.kind === 'demolish') {
      const e = this.ren.pickEdge(s, sx, sy);
      const p = this.ren.pick(s, sx, sy);
      if (p?.kind === 'building') { this.askDemolish(getB(s, p.id)!); return; }
      if (e !== null) { removeEdge(s, e); this.rerouteAll(); this.toast('Route démolie.'); }
      return;
    }
    if (m.kind === 'target') {
      const p = this.ren.pick(s, sx, sy), a = (s.armies ?? []).find(x => x.id === m.army);
      if (!a) { this.setMode({ kind: 'select' }); return; }
      let ok = false;
      if (p?.kind === 'rival') { const r = findRival(s, p.id); if (r && r.b.type === 'village') { if (!r.f.war) this.toast(`Tu n'es pas en guerre avec les ${r.f.name} : déclare d'abord la guerre (Diplomatie).`, 'bad'); else { a.target = { kind: 'rb', id: p.id }; a.state = 'march'; ok = true; } } else this.toast('Choisis une ville.', 'bad'); }
      else if (p?.kind === 'army') { const e = (s.armies ?? []).find(x => x.id === p.id); if (e && hostile(s, PLAYER, e.owner)) { a.target = { kind: 'army', id: e.id }; a.state = 'march'; ok = true; } else this.toast('Ce n\'est pas une armée ennemie.', 'bad'); }
      else this.toast('Touche une ville ou une armée ennemie.', 'bad');
      if (ok) { this.setMode({ kind: 'select' }); this.select({ kind: 'army', id: a.id }); this.toast('En marche !', 'good'); }
      return;
    }
    if (m.kind === 'pickStop') {
      const p = this.ren.pick(s, sx, sy);
      if (p?.kind === 'building') {
        const l = s.lines.find(x => x.id === m.line); const b = getB(s, p.id)!;
        if (l) {
          const d = BUILD[b.type];
          void d;
          // premier arrêt : on charge ; arrêts suivants : on décharge (modifiable ensuite)
          const action = l.stops.length === 0 && !b.city && !b.partner && b.type !== 'comptoir' ? 'load' : 'unload';
          l.stops.push({ bid: b.id, action, res: action === 'load' ? this.suggestRes(b).slice(0, 1) : [] });
          this.toast(`Arrêt ajouté : ${b.name}`);
          this.refresh();
        }
      }
      return;
    }
    this.select(this.ren.pick(s, sx, sy));
  }

  // ---------- Routes ----------
  private snap(sx: number, sy: number): Snap {
    const s = this.s;
    const p = this.ren.pick(s, sx, sy);
    // en mode route, seul le cœur de l'icône accroche le bâtiment : on peut ainsi viser une route qui passe à côté
    const near = p?.kind === 'building' && (() => { const b = getB(s, p.id)!, [bx, by] = this.cam.toScreen(b.x, b.y); return Math.hypot(bx - sx, by - sy) < this.ren.iconSize() * 0.38 || this.ren.pickEdge(s, sx, sy) === null; })();
    if (p?.kind === 'building' && near) {
      const b = getB(s, p.id)!;
      const n = b.node !== null ? s.nodes.find(n => n.id === b.node) ?? null : null;
      return { node: n, x: b.x, y: b.y, bid: b.id };
    }
    let best: RNode | null = null, bd = 14;
    for (const n of s.nodes) { const [x, y] = this.cam.toScreen(n.x, n.y), d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; best = n; } }
    if (best) return { node: best, x: best.x, y: best.y, bid: best.b };
    // sur une route existante : on s'y branche (un carrefour sera créé)
    const eid = this.ren.pickEdge(s, sx, sy);
    if (eid !== null) { const e = s.edges.find(x => x.id === eid)!; const p = projectOnEdge(s, e, ...this.cam.toWorld(sx, sy)); return { node: null, x: p.x, y: p.y, edge: eid }; }
    const [x, y] = this.cam.toWorld(sx, sy);
    return { node: null, x, y };
  }
  private snapKind(p: Snap): 'building' | 'node' | 'edge' | null {
    return p.bid !== undefined ? 'building' : p.node ? 'node' : p.edge !== undefined ? 'edge' : null;
  }
  private foreign(p: { bid?: number }) {
    const isPost = (id?: number) => id !== undefined && getB(this.s, id)?.type === 'poste';
    return isPost(p.bid) || isPost(this.roadFrom?.bid);
  }
  private roadClick(sx: number, sy: number) {
    const s = this.s, snap = this.snap(sx, sy);
    if (!this.roadFrom) {
      if (!snap.node && snap.bid === undefined) {
        if (!this.geo.isFrance(snap.x, snap.y)) { this.toast('Commence la route en France.', 'bad'); return; }
      }
      this.roadFrom = snap; this.view.draft = { pts: [{ x: snap.x, y: snap.y }], cursor: null, valid: true }; this.updateHint(); return;
    }
    const from = this.roadFrom;
    if (Math.hypot(from.x - snap.x, from.y - snap.y) < 0.3) { this.endRoad(); return; }
    const q = quoteSegment(this.geo, from.x, from.y, snap.x, snap.y, this.roadType, this.foreign(snap));
    if (q.error) { this.toast(q.error, 'bad'); return; }
    if (q.cost > s.money) { this.toast(`Pas assez d'argent : ce tronçon coûte ${fmt(q.cost)} sesterces.`, 'bad'); return; }
    const a = this.ensureNode(from), b = this.ensureNode(snap);
    if (s.edges.some(e => (e.a === a.id && e.b === b.id) || (e.a === b.id && e.b === a.id))) { this.toast('Cette route existe déjà.'); }
    else {
      // le nouveau tronçon crée un carrefour à chaque route existante qu'il croise
      let prev = a, junctions = 0;
      for (let guard = 0; guard < 50; guard++) {
        const c = firstCrossing(s, prev, b);
        if (!c) break;
        const n = splitEdge(s, this.geo, c.edge, c.x, c.y);
        addEdge(s, prev.id, n.id, this.roadType, Math.hypot(n.x - prev.x, n.y - prev.y), this.geo.riverCrossings(prev.x, prev.y, n.x, n.y).n);
        prev = n; junctions++;
      }
      addEdge(s, prev.id, b.id, this.roadType, Math.hypot(b.x - prev.x, b.y - prev.y), this.geo.riverCrossings(prev.x, prev.y, b.x, b.y).n);
      s.money -= q.cost; s.stats.expenses += q.cost;
      if (q.bridges) this.toast(`Pont${q.bridges > 1 ? 's' : ''} construit${q.bridges > 1 ? 's' : ''}${q.rivers.length ? ' sur : ' + q.rivers.join(', ') : ''}.`);
      if (junctions) this.toast(`${junctions} carrefour${junctions > 1 ? 's' : ''} créé${junctions > 1 ? 's' : ''} avec les routes croisées.`);
    }
    this.rerouteAll();
    // arrivée sur un bâtiment, un carrefour ou une route existante : la route est terminée, retour à la sélection
    if (snap.bid !== undefined || snap.node || snap.edge !== undefined) {
      this.roadFrom = null; this.view.draft = null;
      this.setMode({ kind: 'select' });
      this.toast('Route terminée.', 'good');
      return;
    }
    // arrivée en terrain libre : on continue le tracé depuis ce point (pour contourner un relief)
    this.roadFrom = { node: b, x: b.x, y: b.y, bid: b.b };
    this.view.draft = { pts: [{ x: b.x, y: b.y }], cursor: null, valid: true };
    this.updateHint();
  }
  private ensureNode(p: Snap): RNode {
    if (p.node) return p.node;
    if (p.edge !== undefined) {
      // le tronçon a pu être coupé entre-temps : on cherche celui qui passe par le point
      const e = this.s.edges.find(e => e.id === p.edge) ?? this.s.edges.find(e => { const q = projectOnEdge(this.s, e, p.x, p.y); return Math.hypot(q.x - p.x, q.y - p.y) < 0.05; });
      p.edge = undefined;
      if (e) { const n = splitEdge(this.s, this.geo, e.id, p.x, p.y); p.node = n; return n; }
    }
    if (p.bid !== undefined) { const b = getB(this.s, p.bid)!; return attachNode(this.s, b); }
    const n = addNode(this.s, p.x, p.y); p.node = n; return n;
  }
  /** Bâtiment posé sur (ou tout contre) une route existante : on le raccorde directement, sans frais */
  private linkToRoad(b: Building): boolean {
    const s = this.s, tol = this.ren.iconSize() * 0.6 / this.cam.scale;
    let best: { e: Edge; d: number } | null = null;
    for (const e of s.edges) {
      const q = projectOnEdge(s, e, b.x, b.y), d = Math.hypot(q.x - b.x, q.y - b.y);
      if (d < tol && (!best || d < best.d)) best = { e, d };
    }
    if (!best) return false;
    const n = splitEdge(s, this.geo, best.e.id, b.x, b.y), bn = attachNode(s, b);
    addEdge(s, bn.id, n.id, best.e.type, Math.hypot(n.x - bn.x, n.y - bn.y), this.geo.riverCrossings(bn.x, bn.y, n.x, n.y).n);
    this.rerouteAll();
    return true;
  }
  private endRoad() { this.roadFrom = null; this.view.draft = null; this.updateHint(); }
  /** Après une modification du réseau, les véhicules recalculent leur itinéraire */
  private rerouteAll() {
    for (const v of this.s.vehicles) if (v.state === 'go') { v.state = 'lost'; v.timer = 0; v.at = null; }
  }

  // ---------- Sélection et panneaux ----------
  select(sel: View['selected']) {
    this.view.selected = sel;
    if (!sel) { if (this.panel && this.panelKind === 'detail') this.closePanel(); return; }
    this.openPanel(() => this.detailPanel(), 'detail');
  }
  private panelKind = '';
  private panelHold = false;
  private panelScrollAt = 0;
  /** Glisser-déposer des arrêts d'une ligne (souris et tactile) */
  private stopDragStart(e: PointerEvent) {
    const h = (e.target as HTMLElement).closest<HTMLElement>('.stop .handle');
    const l = this.s.lines.find(x => x.id === this.view.selectedLine);
    if (!h || !l) return;
    e.preventDefault();
    const from = Number(h.dataset.i), body = $('panelBody');
    const rows = () => [...body.querySelectorAll<HTMLElement>('.stop[data-i]')];
    rows()[from]?.classList.add('dragging');
    let to = from;
    const move = (ev: PointerEvent) => {
      const list = rows();
      to = list.length - 1;
      for (let k = 0; k < list.length; k++) { const r = list[k].getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { to = k; break; } }
      list.forEach((r, k) => { r.classList.toggle('dropbefore', k === to && to !== from && to < from); r.classList.toggle('dropafter', k === to && to !== from && to > from); });
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      rows().forEach(r => r.classList.remove('dragging', 'dropbefore', 'dropafter'));
      if (to === from) return;
      // les véhicules gardent leur prochain arrêt, même s'il change de rang
      const vs = this.s.vehicles.filter(v => v.line === l.id).map(v => ({ v, st: l.stops[v.stop % l.stops.length] }));
      const [st] = l.stops.splice(from, 1); l.stops.splice(to, 0, st);
      for (const { v, st: target } of vs) v.stop = Math.max(0, l.stops.indexOf(target));
      this.panelKey = ""; this.panelHold = false; this.refresh();
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  private history: { fn: () => string; kind: string; sel: View['selected']; line: number | null }[] = [];
  openPanel(fn: () => string, kind = 'panel') {
    // mémorise le panneau précédent pour le bouton « Retour »
    if (this.panel && !(kind === 'detail' && this.panelKind === 'detail' && JSON.stringify(this.view.selected) === JSON.stringify(this.history[this.history.length - 1]?.sel))) {
      this.history.push({ fn: this.panel, kind: this.panelKind, sel: this.view.selected, line: this.view.selectedLine });
      if (this.history.length > 12) this.history.shift();
    }
    this.panel = fn; this.panelKind = kind; this.panelKey = '';
    $('panelBack').hidden = !this.history.length;
    $('panel').hidden = false;
    const html = fn(); $('panelBody').innerHTML = html; this.panelKey = html; this.panelScrollAt = 0;
    this.refresh();
    $('panelBody').scrollTop = 0;
  }
  closePanel() {
    this.panel = null; this.panelKind = ''; $('panel').hidden = true; this.view.selected = null; this.view.selectedLine = null;
    this.history = []; $('panelBack').hidden = true;
    // fermer une ligne en cours d'édition ramène à la sélection (pas de bâtiment ajouté par erreur)
    if (this.mode.kind === 'pickStop') this.setMode({ kind: 'select' });
  }
  private back() {
    const h = this.history.pop(); if (!h) return;
    if (this.mode.kind === 'pickStop') this.setMode({ kind: 'select' });
    this.view.selected = h.sel; this.view.selectedLine = h.line;
    this.panel = h.fn; this.panelKind = h.kind; this.panelKey = '';
    $('panelBack').hidden = !this.history.length; $('panel').hidden = false;
    this.panelScrollAt = 0; this.panelHold = false; this.refresh(); $('panelBody').scrollTop = 0;
  }

  /** Lignes d'un bâtiment, en deux onglets : au départ d'ici / arrivant ici */
  private buildingLines(b: Building): string {
    const s = this.s; let h = '';
    const usedBy = s.lines.filter(l => l.stops.some(st => st.bid === b.id));
    if (usedBy.length) {
      // deux onglets : les lignes qui partent d'ici (chargement) et celles qui y arrivent (déchargement)
      const dep = usedBy.filter(l => l.stops.some(st => st.bid === b.id && st.action === 'load'));
      const arr = usedBy.filter(l => l.stops.some(st => st.bid === b.id && st.action === 'unload'));
      const tab = this.bLineTab === 'depart' && !dep.length ? 'arrivee' : this.bLineTab === 'arrivee' && !arr.length ? 'depart' : this.bLineTab;
      const list = tab === 'depart' ? dep : arr;
      h += `<h3>Lignes de ce bâtiment</h3><div class="tabs seg"><button data-act="bltab" data-r="depart" class="${tab === 'depart' ? 'on' : ''}">↗ Au départ d'ici <b>${dep.length}</b></button><button data-act="bltab" data-r="arrivee" class="${tab === 'arrivee' ? 'on' : ''}">↘ Arrivant ici <b>${arr.length}</b></button></div>
        ${list.map(l => this.lineCard(l)).join('') || `<p class="muted">Aucune ligne ${tab === 'depart' ? 'ne charge ici' : 'ne décharge ici'}.</p>`}`;
    }
    return h;
  }

  /** Fiche d'une armée */
  private armyPanel(id: number): string {
    const s = this.s, a = (s.armies ?? []).find(x => x.id === id); if (!a) return '<p class="muted">Cette armée n\'existe plus.</p>';
    const mine = a.owner === PLAYER, col = ownerColor(s, a.owner), t = targetPos(s, a.target ?? null);
    const tname = a.target ? (a.target.kind === 'army' ? 'une armée ennemie' : a.target.kind === 'b' ? getB(s, a.target.id)?.name : findRival(s, a.target.id)?.b.name) : '';
    const st = { idle: 'Au repos', march: `En marche vers ${tname}`, fight: 'Au combat !', siege: `Assiège ${tname}` }[a.state];
    let h = `<h2 class="ph"><span class="army-dot" style="background:${col}"></span>${mine ? (a.merc ? 'Mercenaires' : 'Ton armée') : `Armée des ${esc(ownerName(s, a.owner))}`}</h2>
      ${this.kpis([[fmt(a.men), 'hommes'], [`${Math.round(a.leg * 100)} %`, 'légionnaires'], [`${Math.round(a.hp)} %`, 'vie et moral', a.hp > 60 ? 'good' : a.hp > 30 ? 'warn' : 'bad'], [fmt(strength(a)), 'force']])}
      <div class="gauge"><i style="width:${a.hp}%;background:${a.hp > 60 ? '#40c057' : a.hp > 30 ? '#fab005' : '#fa5252'}"></i></div>
      <p><b>${st}</b>${t && a.state === 'march' ? ` · ${fmt(Math.hypot(t.x - a.x, t.y - a.y))} km` : ''}${a.state === 'siege' && a.siege !== undefined ? ` · garnison restante ${fmt(a.siege)}` : ''}</p>`;
    if (mine) {
      h += `<p class="muted">Solde : ${fmt(a.men * (a.merc ? 2.4 : 1.2))} sesterces et ${Math.ceil(a.men * 0.01)} t de céréales par mois (prises dans tes entrepôts). Une armée au repos reprend des forces.</p>
        <div class="actions top"><button class="primary" data-act="attack" data-id="${a.id}">⚔ Attaquer…</button>${a.target ? `<button data-act="halt" data-id="${a.id}">Arrêter</button>` : ''}<button class="danger" data-act="disband" data-id="${a.id}">Dissoudre</button></div>`;
    } else h += `<p class="muted">${hostile(s, PLAYER, a.owner) ? 'Ennemie : envoie une de tes armées l\'intercepter.' : 'Pas en guerre avec toi.'}</p>`;
    return h;
  }
  /** Fiche d'un bâtiment ou d'une ville rivale */
  private rivalPanel(id: number): string {
    const s = this.s, r = findRival(s, id); if (!r) return '';
    const { f, b } = r, cities = f.b.filter(x => x.type === 'village'), pop = factionPop(f);
    let h = `<div class="bhead"><img class="bic" src="${b.type === 'village' ? cityIconUrl(b.tier) : bIconUrl(b.type, b.level)}" style="background:${f.color};border-radius:50%"><div class="bt"><b class="name">${esc(b.name)}</b>
      <small class="muted">${b.type === 'village' ? TIERS[b.tier ?? 0].name : BUILD[b.type].name}</small><span class="pill" style="background:${f.color};color:#fff">${esc(f.name)}</span></div></div>`;
    if (b.ready && b.ready > s.day) h += `<p class="hint info">Chantier en cours : terminé ${dateLabel({ ...s, day: b.ready })}.</p>`;
    if (b.type === 'village') {
      h += this.kpis([[fmt(b.pop ?? 0), 'habitants'], [`${rivalWorkRange(f, b)} km`, 'rayon de main-d\'œuvre']]);
      h += b.growing ? '<p><span class="pill good">En croissance</span></p>'
        : `<p><span class="pill ${(b.short ?? []).includes('cereales') ? 'bad' : 'warn'}">${(b.short ?? []).includes('cereales') ? 'Famine' : 'Stagne'}</span></p>`;
      if (b.short?.length) h += `<p class="muted">Manque : ${b.short.map(r => RES[r].name.toLowerCase()).join(', ')}.</p>`;
    } else if (BUILD[b.type].recipe) h += `<p class="muted">Produit : ${Object.keys(BUILD[b.type].recipe!.out).map(r => RES[r as ResId].name.toLowerCase()).join(', ')}.</p>`;
    h += `<h3>${esc(f.name)}</h3><p class="muted">${esc(RIVALS.find(x => x.id === f.id)?.desc ?? '')}</p>
      <p><b>Caractère :</b> ${CHARACTERS[f.character as keyof typeof CHARACTERS] ?? ''}</p>
      <p><b>Technologies :</b> ${(f.techs ?? []).length ? (f.techs ?? []).map(id => TECHS.find(t => t.id === id)?.name ?? id).join(', ') : '<span class="muted">aucune pour l\'instant</span>'}</p>
      ${this.kpis([[`${cities.length}`, `ville${cities.length > 1 ? 's' : ''}`], [fmt(pop), 'habitants'], [`${f.b.length - cities.length}`, 'autres bâtiments']])}
      <p><b>Réserves :</b> ${Object.entries(f.stock ?? {}).filter(([, q]) => (q ?? 0) >= 1).map(([r, q]) => `${RES[r as ResId].name.toLowerCase()} ${fmt(q!)} t`).join(' · ') || '<span class="muted">vides</span>'}</p>
      <p>Relation : <span class="pill ${relLabel(f).level}">${relLabel(f).label}</span> <small class="muted">(${Math.round(relOf(f))})</small>${f.trade ? ' · <span class="pill good">Accord commercial</span>' : ''}${f.alliance ? ' · <span class="pill good">Alliance</span>' : ''}</p>
      <p class="hint info">${f.alliance ? 'Allié : tu peux construire sur son territoire et exploiter ses gisements.' : 'On ne peut pas construire sur son territoire ni exploiter ses gisements sans alliance.'}</p>
      ${f.war ? '<p class="hint bad">⚔ En guerre avec toi.</p>' : ''}
      <div class="actions top"><button class="primary" data-act="diplo">🤝 Diplomatie</button>${f.war && b.type === 'village' ? (s.armies ?? []).filter(x => x.owner === PLAYER).map(x => `<button data-act="sendarmy" data-id="${x.id}" data-t="${b.id}">⚔ Envoyer ${fmt(x.men)} hommes</button>`).join('') : ''}</div>
      ${b.type === 'village' ? `<p class="muted">Garnison estimée : ${fmt(rivalGarrison(s, b))}.</p>` : ''}
      <div class="chips">${cities.map(c => `<span class="res">${esc(c.name)} <b>${fmt(c.pop ?? 0)}</b></span>`).join(' ')}</div>`;
    return h;
  }
  private detailPanel(): string {
    const sel = this.view.selected, s = this.s;
    if (!sel) return '';
    if (sel.kind === 'building') { const b = getB(s, sel.id); return b ? this.buildingPanel(b) : ''; }
    if (sel.kind === 'rival') return this.rivalPanel(sel.id);
    if (sel.kind === 'army') return this.armyPanel(sel.id);
    if (sel.kind === 'vehicle') {
      const v = s.vehicles.find(x => x.id === sel.id); if (!v) return '';
      const l = s.lines.find(x => x.id === v.line);
      const st = { go: 'En route', load: 'Chargement', unload: 'Déchargement', lost: 'Aucun itinéraire !', parked: 'À l\'arrêt (ligne en pause)' }[v.state];
      return `<h2><img class="ic" src="${vIconUrl(v.type)}">${VEH[v.type].name}</h2>
        ${l ? this.lineCard(l) : `<p>Convoi de chantier vers <b>${esc(getB(s, v.target!)?.name ?? '?')}</b></p>`}
        <p>État : <b>${st}</b></p><p>Chargement (${fmt(cargoTotal(v.cargo))} / ${VEH[v.type].cap} t) : ${cargoList(v.cargo) || '<span class="muted">vide</span>'}</p>
        ${l ? `<p>Recettes : <b>${fmt(v.income)}</b> sesterces</p><button data-act="sellv" data-id="${v.id}">Vendre (${fmt(VEH[v.type].price / 2)})</button> <button data-act="line" data-id="${l.id}">Voir la ligne</button>` : ''}`;
    }
    const e = s.edges.find(x => x.id === sel.id); if (!e) return '';
    if (e.lent) { const f = s.factions?.find(x => x.id === e.ally); return `<h2>${ROADS[e.type].name}</h2><p>Route des <b>${esc(f?.name ?? '?')}</b> empruntée par tes lignes depuis ta conquête : tes véhicules peuvent y circuler et tu peux y raccorder tes routes, même en guerre.</p><p class="muted">Elle reste à son propriétaire : elle disparaît s'il la démolit.</p>`; }
    if (e.ally) { const f = s.factions?.find(x => x.id === e.ally); return `<h2>${ROADS[e.type].name}</h2><p>Route alliée des <b>${esc(f?.name ?? '?')}</b> : tes véhicules peuvent l'emprunter et tu peux y raccorder tes routes.</p><p class="muted">Elle disparaît de ton réseau si l'alliance est rompue.</p>`; }
    const up = e.type === 'chemin' && hasTech(s, 'voie_romaine');
    const upCost = Math.round(e.len * (ROADS.voie.perKm - ROADS.chemin.perKm) * 1.3);
    const wear = e.wear ?? 0, kept = relaisMult(s, (nodeById(s, e.a)!.x + nodeById(s, e.b)!.x) / 2, (nodeById(s, e.a)!.y + nodeById(s, e.b)!.y) / 2) > 1;
    const state = s.era >= 3 ? `<p>État : <b>${Math.round((1 - wear) * 100)} %</b>${wear > 0.01 ? ` · vitesse ${Math.round((1 - ROAD_WEAR_SLOW * wear) * 100)} %` : ''}</p>
      <p class="hint ${kept ? 'good' : wear > 0.5 ? 'bad' : 'warn'}">${kept ? 'Entretenue par un relais routier : elle se répare peu à peu.' : 'Personne ne l\'entretient : elle s\'abîme. Construis un relais routier à moins de 30 km pour la réparer.'}</p>` : '';
    return `<h2>${ROADS[e.type].name}</h2><p>Longueur : <b>${e.len.toFixed(1)} km</b>${e.bridges ? ` · ${e.bridges} pont(s)` : ''}</p><p>Vitesse : ×${ROADS[e.type].speed}</p>${state}
      ${up ? `<button data-act="paveroad" data-id="${e.id}" data-cost="${upCost}">Paver en voie romaine (${fmt(upCost)})</button>` : ''}
      <button class="danger" data-act="delroad" data-id="${e.id}">Démolir</button>`;
  }

  /** Lignes de stock : pictogramme, quantité, jauge de remplissage et flux du mois */
  private stockRows(b: Building, list: ResId[], cap: (r: ResId) => number, extra?: (r: ResId) => string) {
    const f = b.flow;
    return `<div class="stocks">${list.map(r => {
      const q = b.stock[r] ?? 0, c = cap(r), pct = c ? Math.min(100, q / c * 100) : 0;
      const inM = (f?.in[r] ?? 0), outM = (f?.out[r] ?? 0), pin = f?.pin[r] ?? 0, pout = f?.pout[r] ?? 0;
      const flux = inM || outM || pin || pout
        ? `<small class="flux">${Math.max(inM, pin) >= 0.5 ? `<span class="up">+${fmt(Math.max(inM, pin))} entrées</span> ` : ''}${Math.max(outM, pout) >= 0.5 ? `<span class="down">−${fmt(Math.max(outM, pout))} sorties</span>` : ''} <span class="muted">/ mois</span></small>` : '<small class="flux muted">aucun mouvement</small>';
      return `<div class="srow">${resIcon(r, 'ri big')}<div class="sinfo"><div class="sline"><span>${RES[r].name}</span><b>${fmt(q)}${c ? ` <small class="muted">/ ${fmt(c)}</small>` : ''}</b></div>
        ${c ? `<div class="gauge ${pct >= 95 ? 'full' : pct >= 80 ? 'high' : ''}"><i style="width:${pct}%;background:${RES[r].color}"></i></div>` : ''}${flux}${extra ? extra(r) : ''}</div></div>`;
    }).join('')}</div>`;
  }
  private kpis(items: [string, string, string?][]) {
    return `<div class="kpis">${items.map(([v, l, cls]) => `<div class="kpi ${cls ?? ''}"><b>${v}</b><small>${l}</small></div>`).join('')}</div>`;
  }

  private buildingPanel(b: Building): string {
    const s = this.s, d = BUILD[b.type];
    const st = buildingStatus(this.sim, b);
    const sub = b.city ? `${TIERS[b.city.tier].name}` : b.partner ? 'Partenaire commercial' : `${d.name}${d.maxLevel > 1 ? ` · niveau ${b.level}${d.levels?.[b.level] ? ` (${d.levels[b.level].name})` : ''}` : ''}`;
    let h = `<div class="bhead"><img class="bic" src="${b.city ? cityIconUrl(b.city.tier) : bIconUrl(b.type, b.level)}"><div class="bt">
      <input class="name" data-field="name" data-id="${b.id}" value="${esc(b.name)}"><small class="muted">${sub}</small>
      <span class="pill ${st.level}">${st.label}</span></div></div>
      ${st.hint ? `<p class="hint ${st.level}">${esc(st.hint)}</p>` : ''}<p class="muted desc">${esc(d.desc)}</p>`;
    {
      // actions principales en haut de la fiche : nouvelle ligne, amélioration
      let top = '';
      if (b.partner ? b.node !== null : b.built && d.storage > 0)
        top += `<button class="primary" data-act="newline" data-id="${b.id}">+ Nouvelle ligne depuis ${b.partner ? 'ce poste' : 'ici'}</button>`;
      const hh = h; h = '';
      if (b.damaged && !b.repair) {
        const rc = repairCost(b);
        top += `<button class="primary" data-act="repair" data-id="${b.id}">🔨 Réparer (${fmt(rc.money)} + ${costList(rc.need)})</button>`;
      }
    if (b.built && !b.upgrading && !b.damaged && b.level < d.maxLevel) {
      const allowed = levelAllowed(s, b), extra = d.levels?.[b.level + 1];
      const km = costMult(s), cost = Math.round(d.money * LEVEL_MONEY[b.level + 1] * km);
      h += `<button class="up" data-act="upgrade" data-id="${b.id}" ${allowed ? '' : 'disabled'}>Améliorer niv. ${b.level + 1}${extra ? ` (${extra.name})` : ''}${km < 1 ? ` (remise −${Math.round((1 - km) * 100)} %)` : ''} (${fmt(cost)} + ${costList(scaleStock(upgradeCost(b), km))})${allowed ? '' : ` — technologie requise${extra ? ` : ${TECHS.find(t => t.id === extra.tech)?.name ?? ''}` : ''}`}</button>`;
    }
      top += h; h = hh;
      if (b.upgrading) top += `<span class="pill info">${b.repair ? 'Réparation en cours' : `Amélioration vers le niveau ${b.level + 1} en cours`}</span>`;
      if (top) h += `<div class="actions top">${top}</div>`;
    }

    if (b.type === 'caserne' && b.built) {
      const mine = (s.armies ?? []).filter(x => x.owner === PLAYER);
      h += `<h3>Recruter <small class="muted">— les hommes viennent de la ville voisine</small></h3><div class="stocks">${(['leg', 'aux'] as const).map(k => { const r = RECRUIT[k]; return `<div class="srow"><span class="wfx">${k === 'leg' ? '🛡' : '🏹'}</span><div class="sinfo"><div class="sline"><span>${r.men} ${r.name.toLowerCase()}</span><b>${fmt(r.money)} <small class="muted">sest.</small></b></div>
        <small class="muted">${costList(r.res)} · −${r.men} habitants${k === 'leg' ? ' · solides' : ' · rapides, moins chers'}</small>
        <div class="buy"><button class="primary" data-act="recruit" data-id="${b.id}" data-k="${k}">Recruter</button></div></div></div>`; }).join('')}</div>
        <h3>Tes armées (${mine.length})</h3>${mine.map(a => `<button class="row" data-act="selarmy" data-id="${a.id}"><span class="army-dot" style="background:${PLAYER_COLOR}"></span><span>${fmt(a.men)} hommes · ${Math.round(a.hp)} %</span><small class="muted">${{ idle: 'au repos', march: 'en marche', fight: 'au combat', siege: 'siège' }[a.state]}</small></button>`).join('') || '<p class="muted">Aucune.</p>'}`;
    }
    if (b.type === 'taverne' && b.built) {
      const fs = linkedTraders(s, b), f = tradeFaction(s, b), unlinked = (s.factions ?? []).filter(o => o.trade && !fs.includes(o));
      h += `<div class="actions top"><button data-act="diplo">🤝 Diplomatie</button>${warAllowed(s) ? `<button data-act="mercs" data-id="${b.id}">⚔ Engager ${MERC.men} mercenaires (${fmt(MERC.money)})</button>` : ''}</div>`;
      if (unlinked.length) h += `<p class="hint warn">Pas de route commerciale vers ${unlinked.map(o => 'les ' + esc(o.name)).join(', ')} : trace une route depuis cette taverne jusqu'à moins de ${TRADE_LINK_KM} km d'une de leurs villes pour commercer.</p>`;
      if (!f && !unlinked.length) h += `<p class="hint info">Aucun accord commercial pour l'instant. Ouvre la diplomatie pour en proposer un, puis relie la taverne par une route à une ville du rival.</p>`;
      if (f) {
        const sold = s.stats.soldMonth['riv:' + f.id] ?? 0, vol = rivalVolume(f);
        h += `<p>Commerce avec : <select data-field="tf" data-id="${b.id}">${fs.map(o => `<option value="${o.id}" ${o === f ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select></p>`;
        h += this.kpis([[`${fmt(sold)} / ${vol} t`, 'vendu ce mois'], [`${fmt(s.stats.sold['riv:' + f.id] ?? 0)} t`, 'vendu au total']]);
        h += `<h3>Ils achètent <small class="muted">— livre-les à la taverne avec une ligne</small></h3><div class="stocks">${factionBuys(s, f).map(r => `<div class="srow">${resIcon(r, 'ri big')}<div class="sinfo"><div class="sline"><span>${RES[r].name}</span><b>${rivalPrice(f, r).toFixed(1)} <small class="muted">sest./t</small></b></div></div></div>`).join('')}</div>`;
        h += `<h3>Ils vendent <small class="muted">— les achats attendent à la taverne</small></h3><div class="stocks">${factionSells(f).map(r => { const pr = rivalImportPrice(f, r); return `<div class="srow">${resIcon(r, 'ri big')}<div class="sinfo"><div class="sline"><span>${RES[r].name}</span><b>${pr.toFixed(1)} <small class="muted">sest./t</small></b></div>
          <div class="buy"><button data-act="buyriv" data-id="${b.id}" data-r="${r}" data-q="10">Acheter 10 t (${fmt(pr * 10)})</button><button data-act="buyriv" data-id="${b.id}" data-r="${r}" data-q="20">20 t (${fmt(pr * 20)})</button></div></div></div>`; }).join('') || '<p class="muted">Rien pour l\'instant.</p>'}</div>`;
      }
      const st = (Object.entries(b.stock) as [ResId, number][]).filter(([, q]) => q >= 0.5);
      h += `<h3>Marchandises en attente (${fmt(st.reduce((a, [, q]) => a + q, 0))} / ${BUILD.taverne.storage} t)</h3>${st.length ? `<div class="chips">${st.map(([r, q]) => resChip(r, q)).join(' ')}</div>` : '<p class="muted">Aucune.</p>'}`;
      h += this.buildingLines(b);
      return h;
    }
    if (b.type === 'comptoir') {
      const p = SEA_PARTNERS.find(x => x.id === b.sp)!, sold = s.stats.soldMonth['mer:' + p.id] ?? 0, vol = seaVolume(s, p);
      const ports = s.buildings.filter(x => x.type === 'port_mer' && x.built && x.sea === b.sea);
      h += this.kpis([[`${fmt(sold)} / ${vol} t`, 'vendu ce mois'], [`${fmt(s.stats.sold['mer:' + p.id] ?? 0)} t`, 'vendu au total'], [`${ports.length}`, `port${ports.length > 1 ? 's' : ''} de commerce sur cette mer`]]);
      h += `<div class="gauge"><i style="width:${Math.min(100, sold / vol * 100)}%"></i></div>`;
      if (!ports.length) h += `<p class="hint warn">Construis un port de commerce sur la côte ${b.sea === 'mediterranee' ? 'méditerranéenne' : 'atlantique ou de la Manche'} pour y envoyer des navires.</p>`;
      h += `<h3>Ils achètent <small class="muted">— livre-leur avec un navire marchand (arrêt « Décharger »)</small></h3><div class="stocks">${p.buys.filter(r => RES[r].era <= s.era).map(r => `<div class="srow">${resIcon(r, 'ri big')}<div class="sinfo"><div class="sline"><span>${RES[r].name}</span><b>${seaPrice(s, b, p, r).toFixed(1)} <small class="muted">sest./t</small></b></div></div></div>`).join('')}</div>`;
      h += `<h3>Ils vendent <small class="muted">— les achats attendent ici qu'un navire vienne les charger</small></h3><div class="stocks">${p.sells.map(r => {
        const pr = seaImportPrice(s, b, p, r);
        return `<div class="srow">${resIcon(r, 'ri big')}<div class="sinfo"><div class="sline"><span>${RES[r].name}</span><b>${pr.toFixed(1)} <small class="muted">sest./t</small></b></div>
          <div class="buy"><button data-act="importmer" data-id="${b.id}" data-p="${p.id}" data-r="${r}" data-q="10">Acheter 10 t (${fmt(pr * 10)})</button><button data-act="importmer" data-id="${b.id}" data-p="${p.id}" data-r="${r}" data-q="20">20 t (${fmt(pr * 20)})</button></div></div></div>`;
      }).join('')}</div>`;
      const st = (Object.entries(b.stock) as [ResId, number][]).filter(([, q]) => q >= 0.5);
      h += `<h3>Marchandises achetées en attente (${fmt(st.reduce((a, [, q]) => a + q, 0))} / ${BUILD.comptoir.storage} t)</h3>${st.length ? `<div class="chips">${st.map(([r, q]) => resChip(r, q)).join(' ')}</div>` : '<p class="muted">Aucune.</p>'}`;
      h += this.buildingLines(b);
      return h;
    }
    if (b.partner) {
      const p = PARTNERS.find(x => x.id === b.partner)!;
      const sold = s.stats.soldMonth[p.id] ?? 0, vol = partnerVolume(s, p.id), closed = partnerClosed(s, p.id);
      h += this.kpis([[`${fmt(sold)} / ${vol} t`, 'vendu ce mois'], [`${fmt(s.stats.sold[p.id] ?? 0)} t`, 'vendu au total']]);
      h += `<div class="gauge"><i style="width:${Math.min(100, sold / vol * 100)}%"></i></div>`;
      h += `<h3>Ils achètent <small class="muted">— livre-leur avec une ligne (arrêt « Décharger »)</small></h3><div class="stocks">${p.buys.filter(r => RES[r].era <= s.era).map(r => `<div class="srow">${resIcon(r, 'ri big')}<div class="sinfo"><div class="sline"><span>${RES[r].name}</span><b>${priceAt(s, b, r).toFixed(1)} <small class="muted">sest./t</small></b></div></div></div>`).join('')}</div>`;
      h += `<h3>Ils vendent <small class="muted">— les achats arrivent dans ce poste</small></h3><div class="stocks">${p.sells.map(r => {
        const pr = importPrice(s, b, r);
        return `<div class="srow">${resIcon(r, 'ri big')}<div class="sinfo"><div class="sline"><span>${RES[r].name}</span><b>${pr.toFixed(1)} <small class="muted">sest./t</small></b></div>
          <div class="buy"><button data-act="import" data-id="${b.id}" data-r="${r}" data-q="5" ${closed ? 'disabled' : ''}>Acheter 5 t (${fmt(pr * 5)})</button><button data-act="import" data-id="${b.id}" data-r="${r}" data-q="20" ${closed ? 'disabled' : ''}>20 t (${fmt(pr * 20)})</button></div></div></div>`;
      }).join('')}</div>`;
      const st = (Object.entries(b.stock) as [ResId, number][]).filter(([, q]) => q >= 0.5);
      h += `<h3>Marchandises achetées en attente (${fmt(st.reduce((a, [, q]) => a + q, 0))} / ${BUILD.poste.storage} t)</h3>${st.length ? `<div class="chips">${st.map(([r, q]) => resChip(r, q)).join(' ')}</div><p class="muted">Crée une ligne qui les <b>charge</b> ici pour les rapporter dans tes entrepôts.</p>` : '<p class="muted">Aucune.</p>'}`;
      return h;
    }

    if (!b.built || b.upgrading) {
      const left = Object.values(b.need).reduce((a, q) => a + (q ?? 0), 0);
      h += `<h3>${b.upgrading ? `Amélioration vers le niveau ${b.level + 1}` : 'Chantier'}</h3>`;
      if (left > 0) {
        h += `<div class="stocks">${(Object.entries(b.need) as [ResId, number][]).map(([r, q]) => {
          const full = (b.upgrading ? q : d.cost[r] ?? q), got = Math.max(0, full - q);
          return `<div class="srow">${resIcon(r, 'ri big')}<div class="sinfo"><div class="sline"><span>${RES[r].name}</span><b>${fmt(got)} <small class="muted">/ ${fmt(full)}</small></b></div>
            <div class="gauge"><i style="width:${full ? got / full * 100 : 0}%;background:${RES[r].color}"></i></div>${b.incoming[r] ? `<small class="flux">${fmt(b.incoming[r]!)} t en route</small>` : ''}</div></div>`;
        }).join('')}</div>`;
        if (b.node !== null) {
          const ok = s.buildings.some(w => w.type === 'entrepot' && w.built && w.node !== null && findPath(s, w.node, b.node!));
          if (!ok) h += '<p class="hint warn">Aucun entrepôt relié par la route.</p>';
          else if (!Object.keys(b.need).some(r => s.buildings.some(w => w.type === 'entrepot' && (w.stock[r as ResId] ?? 0) >= 1))) h += '<p class="hint warn">Les entrepôts n\'ont plus ces matériaux : apporte-les avec une ligne de charrettes.</p>';
        }
      } else h += `<div class="gauge big"><i style="width:${Math.round(this.sim.constructionProgress(b) * 100)}%"></i></div><p class="muted">Travaux : ${Math.round(this.sim.constructionProgress(b) * 100)} %</p>`;
    }

    if (d.wonder) {
      const w = d.wonder, on = b.built;
      const cities = s.buildings.filter(x => x.city && x.built && Math.hypot(x.x - b.x, x.y - b.y) <= w.range);
      const shops = s.buildings.filter(x => w.prodTypes.includes(x.type) && x.built && Math.hypot(x.x - b.x, x.y - b.y) <= w.prodRange);
      const row = (ic: string, t: string, v: string, sub: string) => `<div class="srow"><span class="wfx">${ic}</span><div class="sinfo"><div class="sline"><span>${t}</span><b>${v}</b></div><small class="muted">${sub}</small></div></div>`;
      const cityList = `Villes à moins de ${w.range} km : ${cities.length ? cities.map(x => esc(x.name)).join(', ') : 'aucune pour l\'instant'}.`;
      let fx = '';
      if (d.waterRange) fx += row('💧', 'Eau courante', `${d.waterRange} km`, 'On peut bâtir villes et ateliers loin des rivières dans ce rayon.');
      if (w.needMult < 1) fx += row('🏛', 'Consommation des villes', `−${Math.round((1 - w.needMult) * 100)} %`, cityList);
      if (w.growth) fx += row('🏟', 'Croissance des villes', `+${Math.round((w.growth - 1) * 100)} %`, cityList);
      if (w.prodMult > 1) fx += row('⚒', `Production des ${w.prodTypes.map(t => BUILD[t].name.toLowerCase().replace('camp de bûcherons', 'camps de bûcherons').replace('carrière de pierre', 'carrières')).join(' et ')}`, `+${Math.round((w.prodMult - 1) * 100)} %`, `À moins de ${w.prodRange} km : ${shops.length} bâtiment${shops.length > 1 ? 's' : ''}.`);
      if (w.rp) fx += row('📜', 'Prestige', `+${w.rp} pt/mois`, 'Points de recherche chaque mois.');
      if (w.games) { const pop = cities.reduce((a2, x) => a2 + x.city!.pop, 0); fx += row('🪙', 'Revenus des jeux', `${fmt(pop * w.games)} /mois`, 'Grandit avec la population des villes voisines.'); }
      h += `<h3>Effets de la merveille ${on ? '' : '<small class="muted">— une fois construite</small>'}</h3><div class="stocks">${fx}</div>`;
    }
    if (d.effect && !d.wonder) {
      const e = d.effect;
      const fx = [e.growth ? `croissance +${Math.round((e.growth - 1) * 100)} % des villes à moins de ${e.range ?? 8} km` : '',
        e.protect ? `protège des invasions les bâtiments à moins de ${e.protect} km` : '', e.rp ? `+${String(e.rp).replace('.', ',')} point de recherche par mois` : '',
        e.speed ? `véhicules +${Math.round((e.speed - 1) * 100)} % de vitesse à moins de ${e.range ?? 30} km` : '', e.seaVolume ? `volume du commerce maritime +${Math.round(e.seaVolume * 100)} %` : ''].filter(Boolean);
      h += `<p class="hint ${b.built && !b.damaged ? 'good' : 'info'}">${b.built && !b.damaged ? 'Effet actif' : 'Effet une fois construit'} : ${fx.join(' ; ')}.</p>`;
    }
    if (b.city) {
      const c = b.city, needs = cityNeeds(b), next = TIERS[c.tier + 1];
      h += this.kpis([[fmt(c.pop), 'habitants'], [fmt(c.pop * 0.4), `ouvriers (rayon ${workRange(b, s)} km)`], [`${Math.round(c.foodSat * 100)} %`, 'nourriture', c.foodSat >= 0.9 ? 'good' : c.foodSat >= 0.5 ? 'warn' : 'bad'], [`${Math.round(c.sat * 100)} %`, 'confort', c.sat >= 0.9 ? 'good' : c.sat >= 0.5 ? 'warn' : 'bad']]);
      {
        const fr = foodReserve(b), fq = needs.cereales ?? 0;
        const got = c.lastGot, short = got !== undefined && got < fq * 0.98;
        const why = c.foodSat < 0.98 ? 'La ville manque de céréales : des habitants s\'en vont.'
          : fr < RESERVE_TO_GROW ? `Il faut au moins ${RESERVE_TO_GROW} mois de réserve pour grandir : livre un peu plus que ce qu'elle mange.`
          : short ? 'La ville vit sur sa réserve : elle ne grandit que si elle reçoit au moins ce qu\'elle mange.'
          : missingNextGoods(b).length ? `Nourriture suffisante. ${cityShortages(b).map(r => `Manque ${RES[r].name.toLowerCase()}`).join(' · ')}.`
          : c.growing === false ? 'La ville ne grandit pas ce mois-ci.' : 'Réserve suffisante et livraisons régulières : la ville grandit.';
        h += `<div class="reserve ${fr >= RESERVE_TO_GROW && !short ? 'good' : fr >= 0.25 ? 'warn' : 'bad'}">${resIcon('cereales', 'ri big')}<div><b>Réserve : ${fr >= 1 ? `${fr.toFixed(1).replace('.', ',')} mois` : fr > 0.02 ? `${Math.round(fr * 30)} jours` : 'vide'}</b>
          <small>${fmt(c.stock.cereales ?? 0)} t de céréales · mange ${perMonth(fq)}${got !== undefined ? ` · reçu le mois dernier : ${fmt(got)} t` : ''}</small>
          <small>${why}</small></div></div>`;
      }
      h += `<p class="muted">Recherche : <b>+${String(RP_TIER[c.tier]).replace('.', ',')} point/mois</b> (palier ${TIERS[c.tier].name.toLowerCase()})${next ? ` · ${String(RP_TIER[c.tier + 1]).replace('.', ',')} en devenant ${next.name.toLowerCase()}` : ''}</p>`;
      if ((c.needMult ?? 1) < 1) h += `<p class="hint good">Merveille à proximité : consommation −${Math.round((1 - c.needMult!) * 100)} %.</p>`;
      if (next) h += `<p class="muted">Prochain palier : <b>${next.name}</b> à ${fmt(next.minPop)} habitants</p><div class="gauge"><i style="width:${Math.min(100, (c.pop - TIERS[c.tier].minPop) / (next.minPop - TIERS[c.tier].minPop) * 100)}%"></i></div>`;
      h += `<h3>Besoins et réserves</h3><div class="stocks">${(Object.entries(needs) as [ResId, number][]).map(([r, q]) => {
        const have = c.stock[r] ?? 0, months = q > 0 ? have / q : 0, pct = Math.min(100, months / 12 * 100);
        return `<div class="srow">${resIcon(r, 'ri big')}<div class="sinfo"><div class="sline"><span>${RES[r].name}</span><b>${months >= 1 ? `${Math.floor(months)} mois` : have > 0.5 ? '< 1 mois' : '<span class="bad">rupture</span>'}</b></div>
          <div class="gauge ${months < 1 ? 'low' : ''}"><i style="width:${pct}%;background:${RES[r].color}"></i></div>
          <small class="flux muted">${perMonth(q)} · réserve ${fmt(have)} t · achète ${priceAt(s, b, r).toFixed(1)} sest./t</small></div></div>`;
      }).join('')}</div>`;
      if (next) {
        const cur = tierGoods(c.tier, s.era), newGoods = tierGoods(c.tier + 1, s.era).filter(r => !cur.includes(r));
        h += `<p class="muted">Pour devenir ${next.name.toLowerCase()}, la ville devra aussi recevoir : ${newGoods.map(r => resChip(r)).join(' ')}${c.tier + 1 === 5 && !s.techs.includes('capitales') ? ' — et il faut la technologie Capitales provinciales' : ''}</p>`;
      }
    }

    if (d.recipe && b.built) {
      const need = this.sim.workersNeeded(b), rate = this.sim.rate(b), cap = d.storage * b.level;
      const outR = Object.keys(d.recipe.out)[0] as ResId, real = b.flow ? b.flow.pin[outR] ?? 0 : undefined;
      const items: [string, string, string?][] = [[real === undefined ? '—' : `${fmt(real)} t`, 'produites le mois dernier (réel)', real === undefined ? undefined : real >= rate * 0.8 ? 'good' : real > 0 ? 'warn' : 'bad'], [`${rate.toFixed(1)} t`, 'par mois au maximum', rate > 0 ? 'good' : 'bad'], [`${b.staff} / ${need}`, b.staff > need ? `ouvriers (+${Math.round(50 * (b.staff - need) / need)} % de renfort)` : 'ouvriers', b.staff >= need ? 'good' : b.staff ? 'warn' : 'bad']];
      const wb = wonderProdMult(s, b);
      if (wb > 1) items.push([`+${Math.round((wb - 1) * 100)} %`, 'bonus de merveille', 'good']);
      items.push([`${fmt(b.produced)} t`, 'produites au total']);
      h += this.kpis(items);
      // schéma de production : entrées → sorties, par mois au niveau actuel
      const ins = Object.entries(d.recipe.in) as [ResId, number][], outs = Object.entries(d.recipe.out) as [ResId, number][];
      const k = LEVEL_MULT[b.level];
      h += `<div class="recipe">${ins.length ? ins.map(([r, q]) => `<span class="rc">${resIcon(r, 'ri big')}<small>${fmt(q * k)} t</small></span>`).join('<span class="plus">+</span>') + '<span class="arrow">➜</span>' : ''}
        ${outs.map(([r, q]) => `<span class="rc out">${resIcon(r, 'ri big')}<small>${fmt(q * k)} t</small></span>`).join('')}<small class="muted per">par mois à plein régime</small></div>
        <div class="gauge thin"><i style="width:${Math.min(100, b.acc * 100)}%"></i></div>`;
      if (d.deposit && b.dep !== null) {
        const dep = this.geo.deposits[b.dep];
        h += `<p class="muted">Gisement : <b>${esc(dep.name)}</b></p>`;
      }
      h += `<h3>Stock</h3>${this.stockRows(b, [...ins.map(([r]) => r), ...outs.map(([r]) => r)], () => cap)}`;
    }

    if (b.type === 'port_mer' && b.built) {
      const cs = s.buildings.filter(c => c.type === 'comptoir' && c.sea === b.sea), sp = VEH.navire.speed;
      h += `<h3>Routes maritimes · ${b.sea === 'mediterranee' ? 'Méditerranée' : 'Atlantique, Manche et mer du Nord'}</h3>
        <p class="muted">Les navires marchands partent d'ici vers les comptoirs d'outre-mer : ce qu'ils y déchargent est vendu, et ils peuvent y charger ce que tu as acheté au comptoir.</p>`;
      h += cs.map(c => {
        const p = SEA_PARTNERS.find(x => x.id === c.sp)!, route = this.geo.seaPath(b.x, b.y, c.x, c.y);
        const sold = s.stats.soldMonth['mer:' + p.id] ?? 0, vol = seaVolume(s, p);
        return `<div class="seap"><div class="seap-h"><b>${esc(p.name)}</b><small class="muted">${route ? `${fmt(route.len)} km · ${Math.max(1, Math.round(route.len / sp))} j de mer` : 'inaccessible'}</small></div>
          <div class="seap-row"><small class="muted">Achète :</small>${p.buys.filter(r => RES[r].era <= s.era).map(r => `<span class="res">${resIcon(r)}${RES[r].name} <b>${seaPrice(s, c, p, r).toFixed(1)}</b></span>`).join('')}</div>
          <div class="seap-row"><small class="muted">Vend :</small>${p.sells.map(r => `<span class="res">${resIcon(r)}${RES[r].name}</span>`).join('')}</div>
          <div class="seap-row"><small class="muted">${fmt(sold)} / ${vol} t vendues ce mois</small><span class="grow"></span>${route ? `<button class="primary" data-act="sealine" data-id="${b.id}" data-c="${c.id}">+ Ligne de navire</button>` : ''}<button data-act="goto" data-id="${c.id}">Voir</button></div></div>`;
      }).join('') || '<p class="muted">Aucun comptoir sur cette mer.</p>';
    }
    if (isStore(b) && b.built) {
      const cap = d.storage * b.level, list = (Object.entries(b.stock) as [ResId, number][]).filter(([, q]) => q >= 0.5).sort((x, y) => y[1] - x[1]);
      const total = list.reduce((a, [, q]) => a + q, 0);
      const f = b.flow, inM = Object.values({ ...(f?.pin ?? {}) }).reduce((a, q) => a + (q ?? 0), 0), outM = Object.values({ ...(f?.pout ?? {}) }).reduce((a, q) => a + (q ?? 0), 0);
      h += this.kpis([[`${fmt(total)} / ${fmt(cap)} t`, 'remplissage', total >= cap * 0.95 ? 'bad' : total >= cap * 0.8 ? 'warn' : ''], [`${inM >= 0.5 ? '+' : ''}${fmt(inM)} t`, 'entrées (mois dernier)'], [`${outM >= 0.5 ? '−' : ''}${fmt(outM)} t`, 'sorties (mois dernier)'], [`${b.staff} / ${this.sim.workersNeeded(b)}`, 'ouvriers']]);
      // jauge empilée : une couleur par ressource
      h += `<div class="stack">${list.map(([r, q]) => `<i style="width:${q / cap * 100}%;background:${RES[r].color}" title="${RES[r].name} : ${fmt(q)} t"></i>`).join('')}</div>`;
      h += `<h3>Contenu</h3>${list.length ? this.stockRows(b, list.map(([r]) => r), () => 0, r => {
        const pr = localPrice(s, r), q = Math.floor(b.stock[r] ?? 0);
        return q >= 1 ? `<div class="buy"><small class="muted">Vendre sur place : ${pr.toFixed(1)} sest./t</small><button data-act="sell" data-id="${b.id}" data-r="${r}" data-q="10">10 t (${fmt(pr * Math.min(10, q))})</button><button data-act="sell" data-id="${b.id}" data-r="${r}" data-q="${q}">Tout (${fmt(pr * q)})</button></div>` : '';
      }) : '<p class="muted">Vide.</p>'}<p class="muted">La vente sur place à un marchand local est immédiate mais moins chère que dans une ville ou à l'étranger.</p>`;
    } else if (!d.recipe && !b.city) {
      const list = (Object.entries(b.stock) as [ResId, number][]).filter(([, q]) => q >= 0.5);
      if (list.length) h += `<h3>Stock</h3><div class="chips">${list.map(([r, q]) => resChip(r, q)).join(' ')}</div>`;
      if (d.workers && b.built) h += `<p>Ouvriers : <b>${b.staff} / ${this.sim.workersNeeded(b)}</b></p>`;
    }

    h += this.buildingLines(b);
    h += '<div class="actions">';
    if (b.built && !b.upgrading && d.recipe) h += `<button data-act="pauseb" data-id="${b.id}" class="${b.paused ? 'primary' : ''}">${b.paused ? '▶ Reprendre la production' : '⏸ Mettre en pause'}</button>`;
    if (!b.built || b.upgrading) h += `<button data-act="pauseb" data-id="${b.id}" class="${b.paused ? 'primary' : ''}">${b.paused ? '▶ Reprendre le chantier' : '⏸ Mettre le chantier en pause'}</button>`;
    h += `<button class="danger" data-act="demolish" data-id="${b.id}">Démolir</button></div>`;
    return h;
  }

  private buildPanel(): string {
    const s = this.s;
    const km = costMult(s);
    const card = (t: BType) => {
      const d = BUILD[t], ok = hasTech(s, d.tech);
      const tech = d.tech ? TECHS.find(x => x.id === d.tech)! : null;
      return `<button class="card" data-act="build" data-type="${t}" ${ok ? '' : 'disabled'}>
        <img src="${t === 'village' ? cityIconUrl(0) : bIconUrl(t)}"><span><b>${d.name}${km < 1 && ok ? ` <span class="pill good">−${Math.round((1 - km) * 100)} %</span>` : ''}</b><small>${ok ? `${fmt(buildMoney(s, t))} sesterces${Object.keys(d.cost).length ? ` · ${costList(scaleStock(d.cost, km))}` : ' · sans matériaux'}` : `🔒 ${tech!.name}`}</small>
        <small class="muted">${d.recipe ? (Object.keys(d.recipe.in).length ? (Object.keys(d.recipe.in) as ResId[]).map(r => RES[r].name).join(' + ') + ' → ' : '') + (Object.keys(d.recipe.out) as ResId[]).map(r => RES[r].name).join(', ') : esc(d.desc)}</small></span></button>`;
    };
    // regroupement par catégorie, avec la couleur des pictogrammes
    const types = (Object.keys(BUILD) as BType[]).filter(t => !BUILD[t].hidden && BUILD[t].era <= s.era);
    const groups = Object.entries(CATEGORY).map(([id, c]) => {
      const list = types.filter(t => BCAT[t] === id);
      return list.length ? `<h3 class="cat" style="--cc:${c.color}"><i></i>${c.name}</h3><div class="cards">${list.map(card).join('')}</div>` : '';
    }).join('');
    return `<h2 class="ph">${IC.build}Construire</h2><p class="muted">Les matériaux sont livrés sur le chantier depuis un entrepôt relié par la route.</p>${groups}`;
  }

  private linesPanel(): string {
    const s = this.s;
    if (this.view.selectedLine !== null) {
      const l = s.lines.find(x => x.id === this.view.selectedLine);
      if (l) return this.lineEditor(l);
    }
    // onglets par ressource transportée
    const resUsed = [...new Set(s.lines.flatMap(l => this.lineRes(l)))];
    if (this.lineFilter !== 'all' && !resUsed.includes(this.lineFilter)) this.lineFilter = 'all';
    const tabs = s.lines.length ? `<div class="tabs"><button data-act="lfilter" data-r="all" class="${this.lineFilter === 'all' ? 'on' : ''}">Toutes <b>${s.lines.length}</b></button>${resUsed.map(r => `<button data-act="lfilter" data-r="${r}" class="${this.lineFilter === r ? 'on' : ''}">${resIcon(r)}${RES[r].name} <b>${s.lines.filter(l => this.lineRes(l).includes(r)).length}</b></button>`).join('')}</div>` : '';
    const shown = this.lineFilter === 'all' ? s.lines : s.lines.filter(l => this.lineRes(l).includes(this.lineFilter as ResId));
    const rows = tabs + shown.map(l => this.lineCard(l)).join('');
    return `<h2 class="ph">${IC.lines}Lignes de transport</h2>
      <div class="actions top"><button class="primary" data-act="newline">+ Nouvelle ligne</button>
      ${s.lines.length ? `<button data-act="pauseall">${s.lines.every(l => l.paused) ? '▶ Reprendre toutes' : '⏸ Tout mettre en pause'}</button><button class="danger" data-act="delall">Supprimer toutes les lignes</button>` : ''}</div>
      <p class="muted">Chaque ligne relie des arrêts : on y charge une ou plusieurs ressources, puis on les décharge plus loin (entrepôt, atelier, ville ou poste-frontière).</p>
      ${rows || '<p>Aucune ligne pour l\'instant.</p>'}`;
  }
  /** Nom court d'un bâtiment (sans le nom du gisement) */
  private short(id: number) { const b = getB(this.s, id); return b ? b.name.split(' — ')[0] : '?'; }
  lineLabel(l: Line) {
    if (l.name) return l.name;
    if (!l.stops.length) return 'Nouvelle ligne';
    if (l.stops.length === 1) return `${this.short(l.stops[0].bid)} → …`;
    return `${this.short(l.stops[0].bid)} → ${this.short(l.stops[l.stops.length - 1].bid)}`;
  }
  /** Ressources chargées sur la ligne */
  lineRes(l: Line) { return [...new Set(l.stops.flatMap(st => st.action === 'load' ? st.res : []))]; }
  /** Fiche lisible d'une ligne : départ → arrivée, matériaux, véhicules, recettes */
  private lineCard(l: Line) {
    const s = this.s, vs = s.vehicles.filter(v => v.line === l.id), n = l.stops.length;
    const m = l.moved, month = m?.prev ?? {}, total = m?.total ?? {};
    const stops = l.stops.map((st, i) => {
      const role = i === 0 ? 'Départ' : i === n - 1 ? 'Terminus' : `Arrêt ${i}`;
      const b = getB(s, st.bid), moved = (Object.entries(month[i] ?? {}) as [ResId, number][]).filter(([, q]) => q >= 0.5);
      const tot = (Object.entries(total[i] ?? {}) as [ResId, number][]).filter(([, q]) => q >= 0.5);
      const verb = st.action === 'load' ? 'chargé' : b?.city || b?.partner || b?.type === 'comptoir' || b?.type === 'taverne' ? 'vendu' : 'déposé';
      const what = st.action === 'load'
        ? `<span class="lc-act load">Charge</span> ${st.res.map(r => resChip(r) + (st.pct?.[r] ? ` <small>${st.pct[r]} %</small>` : '')).join(' ') || '<small class="warn">aucune ressource choisie</small>'}${(st.share ?? 100) < 100 ? ` <small>jusqu'à ${st.share} % du véhicule</small>` : ''}`
        : `<span class="lc-act unload">${b?.city || b?.partner || b?.type === 'comptoir' || b?.type === 'taverne' ? 'Vend' : 'Dépose'}</span> ${st.res.map(r => resChip(r)).join(' ')} <small>${(st.share ?? 100) >= 100 ? (st.res.length ? 'tout' : 'tout le reste') : `${st.share} % du chargement`}</small>`;
      return `<li class="${i === 0 ? 'first' : i === n - 1 ? 'last' : ''}"><span class="lc-dot">${i + 1}</span><div class="lc-stop">
        <div class="lc-st-head"><span class="lc-role">${role}</span><b>${esc(b?.name.split(' — ')[0] ?? '?')}</b></div>
        <div class="lc-st-what">${what}</div>
        <div class="lc-st-qty"><small class="muted">Mois dernier :</small> ${moved.length ? moved.map(([r, q]) => `${resIcon(r)}<b>${fmt(q)} t</b>`).join(' ') : '<small class="muted">rien</small>'}</div>
        <div class="lc-st-qty"><small class="muted">Total ${verb} :</small> ${tot.length ? tot.map(([r, q]) => `${resIcon(r)}<b>${fmt(q)} t</b>`).join(' ') : '<small class="muted">rien encore</small>'}</div></div></li>`;
    }).join('');
    const cap = VEH[l.vtype].cap * vs.length;
    return `<div class="linebox" style="--lc:${l.color}" data-line="${l.id}">
      <button class="linecard lc-top" data-act="line" data-id="${l.id}" style="--lc:${l.color}">
        <span class="lc-head"><i class="dot" style="background:${l.color}"></i><b>${esc(this.lineLabel(l))}</b>${l.paused ? '<span class="pill info">En pause</span>' : ''}<span class="lc-edit">Modifier ›</span></span>
        <span class="lc-sub"><img class="vic" src="${vIconUrl(l.vtype)}" alt="">${vs.length} × ${VEH[l.vtype].name.toLowerCase()} · ${fmt(cap)} t par tournée · ${fmt(vs.reduce((a, v) => a + v.income, 0))} sesterces de recettes</span>
      </button>
      ${n ? `<ol class="lc-stops">${stops}</ol>` : '<p class="warn">Ajoute au moins deux arrêts.</p>'}</div>`;
  }
  /** Ressources proposées en priorité pour un arrêt de chargement */
  /** Ce qu'un partenaire étranger (poste-frontière ou comptoir) vend ; null pour un bâtiment ordinaire */
  private foreignSells(b: Building): ResId[] | null {
    if (b.partner) return PARTNERS.find(p => p.id === b.partner)!.sells;
    if (b.type === 'comptoir') return SEA_PARTNERS.find(p => p.id === b.sp)?.sells ?? [];
    if (b.type === 'taverne') { const f = tradeFaction(this.s, b); return f ? factionSells(f) : null; }
    return null;
  }
  private suggestRes(b: Building): ResId[] {
    const fs = this.foreignSells(b); if (fs) return fs;
    const d = BUILD[b.type];
    const out = d.recipe ? Object.keys(d.recipe.out) as ResId[] : [];
    const stock = (Object.entries(b.stock) as [ResId, number][]).filter(([, q]) => q >= 1).map(([r]) => r);
    const list = [...new Set([...out, ...stock])];
    return list.length ? list : ['bois'];
  }
  private lineEditor(l: Line): string {
    const s = this.s;
    const vs = s.vehicles.filter(v => v.line === l.id);
    const vtypes = (Object.keys(VEH) as VType[]).filter(t => t !== 'convoi' && t !== 'chaland' && hasTech(s, VEH[t].tech));
    const loaded = this.lineRes(l);
    const stops = l.stops.map((st, i) => {
      const b = getB(s, st.bid);
      const role = i === 0 ? '<span class="stopTag start">Départ</span>' : i === l.stops.length - 1 ? '<span class="stopTag end">Arrivée</span>' : '<span class="stopTag">Étape</span>';
      let warn = '';
      const water = VEH[l.vtype].water;
      if (b && VEH[l.vtype].sea) {
        if (b.type !== 'port_mer' && b.type !== 'comptoir') warn = '<small class="warn">un navire n\'accoste qu\'à un port de commerce ou à un comptoir</small>';
        else if (i > 0) { const p = getB(s, l.stops[i - 1].bid); if (p && !this.geo.seaPath(p.x, p.y, b.x, b.y)) warn = '<small class="warn">pas de route maritime depuis l\'arrêt précédent (autre mer)</small>'; }
      } else if (b && water) { if (!this.geo.nearestNav(b.x, b.y, 8)) warn = '<small class="warn">trop loin d\'un fleuve navigable (plus de 8 km) : les barges ne peuvent pas y accoster</small>'; else if (i > 0) { const p = getB(s, l.stops[i - 1].bid); if (p && !this.geo.riverPath(p.x, p.y, b.x, b.y)) warn = '<small class="warn">fleuves non reliés</small>'; } }
      else if (b && b.node === null) warn = '<small class="warn">non relié par la route</small>';
      else if (b && i > 0) { const p = getB(s, l.stops[i - 1].bid); if (p && p.node !== null && b.node !== null && !findPath(s, p.node, b.node, VEH[l.vtype].voie)) warn = `<small class="warn">aucun itinéraire${VEH[l.vtype].voie ? ' par voie romaine' : ''} depuis l'arrêt précédent</small>`; }
      if (b && st.action === 'unload' && loaded.length && !b.city && !b.partner && !isStore(b) && b.type !== 'taverne') {
        const ok = b.type === 'comptoir' ? loaded.filter(r => SEA_PARTNERS.find(p => p.id === b.sp)!.buys.includes(r)) : loaded.filter(r => BUILD[b.type].recipe?.in[r]);
        if (!ok.length) warn += ' <small class="warn">ce bâtiment n\'accepte aucun de ces matériaux</small>';
      }
      let what = '';
      if (st.action === 'load') {
        const sugg = b ? this.suggestRes(b) : [];
        const others = (Object.keys(RES) as ResId[]).filter(r => RES[r].era <= s.era && r !== 'eau' && !st.res.includes(r));
        const opt = (r: ResId) => `<option value="${r}">${RES[r].name}${b && (b.stock[r] ?? 0) >= 1 ? ` (${fmt(b.stock[r]!)} en stock)` : ''}</option>`;
        const cap = VEH[l.vtype].cap, sum = st.res.reduce((a, r) => a + (st.pct?.[r] ?? 0), 0);
        const pctSel = (r: ResId) => { const p = st.pct?.[r] ?? 0; return `<select class="pct" data-field="pct" data-i="${i}" data-r="${r}" title="Part du véhicule"><option value="0" ${p ? '' : 'selected'}>libre</option>${[10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100].map(v => `<option value="${v}" ${p === v ? 'selected' : ''}>${v} % (${fmt(Math.max(1, Math.round(cap * v / 100)))} t)</option>`).join('')}</select>`; };
        what = `<div class="loadres">${st.res.map(r => `<div class="lr">${resChip(r)}${pctSel(r)}<button class="x" data-act="delres" data-i="${i}" data-r="${r}" title="Retirer">✕</button></div>`).join('') || '<small class="warn">choisis au moins une ressource</small>'}</div>
          ${sum > 100 ? '<small class="warn">Le total dépasse 100 % : la place manquera pour tout charger.</small>' : ''}
          <select data-field="addres" data-i="${i}"><option value="">+ Ajouter une ressource…</option>
          ${sugg.filter(r => others.includes(r)).map(opt).join('')}<option disabled>──────</option>${others.filter(r => !sugg.includes(r)).map(opt).join('')}</select>`;
        const fs = b ? this.foreignSells(b) : null;
        if (b && fs) {
          const bad = st.res.filter(r => !fs.includes(r));
          what += `<p class="hint info">Achat automatique au chargement : ${st.res.filter(r => fs.includes(r)).map(r => `${RES[r].name.toLowerCase()} ${(b.partner ? importPrice(s, b, r) : seaImportPrice(s, b, SEA_PARTNERS.find(p => p.id === b.sp)!, r)).toFixed(1)} sest./t`).join(', ') || '—'}.</p>${bad.length ? `<small class="warn">${esc(b.name)} ne vend pas : ${bad.map(r => RES[r].name.toLowerCase()).join(', ')}</small>` : ''}`;
        }
        const fill = st.share ?? 100, allFixed = st.res.length > 0 && st.res.every(r => st.pct?.[r]);
        if (allFixed) what += `<small class="muted">Chargement prévu : ${st.res.map(r => `${fmt(Math.max(1, Math.round(cap * st.pct![r]! / 100)))} t de ${RES[r].name.toLowerCase()}`).join(', ')}. Le véhicule repart quand tout est chargé, ou au bout de 6 jours.</small>`;
        else what += `<div><small class="muted">« libre » : la ressource se partage la place restante avec les autres ressources libres.</small></div><label class="share">Remplir le véhicule à <select data-field="share" data-i="${i}">${[100, 75, 50, 25].map(p => `<option value="${p}" ${fill === p ? 'selected' : ''}>${p === 100 ? 'plein' : p + ' %'} (${fmt(Math.max(1, Math.floor(cap * p / 100)))} t)</option>`).join('')}</select></label>
          <small class="muted">Le véhicule repart dès qu'il a chargé ${fill >= 100 ? 'sa pleine capacité' : `${fill} % de sa capacité`}, ou au bout de 6 jours d'attente.</small>`;
      } else {
        const sh = st.share ?? 100;
        const offer = loaded.filter(r => !st.res.includes(r));
        what = `<div class="chips sel"><small class="muted">Décharger :</small> ${st.res.map(r => `<button class="reschip" data-act="delres" data-i="${i}" data-r="${r}" title="Retirer">${resChip(r)} ✕</button>`).join('') || '<small><b>toutes les ressources</b></small>'}</div>
          ${offer.length ? `<select data-field="addres" data-i="${i}"><option value="">${st.res.length ? '+ Décharger aussi…' : '+ Ne décharger que…'}</option>${offer.map(r => `<option value="${r}">${RES[r].name}</option>`).join('')}</select>` : ''}`;
        what += `<label class="share">Déposer <select data-field="share" data-i="${i}">${[100, 75, 66, 50, 33, 25, 10].map(p => `<option value="${p}" ${sh === p ? 'selected' : ''}>${p === 100 ? 'tout le reste' : p + ' % du chargement'}</option>`).join('')}</select></label>
          <small class="muted">${b?.city || b?.partner || b?.type === 'comptoir' ? 'Vente' : 'Dépôt'}${sh < 100 ? ` de ${sh} % de ce qui a été chargé au départ ; le reste continue vers l'arrêt suivant` : ' de tout ce que le bâtiment accepte'}.</small>`;
      }
      return `<div class="stop" data-i="${i}"><span class="handle" data-i="${i}" title="Glisser pour changer l'ordre des arrêts">⠿</span><span class="n" style="background:${l.color}">${i + 1}</span><span class="grow">${role} <b>${esc(b?.name ?? '?')}</b> ${warn}<br>
        <select data-field="action" data-i="${i}"><option value="load" ${st.action === 'load' ? 'selected' : ''}>Charger</option><option value="unload" ${st.action === 'unload' ? 'selected' : ''}>Décharger</option></select>
        ${what}</span>
        <button data-act="delstop" data-i="${i}" title="Retirer l'arrêt">✕</button></div>`;
    }).join('');
    return `<h2><i class="dot" style="background:${l.color}"></i><input class="name" data-field="lname" value="${esc(l.name)}" placeholder="${esc(this.lineLabel({ ...l, name: '' }))}"></h2>
      ${l.stops.length >= 2 ? `<p class="route big"><span class="stopTag start">Départ</span>${esc(this.short(l.stops[0].bid))}<span class="arrow">→</span><span class="stopTag end">Arrivée</span>${esc(this.short(l.stops[l.stops.length - 1].bid))}</p>` : ''}
      <p class="muted">Le véhicule fait le tour des arrêts dans l'ordre, puis revient au départ. Il peut transporter plusieurs matériaux à la fois, dans la limite de sa capacité.</p>
      <p>Véhicule : <select data-field="vtype">${vtypes.map(t => `<option value="${t}" ${l.vtype === t ? 'selected' : ''}>${VEH[t].name} (${VEH[t].cap} t, ${VEH[t].speed} km/j)</option>`).join('')}</select></p>
      <h3>Arrêts <small class="muted">— glisse ⠿ pour changer l'ordre</small></h3>${stops || '<p class="muted">Ajoute au moins deux arrêts.</p>'}
      <div class="actions"><button data-act="pickstop">+ Ajouter un arrêt sur la carte</button></div>
      <h3>Véhicules (${vs.length})</h3>
      ${vs.map(v => `<button class="row" data-act="selv" data-id="${v.id}"><img class="vic" src="${vIconUrl(v.type)}"><span>${{ go: 'En route', load: 'Chargement', unload: 'Déchargement', lost: 'Aucun itinéraire !', parked: 'À l\'arrêt (ligne en pause)' }[v.state]}</span><span class="chips">${cargoList(v.cargo) || '<small class="muted">vide</small>'}</span></button>`).join('')}
      <p class="muted">${VEH[l.vtype].name} : ${fmt(VEH[l.vtype].price)} sesterces, frais ${VEH[l.vtype].upkeep}/mois.</p>
      <div class="actions"><button class="primary" data-act="buyv" ${l.stops.length >= 2 ? '' : 'disabled'}>+ Acheter un véhicule</button>${vs.length ? `<button data-act="sellv" data-id="${vs[vs.length - 1].id}">− Vendre un véhicule</button>` : ''}</div>
      <p class="muted">Recettes : ${fmt(vs.reduce((a, v) => a + v.income, 0))} sesterces</p>
      <div class="actions"><button data-act="lines">← Toutes les lignes</button><button data-act="pausel" class="${l.paused ? 'primary' : ''}">${l.paused ? '▶ Reprendre la ligne' : '⏸ Mettre la ligne en pause'}</button><button class="danger" data-act="delline">Supprimer la ligne</button></div>`;
  }

  /** Économie : finances et bilan des ressources sur tout le territoire */
  private economyPanel(): string {
    const s = this.s;
    // résultats mensuels à partir du grand livre (cumuls de fin de mois)
    const L = s.ledger, months: { m: number; inc: number; exp: number }[] = [];
    for (let i = Math.max(1, L.length - 12); i < L.length; i++) months.push({ m: L[i].month, inc: L[i].income - L[i - 1].income, exp: L[i].expenses - L[i - 1].expenses });
    const last = months[months.length - 1];
    let h = `<h2 class="ph">${IC.economy}Économie</h2>`;
    h += this.kpis([[fmt(s.money), 'sesterces en caisse', s.money < 0 ? 'bad' : ''],
      [last ? `+${fmt(last.inc)}` : '—', 'revenus (mois dernier)'], [last ? `−${fmt(last.exp)}` : '—', 'dépenses (mois dernier)'],
      [last ? `${last.inc - last.exp >= 0 ? '+' : '−'}${fmt(Math.abs(last.inc - last.exp))}` : '—', 'résultat', last ? (last.inc - last.exp >= 0 ? 'good' : 'bad') : '']]);
    if (months.length >= 2) {
      // barres divergentes : bénéfice au-dessus de l'axe (bleu), perte en dessous (rouge)
      const W = 330, H = 120, pad = 18, bw = (W - 8) / months.length, nets = months.map(x => x.inc - x.exp);
      const max = Math.max(1, ...nets.map(Math.abs)), y0 = H / 2, k = (H / 2 - pad) / max;
      const bars = months.map((x, i) => {
        const v = nets[i], hgt = Math.max(1, Math.abs(v) * k), y = v >= 0 ? y0 - hgt : y0, cx = 4 + i * bw;
        const lbl = `${MONTHS_SHORT[x.m % 12]} : ${v >= 0 ? '+' : '−'}${fmt(Math.abs(v))} (revenus ${fmt(x.inc)}, dépenses ${fmt(x.exp)})`;
        return `<g class="fb"><rect x="${cx}" y="0" width="${bw}" height="${H}" fill="transparent"/>
          <rect x="${cx + 2}" y="${y}" width="${bw - 4}" height="${hgt}" rx="2" fill="${v >= 0 ? '#2a78d6' : '#d4483b'}"/>
          <text class="tt" x="${W / 2}" y="12" text-anchor="middle">${esc(lbl)}</text></g>`;
      }).join('');
      h += `<h3>Résultat mensuel (12 derniers mois)</h3><svg class="fin" viewBox="0 0 ${W} ${H}" role="img" aria-label="Résultat mensuel">
        <line x1="0" x2="${W}" y1="${y0}" y2="${y0}" stroke="#b9ae9c" stroke-width="1"/>${bars}</svg>
        <p class="legend"><span><i style="background:#2a78d6"></i>bénéfice</span><span><i style="background:#d4483b"></i>perte</span><small class="muted">touche une barre pour le détail</small></p>`;
    } else h += '<p class="muted">Le graphique des finances apparaîtra après deux mois de jeu.</p>';

    // bilan des ressources
    const stock: Stock = {}, prod: Stock = {}, real: Stock = {}, use: Stock = {}, cityStock: Stock = {};
    const add = (o: Stock, r: ResId, q: number) => { o[r] = (o[r] ?? 0) + q; };
    for (const b of s.buildings) {
      if (b.city) { for (const [r, q] of Object.entries(cityNeeds(b)) as [ResId, number][]) { add(use, r, q); add(cityStock, r, b.city.stock[r] ?? 0); } continue; }
      for (const [r, q] of Object.entries(b.stock) as [ResId, number][]) add(stock, r, q);
      const d = BUILD[b.type];
      if (d.recipe && b.built) {
        const rate = this.sim.rate(b), main = Object.values(d.recipe.out)[0]!;
        for (const [r, q] of Object.entries(d.recipe.out) as [ResId, number][]) { add(prod, r, rate * q / main); add(real, r, b.flow?.pin[r] ?? 0); }
        for (const [r, q] of Object.entries(d.recipe.in) as [ResId, number][]) add(use, r, rate * q / main);
      }
    }
    const res = (Object.keys(RES) as ResId[]).filter(r => (stock[r] ?? 0) >= 0.5 || (prod[r] ?? 0) > 0 || (use[r] ?? 0) > 0);
    if (this.ecoTab !== 'all' && !res.includes(this.ecoTab)) this.ecoTab = 'all';
    const tabs = `<div class="tabs"><button data-act="ecotab" data-r="all" class="${this.ecoTab === 'all' ? 'on' : ''}">Vue d'ensemble</button>${res.map(r => `<button data-act="ecotab" data-r="${r}" class="${this.ecoTab === r ? 'on' : ''}">${resIcon(r)}${RES[r].name}</button>`).join('')}</div>`;
    if (this.ecoTab !== 'all') return `<h2 class="ph">${IC.economy}Économie</h2>${tabs}${this.resourceTab(this.ecoTab, stock, prod, real, use, cityStock)}`;
    h = h.replace(`<h2 class="ph">${IC.economy}Économie</h2>`, `<h2 class="ph">${IC.economy}Économie</h2>${tabs}${this.modsHtml()}`);
    h += `<h3>Ressources (par mois)</h3>`;
    h += res.length ? `<table class="eco"><tr><th></th><th class="num">stock</th><th class="num">produit<br><small>réel / max</small></th><th class="num">consommé</th><th class="num">bilan</th></tr>
      ${res.map(r => {
        const bal = (prod[r] ?? 0) - (use[r] ?? 0);
        return `<tr class="click" data-act="ecotab" data-r="${r}"><td>${resChip(r)}</td><td class="num">${fmt(stock[r] ?? 0)}</td><td class="num">${(prod[r] ?? 0) > 0 ? `${fmt(real[r] ?? 0)} <small class="muted">/ ${(prod[r] ?? 0).toFixed(1)}</small>` : '0'}</td><td class="num">${(use[r] ?? 0).toFixed(1)}</td>
          <td class="num ${bal > 0.05 ? 'pos' : bal < -0.05 ? 'neg' : ''}">${bal > 0.05 ? '▲ +' : bal < -0.05 ? '▼ −' : ''}${Math.abs(bal).toFixed(1)}</td></tr>`;
      }).join('')}</table>
      <p class="muted">Touche une ressource pour voir le détail. Stock : entrepôts et ateliers. Produit : réellement le mois dernier / maximum théorique. Consommé : besoins des villes et matières premières des ateliers, à plein régime. Le bilan compare les maximums.</p>`
      : '<p class="muted">Aucune ressource pour l\'instant.</p>';
    return h;
  }

  /** Onglet d'une ressource : qui la produit, qui la consomme, où elle est stockée, à quel prix */
  private resourceTab(r: ResId, stock: Stock, prod: Stock, real: Stock, use: Stock, cityStock: Stock): string {
    const s = this.s, bal = (prod[r] ?? 0) - (use[r] ?? 0);
    let h = `<div class="res-head">${resIcon(r, 'ri huge')}<div><h3>${RES[r].name}</h3><small class="muted">Prix de base ${RES[r].price} sesterces la tonne</small></div></div>`;
    h += this.kpis([[`${fmt(stock[r] ?? 0)} t`, 'en stock'], [`${fmt(real[r] ?? 0)} t`, 'produit le mois dernier (réel)'], [`${(prod[r] ?? 0).toFixed(1)} t`, 'produit / mois au maximum'], [`${(use[r] ?? 0).toFixed(1)} t`, 'consommé / mois'],
      [`${bal >= 0 ? '+' : '−'}${Math.abs(bal).toFixed(1)} t`, 'bilan / mois', bal > 0.05 ? 'good' : bal < -0.05 ? 'bad' : '']]);
    const row = (b: Building, main: string, sub: string) => `<button class="row" data-act="goto" data-id="${b.id}"><img class="vic" src="${bIconUrl(b.type, b.level)}" alt=""><span class="grow"><b>${esc(b.name.split(' — ')[0])}</b><br><small class="muted">${sub}</small></span><b class="num">${main}</b></button>`;
    const producers = s.buildings.filter(b => b.built && BUILD[b.type].recipe?.out[r]);
    h += `<h3>Production</h3>${producers.map(b => { const d = BUILD[b.type], rate = this.sim.rate(b) * d.recipe!.out[r]! / Object.values(d.recipe!.out)[0]!; const real = b.flow ? b.flow.pin[r] ?? 0 : undefined; return row(b, `${real === undefined ? '—' : fmt(real)} t <small class="muted">/ ${rate.toFixed(1)} max</small>`, `réel le mois dernier / maximum théorique · ${buildingStatus(this.sim, b).label} · stock ${fmt(b.stock[r] ?? 0)} t`); }).join('') || '<p class="muted">Aucun bâtiment ne produit cette ressource.</p>'}`;
    const cityUsers = s.buildings.filter(b => b.city && b.built && cityNeeds(b)[r]);
    const shops = s.buildings.filter(b => b.built && BUILD[b.type].recipe?.in[r]);
    h += `<h3>Consommation</h3>${cityUsers.map(b => { const q = cityNeeds(b)[r]!; const m = q ? (b.city!.stock[r] ?? 0) / q : 0; return row(b, `${q.toFixed(1)} t/mois`, `${TIERS[b.city!.tier].name} · réserve ${m >= 1 ? Math.floor(m) + ' mois' : 'moins d\'un mois'} · achète ${priceAt(s, b, r).toFixed(1)} sest./t`); }).join('')}
      ${shops.map(b => { const d = BUILD[b.type], q = this.sim.rate(b) * d.recipe!.in[r]! / Object.values(d.recipe!.out)[0]!; return row(b, `${q.toFixed(1)} t/mois`, `matière première · stock ${fmt(b.stock[r] ?? 0)} t`); }).join('')}
      ${!cityUsers.length && !shops.length ? '<p class="muted">Rien ne consomme cette ressource pour l\'instant.</p>' : ''}`;
    const stores = s.buildings.filter(b => isStore(b) && (b.stock[r] ?? 0) >= 0.5).sort((a, z) => (z.stock[r] ?? 0) - (a.stock[r] ?? 0));
    h += `<h3>Stocks</h3>${stores.map(b => row(b, `${fmt(b.stock[r]!)} t`, BUILD[b.type].name)).join('') || '<p class="muted">Aucun entrepôt n\'en contient.</p>'}
      ${(cityStock[r] ?? 0) >= 0.5 ? `<p class="muted">Réserves dans les villes : ${fmt(cityStock[r]!)} t.</p>` : ''}`;
    const buyers = s.buildings.filter(b => b.partner && PARTNERS.find(p => p.id === b.partner)!.buys.includes(r));
    const seaBuyers = s.buildings.filter(b => b.type === 'comptoir' && SEA_PARTNERS.find(p => p.id === b.sp)!.buys.includes(r));
    h += `<h3>Où la vendre</h3>${buyers.map(b => row(b, `${priceAt(s, b, r).toFixed(1)} /t`, 'Partenaire étranger (poste-frontière)')).join('')}${seaBuyers.map(b => { const p = SEA_PARTNERS.find(x => x.id === b.sp)!; return row(b, `${seaPrice(s, b, p, r).toFixed(1)} /t`, 'Outre-mer (comptoir, par navire)'); }).join('')}
      ${cityUsers.length ? '' : ''}<p class="muted">Vente sur place depuis un entrepôt : ${localPrice(s, r).toFixed(1)} sesterces la tonne.</p>`;
    return h;
  }

  // ---------- Arbre de recherche (plein écran) ----------
  private treeSel: string | null = null;
  private lineFilter: ResId | 'all' = 'all';
  private bLineTab: 'depart' | 'arrivee' = 'depart';
  private ecoTab: ResId | 'all' = 'all';
  private treeKey = '';
  openTree() { $('treeView').hidden = false; this.treeKey = ''; this.renderTree(); }
  closeTree() { $('treeView').hidden = true; }
  private treeClick(e: Event) {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tv]');
    if (!t) { if (e.target === $('treeView')) this.closeTree(); return; }
    const a = t.dataset.tv;
    if (a === 'close') this.closeTree();
    else if (a === 'node') this.treeSel = t.dataset.id!;
    else if (a === 'unsel') this.treeSel = null;
    else if (a === 'research') this.sim.research(t.dataset.id!);
    else if (a === 'next') { this.closeTree(); this.chapterModal(); }
    this.treeKey = ''; this.renderTree(); this.refresh();
  }
  private renderTree() {
    const s = this.s, techs = TECHS.filter(t => t.era === s.era);
    const key = `${s.techs.join(',')}|${Math.floor(s.rp)}|${this.treeSel}|${s.era}`;
    if (key === this.treeKey) return;
    this.treeKey = key;
    if (!techs.length) {
      // chapitre dont l'arbre n'est pas encore disponible
      $('treeView').innerHTML = `<div class="tv-box"><header class="tv-head"><div class="tv-title">${IC.research}<div><h2>Arbre de recherche</h2><small>${ERAS[s.era]}</small></div></div>
        <button class="tv-close" data-tv="close" title="Fermer">${IC.close}</button></header>
        <div class="tv-body" style="display:grid;place-items:center;padding:30px"><p class="muted">L'arbre de recherche du ${ERAS[s.era]} arrive dans une prochaine version. Tes points de recherche sont conservés.</p></div></div>`;
      return;
    }
    // ---- disposition : colonnes = rang dans l'arbre, bandes = branches ----
    const depth = (id: string): number => { const t = TECHS.find(x => x.id === id)!; return t.req.length ? 1 + Math.max(...t.req.map(depth)) : 0; };
    const NW = 156, NH = 58, CW = 176, RH = 68, PAD = 10, X0 = 134, BP = 8;
    const branchOf = new Map(techs.map(t => [t.id, t.branch]));
    // ordre des branches : celles qui partagent des liens côte à côte, pour qu'aucun trait ne traverse tout l'arbre
    const brs = BRANCHES.filter(b => techs.some(t => t.branch === b.id));
    const cross: [string, string][] = techs.flatMap(t => t.req.filter(r => branchOf.has(r) && branchOf.get(r) !== t.branch).map(r => [branchOf.get(r)!, t.branch] as [string, string]));
    const perms = (l: typeof brs): (typeof brs)[] => l.length <= 1 ? [l] : l.flatMap((x, i) => perms([...l.slice(0, i), ...l.slice(i + 1)]).map(p => [x, ...p]));
    const cost = (o: typeof brs) => { const ix = new Map(o.map((b, i) => [b.id as string, i])); return cross.reduce((a, [u, v]) => a + Math.abs(ix.get(u)! - ix.get(v)!), 0) * 100 + o.reduce((a, b, i) => a + Math.abs(i - brs.indexOf(b)), 0); };
    const order = perms(brs).reduce((best, o) => cost(o) < cost(best) ? o : best, brs);
    const band = new Map(order.map((b, i) => [b.id as string, i]));
    // dans une branche : une technologie liée à la branche du dessus monte, à celle du dessous descend
    const kids = (id: string) => techs.filter(t => t.req.includes(id));
    const pullMemo = new Map<string, number>();
    const pull = (id: string): number => {
      if (pullMemo.has(id)) return pullMemo.get(id)!;
      const t = techs.find(x => x.id === id)!, me = band.get(t.branch)!;
      const others = [...t.req.filter(r => branchOf.has(r)), ...kids(id).map(k => k.id)].filter(o => branchOf.get(o) !== t.branch);
      let v = others.reduce((a, o) => a + Math.sign(band.get(branchOf.get(o)!)! - me), 0);
      const same = kids(id).filter(k => k.branch === t.branch);
      if (same.length) v += 0.5 * same.reduce((a, k) => a + pull(k.id), 0) / same.length;
      pullMemo.set(id, v); return v;
    };
    const pos = new Map<string, { x: number; y: number }>();
    let y0 = PAD; const lanes: { br: typeof BRANCHES[number]; y: number; h: number; n: number; d: number }[] = [];
    for (const br of order) {
      const list = techs.filter(t => t.branch === br.id);
      const cols = new Map<number, typeof list>();
      for (const t of list) { const d = depth(t.id); if (!cols.has(d)) cols.set(d, []); cols.get(d)!.push(t); }
      const rows = Math.max(...[...cols.values()].map(c => c.length));
      const rowOf = new Map<string, number>();
      for (const d of [...cols.keys()].sort((a, z) => a - z)) {
        const want = (t: typeof list[number]) => { const p = pull(t.id); if (p > 0.01) return rows - 1; if (p < -0.01) return 0;
          const rs = t.req.map(r => rowOf.get(r)).filter((v): v is number => v !== undefined); return rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0; };
        const used = new Set<number>();
        for (const t of [...cols.get(d)!].sort((a, z) => Math.abs(pull(z.id)) - Math.abs(pull(a.id)))) {
          const w = want(t); let r = 0, bd = Infinity;
          for (let k = 0; k < rows; k++) if (!used.has(k) && Math.abs(k - w) < bd) { bd = Math.abs(k - w); r = k; }
          used.add(r); rowOf.set(t.id, r);
        }
      }
      for (const t of list) pos.set(t.id, { x: X0 + depth(t.id) * CW, y: y0 + BP + rowOf.get(t.id)! * RH });
      lanes.push({ br, y: y0, h: rows * RH - (RH - NH) + BP * 2, n: list.length, d: list.filter(t => s.techs.includes(t.id)).length });
      y0 += rows * RH - (RH - NH) + BP * 2 + 8;
    }
    const W = X0 + (Math.max(...techs.map(t => depth(t.id))) + 1) * CW, H = y0 + PAD;
    const state = (t: typeof techs[number]) => s.techs.includes(t.id) ? 'done' : !t.req.every(r => s.techs.includes(r)) ? 'locked' : s.rp >= t.cost ? 'ready' : 'avail';
    const unlocks = (id: string) => [
      ...(Object.keys(BUILD) as BType[]).filter(b => BUILD[b].tech === id).map(b => ({ name: BUILD[b].name, img: bIconUrl(b), res: Object.keys(BUILD[b].recipe?.out ?? {}) as ResId[] })),
      ...(Object.keys(BUILD) as BType[]).flatMap(b => { const ns = Object.entries(BUILD[b].levels ?? {}).filter(([, l]) => l.tech === id).map(([n]) => Number(n)); if (!ns.length) return [];
        const first = BUILD[b].levels![ns[0]];
        return [{ name: `${BUILD[b].name} ${ns.length > 1 ? `niveaux ${ns[0]} à ${ns[ns.length - 1]}` : `niveau ${ns[0]}`} : ${first.name.toLowerCase()}`, img: bIconUrl(b, ns[0]), res: Object.keys(BUILD[b].recipe?.out ?? {}) as ResId[] }]; }),
      ...(Object.keys(VEH) as VType[]).filter(v => VEH[v].tech === id).map(v => ({ name: VEH[v].name, img: vIconUrl(v), res: [] as ResId[] })),
      ...(Object.keys(ROADS) as RoadType[]).filter(r => ROADS[r].tech === id).map(r => ({ name: ROADS[r].name, img: '', res: [] as ResId[] }))];
    // liens à angle droit : de la droite de la carte au couloir juste avant la carte visée, puis à l'horizontale
    const edges = techs.flatMap(t => t.req.filter(r => pos.has(r)).map(r => {
      const a = pos.get(r)!, b = pos.get(t.id)!, x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2, gx = x2 - (CW - NW) / 2, k = 7;
      const cls = s.techs.includes(t.id) ? 'done' : s.techs.includes(r) ? 'open' : '';
      const sg = Math.sign(y2 - y1);
      const d = Math.abs(y2 - y1) < 1 ? `M${x1} ${y1}H${x2}` : `M${x1} ${y1}H${gx - k}Q${gx} ${y1} ${gx} ${y1 + sg * k}V${y2 - sg * k}Q${gx} ${y2} ${gx + k} ${y2}H${x2}`;
      return `<path class="${cls}" d="${d}"/>`;
    })).join('');
    const laneHtml = lanes.map(l => `<div class="tv-lane" style="top:${l.y}px;height:${l.h}px;width:${W - PAD}px"><div class="tv-lane-h">${IC[l.br.id]}<b>${l.br.name}</b><small>${l.d} / ${l.n}</small></div></div>`).join('');
    const nodes = techs.map(t => {
      const p = pos.get(t.id)!, st = state(t), u = unlocks(t.id);
      return `<button class="tv-node ${st} ${this.treeSel === t.id ? 'sel' : ''}" data-tv="node" data-id="${t.id}" style="left:${p.x}px;top:${p.y}px;width:${NW}px;height:${NH}px">
        <span class="tv-ic">${u[0]?.img ? `<img src="${u[0].img}" alt="">` : IC[t.branch]}</span>
        <span class="tv-txt"><b>${t.name}</b><small>${st === 'done' ? `${IC.check} Découverte` : st === 'locked' ? `${IC.lock} ${t.cost} pts` : `${t.cost} pts`}</small></span></button>`;
    }).join('');
    // téléphone : petite bulle au-dessus de la technologie touchée (ce qu'elle débloque, bouton Rechercher), fermable
    const pt = techs.find(t => t.id === this.treeSel), pp = pt && pos.get(pt.id), pst = pt && state(pt);
    const PW = 236, below = !!pp && pp.y < 190;
    const pop = pt && pp ? `<div class="tv-pop ${below ? 'below' : ''}" style="left:${Math.max(4, Math.min(W - PW - 4, pp.x + NW / 2 - PW / 2))}px;top:${below ? pp.y + NH + 8 : pp.y - 8}px;width:${PW}px">
      <div class="tv-pop-h"><b>${pt.name}</b><button class="tv-pop-x" data-tv="unsel" title="Fermer">${IC.close}</button></div>
      ${unlocks(pt.id).map(x => `<div class="tv-pop-u">${x.img ? `<img src="${x.img}" alt="">` : IC.road}<span>${x.name}${x.res.length ? `<small>→ ${x.res.map(r => resChip(r)).join(' ')}</small>` : ''}</span></div>`).join('') || `<small class="muted">${esc(pt.desc)}</small>`}
      ${pst === 'done' ? `<span class="pill good">Découverte</span>`
        : pst === 'locked' ? `<small>Prérequis : ${pt.req.filter(r => !s.techs.includes(r)).map(r => TECHS.find(x => x.id === r)!.name).join(', ')}</small>`
        : `<button class="primary" data-tv="research" data-id="${pt.id}" ${pst === 'ready' ? '' : 'disabled'}>Rechercher · ${pt.cost} pts</button>${pst === 'avail' ? `<small>Il manque ${Math.ceil(pt.cost - s.rp)} points</small>` : ''}`}</div>` : '';
    const done = techs.filter(t => s.techs.includes(t.id)).length;
    const sel = techs.find(t => t.id === this.treeSel) ?? techs.find(t => state(t) === 'ready') ?? techs.find(t => state(t) === 'avail') ?? techs[0];
    const sst = state(sel), su = unlocks(sel.id);
    const detail = `<div class="tv-d-head"><span class="tv-d-ic">${su[0]?.img ? `<img src="${su[0].img}" alt="">` : IC[sel.branch]}</span><div><small>${BRANCHES.find(b => b.id === sel.branch)!.name}</small><h3>${sel.name}</h3></div></div>
      <p>${esc(sel.desc)}</p>
      ${su.length ? `<div class="tv-unl">${su.map(x => `<span>${x.img ? `<img src="${x.img}" alt="">` : IC.road}<em>${x.name}${x.res.length ? `<small>→ ${x.res.map(r => resChip(r)).join(' ')}</small>` : ''}</em></span>`).join('')}</div>` : ''}
      ${sel.req.length ? `<p class="tv-req">Prérequis : ${sel.req.map(r => `<span class="${s.techs.includes(r) ? 'ok' : ''}">${s.techs.includes(r) ? IC.check : IC.lock}${TECHS.find(x => x.id === r)!.name}</span>`).join('')}</p>` : ''}
      <div class="tv-act">${sst === 'done' ? `<span class="pill good">Découverte</span>` : sst === 'locked' ? `<span class="pill info">Débloque d'abord les prérequis</span>`
        : `<button class="primary" data-tv="research" data-id="${sel.id}" ${sst === 'ready' ? '' : 'disabled'}>Rechercher · ${sel.cost} pts</button>${sst === 'avail' ? `<small class="muted">Il manque ${Math.ceil(sel.cost - s.rp)} points</small>` : ''}`}</div>`;
    const sc0 = $('treeView').querySelector<HTMLElement>('.tv-scroll'), keep = sc0 ? [sc0.scrollLeft, sc0.scrollTop] : null;
    $('treeView').innerHTML = `<div class="tv-box">
      <header class="tv-head"><div class="tv-title">${IC.research}<div><h2>Arbre de recherche</h2><small>${ERAS[s.era]}</small></div></div>
        <div class="tv-stats"><span class="tv-rp">${IC.scroll}<b>${fmt(Math.floor(s.rp))}</b> pts</span>
        <span class="tv-prog"><span class="gauge"><i style="width:${done / techs.length * 100}%"></i></span><small>${done} / ${techs.length} découvertes</small></span>
        ${s.chapterDone ? `<button class="primary" data-tv="next">Époque suivante →</button>` : done === techs.length && !s.chapterDone ? `<small class="muted">Arbre complet : voir les autres conditions dans Objectifs</small>` : ''}</div>
        <button class="tv-close" data-tv="close" title="Fermer">${IC.close}</button></header>
      <div class="tv-body"><div class="tv-scroll"><div class="tv-canvas" style="width:${W}px;height:${H}px">${laneHtml}
        <svg class="tv-edges" width="${W}" height="${H}">${edges}</svg>${nodes}${pop}</div></div>
        <aside class="tv-detail">${detail}</aside></div>
      <footer class="tv-legend"><span class="lg done"></span>Découverte <span class="lg ready"></span>Disponible <span class="lg avail"></span>Points insuffisants <span class="lg locked"></span>Verrouillée <span class="lg sel"></span>Sélectionnée
        <small class="muted">Choisis ton ordre de recherche ; l'époque suivante s'ouvre quand tout l'arbre est découvert${s.era >= 2 ? ', la merveille construite et la date atteinte' : ''}.</small></footer></div>`;
    // la vue ne bouge pas quand l'arbre se met à jour (touche, points gagnés)
    const sc = $('treeView').querySelector<HTMLElement>('.tv-scroll');
    if (sc && keep) { sc.scrollLeft = keep[0]; sc.scrollTop = keep[1]; }
    // la bulle reste dans la partie visible de l'arbre
    const pe = $('treeView').querySelector<HTMLElement>('.tv-pop');
    if (sc && pe && pe.offsetWidth) {
      const l = Math.max(sc.scrollLeft + 6, Math.min(sc.scrollLeft + sc.clientWidth - pe.offsetWidth - 6, pe.offsetLeft));
      pe.style.left = `${l}px`;
    }
  }

  /** Effets des événements historiques encore actifs */
  private modsHtml(): string {
    const s = this.s, mods = activeMods(s);
    if (!mods.length) return '';
    const pn = (id?: string) => id === 'mer' ? 'commerce d\'outre-mer (chute de Rome)' : PARTNERS.find(p => p.id === id)?.name ?? id ?? '';
    const pct = (m: number) => `${m >= 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)} %`;
    const label = (m: typeof mods[number]) => m.kind === 'discount' ? `Constructions et améliorations ${pct(m.mult)}`
      : m.kind === 'demand' ? `Les villes paient ${(m.res ?? []).map(r => RES[r].name.toLowerCase()).join(', ')} ${pct(m.mult)}`
      : m.kind === 'prod' ? `Production ${m.res ? 'de ' + m.res.map(r => RES[r].name.toLowerCase()).join(', ') : 'des ateliers'} ${pct(m.mult)}`
      : m.kind === 'prices' ? `Monnaie dévaluée : prix de vente ${pct(m.mult)}`
      : m.kind === 'growth' ? `Croissance des villes ${pct(m.mult)}`
      : m.kind === 'closed' ? `Frontière fermée : ${pn(m.partner)}`
      : `${pn(m.partner)} paie ${pct(m.mult)}`;
    const good = (m: typeof mods[number]) => m.kind === 'closed' ? false : m.kind === 'discount' ? m.mult < 1 : m.mult >= 1;
    return `<h3>Effets historiques en cours</h3><div class="mods">${mods.map(m => `<div class="mod ${good(m) ? 'good' : 'bad'}"><b>${label(m)}</b><small>encore ${Math.max(1, Math.ceil((m.until - s.day) / 30.44))} mois</small></div>`).join('')}</div>`;
  }

  private objectivesPanel(): string {
    const s = this.s;
    const objs = OBJECTIVES.filter(o => o.era === s.era);
    const doneN = objs.filter(o => s.objectives.includes(o.id)).length, techN = TECHS.filter(t => t.era === s.era && s.techs.includes(t.id)).length, techT = TECHS.filter(t => t.era === s.era).length;
    const rows = objs.map(o => `<div class="obj ${s.objectives.includes(o.id) ? 'done' : ''}"><b>${s.objectives.includes(o.id) ? '✓ ' : ''}${o.name}</b><p>${esc(o.desc)} <small class="muted">+${fmt(o.money)} sesterces, +${o.rp} pts</small></p></div>`).join('');
    const log = s.log.slice(0, 12).map(e => `<li><small class="muted">${yearOf(e.day)}</small> ${esc(e.text)}</li>`).join('');
    const cc = chapterConditions(s), end = cc.end;
    const cond = (ok: boolean, t: string) => `<li class="${ok ? 'ok' : ''}">${ok ? IC.check : IC.lock}<span>${t}</span></li>`;
    const ffwdBtn = end && cc.techs && cc.wonder && !cc.date ? `<div class="actions top"><button class="primary" data-act="ffwd">⏩ Avancer jusqu'en ${end.year - 50}</button></div><p class="muted">Le temps défile très vite ; les événements sont résumés à la fin.</p>` : '';
    return `<h2 class="ph">${IC.objectives}Chapitre ${ROMAN[s.era]} · ${ERAS[s.era]}</h2>
      <h3>Pour terminer le chapitre</h3><ul class="conds">
        ${cond(cc.techs, `Arbre de recherche complet (${techN} / ${techT})`)}
        ${end ? cond(cc.wonder, `Construire ${BUILD[end.wonder].name}`) : ''}
        ${end ? cond(cc.date, `Atteindre l'an ${end.year - 50} (fin de l'époque : ${end.year}, à 50 ans près)`) : ''}</ul>
      <div class="bar"><i style="width:${techT ? Math.round(techN / techT * 100) : 0}%"></i></div>
      ${s.chapterDone ? `<div class="actions top"><button class="primary" data-act="nextera">Chapitre suivant →</button></div>` : ffwdBtn}
      <p class="muted">Objectifs historiques : <b>${doneN} / ${objs.length}</b>. Ils sont facultatifs${end ? ` (sauf ${BUILD[end.wonder].name})` : ''} et rapportent argent et points de recherche.</p>
      ${this.modsHtml()}
      ${rows}${this.rivalsSummary()}<h3>Journal</h3><ul class="log">${log || '<li class="muted">Rien à signaler.</li>'}</ul>`;
  }

  /** Fenêtre de diplomatie : relations, traités et actions envers chaque rival */
  private diplomacyPanel(): string {
    const s = this.s, fs = s.factions ?? [], open = hasTavern(s);
    let h = '';
    if (!fs.length) return '<p class="muted">Pas de rivaux dans cette partie.</p>';
    if (!open) h += `<p class="hint warn">Construis une <b>taverne</b> près d'une de tes villes pour ouvrir la diplomatie : cadeaux, accords, alliances, espionnage.</p>`;
    else h += `<p class="muted">${tavernes(s).length} taverne${tavernes(s).length > 1 ? 's' : ''} : chacune améliore un peu chaque mois tes relations, surtout avec les rivaux proches.</p>`;
    const top = (Object.keys(RES) as ResId[]).filter(r => RES[r].era <= s.era && storeTotal(s, r) >= 20).sort((a, z) => RES[z].price - RES[a].price).slice(0, 3);
    for (const f of fs) {
      if (f.dead) { h += `<div class="dipl" style="--fc:${f.color}"><div class="dipl-h"><i></i><b>${esc(f.name)}</b><span class="pill info">Soumis</span></div><small class="muted">Plus aucune ville.</small></div>`; continue; }
      const rl = relLabel(f), r = relOf(f), cities = f.b.filter(b => b.type === 'village'), know = (f.intel ?? 0) > s.day;
      const th = (k: 'trade' | 'pact' | 'alliance') => THRESHOLD[k][f.character as keyof typeof THRESHOLD.trade];
      const btn = (act: string, label: string, extra = '', dis = false) => `<button data-act="${act}" data-f="${f.id}" ${extra} ${!open || dis ? 'disabled' : ''}>${label}</button>`;
      h += `<div class="dipl" style="--fc:${f.color}">
        <div class="dipl-h"><i></i><b>${esc(f.name)}</b>${f.war ? '<span class="pill bad">⚔ Guerre</span>' : ''}<span class="pill ${rl.level}">${rl.label}</span></div>
        <small class="muted">${CHARACTERS[f.character as keyof typeof CHARACTERS]} · ${cities.length} ville${cities.length > 1 ? 's' : ''} · ${fmt(factionPop(f))} hab.</small>
        <div class="relbar"><span style="left:${(r + 100) / 2}%"></span></div><div class="relscale"><small>Hostile</small><small>Neutre</small><small>Allié</small></div>
        <div class="chips">${f.trade ? '<span class="pill good">Accord commercial</span>' : ''}${f.pact && f.pact > s.day ? `<span class="pill info">Non-agression jusqu'en ${yearOf(f.pact)}</span>` : ''}${f.alliance ? '<span class="pill good">Alliance</span>' : ''}${!f.trade && !f.pact && !f.alliance ? '<small class="muted">Aucun traité.</small>' : ''}${(f.allies ?? []).length ? `<small class="muted">Alliés : ${(f.allies ?? []).map(id => esc(fs.find(o => o.id === id)?.short ?? '?')).join(', ')}</small>` : ''}</div>
        ${know ? `<p class="spy">🕵 Trésor : <b>${fmt(f.money)}</b> sesterces · ${f.b.length} bâtiments · ${r < -40 ? 'Ils te considèrent comme une menace et s\'arment.' : r < 0 ? 'Ils se méfient de ton expansion.' : 'Ils cherchent surtout à commercer.'}${f.rels ? ` Meilleur ami : ${esc(fs.filter(o => o !== f).sort((a, z) => (f.rels![z.id] ?? 0) - (f.rels![a.id] ?? 0))[0]?.short ?? '—')}.` : ''}</p>` : ''}
        <div class="dipl-act">
          ${btn('gift', 'Offrir 300', 'data-a="300"', s.money < 300)}${btn('gift', 'Offrir 1 000', 'data-a="1000"', s.money < 1000)}
          ${top.map(rs => btn('giftres', `Offrir 20 t de ${RES[rs].name.toLowerCase()}`, `data-r="${rs}"`)).join('')}
        </div><div class="dipl-act">
          ${f.trade ? btn('break', 'Rompre l\'accord commercial', 'data-k="trade"') : btn('treaty', `Accord commercial <small>(relation ≥ ${th('trade')})</small>`, 'data-k="trade"')}
          ${f.pact && f.pact > s.day ? '' : btn('treaty', `Non-agression <small>(≥ ${th('pact')})</small>`, 'data-k="pact"')}
          ${f.alliance ? btn('break', 'Rompre l\'alliance', 'data-k="alliance"') : btn('treaty', `Alliance <small>(≥ ${th('alliance')}, accord commercial)</small>`, 'data-k="alliance"', !f.trade)}
          ${btn('spy', `🕵 Espionner (${SPY_COST})`, '', s.money < SPY_COST)}
        </div></div>`;
    }
    return h;
  }

  /** Onglet Commerce et diplomatie : lignes d'achat et de vente, partenaires, tavernes, rivaux, guerre et paix */
  private tradeTab: 'commerce' | 'diplo' | 'war' = 'commerce';
  private tradePanel(): string {
    const s = this.s, tab = this.tradeTab;
    const tabs = `<div class="tabs">${([['commerce', 'Commerce'], ['diplo', 'Diplomatie'], ['war', 'Guerre et paix']] as const).map(([k, n]) => `<button data-act="tradetab" data-k="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    let h = `<h2 class="ph">${IC.trade}Commerce et diplomatie</h2>${tabs}`;
    if (tab === 'diplo') return h + this.diplomacyPanel() + this.rivalsSummary(false);
    if (tab === 'war') return h + this.warTab();
    // lignes qui achètent ou vendent : postes-frontières, comptoirs d'outre-mer, tavernes
    const trader = (id: number) => { const b = getB(s, id); return !!b && (!!b.partner || b.type === 'comptoir' || b.type === 'taverne'); };
    const lines = s.lines.filter(l => l.stops.some(st => trader(st.bid)));
    h += `<h3>Lignes d'achat et de vente (${lines.length})</h3>${lines.map(l => this.lineCard(l)).join('') || '<p class="muted">Aucune ligne ne livre ou ne charge chez un partenaire. Crée une ligne avec un arrêt à un poste-frontière, un comptoir ou une taverne.</p>'}`;
    let ext = '';
    // commerce extérieur
    ext += `<h3>Partenaires étrangers</h3>${s.buildings.filter(b => b.partner).map(b => {
      const p = PARTNERS.find(x => x.id === b.partner)!, st = buildingStatus(this.sim, b);
      return `<button class="linecard" data-act="goto" data-id="${b.id}" style="--lc:#7a1f2b"><span class="lc-head"><b>${esc(p.name)}</b><span class="pill ${st.level}">${st.label}</span></span>
        <span class="chips"><small class="muted">Achète :</small> ${p.buys.filter(r => RES[r].era <= s.era).map(r => resChip(r)).join(' ')}</span>
        <span class="chips"><small class="muted">Vend :</small> ${p.sells.map(r => resChip(r)).join(' ')}</span></button>`;
    }).join('')}<p class="muted">Relie un poste-frontière par la route, puis livre-lui des marchandises avec une ligne, ou achète-lui des ressources depuis sa fiche.</p>`;
    // partenaires d'outre-mer : ouverts avec le négoce maritime
    const seaOpen = s.techs.includes('negoce_maritime');
    ext += `<h3>Routes maritimes ${seaOpen ? '' : '<small class="muted">— 🔒 Négoce maritime</small>'}</h3>`;
    ext += seaOpen ? s.buildings.filter(b => b.type === 'comptoir').map(b => {
      const p = SEA_PARTNERS.find(x => x.id === b.sp)!, st = buildingStatus(this.sim, b);
      return `<button class="linecard" data-act="goto" data-id="${b.id}" style="--lc:#14406e"><span class="lc-head"><b>${esc(p.name)}</b><small class="muted">${b.sea === 'mediterranee' ? 'Méditerranée' : 'Atlantique'}</small><span class="pill ${st.level}">${st.label}</span></span>
        <span class="chips"><small class="muted">Achète :</small> ${p.buys.filter(r => RES[r].era <= s.era).map(r => resChip(r)).join(' ')}</span>
        <span class="chips"><small class="muted">Vend :</small> ${p.sells.map(r => resChip(r)).join(' ')}</span></button>`;
    }).join('') + '<p class="muted">Construis un port de commerce sur la côte, puis envoie des navires marchands vers ces comptoirs.</p>'
      : `<p class="muted">Recherche le négoce maritime pour ouvrir des routes vers ${SEA_PARTNERS.map(p => p.name.split(' (')[0]).join(', ')}.</p>`;

    h += ext;
    // tavernes : commerce avec les rivaux
    const tvs = tavernes(s);
    h += `<h3>Tavernes : commerce avec les rivaux</h3>${tvs.map(b => {
      const f = tradeFaction(s, b), st = buildingStatus(this.sim, b);
      return `<button class="linecard" data-act="goto" data-id="${b.id}" style="--lc:${f?.color ?? '#8a6d3b'}"><span class="lc-head"><b>${esc(b.name)}</b><span class="pill ${st.level}">${st.label}</span></span>
        ${f ? `<span class="chips"><small class="muted">Avec les ${esc(f.name)} · achètent :</small> ${factionBuys(s, f).map(r => resChip(r)).join(' ')}</span><span class="chips"><small class="muted">Vendent :</small> ${factionSells(f).map(r => resChip(r)).join(' ')}</span>` : '<small class="muted">Aucun rival relié par la route avec un accord commercial.</small>'}</button>`;
    }).join('') || '<p class="muted">Aucune taverne. Construis-en une près d\'une de tes villes pour commercer avec tes rivaux.</p>'}`;
    return h;
  }
  /** Guerre et paix : état de chaque rival, tes armées, tes casernes, les armées ennemies */
  private warTab(): string {
    const s = this.s, fs = (s.factions ?? []).filter(f => !f.dead);
    if (!warAllowed(s)) return '<p class="muted">La guerre devient possible au chapitre II (Gaule romaine) : casernes, légionnaires, sièges et conquêtes.</p>';
    const state = { idle: 'au repos', march: 'en marche', fight: 'au combat', siege: 'siège' };
    let h = '<h3>Rivaux</h3>';
    h += fs.map(f => `<div class="dipl" style="--fc:${f.color}"><div class="dipl-h"><i></i><b>${esc(f.name)}</b>${f.war ? '<span class="pill bad">⚔ Guerre</span>' : f.pact && f.pact > s.day ? `<span class="pill info">Non-agression jusqu'en ${yearOf(f.pact)}</span>` : f.alliance ? '<span class="pill good">Alliance</span>' : '<span class="pill info">Paix</span>'}</div>
      <small class="muted">${f.b.filter(b => b.type === 'village').length} ville(s) · ${fmt(factionPop(f))} hab.</small>
      <div class="dipl-act">${f.war ? `<button data-act="peace" data-f="${f.id}">Proposer la paix</button><button data-act="peace" data-f="${f.id}" data-pay="1">Paix contre indemnité</button>` : `<button data-act="war" data-f="${f.id}" ${f.alliance ? 'disabled' : ''}>⚔ Déclarer la guerre</button>`}</div></div>`).join('') || '<p class="muted">Aucun rival.</p>';
    const mine = (s.armies ?? []).filter(a => a.owner === PLAYER), foes = (s.armies ?? []).filter(a => a.owner !== PLAYER && hostile(s, PLAYER, a.owner));
    h += `<h3>Tes armées (${mine.length})</h3>${mine.map(a => `<button class="row" data-act="selarmy" data-id="${a.id}"><span class="army-dot" style="background:${PLAYER_COLOR}"></span><span>${a.merc ? 'Mercenaires · ' : ''}${fmt(a.men)} hommes · ${Math.round(a.hp)} %</span><small class="muted">${state[a.state]}</small></button>`).join('') || '<p class="muted">Aucune. Recrute dans une caserne.</p>'}`;
    const cas = s.buildings.filter(b => b.type === 'caserne');
    h += `<h3>Casernes (${cas.length})</h3>${cas.map(b => `<button class="row" data-act="goto" data-id="${b.id}"><img class="vic" src="${bIconUrl(b.type)}" alt=""><span class="grow"><b>${esc(b.name)}</b></span><small class="muted">${b.built ? 'recruter' : 'en construction'}</small></button>`).join('') || '<p class="muted">Aucune caserne.</p>'}`;
    h += `<h3>Armées ennemies (${foes.length})</h3>${foes.map(a => `<button class="row" data-act="selarmy" data-id="${a.id}"><span class="army-dot" style="background:${ownerColor(s, a.owner)}"></span><span>${esc(ownerName(s, a.owner))} · ${fmt(a.men)} hommes</span><small class="muted">${state[a.state]}</small></button>`).join('') || '<p class="muted">Aucune armée ennemie en campagne.</p>'}`;
    return h;
  }
  /** Comparaison avec les rivaux */
  private rivalsSummary(button = true): string {
    const s = this.s; if (!s.factions?.length) return '';
    const me = playerPop(s), rows = [{ name: 'Toi', color: PLAYER_COLOR, pop: me, cities: s.buildings.filter(b => b.city).length }, ...s.factions.map(f => ({ name: f.name, color: f.color, pop: factionPop(f), cities: f.b.filter(b => b.type === 'village').length }))];
    const max = Math.max(1, ...rows.map(r => r.pop));
    return `<h3>Comparaison <small class="muted">— difficulté ${DIFFICULTY[s.difficulty ?? 'equilibre'].name.toLowerCase()}</small></h3>${button ? '<div class="actions top"><button class="primary" data-act="diplo">🤝 Diplomatie</button></div>' : ''}<div class="rivals">${rows.map(r => `<div class="rv"><span class="rv-n"><i style="background:${r.color}"></i>${esc(r.name)}</span><span class="gauge"><i style="width:${r.pop / max * 100}%;background:${r.color}"></i></span><small>${fmt(r.pop)} hab. · ${r.cities} ville${r.cities > 1 ? 's' : ''}</small></div>`).join('')}</div>`;
  }
  private layersPanel(): string {
    const L = this.view.layers, s = this.s;
    // les ressources des époques suivantes restent secrètes
    const resList = [...new Set(this.geo.deposits.map(d => d.res))].filter(r => RES[r].era <= s.era);
    const opts = `<option value="all">Toutes les ressources (sauf terres fertiles)</option>` + resList.map(r => `<option value="${r}" ${this.view.depositFilter === r ? 'selected' : ''}>${RES[r].name}</option>`).join('');
    const legend = resList.filter(r => r !== 'cereales').map(r => `<span class="res"><i class="sw" style="background:${DEP_COLOR[r] ?? RES[r].color}"></i>${RES[r].name}</span>`).join(' ');
    return `<h3>Calques</h3>
      <label class="tog"><input type="checkbox" data-layer="deposits" ${L.deposits ? 'checked' : ''}> Gisements</label>
      <label class="tog"><input type="checkbox" data-layer="depLabels" ${L.depLabels !== false ? 'checked' : ''}> Noms des gisements (ressource et lieu)</label>
      <p><select data-field="depfilter">${opts}</select></p>
      <div class="chips">${legend}</div>
      <p class="muted">De nouveaux gisements apparaîtront à chaque nouvelle époque.</p>
      <label class="tog"><input type="checkbox" data-layer="water" ${L.water ? 'checked' : ''}> Accès à l'eau (fleuves, lacs, côte, aqueducs)</label>
      <label class="tog"><input type="checkbox" data-layer="workers" ${L.workers ? 'checked' : ''}> Main-d'œuvre (rayon des villes)</label>
      ${s.factions?.length ? `<label class="tog"><input type="checkbox" data-layer="territory" ${L.territory !== false ? 'checked' : ''}> Territoires (toi et tes rivaux)</label>` : ''}`;
  }

  private menuPanel(): string {
    const s = this.s;
    return `<h2 class="ph">${IC.menu}Menu</h2>
      <p class="muted">Partie en cours : ${dateLabel(s)} · ${fmt(s.money)} sesterces · ${s.buildings.filter(b => !b.partner && b.type !== 'comptoir').length} bâtiment(s)</p>
      <div class="actions col">
      <button class="primary" data-act="new">Recommencer la partie</button>
      <button data-act="save">Sauvegarder maintenant</button>
      <button data-act="export">Exporter la sauvegarde (fichier)</button>
      <button data-act="loadfile">Importer une sauvegarde</button></div>
      ${this.layersPanel()}
      <h3>Commandes</h3><ul class="log">
      <li>Glisser : déplacer la carte · molette ou pincement : zoom</li>
      <li>Espace : pause · 1 à 4 : vitesse · Échap : annuler</li>
      <li>R : tracer une route · B : construire · Entrée ou double-clic : terminer la route</li></ul>
      <h3>Crédits</h3><p class="muted">Carte : Natural Earth (domaine public). Relief : Terrain Tiles (Mapzen, AWS Open Data), dérivé de SRTM, ETOPO1 et autres sources ouvertes.</p>`;
  }

  // ---------- Actions des panneaux ----------
  private panelClick(e: Event) {
    this.panelScrollAt = 0;   // une action : le panneau se met à jour tout de suite
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!t) return;
    const s = this.s, id = Number(t.dataset.id);
    switch (t.dataset.act) {
      case 'build': this.setMode({ kind: 'build', type: t.dataset.type as BType }); this.closePanel(); this.view.layers.deposits = true; break;
      case 'upgrade': { const b = getB(s, id)!; const err = upgrade(s, b); this.toast(err ?? 'Amélioration lancée : les matériaux vont être livrés.', err ? 'bad' : 'info'); break; }
      case 'demolish': this.askDemolish(getB(s, id)!); break;
      case 'delroad': if (!s.edges.find(x => x.id === id)?.ally) { removeEdge(s, id); this.rerouteAll(); this.closePanel(); } break;
      case 'paveroad': {
        const e = s.edges.find(x => x.id === id), cost = Number(t.dataset.cost);
        if (e && s.money >= cost) { e.type = 'voie'; s.money -= cost; s.stats.expenses += cost; this.rerouteAll(); } else this.toast('Pas assez d\'argent.', 'bad');
        break;
      }
      case 'sealine': {
        // ligne de navire : charge au port de commerce, vend au comptoir
        const port = getB(s, id)!, c = getB(s, Number(t.dataset.c))!, p = SEA_PARTNERS.find(x => x.id === c.sp)!;
        const have = (Object.keys(port.stock) as ResId[]).filter(r => p.buys.includes(r) && (port.stock[r] ?? 0) >= 1);
        const l: Line = { id: s.nextId++, name: '', vtype: 'navire', color: LINE_COLORS[s.lines.length % LINE_COLORS.length],
          stops: [{ bid: port.id, action: 'load', res: have.length ? have.slice(0, 2) : p.buys.slice(0, 1) }, { bid: c.id, action: 'unload', res: [] }] };
        s.lines.push(l); this.view.selectedLine = l.id;
        this.openPanel(() => this.linesPanel(), 'lines');
        this.toast('Ligne maritime créée : choisis la cargaison, puis achète un navire marchand.', 'good');
        break;
      }
      case 'newline': {
        const from = t.dataset.id ? getB(s, id) : undefined;
        const l: Line = { id: s.nextId++, name: '', vtype: from?.type === 'comptoir' ? 'navire' : 'charrette', stops: [], color: LINE_COLORS[s.lines.length % LINE_COLORS.length] };
        if (t.dataset.id) { const b = getB(s, id)!; l.stops.push({ bid: b.id, action: 'load', res: this.suggestRes(b).slice(0, 1) }); }
        s.lines.push(l); this.view.selectedLine = l.id;
        this.openPanel(() => this.linesPanel(), 'lines');
        this.setMode({ kind: 'pickStop', line: l.id });
        break;
      }
      case 'line': {
        // mémorise le panneau actuel (et sa sélection) avant d'ouvrir la ligne, pour le bouton « Retour »
        if (this.panel) { this.history.push({ fn: this.panel, kind: this.panelKind, sel: this.view.selected, line: this.view.selectedLine }); this.panel = null; }
        this.view.selectedLine = id; this.view.selected = null; this.openPanel(() => this.linesPanel(), 'lines'); break;
      }
      case 'lines': this.view.selectedLine = null; this.setMode({ kind: 'select' }); break;
      case 'pickstop': if (this.view.selectedLine !== null) this.setMode({ kind: 'pickStop', line: this.view.selectedLine }); break;
      case 'delres': { const l = s.lines.find(x => x.id === this.view.selectedLine); if (l) { const st = l.stops[Number(t.dataset.i)]; st.res = st.res.filter(r => r !== t.dataset.r); if (st.pct) delete st.pct[t.dataset.r as ResId]; } break; }
      case 'selv': this.select({ kind: 'vehicle', id }); return;
      case 'delstop': { const l = s.lines.find(x => x.id === this.view.selectedLine); if (l) l.stops.splice(Number(t.dataset.i), 1); break; }
      case 'buyv': { const err = buyVehicle(s, this.view.selectedLine!); if (err) this.toast(err, 'bad'); break; }
      case 'sellv': { const v = s.vehicles.find(x => x.id === id); if (v) sellVehicle(s, v); if (this.view.selected?.kind === 'vehicle') this.closePanel(); break; }
      case 'delline': {
        const lid = this.view.selectedLine!;
        for (const v of s.vehicles.filter(x => x.line === lid)) sellVehicle(s, v);
        s.lines = s.lines.filter(x => x.id !== lid); this.view.selectedLine = null; this.setMode({ kind: 'select' });
        break;
      }
      case 'research': this.sim.research(t.dataset.id!); break;
      case 'nextera': this.chapterModal(); break;
      case 'diplo': this.tradeTab = 'diplo'; this.openPanel(() => this.tradePanel()); return;
      case 'tradetab': this.tradeTab = t.dataset.k as 'commerce' | 'diplo' | 'war'; $('panelBody').scrollTop = 0; break;
      case 'gift': case 'giftres': case 'treaty': case 'break': case 'spy': {
        const f = s.factions?.find(x => x.id === t.dataset.f); if (!f) break;
        if (!hasTavern(s)) { this.toast('Construis d\'abord une taverne près d\'une de tes villes.', 'bad'); break; }
        const a = t.dataset.act;
        if (a === 'gift') this.toast(giftMoney(s, f, Number(t.dataset.a)), 'good');
        else if (a === 'giftres') this.toast(giftRes(s, f, t.dataset.r as ResId, 20), 'good');
        else if (a === 'treaty') { const r = propose(s, f, t.dataset.k as 'trade' | 'pact' | 'alliance'); this.toast(r.msg, r.ok ? 'good' : 'bad'); }
        else if (a === 'break') this.toast(breakTreaty(s, f, t.dataset.k as 'trade' | 'alliance'), 'bad');
        else this.toast(spy(s, f));
        break;
      }
      case 'war': case 'peace': {
        const f = s.factions?.find(x => x.id === t.dataset.f); if (!f) break;
        if (t.dataset.act === 'war') this.toast(declareWar(s, f), 'bad'); else this.toast(proposePeace(s, f, !!t.dataset.pay));
        break;
      }
      case 'recruit': { const b = getB(s, id)!; const err = recruit(s, b, t.dataset.k as 'leg' | 'aux'); this.toast(err ?? 'Troupes recrutées.', err ? 'bad' : 'good'); break; }
      case 'mercs': { const b = getB(s, id)!; const err = hireMercs(s, b); this.toast(err ?? 'Mercenaires engagés.', err ? 'bad' : 'good'); break; }
      case 'selarmy': { const a = (s.armies ?? []).find(x => x.id === id); if (a) { this.centerOn(a.x, a.y, Math.max(this.cam.scale, 3)); this.select({ kind: 'army', id }); } return; }
      case 'attack': this.setMode({ kind: 'target', army: id }); return;
      case 'halt': { const a = (s.armies ?? []).find(x => x.id === id); if (a) { a.target = null; a.state = 'idle'; a.siege = undefined; } break; }
      case 'disband': { const a = (s.armies ?? []).find(x => x.id === id); if (a) { disband(s, a); this.select(null); } return; }
      case 'sendarmy': { const a = (s.armies ?? []).find(x => x.id === id); if (a) { a.target = { kind: 'rb', id: Number(t.dataset.t) }; a.state = 'march'; this.toast('En marche !', 'good'); } break; }
      case 'buyriv': { const b = getB(s, id)!; const err = buyFromRival(s, b, t.dataset.r as ResId, Number(t.dataset.q)); this.toast(err ?? 'Achat livré à la taverne.', err ? 'bad' : 'good'); break; }
      case 'repair': { const b = getB(s, id)!; const err = startRepair(s, b); this.toast(err ?? 'Réparation lancée : les matériaux arrivent par convoi.', err ? 'bad' : 'good'); break; }
      case 'ffwd': this.startFfwd(); break;
      case 'pauseb': { const b = getB(s, id); if (b) { b.paused = !b.paused; const n = b.staff, site = !b.built || b.upgrading; this.sim.staffing();
        this.toast(site ? (b.paused ? `${b.name} : chantier en pause.` : `${b.name} : chantier relancé.`) : b.paused ? `${b.name} : production en pause, ${n} ouvrier${n > 1 ? 's' : ''} libéré${n > 1 ? 's' : ''} pour les autres ateliers.` : `${b.name} : production relancée.`); } break; }
      case 'pausel': { const l = s.lines.find(x => x.id === this.view.selectedLine); if (l) { l.paused = !l.paused; this.toast(l.paused ? 'Ligne en pause : les véhicules chargés terminent leur livraison, puis s\'arrêtent.' : 'Ligne relancée.'); } break; }
      case 'bltab': this.bLineTab = t.dataset.r as 'depart' | 'arrivee'; break;
      case 'ecotab': this.ecoTab = t.dataset.r as ResId | 'all'; $('panelBody').scrollTop = 0; break;
      case 'lfilter': this.lineFilter = t.dataset.r as ResId | 'all'; break;
      case 'pauseall': { const all = s.lines.every(l => l.paused); for (const l of s.lines) l.paused = !all; break; }
      case 'delall': this.modal(`<h2>Supprimer toutes les lignes ?</h2><p>Les ${s.lines.length} lignes seront supprimées et leurs ${s.vehicles.filter(v => v.line >= 0).length} véhicules revendus à moitié prix. Les routes ne sont pas touchées.</p>`, [
        { label: 'Annuler' }, { label: 'Tout supprimer', primary: true, fn: () => { for (const v of s.vehicles.filter(x => x.line >= 0)) sellVehicle(s, v); s.lines = []; this.view.selectedLine = null; this.toast('Toutes les lignes ont été supprimées.'); this.refresh(); } }]); break;
      case 'sell': { const b = getB(s, id)!; const g = sellLocal(s, b, t.dataset.r as ResId, Number(t.dataset.q)); if (g) this.toast(`Vendu pour ${fmt(g)} sesterces.`, 'good'); break; }
      case 'importmer': { const b = getB(s, id)!; const err = buySea(s, b, t.dataset.p!, t.dataset.r as ResId, Number(t.dataset.q)); this.toast(err ?? 'Cargaison livrée au port.', err ? 'bad' : 'good'); break; }
      case 'import': { const b = getB(s, id)!; const err = buyImport(s, b, t.dataset.r as ResId, Number(t.dataset.q)); this.toast(err ?? `Achat livré au poste ${b.name}.`, err ? 'bad' : 'good'); break; }
      case 'goto': { const b = getB(s, id); if (b) { this.centerOn(b.x, b.y, Math.max(this.cam.scale, 3)); this.select({ kind: 'building', id }); } return; }
      case 'save': this.save(); this.toast('Partie sauvegardée.', 'good'); break;
      case 'export': {
        const blob = new Blob([JSON.stringify(this.s)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `mine-map-${year(s)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        break;
      }
      case 'loadfile': {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
        inp.onchange = async () => {
          try { const st = JSON.parse(await inp.files![0].text()) as GameState; if (!st.version || !st.buildings) throw new Error(); this.load(st); this.closePanel(); this.toast('Sauvegarde chargée.', 'good'); }
          catch { this.toast('Fichier de sauvegarde invalide.', 'bad'); }
        };
        inp.click(); break;
      }
      case 'new': this.modal('<h2>Recommencer la partie ?</h2><p>La partie en cours sera définitivement perdue. Pense à l\'exporter avant si tu veux la garder.</p>', [
        { label: 'Annuler' }, { label: 'Recommencer', primary: true, fn: () => { this.speed = 1; this.fresh(); this.save(); } }]); break;
    }
    this.panelKey = ''; this.refresh();
  }
  private panelChange(e: Event) {
    this.panelScrollAt = 0;   // une action : le panneau se met à jour tout de suite
    const t = e.target as HTMLInputElement | HTMLSelectElement, s = this.s;
    const l = s.lines.find(x => x.id === this.view.selectedLine);
    if (t.dataset.layer) { (this.view.layers as Record<string, boolean>)[t.dataset.layer] = (t as HTMLInputElement).checked; }
    switch (t.dataset.field) {
      case 'name': { const b = getB(s, Number(t.dataset.id)); if (b && t.value.trim()) b.name = t.value.trim(); break; }
      case 'lname': if (l) l.name = t.value.trim(); break;
      case 'vtype': if (l) {
        // les véhicules déjà achetés changent aussi de type (on paie ou récupère la différence de prix)
        const nt = t.value as VType, vs = s.vehicles.filter(v => v.line === l.id && v.type !== nt);
        const diff = vs.reduce((a, v) => a + VEH[nt].price - VEH[v.type].price, 0);
        if (diff > s.money) { this.toast('Pas assez d\'argent pour remplacer les véhicules de la ligne.', 'bad'); t.value = l.vtype; break; }
        l.vtype = nt;
        for (const v of vs) {
          v.type = nt; v.cargo = {}; v.state = 'lost'; v.timer = 0;
          const b = getB(s, l.stops[v.stop % l.stops.length]?.bid ?? -1) ?? getB(s, l.stops[0]?.bid ?? -1);
          if (b) { v.x = b.x; v.y = b.y; v.at = b.id; v.path = []; v.seg = 0; v.segPos = 0; }
        }
        if (vs.length) { s.money -= diff; s.stats.expenses += Math.max(0, diff); this.toast(`${vs.length} véhicule${vs.length > 1 ? 's' : ''} remplacé${vs.length > 1 ? 's' : ''} par : ${VEH[nt].name} (${diff >= 0 ? '−' : '+'}${fmt(Math.abs(diff))} sesterces).`); }
      } break;
      case 'action': if (l) {
        const st = l.stops[Number(t.dataset.i)], b = getB(s, st.bid);
        st.action = t.value as 'load' | 'unload';
        st.res = []; st.share = 100; delete st.pct;
        if (st.action === 'load' && b) st.res = this.suggestRes(b).slice(0, 1);
      } break;
      case 'tf': { const b = getB(s, Number(t.dataset.id)); if (b) b.tf = t.value; break; }
      case 'share': if (l) l.stops[Number(t.dataset.i)].share = Number(t.value); break;
      case 'pct': if (l) { const st = l.stops[Number(t.dataset.i)], r = t.dataset.r as ResId, v = Number(t.value); st.pct ??= {}; if (v > 0) st.pct[r] = v; else delete st.pct[r]; } break;
      case 'addres': if (l && t.value) { const st = l.stops[Number(t.dataset.i)]; if (!st.res.includes(t.value as ResId)) st.res.push(t.value as ResId); } break;
      case 'depfilter': this.view.depositFilter = t.value as ResId | 'all'; this.view.layers.deposits = true; break;
    }
    (document.activeElement as HTMLElement | null)?.blur?.();
    this.panelKey = ''; this.refresh();
  }

  private askDemolish(b: Building) {
    if (b.type === 'poste') { this.toast('On ne peut pas démolir un poste-frontière.'); return; }
    this.modal(`<h2>Démolir ${esc(b.name)} ?</h2><p>Le stock et les matériaux déjà livrés seront perdus.</p>`, [
      { label: 'Annuler' }, { label: 'Démolir', primary: true, fn: () => { demolish(this.s, b); this.closePanel(); } }]);
  }

  // ---------- Notifications ----------
  toast(text: string, kind: 'info' | 'good' | 'bad' = 'info') {
    const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = text;
    $('toasts').prepend(el);
    setTimeout(() => el.classList.add('out'), 4500); setTimeout(() => el.remove(), 5000);
    while ($('toasts').children.length > (window.innerWidth < 760 ? 2 : 4)) $('toasts').lastElementChild!.remove();
  }
  modal(html: string, buttons: { label: string; primary?: boolean; fn?: () => void }[]) {
    const m = $('modal');
    m.innerHTML = `<div class="box">${html}<div class="actions">${buttons.map((b, i) => `<button data-i="${i}" class="${b.primary ? 'primary' : ''}">${b.label}</button>`).join('')}</div></div>`;
    m.hidden = false;
    m.querySelectorAll<HTMLButtonElement>('button[data-i]').forEach(btn => btn.onclick = () => { m.hidden = true; buttons[Number(btn.dataset.i)].fn?.(); });
  }
}

function yearOf(day: number) { const y = START_YEAR + Math.floor(day / 365.25); const yy = y >= 0 ? y + 1 : y; return yy < 0 ? `${-yy} av. J.-C.` : String(yy); }
