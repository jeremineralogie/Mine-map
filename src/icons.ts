// Icônes vues du dessus (SVG), converties en images pour le canvas.
import type { BType, ResId, VType } from './defs';

// ---- Bâtiments : pictogrammes (pastille colorée par catégorie, symbole blanc) ----
/** Couleurs des catégories de bâtiments */
export const CATEGORY: Record<string, { name: string; color: string }> = {
  logistique: { name: 'Logistique', color: '#1d5fa8' },
  commerce: { name: 'Commerce', color: '#7048b6' },
  extraction: { name: 'Extraction', color: '#8a5a2b' },
  nature: { name: 'Agriculture et forêt', color: '#2f9e44' },
  artisanat: { name: 'Artisanat', color: '#d9480f' },
  ville: { name: 'Ville', color: '#b42318' },
  ouvrage: { name: 'Grands ouvrages', color: '#0c7c8c' },
};
export const BCAT: Record<BType, string> = {
  entrepot: 'logistique', port: 'logistique', port_mer: 'commerce', poste: 'commerce',
  carriere: 'extraction', argiliere: 'extraction', mine_fer: 'extraction', mine_plomb: 'extraction', saline: 'extraction',
  ferme: 'nature', bucheron: 'nature', briqueterie: 'artisanat', bas_fourneau: 'artisanat', forge: 'artisanat',
  village: 'ville', aqueduc: 'ouvrage', pont_du_gard: 'ouvrage',
};
const badge = (t: BType, glyph: string) => {
  const c = CATEGORY[BCAT[t]].color;
  return `<circle cx="32" cy="33.5" r="28" fill="#000" opacity=".22"/><circle cx="32" cy="31" r="28" fill="${c}" stroke="#fff" stroke-width="3"/>` +
    `<circle cx="32" cy="31" r="23.5" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.2"/>` +
    `<g fill="#fff" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">${glyph.replace(/\{c\}/g, c)}</g>`;
};
const G: Record<BType, string> = {
  entrepot: `<path d="M16 28 L32 18 L48 28 V44 H16 Z" stroke-width="0"/><rect x="22" y="32" width="20" height="12" fill="{c}" stroke-width="0"/><path d="M22 36h20M22 40h20" stroke-width="1.6"/>`,
  village: `<path d="M14 44 V30 L22 23 L30 30 V44 Z M30 44 V27 L39 19 L48 27 V44 Z" stroke-width="0"/><rect x="19" y="36" width="5" height="8" fill="{c}" stroke-width="0"/><rect x="36" y="34" width="6" height="10" fill="{c}" stroke-width="0"/>`,
  bucheron: `<path d="M24 14 L33 28 H28 L35 38 H13 L20 28 H15 Z" stroke-width="0"/><rect x="22" y="38" width="4" height="7" stroke-width="0"/><path d="M38 44 L46 24" stroke-width="2.6" fill="none"/><path d="M43 22 Q50 22 50 28 L45 29 Z" stroke-width="0"/>`,
  carriere: `<rect x="15" y="34" width="12" height="9" rx="1"/><rect x="29" y="34" width="12" height="9" rx="1"/><rect x="22" y="24" width="12" height="9" rx="1"/><path d="M38 16 L48 26" stroke-width="3.4" fill="none"/><path d="M42 14 L50 22" stroke-width="3.4" fill="none"/>`,
  ferme: `<path d="M32 46 V20" stroke-width="2.6" fill="none"/><g stroke-width="0"><ellipse cx="32" cy="17" rx="3" ry="5"/><ellipse cx="26.5" cy="24" rx="3" ry="5" transform="rotate(-30 26.5 24)"/><ellipse cx="37.5" cy="24" rx="3" ry="5" transform="rotate(30 37.5 24)"/><ellipse cx="26.5" cy="32" rx="3" ry="5" transform="rotate(-30 26.5 32)"/><ellipse cx="37.5" cy="32" rx="3" ry="5" transform="rotate(30 37.5 32)"/></g>`,
  argiliere: `<path d="M24 16 H40 L38 21 Q46 26 45 35 Q44 45 32 45 Q20 45 19 35 Q18 26 26 21 Z" stroke-width="0"/><path d="M22 31 Q32 35 42 31" stroke="{c}" stroke-width="2" fill="none"/>`,
  briqueterie: `<g stroke-width="0"><rect x="14" y="34" width="11" height="6" rx="1"/><rect x="27" y="34" width="11" height="6" rx="1"/><rect x="20" y="27" width="11" height="6" rx="1"/><rect x="40" y="34" width="10" height="6" rx="1"/></g><path d="M40 28 Q35 22 40 15 Q42 20 45 18 Q49 24 44 28 Z" stroke-width="0"/>`,
  mine_fer: `<path d="M14 44 Q14 24 32 22 Q50 24 50 44 Z" stroke-width="0"/><path d="M24 44 Q24 33 32 33 Q40 33 40 44 Z" fill="{c}" stroke-width="0"/><path d="M38 14 L46 22 M41 12 L35 18" stroke-width="2.6" fill="none"/>`,
  bas_fourneau: `<path d="M21 45 L25 20 H39 L43 45 Z" stroke-width="0"/><path d="M28 45 V38 Q32 33 36 38 V45 Z" fill="{c}" stroke-width="0"/><path d="M32 18 Q28 13 32 8 Q33 12 35 11 Q37 15 34 18 Z" stroke-width="0"/>`,
  forge: `<path d="M15 26 H44 Q44 32 38 33 L36 36 H24 L22 33 Q15 32 15 26 Z" stroke-width="0"/><rect x="25" y="36" width="10" height="5"/><rect x="20" y="41" width="20" height="4" rx="1"/><path d="M44 16 L50 22" stroke-width="3" fill="none"/>`,
  mine_plomb: `<path d="M14 40 Q14 24 30 22 Q46 24 46 40 Z" stroke-width="0"/><path d="M23 40 Q23 32 30 32 Q37 32 37 40 Z" fill="{c}" stroke-width="0"/><path d="M33 42 L37 36 H50 L46 42 Z" stroke="{c}" stroke-width="1.2"/>`,
  saline: `<path d="M13 44 L26 22 L39 44 Z" stroke-width="0"/><path d="M33 44 L42 29 L51 44 Z" stroke-width="0"/><g fill="{c}" stroke-width="0"><rect x="24" y="33" width="3" height="3"/><rect x="21" y="39" width="3" height="3"/><rect x="41" y="37" width="2.6" height="2.6"/></g>`,
  aqueduc: `<path d="M12 20 H52 V25 H12 Z" stroke-width="0"/><path d="M12 25 V44 H18 V34 Q22 29 26 34 V44 H30 V34 Q34 29 38 34 V44 H42 V34 Q46 29 50 34 V44 H52 V25 Z" stroke-width="0"/><path d="M14 22.5 H50" stroke="{c}" stroke-width="1.6"/>`,
  pont_du_gard: `<path d="M12 15 H52 V19 H12 Z M12 19 V27 H52 V19 Z" stroke-width="0"/><path d="M14 27 V31 Q16 28 18 31 V27 M22 27 V31 Q24 28 26 31 M30 27 V31 Q32 28 34 31 M38 27 V31 Q40 28 42 31 M46 27 V31 Q48 28 50 31" stroke="{c}" stroke-width="1.5" fill="none"/><path d="M12 31 H52 V46 H46 V38 Q41 32 36 38 V46 H28 V38 Q23 32 18 38 V46 H12 Z" stroke-width="0"/>`,
  poste: `<path d="M22 46 V14" stroke-width="3" fill="none"/><path d="M23 15 H45 L40 22 L45 29 H23 Z" stroke-width="0"/><path d="M15 46 H32" stroke-width="3" fill="none"/>`,
  port: `<path d="M32 15 V42" stroke-width="2.8" fill="none"/><circle cx="32" cy="16" r="3" fill="none" stroke-width="2.4"/><path d="M24 23 H40" stroke-width="2.6" fill="none"/><path d="M17 34 Q18 45 32 45 Q46 45 47 34" stroke-width="2.8" fill="none"/><path d="M14 37 L17 33 L21 37 M43 37 L47 33 L50 37" stroke-width="2.4" fill="none"/>`,
  port_mer: `<path d="M31 12 V36" stroke-width="2.4" fill="none"/><path d="M33 13 L46 33 H33 Z" stroke-width="0"/><path d="M29 17 L19 33 H29 Z" stroke-width="0"/><path d="M14 37 H50 L45 44 H19 Z" stroke-width="0"/><path d="M12 48 q5 -2.5 10 0 t10 0 t10 0 t10 0" stroke-width="1.8" fill="none"/>`,
};
const SVG = Object.fromEntries((Object.keys(G) as BType[]).map(t => [t, badge(t, G[t])])) as Record<BType, string>;

// ---- Véhicules : miniatures vues du dessus (orientées vers la droite) ----
const VDEFS = `<defs>
  <filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1.4" dy="2" stdDeviation="1.1" flood-color="#2b1d10" flood-opacity=".45"/></filter>
  <pattern id="pl" width="5" height="2.4" patternUnits="userSpaceOnUse"><rect width="5" height="2.4" fill="#a87a48"/><path d="M0 2.1H5" stroke="#6e4a26" stroke-width=".5"/></pattern>
  <pattern id="pl2" width="5" height="2.4" patternUnits="userSpaceOnUse"><rect width="5" height="2.4" fill="#c49a64"/><path d="M0 2.1H5" stroke="#8a6438" stroke-width=".5"/></pattern>
</defs>`;
const blk = (x: number, y: number, w = 6, h = 4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ece5d3" stroke="#7d7464" stroke-width=".8"/><rect x="${x}" y="${y}" width="${w}" height="1.2" fill="#fff" opacity=".6"/>`;
const ox = (x: number, y: number, c1: string, c2: string) => `<ellipse cx="${x}" cy="${y}" rx="9.5" ry="4.6" fill="${c1}" stroke="#2f2015" stroke-width=".8"/><ellipse cx="${x + 9}" cy="${y}" rx="3.4" ry="2.8" fill="${c2}" stroke="#2f2015" stroke-width=".7"/><path d="M${x + 10} ${y - 2.6} l2.5 -2 M${x + 10} ${y + 2.6} l2.5 2" stroke="#e8dcc0" stroke-width="1.1" stroke-linecap="round"/>`;
const horse = (x: number, y: number, c: string) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="3.6" fill="${c}" stroke="#24170d" stroke-width=".8"/><ellipse cx="${x + 9.5}" cy="${y}" rx="3.6" ry="1.9" fill="${c}" stroke="#24170d" stroke-width=".7"/><path d="M${x + 5} ${y} h6" stroke="#1a110a" stroke-width="1.2"/>`;
const wheels = (xs: number[]) => xs.map(x => `<rect x="${x}" y="8" width="7" height="5" rx="1.5" fill="#3b2a1e"/><rect x="${x}" y="35" width="7" height="5" rx="1.5" fill="#3b2a1e"/>`).join('');
const cart = (load: string) => `${VDEFS}<g filter="url(#s)" transform="translate(0 4)">${wheels([9])}
  <rect x="3" y="12" width="28" height="24" rx="2" fill="url(#pl)" stroke="#4a3320" stroke-width="1.4"/>${load}
  <path d="M31 24 h12 M42 16 v16" stroke="#4a3320" stroke-width="2.2"/>${ox(49, 17, '#8b5a2b', '#7a4a22')}${ox(49, 31, '#a06b3a', '#8b5a2b')}</g>`;
const hull = (fill: string, load: string) => `${VDEFS}<g filter="url(#s)" transform="translate(0 4)">
  <path d="M2 24 Q5 11 16 11 H52 Q62 11 63 24 Q62 37 52 37 H16 Q5 37 2 24 Z" fill="${fill}" stroke="#2f1d0e" stroke-width="1.5"/>
  <path d="M8 24 Q10 15 18 15 H50 Q57 15 58 24 Q57 33 50 33 H18 Q10 33 8 24 Z" fill="url(#pl)"/>${load}
  <path d="M3 24 L-2 24" stroke="#3b2a1e" stroke-width="2.2"/><circle cx="54" cy="24" r="1.8" fill="#3b2a1e"/>
  <path d="M20 11 l-3 -6 M30 11 l-3 -6 M20 37 l-3 6 M30 37 l-3 6" stroke="#5b3d1f" stroke-width="1.6" stroke-linecap="round"/></g>`;
const VSVG: Record<VType, string> = {
  charrette: cart(`<g stroke="#4a2e14" stroke-width=".7"><rect x="6" y="15" width="22" height="4" rx="2" fill="#a0723f"/><rect x="6" y="20" width="22" height="4" rx="2" fill="#b8854c"/><rect x="6" y="25" width="22" height="4" rx="2" fill="#a0723f"/><rect x="6" y="30" width="22" height="4" rx="2" fill="#b8854c"/></g>`),
  convoi: cart(`${blk(6, 15, 9, 7)}${blk(17, 15, 9, 7)}${blk(11, 25, 9, 7)}`),
  chariot: `${VDEFS}<g filter="url(#s)" transform="translate(0 4)">${wheels([4, 22])}
    <rect x="1" y="12" width="32" height="24" rx="5" fill="#efe6d0" stroke="#6b5a3e" stroke-width="1.3"/>
    <path d="M7 12 v24 M14 12 v24 M21 12 v24 M28 12 v24" stroke="#d3c39d" stroke-width="2.2"/><rect x="1" y="22.5" width="32" height="3" fill="#e2d5b4"/>
    <path d="M33 24 h8 M40 17 v14" stroke="#4a3320" stroke-width="2"/>${horse(50, 18, '#5a3a22')}${horse(50, 30, '#e8e0d0')}</g>`,
  barge: hull('#6e4422', `${blk(19, 17, 8, 6)}${blk(29, 17, 8, 6)}${blk(19, 25, 8, 6)}${blk(29, 25, 8, 6)}<rect x="40" y="18" width="9" height="12" rx="1" fill="#c9a774" stroke="#6e4a26"/><path d="M40 24h9" stroke="#6e4a26" stroke-width=".7"/>`),
  chaland: hull('#8a5a2b', `<rect x="18" y="17" width="31" height="14" fill="url(#pl2)"/>${blk(20, 18, 7, 5)}${blk(29, 18, 7, 5)}${blk(24, 25, 7, 5)}${blk(38, 21, 8, 6)}`),
};

function toImg(svg: string) {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 64 64">${svg}</svg>`);
  return img;
}

export const BICON = Object.fromEntries(Object.entries(SVG).map(([k, v]) => [k, toImg(v)])) as Record<BType, HTMLImageElement>;
export const VICON = Object.fromEntries(Object.entries(VSVG).map(([k, v]) => [k, toImg(v)])) as Record<VType, HTMLImageElement>;
/** URL d'icône pour l'interface HTML */
export const bIconUrl = (t: BType) => BICON[t].src;
export const vIconUrl = (t: VType) => VICON[t].src;

// ---- Icônes de ressources (24×24) ----
const RSVG: Partial<Record<ResId, string>> = {
  bois: `<g stroke="#4a3320" stroke-width="1"><rect x="2" y="13" width="20" height="5" rx="2.5" fill="#a0723f"/><rect x="4" y="8" width="18" height="5" rx="2.5" fill="#b8854c"/><rect x="2" y="3" width="16" height="5" rx="2.5" fill="#a0723f"/></g><g fill="#e3c08a" stroke="#6b4a2a" stroke-width=".8"><circle cx="20" cy="15.5" r="2.2"/><circle cx="20" cy="10.5" r="2.2"/><circle cx="16" cy="5.5" r="2.2"/></g><rect x="3" y="19" width="18" height="2" rx="1" fill="#2f7d3a" opacity=".5"/>`,
  pierre: `<path d="M3 9 L12 5 L21 9 L21 18 L12 21 L3 18 Z" fill="#b9b2a3" stroke="#5f594f" stroke-width="1.2"/><path d="M3 9 L12 13 L21 9 M12 13 V21" fill="none" stroke="#5f594f" stroke-width="1.2"/><path d="M3 9 L12 5 L21 9 L12 13 Z" fill="#d8d2c4"/>`,
  argile: `<path d="M4 17 Q3 9 10 7 Q18 5 20 12 Q22 19 13 20 Q6 21 4 17 Z" fill="#b5653a" stroke="#6b3a1e" stroke-width="1.2"/><path d="M8 12 Q12 10 15 12" fill="none" stroke="#d18b5e" stroke-width="1.5"/>`,
  briques: `<g fill="#c0583a" stroke="#6e2c1a" stroke-width="1"><rect x="2" y="14" width="9" height="5"/><rect x="12" y="14" width="10" height="5"/><rect x="6" y="8.5" width="10" height="5"/><rect x="2" y="3" width="9" height="5"/><rect x="12" y="3" width="10" height="5"/></g><rect x="17" y="8.5" width="5" height="5" fill="#a84e2c" stroke="#6e2c1a"/>`,
  minerai_fer: `<path d="M3 16 L6 8 L12 5 L19 7 L21 14 L16 20 L7 20 Z" fill="#7a4632" stroke="#3b2218" stroke-width="1.2"/><g fill="#c0442c"><circle cx="9" cy="11" r="1.8"/><circle cx="15" cy="10" r="1.5"/><circle cx="13" cy="16" r="2"/></g>`,
  fer: `<path d="M3 15 L7 9 L21 9 L17 15 Z" fill="#8a919b" stroke="#3a3f47" stroke-width="1.2"/><path d="M3 15 L17 15 L17 19 L3 19 Z" fill="#5a616b" stroke="#3a3f47" stroke-width="1.2"/><path d="M17 15 L21 9 L21 13 L17 19 Z" fill="#6b727c" stroke="#3a3f47" stroke-width="1.2"/>`,
  plomb: `<path d="M3 15 L7 9 L21 9 L17 15 Z" fill="#a7adb5" stroke="#4b5059" stroke-width="1.2"/><path d="M3 15 L17 15 L17 19 L3 19 Z" fill="#7d838c" stroke="#4b5059" stroke-width="1.2"/><path d="M17 15 L21 9 L21 13 L17 19 Z" fill="#8f959e" stroke="#4b5059" stroke-width="1.2"/><circle cx="12" cy="12" r="1.5" fill="#e6e9ee"/>`,
  sel: `<path d="M2 20 L12 5 L22 20 Z" fill="#f7f7f7" stroke="#9aa3ab" stroke-width="1.2"/><path d="M7 20 L12 12 L17 20" fill="#e6ebef"/><g fill="#fff" stroke="#c4ccd3" stroke-width=".6"><rect x="10" y="8" width="2" height="2"/><rect x="13" y="14" width="2" height="2"/></g>`,
  cereales: `<path d="M12 22 V8" stroke="#8a6d1d" stroke-width="1.5"/><g fill="#e1b12c" stroke="#8a6d1d" stroke-width=".8"><ellipse cx="12" cy="5" rx="2" ry="3"/><ellipse cx="9" cy="9" rx="2" ry="3" transform="rotate(-30 9 9)"/><ellipse cx="15" cy="9" rx="2" ry="3" transform="rotate(30 15 9)"/><ellipse cx="9" cy="14" rx="2" ry="3" transform="rotate(-30 9 14)"/><ellipse cx="15" cy="14" rx="2" ry="3" transform="rotate(30 15 14)"/></g>`,
  outils: `<path d="M5 20 L15 10" stroke="#7a5832" stroke-width="3" stroke-linecap="round"/><path d="M12 4 L20 4 L20 9 L17 9 L15 11 L12 8 Z" fill="#5a616b" stroke="#2c3036" stroke-width="1.1"/><path d="M19 15 L21 21 L15 19 Z" fill="#8a919b" stroke="#2c3036"/>`,
};
const RIMG: Partial<Record<ResId, HTMLImageElement>> = {};
for (const [k, v] of Object.entries(RSVG)) {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">${v}</svg>`);
  RIMG[k as ResId] = img;
}
/** Image d'une ressource, si elle a une icône dessinée */
export const resImg = (r: ResId) => RIMG[r];
