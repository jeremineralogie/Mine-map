// Icônes vues du dessus (SVG), converties en images pour le canvas.
import type { BType, VType } from './defs';

const plate = (fill: string, inner: string) =>
  `<rect x="3" y="5" width="58" height="56" rx="12" fill="#000" opacity=".22"/>` +
  `<rect x="2" y="2" width="58" height="56" rx="12" fill="${fill}" stroke="#fff" stroke-width="2.5"/>` + inner;

// toit à deux pans vu du dessus
const roof = (x: number, y: number, w: number, h: number, c1: string, c2: string, vertical = false) => vertical
  ? `<rect x="${x}" y="${y}" width="${w / 2}" height="${h}" fill="${c1}"/><rect x="${x + w / 2}" y="${y}" width="${w / 2}" height="${h}" fill="${c2}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#3b2a1e" stroke-width="1"/>`
  : `<rect x="${x}" y="${y}" width="${w}" height="${h / 2}" fill="${c1}"/><rect x="${x}" y="${y + h / 2}" width="${w}" height="${h / 2}" fill="${c2}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#3b2a1e" stroke-width="1"/>`;
const tiles = (x: number, y: number, w: number, h: number) => roof(x, y, w, h, '#c8643c', '#a84e2c');
const tree = (x: number, y: number, r: number) => `<circle cx="${x + 1}" cy="${y + 1.5}" r="${r}" fill="#1d3d1f" opacity=".35"/><circle cx="${x}" cy="${y}" r="${r}" fill="#3f7d3a"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .55}" fill="#5c9e4f"/>`;

const SVG: Record<BType, string> = {
  entrepot: plate('#d9cdb4',
    roof(10, 14, 42, 26, '#9c7b54', '#7d5f3e') +
    `<rect x="12" y="42" width="8" height="7" fill="#8a6a43"/><rect x="22" y="42" width="8" height="7" fill="#a37f52"/><rect x="34" y="43" width="14" height="6" rx="1" fill="#6f7a52"/>`),
  village: plate('#cfd8b0',
    `<path d="M10 33 H54 M32 8 V56" stroke="#b8a888" stroke-width="4"/>` +
    tiles(10, 10, 16, 13) + tiles(36, 10, 18, 12) + tiles(10, 37, 18, 14) + tiles(37, 37, 15, 15) +
    `<circle cx="32" cy="33" r="5" fill="#d8d0bc" stroke="#8a7d66"/>`),
  bucheron: plate('#b9cf98',
    tree(16, 16, 8) + tree(46, 14, 7) + tree(50, 44, 7) +
    roof(12, 34, 18, 14, '#8a6a43', '#6b5032') +
    `<g fill="#b98a55" stroke="#6b4a2a"><rect x="34" y="28" width="16" height="4" rx="2"/><rect x="34" y="33" width="16" height="4" rx="2"/><rect x="36" y="38" width="12" height="4" rx="2"/></g>`),
  carriere: plate('#cfc8b8',
    `<path d="M10 14 h44 v36 h-44z" fill="#b3ab9a"/><path d="M16 20 h32 v24 h-32z" fill="#958d7c"/><path d="M22 26 h20 v12 h-20z" fill="#7b7466"/>` +
    `<g fill="#e8e2d2" stroke="#6d665a"><rect x="12" y="50" width="9" height="6"/><rect x="23" y="50" width="9" height="6"/><rect x="44" y="8" width="9" height="6"/></g>`),
  ferme: plate('#d8cf9a',
    `<g stroke="#b59a3c" stroke-width="2"><path d="M6 8 L28 8 M6 13 L28 13 M6 18 L28 18 M6 23 L28 23"/></g>` +
    `<rect x="34" y="6" width="22" height="20" fill="#9fbf6a"/><g stroke="#83a352" stroke-width="2"><path d="M36 6 V26 M41 6 V26 M46 6 V26 M51 6 V26"/></g>` +
    roof(10, 32, 30, 10, '#c8643c', '#a84e2c') + roof(10, 42, 10, 12, '#c8643c', '#a84e2c', true) + roof(30, 42, 10, 12, '#c8643c', '#a84e2c', true) +
    `<rect x="20" y="42" width="10" height="12" fill="#e2d7bd"/>`),
  argiliere: plate('#d6b48f',
    `<ellipse cx="32" cy="30" rx="22" ry="18" fill="#b5653a"/><ellipse cx="32" cy="30" rx="13" ry="10" fill="#94502c"/>` +
    `<g fill="#c98a5c" stroke="#6b3a1e"><rect x="8" y="48" width="8" height="6" rx="1"/><rect x="18" y="48" width="8" height="6" rx="1"/></g>`),
  briqueterie: plate('#dcc4a6',
    `<circle cx="22" cy="24" r="13" fill="#a24a2a" stroke="#5e2a17" stroke-width="1.5"/><circle cx="22" cy="24" r="5" fill="#ffb347"/><circle cx="22" cy="24" r="2.5" fill="#fff2b3"/>` +
    roof(38, 10, 16, 28, '#c8643c', '#a84e2c', true) +
    `<g fill="#c0583a" stroke="#7a3320"><rect x="8" y="44" width="10" height="5"/><rect x="20" y="44" width="10" height="5"/><rect x="32" y="44" width="10" height="5"/><rect x="14" y="50" width="10" height="5"/><rect x="26" y="50" width="10" height="5"/></g>`),
  mine_fer: plate('#c9a38f',
    `<path d="M8 40 Q20 22 34 40 Z" fill="#8e3b25"/><path d="M14 40 Q20 30 28 40 Z" fill="#6e2a19"/>` +
    `<rect x="36" y="10" width="18" height="18" fill="#6b5032"/><path d="M36 10 L54 28 M54 10 L36 28" stroke="#3b2a1e" stroke-width="2"/>` +
    `<rect x="8" y="44" width="46" height="4" fill="#5a4a3a"/><rect x="38" y="40" width="12" height="7" rx="2" fill="#a0442c" stroke="#3b2a1e"/>`),
  bas_fourneau: plate('#cdb8a2',
    `<circle cx="26" cy="28" r="16" fill="#7a5a44" stroke="#3b2a1e" stroke-width="1.5"/><circle cx="26" cy="28" r="8" fill="#e8501c"/><circle cx="26" cy="28" r="4" fill="#ffd166"/>` +
    `<g fill="#2b2b2b"><rect x="44" y="12" width="10" height="8" rx="1"/><rect x="44" y="22" width="10" height="8" rx="1"/></g>` +
    `<g fill="#a0442c"><circle cx="46" cy="44" r="3"/><circle cx="52" cy="47" r="3"/><circle cx="47" cy="51" r="3"/></g>`),
  forge: plate('#d0c4b0',
    roof(8, 8, 30, 26, '#7a7a7a', '#5e5e5e') +
    `<rect x="42" y="12" width="12" height="12" fill="#2b2b2b"/><circle cx="48" cy="18" r="3.5" fill="#ff7b29"/>` +
    `<path d="M14 44 h26 l-4 6 h-18 z" fill="#3a3f47"/><rect x="22" y="50" width="10" height="6" fill="#3a3f47"/>` +
    `<path d="M44 40 l10 10" stroke="#6b5032" stroke-width="3"/><rect x="40" y="36" width="8" height="6" fill="#4b5563"/>`),
  mine_plomb: plate('#c3c6c9',
    `<path d="M8 40 Q20 22 34 40 Z" fill="#555c66"/><path d="M14 40 Q20 30 28 40 Z" fill="#30353b"/>` +
    `<rect x="36" y="10" width="18" height="18" fill="#6b5032"/><path d="M36 10 L54 28 M54 10 L36 28" stroke="#3b2a1e" stroke-width="2"/>` +
    `<rect x="8" y="44" width="46" height="4" fill="#5a4a3a"/><rect x="38" y="40" width="12" height="7" rx="2" fill="#8b929b" stroke="#3b2a1e"/>`),
  saline: plate('#d9e4ea',
    `<g fill="#a9cbe0" stroke="#7b9bb0"><rect x="8" y="8" width="14" height="12"/><rect x="25" y="8" width="14" height="12"/><rect x="42" y="8" width="13" height="12"/><rect x="8" y="23" width="14" height="12"/><rect x="25" y="23" width="14" height="12"/></g>` +
    `<g fill="#ffffff" stroke="#c9d3da"><rect x="43" y="24" width="11" height="11"/><rect x="8" y="38" width="14" height="12"/></g>` +
    `<g fill="#f4f4f4" stroke="#b9c2c9"><path d="M30 52 l6 -12 l6 12 z"/><path d="M42 52 l6 -12 l6 12 z"/></g>`),
  aqueduc: plate('#d6d2c4',
    `<rect x="4" y="25" width="56" height="10" fill="#bdb6a4" stroke="#7d7666"/><rect x="4" y="28" width="56" height="4" fill="#6fa8dc"/>` +
    `<g fill="#9a9384"><rect x="10" y="22" width="4" height="16"/><rect x="24" y="22" width="4" height="16"/><rect x="38" y="22" width="4" height="16"/><rect x="52" y="22" width="4" height="16"/></g>` +
    `<circle cx="32" cy="48" r="8" fill="#e5e0d0" stroke="#7d7666"/><circle cx="32" cy="48" r="4" fill="#6fa8dc"/>`),
  pont_du_gard: plate('#c8d7bb',
    `<rect x="2" y="26" width="58" height="10" fill="#6fa8dc"/>` +
    `<rect x="4" y="22" width="54" height="18" fill="#d9c8a0" stroke="#8a7a58"/>` +
    `<g fill="#b9a67c"><rect x="8" y="22" width="5" height="18"/><rect x="20" y="22" width="5" height="18"/><rect x="32" y="22" width="5" height="18"/><rect x="44" y="22" width="5" height="18"/></g>` +
    `<rect x="4" y="29" width="54" height="3" fill="#8fb8e0"/>`),
  poste: plate('#e6dcc6',
    `<rect x="28" y="8" width="3" height="44" fill="#5b4632"/><path d="M31 10 h20 l-5 7 l5 7 h-20 z" fill="#b22234"/>` +
    `<rect x="10" y="40" width="14" height="10" rx="2" fill="#a37f52" stroke="#5b4632"/><rect x="38" y="40" width="14" height="10" rx="2" fill="#a37f52" stroke="#5b4632"/>`),
};

// Véhicules vus du dessus, orientés vers la droite (angle 0)
const VSVG: Record<VType, string> = {
  charrette:
    `<g transform="translate(0 4)">` +
    `<rect x="4" y="13" width="28" height="22" rx="2" fill="#a0784c" stroke="#4a3320" stroke-width="1.5"/>` +
    `<path d="M8 17 h20 M8 24 h20 M8 31 h20" stroke="#7a5832" stroke-width="1.5"/>` +
    `<rect x="9" y="8" width="8" height="5" rx="1.5" fill="#3b2a1e"/><rect x="9" y="35" width="8" height="5" rx="1.5" fill="#3b2a1e"/>` +
    `<path d="M32 24 h10" stroke="#4a3320" stroke-width="2.5"/>` +
    `<ellipse cx="50" cy="17" rx="10" ry="5" fill="#8b5a2b" stroke="#3b2a1e"/><ellipse cx="50" cy="31" rx="10" ry="5" fill="#9c6b3a" stroke="#3b2a1e"/>` +
    `<circle cx="60" cy="17" r="3" fill="#6b4423"/><circle cx="60" cy="31" r="3" fill="#7a4f2a"/></g>`,
  chariot:
    `<g transform="translate(0 4)">` +
    `<rect x="2" y="12" width="30" height="24" rx="3" fill="#ece3cf" stroke="#4a3320" stroke-width="1.5"/>` +
    `<path d="M8 12 v24 M16 12 v24 M24 12 v24" stroke="#cbbf9f" stroke-width="2"/>` +
    `<rect x="6" y="7" width="8" height="5" rx="1.5" fill="#3b2a1e"/><rect x="6" y="36" width="8" height="5" rx="1.5" fill="#3b2a1e"/>` +
    `<path d="M32 24 h8" stroke="#4a3320" stroke-width="2.5"/>` +
    `<ellipse cx="50" cy="18" rx="11" ry="4.5" fill="#5a3a22" stroke="#24170d"/><ellipse cx="50" cy="30" rx="11" ry="4.5" fill="#e8e0d0" stroke="#5a4a3a"/>` +
    `<circle cx="61" cy="18" r="2.5" fill="#3b2a1e"/><circle cx="61" cy="30" r="2.5" fill="#c9bfae"/></g>`,
  convoi:
    `<g transform="translate(0 4)">` +
    `<rect x="4" y="13" width="28" height="22" rx="2" fill="#a0784c" stroke="#4a3320" stroke-width="1.5"/>` +
    `<g fill="#d8d2c2" stroke="#6d665a"><rect x="7" y="16" width="10" height="7"/><rect x="18" y="16" width="10" height="7"/><rect x="12" y="25" width="10" height="7"/></g>` +
    `<path d="M32 24 h10" stroke="#4a3320" stroke-width="2.5"/>` +
    `<ellipse cx="50" cy="17" rx="10" ry="5" fill="#8b5a2b" stroke="#3b2a1e"/><ellipse cx="50" cy="31" rx="10" ry="5" fill="#9c6b3a" stroke="#3b2a1e"/></g>`,
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
