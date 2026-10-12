import './style.css';
import { Geo } from './geo';
import { Game } from './ui';

const geo = new Geo();
geo.load(import.meta.env.BASE_URL).then(() => {
  document.getElementById('loading')!.remove();
  // exposé pour le débogage depuis la console du navigateur
  (window as unknown as { game: Game }).game = new Game(geo);
}).catch(err => {
  document.getElementById('loading')!.textContent = 'Impossible de charger la carte : ' + err;
});
