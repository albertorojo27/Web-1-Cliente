// Capa de presentación: recibe datos ya transformados y los pinta.
// Todo el texto entra con textContent (nunca innerHTML con datos de la API).

import { typeMeta, statEntries } from '../logic/transform.js';

const MAX_STAT = 255;
const PLACEHOLDER_SPRITE = `${import.meta.env.BASE_URL}unknown.svg`;

/** Pequeño helper para crear nodos sin concatenar HTML. */
function el(tag, { className, text, attrs = {}, style = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  Object.entries(style).forEach(([key, value]) => node.style.setProperty(key, value));
  node.append(...children.filter(Boolean));
  return node;
}

const typeBadge = (type) => {
  const meta = typeMeta(type);
  return el('span', { className: 'badge', text: meta.label, style: { '--type-color': meta.color } });
};

/* ---------- Zonas (tipos) ---------- */

export function renderTypes(container, types, activeType) {
  const buttons = types.map((t) =>
    el(
      'button',
      {
        className: `zone${t.name === activeType ? ' is-active' : ''}`,
        attrs: { type: 'button', 'data-type': t.name, 'aria-pressed': String(t.name === activeType) },
        style: { '--type-color': t.color },
      },
      [el('span', { className: 'zone__label', text: t.label }), el('span', { className: 'zone__biome', text: t.biome })],
    ),
  );
  container.replaceChildren(...buttons);
}

export function renderTypesLoading(container) {
  const skeletons = Array.from({ length: 18 }, () => el('span', { className: 'zone zone--skeleton', attrs: { 'aria-hidden': 'true' } }));
  container.replaceChildren(...skeletons);
}

/* ---------- Estados genéricos ---------- */

export function renderLoading(container, message, count = 8) {
  const skeletons = Array.from({ length: count }, () => el('div', { className: 'card card--skeleton', attrs: { 'aria-hidden': 'true' } }));
  container.replaceChildren(
    el('p', { className: 'state state--loading', text: message, attrs: { role: 'status' } }),
    el('div', { className: 'grid' }, skeletons),
  );
}

export function renderError(container, message, onRetry) {
  const retry = el('button', { className: 'btn', text: 'Reintentar transmisión', attrs: { type: 'button' } });
  retry.addEventListener('click', onRetry, { once: true });

  container.replaceChildren(
    el('div', { className: 'state state--error', attrs: { role: 'alert' } }, [
      el('p', { className: 'state__title', text: '⚠ Transmisión interrumpida' }),
      el('p', { text: message }),
      onRetry && retry,
    ]),
  );
}

export function renderMessage(container, title, message) {
  container.replaceChildren(
    el('div', { className: 'state' }, [el('p', { className: 'state__title', text: title }), el('p', { text: message })]),
  );
}

/* ---------- Fichas ---------- */

function pokemonCard(p) {
  const mainColor = typeMeta(p.types[0]).color;

  const img = el('img', {
    className: 'card__sprite',
    attrs: { src: p.sprite ?? PLACEHOLDER_SPRITE, alt: p.name, loading: 'lazy', width: '160', height: '160' },
  });
  img.addEventListener('error', () => (img.src = PLACEHOLDER_SPRITE), { once: true });

  const stats = statEntries(p.stats).map(({ label, value }) =>
    el('li', { className: 'stat' }, [
      el('span', { className: 'stat__label', text: label }),
      el('span', { className: 'stat__bar' }, [
        el('span', { className: 'stat__fill', style: { '--value': `${Math.min(value / MAX_STAT, 1) * 100}%` } }),
      ]),
      el('span', { className: 'stat__value', text: String(value) }),
    ]),
  );

  const abilities = p.abilities.length
    ? p.abilities.map((a) => `${a.name}${a.hidden ? ' (oculta)' : ''}`).join(' · ')
    : 'Sin datos';

  return el('article', { className: 'card', style: { '--type-color': mainColor } }, [
    el('header', { className: 'card__head' }, [
      el('span', { className: 'card__id', text: `#${String(p.id).padStart(4, '0')}` }),
      el('span', { className: 'card__total', text: `Σ ${p.total}`, attrs: { title: 'Suma de estadísticas base' } }),
    ]),
    el('div', { className: 'card__art' }, [img]),
    el('h3', { className: 'card__name', text: p.name }),
    el('div', { className: 'card__types' }, p.types.map(typeBadge)),
    el('ul', { className: 'stats' }, stats),
    el('dl', { className: 'card__facts' }, [
      el('dt', { text: 'Altura' }),
      el('dd', { text: `${p.heightM} m` }),
      el('dt', { text: 'Peso' }),
      el('dd', { text: `${p.weightKg} kg` }),
      el('dt', { text: 'Habilidades' }),
      el('dd', { text: abilities }),
    ]),
  ]);
}

export function renderGrid(container, pokemon) {
  container.replaceChildren(el('div', { className: 'grid' }, pokemon.map(pokemonCard)));
}

/* ---------- Informe de expedición ---------- */

export function renderReport(container, report, typeName) {
  if (!report) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }

  const meta = typeMeta(typeName);
  const item = (label, value) => el('div', { className: 'report__item' }, [el('dt', { text: label }), el('dd', { text: value })]);

  container.hidden = false;
  container.style.setProperty('--type-color', meta.color);
  container.replaceChildren(
    el('h2', { className: 'report__title', text: `Informe · ${meta.biome}` }),
    el('dl', { className: 'report__grid' }, [
      item('Avistamientos', String(report.count)),
      item('Poder medio', String(report.avgPower)),
      item('Más fuerte', `${report.strongest.name} (${report.strongest.total})`),
      item('Más veloz', `${report.fastest.name} (${report.fastest.stats.speed})`),
      item('Más pesado', `${report.heaviest.name} (${report.heaviest.weightKg} kg)`),
      item('Carga total', `${report.totalWeight} kg`),
      item(`Tipo ${meta.label} puro`, `${report.pureCount} de ${report.count}`),
      item(
        'Compañero habitual',
        report.topCompanion ? `${typeMeta(report.topCompanion.type).label} (×${report.topCompanion.count})` : 'Ninguno',
      ),
    ]),
  );
}

/* ---------- Barra de estado ---------- */

export function renderStatus(container, { network, cache, stored }) {
  container.textContent = `📡 red: ${network} · 💾 caché: ${cache} · guardadas: ${stored}`;
}
