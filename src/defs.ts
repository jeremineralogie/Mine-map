// Catalogue du jeu : ressources, gisements, bâtiments, véhicules, technologies, objectifs, événements.

export type ResId =
  | 'bois' | 'pierre' | 'argile' | 'sable' | 'calcaire' | 'granite' | 'ardoise' | 'minerai_fer' | 'charbon'
  | 'cuivre' | 'plomb' | 'etain' | 'zinc' | 'sel' | 'bauxite' | 'fluorine' | 'potasse' | 'uranium' | 'petrole'
  | 'gaz' | 'kaolin' | 'or' | 'terres_rares' | 'eau'
  | 'cereales' | 'poisson' | 'viande' | 'vin' | 'huile' | 'garum' | 'laine' | 'tissus' | 'sigillee' | 'marbre'
  | 'planches' | 'briques' | 'chaux' | 'ciment' | 'beton' | 'verre' | 'fer' | 'acier' | 'bronze' | 'aluminium'
  | 'carburant' | 'plastique' | 'porcelaine' | 'engrais'
  | 'outils' | 'machines' | 'rails' | 'vehicules' | 'electronique'
  | 'farine' | 'biere';

export interface ResDef { name: string; color: string; era: number; price: number; }

export const RES: Record<ResId, ResDef> = {
  bois: { name: 'Bois', color: '#2f7d3a', era: 1, price: 4 },
  pierre: { name: 'Pierre de taille', color: '#9a9488', era: 1, price: 5 },
  argile: { name: 'Argile', color: '#b5653a', era: 1, price: 3 },
  sable: { name: 'Sable', color: '#e0c77a', era: 2, price: 2 },
  calcaire: { name: 'Calcaire', color: '#d8d2bf', era: 2, price: 3 },
  granite: { name: 'Granite', color: '#7d7f86', era: 3, price: 6 },
  ardoise: { name: 'Ardoise', color: '#4a5568', era: 3, price: 7 },
  minerai_fer: { name: 'Minerai de fer', color: '#a0442c', era: 1, price: 8 },
  charbon: { name: 'Charbon', color: '#2b2b2b', era: 4, price: 9 },
  cuivre: { name: 'Cuivre', color: '#c27a3e', era: 2, price: 20 },
  plomb: { name: 'Plomb argentifère', color: '#6b7280', era: 1, price: 25 },
  etain: { name: 'Étain', color: '#b8c0c8', era: 2, price: 30 },
  zinc: { name: 'Zinc', color: '#8fa3b0', era: 4, price: 18 },
  sel: { name: 'Sel', color: '#f1f1f1', era: 1, price: 18 },
  bauxite: { name: 'Bauxite', color: '#c0392b', era: 5, price: 10 },
  fluorine: { name: 'Fluorine', color: '#8e44ad', era: 5, price: 22 },
  potasse: { name: 'Potasse', color: '#e67e22', era: 5, price: 12 },
  uranium: { name: 'Uranium', color: '#9acd32', era: 6, price: 120 },
  petrole: { name: 'Pétrole', color: '#111111', era: 5, price: 25 },
  gaz: { name: 'Gaz naturel', color: '#5dade2', era: 6, price: 20 },
  kaolin: { name: 'Kaolin', color: '#f5f0e6', era: 4, price: 10 },
  or: { name: 'Or et argent', color: '#d4af37', era: 3, price: 300 },
  terres_rares: { name: 'Terres rares', color: '#16a085', era: 6, price: 200 },
  eau: { name: 'Eau', color: '#3b82f6', era: 1, price: 0 },
  cereales: { name: 'Céréales', color: '#e1b12c', era: 1, price: 6 },
  poisson: { name: 'Poisson', color: '#5f9ea0', era: 2, price: 8 },
  viande: { name: 'Viande', color: '#a93226', era: 3, price: 12 },
  vin: { name: 'Vin', color: '#7b2346', era: 2, price: 20 },
  planches: { name: 'Planches', color: '#c19a6b', era: 3, price: 10 },
  farine: { name: 'Farine', color: '#f3e9d2', era: 3, price: 10 },
  biere: { name: 'Bière', color: '#d4a017', era: 3, price: 16 },
  briques: { name: 'Briques et tuiles', color: '#c0583a', era: 1, price: 14 },
  chaux: { name: 'Chaux', color: '#eeeeee', era: 2, price: 9 },
  ciment: { name: 'Ciment', color: '#a6a6a6', era: 5, price: 15 },
  beton: { name: 'Béton', color: '#8c8c8c', era: 5, price: 18 },
  verre: { name: 'Verre', color: '#a8dadc', era: 2, price: 25 },
  fer: { name: 'Fer', color: '#5a5a66', era: 1, price: 30 },
  acier: { name: 'Acier', color: '#4b6584', era: 4, price: 50 },
  bronze: { name: 'Bronze', color: '#cd7f32', era: 2, price: 45 },
  aluminium: { name: 'Aluminium', color: '#d0d6dc', era: 6, price: 80 },
  carburant: { name: 'Carburant', color: '#f39c12', era: 5, price: 40 },
  plastique: { name: 'Plastique', color: '#ff6b81', era: 6, price: 35 },
  porcelaine: { name: 'Porcelaine', color: '#fdfdfd', era: 4, price: 60 },
  engrais: { name: 'Engrais', color: '#6ab04c', era: 5, price: 20 },
  outils: { name: 'Outils', color: '#34495e', era: 1, price: 70 },
  machines: { name: 'Machines', color: '#2c3e50', era: 4, price: 150 },
  rails: { name: 'Rails', color: '#57606f', era: 4, price: 80 },
  vehicules: { name: 'Véhicules', color: '#e74c3c', era: 5, price: 400 },
  electronique: { name: 'Électronique', color: '#1abc9c', era: 6, price: 500 },
  // Gaule romaine (chapitre II)
  huile: { name: 'Huile d\'olive', color: '#9a9b2f', era: 2, price: 22 },
  sigillee: { name: 'Poterie sigillée', color: '#b8462e', era: 2, price: 18 },
  marbre: { name: 'Marbre', color: '#e9e4dc', era: 2, price: 24 },
  garum: { name: 'Garum', color: '#8c5a2b', era: 2, price: 40 },
  laine: { name: 'Laine', color: '#efe7d2', era: 2, price: 8 },
  tissus: { name: 'Tissus', color: '#6f4e9c', era: 2, price: 26 },
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
  ['bois', 'Corbières', 2.65, 43.0, 22, 15, 0.9], ['bois', 'Montagne Noire', 2.35, 43.45, 25, 12, 1.0], ['bois', 'Hunsrück', 7.0, 49.85, 25, 18, 1.1],
  ['bois', 'Plateau de Langres', 5.15, 47.85, 20, 15, 1.0], ['bois', 'Forêt de Moulière', 0.45, 46.65, 12, 10, 0.9],
  ['bois', 'Forêt de Senonches', 1.05, 48.55, 12, 10, 0.9], ['bois', 'Forêt de Bouconne', 1.2, 43.65, 10, 8, 0.9],
  ['bois', 'Montagne de Reims', 4.0, 49.15, 15, 8, 1.0],
  // Pierre de taille (calcaires)
  ['pierre', 'Calcaire de Paris', 2.35, 48.85, 35, 30, 1.3], ['pierre', 'Pierre de Caen', -0.37, 49.18, 20, 15, 1.2],
  ['pierre', 'Pierre de Bourgogne', 4.7, 47.3, 40, 30, 1.1], ['pierre', 'Carrières de Vers (Gard)', 4.5, 43.95, 15, 15, 1.2],
  ['pierre', 'Pierre de Provence', 5.4, 43.6, 40, 25, 1.0], ['pierre', 'Pierre de Saintonge', -0.6, 45.75, 40, 30, 1.0],
  ['pierre', "Pierre d'Euville (Lorraine)", 5.6, 48.75, 25, 25, 1.0], ['pierre', 'Tuffeau de Loire', 0.5, 47.3, 40, 15, 1.0],
  ['pierre', 'Pierre du Quercy', 1.5, 44.5, 30, 25, 0.9], ['pierre', 'Pierre de Lens (Gard)', 4.2, 43.98, 10, 10, 1.1],
  ['pierre', 'Calcaire de la Clape', 3.12, 43.16, 8, 8, 1.0], ['pierre', 'Pierre de Bordeaux (calcaire à astéries)', -0.35, 44.8, 15, 12, 1.0],
  ['pierre', 'Grès rouge de Kordel (Trèves)', 6.63, 49.82, 10, 10, 1.0],
  ['pierre', 'Pierre de Volvic', 3.04, 45.87, 10, 10, 1.1], ['pierre', 'Calcaire de Chailluz (Besançon)', 6.05, 47.28, 10, 10, 1.0],
  ['pierre', 'Pierre de Courville (Reims)', 3.7, 49.27, 10, 8, 1.0],
  // Argile
  ['argile', 'Beauvaisis', 2.1, 49.4, 30, 20, 1.0], ['argile', 'Soufflenheim (Alsace)', 7.95, 48.83, 20, 15, 1.1],
  ['argile', 'Vallée du Rhône', 4.8, 44.9, 20, 50, 1.0], ['argile', 'Toulousain (brique rose)', 1.45, 43.6, 40, 30, 1.3],
  ['argile', 'Flandres', 3.0, 50.6, 40, 20, 1.0], ['argile', 'Sologne', 1.8, 47.6, 30, 20, 0.9],
  ['argile', 'La Graufesenque (Millau)', 3.08, 44.1, 15, 15, 1.2], ['argile', 'Charentes', -0.7, 45.3, 20, 20, 0.9],
  ['argile', "Sallèles-d'Aude (amphores)", 2.95, 43.27, 10, 8, 1.1], ['argile', 'Gueugnon (ateliers gallo-romains)', 4.06, 46.6, 15, 15, 1.0],
  ['argile', 'Ateliers de potiers de Trèves', 6.66, 49.74, 10, 8, 1.0], ['argile', 'Lezoux (sigillée)', 3.38, 45.83, 12, 10, 1.1],
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
  ['sel', 'Salins de Sigean', 3.0, 43.05, 12, 8, 1.0], ['sel', 'Lons-le-Saunier', 5.55, 46.67, 12, 10, 1.0],
  // Terres fertiles
  ['cereales', 'Beauce', 1.6, 48.2, 50, 35, 1.4], ['cereales', 'Brie', 3.1, 48.65, 35, 25, 1.3],
  ['cereales', 'Picardie', 2.6, 49.8, 60, 35, 1.3], ['cereales', 'Limagne', 3.2, 45.95, 20, 25, 1.2],
  ['cereales', "Plaine d'Alsace", 7.5, 48.3, 22, 60, 1.2], ['cereales', 'Vallée de la Garonne', 0.6, 44.4, 50, 30, 1.1],
  ['cereales', 'Champagne', 4.1, 49.0, 40, 35, 1.0], ['cereales', 'Flandres', 2.8, 50.7, 40, 20, 1.2],
  ['cereales', 'Plaine de Caen', -0.2, 49.1, 35, 20, 1.1], ['cereales', 'Lauragais', 1.8, 43.4, 30, 20, 1.1],
  ['cereales', 'Poitou', 0.3, 46.6, 45, 35, 1.0], ['cereales', 'Bresse', 5.1, 46.4, 30, 30, 1.0],
  ['cereales', 'Languedoc', 3.6, 43.5, 50, 20, 0.9], ['cereales', 'Bretagne', -2.5, 48.2, 70, 30, 0.8],
  ['cereales', 'Vallée du Rhône', 4.8, 44.4, 15, 40, 1.0], ['cereales', 'Touraine', 0.7, 47.3, 35, 25, 1.0],
  ['cereales', 'Val de Saône (Chalonnais)', 4.85, 46.8, 25, 25, 1.0], ['cereales', 'Narbonnais', 2.85, 43.2, 20, 12, 1.0],
  ['cereales', 'Entre-deux-Mers', -0.2, 44.75, 20, 15, 1.0], ['cereales', 'Gutland de Bitburg', 6.5, 49.95, 20, 15, 1.0],
  // ---- Gaule romaine (chapitre II) ----
  // Vignobles
  ['vin', 'Côte de Bourgogne', 4.85, 47.1, 18, 40, 1.3], ['vin', 'Côtes du Rhône', 4.8, 44.3, 15, 35, 1.2],
  ['vin', 'Narbonnaise', 3.0, 43.25, 45, 20, 1.2], ['vin', 'Bordelais', -0.45, 44.85, 30, 30, 1.3],
  ['vin', 'Vallée de la Moselle', 6.25, 49.25, 12, 30, 1.0], ['vin', 'Gaillacois', 1.9, 43.9, 15, 12, 1.0],
  ['vin', 'Côte-Rôtie (Vienne)', 4.8, 45.5, 10, 15, 1.1],
  // Oliveraies (climat méditerranéen seulement)
  ['huile', 'Provence', 5.8, 43.5, 55, 22, 1.2], ['huile', 'Bas Languedoc', 3.7, 43.6, 40, 16, 1.0],
  ['huile', 'Côte niçoise', 7.1, 43.75, 20, 10, 1.1],
  // Sable et calcaire
  ['sable', 'Sables de Camargue', 4.5, 43.5, 20, 10, 0.9], ['sable', 'Sables de Loire', 0.0, 47.3, 40, 10, 0.9],
  ['sable', 'Sables de Normandie', -1.3, 49.3, 15, 25, 0.9],
  ['calcaire', 'Calcaire du Bassin parisien', 2.4, 48.6, 45, 35, 1.2], ['calcaire', 'Calcaire de Bourgogne', 4.6, 47.4, 40, 30, 1.1],
  ['calcaire', 'Calcaire de Provence', 5.2, 43.7, 30, 20, 1.0],
  // Marbre
  ['marbre', 'Saint-Béat (Pyrénées)', 0.69, 42.91, 12, 10, 1.3], ['marbre', 'Campan (Pyrénées)', 0.18, 43.0, 12, 10, 1.1],
  ['marbre', 'Caunes-Minervois', 2.53, 43.33, 10, 10, 1.0],
  // Cuivre (s'ajoute à Chessy, Baïgorry, Saint-Véran)
  ['cuivre', 'Cévennes', 3.8, 44.2, 20, 15, 0.8],
  // Pâturages (laine)
  ['laine', 'Massif central', 2.9, 45.2, 60, 45, 1.2], ['laine', 'Pyrénées', 0.5, 43.0, 140, 20, 1.0],
  ['laine', 'Alpes', 6.4, 45.0, 35, 70, 1.0], ['laine', 'Normandie', -0.8, 49.2, 45, 25, 1.0],
  ['laine', 'Causses', 3.2, 44.3, 30, 20, 1.1], ['laine', 'Artois', 2.4, 50.4, 35, 20, 0.9],
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
  | 'mine_fer' | 'bas_fourneau' | 'forge' | 'mine_plomb' | 'saline' | 'aqueduc' | 'pont_du_gard' | 'poste' | 'port' | 'port_mer' | 'comptoir'
  // Gaule romaine (chapitre II)
  | 'vignoble' | 'oliveraie' | 'potier' | 'verrerie' | 'four_chaux' | 'carriere_marbre' | 'pecherie' | 'saloir'
  | 'bergerie' | 'tissage' | 'mine_cuivre' | 'mine_etain' | 'fonderie'
  | 'thermes' | 'amphitheatre' | 'remparts' | 'basilique' | 'relais' | 'phare' | 'arenes'
  // Moyen Âge (chapitre III)
  | 'moulin_eau' | 'moulin_vent' | 'scierie' | 'carriere_granite' | 'ardoisiere' | 'elevage' | 'brasserie' | 'mine_or'
  | 'monastere' | 'chateau_fort' | 'halle' | 'hotel_dieu' | 'foire'
  // Rivaux : diplomatie et guerre
  | 'taverne' | 'caserne';

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
  /** niveaux supplémentaires débloqués par une technologie (au-delà du niveau 3), avec leur nom et leurs matériaux */
  levels?: Record<number, { tech: string; name: string; cost: Partial<Record<ResId, number>> }>;
  /** merveille : effets permanents autour d'elle une fois construite */
  wonder?: { range: number; needMult: number; prodRange: number; prodMult: number; prodTypes: BType[]; growth?: number; rp?: number; games?: number };
  /** bâtiment de ville : doit être construit à moins de CITY_BUILD_RANGE km d'une ville */
  city?: boolean;
  /** effets d'un bâtiment de service (thermes, remparts, relais…) */
  effect?: { growth?: number; range?: number; rp?: number; protect?: number; speed?: number; seaVolume?: number; tax?: number };
  /** un seul par ville */
  perCity?: boolean;
  /** distance minimale entre deux bâtiments de ce type (km) */
  spacing?: number;
}

export const BUILD: Record<BType, BDef> = {
  entrepot: { name: 'Entrepôt', desc: 'Stocke toutes les ressources. Point de départ des convois de chantier.', era: 1, cost: { bois: 20, pierre: 10 }, money: 100, days: 15, workers: 2, storage: 300, maxLevel: 3, upgrade: { pierre: 20, bois: 8 } },
  village: { name: 'Village', desc: 'Fournit la main-d\'œuvre et achète ce dont ses habitants ont besoin. Grandit s\'il est bien approvisionné.', era: 1, cost: {}, money: 150, days: 25, workers: 0, needsWater: true, storage: 0, maxLevel: 1 },
  bucheron: { name: 'Camp de bûcherons', desc: 'Abat le bois d\'une forêt.', era: 1, cost: { bois: 8 }, money: 50, days: 10, workers: 4, deposit: 'bois', recipe: { in: {}, out: { bois: 8 } }, storage: 60, maxLevel: 3, upgrade: { bois: 14 } },
  carriere: { name: 'Carrière de pierre', desc: 'Extrait la pierre de taille d\'un banc de calcaire.', era: 1, cost: { bois: 15 }, money: 80, days: 15, workers: 6, deposit: 'pierre', recipe: { in: {}, out: { pierre: 5 } }, storage: 60, maxLevel: 3, upgrade: { pierre: 20 } },
  ferme: { name: 'Villa agricole', desc: 'Cultive des céréales, sur n\'importe quelles terres. Au chapitre II, la technologie Grands domaines permet de l\'améliorer en grand domaine (niveaux 4 à 6).', era: 1, cost: { bois: 15, pierre: 5 }, money: 60, days: 12, workers: 5, deposit: 'cereales', recipe: { in: {}, out: { cereales: 10 } }, storage: 80, maxLevel: 6, upgrade: { bois: 18 },
    // niveaux 4 à 6 : les trois niveaux du grand domaine (chapitre II)
    levels: {
      4: { tech: 'villae', name: 'Grand domaine', cost: { pierre: 20, briques: 15, bois: 10 } },
      5: { tech: 'villae', name: 'Grand domaine II', cost: { pierre: 15, briques: 10 } },
      6: { tech: 'villae', name: 'Grand domaine III', cost: { pierre: 23, briques: 15 } },
    } },
  argiliere: { name: 'Argilière', desc: 'Extrait l\'argile.', era: 1, tech: 'terre_cuite', cost: { bois: 10 }, money: 60, days: 10, workers: 4, deposit: 'argile', recipe: { in: {}, out: { argile: 6 } }, storage: 60, maxLevel: 3, upgrade: { bois: 12 } },
  briqueterie: { name: 'Tuilerie-briqueterie', desc: 'Cuit l\'argile au feu de bois pour faire briques et tuiles. A besoin d\'eau.', era: 1, tech: 'terre_cuite', cost: { bois: 20, pierre: 15 }, money: 150, days: 20, workers: 5, needsWater: true, recipe: { in: { argile: 4, bois: 2 }, out: { briques: 3 } }, storage: 40, maxLevel: 3, upgrade: { pierre: 12, briques: 10 } },
  mine_fer: { name: 'Mine de fer', desc: 'Extrait le minerai de fer.', era: 1, tech: 'metallurgie', cost: { bois: 25, pierre: 15 }, money: 150, days: 20, workers: 8, deposit: 'minerai_fer', recipe: { in: {}, out: { minerai_fer: 4 } }, storage: 60, maxLevel: 3, upgrade: { fer: 4, pierre: 15 } },
  bas_fourneau: { name: 'Bas fourneau', desc: 'Réduit le minerai de fer au charbon de bois.', era: 1, tech: 'metallurgie', cost: { pierre: 20, argile: 10 }, money: 180, days: 20, workers: 6, recipe: { in: { minerai_fer: 4, bois: 4 }, out: { fer: 2 } }, storage: 40, maxLevel: 3, upgrade: { pierre: 12, briques: 12 } },
  forge: { name: 'Forge', desc: 'Forge des outils à partir du fer.', era: 1, tech: 'forge', cost: { pierre: 15, briques: 10 }, money: 200, days: 20, workers: 4, recipe: { in: { fer: 2, bois: 1 }, out: { outils: 1 } }, storage: 30, maxLevel: 3, upgrade: { pierre: 12, briques: 10 } },
  mine_plomb: { name: 'Mine de plomb argentifère', desc: 'Le plomb sert aux canalisations romaines ; l\'argent qu\'il contient se vend cher.', era: 1, tech: 'plomb', cost: { bois: 25, pierre: 15 }, money: 200, days: 25, workers: 8, deposit: 'plomb', recipe: { in: {}, out: { plomb: 3 } }, storage: 50, maxLevel: 3, upgrade: { fer: 4, pierre: 15 } },
  saline: { name: 'Saline', desc: 'Récolte le sel (marais salants ou sources salées).', era: 1, tech: 'salines', cost: { bois: 15, pierre: 5 }, money: 100, days: 15, workers: 5, deposit: 'sel', recipe: { in: {}, out: { sel: 4 } }, storage: 60, maxLevel: 3, upgrade: { pierre: 10, bois: 8 } },
  aqueduc: { name: 'Château d\'eau d\'aqueduc', desc: 'Apporte l\'eau dans un rayon de 25 km : on peut y bâtir villes et ateliers loin des rivières.', era: 1, tech: 'aqueduc', cost: { pierre: 60, briques: 20 }, money: 400, days: 40, workers: 3, waterRange: 25, storage: 0, maxLevel: 1 },
  port: { name: 'Port fluvial', desc: 'Quai au bord d\'un fleuve navigable : les barges y chargent et déchargent. Stocke toutes les ressources, comme un entrepôt.', era: 1, tech: 'navigation', cost: { bois: 30, pierre: 15 }, money: 220, days: 25, workers: 4, river: true, storage: 200, maxLevel: 3, upgrade: { pierre: 25, bois: 10 } },
  port_mer: { name: 'Port de commerce', desc: 'Port maritime d\'où partent les navires marchands vers les comptoirs d\'outre-mer (Bretagne insulaire, Hispanie, Afrique, Grèce…). Stocke tout, comme un entrepôt.', era: 1, tech: 'negoce_maritime', cost: { bois: 40, pierre: 30 }, money: 450, days: 40, workers: 6, coast: true, storage: 250, maxLevel: 3, upgrade: { pierre: 25, bois: 15 } },
  comptoir: { name: 'Comptoir maritime', desc: 'Port étranger au bout d\'une route maritime : les navires marchands y vendent tes marchandises et y chargent ce que tu as acheté.', era: 1, tech: 'negoce_maritime', cost: {}, money: 0, days: 0, workers: 0, storage: 200, maxLevel: 1, hidden: true },
  poste: { name: 'Poste-frontière', desc: 'Les marchands étrangers y achètent certaines ressources.', era: 1, cost: {}, money: 0, days: 0, workers: 0, storage: 120, maxLevel: 1, hidden: true },
  pont_du_gard: { name: 'Pont du Gard', desc: 'Le grand pont-aqueduc qui alimente Nemausus (Nîmes). Merveille facultative du chapitre I. Une fois construit : eau courante dans un rayon de 50 km, consommation des villes réduite de 10 % dans ce rayon, et +20 % de production pour les carrières et camps de bûcherons à moins de 15 km.', era: 1, tech: 'aqueduc', cost: { pierre: 250, bois: 40, plomb: 10 }, money: 1500, days: 90, workers: 0, waterRange: 50, storage: 0, maxLevel: 1, unique: true, site: [4.535, 43.947],
    wonder: { range: 50, needMult: 0.9, prodRange: 15, prodMult: 1.2, prodTypes: ['carriere', 'bucheron'] } },
  // ---- Gaule romaine (chapitre II) ----
  vignoble: { name: 'Vignoble', desc: 'Cultive la vigne et presse le raisin. Seulement sur les terroirs viticoles.', era: 2, tech: 'viticulture', cost: { bois: 15, pierre: 5 }, money: 120, days: 20, workers: 6, deposit: 'vin', recipe: { in: {}, out: { vin: 6 } }, storage: 60, maxLevel: 3, upgrade: { bois: 15 } },
  oliveraie: { name: 'Oliveraie', desc: 'Oliviers et moulin à huile. Seulement sous le climat méditerranéen.', era: 2, tech: 'oleiculture', cost: { bois: 10, pierre: 5 }, money: 110, days: 20, workers: 5, deposit: 'huile', recipe: { in: {}, out: { huile: 5 } }, storage: 60, maxLevel: 3, upgrade: { bois: 12 } },
  potier: { name: 'Atelier de potier', desc: 'Cuit la célèbre poterie sigillée, rouge et vernissée, exportée dans tout l\'Empire.', era: 2, tech: 'sigillee', cost: { pierre: 15, briques: 10 }, money: 160, days: 20, workers: 5, needsWater: true, recipe: { in: { argile: 3, bois: 2 }, out: { sigillee: 3 } }, storage: 40, maxLevel: 3, upgrade: { pierre: 12, briques: 10 } },
  verrerie: { name: 'Verrerie', desc: 'Fond le sable au feu de bois pour souffler le verre. Se construit sur un gisement de sable.', era: 2, tech: 'verrerie', cost: { pierre: 15, briques: 15 }, money: 200, days: 25, workers: 5, deposit: 'sable', recipe: { in: { bois: 3 }, out: { verre: 2 } }, storage: 40, maxLevel: 3, upgrade: { pierre: 12, briques: 12 } },
  four_chaux: { name: 'Four à chaux', desc: 'Cuit le calcaire pour faire la chaux du mortier romain. Se construit sur un gisement de calcaire.', era: 2, tech: 'mortier', cost: { pierre: 20 }, money: 120, days: 15, workers: 4, deposit: 'calcaire', recipe: { in: { bois: 2 }, out: { chaux: 3 } }, storage: 50, maxLevel: 3, upgrade: { pierre: 15 } },
  carriere_marbre: { name: 'Carrière de marbre', desc: 'Extrait le marbre des Pyrénées pour les monuments.', era: 2, tech: 'marbriers', cost: { bois: 15, outils: 2 }, money: 180, days: 25, workers: 7, deposit: 'marbre', recipe: { in: {}, out: { marbre: 3 } }, storage: 50, maxLevel: 3, upgrade: { pierre: 15, outils: 2 } },
  pecherie: { name: 'Pêcherie', desc: 'Barques et filets sur la côte.', era: 2, tech: 'peche', cost: { bois: 15 }, money: 80, days: 12, workers: 4, coast: true, recipe: { in: {}, out: { poisson: 8 } }, storage: 50, maxLevel: 3, upgrade: { bois: 12 } },
  saloir: { name: 'Saloir à garum', desc: 'Fait macérer le poisson dans le sel : le garum, condiment de luxe.', era: 2, tech: 'peche', cost: { pierre: 10, briques: 10 }, money: 150, days: 15, workers: 4, recipe: { in: { poisson: 4, sel: 2 }, out: { garum: 2 } }, storage: 40, maxLevel: 3, upgrade: { pierre: 10, briques: 8 } },
  bergerie: { name: 'Bergerie', desc: 'Élève des moutons sur les pâturages pour leur laine.', era: 2, tech: 'draperie', cost: { bois: 12 }, money: 70, days: 10, workers: 3, deposit: 'laine', recipe: { in: {}, out: { laine: 6 } }, storage: 60, maxLevel: 3, upgrade: { bois: 12 } },
  tissage: { name: 'Atelier de tissage', desc: 'Tisse la laine : draps et manteaux gaulois (sagum). A besoin d\'eau.', era: 2, tech: 'draperie', cost: { bois: 15, pierre: 10 }, money: 150, days: 15, workers: 6, needsWater: true, recipe: { in: { laine: 4 }, out: { tissus: 2 } }, storage: 40, maxLevel: 3, upgrade: { bois: 10, pierre: 10 } },
  mine_cuivre: { name: 'Mine de cuivre', desc: 'Extrait le minerai de cuivre.', era: 2, tech: 'bronze', cost: { bois: 20, pierre: 10 }, money: 180, days: 20, workers: 7, deposit: 'cuivre', recipe: { in: {}, out: { cuivre: 3 } }, storage: 50, maxLevel: 3, upgrade: { fer: 4, pierre: 12 } },
  mine_etain: { name: 'Mine d\'étain', desc: 'Extrait l\'étain, rare et précieux.', era: 2, tech: 'bronze', cost: { bois: 20, pierre: 10 }, money: 180, days: 20, workers: 7, deposit: 'etain', recipe: { in: {}, out: { etain: 2 } }, storage: 50, maxLevel: 3, upgrade: { fer: 4, pierre: 12 } },
  fonderie: { name: 'Fonderie de bronze', desc: 'Allie le cuivre et l\'étain : statues, monnaie, objets de luxe.', era: 2, tech: 'bronze', cost: { pierre: 20, briques: 15 }, money: 250, days: 25, workers: 5, recipe: { in: { cuivre: 3, etain: 1, bois: 2 }, out: { bronze: 2 } }, storage: 40, maxLevel: 3, upgrade: { pierre: 15, briques: 12 } },
  thermes: { name: 'Thermes', desc: 'Bains publics : la ville voisine grandit 25 % plus vite. Se construit près d\'une ville, avec de l\'eau. Un par ville.', era: 2, tech: 'thermes', cost: { pierre: 40, briques: 20, chaux: 10 }, money: 400, days: 40, workers: 4, needsWater: true, storage: 0, maxLevel: 1, city: true, perCity: true, effect: { growth: 1.25, range: 8 } },
  amphitheatre: { name: 'Amphithéâtre', desc: 'Jeux et spectacles : les villes à moins de 40 km grandissent 20 % plus vite. Un seul dans un rayon de 40 km.', era: 2, tech: 'spectacles', cost: { pierre: 80, chaux: 20 }, money: 700, days: 60, workers: 4, storage: 0, maxLevel: 1, city: true, spacing: 40, effect: { growth: 1.2, range: 40 } },
  remparts: { name: 'Remparts', desc: 'Murailles de la cité : protègent des invasions tous les bâtiments à moins de 20 km.', era: 2, tech: 'remparts', cost: { pierre: 60, chaux: 15 }, money: 500, days: 50, workers: 0, storage: 0, maxLevel: 1, city: true, effect: { protect: 20 } },
  basilique: { name: 'Basilique', desc: 'Lieu de culte et de savoir : +0,3 point de recherche par mois. Une par ville.', era: 2, tech: 'christianisme', cost: { pierre: 40, marbre: 5, chaux: 10 }, money: 400, days: 40, workers: 2, storage: 0, maxLevel: 1, city: true, perCity: true, effect: { rp: 0.3 } },
  relais: { name: 'Relais routier (mutatio)', desc: 'Chevaux frais : les véhicules roulent 25 % plus vite à moins de 30 km.', era: 2, tech: 'relais', cost: { pierre: 15, bois: 10 }, money: 120, days: 12, workers: 2, storage: 0, maxLevel: 1, effect: { speed: 1.25, range: 30 } },
  phare: { name: 'Phare', desc: 'Guide les navires : volume du commerce maritime +25 % (jusqu\'à deux phares).', era: 2, tech: 'phares', cost: { pierre: 40, chaux: 10 }, money: 350, days: 30, workers: 2, coast: true, storage: 0, maxLevel: 1, effect: { seaVolume: 0.25 } },
  arenes: { name: 'Arènes de Nîmes', desc: 'Le grand amphithéâtre de Nemausus, symbole de l\'âge d\'or de la Gaule romaine. Merveille du chapitre II, nécessaire pour le terminer. Une fois construites : +30 % de croissance pour les villes à moins de 60 km, +1 point de recherche par mois et un revenu des jeux.', era: 2, tech: 'spectacles', cost: { pierre: 300, chaux: 40, marbre: 15 }, money: 2500, days: 120, workers: 0, storage: 0, maxLevel: 1, unique: true, site: [4.359, 43.835],
    wonder: { range: 60, needMult: 1, prodRange: 0, prodMult: 1, prodTypes: [], growth: 1.3, rp: 1, games: 0.02 } },
  // ---- Moyen Âge (chapitre III) ----
  moulin_eau: { name: 'Moulin à eau', desc: 'La roue du moulin moud les céréales en farine. Au bord d\'un fleuve, d\'un lac ou de la côte.', era: 3, tech: 'moulin_hydraulique', cost: { bois: 25, pierre: 10 }, money: 150, days: 20, workers: 3, needsWater: true, recipe: { in: { cereales: 6 }, out: { farine: 5 } }, storage: 60, maxLevel: 3, upgrade: { bois: 15, pierre: 10 } },
  moulin_vent: { name: 'Moulin à vent', desc: 'Moud les céréales en farine, n\'importe où : il n\'a pas besoin d\'eau.', era: 3, tech: 'moulin_vent', cost: { bois: 25, pierre: 10 }, money: 140, days: 18, workers: 2, recipe: { in: { cereales: 5 }, out: { farine: 4 } }, storage: 50, maxLevel: 3, upgrade: { bois: 10, planches: 10 } },
  scierie: { name: 'Scierie', desc: 'Une roue à eau actionne la scie : le bois devient des planches. A besoin d\'eau.', era: 3, tech: 'moulin_hydraulique', cost: { bois: 15, pierre: 15 }, money: 160, days: 18, workers: 4, needsWater: true, recipe: { in: { bois: 5 }, out: { planches: 4 } }, storage: 60, maxLevel: 3, upgrade: { pierre: 10, planches: 10 } },
  carriere_granite: { name: 'Carrière de granite', desc: 'Extrait le granite dur des châteaux forts (Bretagne, Limousin, Sidobre, Corse).', era: 3, tech: 'chateaux_forts', cost: { bois: 15, outils: 2 }, money: 150, days: 20, workers: 7, deposit: 'granite', recipe: { in: {}, out: { granite: 5 } }, storage: 60, maxLevel: 3, upgrade: { pierre: 10, outils: 2 } },
  ardoisiere: { name: 'Ardoisière', desc: 'Fend l\'ardoise des toits (Anjou, Ardennes, Pyrénées).', era: 3, tech: 'art_roman', cost: { bois: 15, outils: 2 }, money: 150, days: 20, workers: 6, deposit: 'ardoise', recipe: { in: {}, out: { ardoise: 4 } }, storage: 60, maxLevel: 3, upgrade: { planches: 10, outils: 2 } },
  elevage: { name: 'Élevage', desc: 'Bœufs et porcs nourris au grain : de la viande pour les villes. N\'importe où.', era: 3, tech: 'assolement', cost: { bois: 15, pierre: 5 }, money: 100, days: 12, workers: 3, recipe: { in: { cereales: 2 }, out: { viande: 4 } }, storage: 60, maxLevel: 3, upgrade: { bois: 10, planches: 8 } },
  brasserie: { name: 'Brasserie', desc: 'Brasse la bière avec les céréales, comme dans les abbayes. A besoin d\'eau.', era: 3, tech: 'monasteres', cost: { pierre: 15, planches: 10 }, money: 180, days: 20, workers: 4, needsWater: true, recipe: { in: { cereales: 4 }, out: { biere: 3 } }, storage: 50, maxLevel: 3, upgrade: { pierre: 10, planches: 10 } },
  mine_or: { name: 'Mine d\'or et d\'argent', desc: 'Extrait l\'or et l\'argent de la monnaie (Salsigne, Le Châtelet). Rare et très précieux.', era: 3, tech: 'lettre_change', cost: { bois: 25, pierre: 15, outils: 3 }, money: 400, days: 30, workers: 10, deposit: 'or', recipe: { in: {}, out: { or: 1 } }, storage: 30, maxLevel: 3, upgrade: { planches: 15, outils: 3 } },
  monastere: { name: 'Monastère', desc: 'Abbaye où les moines copient les livres : +0,4 point de recherche par mois. N\'importe où, même loin des villes (les moines n\'ont pas besoin d\'ouvriers), mais à plus de 50 km d\'un autre monastère.', era: 3, tech: 'monasteres', cost: { pierre: 40, bois: 20, briques: 10 }, money: 400, days: 40, workers: 0, storage: 0, maxLevel: 1, spacing: 50, effect: { rp: 0.4 } },
  chateau_fort: { name: 'Château fort', desc: 'Donjon et murailles de granite : protège des invasions tous les bâtiments à moins de 30 km.', era: 3, tech: 'chateaux_forts', cost: { pierre: 40, granite: 40, bois: 20 }, money: 700, days: 60, workers: 0, storage: 0, maxLevel: 1, city: true, effect: { protect: 30 } },
  halle: { name: 'Halle', desc: 'Marché couvert de la ville : chaque mois, les droits de marché rapportent 1 sesterce pour 100 habitants. Une par ville.', era: 3, tech: 'chartes', cost: { bois: 25, planches: 20, pierre: 10 }, money: 300, days: 25, workers: 2, storage: 0, maxLevel: 1, city: true, perCity: true, effect: { tax: 0.01, range: 8 } },
  hotel_dieu: { name: 'Hôtel-Dieu', desc: 'Hôpital tenu par les religieux : la ville voisine grandit 20 % plus vite, et perd beaucoup moins d\'habitants lors des épidémies (peste noire). Un par ville.', era: 3, tech: 'chartes', cost: { pierre: 40, planches: 15 }, money: 400, days: 35, workers: 3, storage: 0, maxLevel: 1, city: true, perCity: true, effect: { growth: 1.2, range: 8 } },
  foire: { name: 'Foire de Champagne', desc: 'La grande foire où les marchands de toute l\'Europe se retrouvent : chaque mois, elle rapporte 1 sesterce pour 200 habitants de toutes tes villes à moins de 200 km. Une seule.', era: 3, tech: 'foires', cost: { bois: 40, planches: 30, pierre: 30 }, money: 1200, days: 60, workers: 4, storage: 0, maxLevel: 1, city: true, unique: true, effect: { tax: 0.005, range: 200 } },
  // ---- Rivaux : diplomatie et guerre ----
  taverne: { name: 'Taverne', desc: 'Lieu de rencontre des marchands et des émissaires : ouvre la diplomatie avec les rivaux et le commerce avec ceux qui ont signé un accord. Une par ville ; plus elles sont proches d\'un rival, plus les relations progressent.', era: 1, cost: { bois: 20, pierre: 10 }, money: 200, days: 15, workers: 2, storage: 100, maxLevel: 1, city: true },
  caserne: { name: 'Caserne', desc: 'Recrute légionnaires et auxiliaires parmi les habitants de la ville voisine. Les armées se déplacent sur la carte.', era: 2, cost: { pierre: 30, bois: 20 }, money: 400, days: 30, workers: 0, storage: 0, maxLevel: 1, city: true },
};

export const LEVEL_MULT = [0, 1, 1.6, 2.3, 3.2, 4.1, 5];            // production par niveau
export const LEVEL_COST = [0, 1, 1.6, 2.4, 3.2, 4, 5];            // matériaux d'amélioration (en fraction du coût initial)
export const LEVEL_MONEY = [0, 1, 2, 3, 4, 5, 6];               // argent d'amélioration (en fraction du prix initial)
export const LEVEL_DAYS = [0, 1, 2, 3.5, 4, 4.5, 5];              // durée d'amélioration (en fraction de la durée initiale)

// ---- Villes ----
export interface Tier { name: string; minPop: number; needs: Partial<Record<ResId, number>>; }
// Besoins mensuels pour 100 habitants : trois paliers au chapitre I, trois de plus au chapitre II.
// Chaque palier garde les biens des précédents et en ajoute de nouveaux.
export const TIERS: Tier[] = [
  { name: 'Village', minPop: 0, needs: { cereales: 0.833, bois: 0.5, pierre: 0.133 } },
  { name: 'Bourg', minPop: 400, needs: { cereales: 0.833, bois: 0.5, pierre: 0.167, sel: 0.05, briques: 0.1 } },
  { name: 'Ville', minPop: 1500, needs: { cereales: 0.833, bois: 0.5, pierre: 0.2, sel: 0.05, briques: 0.133, outils: 0.02, plomb: 0.012 } },
  { name: 'Cité', minPop: 4000, needs: { cereales: 0.833, bois: 0.5, pierre: 0.2, sel: 0.05, briques: 0.167, outils: 0.027, plomb: 0.017, sigillee: 0.08, vin: 0.12 } },
  { name: 'Métropole', minPop: 8000, needs: { cereales: 0.833, bois: 0.5, pierre: 0.2, sel: 0.05, briques: 0.167, outils: 0.027, plomb: 0.017, sigillee: 0.1, vin: 0.15, huile: 0.06, tissus: 0.05, verre: 0.03 } },
  { name: 'Capitale', minPop: 15000, needs: { cereales: 0.833, bois: 0.5, pierre: 0.2, sel: 0.05, briques: 0.167, outils: 0.027, plomb: 0.017, sigillee: 0.1, vin: 0.15, huile: 0.08, tissus: 0.06, verre: 0.04, bronze: 0.01, garum: 0.02, marbre: 0.02 } },
  // Moyen Âge (chapitre III)
  { name: 'Bourg franc', minPop: 25000, needs: { cereales: 0.833, bois: 0.5, pierre: 0.2, sel: 0.05, briques: 0.167, outils: 0.027, plomb: 0.017, sigillee: 0.1, vin: 0.15, huile: 0.08, tissus: 0.06, verre: 0.04, bronze: 0.01, garum: 0.02, marbre: 0.02, farine: 0.25, viande: 0.08 } },
  { name: 'Cité épiscopale', minPop: 40000, needs: { cereales: 0.833, bois: 0.5, pierre: 0.2, sel: 0.05, briques: 0.167, outils: 0.027, plomb: 0.017, sigillee: 0.1, vin: 0.15, huile: 0.08, tissus: 0.06, verre: 0.04, bronze: 0.01, garum: 0.02, marbre: 0.02, farine: 0.3, viande: 0.1, planches: 0.1, biere: 0.1 } },
  { name: 'Ville royale', minPop: 60000, needs: { cereales: 0.833, bois: 0.5, pierre: 0.2, sel: 0.05, briques: 0.167, outils: 0.027, plomb: 0.017, sigillee: 0.1, vin: 0.15, huile: 0.08, tissus: 0.06, verre: 0.04, bronze: 0.01, garum: 0.02, marbre: 0.02, farine: 0.3, viande: 0.12, planches: 0.12, biere: 0.12, ardoise: 0.04, or: 0.003 } },
];
/** Points de recherche par mois et par ville, selon son palier */
export const RP_TIER = [0.12, 0.2, 0.35, 0.6, 0.8, 1.0, 1.3, 1.6, 2.0];
/** Bâtiments de ville (thermes, remparts…) : distance maximale à une ville (km) */
export const CITY_BUILD_RANGE = 8;
/** Cours du Rhin, frontière de l'Empire (lon, lat), pour les invasions */
export const RHINE: [number, number][] = [[7.59, 47.56], [7.55, 48.0], [7.8, 48.58], [8.1, 48.97], [8.45, 49.5], [8.3, 50.0], [7.6, 50.35], [7.0, 50.9], [6.2, 51.8]];
export const WORK_RANGE = 30;   // km (village) ; le rayon grandit avec la ville
/** Rayon de main-d'œuvre selon le palier de la ville (village, bourg, ville, cité) */
export const WORK_RANGES = [30, 40, 55, 70, 80, 90, 100, 110, 120];
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
  // Atlantique, Manche et mer du Nord
  { id: 'britannia', name: 'Bretagne insulaire (Dubris)', seas: ['atlantique'], buys: ['sel', 'outils', 'briques', 'fer', 'vin', 'sigillee', 'verre', 'huile', 'ardoise', 'planches'], sells: ['plomb', 'cereales', 'bois', 'laine'], mult: 1.5, volume: 40, to: { atlantique: [1.2, 50.95] } },
  { id: 'hibernia', name: 'Hibernie (Irlande)', seas: ['atlantique'], buys: ['sel', 'outils', 'fer', 'vin', 'tissus'], sells: ['bois', 'plomb'], mult: 1.45, volume: 20, to: { atlantique: [-6.6, 49.9] } },
  { id: 'frisia', name: 'Frise (Germanie, mer du Nord)', seas: ['atlantique'], buys: ['sel', 'outils', 'fer', 'cereales', 'vin', 'verre', 'sigillee', 'biere', 'farine', 'viande'], sells: ['bois', 'minerai_fer'], mult: 1.4, volume: 25, to: { atlantique: [3.2, 51.55] } },
  { id: 'hispania_mer', name: 'Hispanie (Brigantium, Tarraco)', seas: ['atlantique', 'mediterranee'], buys: ['outils', 'fer', 'briques', 'sel', 'tissus', 'sigillee', 'planches'], sells: ['plomb', 'minerai_fer', 'sel', 'or'], mult: 1.45, volume: 40, to: { atlantique: [-5.8, 43.75], mediterranee: [2.6, 41.4] } },
  // Méditerranée
  { id: 'sardaigne', name: 'Sardaigne (Turris Libisonis)', seas: ['mediterranee'], buys: ['cereales', 'outils', 'briques', 'vin', 'tissus'], sells: ['plomb', 'sel'], mult: 1.5, volume: 30, to: { mediterranee: [8.4, 41.15] } },
  { id: 'italie_mer', name: 'Italie (Ostie, port de Rome)', seas: ['mediterranee'], buys: ['fer', 'outils', 'plomb', 'briques', 'cereales', 'vin', 'garum', 'tissus', 'sigillee', 'farine', 'granite'], sells: ['outils', 'fer', 'briques'], mult: 1.55, volume: 50, to: { mediterranee: [10.2, 42.85] } },
  { id: 'afrique', name: 'Afrique (Carthage)', seas: ['mediterranee'], buys: ['outils', 'fer', 'briques', 'plomb', 'verre', 'tissus', 'sigillee', 'planches'], sells: ['cereales', 'sel', 'or'], mult: 1.5, volume: 40, to: { mediterranee: [6.0, 41.3] } },
  { id: 'grece', name: 'Grèce et Orient (Athènes, Alexandrie)', seas: ['mediterranee'], buys: ['plomb', 'outils', 'fer', 'sel', 'vin', 'garum', 'bronze'], sells: ['outils', 'fer', 'briques'], mult: 1.6, volume: 35, to: { mediterranee: [10.4, 41.5] } },
];
export const PARTNERS: Partner[] = [
  { id: 'italie', name: 'Italie (Rome)', lon: 6.62, lat: 44.92, buys: ['fer', 'outils', 'plomb', 'sel', 'briques', 'sigillee', 'tissus', 'marbre'], sells: ['outils', 'fer', 'briques'], mult: 1.4, volume: 25 },
  { id: 'hispanie', name: 'Hispanie', lon: 2.86, lat: 42.48, buys: ['outils', 'cereales', 'fer', 'plomb', 'sigillee', 'verre', 'planches', 'viande'], sells: ['plomb', 'sel', 'minerai_fer', 'or'], mult: 1.3, volume: 25 },
  { id: 'germanie', name: 'Germanie', lon: 7.76, lat: 48.6, buys: ['outils', 'fer', 'sel', 'briques', 'cereales', 'vin', 'sigillee', 'verre', 'bronze', 'farine', 'viande', 'ardoise'], sells: ['bois', 'minerai_fer'], mult: 1.35, volume: 25 },
  { id: 'helvetie', name: 'Helvétie', lon: 6.05, lat: 46.18, buys: ['sel', 'cereales', 'pierre', 'bois', 'vin', 'huile', 'biere', 'granite'], sells: ['bois', 'fer'], mult: 1.2, volume: 20 },
  { id: 'belgique', name: 'Gaule Belgique (Rhénanie)', lon: 6.1, lat: 49.45, buys: ['sel', 'cereales', 'briques', 'fer', 'vin', 'tissus', 'verre', 'biere', 'planches', 'farine'], sells: ['cereales', 'argile', 'bois'], mult: 1.25, volume: 20 },
];

// ---- Véhicules ----
export type VType = 'charrette' | 'chariot' | 'carpentum' | 'barge' | 'grande_barge' | 'navire' | 'oneraria' | 'convoi' | 'chaland';
export interface VDef { name: string; cap: number; speed: number; price: number; upkeep: number; tech?: string; water?: boolean; sea?: boolean; voie?: boolean; }
export const VEH: Record<VType, VDef> = {
  charrette: { name: 'Charrette à bœufs', cap: 4, speed: 18, price: 120, upkeep: 2 },
  chariot: { name: 'Chariot à chevaux', cap: 3, speed: 32, price: 220, upkeep: 4, tech: 'attelage' },
  barge: { name: 'Barge fluviale', cap: 12, speed: 26, price: 300, upkeep: 3, tech: 'navigation', water: true },
  carpentum: { name: 'Chariot couvert (carpentum)', cap: 6, speed: 40, price: 300, upkeep: 5, tech: 'charronnerie', voie: true },
  grande_barge: { name: 'Grande barge', cap: 25, speed: 22, price: 600, upkeep: 6, tech: 'batellerie', water: true },
  oneraria: { name: 'Grand navire (oneraria)', cap: 40, speed: 70, price: 900, upkeep: 10, tech: 'navires_charge', sea: true },
  navire: { name: 'Navire marchand (corbita)', cap: 20, speed: 90, price: 500, upkeep: 6, tech: 'negoce_maritime', sea: true },
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
export type Branch = 'transport' | 'production' | 'cite' | 'commerce' | 'culture';
export const BRANCHES: { id: Branch; name: string; icon: string }[] = [
  { id: 'transport', name: 'Transport', icon: '🛤️' },
  { id: 'production', name: 'Production', icon: '⚒️' },
  { id: 'cite', name: 'Cité', icon: '🏛️' },
  { id: 'commerce', name: 'Commerce', icon: '⚖️' },
  { id: 'culture', name: 'Culture et religion', icon: '🏛️' },
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
  { id: 'metallurgie', name: 'Métallurgie du fer', desc: 'Mines de fer et bas fourneaux. Les outils de fer débloquent le niveau 2 des bâtiments.', era: 1, cost: 31, req: ['terre_cuite'], branch: 'production' },
  { id: 'forge', name: 'Forgerons', desc: 'Forges : fabrication d\'outils.', era: 1, cost: 39, req: ['metallurgie'], branch: 'production' },
  { id: 'plomb', name: 'Plomb et argent', desc: 'Mines de plomb argentifère.', era: 1, cost: 34, req: ['metallurgie'], branch: 'production' },
  { id: 'exhaure', name: 'Exhaure (vis d\'Archimède)', desc: 'Pompage des galeries : +30 % de rendement pour toutes les mines et carrières.', era: 1, cost: 48, req: ['plomb'], branch: 'production' },
  // Cité
  { id: 'cite_prospere', name: 'Cité prospère', desc: 'Les villes attirent des travailleurs de plus loin : rayon de main-d\'œuvre de toutes les villes +15 km.', era: 1, cost: 38, req: ['terre_cuite'], branch: 'cite' },
  { id: 'ouvrier_qualifie', name: 'Ouvriers qualifiés', desc: 'Des ouvriers formés aux outils de fer : +20 % de production de bois, de pierre et de céréales.', era: 1, cost: 50, req: ['cite_prospere', 'metallurgie'], branch: 'cite' },
  { id: 'aqueduc', name: 'Aqueducs', desc: 'Châteaux d\'eau d\'aqueduc et Pont du Gard.', era: 1, cost: 45, req: ['terre_cuite'], branch: 'cite' },
  { id: 'urbanisme', name: 'Urbanisme romain', desc: 'Débloque le niveau 3 des bâtiments et accélère la croissance des villes.', era: 1, cost: 56, req: ['aqueduc', 'exhaure'], branch: 'cite' },
  // Commerce
  { id: 'negoce', name: 'Négoce méditerranéen', desc: 'Les partenaires étrangers paient 20 % plus cher et vendent 10 % moins cher.', era: 1, cost: 28, req: [], branch: 'commerce' },
  { id: 'negoce_maritime', name: 'Négoce maritime', desc: 'Ouvre les routes maritimes : ports de commerce, navires marchands et comptoirs en Bretagne insulaire, Hibernie, Frise, Hispanie, Sardaigne, Italie, Afrique et Grèce.', era: 1, cost: 48, req: ['navigation'], branch: 'commerce' },
  { id: 'monnaie', name: 'Atelier monétaire', desc: 'Volume de commerce avec l\'étranger doublé ; la vente locale depuis les entrepôts rapporte davantage.', era: 1, cost: 42, req: ['negoce'], branch: 'commerce' },
  // ---- Chapitre II : Gaule romaine ----
  { id: 'relais', name: 'Relais routiers', desc: 'Relais (mutationes) le long des routes : les véhicules roulent 25 % plus vite autour d\'eux.', era: 2, cost: 55, req: [], branch: 'transport' },
  { id: 'charronnerie', name: 'Charronnerie', desc: 'Chariots couverts (carpentum) : 6 t, rapides, mais seulement sur les voies romaines.', era: 2, cost: 60, req: ['relais'], branch: 'transport' },
  { id: 'batellerie', name: 'Batellerie lourde', desc: 'Grandes barges de 25 t sur les fleuves (Rhône, Saône, Seine…).', era: 2, cost: 60, req: [], branch: 'transport' },
  { id: 'navires_charge', name: 'Navires de charge', desc: 'Grands navires marchands (oneraria) de 40 t pour le commerce maritime.', era: 2, cost: 75, req: ['batellerie'], branch: 'transport' },
  { id: 'viticulture', name: 'Viticulture', desc: 'Vignobles sur les terroirs viticoles : Bourgogne, Rhône, Narbonnaise, Bordelais, Moselle.', era: 2, cost: 45, req: [], branch: 'production' },
  { id: 'oleiculture', name: 'Oléiculture', desc: 'Oliveraies et moulins à huile, en Provence et en Languedoc.', era: 2, cost: 45, req: [], branch: 'production' },
  { id: 'sigillee', name: 'Céramique sigillée', desc: 'Ateliers de potier : la poterie rouge de La Graufesenque, exportée dans tout l\'Empire.', era: 2, cost: 50, req: [], branch: 'production' },
  { id: 'verrerie', name: 'Verrerie', desc: 'Verreries sur les gisements de sable.', era: 2, cost: 65, req: ['sigillee'], branch: 'production' },
  { id: 'bronze', name: 'Bronze', desc: 'Mines de cuivre et d\'étain, fonderies de bronze.', era: 2, cost: 80, req: ['verrerie'], branch: 'production' },
  { id: 'villae', name: 'Grands domaines', desc: 'Les villas agricoles deviennent de grands domaines : niveaux 4, 5 et 6 (32, 41 puis 50 t de céréales par mois, contre 23 au niveau 3).', era: 2, cost: 55, req: [], branch: 'cite' },
  { id: 'mortier', name: 'Mortier de chaux', desc: 'Fours à chaux sur les gisements de calcaire : la chaux des grands monuments.', era: 2, cost: 50, req: [], branch: 'cite' },
  { id: 'remparts', name: 'Remparts', desc: 'Murailles qui protègent des invasions les bâtiments à moins de 20 km.', era: 2, cost: 70, req: ['mortier'], branch: 'cite' },
  { id: 'capitales', name: 'Capitales provinciales', desc: 'Les plus grandes villes peuvent devenir des capitales (15 000 habitants) : rayon de main-d\'œuvre de 90 km.', era: 2, cost: 95, req: ['remparts', 'villae'], branch: 'cite' },
  { id: 'peche', name: 'Pêche et garum', desc: 'Pêcheries sur la côte et saloirs à garum.', era: 2, cost: 45, req: [], branch: 'commerce' },
  { id: 'draperie', name: 'Laine et draperie', desc: 'Bergeries sur les pâturages et ateliers de tissage.', era: 2, cost: 55, req: [], branch: 'commerce' },
  { id: 'phares', name: 'Phares', desc: 'Phares sur la côte : volume du commerce maritime +25 % chacun (deux au plus).', era: 2, cost: 70, req: ['peche'], branch: 'commerce' },
  { id: 'thermes', name: 'Thermes', desc: 'Bains publics : la ville voisine grandit 25 % plus vite.', era: 2, cost: 60, req: ['mortier'], branch: 'culture' },
  { id: 'spectacles', name: 'Jeux et spectacles', desc: 'Amphithéâtres et Arènes de Nîmes, la merveille du chapitre.', era: 2, cost: 90, req: ['thermes'], branch: 'culture' },
  { id: 'marbriers', name: 'Marbriers', desc: 'Carrières de marbre des Pyrénées.', era: 2, cost: 65, req: [], branch: 'culture' },
  { id: 'christianisme', name: 'Christianisme', desc: 'Basiliques : lieux de culte et de savoir, +0,3 point de recherche par mois chacune.', era: 2, cost: 85, req: ['marbriers'], branch: 'culture' },
  // ---- Chapitre III : Moyen Âge ----
  { id: 'collier', name: 'Collier d\'épaule', desc: 'Le cheval tire sans s\'étrangler : charrettes, chariots et convois emportent 30 % de plus.', era: 3, cost: 90, req: [], branch: 'transport' },
  { id: 'coche_eau', name: 'Coche d\'eau', desc: 'Bateaux halés par des chevaux le long des berges : barges, grandes barges et chalands 25 % plus rapides.', era: 3, cost: 100, req: ['collier'], branch: 'transport' },
  { id: 'gouvernail', name: 'Gouvernail d\'étambot', desc: 'Le gouvernail fixé à l\'arrière : les navires de mer emportent 30 % de plus.', era: 3, cost: 120, req: ['coche_eau'], branch: 'transport' },
  { id: 'charrue', name: 'Charrue lourde', desc: 'Le soc de fer retourne les terres lourdes : +20 % de céréales.', era: 3, cost: 80, req: [], branch: 'production' },
  { id: 'assolement', name: 'Assolement triennal', desc: 'Une terre sur trois au repos, une pour l\'avoine des bêtes : encore +20 % de céréales, et l\'élevage.', era: 3, cost: 100, req: ['charrue'], branch: 'production' },
  { id: 'moulin_hydraulique', name: 'Moulin hydraulique', desc: 'Moulins à eau (farine) et scieries (planches).', era: 3, cost: 85, req: [], branch: 'production' },
  { id: 'moulin_vent', name: 'Moulin à vent', desc: 'Moulins à vent : de la farine loin des rivières.', era: 3, cost: 110, req: ['moulin_hydraulique'], branch: 'production' },
  { id: 'haut_fourneau', name: 'Haut fourneau', desc: 'Les soufflets actionnés par l\'eau : les bas fourneaux produisent 50 % de fer en plus.', era: 3, cost: 130, req: ['moulin_hydraulique'], branch: 'production' },
  { id: 'chateaux_forts', name: 'Châteaux forts', desc: 'Carrières de granite et châteaux forts, qui protègent les bâtiments à moins de 30 km.', era: 3, cost: 95, req: [], branch: 'cite' },
  { id: 'chartes', name: 'Chartes communales', desc: 'Les villes s\'administrent elles-mêmes : halles (droits de marché) et hôtels-Dieu (croissance).', era: 3, cost: 115, req: ['chateaux_forts'], branch: 'cite' },
  { id: 'foires', name: 'Foires', desc: 'La Foire de Champagne, où se croisent les marchands de toute l\'Europe.', era: 3, cost: 110, req: ['chartes'], branch: 'commerce' },
  { id: 'lettre_change', name: 'Lettre de change', desc: 'Les banquiers paient à distance : ventes à l\'étranger +15 %, et mines d\'or et d\'argent.', era: 3, cost: 130, req: ['foires'], branch: 'commerce' },
  { id: 'hanse', name: 'Hanse', desc: 'La ligue des marchands du Nord : rouvre aussitôt le commerce d\'outre-mer et augmente son volume de 50 %.', era: 3, cost: 150, req: ['lettre_change', 'gouvernail'], branch: 'commerce' },
  { id: 'monasteres', name: 'Monastères', desc: 'Abbayes (+0,4 point de recherche par mois) et brasseries.', era: 3, cost: 85, req: [], branch: 'culture' },
  { id: 'art_roman', name: 'Art roman', desc: 'Les églises se couvrent d\'ardoise : ardoisières.', era: 3, cost: 105, req: ['monasteres'], branch: 'culture' },
  { id: 'art_gothique', name: 'Art gothique', desc: 'Voûtes d\'ogives et vitraux : chaque basilique et chaque monastère donne +0,2 point de recherche par mois de plus. Prépare les grandes cathédrales (Notre-Dame de Paris, prochaine étape).', era: 3, cost: 140, req: ['art_roman', 'chartes'], branch: 'culture' },
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
  { id: 'gard', name: 'Le Pont du Gard', desc: 'Construis le Pont du Gard (facultatif).', era: 1, money: 2000, rp: 12 },
  // Chapitre II
  { id: 'vin2', name: 'Le vin des Gaules', desc: 'Produis 150 t de vin.', era: 2, money: 600, rp: 6 },
  { id: 'sigillee2', name: 'La Graufesenque', desc: 'Produis 150 t de poterie sigillée.', era: 2, money: 600, rp: 6 },
  { id: 'thermes2', name: 'Aux bains !', desc: 'Construis des thermes.', era: 2, money: 400, rp: 4 },
  { id: 'remparts2', name: 'Cité fortifiée', desc: 'Construis des remparts.', era: 2, money: 500, rp: 5 },
  { id: 'capitale2', name: 'Capitale des Gaules', desc: 'Fais grandir une ville jusqu\'à 15 000 habitants.', era: 2, money: 2000, rp: 15 },
  { id: 'arenes', name: 'Les Arènes de Nîmes', desc: 'Construis les Arènes de Nîmes (nécessaire pour finir le chapitre).', era: 2, money: 3000, rp: 15 },
  { id: 'farine3', name: 'Le pain des villes', desc: 'Produis 150 t de farine.', era: 3, money: 600, rp: 6 },
  { id: 'monastere3', name: 'L\'abbaye', desc: 'Construis un monastère.', era: 3, money: 500, rp: 5 },
  { id: 'halle3', name: 'Jour de marché', desc: 'Construis une halle.', era: 3, money: 400, rp: 4 },
  { id: 'biere3', name: 'La bière des moines', desc: 'Produis 100 t de bière.', era: 3, money: 500, rp: 5 },
  { id: 'chateau3', name: 'Le château fort', desc: 'Construis un château fort.', era: 3, money: 700, rp: 6 },
  { id: 'foire3', name: 'Les foires de Champagne', desc: 'Construis la foire de Champagne.', era: 3, money: 1500, rp: 10 },
  { id: 'eveche3', name: 'Cité épiscopale', desc: 'Fais grandir une ville jusqu\'à 40 000 habitants.', era: 3, money: 2500, rp: 15 },
];

export const ERAS = [
  '', 'Antiquité romaine', 'Gaule romaine', 'Moyen Âge', 'Révolution industrielle', 'Électricité et pétrole', 'Époque moderne',
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
  /** production des ateliers multipliée (toutes les ressources, ou seulement `res`) */
  | { kind: 'prod'; mult: number; months: number; res?: ResId[] }
  /** monnaie dévaluée : tous les prix de vente multipliés */
  | { kind: 'prices'; mult: number; months: number }
  /** invasion : une part des bâtiments non protégés de la zone est endommagée */
  | { kind: 'raid'; share: number; rhin?: boolean; lon?: number; lat?: number; range: number }
  /** révolte : des ateliers pris au hasard s'arrêtent */
  | { kind: 'revolt'; count: number; months: number }
  /** épidémie : les villes perdent une part de leurs habitants (moins près d'un hôtel-Dieu) */
  | { kind: 'plague'; mult: number; cared: number };

/** `era` : l'événement n'arrive qu'à partir de ce chapitre (au chapitre III, il touche aussi les rivaux) */
export interface HistEvent { year: number; title: string; text: string; effects: EventEffect[]; era?: number; }
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
  { year: 256, title: 'Invasions germaniques', text: 'Francs et Alamans franchissent le Rhin et pillent le nord-est : des bâtiments sans remparts à moins de 80 km du Rhin sont endommagés. Le commerce avec la Germanie et la Belgique est coupé pendant 5 ans.', effects: [{ kind: 'raid', share: 0.35, rhin: true, range: 80 }, { kind: 'partnerClosed', partner: 'germanie', months: 60 }, { kind: 'partnerClosed', partner: 'belgique', months: 60 }] },
  // ---- Chapitre II : Gaule romaine ----
  { year: 80, title: 'Âge d\'or de la sigillée', text: 'La poterie rouge de La Graufesenque s\'exporte jusqu\'en Inde. Pendant 10 ans, les villes paient la poterie sigillée 50 % plus cher.', effects: [{ kind: 'demand', res: ['sigillee'], mult: 1.5, months: 120 }] },
  { year: 92, title: 'Édit de Domitien sur les vignes', text: 'Pour protéger le vin italien, l\'empereur ordonne d\'arracher des vignes en Gaule : les vignobles produisent 30 % de moins pendant 10 ans.', effects: [{ kind: 'prod', res: ['vin'], mult: 0.7, months: 120 }] },
  { year: 177, title: 'Martyrs de Lyon', text: 'Les premiers chrétiens de Lugdunum sont persécutés. Leur foi se répand malgré tout dans les villes.', effects: [{ kind: 'rp', amount: 8 }] },
  { year: 235, title: 'Crise du IIIe siècle', text: 'Les empereurs se succèdent, la monnaie est dévaluée : pendant près de 50 ans, tout se vend 20 % moins cher. Des raids peuvent frapper le nord-est à tout moment : protège tes villes par des remparts.', effects: [{ kind: 'prices', mult: 0.8, months: 588 }] },
  { year: 260, title: 'Empire des Gaules', text: 'Postumus fait sécession et fonde l\'Empire des Gaules : Rome est coupée de la Gaule pendant 14 ans, mais les villes gauloises s\'affirment.', effects: [{ kind: 'partnerClosed', partner: 'italie', months: 168 }, { kind: 'growth', mult: 1.2, months: 120 }] },
  { year: 275, title: 'Grande invasion de 275', text: 'Francs et Alamans ravagent la Gaule jusqu\'à la Loire. Les bâtiments sans remparts près du Rhin sont endommagés ; le commerce avec la Germanie est coupé 3 ans.', effects: [{ kind: 'raid', share: 0.4, rhin: true, range: 80 }, { kind: 'partnerClosed', partner: 'germanie', months: 36 }] },
  { year: 285, title: 'Révolte des Bagaudes', text: 'Paysans ruinés et esclaves en fuite se soulèvent : plusieurs ateliers s\'arrêtent pendant 6 mois.', effects: [{ kind: 'revolt', count: 4, months: 6 }] },
  { year: 313, title: 'Édit de Milan', text: 'Constantin accorde la liberté de culte : les chrétiens bâtissent leurs premières églises, foyers de savoir.', effects: [{ kind: 'rp', amount: 10 }] },
  { year: 352, title: 'Invasion alamane', text: 'Les Alamans franchissent à nouveau le Rhin : bâtiments sans remparts endommagés près de la frontière.', effects: [{ kind: 'raid', share: 0.3, rhin: true, range: 80 }] },
  { year: 358, title: 'Julien à Lutèce', text: 'Le césar Julien s\'installe à Lutèce, sa « chère Lutèce », bientôt appelée Paris. Les villes reprennent confiance.', effects: [{ kind: 'growth', mult: 1.2, months: 60 }, { kind: 'rp', amount: 5 }] },
  { year: 406, title: 'Le Rhin gelé est franchi', text: 'La nuit du 31 décembre, Vandales, Suèves et Alains traversent le Rhin gelé : le nord-est est dévasté, jusqu\'à 150 km de la frontière.', effects: [{ kind: 'raid', share: 0.6, rhin: true, range: 150 }, { kind: 'pop', mult: 0.92 }] },
  { year: 451, title: 'Bataille des champs Catalauniques', text: 'Aetius, les Francs et les Wisigoths arrêtent Attila près de Châlons. La région est ravagée.', effects: [{ kind: 'raid', share: 0.4, lon: 4.36, lat: 48.95, range: 90 }, { kind: 'pop', mult: 0.95 }] },
  { year: 476, title: 'Chute de Rome', text: 'Le dernier empereur d\'Occident, Romulus Augustule, est déposé. L\'Antiquité s\'achève : place aux royaumes francs.', effects: [{ kind: 'partnerClosed', partner: 'italie', months: 240 }] },
  // ---- Chapitre III : Moyen Âge (les Vikings sont gérés à part, de 799 à 911) ----
  { year: 496, era: 3, title: 'Baptême de Clovis', text: 'Le roi des Francs est baptisé à Reims. L\'Église soutient le nouveau royaume, et ses écoles conservent le savoir antique.', effects: [{ kind: 'rp', amount: 10 }] },
  { year: 800, era: 3, title: 'Charlemagne empereur', text: 'Charlemagne est couronné empereur d\'Occident à Rome. L\'ordre revient : les villes grandissent 20 % plus vite pendant 5 ans, et les écoles carolingiennes relancent la recherche.', effects: [{ kind: 'growth', mult: 1.2, months: 60 }, { kind: 'rp', amount: 10 }] },
  { year: 987, era: 3, title: 'Hugues Capet roi', text: 'Hugues Capet est élu roi des Francs : la dynastie capétienne commence. Le royaume se stabilise.', effects: [{ kind: 'growth', mult: 1.15, months: 60 }, { kind: 'rp', amount: 5 }] },
  { year: 1096, era: 3, title: 'Première croisade', text: 'À l\'appel du pape à Clermont, les chevaliers partent pour Jérusalem : les villes perdent 3 % de leurs habitants et, pendant 4 ans, paient le fer et les outils 50 % plus cher pour équiper les croisés.', effects: [{ kind: 'pop', mult: 0.97 }, { kind: 'demand', res: ['fer', 'outils'], mult: 1.5, months: 48 }] },
  { year: 1099, era: 3, title: 'Prise de Jérusalem', text: 'Les croisés prennent Jérusalem. Les routes de l\'Orient s\'ouvrent : pendant 10 ans, la Grèce et l\'Orient paient 50 % plus cher par la mer, l\'Italie 30 % plus cher, et les savoirs arabes arrivent en Occident.', effects: [{ kind: 'partnerBoost', partner: 'mer:grece', mult: 1.5, months: 120 }, { kind: 'partnerBoost', partner: 'italie', mult: 1.3, months: 120 }, { kind: 'rp', amount: 10 }] },
  { year: 1147, era: 3, title: 'Deuxième croisade', text: 'Louis VII part pour l\'Orient : pendant 3 ans, les villes paient le fer et les outils 40 % plus cher.', effects: [{ kind: 'pop', mult: 0.98 }, { kind: 'demand', res: ['fer', 'outils'], mult: 1.4, months: 36 }] },
  { year: 1190, era: 3, title: 'Troisième croisade', text: 'Philippe Auguste et Richard Cœur de Lion partent ensemble pour l\'Orient : pendant 3 ans, le fer et les outils se vendent 40 % plus cher aux villes.', effects: [{ kind: 'demand', res: ['fer', 'outils'], mult: 1.4, months: 36 }, { kind: 'rp', amount: 6 }] },
  { year: 1270, era: 3, title: 'Mort de Saint Louis', text: 'Louis IX meurt devant Tunis pendant la dernière croisade. L\'époque des croisades s\'achève ; ses fondations (hôpitaux, Sorbonne) restent.', effects: [{ kind: 'rp', amount: 10 }] },
  { year: 1337, era: 3, title: 'Début de la guerre de Cent Ans', text: 'Le roi d\'Angleterre revendique la couronne de France. Le commerce avec la Bretagne insulaire est coupé jusqu\'à la fin de la guerre, et des chevauchées anglaises ravageront l\'ouest et le nord : protège tes villes par des châteaux forts.', effects: [{ kind: 'partnerClosed', partner: 'mer:britannia', months: 1392 }] },
  { year: 1346, era: 3, title: 'Bataille de Crécy', text: 'La chevalerie française est écrasée par les archers anglais. La Picardie et l\'Artois sont dévastés : bâtiments sans protection endommagés à moins de 80 km.', effects: [{ kind: 'raid', share: 0.35, lon: 1.9, lat: 50.25, range: 80 }] },
  { year: 1347, era: 3, title: 'La peste noire', text: 'Venue d\'Orient par Marseille, la peste tue près d\'un habitant sur trois : les villes perdent 35 % de leurs habitants (20 % seulement près d\'un hôtel-Dieu) et les ateliers tournent au ralenti pendant 3 ans.', effects: [{ kind: 'plague', mult: 0.65, cared: 0.8 }, { kind: 'prod', mult: 0.85, months: 36 }] },
  { year: 1356, era: 3, title: 'Bataille de Poitiers', text: 'Le roi Jean le Bon est fait prisonnier par le Prince Noir. Le Poitou est ravagé, et il faut payer sa rançon.', effects: [{ kind: 'raid', share: 0.35, lon: 0.34, lat: 46.58, range: 80 }, { kind: 'money', amount: -1500 }] },
  { year: 1415, era: 3, title: 'Bataille d\'Azincourt', text: 'Nouvelle défaite française : Henri V d\'Angleterre conquiert la Normandie. Le nord est ravagé.', effects: [{ kind: 'raid', share: 0.35, lon: 1.5, lat: 49.8, range: 110 }] },
  { year: 1429, era: 3, title: 'Jeanne d\'Arc', text: 'Jeanne d\'Arc délivre Orléans et fait sacrer Charles VII à Reims. Le royaume reprend courage : les villes grandissent 30 % plus vite pendant 5 ans.', effects: [{ kind: 'growth', mult: 1.3, months: 60 }, { kind: 'rp', amount: 8 }] },
  { year: 1453, era: 3, title: 'Fin de la guerre de Cent Ans', text: 'Victoire de Castillon : les Anglais ne gardent que Calais. La paix revient, le commerce avec la Bretagne insulaire reprend et les villes se repeuplent.', effects: [{ kind: 'growth', mult: 1.2, months: 60 }] },
];
/** Guerre de Cent Ans : chevauchées anglaises au hasard dans l'ouest et le nord (lieux visés) */
export const HUNDRED_YEARS: [number, number] = [1337, 1453];
export const CHEVAUCHEES: { name: string; at: [number, number] }[] = [
  { name: 'en Guyenne', at: [-0.4, 44.9] }, { name: 'en Saintonge', at: [-0.6, 45.75] }, { name: 'en Bretagne', at: [-2.0, 48.0] },
  { name: 'en Normandie', at: [0.2, 49.15] }, { name: 'en Picardie', at: [2.2, 49.9] }, { name: 'autour de Calais', at: [1.86, 50.9] },
  { name: 'en Poitou', at: [0.3, 46.5] }, { name: 'dans le Limousin', at: [1.25, 45.8] }, { name: 'en Champagne', at: [4.05, 48.9] },
];

export const START_MONEY = 2500;
export const START_STOCK: Partial<Record<ResId, number>> = { bois: 120, pierre: 50, cereales: 40 };

// ---- Rivaux (grandes familles et cités romaines) ----
export type Difficulty = 'facile' | 'equilibre' | 'ambitieux';
export const DIFFICULTY: Record<Difficulty, { name: string; desc: string; mult: number }> = {
  facile: { name: 'Facile', desc: 'Les rivaux suivent les mêmes règles que toi, avec 20 % d\'argent de départ et de production en moins.', mult: 0.8 },
  equilibre: { name: 'Équilibré', desc: 'Les rivaux suivent exactement les mêmes règles et les mêmes chiffres que toi.', mult: 1 },
  ambitieux: { name: 'Ambitieux', desc: 'Les rivaux suivent les mêmes règles, avec 20 % d\'argent de départ et de production en plus, et construisent plus vite.', mult: 1.2 },
};
export interface RivalDef { id: string; name: string; short: string; capital: string; home: [number, number]; color: string; character: 'fidele' | 'commercant' | 'opportuniste' | 'guerrier'; frontier?: boolean; desc: string; }
export const CHARACTERS: Record<RivalDef['character'], string> = {
  fidele: 'Fidèles à Rome, attachés aux accords',
  commercant: 'Commerçants, préfèrent négocier',
  opportuniste: 'Opportunistes, tournés vers la mer',
  guerrier: 'Méfiants et guerriers',
};
/** Dernier chapitre disponible (les suivants arrivent dans une prochaine version) */
export const LAST_CHAPTER = 3;
/** Usure des routes au Moyen Âge : années pour qu'une route non entretenue soit complètement abîmée ;
 *  une route abîmée ralentit jusqu'à moitié ; un relais routier entretient les routes autour de lui */
export const ROAD_WEAR_YEARS = 40, ROAD_WEAR_SLOW = 0.5;
/** Grandes maisons médiévales : un rival prend le nom de la plus proche de sa capitale en entrant au Moyen Âge */
export const MEDIEVAL: { name: string; short: string; at: [number, number] }[] = [
  { name: 'Ducs de Bourgogne', short: 'Bourgogne', at: [4.85, 47.1] },
  { name: 'Comtes de Toulouse', short: 'Toulouse', at: [1.44, 43.6] },
  { name: 'Ducs d\'Aquitaine', short: 'Aquitaine', at: [0.34, 46.58] },
  { name: 'Ducs de Lorraine', short: 'Lorraine', at: [6.18, 48.69] },
  { name: 'Comtes de Flandre', short: 'Flandre', at: [3.06, 50.63] },
  { name: 'Comtes de Champagne', short: 'Champagne', at: [4.03, 48.3] },
  { name: 'Comtes d\'Auvergne', short: 'Auvergne', at: [3.08, 45.78] },
  { name: 'Comtes de Provence', short: 'Provence', at: [5.45, 43.53] },
  { name: 'Ducs de Bretagne', short: 'Bretagne', at: [-1.68, 48.11] },
];
export const RIVALS: RivalDef[] = [
  { id: 'aedui', name: 'Éduens d\'Augustodunum', short: 'Éduens', capital: 'Augustodunum', home: [4.3, 46.95], color: '#2b8a3e', character: 'fidele', desc: 'Le plus fidèle allié de Rome en Gaule, riche de ses terres de Bourgogne.' },
  { id: 'narbo', name: 'Domitii de Narbo Martius', short: 'Narbonne', capital: 'Narbo Martius', home: [3.0, 43.18], color: '#1971c2', character: 'commercant', desc: 'Famille de la plus ancienne colonie romaine de Gaule, tournée vers la Méditerranée.' },
  { id: 'burdigala', name: 'Notables de Burdigala', short: 'Burdigala', capital: 'Burdigala', home: [-0.58, 44.84], color: '#7048e8', character: 'opportuniste', desc: 'Marchands du grand port de l\'Atlantique : vin, étain et commerce maritime.' },
  { id: 'treveri', name: 'Trévires d\'Augusta Treverorum', short: 'Trévires', capital: 'Augusta Treverorum', home: [6.64, 49.75], color: '#c92a2a', character: 'guerrier', frontier: true, desc: 'Peuple de la frontière du Rhin, cavaliers redoutés, dont la capitale deviendra une résidence impériale.' },
];
/** Régions de repli si le joueur s'installe trop près d'une capitale rivale */
export const ALT_HOMES: { capital: string; home: [number, number] }[] = [
  { capital: 'Augustonemetum', home: [3.08, 45.78] }, { capital: 'Andematunnum', home: [5.33, 47.86] },
  { capital: 'Vesontio', home: [6.02, 47.24] }, { capital: 'Limonum', home: [0.34, 46.58] },
  { capital: 'Autricum', home: [1.49, 48.45] }, { capital: 'Condate', home: [-1.68, 48.11] },
  { capital: 'Tolosa', home: [1.44, 43.6] }, { capital: 'Durocortorum', home: [4.03, 49.26] },
];
/** Couleur du joueur (territoire, armées) */
export const PLAYER_COLOR = '#e8590c';

