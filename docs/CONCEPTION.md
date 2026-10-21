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
Trois nouveaux paliers de villes : Cité (4 000 habitants : poterie sigillée, vin), Métropole (8 000 : huile
d'olive, tissus, verre), Capitale (15 000, technologie Capitales provinciales : bronze, garum, marbre). Crise du IIIe siècle :
monnaie dévaluée (−20 % sur les ventes 235–284), raids et invasions (256, 275, 352, 406, 451) qui endommagent
les bâtiments sans remparts près du Rhin ; réparation = 30 % du prix (argent + matériaux).

## 3. Carte
- France métropolitaine + Corse, projection en kilomètres réels.
- Carte moderne épurée : relief ombré, fleuves et principales rivières.
- Les pays voisins sont des **partenaires commerciaux** (postes-frontières, puis ports).
- **Calques** (dans le menu) : gisements, eau, zones d'export, couverture (eau, électricité).
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
- Dessinés en **teinte fondue** dans le relief, aux contours irréguliers (sans déborder sur la mer) ;
  la zone exploitable suit ce contour. Les noms peuvent être masqués (calque).
- **Même rendement partout** dans un gisement, et **pas d'épuisement**. Une ferme rend 100 % sur
  n'importe quelles terres. L'exhaure donne +30 % aux mines et carrières.
- Des gisements réels ont été ajoutés autour des régions des rivaux pour qu'elles offrent toutes
  le minimum vital (forêt, pierre, terres, argile) : Corbières, calcaire de la Clape, Sallèles-d'Aude,
  salins de Sigean, Val de Saône, Gueugnon, Lons-le-Saunier, pierre de Bordeaux, Hunsrück, grès de Kordel,
  potiers de Trèves, Volvic, Lezoux, etc.

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
  et évoluent par **paliers**, trois par chapitre. Chaque palier garde les biens des précédents et en ajoute :
  - Chapitre I : Village (céréales, bois, pierre), Bourg à 400 habitants (sel, briques), Ville à 1 500 (outils, plomb).
  - Chapitre II : Cité à 4 000 (poterie sigillée, vin), Métropole à 8 000 (huile d'olive, tissus, verre),
    Capitale à 15 000 avec la technologie Capitales provinciales (bronze, garum, marbre).
  - Pour franchir un palier, la ville doit déjà recevoir ses nouveaux biens.
- Les villes fournissent la **main-d'œuvre** dans un rayon qui grandit avec elles (30, 40, 55, 70, 80 puis 90 km
  selon le palier). Leurs bras en trop renforcent les ateliers voisins (jusqu'à +50 % d'équipe, +25 % de production).
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
- Améliorations des bâtiments par niveaux (prix : ×2 au niveau 2, ×3 au niveau 3) ; un bâtiment en amélioration utilise d'abord sa propre production
  (bûches du camp de bûcherons, pierre de la carrière…) avant de recevoir des convois, avec des matériaux propres à chaque bâtiment (la carrière
  s'améliore avec de la pierre, la ferme et le camp de bûcherons avec du bois, la forge avec de la pierre
  et des briques, les mines avec du fer et de la pierre…).

## 10. Rivaux, diplomatie et guerre
Nouvelles parties uniquement. Quatre grandes familles : **Éduens** (Augustodunum, fidèles),
**Narbonne** (commerçants), **Burdigala** (opportunistes) et **Trévires** (guerriers, frontière du Rhin,
peuvent bâtir hors de Gaule). Difficulté au lancement : Facile / Équilibré / Ambitieux
(argent de départ et production −20 % / 0 / +20 % ; deux ou trois chantiers à la fois).

- **Même économie que le joueur** : chaque rival a sa propre partie complète, simulée par le même moteur
  (bâtiments et chantiers livrés par convois, routes, lignes, véhicules, ouvriers, besoins des villes,
  pénuries, croissance, paliers, salaires et entretien). Départ identique au joueur (village de
  80 habitants, entrepôt, argent et stock de départ).
- **L'ordinateur** donne une fois par mois les ordres d'un joueur : il bâtit ce qui manque le plus
  (nourriture, bois et pierre, puis biens du palier), va chercher un gisement même loin (route, village
  pour les ouvriers), construit la matière première avant l'atelier qui la transforme, améliore ses
  ateliers, crée ses lignes et ajuste ses véhicules selon le besoin réel.
- **Un entrepôt par ville** : chaque ville rivale bâtit son entrepôt. Ses lignes partent de là : exploitations
  → entrepôt de la ville la plus proche, entrepôt → ateliers de transformation → entrepôt, entrepôt → sa ville
  avec retour des restes. Une ligne relie l'entrepôt de la capitale à celui de chaque ville : à l'aller ce
  qui manque à la ville, au retour son surplus (achats à Rome, ventes et commerce passent par la capitale).
  Leurs véhicules ne sont pas affichés.
- **Capitale selon les ressources** : sa région historique si elle offre forêt, pierre, terres et argile,
  sinon la région de repli la mieux pourvue (jamais trop près du joueur ni d'un autre rival).
- **Commerce** : Rome ne leur vend que bois, pierre et céréales ; le reste se produit ou s'achète à un
  autre rival (prix +20 % et transport, livré au bout du trajet). Ils exportent leur surplus.
- **Recherche** : comme le joueur, un rival gagne des points avec ses villes, ses objectifs (les mêmes que
  le joueur) et les événements historiques, se fixe une technologie selon ses gisements, ses besoins et
  son caractère, et l'achète au même prix. Il ne reçoit rien quand le joueur découvre une technologie.
  **Comme le joueur, il doit découvrir tout l'arbre du chapitre en cours avant de passer au chapitre suivant**
  (chaque rival a sa propre époque, indépendante de celle du joueur).
- **Gisements** : un rival va chercher lui-même les gisements dont il a besoin, proches ou lointains ; trop loin
  de ses villes, il fonde d'abord un village à côté (dès qu'il a 1 500 sesterces). Si tous les gisements de
  cette ressource sont déjà exploités ou sur le territoire d'un autre camp, il demande une alliance à celui
  qui exploite le plus proche (une fois par an) : au joueur par une proposition à l'écran, à un autre rival
  qui accepte si leurs relations ne sont pas mauvaises. Entre alliés, gisements et territoires sont partagés ;
  une alliance entre rivaux se rompt avec la guerre ou une relation trop dégradée.
- **Petites erreurs de gestion** : certains mois il est distrait (pas de nouveau chantier ni de réglage
  de ses lignes), il ne surveille pas toutes ses lignes chaque mois et ne choisit pas toujours le
  chantier le plus urgent. Ses villes connaissent donc des creux et des pénuries, comme celles du joueur.
- **Équilibre visé** (vérifié sur 15 ans) : chaque rival reste au-dessus de 70 % de la moyenne des rivaux,
  avec une croissance progressive (environ 3 500 à 6 000 habitants au bout de 15 ans).
- **Territoires** : une seule zone par camp (rayon de main-d'œuvre des villes, bâtiments, routes) ;
  impossible de construire chez un rival ou d'exploiter ses gisements sans alliance.
- **Routes des alliés** : tant que dure l'alliance, elles font partie du réseau du joueur (pointillés
  clairs) : on peut s'y raccorder et les emprunter, pas les démolir. Rupture de l'alliance : elles disparaissent.
- **Taverne et diplomatie** : relations, accord commercial, pacte de non-agression, alliance, cadeaux,
  espionnage. Commerce à la taverne seulement si une **route** la relie à moins de 10 km d'une ville du rival ;
  on n'achète que ce qu'il a en réserve.
- **Guerre** : caserne (légionnaires, auxiliaires, mercenaires), armées visibles avec effectif et moral,
  qui marchent par la terre en contournant la mer, les lacs et les montagnes trop raides,
  sièges. Une ville rivale vaincue : **conquête**, **pillage** ou **tribut**. Un rival peut aussi prendre
  ou piller une ville du joueur ; perdre la dernière ville = fin de partie.
- **Conquête en état de marche** (dans les deux sens) : on prend la ville, son entrepôt, toutes les
  exploitations et tous les ateliers que desservent les lignes de la ville et de cet entrepôt (même loin),
  et les autres bâtiments de ses environs (pas les autres villes). Toutes ces lignes continuent de tourner
  avec leurs véhicules ; une exploitation conquise qui livrait un entrepôt resté à l'ennemi livre désormais
  l'entrepôt conquis. Les routes de la zone changent de camp ; une route qui traverse la frontière est
  partagée au point de passage, sans coupure. Les routes de l'autre camp qu'empruntent les lignes de chacun
  restent utilisables, même en guerre (**routes empruntées**, en pointillés clairs) : elles restent à leur
  propriétaire, et deviennent les tiennes s'il disparaît. Aucune route ne disparaît.

## 11. Interface
- Onglets : Sélection, Construire, Route, Lignes, Économie, Recherche, Objectifs, **Commerce et diplomatie**
  (lignes d'achat et de vente, partenaires étrangers et d'outre-mer, tavernes ; relations et traités avec
  les rivaux ; guerre et paix, armées, casernes, armées ennemies), Démolir, Menu (avec les calques).
- Barre du haut : date, argent, population totale, points de recherche, vitesse.
- Ordinateur, tablette et téléphone (souris et tactile).
- Sauvegarde automatique dans le navigateur + export / import de fichier.
- Sur téléphone, l'arbre de recherche n'affiche pas de légende (plus de place pour naviguer).
- Bâtiments et véhicules détaillés mais lisibles vus du dessus. Pas de musique pour l'instant.

## 12. Feuille de route
1. Chapitre I (Antiquité romaine) : fait.
2. Chapitre II (Gaule romaine) : fait.
3. Rivaux, diplomatie et guerre : fait.
4. Chapitre III (Moyen Âge) : à venir. ← *prochaine étape*
5. Chapitres IV à VI.
