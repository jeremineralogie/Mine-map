// Catalogue du jeu : ressources, gisements, bâtiments, véhicules, technologies, objectifs, événements.

export type ResId =
  | 'bois' | 'pierre' | 'argile' | 'sable' | 'calcaire' | 'granite' | 'ardoise' | 'minerai_fer' | 'charbon'
  | 'cuivre' | 'plomb' | 'etain' | 'zinc' | 'sel' | 'bauxite' | 'fluorine' | 'potasse' | 'uranium' | 'petrole'
  | 'gaz' | 'kaolin' | 'or' | 'terres_rares' | 'eau'
  | 'cereales' | 'poisson' | 'viande' | 'vin'
  | 'planches' | 'briques' | 'chaux' | 'ciment' | 'beton' | 'verre' | 'fer' | 'acier' | 'bronze' | 'aluminium'
  | 'carburant' | 'plastique' | 'porcelaine' | 'engrais'
  | 'outils' | 'machines' | 'rails' | 'vehicules' | 'electronique';

export interface ResDef { name: string; color: string; era: number; price: number; }

export const RES: Record<ResId, ResDef> = {
  bois: { name: 'Bois', color: '#2f7d3a', era: 1, price: 4 },
  pierre: { name: 'Pierre de taille', color: '#9a9488', era: 1, price: 5 },
  argile: { name: 'Argile', color: '#b5653a', era: 1, price: 3 },
  sable: { name: 'Sable', color: '#e0c77a', era: 3, price: 2 },
  calcaire: { name: 'Calcaire', color: '#d8d2bf', era: 2, price: 3 },
  granite: { name: 'Granite', color: '#7d7f86', era: 2, price: 6 },
  ardoise: { name: 'Ardoise', color: '#4a5568', era: 2, price: 7 },
  minerai_fer: { name: 'Minerai de fer', color: '#a0442c', era: 1, price: 8 },
  charbon: { name: 'Charbon', color: '#2b2b2b', era: 3, price: 9 },
  cuivre: { name: 'Cuivre', color: '#c27a3e', era: 2, price: 20 },
  plomb: { name: 'Plomb argentifère', color: '#6b7280', era: 1, price: 25 },
  etain: { name: 'Étain', color: '#b8c0c8', era: 2, price: 30 },
  zinc: { name: 'Zinc', color: '#8fa3b0', era: 3, price: 18 },
  sel: { name: 'Sel', color: '#f1f1f1', era: 1, price: 18 },
  bauxite: { name: 'Bauxite', color: '#c0392b', era: 4, price: 10 },
  fluorine: { name: 'Fluorine', color: '#8e44ad', era: 4, price: 22 },
  potasse: { name: 'Potasse', color: '#e67e22', era: 4, price: 12 },
  uranium: { name: 'Uranium', color: '#9acd32', era: 5, price: 120 },
  petrole: { name: 'Pétrole', color: '#111111', era: 4, price: 25 },
  gaz: { name: 'Gaz naturel', color: '#5dade2', era: 5, price: 20 },
  kaolin: { name: 'Kaolin', color: '#f5f0e6', era: 3, price: 10 },
  or: { name: 'Or et argent', color: '#d4af37', era: 2, price: 300 },
  terres_rares: { name: 'Terres rares', color: '#16a085', era: 5, price: 200 },
  eau: { name: 'Eau', color: '#3b82f6', era: 1, price: 0 },
  cereales: { name: 'Céréales', color: '#e1b12c', era: 1, price: 6 },
  poisson: { name: 'Poisson', color: '#5f9ea0', era: 2, price: 8 },
  viande: { name: 'Viande', color: '#a93226', era: 2, price: 12 },
  vin: { name: 'Vin', color: '#7b2346', era: 2, price: 20 },
  planches: { name: 'Planches', color: '#c19a6b', era: 2, price: 10 },
  briques: { name: 'Briques et tuiles', color: '#c0583a', era: 1, price: 14 },
  chaux: { name: 'Chaux', color: '#eeeeee', era: 2, price: 9 },
  ciment: { name: 'Ciment', color: '#a6a6a6', era: 4, price: 15 },
  beton: { name: 'Béton', color: '#8c8c8c', era: 4, price: 18 },
  verre: { name: 'Verre', color: '#a8dadc', era: 2, price: 25 },
  fer: { name: 'Fer', color: '#5a5a66', era: 1, price: 30 },
  acier: { name: 'Acier', color: '#4b6584', era: 3, price: 50 },
  bronze: { name: 'Bronze', color: '#cd7f32', era: 2, price: 45 },
  aluminium: { name: 'Aluminium', color: '#d0d6dc', era: 5, price: 80 },
  carburant: { name: 'Carburant', color: '#f39c12', era: 4, price: 40 },
  plastique: { name: 'Plastique', color: '#ff6b81', era: 5, price: 35 },
  porcelaine: { name: 'Porcelaine', color: '#fdfdfd', era: 3, price: 60 },
  engrais: { name: 'Engrais', color: '#6ab04c', era: 4, price: 20 },
  outils: { name: 'Outils', color: '#34495e', era: 1, price: 70 },
  machines: { name: 'Machines', color: '#2c3e50', era: 3, price: 150 },
  rails: { name: 'Rails', color: '#57606f', era: 3, price: 80 },
  vehicules: { name: 'Véhicules', color: '#e74c3c', era: 4, price: 400 },
  electronique: { name: 'Électronique', color: '#1abc9c', era: 5, price: 500 },
};

// ---- Gisements (positions approximativement réelles) ----
// [ressource, nom, longitude, latitude, demi-axe est-ouest (km), demi-axe nord-sud (km), richesse]
type DepRow = [ResId, string, number, number, number, number, number];
const DEP_ROWS: DepRow[] = [
  // Forêts
  ['bois', 'Ardennes', 4.8, 49.9, 50, 30, 1.2], ['bois', 'Vosges', 6.9, 48.2, 35, 70, 1.3],
  ['bois', 'Jura', 5.9, 46.6, 30, 60, 1.2], ['bois', 'Morvan', 4.0, 47.15, 30, 35, 1.1],
  ['bois', "Forêt d'Orléans", 2.1, 47.95, 35, 15, 1.1], ['bois', 'Fontainebleau', 2.65, 48.4, 18, 14, 1.0],
  ['bois', 'Compiègne', 2.9, 49.35, 20, 12, 1.0], ['bois', 'Landes', -0.9, 44.2, 55, 80, 0.8],
  ['bois', 'Massif central', 3.0, 45.3, 60, 55, 0.9], ['bois', 'Limousin', 1.8, 45.7, 50, 40, 1.0],
  ['bois', 'Alpes', 6.4, 45.0, 40, 80, 1.0], ['bois', 'Pyrénées', 0.6, 42.95, 150, 22, 1.0],
  ['bois', 'Brocéliande', -2.2, 48.0, 25, 18, 0.9], ['bois', 'Tronçais', 2.75, 46.65, 15, 15, 1.1],
  ['bois', 'Corse', 9.1, 42.2, 25, 40, 1.0], ['bois', 'Pays de Bray', 1.5, 49.45, 20, 15, 0.9],
  ['bois', 'Sologne', 1.9, 47.5, 35, 20, 0.9], ['bois', 'Forêt noire de Haguenau', 7.8, 48.85, 15, 10, 1.0],
  // Pierre de taille (calcaires)
  ['pierre', 'Calcaire de Paris', 2.35, 48.85, 35, 30, 1.3], ['pierre', 'Pierre de Caen', -0.37, 49.18, 20, 15, 1.2],
  ['pierre', 'Pierre de Bourgogne', 4.7, 47.3, 40, 30, 1.1], ['pierre', 'Carrières de Vers (Gard)', 4.5, 43.95, 15, 15, 1.2],
  ['pierre', 'Pierre de Provence', 5.4, 43.6, 40, 25, 1.0], ['pierre', 'Pierre de Saintonge', -0.6, 45.75, 40, 30, 1.0],
  ['pierre', "Pierre d'Euville (Lorraine)", 5.6, 48.75, 25, 25, 1.0], ['pierre', 'Tuffeau de Loire', 0.5, 47.3, 40, 15, 1.0],
  ['pierre', 'Pierre du Quercy', 1.5, 44.5, 30, 25, 0.9], ['pierre', 'Pierre de Lens (Gard)', 4.2, 43.98, 10, 10, 1.1],
  // Argile
  ['argile', 'Beauvaisis', 2.1, 49.4, 30, 20, 1.0], ['argile', 'Soufflenheim (Alsace)', 7.95, 48.83, 20, 15, 1.1],
  ['argile', 'Vallée du Rhône', 4.8, 44.9, 20, 50, 1.0], ['argile', 'Toulousain (brique rose)', 1.45, 43.6, 40, 30, 1.3],
  ['argile', 'Flandres', 3.0, 50.6, 40, 20, 1.0], ['argile', 'Sologne', 1.8, 47.6, 30, 20, 0.9],
  ['argile', 'La Graufesenque (Millau)', 3.08, 44.1, 15, 15, 1.2], ['argile', 'Charentes', -0.7, 45.3, 20, 20, 0.9],
  // Minerai de fer
  ['minerai_fer', 'Minette lorraine', 5.95, 49.3, 30, 40, 1.4], ['minerai_fer', 'Berry', 2.2, 47.0, 30, 25, 0.9],
  ['minerai_fer', 'Mine de Rancié (Ariège)', 1.5, 42.8, 25, 15, 1.0], ['minerai_fer', 'Normandie (May-sur-Orne)', -0.4, 49.0, 25, 15, 0.9],
  ['minerai_fer', 'Montagne Noire (Les Martys)', 2.2, 43.4, 20, 15, 1.1], ['minerai_fer', 'Périgord', 0.8, 45.3, 30, 25, 0.8],
  ['minerai_fer', 'Châtillonnais', 4.6, 47.8, 25, 20, 0.8], ['minerai_fer', 'Anjou (Segré)', -0.9, 47.7, 20, 15, 0.9],
  // Plomb argentifère
  ['plomb', 'Pontgibaud', 2.85, 45.83, 15, 15, 1.1], ['plomb', 'Largentière (Cévennes)', 4.3, 44.55, 20, 15, 1.0],
  ['plomb', 'Vialas (Mont Lozère)', 3.9, 44.35, 15, 10, 0.9], ['plomb', 'Poullaouen (Bretagne)', -3.65, 48.33, 15, 15, 0.9],
  ['plomb', "Mines d'argent de Melle", -0.14, 46.22, 15, 15, 1.0],
  // Sel
  ['sel', 'Saulnois (Lorraine)', 6.55, 48.82, 25, 20, 1.3], ['sel', 'Salins-les-Bains (Jura)', 5.88, 46.94, 15, 15, 1.1],
  ['sel', 'Salins de Peccais (Camargue)', 4.3, 43.5, 30, 15, 1.2], ['sel', 'Marais de Guérande', -2.45, 47.3, 15, 12, 1.1],
  ['sel', 'Salies-de-Béarn', -0.92, 43.47, 15, 10, 0.9], ['sel', 'Marais charentais', -1.2, 46.0, 20, 15, 1.0],
  // Terres fertiles
  ['cereales', 'Beauce', 1.6, 48.2, 50, 35, 1.4], ['cereales', 'Brie', 3.1, 48.65, 35, 25, 1.3],
  ['cereales', 'Picardie', 2.6, 49.8, 60, 35, 1.3], ['cereales', 'Limagne', 3.2, 45.95, 20, 25, 1.2],
  ['cereales', "Plaine d'Alsace", 7.5, 48.3, 22, 60, 1.2], ['cereales', 'Vallée de la Garonne', 0.6, 44.4, 50, 30, 1.1],
  ['cereales', 'Champagne', 4.1, 49.0, 40, 35, 1.0], ['cereales', 'Flandres', 2.8, 50.7, 40, 20, 1.2],
  ['cereales', 'Plaine de Caen', -0.2, 49.1, 35, 20, 1.1], ['cereales', 'Lauragais', 1.8, 43.4, 30, 20, 1.1],
  ['cereales', 'Poitou', 0.3, 46.6, 45, 35, 1.0], ['cereales', 'Bresse', 5.1, 46.4, 30, 30, 1.0],
  ['cereales', 'Languedoc', 3.6, 43.5, 50, 20, 0.9], ['cereales', 'Bretagne', -2.5, 48.2, 70, 30, 0.8],
  ['cereales', 'Vallée du Rhône', 4.8, 44.4, 15, 40, 1.0], ['cereales', 'Touraine', 0.7, 47.3, 35, 25, 1.0],
  // Époques suivantes (visibles mais pas encore exploitables)
  ['charbon', 'Bassin du Nord-Pas-de-Calais', 2.9, 50.45, 70, 15, 1.4], ['charbon', 'Bassin lorrain', 6.75, 49.15, 25, 15, 1.3],
  ['charbon', 'Bassin de Saint-Étienne', 4.35, 45.45, 20, 12, 1.2], ['charbon', 'Blanzy - Montceau', 4.35, 46.68, 15, 10, 1.0],
  ['charbon', 'Bassin des Cévennes (Alès)', 4.1, 44.15, 20, 15, 1.0], ['charbon', 'Carmaux', 2.15, 44.05, 12, 10, 0.9],
  ['charbon', 'Decazeville', 2.25, 44.55, 12, 10, 0.9], ['charbon', 'Lignite de Gardanne', 5.47, 43.45, 15, 10, 0.8],
  ['cuivre', 'Chessy (Beaujolais)', 4.62, 45.89, 10, 10, 0.8], ['cuivre', 'Baïgorry (Pays basque)', -1.35, 43.15, 15, 10, 0.7],
  ['cuivre', 'Saint-Véran (Alpes)', 6.87, 44.7, 10, 10, 0.6],
  ['etain', 'Abbaretz (Loire-Atlantique)', -1.53, 47.55, 15, 10, 0.8], ['etain', 'Montebras (Creuse)', 2.1, 46.25, 15, 10, 0.7],
  ['zinc', 'Saint-Laurent-le-Minier', 3.65, 43.93, 15, 12, 1.0],
  ['bauxite', 'Brignoles (Var)', 6.07, 43.4, 30, 20, 1.4], ['bauxite', 'Les Baux-de-Provence', 4.8, 43.75, 10, 10, 1.1],
  ['bauxite', 'Bédarieux (Hérault)', 3.15, 43.62, 20, 12, 1.0], ['bauxite', 'Ariège', 1.6, 42.95, 15, 10, 0.7],
  ['fluorine', 'Livradois (Puy-de-Dôme)', 3.55, 45.6, 22, 22, 1.2], ['fluorine', 'Le Burc (Tarn)', 2.3, 43.95, 12, 10, 1.0],
  ['fluorine', 'Morvan (Voltennes)', 4.2, 47.2, 15, 15, 0.9], ['fluorine', 'Esterel', 6.8, 43.5, 15, 10, 0.8],
  ['potasse', "Bassin potassique d'Alsace", 7.3, 47.82, 15, 15, 1.3],
  ['uranium', 'Bessines (Limousin)', 1.37, 46.1, 25, 20, 1.2], ['uranium', 'Forez', 3.85, 45.75, 15, 15, 0.9],
  ['uranium', 'Vendée', -1.2, 46.75, 25, 15, 0.9], ['uranium', 'Lodève', 3.3, 43.73, 10, 10, 0.9],
  ['petrole', 'Parentis (Landes)', -1.1, 44.35, 25, 20, 1.1], ['petrole', 'Pechelbronn (Alsace)', 7.8, 48.95, 10, 10, 0.7],
  ['petrole', 'Bassin parisien', 3.0, 48.5, 40, 30, 0.6],
  ['gaz', 'Lacq', -0.62, 43.42, 15, 12, 1.4],
  ['kaolin', 'Ploemeur (Bretagne)', -3.42, 47.75, 10, 10, 1.1], ['kaolin', 'Saint-Yrieix-la-Perche', 1.2, 45.5, 15, 15, 1.3],
  ['or', 'Salsigne (Aude)', 2.37, 43.33, 12, 10, 1.1], ['or', 'Le Châtelet (Creuse)', 2.15, 46.15, 12, 10, 0.8],
  ['granite', 'Granite breton', -3.3, 48.4, 60, 40, 1.1], ['granite', 'Granite du Limousin', 1.8, 45.85, 50, 40, 1.0],
  ['granite', 'Sidobre', 2.5, 43.65, 15, 10, 1.2], ['granite', 'Granite corse', 9.0, 42.0, 30, 40, 1.0],
  ['ardoise', 'Trélazé (Angers)', -0.48, 47.45, 15, 12, 1.3], ['ardoise', 'Ardennes (Fumay)', 4.7, 49.95, 15, 12, 1.1],
  ['ardoise', 'Pyrénées', 0.5, 43.0, 25, 10, 0.9],
  ['sable', 'Sables de Fontainebleau', 2.65, 48.4, 25, 15, 1.3], ['sable', 'Côte landaise', -1.2, 44.5, 15, 90, 1.0],
  ['calcaire', 'Boulonnais', 1.8, 50.7, 20, 15, 1.1], ['calcaire', 'Charente', 0.2, 45.65, 30, 25, 1.0],
];

export interface Deposit { id: number; res: ResId; name: string; lon: number; lat: number; rx: number; ry: number; rich: number; }
export const DEPOSITS: Deposit[] = DEP_ROWS.map(([res, name, lon, lat, rx, ry, rich], id) => ({ id, res, name, lon, lat, rx, ry, rich }));

// ---- Bâtiments ----
export type BType =
  | 'entrepot' | 'village' | 'bucheron' | 'carriere' | 'ferme' | 'argiliere' | 'briqueterie'
  | 'mine_fer' | 'bas_fourneau' | 'forge' | 'mine_plomb' | 'saline' | 'aqueduc' | 'pont_du_gard' | 'poste' | 'port' | 'port_mer';

export interface Recipe { in: Partial<Record<ResId, number>>; out: Partial<Record<ResId, number>>; }

export interface BDef {
  name: string;
  desc: string;
  era: number;
  tech?: string;             // technologie requise
  cost: Partial<Record<ResId, number>>;  // matériaux livrés sur le chantier
  money: number;
  days: number;              // durée de construction (jours)
  workers: number;
  deposit?: ResId;           // doit être placé sur ce gisement
  needsWater?: boolean;
  recipe?: Recipe;           // par mois, au niveau 1
  storage: number;           // capacité de stockage par ressource
  waterRange?: number;       // portée de la distribution d'eau (km)
  maxLevel: number;
  unique?: boolean;
  site?: [number, number];   // emplacement imposé (lon, lat)
  hidden?: boolean;          // non constructible par le joueur
  river?: boolean;           // doit être au bord d'un fleuve navigable
  coast?: boolean;           // doit être sur la côte (port de commerce maritime)
  upgrade?: Partial<Record<ResId, number>>;  // matériaux d'amélioration au niveau 2 (×1,5 au niveau 3)
}

export const BUILD: Record<BType, BDef> = {
  entrepot: { name: 'Entrepôt', desc: 'Stocke toutes les ressources. Point de départ des convois de chantier.', era: 1, cost: { bois: 20, pierre: 10 }, money: 100, days: 15, workers: 2, storage: 300, maxLevel: 3, upgrade: { pierre: 20, bois: 8 } },
  village: { name: 'Village', desc: 'Fournit la main-d\'œuvre et achète ce dont ses habitants ont besoin. Grandit s\'il est bien approvisionné.', era: 1, cost: {}, money: 150, days: 25, workers: 0, needsWater: true, storage: 0, maxLevel: 1 },
  bucheron: { name: 'Camp de bûcherons', desc: 'Abat le bois d\'une forêt.', era: 1, cost: { bois: 8 }, money: 50, days: 10, workers: 4, deposit: 'bois', recipe: { in: {}, out: { bois: 8 } }, storage: 60, maxLevel: 3, upgrade: { bois: 14 } },
  carriere: { name: 'Carrière de pierre', desc: 'Extrait la pierre de taille d\'un banc de calcaire.', era: 1, cost: { bois: 15 }, money: 80, days: 15, workers: 6, deposit: 'pierre', recipe: { in: {}, out: { pierre: 5 } }, storage: 60, maxLevel: 3, upgrade: { pierre: 20 } },
  ferme: { name: 'Villa agricole', desc: 'Cultive des céréales. Bien plus productive sur des terres fertiles.', era: 1, cost: { bois: 15, pierre: 5 }, money: 60, days: 12, workers: 5, deposit: 'cereales', recipe: { in: {}, out: { cereales: 10 } }, storage: 80, maxLevel: 3, upgrade: { bois: 18 } },
  argiliere: { name: 'Argilière', desc: 'Extrait l\'argile.', era: 1, tech: 'terre_cuite', cost: { bois: 10 }, money: 60, days: 10, workers: 4, deposit: 'argile', recipe: { in: {}, out: { argile: 6 } }, storage: 60, maxLevel: 3, upgrade: { bois: 12 } },
  briqueterie: { name: 'Tuilerie-briqueterie', desc: 'Cuit l\'argile au feu de bois pour faire briques et tuiles. A besoin d\'eau.', era: 1, tech: 'terre_cuite', cost: { bois: 20, pierre: 15 }, money: 150, days: 20, workers: 5, needsWater: true, recipe: { in: { argile: 4, bois: 2 }, out: { briques: 3 } }, storage: 40, maxLevel: 3, upgrade: { pierre: 12, briques: 10 } },
  mine_fer: { name: 'Mine de fer', desc: 'Extrait le minerai de fer.', era: 1, tech: 'metallurgie', cost: { bois: 25, pierre: 15 }, money: 150, days: 20, workers: 8, deposit: 'minerai_fer', recipe: { in: {}, out: { minerai_fer: 4 } }, storage: 60, maxLevel: 3, upgrade: { fer: 4, pierre: 15 } },
  bas_fourneau: { name: 'Bas fourneau', desc: 'Réduit le minerai de fer au charbon de bois.', era: 1, tech: 'metallurgie', cost: { pierre: 20, argile: 10 }, money: 180, days: 20, workers: 6, recipe: { in: { minerai_fer: 4, bois: 4 }, out: { fer: 2 } }, storage: 40, maxLevel: 3, upgrade: { pierre: 12, briques: 12 } },
  forge: { name: 'Forge', desc: 'Forge des outils à partir du fer.', era: 1, tech: 'forge', cost: { pierre: 15, briques: 10 }, money: 200, days: 20, workers: 4, recipe: { in: { fer: 2, bois: 1 }, out: { outils: 1 } }, storage: 30, maxLevel: 3, upgrade: { pierre: 12, briques: 10 } },
  mine_plomb: { name: 'Mine de plomb argentifère', desc: 'Le plomb sert aux canalisations romaines ; l\'argent qu\'il contient se vend cher.', era: 1, tech: 'plomb', cost: { bois: 25, pierre: 15 }, money: 200, days: 25, workers: 8, deposit: 'plomb', recipe: { in: {}, out: { plomb: 3 } }, storage: 50, maxLevel: 3, upgrade: { fer: 4, pierre: 15 } },
  saline: { name: 'Saline', desc: 'Récolte le sel (marais salants ou sources salées).', era: 1, tech: 'salines', cost: { bois: 15, pierre: 5 }, money: 100, days: 15, workers: 5, deposit: 'sel', recipe: { in: {}, out: { sel: 4 } }, storage: 60, maxLevel: 3, upgrade: { pierre: 10, bois: 8 } },
  aqueduc: { name: 'Château d\'eau d\'aqueduc', desc: 'Apporte l\'eau dans un rayon de 25 km : on peut y bâtir villes et ateliers loin des rivières.', era: 1, tech: 'aqueduc', cost: { pierre: 60, briques: 20 }, money: 400, days: 40, workers: 3, waterRange: 25, storage: 0, maxLevel: 1 },
  port: { name: 'Port fluvial', desc: 'Quai au bord d\'un fleuve navigable : les barges y chargent et déchargent. Stocke toutes les ressources, comme un entrepôt.', era: 1, tech: 'navigation', cost: { bois: 30, pierre: 15 }, money: 220, days: 25, workers: 4, river: true, storage: 200, maxLevel: 3, upgrade: { pierre: 25, bois: 10 } },
  port_mer: { name: 'Port de commerce', desc: 'Port maritime : les marchandises qu\'on y décharge sont vendues outre-mer (Bretagne insulaire, Hispanie, Sardaigne, Italie selon la mer). On peut aussi y acheter des ressources importées. Stocke tout, comme un entrepôt.', era: 1, tech: 'negoce_maritime', cost: { bois: 40, pierre: 30 }, money: 450, days: 40, workers: 6, coast: true, storage: 250, maxLevel: 3, upgrade: { pierre: 25, bois: 15 } },
  poste: { name: 'Poste-frontière', desc: 'Les marchands étrangers y achètent certaines ressources.', era: 1, cost: {}, money: 0, days: 0, workers: 0, storage: 120, maxLevel: 1, hidden: true },
  pont_du_gard: { name: 'Pont du Gard', desc: 'Le grand pont-aqueduc qui alimente Nemausus (Nîmes). Merveille du chapitre I.', era: 1, tech: 'aqueduc', cost: { pierre: 250, bois: 40, plomb: 10 }, money: 1500, days: 90, workers: 20, storage: 0, maxLevel: 1, unique: true, site: [4.535, 43.947] },
};

export const LEVEL_MULT = [0, 1, 1.6, 2.3];            // production par niveau
export const LEVEL_COST = [0, 1, 1.6, 2.4];            // coût d'amélioration (en fraction du coût initial)
export const LEVEL_DAYS = [0, 1, 2, 3.5];              // durée d'amélioration (en fraction de la durée initiale)

// ---- Villes ----
export interface Tier { name: string; minPop: number; needs: Partial<Record<ResId, number>>; }
// Besoins mensuels pour 100 habitants
export const TIERS: Tier[] = [
  { name: 'Village', minPop: 0, needs: { cereales: 2.5, bois: 1.5, pierre: 0.4 } },
  { name: 'Bourg', minPop: 400, needs: { cereales: 2.5, bois: 1.5, pierre: 0.5, sel: 0.15, briques: 0.3 } },
  { name: 'Ville', minPop: 1500, needs: { cereales: 2.5, bois: 1.5, pierre: 0.6, sel: 0.15, briques: 0.4, outils: 0.06 } },
  { name: 'Cité', minPop: 5000, needs: { cereales: 2.5, bois: 1.5, pierre: 0.6, sel: 0.15, briques: 0.5, outils: 0.08, plomb: 0.05 } },
];
export const WORK_RANGE = 35;   // km (village) ; le rayon grandit avec la ville
/** Rayon de main-d'œuvre selon le palier de la ville (village, bourg, ville, cité) */
export const WORK_RANGES = [30, 40, 55, 70];
export const WATER_RANGE = 6;   // km d'un fleuve, lac ou de la côte
export const WAGE = 0.6;        // sesterces par ouvrier et par mois

// Lieux antiques : nom proposé quand on fonde une ville à proximité
export const ANCIENT: [string, number, number][] = [
  ['Lutetia', 2.35, 48.85], ['Lugdunum', 4.83, 45.76], ['Massalia', 5.37, 43.3], ['Burdigala', -0.58, 44.84],
  ['Tolosa', 1.44, 43.6], ['Narbo Martius', 3.0, 43.18], ['Nemausus', 4.36, 43.84], ['Arelate', 4.63, 43.68],
  ['Augustodunum', 4.3, 46.95], ['Durocortorum', 4.03, 49.25], ['Argentoratum', 7.75, 48.58], ['Vesontio', 6.02, 47.24],
  ['Lemonum', 0.34, 46.58], ['Condate', -1.68, 48.11], ['Portus Namnetum', -1.55, 47.22], ['Rotomagus', 1.1, 49.44],
  ['Samarobriva', 2.3, 49.9], ['Cenabum', 1.9, 47.9], ['Caesarodunum', 0.69, 47.39], ['Divodurum', 6.18, 49.12],
  ['Augustonemetum', 3.08, 45.78], ['Vienna', 4.87, 45.52], ['Forum Iulii', 6.74, 43.43], ['Nicaea', 7.26, 43.7],
  ['Aleria', 9.51, 42.1], ['Mediolanum Santonum', -0.63, 45.75], ['Avaricum', 2.4, 47.08], ['Gesoriacum', 1.61, 50.72],
  ['Agedincum', 3.28, 48.2], ['Lugdunum Convenarum', 0.56, 43.03], ['Aquae Sextiae', 5.45, 43.53], ['Andematunnum', 5.33, 47.86],
  ['Nemetocenna', 2.78, 50.29], ['Juliomagus', -0.55, 47.47], ['Limonum', 0.34, 46.58], ['Augustoritum', 1.26, 45.83],
  ['Divona', 1.44, 44.45], ['Aginnum', 0.62, 44.2], ['Cularo', 5.72, 45.19], ['Genava', 6.14, 46.2],
  ['Alesia', 4.5, 47.54], ['Bibracte', 4.04, 46.92], ['Gergovia', 3.12, 45.71], ['Uxellodunum', 1.7, 44.95],
  ['Noviodunum', 3.16, 47.0], ['Autricum', 1.49, 48.45], ['Augustobona', 4.08, 48.3], ['Caesaromagus', 2.08, 49.43],
  ['Augusta Suessionum', 3.32, 49.38], ['Augusta Viromanduorum', 3.29, 49.85], ['Nemetacum', 2.77, 50.29], ['Tarvenna', 2.25, 50.63],
  ['Bagacum', 3.81, 50.3], ['Noviomagus Lexoviorum', 0.23, 49.15], ['Augustodurum', -0.7, 49.28], ['Coriallo', -1.62, 49.64],
  ['Fanum Martis', -2.05, 48.43], ['Vorgium', -3.58, 48.24], ['Darioritum', -2.76, 47.66], ['Ratiatum', -1.73, 47.12],
  ['Segora', -0.77, 46.94], ['Iculisma', 0.16, 45.65], ['Vesunna', 0.72, 45.18], ['Cadurcum', 1.44, 44.45],
  ['Segodunum', 2.57, 44.35], ['Anderitum', 3.3, 44.72], ['Ruessium', 3.9, 45.05], ['Forum Segusiavorum', 4.07, 45.66],
  ['Lugdunum Consoranorum', 1.15, 43.0], ['Beneharnum', -0.37, 43.33], ['Aquae Tarbellicae', -1.05, 43.71], ['Lactora', 0.62, 43.93],
  ['Elusa', 0.12, 43.85], ['Ruscino', 2.9, 42.72], ['Baeterrae', 3.21, 43.34], ['Luteva', 3.32, 43.73],
  ['Arausio', 4.81, 44.14], ['Avennio', 4.81, 43.95], ['Carpentorate', 5.05, 44.06], ['Vasio', 5.07, 44.24],
  ['Apta Julia', 5.4, 43.88], ['Forum Voconii', 6.4, 43.47], ['Telo Martius', 5.93, 43.12], ['Olbia', 6.12, 43.08],
  ['Valentia', 4.89, 44.93], ['Dea Augusta', 5.37, 44.75], ['Vapincum', 6.08, 44.56], ['Eburodunum', 6.49, 44.56],
  ['Augustum', 5.7, 45.4], ['Boutae', 6.13, 45.9], ['Cabillonum', 4.85, 46.78], ['Matisco', 4.83, 46.31],
  ['Dibio', 5.04, 47.32], ['Epomanduodurum', 6.74, 47.47], ['Mediomatrici', 6.18, 49.12], ['Tullum', 5.89, 48.68],
  ['Nasium', 5.37, 48.62], ['Segodunum Rutenorum', 2.57, 44.35], ['Mariana', 9.47, 42.6], ['Urcinium', 8.74, 41.92],
];
/** Noms de réserve quand aucun lieu antique n'est proche */
export const SPARE_NAMES = ['Vicus Novus', 'Noviomagus', 'Mediolanum', 'Condatomagus', 'Brivodurum', 'Ebrodunum', 'Augustoritum', 'Uxantis',
  'Vindinum', 'Belisama', 'Lemovicum', 'Durocasses', 'Condivicnum', 'Rotomagus Minor', 'Vicus Albus', 'Novientum', 'Aballo', 'Brivas',
  'Cambodunum', 'Lugdunum Minor', 'Vicus Aquensis', 'Castrum Novum', 'Forum Iulium', 'Vicus Vetus', 'Avaricum Minor', 'Ernodurum'];

// ---- Partenaires commerciaux (postes-frontières, côté français) ----
export interface Partner { id: string; name: string; lon: number; lat: number; buys: ResId[]; sells: ResId[]; mult: number; volume: number; }
/** Prix d'achat à l'étranger : base × IMPORT_MULT (× 0,85 avec le négoce) ; vente locale depuis un entrepôt : base × LOCAL_SALE */
export const IMPORT_MULT = 2;
export const LOCAL_SALE = 0.6;
/** Partenaires d'outre-mer, joignables depuis un port de commerce de la bonne mer */
export type Sea = 'atlantique' | 'mediterranee';
export interface SeaPartner { id: string; name: string; seas: Sea[]; buys: ResId[]; sells: ResId[]; mult: number; volume: number; to: Partial<Record<Sea, [number, number]>>; }
export const SEA_PARTNERS: SeaPartner[] = [
  { id: 'britannia', name: 'Bretagne insulaire (Angleterre)', seas: ['atlantique'], buys: ['sel', 'outils', 'briques', 'fer'], sells: ['plomb', 'cereales', 'bois'], mult: 1.5, volume: 40, to: { atlantique: [-1.5, 51.4] } },
  { id: 'hispania_mer', name: 'Hispanie (Gadès, Tarraco)', seas: ['atlantique', 'mediterranee'], buys: ['outils', 'fer', 'briques', 'sel'], sells: ['plomb', 'minerai_fer', 'sel'], mult: 1.45, volume: 40, to: { atlantique: [-5.8, 43.6], mediterranee: [2.6, 41.2] } },
  { id: 'sardaigne', name: 'Sardaigne', seas: ['mediterranee'], buys: ['cereales', 'outils', 'briques'], sells: ['plomb', 'sel'], mult: 1.5, volume: 30, to: { mediterranee: [8.9, 41.0] } },
  { id: 'italie_mer', name: 'Italie (Ostie, port de Rome)', seas: ['mediterranee'], buys: ['fer', 'outils', 'plomb', 'briques', 'cereales'], sells: ['outils', 'fer', 'briques'], mult: 1.55, volume: 50, to: { mediterranee: [10.3, 42.9] } },
];
export const PARTNERS: Partner[] = [
  { id: 'italie', name: 'Italie (Rome)', lon: 6.62, lat: 44.92, buys: ['fer', 'outils', 'plomb', 'sel', 'briques'], sells: ['outils', 'fer', 'briques'], mult: 1.4, volume: 25 },
  { id: 'hispanie', name: 'Hispanie', lon: 2.86, lat: 42.48, buys: ['outils', 'cereales', 'fer', 'plomb'], sells: ['plomb', 'sel', 'minerai_fer'], mult: 1.3, volume: 25 },
  { id: 'germanie', name: 'Germanie', lon: 7.76, lat: 48.6, buys: ['outils', 'fer', 'sel', 'briques', 'cereales'], sells: ['bois', 'minerai_fer'], mult: 1.35, volume: 25 },
  { id: 'helvetie', name: 'Helvétie', lon: 6.05, lat: 46.18, buys: ['sel', 'cereales', 'pierre', 'bois'], sells: ['bois', 'fer'], mult: 1.2, volume: 20 },
  { id: 'belgique', name: 'Gaule Belgique (Rhénanie)', lon: 6.1, lat: 49.45, buys: ['sel', 'cereales', 'briques', 'fer'], sells: ['cereales', 'argile', 'bois'], mult: 1.25, volume: 20 },
];

// ---- Véhicules ----
export type VType = 'charrette' | 'chariot' | 'barge' | 'convoi' | 'chaland';
export interface VDef { name: string; cap: number; speed: number; price: number; upkeep: number; tech?: string; water?: boolean; }
export const VEH: Record<VType, VDef> = {
  charrette: { name: 'Charrette à bœufs', cap: 4, speed: 18, price: 120, upkeep: 2 },
  chariot: { name: 'Chariot à chevaux', cap: 3, speed: 32, price: 220, upkeep: 4, tech: 'attelage' },
  barge: { name: 'Barge fluviale', cap: 12, speed: 26, price: 300, upkeep: 3, tech: 'navigation', water: true },
  chaland: { name: 'Chaland de chantier', cap: 10, speed: 22, price: 0, upkeep: 0, water: true },
  convoi: { name: 'Convoi de chantier', cap: 6, speed: 20, price: 0, upkeep: 0 },
};

// ---- Routes ----
export type RoadType = 'chemin' | 'voie';
export interface RDef { name: string; perKm: number; speed: number; tech?: string; }
export const ROADS: Record<RoadType, RDef> = {
  chemin: { name: 'Chemin de terre', perKm: 2, speed: 1 },
  voie: { name: 'Voie romaine', perKm: 6, speed: 1.6, tech: 'voie_romaine' },
};
export const BRIDGE_COST = 120;
export const MAX_GRADIENT = 90; // m/km : au-delà, il faudra des tunnels (époques suivantes)

// ---- Technologies ----
export type Branch = 'transport' | 'production' | 'cite' | 'commerce';
export const BRANCHES: { id: Branch; name: string; icon: string }[] = [
  { id: 'transport', name: 'Transport', icon: '🛤️' },
  { id: 'production', name: 'Production', icon: '⚒️' },
  { id: 'cite', name: 'Cité', icon: '🏛️' },
  { id: 'commerce', name: 'Commerce', icon: '⚖️' },
];
export interface Tech { id: string; name: string; desc: string; era: number; cost: number; req: string[]; branch: Branch; }
export const TECHS: Tech[] = [
  // Transport
  { id: 'voie_romaine', name: 'Voies romaines', desc: 'Routes pavées : 60 % plus rapides.', era: 1, cost: 25, req: [], branch: 'transport' },
  { id: 'attelage', name: 'Attelage des chevaux', desc: 'Chariots à chevaux, presque deux fois plus rapides.', era: 1, cost: 28, req: ['voie_romaine'], branch: 'transport' },
  { id: 'navigation', name: 'Navigation fluviale', desc: 'Ports fluviaux et barges : relie deux ports par le fleuve, sans construire de route. 12 t par barge.', era: 1, cost: 31, req: [], branch: 'transport' },
  // Production
  { id: 'terre_cuite', name: 'Terre cuite', desc: 'Argilières et tuileries-briqueteries.', era: 1, cost: 17, req: [], branch: 'production' },
  { id: 'salines', name: 'Salines', desc: 'Exploitation des marais salants et des sources salées.', era: 1, cost: 17, req: [], branch: 'production' },
  { id: 'metallurgie', name: 'Métallurgie du fer', desc: 'Mines de fer et bas fourneaux.', era: 1, cost: 31, req: ['terre_cuite'], branch: 'production' },
  { id: 'forge', name: 'Forgerons', desc: 'Forges : fabrication d\'outils.', era: 1, cost: 39, req: ['metallurgie'], branch: 'production' },
  { id: 'plomb', name: 'Plomb et argent', desc: 'Mines de plomb argentifère.', era: 1, cost: 34, req: ['metallurgie'], branch: 'production' },
  { id: 'exhaure', name: 'Exhaure (vis d\'Archimède)', desc: 'Pompage des galeries : +30 % de rendement pour toutes les mines et carrières.', era: 1, cost: 48, req: ['plomb'], branch: 'production' },
  { id: 'outillage', name: 'Outillage', desc: 'Débloque le niveau 2 des bâtiments.', era: 1, cost: 42, req: ['forge'], branch: 'production' },
  // Cité
  { id: 'cite_prospere', name: 'Cité prospère', desc: 'Les villes attirent des travailleurs de plus loin : rayon de main-d\'œuvre de toutes les villes +15 km.', era: 1, cost: 38, req: ['terre_cuite'], branch: 'cite' },
  { id: 'ouvrier_qualifie', name: 'Ouvriers qualifiés', desc: 'Des ouvriers formés aux outils de fer : +20 % de production de bois, de pierre et de céréales.', era: 1, cost: 50, req: ['cite_prospere', 'metallurgie'], branch: 'cite' },
  { id: 'aqueduc', name: 'Aqueducs', desc: 'Châteaux d\'eau d\'aqueduc et Pont du Gard.', era: 1, cost: 45, req: ['terre_cuite'], branch: 'cite' },
  { id: 'urbanisme', name: 'Urbanisme romain', desc: 'Débloque le niveau 3 des bâtiments et accélère la croissance des villes.', era: 1, cost: 56, req: ['outillage', 'aqueduc'], branch: 'cite' },
  // Commerce
  { id: 'negoce', name: 'Négoce méditerranéen', desc: 'Les partenaires étrangers paient 20 % plus cher et vendent 10 % moins cher.', era: 1, cost: 28, req: [], branch: 'commerce' },
  { id: 'negoce_maritime', name: 'Négoce maritime', desc: 'Ports de commerce sur la côte : échanges par la mer avec la Bretagne insulaire, l\'Hispanie, la Sardaigne et l\'Italie.', era: 1, cost: 48, req: ['navigation'], branch: 'commerce' },
  { id: 'monnaie', name: 'Atelier monétaire', desc: 'Volume de commerce avec l\'étranger doublé ; la vente locale depuis les entrepôts rapporte davantage.', era: 1, cost: 42, req: ['negoce'], branch: 'commerce' },
];

// ---- Objectifs du chapitre I ----
export interface Objective { id: string; name: string; desc: string; era: number; money: number; rp: number; }
export const OBJECTIVES: Objective[] = [
  { id: 'ville', name: 'Fonder une ville', desc: 'Fonde ton premier village.', era: 1, money: 200, rp: 2 },
  { id: 'routes', name: 'Premiers chemins', desc: 'Construis 60 km de routes.', era: 1, money: 150, rp: 2 },
  { id: 'ravitaillement', name: 'Ravitailler la ville', desc: 'Livre 60 t de céréales à tes villes.', era: 1, money: 250, rp: 3 },
  { id: 'batisseurs', name: 'Bâtisseurs', desc: 'Extrais 200 t de pierre.', era: 1, money: 300, rp: 4 },
  { id: 'bourg', name: 'Un vrai bourg', desc: 'Fais grandir une ville jusqu\'à 400 habitants.', era: 1, money: 300, rp: 4 },
  { id: 'fer', name: 'Le fer des Gaules', desc: 'Produis 40 t de fer.', era: 1, money: 400, rp: 5 },
  { id: 'rome', name: 'Commerce avec Rome', desc: 'Vends 30 t de marchandises à l\'Italie.', era: 1, money: 500, rp: 5 },
  { id: 'via', name: 'Via Agrippa', desc: 'Relie par la route deux villes distantes de plus de 250 km.', era: 1, money: 600, rp: 6 },
  { id: 'ville2', name: 'Une ville romaine', desc: 'Fais grandir une ville jusqu\'à 1 500 habitants.', era: 1, money: 800, rp: 8 },
  { id: 'gard', name: 'Le Pont du Gard', desc: 'Construis le Pont du Gard.', era: 1, money: 2000, rp: 12 },
];

export const ERAS = [
  '', 'Antiquité romaine', 'Moyen Âge', 'Révolution industrielle', 'Électricité et pétrole', 'Époque moderne',
];
export const START_YEAR = -50;

// ---- Événements historiques ----
export type EventEffect =
  | { kind: 'money'; amount: number }
  | { kind: 'rp'; amount: number }
  | { kind: 'growth'; mult: number; months: number }
  | { kind: 'pop'; mult: number }
  | { kind: 'partnerClosed'; partner: string; months: number }
  | { kind: 'partnerBoost'; partner: string; mult: number; months: number }
  /** remise sur les constructions et améliorations (argent et matériaux) */
  | { kind: 'discount'; mult: number; months: number }
  /** les villes paient davantage certaines ressources */
  | { kind: 'demand'; res: ResId[]; mult: number; months: number }
  /** production de tous les ateliers multipliée */
  | { kind: 'prod'; mult: number; months: number };

export interface HistEvent { year: number; title: string; text: string; effects: EventEffect[]; }
export const EVENTS: HistEvent[] = [
  { year: -46, title: 'Triomphe de César', text: 'César célèbre à Rome sa victoire sur les Gaules. Rome réclame fer et outils : l\'Italie paie 50 % plus cher pendant 2 ans.', effects: [{ kind: 'partnerBoost', partner: 'italie', mult: 1.5, months: 24 }] },
  { year: -43, title: 'Fondation de Lugdunum', text: 'Munatius Plancus fonde Lugdunum au confluent du Rhône et de la Saône. Les colons apportent de nouveaux savoirs.', effects: [{ kind: 'rp', amount: 6 }] },
  { year: -27, title: 'Auguste réorganise les Gaules', text: 'Les trois provinces (Aquitaine, Lyonnaise, Belgique) sont créées. L\'administration stimule la croissance des villes pendant 5 ans.', effects: [{ kind: 'growth', mult: 1.4, months: 60 }] },
  { year: -12, title: 'Autel des Trois Gaules', text: 'Drusus inaugure l\'autel fédéral de Lugdunum. Rome et les notables gaulois financent tes chantiers : constructions et améliorations coûtent 30 % de moins (argent et matériaux) pendant 3 ans.', effects: [{ kind: 'discount', mult: 0.7, months: 36 }] },
  { year: 9, title: 'Désastre de Varus', text: 'Trois légions sont anéanties en Germanie. Le commerce avec la Germanie est interrompu pendant 3 ans.', effects: [{ kind: 'partnerClosed', partner: 'germanie', months: 36 }] },
  { year: 14, title: 'Mort d\'Auguste', text: 'Tibère succède à Auguste et lance de grands travaux en Gaule : les ateliers produisent 15 % de plus pendant 2 ans.', effects: [{ kind: 'prod', mult: 1.15, months: 24 }] },
  { year: 48, title: 'Discours de Claude', text: 'L\'empereur Claude, né à Lugdunum, ouvre le Sénat aux notables gaulois. Les villes gagnent en prestige.', effects: [{ kind: 'growth', mult: 1.3, months: 36 }, { kind: 'rp', amount: 5 }] },
  { year: 65, title: 'Incendie de Lugdunum', text: 'Un grand incendie ravage Lugdunum. Les villes doivent reconstruire : pendant 2 ans, elles paient la pierre, le bois et les briques 50 % plus cher.', effects: [{ kind: 'pop', mult: 0.95 }, { kind: 'demand', res: ['pierre', 'bois', 'briques'], mult: 1.5, months: 24 }] },
  { year: 69, title: 'L\'année des quatre empereurs', text: 'Guerre civile dans l\'Empire. Le commerce avec l\'Italie est désorganisé pendant 1 an.', effects: [{ kind: 'partnerClosed', partner: 'italie', months: 12 }] },
  { year: 165, title: 'Peste antonine', text: 'Une épidémie venue d\'Orient frappe l\'Empire : les villes perdent 10 % de leurs habitants et les ateliers tournent au ralenti (−15 % de production pendant 3 ans).', effects: [{ kind: 'pop', mult: 0.9 }, { kind: 'prod', mult: 0.85, months: 36 }] },
  { year: 212, title: 'Édit de Caracalla', text: 'Tous les hommes libres de l\'Empire deviennent citoyens romains. Les villes attirent de nouveaux habitants.', effects: [{ kind: 'growth', mult: 1.3, months: 60 }] },
  { year: 256, title: 'Invasions germaniques', text: 'Francs et Alamans franchissent le Rhin. Le commerce avec la Germanie et la Belgique est coupé pendant 5 ans.', effects: [{ kind: 'partnerClosed', partner: 'germanie', months: 60 }, { kind: 'partnerClosed', partner: 'belgique', months: 60 }] },
];

export const START_MONEY = 2500;
export const START_STOCK: Partial<Record<ResId, number>> = { bois: 120, pierre: 50, cereales: 40 };
