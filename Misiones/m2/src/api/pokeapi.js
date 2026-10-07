// Capa de acceso a datos: lo único que sabe hablar con PokeAPI.
// No toca el DOM ni transforma datos para pintar; solo pide, valida y cachea.

import { readCache, writeCache } from './cache.js';

const BASE_URL = 'https://pokeapi.co/api/v2';
const TIMEOUT_MS = 8000;

export class ApiError extends Error {
  constructor(message, { status = null, cause = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.cause = cause;
  }
}

// Estadística de la sesión: cuántas peticiones fueron a red y cuántas a caché.
export const requestStats = { network: 0, cache: 0 };

/**
 * fetch + async/await con: caché, timeout, comprobación de response.ok
 * y validación de que el cuerpo sea JSON.
 * `slim` recorta la respuesta antes de cachearla: un Pokémon completo pesa
 * cientos de KB (movimientos, versiones...) y llenaría localStorage enseguida.
 * `cacheIf` evita guardar respuestas vacías: no queremos recordar un error 24 horas.
 */
async function fetchJSON(path, { slim = (data) => data, cacheIf = (data) => Object.keys(data).length > 0 } = {}) {
  const cached = readCache(path);
  if (cached !== null) {
    requestStats.cache++;
    return cached;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });

    if (!response.ok) {
      const message =
        response.status === 404
          ? 'Esa zona no aparece en el mapa (404).'
          : `El servidor respondió con un error (${response.status}).`;
      throw new ApiError(message, { status: response.status });
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new ApiError('La respuesta llegó corrupta (no es JSON válido).', { cause: err });
    }

    if (data === null || typeof data !== 'object') {
      throw new ApiError('La respuesta llegó vacía.');
    }

    const slimmed = slim(data);
    requestStats.network++;
    if (cacheIf(slimmed)) writeCache(path, slimmed);
    return slimmed;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      throw new ApiError('La señal se perdió: la petición tardó demasiado.', { cause: err });
    }
    // TypeError de fetch = sin red, DNS, CORS...
    throw new ApiError('Sin conexión con la base. Revisa tu red e inténtalo de nuevo.', { cause: err });
  } finally {
    clearTimeout(timer);
  }
}

/** Lista de tipos (fuego, agua...). */
export async function getTypes() {
  const data = await fetchJSON('/type?limit=100', { cacheIf: (d) => Array.isArray(d.results) && d.results.length > 0 });
  return Array.isArray(data.results) ? data.results : [];
}

/** Detalle de un tipo: incluye la lista de Pokémon que lo tienen. */
export async function getType(name) {
  return fetchJSON(`/type/${encodeURIComponent(name)}`, {
    slim: ({ name: typeName, pokemon }) => ({
      name: typeName,
      pokemon: Array.isArray(pokemon) ? pokemon : [],
    }),
    cacheIf: (d) => d.pokemon.length > 0,
  });
}

/** Detalle de un Pokémon. */
export async function getPokemon(name) {
  return fetchJSON(`/pokemon/${encodeURIComponent(name)}`, {
    slim: ({ id, name: pokeName, height, weight, base_experience, types, stats, abilities, sprites }) => ({
      id,
      name: pokeName,
      height,
      weight,
      base_experience,
      types,
      stats,
      abilities,
      sprites: {
        front_default: sprites?.front_default ?? null,
        artwork: sprites?.other?.['official-artwork']?.front_default ?? null,
      },
    }),
    cacheIf: (d) => Boolean(d.id && d.name),
  });
}

/**
 * Pide varios Pokémon en paralelo. Usa allSettled para que un fallo aislado
 * no tumbe la expedición entera: devuelve los que llegaron y cuántos fallaron.
 */
export async function getManyPokemon(names) {
  const results = await Promise.allSettled(names.map(getPokemon));

  return results.reduce(
    (acc, result) => {
      if (result.status === 'fulfilled') acc.ok.push(result.value);
      else acc.failed++;
      return acc;
    },
    { ok: [], failed: 0 },
  );
}
