# Mine Map — Document de conception

Jeu de gestion **solo**, dans le navigateur, hébergé gratuitement sur GitHub Pages.
On part d'une **France vierge** (relief, fleuves, rivières) et on bâtit une économie
d'extraction, de transformation et de transport, de l'**Antiquité romaine à aujourd'hui**.

Mélange de *Transport Tycoon* (logistique, lignes, véhicules visibles) et de *Factorio*
(chaînes de production), en plus simple.

## 1. Temps
- Le temps s'écoule en continu, avec **pause** et **accélération** (×1, ×2, ×4, ×8).
- À vitesse ×1, **1 heure de jeu = 10 ans** (1 an ≈ 6 minutes, 1 jour ≈ 1 seconde).
- Le passage d'une époque à l'autre se fait par **chapitres** : un chapitre est terminé
  quand toutes les technologies et tous les objectifs de l'époque sont accomplis.
  La date saute alors au début de l'époque suivante.

## 2. Époques (chapitres)
| # | Époque | Début | Matières clés | Transports |
|---|--------|-------|---------------|------------|
| I | Antiquité romaine | 50 av. J.-C. | bois, pierre, argile, fer, plomb, sel, nourriture | charrette à bœufs, chariot à chevaux, voie romaine |
| II | Gaule romaine | an 1 (→ 476) | vin, huile, poterie sigillée, verre, chaux, marbre, garum, laine, tissus, bronze | carpentum, grande barge, oneraria, relais routiers |
| III | Moyen Âge | 500 | moulins, forges, cathédrales, ardoise | chevaux de trait, barges, ports à voile |
| IV | Révolution industrielle | 1780 | charbon, acier, vapeur, verre | chemin de fer, canaux |
| V | Électricité et pétrole | 1890 | pétrole, électricité, ciment, béton | camions, pétroliers, pipelines |
| VI | Époque moderne | 1960 | nucléaire, aluminium, électronique, terres rares | autoroutes, porte-conteneurs |

**Chapitre II — Gaule romaine** : fin quand l'arbre (20 technologies, 5 branches dont Culture et religion)
est complet, les Arènes de Nîmes construites et la date ≥ 426 (476 à 50 ans près ; bouton d'avance rapide).
Nouveaux besoins des villes par palier (poterie, vin, huile, tissus, verre, puis bronze, garum, marbre pour
la Capitale à 15 000 habitants) ; les anciens produits sont consommés 20 % de moins. Crise du IIIe siècle :
monnaie dévaluée (−20 % sur les ventes 235–284), raids et invasions (256, 275, 352, 406, 451) qui endommagent
les bâtiments sans remparts près du Rhin ; réparation = 30 % du prix (argent + matériaux).

## 3. Carte
- France métropolitaine + Corse, projection en kilomètres réels.
- Carte moderne épurée : relief ombré, fleuves et principales rivières.
- Les pays voisins sont des **partenaires commerciaux** (postes-frontières, puis ports).
- **Calques** : gisements, eau, zones d'export, couverture (eau, électricité).
- Données : Natural Earth (domaine public), altitudes Terrarium (AWS Open Data),
  générées par `tools/build-data.mjs` et versionnées dans `public/data`.

## 4. Ressources (≈ 45)
- **Brutes** : bois, pierre, argile, sable, calcaire, granite, ardoise, minerai de fer, charbon,
  cuivre, plomb, étain, zinc, sel, bauxite, fluorine, potasse, uranium, pétrole, gaz naturel,
  kaolin, or et argent, terres rares, eau.
- **Nourriture** : céréales, poisson, viande, vin.
- **Transformées** : planches, briques, chaux, ciment, béton, verre, fer, acier, bronze,
  aluminium, carburant, plastique, porcelaine, engrais.
- **Produits finis** : outils, machines, rails, véhicules, composants électroniques.

### Gisements
- Placés **approximativement à leur emplacement réel** (charbon du Nord et de Lorraine,
  fer lorrain, bauxite du Var, fluorine du Massif central, sel de Lorraine et du Jura, etc.).
- Visibles grâce au **calque des gisements**, uniquement pour les ressources de l'époque en cours :
  les gisements des époques suivantes se découvrent en changeant d'époque.
- **Richesse variable** selon le gisement.
- Ne s'épuisent pas, mais leur **rendement baisse** avec l'extraction cumulée ;
  certaines technologies relèvent le rendement.

## 5. Construction
- Départ : un petit capital et un petit stock de matériaux dans un **entrepôt de départ**.
- Chaque bâtiment coûte de l'argent **et des matériaux livrés sur le chantier** par
  charrette depuis un entrepôt relié par route.
- Un chantier peut être mis en pause. Les lignes peuvent aussi livrer des matériaux sur un chantier.
- Un port fluvial non relié par la route est ravitaillé par chaland depuis un entrepôt ou un port au bord du fleuve.
- La construction prend un peu de temps ; chaque **amélioration** prend plus de temps
  que la précédente.
- Le **relief** influence le coût des routes ; traverser un fleuve impose un **pont**.
- Pas d'achat de terrain, pas d'entretien (pour l'instant).

## 6. Villes, main-d'œuvre, eau, électricité
- Le joueur **fonde ses villes**. Elles grandissent seules si elles sont approvisionnées,
  et évoluent avec les époques (village → bourg → ville → cité).
- Les villes fournissent la **main-d'œuvre** dans un rayon qui grandit avec elles (30 km pour un village,
  70 km pour une cité). Leurs bras en trop renforcent les ateliers voisins (jusqu'à +50 % d'équipe, +25 % de production).
- **Eau** : près d'un fleuve, d'un lac ou de la côte, ou dans la portée d'un aqueduc / d'une pompe.
- **Électricité** (à partir de l'époque IV) : chaque centrale couvre une zone (portée).

## 7. Transport
- Routes **dessinées à la main** (et supprimables). Une route peut partir d'un bâtiment, d'un carrefour,
  du terrain ou **du milieu d'une route existante** (un carrefour y est créé). Deux routes qui se croisent
  forment automatiquement un carrefour. Les véhicules empruntent le chemin le plus rapide du réseau.
  Dès que la route atteint un bâtiment, un carrefour ou une route existante, le tracé se termine et l'on
  revient à la sélection ; un point en terrain libre ajoute un virage. Le clic droit ramène à la sélection.
- **Chaque ligne est créée à la main** : véhicule, arrêts dans l'ordre (départ → étapes → arrivée, puis retour),
  et à chaque arrêt de chargement **une ou plusieurs ressources** : un véhicule peut transporter plusieurs
  matériaux à la fois, dans la limite de sa capacité. À chaque arrêt de déchargement, on choisit la part
  du chargement de départ à déposer (25 %, 50 %, tout le reste…).
- Sur la carte, une ligne est tracée le long de ses routes, avec le sens de circulation, les arrêts
  numérotés, le départ, l'arrivée et les matériaux chargés.
- Les véhicules sont **visibles** et se déplacent sur la carte.
- Déblocage progressif : charrette → chariot à chevaux → barge → train → camion, pipeline,
  navire, etc.
- **Navigation fluviale** : ports fluviaux au bord des grands fleuves ; les barges (12 t) relient deux ports
  par le fleuve, sans route.
- **Pause d'un atelier** : ses ouvriers sont libérés et réaffectés aux ateliers qui en manquent.
- **Pause d'une ligne** : les véhicules chargés terminent leur livraison, puis s'arrêtent (frais de
  fonctionnement maintenus). Suppression de toutes les lignes en une fois.

## 8. Économie
- Les **habitants** achètent ce dont la ville a besoin pour grandir.
- Les **partenaires étrangers** achètent certaines ressources.
- **Prix variables** selon l'offre et la demande.
- **Faillite = fin de partie** (après un délai de grâce).

## 9. Progression
- **Arbre technologique** par branches (Transport, Production, Cité, Commerce), payé en points de recherche.
  Le joueur choisit librement l'ordre selon sa stratégie (voies romaines ou navigation fluviale, mines ou commerce…).
  **L'époque suivante s'ouvre quand tout l'arbre de l'époque est débloqué** ; les objectifs historiques sont des bonus.
- **Objectifs historiques** par époque (ex. « Construire le Pont du Gard », « Relier Paris à
  Lyon par le rail ») : ils rapportent argent et points de recherche.
- **Événements historiques** datés, aux effets concrets et temporaires : remise sur les chantiers (autel des
  Trois Gaules), prix de rachat des villes en hausse (incendie de Lugdunum), production en hausse ou en baisse,
  croissance des villes, frontières fermées… Les effets en cours sont listés dans Économie et Objectifs.
- Améliorations des bâtiments par niveaux ; un bâtiment en amélioration utilise d'abord sa propre production
  (bûches du camp de bûcherons, pierre de la carrière…) avant de recevoir des convois, avec des matériaux propres à chaque bâtiment (la carrière
  s'améliore avec de la pierre, la ferme et le camp de bûcherons avec du bois, la forge avec de la pierre
  et des briques, les mines avec du fer et de la pierre…).

## 10. Interface
- Ordinateur, tablette et téléphone (souris et tactile).
- Sauvegarde automatique dans le navigateur + export / import de fichier.
- Bâtiments et véhicules détaillés mais lisibles vus du dessus. Pas de musique pour l'instant.

## 11. Feuille de route
1. **Prototype (chapitre I)** : carte, gisements, routes, chantiers, production, lignes,
   villes, recherche, objectifs, événements. ← *en cours*
2. Équilibrage du chapitre I.
3. Chapitre II (Moyen Âge) : barges et transport fluvial, ports.
4. Chapitres III à V.
