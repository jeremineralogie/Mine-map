import './style.css';
import { Geo } from './geo';
import { Game } from './ui';

// Les gestes faits sur le jeu (glisser, pincer, double-toucher) ne doivent jamais faire défiler,
// zoomer ou fermer la page qui l'affiche : seuls les panneaux à contenu long peuvent défiler.
const scrollable = (t: EventTarget | null) => t instanceof Element && !!t.closest('#panelBody, #modal .box, #tools, .tv-scroll, .tv-detail');
document.addEventListener('touchmove', e => { if (e.touches.length > 1 || !scrollable(e.target)) e.preventDefault(); }, { passive: false });
document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(g, e => e.preventDefault(), { passive: false });
document.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false }); // zoom de page au pavé tactile

const geo = new Geo();
geo.load(import.meta.env.BASE_URL).then(() => {
  document.getElementById('loading')!.remove();
  // exposé pour le débogage depuis la console du navigateur
  (window as unknown as { game: Game }).game = new Game(geo);
}).catch(err => {
  document.getElementById('loading')!.textContent = 'Impossible de charger la carte : ' + err;
});
