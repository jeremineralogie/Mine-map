import './style.css';
import { Geo } from './geo';
import { setTerritoryGeo } from './territory';
import { Game } from './ui';
import { SAVE_KEY } from './state';

// Les gestes faits sur le jeu (glisser, pincer, double-toucher) ne doivent jamais faire défiler,
// zoomer ou fermer la page qui l'affiche : seuls les panneaux à contenu long peuvent défiler.
const scrollable = (t: EventTarget | null) => t instanceof Element && !!t.closest('#panelBody, #modal .box, #tools, .tv-scroll, .tv-detail');
document.addEventListener('touchmove', e => { if (e.touches.length > 1 || !scrollable(e.target)) e.preventDefault(); }, { passive: false });
document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(g, e => e.preventDefault(), { passive: false });
document.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false }); // zoom de page au pavé tactile

const geo = new Geo();
geo.load(import.meta.env.BASE_URL).then(() => {
  setTerritoryGeo(geo);
  // exposé pour le débogage depuis la console du navigateur
  (window as unknown as { game: Game }).game = new Game(geo);
  document.getElementById('loading')?.remove();
}).catch(err => {
  console.error(err);
  // message lisible, sans écran blanc : on peut réessayer ou repartir de zéro
  const el = document.getElementById('loading') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'loading' }));
  el.textContent = `Impossible de démarrer le jeu (${err instanceof Error ? err.message : String(err)}). `;
  const retry = Object.assign(document.createElement('button'), { textContent: 'Réessayer' }); retry.onclick = () => location.reload();
  const reset = Object.assign(document.createElement('button'), { textContent: 'Nouvelle partie' });
  reset.onclick = () => { try { localStorage.setItem(SAVE_KEY + '-abimee', localStorage.getItem(SAVE_KEY) ?? ''); localStorage.removeItem(SAVE_KEY); } catch { /* stockage indisponible */ } location.reload(); };
  el.append(retry, ' ', reset);
});
