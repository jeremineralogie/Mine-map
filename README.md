# Mine Map

Jeu de gestion dans le navigateur : bâtis l'économie de la France, de l'Antiquité romaine à aujourd'hui.
Extrais les ressources sur la **vraie carte de France**, transforme-les, trace tes routes et organise
tes lignes de transport pour approvisionner tes villes et commercer avec les pays voisins.

**Jouer :** https://jeremineralogie.github.io/Mine-map/

## État actuel — prototype du chapitre I (Antiquité romaine)

- Carte réelle : relief ombré, fleuves, rivières, lacs, Corse, pays voisins.
- Plus de 120 gisements placés à leur emplacement approximatif réel (calque *Gisements*).
- Routes dessinées à la main : coût selon la pente, ponts automatiques sur les fleuves, démolition.
- Chantiers livrés par des convois depuis les entrepôts.
- Villes fondées par le joueur : main-d'œuvre, besoins, croissance par paliers (village → bourg → ville → cité).
- Lignes de transport créées à la main, véhicules visibles sur la carte.
- Eau (fleuves, côtes, aqueducs), salaires, prix variables, faillite.
- Arbre technologique, objectifs historiques (dont le Pont du Gard), événements historiques datés.
- Ordinateur, tablette et téléphone. Sauvegarde automatique + export / import.

Le document de conception complet est dans [`docs/CONCEPTION.md`](docs/CONCEPTION.md).

## Développement

```bash
npm install
npm run dev      # serveur local
npm run build    # version de production dans dist/
```

Les données de carte de `public/data` sont générées une fois pour toutes par `tools/build-data.mjs`
(il faut d'abord télécharger les fichiers GeoJSON Natural Earth listés dans le script) :

```bash
node tools/build-data.mjs <dossier-des-geojson>
```

Chaque envoi sur la branche `main` publie automatiquement le jeu sur GitHub Pages
(`.github/workflows/pages.yml`).

## Crédits

- Contours, fleuves et lacs : [Natural Earth](https://www.naturalearthdata.com/) (domaine public).
- Altitudes : [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (Mapzen, AWS Open Data),
  dérivées de SRTM, ETOPO1 et d'autres sources ouvertes.
