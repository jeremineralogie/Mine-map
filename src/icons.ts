// Icônes vues du dessus (SVG), converties en images pour le canvas.
import type { BType, ResId, VType } from './defs';

// ---- Bâtiments : pictogrammes (pastille colorée par catégorie, symbole blanc) ----
/** Couleurs des catégories de bâtiments */
export const CATEGORY: Record<string, { name: string; color: string }> = {
  // ordre d'affichage dans l'onglet Construire
  ville: { name: 'Ville', color: '#b42318' },
  logistique: { name: 'Logistique', color: '#1d5fa8' },
  nature: { name: 'Agriculture et forêt', color: '#2f9e44' },
  extraction: { name: 'Extraction', color: '#8a5a2b' },
  commerce: { name: 'Commerce', color: '#7048b6' },
  artisanat: { name: 'Artisanat', color: '#d9480f' },
  ouvrage: { name: 'Grands ouvrages', color: '#0c7c8c' },
};
export const BCAT: Record<BType, string> = {
  entrepot: 'logistique', port: 'logistique', port_mer: 'commerce', poste: 'commerce', comptoir: 'commerce',
  carriere: 'extraction', argiliere: 'extraction', mine_fer: 'extraction', mine_plomb: 'extraction', saline: 'extraction',
  ferme: 'nature', bucheron: 'nature', briqueterie: 'artisanat', bas_fourneau: 'artisanat', forge: 'artisanat',
  village: 'ville', aqueduc: 'ouvrage', pont_du_gard: 'ouvrage',
  vignoble: 'nature', oliveraie: 'nature', pecherie: 'nature', bergerie: 'nature',
  potier: 'artisanat', verrerie: 'artisanat', four_chaux: 'artisanat', saloir: 'artisanat', tissage: 'artisanat', fonderie: 'artisanat',
  carriere_marbre: 'extraction', mine_cuivre: 'extraction', mine_etain: 'extraction',
  taverne: 'commerce', caserne: 'ville',
  thermes: 'ville', amphitheatre: 'ville', remparts: 'ville', basilique: 'ville', relais: 'logistique', phare: 'commerce', arenes: 'ouvrage',
  moulin_eau: 'artisanat', moulin_vent: 'artisanat', scierie: 'artisanat', brasserie: 'artisanat',
  carriere_granite: 'extraction', ardoisiere: 'extraction', mine_or: 'extraction', elevage: 'nature',
  monastere: 'ville', chateau_fort: 'ville', halle: 'ville', hotel_dieu: 'ville', foire: 'commerce',
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
  comptoir: `<path d="M27 11 H37 V15 Q43 19 43 29 Q43 39 34 45 H30 Q21 39 21 29 Q21 19 27 15 Z" stroke-width="0"/><path d="M27 15 Q20 15 19 21 M37 15 Q44 15 45 21" stroke-width="2.4" fill="none"/><path d="M23 27 H41 M24 33 H40" stroke="{c}" stroke-width="1.8"/><path d="M12 50 q5 -2.5 10 0 t10 0 t10 0 t10 0" stroke-width="1.8" fill="none"/>`,
  vignoble: `<g stroke-width="0"><circle cx="27" cy="27" r="4.2"/><circle cx="36" cy="27" r="4.2"/><circle cx="31.5" cy="34" r="4.2"/><circle cx="23" cy="34" r="4.2"/><circle cx="40" cy="34" r="4.2"/><circle cx="27" cy="41" r="4.2"/><circle cx="36" cy="41" r="4.2"/><circle cx="31.5" cy="47" r="3.8"/></g><path d="M32 22 V14" stroke-width="2.4" fill="none"/><path d="M33 16 Q42 10 47 17 Q40 21 33 16 Z" stroke-width="0"/>`,
  oliveraie: `<path d="M14 44 Q30 36 50 18" stroke-width="2.6" fill="none"/><g stroke-width="0"><ellipse cx="22" cy="35" rx="7" ry="2.8" transform="rotate(-35 22 35)"/><ellipse cx="32" cy="27" rx="7" ry="2.8" transform="rotate(25 32 27)"/><ellipse cx="40" cy="24" rx="7" ry="2.8" transform="rotate(-50 40 24)"/><ellipse cx="45" cy="15" rx="6" ry="2.6" transform="rotate(20 45 15)"/></g><circle cx="26" cy="43" r="4" stroke-width="0"/><circle cx="36" cy="36" r="4" stroke-width="0"/>`,
  potier: `<path d="M14 24 H50 Q49 38 38 42 H26 Q15 38 14 24 Z" stroke-width="0"/><path d="M26 42 L24 47 H40 L38 42" stroke-width="0"/><path d="M18 30 H46" stroke="{c}" stroke-width="1.8"/><circle cx="23" cy="35" r="1.6" fill="{c}" stroke-width="0"/><circle cx="32" cy="36" r="1.6" fill="{c}" stroke-width="0"/><circle cx="41" cy="35" r="1.6" fill="{c}" stroke-width="0"/>`,
  verrerie: `<path d="M27 12 H37 V22 Q46 26 46 36 Q46 47 32 47 Q18 47 18 36 Q18 26 27 22 Z" stroke-width="0"/><path d="M22 36 Q32 32 42 36" stroke="{c}" stroke-width="2" fill="none"/><path d="M38 28 Q41 31 40 35" stroke="{c}" stroke-width="1.6" fill="none" opacity=".7"/>`,
  four_chaux: `<path d="M16 46 V32 Q16 18 32 18 Q48 18 48 32 V46 Z" stroke-width="0"/><path d="M26 46 V37 Q32 30 38 37 V46 Z" fill="{c}" stroke-width="0"/><path d="M30 16 Q26 11 30 6 Q31 10 33 9 Q35 13 32 16 Z" stroke-width="0"/>`,
  carriere_marbre: `<rect x="14" y="30" width="18" height="14" rx="1" stroke-width="0"/><rect x="34" y="30" width="16" height="14" rx="1" stroke-width="0"/><rect x="22" y="16" width="20" height="12" rx="1" stroke-width="0"/><path d="M17 36 L24 40 L29 34 M37 34 L42 39 L47 35 M26 20 L32 25 L38 20" stroke="{c}" stroke-width="1.3" fill="none"/>`,
  pecherie: `<path d="M12 32 Q24 18 40 26 L50 18 L48 32 L50 46 L40 38 Q24 46 12 32 Z" stroke-width="0"/><circle cx="20" cy="30" r="2" fill="{c}" stroke-width="0"/><path d="M30 26 Q33 32 30 38" stroke="{c}" stroke-width="1.6" fill="none"/>`,
  saloir: `<path d="M25 12 H39 V16 Q46 21 46 32 Q46 45 36 48 H28 Q18 45 18 32 Q18 21 25 16 Z" stroke-width="0"/><path d="M22 28 Q32 33 42 28" stroke="{c}" stroke-width="1.8" fill="none"/><g fill="{c}" stroke-width="0"><rect x="27" y="36" width="3" height="3"/><rect x="33" y="38" width="3" height="3"/><rect x="30" y="41" width="2.6" height="2.6"/></g>`,
  bergerie: `<g stroke-width="0"><circle cx="24" cy="30" r="7"/><circle cx="33" cy="27" r="8"/><circle cx="41" cy="31" r="7"/><circle cx="30" cy="36" r="7"/><circle cx="38" cy="37" r="6.5"/></g><ellipse cx="17" cy="35" rx="5" ry="4" fill="{c}" stroke="#fff" stroke-width="2"/><path d="M26 42 V48 M38 42 V48" stroke-width="3" fill="none"/>`,
  tissage: `<path d="M14 14 V48 M50 14 V48 M12 16 H52 M12 46 H52" stroke-width="3" fill="none"/><path d="M20 16 V46 M26 16 V46 M32 16 V46 M38 16 V46 M44 16 V46" stroke-width="1.4" fill="none"/><path d="M16 26 H48 M16 33 H48" stroke-width="3.2" fill="none"/>`,
  mine_cuivre: `<path d="M14 44 Q14 24 32 22 Q50 24 50 44 Z" stroke-width="0"/><path d="M24 44 Q24 33 32 33 Q40 33 40 44 Z" fill="{c}" stroke-width="0"/><text x="44" y="20" font-size="11" font-weight="800" text-anchor="middle" font-family="system-ui,sans-serif" stroke-width="0">Cu</text>`,
  mine_etain: `<path d="M14 44 Q14 24 32 22 Q50 24 50 44 Z" stroke-width="0"/><path d="M24 44 Q24 33 32 33 Q40 33 40 44 Z" fill="{c}" stroke-width="0"/><text x="44" y="20" font-size="11" font-weight="800" text-anchor="middle" font-family="system-ui,sans-serif" stroke-width="0">Sn</text>`,
  fonderie: `<path d="M14 18 H36 L33 32 H17 Z" stroke-width="0"/><path d="M36 20 Q44 22 44 30" stroke-width="2.4" fill="none"/><path d="M33 26 Q40 30 41 40" stroke-width="3" fill="none" opacity=".9"/><path d="M30 46 H50 L46 40 H34 Z" stroke-width="0"/><path d="M24 10 Q21 6 24 3" stroke-width="1.8" fill="none"/>`,
  thermes: `<path d="M12 36 H52 V44 Q52 47 49 47 H15 Q12 47 12 44 Z" stroke-width="0"/><path d="M14 40 q4 -2.5 8 0 t8 0 t8 0 t8 0 t8 0" stroke="{c}" stroke-width="1.6" fill="none"/><path d="M22 30 Q19 25 22 20 Q25 15 22 10 M32 30 Q29 25 32 20 Q35 15 32 10 M42 30 Q39 25 42 20 Q45 15 42 10" stroke-width="2.2" fill="none"/>`,
  amphitheatre: `<ellipse cx="32" cy="32" rx="21" ry="15" stroke-width="0"/><ellipse cx="32" cy="32" rx="11" ry="7" fill="{c}" stroke-width="0"/><path d="M14 38 V44 M20 42 V48 M26 44 V50 M32 45 V51 M38 44 V50 M44 42 V48 M50 38 V44" stroke-width="2.4" fill="none"/>`,
  remparts: `<path d="M10 46 V24 H16 V19 H22 V24 H28 V19 H36 V24 H42 V19 H48 V24 H54 V46 Z" stroke-width="0"/><path d="M27 46 V37 Q32 31 37 37 V46 Z" fill="{c}" stroke-width="0"/>`,
  basilique: `<path d="M14 46 V28 L32 16 L50 28 V46 Z" stroke-width="0"/><path d="M32 5 V15 M28 9 H36" stroke-width="2.6" fill="none"/><path d="M28 46 V36 Q32 31 36 36 V46 Z" fill="{c}" stroke-width="0"/><path d="M19 32 V40 M45 32 V40" stroke="{c}" stroke-width="2.4"/>`,
  relais: `<path d="M20 46 Q14 34 20 22 Q26 12 32 12 Q38 12 44 22 Q50 34 44 46" stroke-width="5" fill="none"/><g fill="{c}" stroke-width="0"><circle cx="18" cy="32" r="1.6"/><circle cx="46" cy="32" r="1.6"/><circle cx="21" cy="22" r="1.6"/><circle cx="43" cy="22" r="1.6"/></g>`,
  phare: `<path d="M26 48 L28 20 H36 L38 48 Z" stroke-width="0"/><rect x="26" y="13" width="12" height="7" stroke-width="0"/><path d="M24 13 L32 7 L40 13 Z" stroke-width="0"/><path d="M42 15 L52 11 M42 18 L53 18 M22 15 L12 11 M22 18 L11 18" stroke-width="1.8" fill="none"/><path d="M29 30 H35 M29 38 H35" stroke="{c}" stroke-width="1.6"/>`,
  arenes: `<ellipse cx="32" cy="30" rx="23" ry="15" stroke-width="0"/><ellipse cx="32" cy="29" rx="12" ry="7" fill="{c}" stroke-width="0"/><path d="M11 34 V42 Q32 52 53 42 V34" stroke-width="0"/><path d="M15 39 V43 M21 41 V46 M27 42 V47 M33 42.5 V47.5 M39 42 V47 M45 41 V46 M50 39 V43" stroke="{c}" stroke-width="2.2"/>`,
  taverne: `<path d="M18 22 H38 V44 Q38 48 34 48 H22 Q18 48 18 44 Z" stroke-width="0"/><path d="M38 27 Q47 27 47 34 Q47 41 38 41" stroke-width="3.4" fill="none"/><path d="M18 22 Q18 14 24 15 Q27 10 32 13 Q37 11 38 17 Q41 19 38 22" stroke-width="0"/><path d="M23 28 V43 M28 28 V43 M33 28 V43" stroke="{c}" stroke-width="1.6"/>`,
  caserne: `<path d="M14 48 L32 14 L50 48" stroke-width="0"/><path d="M14 48 L32 14 L50 48 Z" stroke-width="0"/><path d="M27 48 V37 Q32 31 37 37 V48 Z" fill="{c}" stroke-width="0"/><path d="M32 14 V6 M32 7 L42 10 L32 13" stroke-width="2" fill="#fff"/><path d="M22 34 L42 34" stroke="{c}" stroke-width="1.6"/>`,
  // ---- Moyen Âge (dessins simples, en attendant les médaillons) ----
  moulin_eau: `<rect x="14" y="22" width="18" height="22" stroke-width="0"/><path d="M12 23 L23 14 L34 23 Z" stroke-width="0"/><circle cx="41" cy="34" r="10" fill="none" stroke-width="2.6"/><path d="M41 24 V44 M31 34 H51 M34 27 L48 41 M48 27 L34 41" stroke-width="1.6"/><path d="M10 48 q5 -2.5 10 0 t10 0 t10 0 t10 0" stroke-width="1.8" fill="none"/>`,
  moulin_vent: `<path d="M26 46 L28 28 H36 L38 46 Z" stroke-width="0"/><path d="M26 28 Q32 20 38 28 Z" stroke-width="0"/><path d="M32 25 L16 10 M32 25 L48 10 M32 25 L16 40 M32 25 L48 40" stroke-width="2.4" fill="none"/><path d="M18 12 L24 10 L28 17 Z M46 12 L40 10 L36 17 Z M18 38 L24 40 L28 33 Z M46 38 L40 40 L36 33 Z" stroke-width="0"/>`,
  scierie: `<rect x="12" y="30" width="40" height="8" rx="2" stroke-width="0"/><path d="M14 30 V22 M50 30 V22" stroke-width="2.4"/><circle cx="32" cy="24" r="9" fill="{c}" stroke-width="2.4"/><path d="M32 15 l2 3 l-4 0 Z M41 24 l-3 2 l0 -4 Z M32 33 l-2 -3 l4 0 Z M23 24 l3 -2 l0 4 Z" stroke-width="0"/><path d="M12 42 H52 M14 46 H50" stroke-width="2.2"/>`,
  carriere_granite: `<rect x="14" y="32" width="14" height="12" rx="1" stroke-width="0"/><rect x="30" y="32" width="18" height="12" rx="1" stroke-width="0"/><rect x="21" y="18" width="18" height="12" rx="1" stroke-width="0"/><g fill="{c}" stroke-width="0"><circle cx="18" cy="37" r="1.3"/><circle cx="24" cy="40" r="1.3"/><circle cx="35" cy="36" r="1.3"/><circle cx="42" cy="40" r="1.3"/><circle cx="27" cy="23" r="1.3"/><circle cx="33" cy="26" r="1.3"/></g>`,
  ardoisiere: `<path d="M12 40 L22 18 H30 L20 40 Z M24 42 L34 20 H42 L32 42 Z M36 44 L46 22 H54 L44 44 Z" stroke-width="0"/><path d="M17 33 H25 M29 35 H37 M41 37 H49" stroke="{c}" stroke-width="1.4"/>`,
  elevage: `<ellipse cx="32" cy="32" rx="15" ry="9" stroke-width="0"/><path d="M45 28 Q52 26 52 32 Q52 37 46 36 Z" stroke-width="0"/><path d="M47 26 L45 21 M51 27 L54 23" stroke-width="2" fill="none"/><path d="M21 40 V48 M27 40 V48 M37 40 V48 M43 40 V48" stroke-width="3" fill="none"/><path d="M17 30 Q12 32 13 38" stroke-width="2" fill="none"/>`,
  brasserie: `<path d="M18 16 H40 V46 Q40 50 36 50 H22 Q18 50 18 46 Z" stroke-width="0"/><path d="M40 22 Q50 22 50 31 Q50 40 40 40" stroke-width="3.4" fill="none"/><path d="M16 18 Q16 10 23 12 Q27 7 32 11 Q38 8 41 14 Q43 17 40 19 Z" stroke-width="0"/><path d="M23 24 V44 M29 24 V44 M35 24 V44" stroke="{c}" stroke-width="1.6"/>`,
  mine_or: `<path d="M14 44 Q14 24 32 22 Q50 24 50 44 Z" stroke-width="0"/><path d="M24 44 Q24 33 32 33 Q40 33 40 44 Z" fill="{c}" stroke-width="0"/><text x="44" y="20" font-size="11" font-weight="800" text-anchor="middle" font-family="system-ui,sans-serif" stroke-width="0">Au</text>`,
  monastere: `<path d="M12 46 V30 L22 24 V46 Z" stroke-width="0"/><path d="M22 46 V26 L37 16 L52 26 V46 Z" stroke-width="0"/><path d="M37 4 V14 M33 8 H41" stroke-width="2.4" fill="none"/><path d="M33 46 V36 Q37 31 41 36 V46 Z" fill="{c}" stroke-width="0"/><circle cx="37" cy="26" r="3" fill="{c}" stroke-width="0"/>`,
  chateau_fort: `<path d="M10 48 V26 H14 V22 H18 V26 H22 V48 Z M42 48 V26 H46 V22 H50 V26 H54 V48 Z" stroke-width="0"/><path d="M22 48 V32 H42 V48 Z" stroke-width="0"/><path d="M25 32 V14 H28 V10 H31 V14 H33 V10 H36 V14 H39 V32 Z" stroke-width="0"/><path d="M28 48 V40 Q32 35 36 40 V48 Z" fill="{c}" stroke-width="0"/>`,
  halle: `<path d="M8 30 L32 14 L56 30 Z" stroke-width="0"/><path d="M14 30 V46 M24 30 V46 M32 30 V46 M40 30 V46 M50 30 V46" stroke-width="3" fill="none"/><path d="M10 47 H54" stroke-width="2.6"/><rect x="26" y="37" width="12" height="6" rx="1" fill="{c}" stroke="#fff" stroke-width="1.4"/>`,
  hotel_dieu: `<path d="M12 46 V26 L32 14 L52 26 V46 Z" stroke-width="0"/><path d="M28 24 H36 V30 H42 V38 H36 V44 H28 V38 H22 V30 H28 Z" fill="{c}" stroke-width="0"/>`,
  foire: `<path d="M10 30 L20 18 L30 30 Z M34 30 L44 18 L54 30 Z" stroke-width="0"/><path d="M12 30 V44 M28 30 V44 M36 30 V44 M52 30 V44" stroke-width="2.4" fill="none"/><path d="M10 44 H54" stroke-width="2.4"/><path d="M20 18 V10 L26 12 L20 14 M44 18 V10 L50 12 L44 14" stroke-width="1.6" fill="#fff"/><circle cx="20" cy="38" r="3" fill="{c}" stroke="#fff" stroke-width="1.2"/><rect x="40" y="35" width="8" height="6" fill="{c}" stroke="#fff" stroke-width="1.2"/>`,
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
  navire: hull('#5a3518', `<rect x="14" y="17" width="12" height="14" fill="url(#pl2)"/>${blk(15, 18, 5, 5)}${blk(20, 25, 5, 5)}<rect x="44" y="17" width="8" height="14" fill="url(#pl2)"/>
    <path d="M36 4 Q31 24 36 44" fill="#f4ecd8" stroke="#8a7a5a" stroke-width="1.2"/><path d="M36 4 V44" stroke="#3b2a1e" stroke-width="2.4"/><path d="M34 14 Q30 24 34 34" fill="none" stroke="#b03a2e" stroke-width="2"/><circle cx="36" cy="24" r="2.2" fill="#3b2a1e"/>`),
  carpentum: `${VDEFS}<g filter="url(#s)" transform="translate(0 4)">${wheels([4, 22])}
    <rect x="1" y="12" width="32" height="24" rx="8" fill="#8a2d2d" stroke="#4a1616" stroke-width="1.3"/>
    <path d="M7 12 v24 M14 12 v24 M21 12 v24 M28 12 v24" stroke="#a84040" stroke-width="2.2"/><rect x="1" y="22.5" width="32" height="3" fill="#c9a04a"/>
    <path d="M33 24 h8 M40 17 v14" stroke="#4a3320" stroke-width="2"/>${horse(50, 18, '#3a2416')}${horse(50, 30, '#7a5230')}</g>`,
  grande_barge: hull('#5e3a1c', `${blk(14, 16, 7, 5)}${blk(22, 16, 7, 5)}${blk(30, 16, 7, 5)}${blk(14, 27, 7, 5)}${blk(22, 27, 7, 5)}${blk(30, 27, 7, 5)}<rect x="40" y="17" width="10" height="14" rx="1" fill="#c9a774" stroke="#6e4a26"/><rect x="38" y="22" width="2" height="4" fill="#3b2a1e"/>`),
  oneraria: hull('#4a2a12', `${blk(12, 17, 6, 6)}${blk(12, 25, 6, 6)}${blk(19, 21, 6, 6)}<rect x="46" y="17" width="7" height="14" fill="url(#pl2)"/>
    <path d="M30 2 Q24 24 30 46" fill="#efe2c4" stroke="#8a7a5a" stroke-width="1.2"/><path d="M30 2 V46" stroke="#3b2a1e" stroke-width="2.6"/><path d="M41 10 Q37 24 41 38" fill="#efe2c4" stroke="#8a7a5a" stroke-width="1"/><path d="M41 10 V38" stroke="#3b2a1e" stroke-width="1.8"/><path d="M28 12 Q24 24 28 36" fill="none" stroke="#b03a2e" stroke-width="2"/>`),
  chaland: hull('#8a5a2b', `<rect x="18" y="17" width="31" height="14" fill="url(#pl2)"/>${blk(20, 18, 7, 5)}${blk(29, 18, 7, 5)}${blk(24, 25, 7, 5)}${blk(38, 21, 8, 6)}`),
};

function toImg(svg: string) {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 64 64">${svg}</svg>`);
  return img;
}

export const BICON = Object.fromEntries(Object.entries(SVG).map(([k, v]) => [k, toImg(v)])) as Record<BType, HTMLImageElement>;
export const VICON = Object.fromEntries(Object.entries(VSVG).map(([k, v]) => [k, toImg(v)])) as Record<VType, HTMLImageElement>;
/** Médaillons illustrés des villes, un par palier (Village → Capitale) */
const CITY_URLS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `${import.meta.env.BASE_URL}icones/ville_${i}.png`);
const CITY_IMG = CITY_URLS.map(u => { const img = new Image(); img.src = u; return img; });
const tierIx = (tier = 0) => Math.max(0, Math.min(CITY_URLS.length - 1, tier));
/** Image d'une ville selon son palier (l'icône dessinée tant que l'image n'est pas chargée) */
export const cityIcon = (tier?: number) => { const img = CITY_IMG[tierIx(tier)]; return img.complete && img.naturalWidth ? img : BICON.village; };
export const cityIconUrl = (tier?: number) => CITY_URLS[tierIx(tier)];
/** Médaillons illustrés de certains bâtiments (remplacent le pictogramme une fois chargés) */
// un fichier par niveau quand le bâtiment change d'aspect en s'améliorant
const ART_FILES: Partial<Record<BType, string[]>> = {
  thermes: ['thermes'], amphitheatre: ['amphitheatre'], remparts: ['remparts'], basilique: ['basilique'], caserne: ['caserne'],
  entrepot: ['entrepot_1', 'entrepot_2', 'entrepot_3'], port: ['port_1', 'port_2', 'port_3'], relais: ['relais'],
  bucheron: ['bucheron_1', 'bucheron_2', 'bucheron_3'],
  vignoble: ['vignoble_1', 'vignoble_2', 'vignoble_3'], oliveraie: ['oliveraie_1', 'oliveraie_2', 'oliveraie_3'],
  pecherie: ['pecherie_1', 'pecherie_2', 'pecherie_3'], bergerie: ['bergerie_1', 'bergerie_2', 'bergerie_3'],
  carriere: ['carriere_1', 'carriere_2', 'carriere_3'], argiliere: ['argiliere_1', 'argiliere_2', 'argiliere_3'],
  mine_fer: ['mine_fer_1', 'mine_fer_2', 'mine_fer_3'], mine_plomb: ['mine_plomb_1', 'mine_plomb_2', 'mine_plomb_3'],
  saline: ['saline_1', 'saline_2', 'saline_3'], carriere_marbre: ['carriere_marbre_1', 'carriere_marbre_2', 'carriere_marbre_3'],
  mine_cuivre: ['mine_cuivre_1', 'mine_cuivre_2', 'mine_cuivre_3'], mine_etain: ['mine_etain_1', 'mine_etain_2', 'mine_etain_3'],
  briqueterie: ['briqueterie_1', 'briqueterie_2', 'briqueterie_3'], bas_fourneau: ['bas_fourneau_1', 'bas_fourneau_2', 'bas_fourneau_3'],
  forge: ['forge_1', 'forge_2', 'forge_3'],
  potier: ['potier_1', 'potier_2', 'potier_3'], verrerie: ['verrerie_1', 'verrerie_2', 'verrerie_3'], four_chaux: ['four_chaux_1', 'four_chaux_2', 'four_chaux_3'],
  aqueduc: ['aqueduc'], pont_du_gard: ['pont_du_gard'], arenes: ['arenes'],
  saloir: ['saloir_1', 'saloir_2', 'saloir_3'], tissage: ['tissage_1', 'tissage_2', 'tissage_3'], fonderie: ['fonderie_1', 'fonderie_2', 'fonderie_3'],
  // Moyen Âge
  moulin_eau: ['moulin_eau_1', 'moulin_eau_2', 'moulin_eau_3'], moulin_vent: ['moulin_vent_1', 'moulin_vent_2', 'moulin_vent_3'],
  scierie: ['scierie_1', 'scierie_2', 'scierie_3'], carriere_granite: ['carriere_granite_1', 'carriere_granite_2', 'carriere_granite_3'],
  ardoisiere: ['ardoisiere_1', 'ardoisiere_2', 'ardoisiere_3'], elevage: ['elevage_1', 'elevage_2', 'elevage_3'],
  brasserie: ['brasserie_1', 'brasserie_2', 'brasserie_3'], mine_or: ['mine_or_1', 'mine_or_2', 'mine_or_3'],
  monastere: ['monastere'], chateau_fort: ['chateau_fort'], halle: ['halle'], hotel_dieu: ['hotel_dieu'], foire: ['foire'],
  // une seule image pour l'instant (niveau 1), utilisée à tous les niveaux
  port_mer: ['port_mer'], comptoir: ['comptoir'], poste: ['poste'], phare: ['phare'], taverne: ['taverne'],
  // villa agricole : niveaux 1 à 3, puis grand domaine aux niveaux 4 à 6
  ferme: ['ferme_1', 'ferme_2', 'ferme_3', 'ferme_4', 'ferme_5', 'ferme_6'],
};
const ART = Object.fromEntries(Object.entries(ART_FILES).map(([t, fs]) => [t, fs.map(f => { const img = new Image(); img.src = `${import.meta.env.BASE_URL}icones/${f}.png`; return img; })])) as Partial<Record<BType, HTMLImageElement[]>>;
const artOf = (t: BType, level = 1) => { const l = ART[t]; return l?.[Math.max(0, Math.min(l.length, level) - 1)]; };
/** Image d'un bâtiment pour la carte (selon son niveau) : son médaillon illustré s'il en a un, sinon son pictogramme */
export const bIcon = (t: BType, level?: number) => { const a = artOf(t, level); return a && a.complete && a.naturalWidth ? a : BICON[t]; };
/** URL d'icône pour l'interface HTML */
export const bIconUrl = (t: BType, level?: number) => artOf(t, level)?.src ?? BICON[t].src;
/** Illustrations des véhicules, vues de dessus, tournées vers la droite (remplacent le pictogramme une fois chargées) */
const VART: Partial<Record<VType, HTMLImageElement>> = {};
for (const t of ['charrette', 'chariot', 'barge', 'carpentum', 'grande_barge', 'oneraria', 'navire', 'chaland', 'convoi'] as VType[]) { const img = new Image(); img.src = `${import.meta.env.BASE_URL}icones/v_${t}.png`; VART[t] = img; }
/** Image d'un véhicule pour la carte, et sa hauteur relative (largeur = 1) */
export const vIcon = (t: VType): { img: HTMLImageElement; h: number } => {
  const a = VART[t];
  return a && a.complete && a.naturalWidth ? { img: a, h: a.naturalHeight / a.naturalWidth } : { img: VICON[t], h: 1 };
};
export const vIconUrl = (t: VType) => VART[t]?.src ?? VICON[t].src;

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
  vin: `<path d="M6 3 H18 V8 Q18 14 12 14 Q6 14 6 8 Z" fill="#7b2346" stroke="#4a1028" stroke-width="1"/><path d="M12 14 V19 M8 21 H16" stroke="#4a1028" stroke-width="1.6"/><path d="M8 6 H16" stroke="#c4587a" stroke-width="1"/>`,
  huile: `<path d="M9 2 H15 V5 Q20 8 20 14 Q20 21 12 21 Q4 21 4 14 Q4 8 9 5 Z" fill="#c9b23a" stroke="#6b5f12" stroke-width="1"/><path d="M8 13 Q12 10 16 13" stroke="#fff6b0" stroke-width="1.2" fill="none"/>`,
  sigillee: `<path d="M3 8 H21 Q20 16 15 18 H9 Q4 16 3 8 Z" fill="#b8462e" stroke="#6e2416" stroke-width="1"/><path d="M9 18 L8 21 H16 L15 18" fill="#9a3a26" stroke="#6e2416" stroke-width=".8"/><path d="M5 11 H19" stroke="#e58a6a" stroke-width="1"/>`,
  marbre: `<path d="M3 9 L12 5 L21 9 L21 18 L12 21 L3 18 Z" fill="#efeae2" stroke="#8a8478" stroke-width="1.1"/><path d="M3 9 L12 13 L21 9 M12 13 V21" fill="none" stroke="#8a8478" stroke-width="1"/><path d="M6 14 L9 16 L8 18 M15 12 L18 14" stroke="#9aa0a8" stroke-width=".8" fill="none"/>`,
  garum: `<path d="M9 2 H15 V4 Q19 7 19 13 Q19 20 13 22 H11 Q5 20 5 13 Q5 7 9 4 Z" fill="#a8683a" stroke="#5a3418" stroke-width="1"/><path d="M5 9 Q2 9 2 12 M19 9 Q22 9 22 12" stroke="#5a3418" stroke-width="1.2" fill="none"/><path d="M8 12 Q12 15 16 12" stroke="#e0b07a" stroke-width="1.1" fill="none"/>`,
  laine: `<g fill="#f3ecda" stroke="#a89a78" stroke-width=".9"><circle cx="8" cy="12" r="5"/><circle cx="15" cy="10" r="5.5"/><circle cx="13" cy="16" r="5"/></g><path d="M10 11 Q12 9 14 11 M12 15 Q14 13 16 15" stroke="#c4b48e" stroke-width=".8" fill="none"/>`,
  tissus: `<path d="M3 6 H17 Q21 6 21 10 V19 H7 Q3 19 3 15 Z" fill="#6f4e9c" stroke="#3b2556" stroke-width="1"/><path d="M3 6 Q7 6 7 10 V19" fill="none" stroke="#3b2556" stroke-width="1"/><path d="M10 10 H18 M10 13 H18 M10 16 H18" stroke="#a88ad0" stroke-width=".9"/>`,
  verre: `<path d="M9 2 H15 V7 Q20 10 20 15 Q20 21 12 21 Q4 21 4 15 Q4 10 9 7 Z" fill="#a8dadc" stroke="#3d7a80" stroke-width="1" fill-opacity=".9"/><path d="M8 13 Q9 10 11 9" stroke="#fff" stroke-width="1.4" fill="none"/>`,
  chaux: `<path d="M4 19 Q4 11 12 11 Q20 11 20 19 Z" fill="#f4f4f2" stroke="#9a9a94" stroke-width="1.1"/><path d="M7 11 Q8 6 12 6 Q16 6 17 11" fill="#e8e8e4" stroke="#9a9a94" stroke-width="1"/><path d="M3 19 H21" stroke="#9a9a94" stroke-width="1.4"/>`,
  bronze: `<path d="M3 15 L7 9 L21 9 L17 15 Z" fill="#e0a060" stroke="#7a4a1c" stroke-width="1.2"/><path d="M3 15 L17 15 L17 19 L3 19 Z" fill="#b8742e" stroke="#7a4a1c" stroke-width="1.2"/><path d="M17 15 L21 9 L21 13 L17 19 Z" fill="#c8843e" stroke="#7a4a1c" stroke-width="1.2"/>`,
  poisson: `<path d="M2 12 Q8 5 15 9 L21 5 L20 12 L21 19 L15 15 Q8 19 2 12 Z" fill="#5f9ea0" stroke="#2c5a5c" stroke-width="1"/><circle cx="6" cy="11" r="1.2" fill="#fff"/>`,
  cuivre: `<path d="M3 16 L6 8 L12 5 L19 7 L21 14 L16 20 L7 20 Z" fill="#9a5a2e" stroke="#4a2a14" stroke-width="1.2"/><g fill="#e0904a"><circle cx="9" cy="11" r="1.8"/><circle cx="15" cy="10" r="1.5"/><circle cx="13" cy="16" r="2"/></g>`,
  etain: `<path d="M3 16 L6 8 L12 5 L19 7 L21 14 L16 20 L7 20 Z" fill="#7d858e" stroke="#3a3f47" stroke-width="1.2"/><g fill="#dfe5ea"><circle cx="9" cy="11" r="1.8"/><circle cx="15" cy="10" r="1.5"/><circle cx="13" cy="16" r="2"/></g>`,
  farine: `<path d="M6 8 Q6 4 12 4 Q18 4 18 8 L20 20 Q20 22 12 22 Q4 22 4 20 Z" fill="#efe3c4" stroke="#8a7a52" stroke-width="1.1"/><path d="M7 7 Q12 9 17 7" stroke="#8a7a52" stroke-width="1" fill="none"/><path d="M9 14 Q12 11 15 14 Q12 17 9 14 Z" fill="#c9a86a"/>`,
  biere: `<path d="M5 7 H16 V20 Q16 22 14 22 H7 Q5 22 5 20 Z" fill="#d4a017" stroke="#6b4e0a" stroke-width="1.1"/><path d="M4 7 Q4 3 8 4 Q10 1 13 3 Q17 2 17 7 Z" fill="#fffaf0" stroke="#b9ab8a" stroke-width=".8"/><path d="M16 10 Q21 10 21 14 Q21 18 16 18" stroke="#6b4e0a" stroke-width="1.8" fill="none"/>`,
  viande: `<path d="M4 13 Q4 5 13 5 Q20 5 20 12 Q20 19 12 19 Q8 19 7 17 L4 20 L3 18 L5 16 Q4 15 4 13 Z" fill="#b5413a" stroke="#5e1a14" stroke-width="1.1"/><path d="M8 11 Q12 8 16 11" stroke="#f0b5a8" stroke-width="1.4" fill="none"/>`,
  planches: `<g stroke="#6e4a26" stroke-width="1"><rect x="2" y="15" width="20" height="4" fill="#c19a6b"/><rect x="3" y="10" width="19" height="4" fill="#d1ad80"/><rect x="2" y="5" width="18" height="4" fill="#c19a6b"/></g>`,
  granite: `<path d="M3 9 L12 5 L21 9 L21 18 L12 21 L3 18 Z" fill="#8a8c93" stroke="#45474d" stroke-width="1.2"/><path d="M3 9 L12 13 L21 9 M12 13 V21" fill="none" stroke="#45474d" stroke-width="1.1"/><g fill="#2f3136"><circle cx="7" cy="14" r=".9"/><circle cx="16" cy="15" r=".9"/><circle cx="12" cy="9" r=".9"/><circle cx="17" cy="11" r=".7"/></g><g fill="#e8e0d6"><circle cx="9" cy="17" r=".7"/><circle cx="15" cy="18" r=".7"/></g>`,
  ardoise: `<path d="M3 17 L9 5 H14 L8 17 Z M10 19 L16 7 H21 L15 19 Z" fill="#4a5568" stroke="#1f2633" stroke-width="1"/>`,
  or: `<path d="M3 15 L7 9 L21 9 L17 15 Z" fill="#f4d35e" stroke="#7a5c0a" stroke-width="1.2"/><path d="M3 15 L17 15 L17 19 L3 19 Z" fill="#d4af37" stroke="#7a5c0a" stroke-width="1.2"/><path d="M17 15 L21 9 L21 13 L17 19 Z" fill="#b8901c" stroke="#7a5c0a" stroke-width="1.2"/>`,
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
