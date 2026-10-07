// Orquestador: conecta eventos del usuario, la capa de API, la lógica y el render.

import './style.css';
import { getTypes, getType, getManyPokemon, requestStats } from './api/pokeapi.js';
import { clearCache, cacheSize } from './api/cache.js';
import { normalizeTypes, pokemonNamesFromType, normalizePokemon, filterAndSort, buildReport, typeMeta, SORTERS } from './logic/transform.js';
import {
  renderTypes,
  renderTypesLoading,
  renderLoading,
  renderError,
  renderMessage,
  renderGrid,
  renderReport,
  renderStatus,
} from './ui/render.js';

const PAGE_SIZE = 20;

const dom = {
  zones: document.querySelector('#zones'),
  controls: document.querySelector('#controls'),
  search: document.querySelector('#search'),
  sort: document.querySelector('#sort'),
  report: document.querySelector('#report'),
  results: document.querySelector('#results'),
  more: document.querySelector('#more'),
  status: document.querySelector('#status'),
  clearCache: document.querySelector('#clear-cache'),
};

const state = {
  types: [],
  currentType: null,
  names: [], // todos los Pokémon del tipo (solo nombres)
  pokemon: [], // fichas ya descargadas y normalizadas
  failed: 0,
  query: '',
  sortBy: 'id',
  loading: false,
};

// Cada expedición recibe un id: si el usuario cambia de zona a mitad de carga,
// las respuestas de la expedición anterior se descartan al llegar.
let expeditionId = 0;

const updateStatus = () => renderStatus(dom.status, { ...requestStats, stored: cacheSize() });

/* ---------- Carga de datos ---------- */

async function loadTypes() {
  renderTypesLoading(dom.zones);
  try {
    state.types = normalizeTypes(await getTypes());
    if (!state.types.length) {
      renderMessage(dom.zones, 'Mapa en blanco', 'La API no devolvió ninguna zona que explorar.');
      return;
    }
    renderTypes(dom.zones, state.types, state.currentType);
  } catch (err) {
    renderError(dom.zones, err.message, loadTypes);
  } finally {
    updateStatus();
  }
}

async function startExpedition(typeName) {
  const id = ++expeditionId;
  const meta = typeMeta(typeName);

  Object.assign(state, { currentType: typeName, names: [], pokemon: [], failed: 0, query: '', sortBy: 'id', loading: false });
  dom.search.value = '';
  dom.sort.value = 'id';
  dom.controls.hidden = true;
  dom.more.hidden = true;
  document.body.style.setProperty('--type-color', meta.color);
  renderTypes(dom.zones, state.types, typeName);
  renderReport(dom.report, null);
  renderLoading(dom.results, `Viajando a: ${meta.biome}…`);

  try {
    const names = pokemonNamesFromType(await getType(typeName));
    if (id !== expeditionId) return;

    if (!names.length) {
      renderMessage(dom.results, 'Zona desierta', `No se ha avistado ningún Pokémon de tipo ${meta.label}.`);
      return;
    }

    state.names = names;
    await loadNextPage(id);
  } catch (err) {
    if (id !== expeditionId) return;
    renderError(dom.results, err.message, () => startExpedition(typeName));
  } finally {
    updateStatus();
  }
}

async function loadNextPage(id = expeditionId) {
  if (state.loading) return;
  const nextNames = state.names.slice(state.pokemon.length + state.failed, state.pokemon.length + state.failed + PAGE_SIZE);
  if (!nextNames.length) return;

  state.loading = true;
  dom.more.disabled = true;
  dom.more.textContent = 'Rastreando…';
  if (!state.pokemon.length) renderLoading(dom.results, `Rastreando ${nextNames.length} avistamientos…`);

  try {
    const { ok, failed } = await getManyPokemon(nextNames);
    if (id !== expeditionId) return;

    state.pokemon = [...state.pokemon, ...ok.map(normalizePokemon)];
    state.failed += failed;

    if (!state.pokemon.length) {
      renderError(dom.results, 'No se pudo identificar a ningún Pokémon de la zona.', () => startExpedition(state.currentType));
      return;
    }
    dom.controls.hidden = false;
    render();
  } finally {
    if (id === expeditionId) {
      state.loading = false;
      dom.more.disabled = false;
    }
    updateStatus();
  }
}

/* ---------- Pintado ---------- */

function render() {
  const visible = filterAndSort(state.pokemon, { query: state.query, sortBy: state.sortBy });
  const remaining = state.names.length - state.pokemon.length - state.failed;

  renderReport(dom.report, buildReport(visible, state.currentType), state.currentType);

  if (visible.length) {
    renderGrid(dom.results, visible);
  } else {
    renderMessage(dom.results, 'Sin rastro', `Ningún Pokémon explorado coincide con «${state.query}».`);
  }

  if (state.failed) {
    dom.results.prepend(
      Object.assign(document.createElement('p'), {
        className: 'state state--warn',
        textContent: `⚠ ${state.failed} ficha(s) se perdieron por el camino.`,
      }),
    );
  }

  dom.more.hidden = remaining <= 0;
  dom.more.textContent = `Explorar más (${remaining} por descubrir)`;
}

/* ---------- Eventos ---------- */

// Delegación: un único listener para todas las zonas.
dom.zones.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-type]');
  if (!button || button.dataset.type === state.currentType) return;
  startExpedition(button.dataset.type);
});

dom.search.addEventListener('input', (event) => {
  state.query = event.target.value;
  render();
});

dom.sort.addEventListener('change', (event) => {
  state.sortBy = event.target.value;
  render();
});

dom.more.addEventListener('click', () => loadNextPage());

dom.clearCache.addEventListener('click', () => {
  clearCache();
  updateStatus();
});

dom.sort.replaceChildren(...Object.entries(SORTERS).map(([value, { label }]) => new Option(label, value)));
renderMessage(dom.results, 'Elige una zona', 'Cada tipo es un bioma distinto. Selecciona uno para empezar la expedición.');
loadTypes();
