// Pictogrammes de l'interface (trait, 24×24, couleur héritée du texte).
const svg = (body: string) => `<svg class="uic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const IC: Record<string, string> = {
  select: svg('<path d="M5 3l13 7-6 1.6L9.5 18z"/><path d="M12.2 11.8l5.3 6.2"/>'),
  build: svg('<path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/><path d="M9 11h6"/>'),
  road: svg('<path d="M7 21L10 3"/><path d="M17 21L14 3"/><path d="M12 5v2M12 11v2M12 17v2"/>'),
  lines: svg('<circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="6" r="2.2"/><path d="M7 17c5-1 3-8 8-10"/><path d="M14.5 5.2L17 6.4l-1.4 2.4"/>'),
  economy: svg('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M3 20h18"/><path d="M20 20v-4"/>'),
  research: svg('<path d="M9 3h6"/><path d="M10 3v6l-5.5 9.2A1.8 1.8 0 0 0 6 21h12a1.8 1.8 0 0 0 1.5-2.8L14 9V3"/><path d="M7.5 15h9"/>'),
  objectives: svg('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'),
  layers: svg('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  demolish: svg('<path d="M14.5 4.5l5 5"/><path d="M12 7l5 5"/><path d="M15.5 8.5L5 19"/><path d="M4 20l2-1-1-1z"/>'),
  menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  coin: svg('<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>'),
  scroll: svg('<path d="M7 4h11a2 2 0 0 1 2 2v1h-4"/><path d="M16 7v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h10"/><path d="M7 4a2 2 0 0 0-2 2v11"/><path d="M9 9h4M9 13h4"/>'),
  pause: svg('<path d="M9 5v14M15 5v14"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  transport: svg('<circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M7 17h10"/><path d="M4 12h13l3 5"/><path d="M6 12V8h8v4"/>'),
  production: svg('<path d="M3 21V11l5 3V11l5 3V7l8 4v10z"/><path d="M7 21v-3M12 21v-3M17 21v-3"/>'),
  cite: svg('<path d="M3 21h18"/><path d="M4 10h16"/><path d="M12 3l8 4H4z"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/>'),
  commerce: svg('<path d="M12 4v16"/><path d="M7 20h10"/><path d="M4 8h16"/><path d="M6 8l-3 6a3 3 0 0 0 6 0z"/><path d="M18 8l-3 6a3 3 0 0 0 6 0z"/>'),
  map: svg('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
};

export const LABELS: Record<string, string> = {
  select: 'Sélection', build: 'Construire', road: 'Route', lines: 'Lignes', economy: 'Économie',
  research: 'Recherche', objectives: 'Objectifs', layers: 'Calques', demolish: 'Démolir', menu: 'Menu',
};
