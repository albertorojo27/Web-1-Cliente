// Lógica pura: transforma las respuestas crudas de la API en datos listos para pintar.
// Sin fetch y sin DOM, así cada función se puede razonar (y probar) de forma aislada.

// Tipos que existen en la API pero no tienen Pokémon jugables.
const HIDDEN_TYPES = ['unknown', 'shadow', 'stellar'];

export const TYPE_META = {
  normal: { label: 'Normal', color: '#a8a77a', biome: 'Praderas' },
  fire: { label: 'Fuego', color: '#ee8130', biome: 'Volcán' },
  water: { label: 'Agua', color: '#6390f0', biome: 'Arrecife' },
  electric: { label: 'Eléctrico', color: '#f7d02c', biome: 'Central eléctrica' },
  grass: { label: 'Planta', color: '#7ac74c', biome: 'Selva' },
  ice: { label: 'Hielo', color: '#96d9d6', biome: 'Glaciar' },
  fighting: { label: 'Lucha', color: '#c22e28', biome: 'Dojo' },
  poison: { label: 'Veneno', color: '#a33ea1', biome: 'Pantano' },
  ground: { label: 'Tierra', color: '#e2bf65', biome: 'Desierto' },
  flying: { label: 'Volador', color: '#a98ff3', biome: 'Cumbres' },
  psychic: { label: 'Psíquico', color: '#f95587', biome: 'Templo' },
  bug: { label: 'Bicho', color: '#a6b91a', biome: 'Bosque' },
  rock: { label: 'Roca', color: '#b6a136', biome: 'Cantera' },
  ghost: { label: 'Fantasma', color: '#735797', biome: 'Torre abandonada' },
  dragon: { label: 'Dragón', color: '#6f35fc', biome: 'Cueva ancestral' },
  dark: { label: 'Siniestro', color: '#705746', biome: 'Callejón' },
  steel: { label: 'Acero', color: '#b7b7ce', biome: 'Fábrica' },
  fairy: { label: 'Hada', color: '#d685ad', biome: 'Jardín encantado' },
};

const FALLBACK_META = { label: '???', color: '#888888', biome: 'Zona desconocida' };

const STAT_LABELS = {
  hp: 'PS',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'At. Esp.',
  'special-defense': 'Def. Esp.',
  speed: 'Velocidad',
};

export const SORTERS = {
  id: { label: 'Nº Pokédex', fn: (a, b) => a.id - b.id },
  total: { label: 'Poder total', fn: (a, b) => b.total - a.total },
  speed: { label: 'Velocidad', fn: (a, b) => b.stats.speed - a.stats.speed },
  weight: { label: 'Peso', fn: (a, b) => b.weightKg - a.weightKg },
  name: { label: 'Nombre (A-Z)', fn: (a, b) => a.name.localeCompare(b.name) },
};

export const typeMeta = (name) => TYPE_META[name] ?? { ...FALLBACK_META, label: name ?? '???' };

const capitalize = (text) =>
  String(text ?? '')
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

/** Extrae el id numérico del final de una URL de la API (".../pokemon/25/" -> 25). */
const idFromUrl = (url) => Number(String(url ?? '').match(/\/(\d+)\/?$/)?.[1] ?? NaN);

/** Lista de tipos de la API -> tipos explorables, ya traducidos. */
export const normalizeTypes = (rawTypes) =>
  (Array.isArray(rawTypes) ? rawTypes : [])
    .filter((t) => t?.name && !HIDDEN_TYPES.includes(t.name))
    .map((t) => ({ name: t.name, ...typeMeta(t.name) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));

/**
 * Del detalle de un tipo saca los nombres de Pokémon "base".
 * Las formas alternativas (megas, gigamax, regionales...) tienen id > 10000:
 * se descartan para que la expedición no se llene de duplicados.
 */
export const pokemonNamesFromType = (rawType) =>
  (Array.isArray(rawType?.pokemon) ? rawType.pokemon : [])
    .map((entry) => ({ name: entry?.pokemon?.name, id: idFromUrl(entry?.pokemon?.url) }))
    .filter(({ name, id }) => name && Number.isFinite(id) && id < 10000)
    .sort((a, b) => a.id - b.id)
    .map(({ name }) => name);

/** Pokémon crudo -> ficha de campo. Tolera campos que falten o vengan raros. */
export const normalizePokemon = (raw) => {
  const stats = (Array.isArray(raw?.stats) ? raw.stats : []).reduce((acc, s) => {
    const key = s?.stat?.name;
    if (key in STAT_LABELS) acc[key] = Number(s.base_stat) || 0;
    return acc;
  }, Object.fromEntries(Object.keys(STAT_LABELS).map((k) => [k, 0])));

  const types = (Array.isArray(raw?.types) ? raw.types : [])
    .toSorted((a, b) => (a?.slot ?? 0) - (b?.slot ?? 0))
    .map((t) => t?.type?.name)
    .filter(Boolean);

  return {
    id: Number(raw?.id) || 0,
    name: capitalize(raw?.name) || 'Desconocido',
    sprite: raw?.sprites?.artwork ?? raw?.sprites?.front_default ?? null,
    types: types.length ? types : ['unknown'],
    // La API da altura en decímetros y peso en hectogramos.
    heightM: (Number(raw?.height) || 0) / 10,
    weightKg: (Number(raw?.weight) || 0) / 10,
    abilities: (Array.isArray(raw?.abilities) ? raw.abilities : [])
      .filter((a) => a?.ability?.name)
      .map((a) => ({ name: capitalize(a.ability.name), hidden: Boolean(a.is_hidden) })),
    stats,
    total: Object.values(stats).reduce((sum, value) => sum + value, 0),
  };
};

export const statEntries = (stats) =>
  Object.entries(STAT_LABELS).map(([key, label]) => ({ key, label, value: stats?.[key] ?? 0 }));

/** Filtra por nombre (sin distinguir mayúsculas ni tildes) y ordena. No muta el array original. */
export const filterAndSort = (pokemon, { query = '', sortBy = 'id' } = {}) => {
  const normalize = (text) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  const needle = normalize(query);
  const sorter = SORTERS[sortBy]?.fn ?? SORTERS.id.fn;

  return pokemon.filter((p) => normalize(p.name).includes(needle)).toSorted(sorter);
};

/** Informe de la expedición: todo calculado con reduce en una sola pasada. */
export const buildReport = (pokemon, currentType) => {
  if (!pokemon.length) return null;

  const acc = pokemon.reduce(
    (r, p) => ({
      totalPower: r.totalPower + p.total,
      totalWeight: r.totalWeight + p.weightKg,
      strongest: p.total > r.strongest.total ? p : r.strongest,
      fastest: p.stats.speed > r.fastest.stats.speed ? p : r.fastest,
      heaviest: p.weightKg > r.heaviest.weightKg ? p : r.heaviest,
      companions: p.types
        .filter((t) => t !== currentType)
        .reduce((c, t) => ({ ...c, [t]: (c[t] ?? 0) + 1 }), r.companions),
    }),
    {
      totalPower: 0,
      totalWeight: 0,
      strongest: pokemon[0],
      fastest: pokemon[0],
      heaviest: pokemon[0],
      companions: {},
    },
  );

  const [topCompanion] = Object.entries(acc.companions).sort(([, a], [, b]) => b - a);

  return {
    count: pokemon.length,
    avgPower: Math.round(acc.totalPower / pokemon.length),
    totalWeight: Math.round(acc.totalWeight * 10) / 10,
    strongest: acc.strongest,
    fastest: acc.fastest,
    heaviest: acc.heaviest,
    pureCount: pokemon.filter((p) => p.types.length === 1).length,
    topCompanion: topCompanion ? { type: topCompanion[0], count: topCompanion[1] } : null,
  };
};
