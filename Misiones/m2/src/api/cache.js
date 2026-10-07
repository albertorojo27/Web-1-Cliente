// Caché en localStorage con caducidad (TTL).
// Todas las lecturas/escrituras van en try/catch: en modo privado o con la
// cuota llena localStorage puede lanzar, y la app debe seguir funcionando sin caché.

const PREFIX = 'async-odyssey:';
const DEFAULT_TTL = 1000 * 60 * 60 * 24; // 24 horas

export function readCache(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (!entry || typeof entry.expires !== 'number' || Date.now() > entry.expires) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function writeCache(key, data, ttl = DEFAULT_TTL) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, expires: Date.now() + ttl }));
  } catch {
    // Cuota llena: limpiamos nuestra caché y lo intentamos una única vez más.
    clearCache();
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify({ data, expires: Date.now() + ttl }));
    } catch {
      /* sin caché, no pasa nada */
    }
  }
}

export function clearCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* localStorage inaccesible */
  }
}

export function cacheSize() {
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).length;
  } catch {
    return 0;
  }
}
