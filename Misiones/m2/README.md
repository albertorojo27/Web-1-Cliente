# Async Odyssey: Bitácora de expedición

Misión M2 · Async Odyssey: aplicación hecha con **Vite** y JavaScript puro (módulos ES, sin frameworks) que consume la API pública **[PokeAPI](https://pokeapi.co)** con `fetch` + `async/await`.

> «El event loop no espera a nadie.»

Cada tipo Pokémon es un **bioma** (Fuego → Volcán, Fantasma → Torre abandonada, Agua → Arrecife…). Eliges una zona, la app "viaja" hasta ella y rellena la bitácora con las fichas de campo de los Pokémon avistados, además de un **informe de expedición** calculado con `reduce`.

## Cómo probarlo

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # build de producción en dist/
npm run preview   # sirve la build
```

1. Elige una zona (tipo).
2. Se descargan los primeros 20 Pokémon en paralelo; con **Explorar más** se cargan los siguientes.
3. Filtra por nombre (sin importar mayúsculas ni tildes) y ordena por poder total, velocidad, peso, nombre o número.
4. Para ver los estados de error, desconecta la red (DevTools → Network → Offline) y pulsa una zona que no esté en caché.

## Estructura del proyecto

```
m2/
├── index.html              # Estructura semántica y contenedores
├── package.json            # Scripts dev/build/preview y Vite como devDependency
├── public/
│   └── unknown.svg         # Favicon y sprite de reserva
└── src/
    ├── main.js             # Orquestador: estado, eventos y flujo de carga
    ├── style.css           # Estilos (variables CSS, modo oscuro automático)
    ├── api/
    │   ├── pokeapi.js      # fetch + async/await, timeout, response.ok, errores
    │   └── cache.js        # Caché en localStorage con caducidad (BONUS)
    ├── logic/
    │   └── transform.js    # Funciones puras: map / filter / reduce / sort
    └── ui/
        └── render.js       # Pintado en el DOM y estados de carga/error/vacío
```

Cada módulo tiene una responsabilidad: `api/` es el único que hace `fetch`, `logic/` no conoce ni la red ni el DOM, `ui/` solo pinta lo que recibe y `main.js` los conecta.

## Qué cubre de la misión

### Asincronía
- `fetchJSON()` usa `async/await` dentro de `try/catch/finally`, comprueba `response.ok` y traduce cada fallo a un `ApiError` con un mensaje claro para el usuario (404, 5xx, sin red, timeout, JSON corrupto, respuesta vacía).
- **Timeout** de 8 s con `AbortController`.
- Los Pokémon de una página se piden **en paralelo** con `Promise.allSettled`: si falla uno, se muestran los demás y un aviso con cuántos se perdieron.
- **Condición de carrera controlada**: cada expedición tiene un id. Si cambias de zona mientras otra se está cargando, las respuestas antiguas se descartan al llegar.
- Estados visibles: esqueletos animados mientras carga, panel de error con botón **Reintentar**, y mensajes de "zona desierta" o "sin resultados".

### Transformación de datos
Todo en [`src/logic/transform.js`](src/logic/transform.js), sin bucles `for`:
- `normalizeTypes`: `filter` (descarta `unknown`/`shadow`/`stellar`) → `map` (traducción y bioma) → `sort`.
- `pokemonNamesFromType`: `map` → `filter` (quita formas alternativas con id > 10000) → `sort` → `map`.
- `normalizePokemon`: `reduce` para convertir el array de stats en un objeto y para el poder total, `map`/`filter` para tipos y habilidades.
- `filterAndSort`: `filter` + `toSorted` (no muta el array original).
- `buildReport`: un `reduce` que en una sola pasada calcula poder medio, el más fuerte, el más veloz, el más pesado, la carga total y el tipo acompañante más frecuente.

### Robustez
- Todo acceso a datos de la API usa `?.`, `??` y `Array.isArray`: un Pokémon sin stats, sin sprite o sin tipos se pinta con valores por defecto en vez de romper la app.
- Si una imagen falla al cargar, se sustituye por un sprite de reserva.
- Todo el texto se inserta con `textContent`, nunca `innerHTML`.
- Probado con: sin red, error 500, cuerpo que no es JSON, respuesta `{}` vacía y búsqueda sin coincidencias.

## ★ Bonus: caché en localStorage

[`src/api/cache.js`](src/api/cache.js) guarda cada respuesta bajo la clave de su ruta (`async-odyssey:/pokemon/gengar`) con una caducidad de 24 horas. `fetchJSON` mira primero en la caché y solo va a la red si no encuentra nada válido.

- Antes de guardar, la respuesta se **recorta** (`slim`): un Pokémon completo de PokeAPI ocupa cientos de KB por la lista de movimientos, y en pocas zonas llenaría los ~5 MB de localStorage. Recortado ocupa unos 2 KB.
- No se cachean respuestas vacías (`cacheIf`), así un fallo puntual no se queda guardado 24 horas.
- Si `localStorage` no está disponible (modo privado) o se llena, la app sigue funcionando sin caché.
- La barra superior muestra cuántas peticiones fueron a red y cuántas salieron de caché, y el botón **Vaciar caché** la limpia.

## Uso de IA

Esta misión la desarrollé con **Claude Code** (modelo Claude Opus 5.5) dentro de VS Code, en modo agente. Le pasé el enunciado completo de la misión con la rúbrica, cuando lo hizo por primera vez revise todo y le dije como queria que funcionase por ejemplo le dije que queria que todas las llamadas usasen fetch y await  que sino lo usaba que modificase el codigo. Basicamente le he ido guiando para que termine siendo como yo quiero.

Cómo se verificó:
- Las funciones de `transform.js` se ejecutaron contra la API real y contra entradas rotas (`{}`, `null`, arrays vacíos) para comprobar que no lanzan.
- Se hizo una prueba de extremo a extremo de la build con jsdom: carga de zonas, expedición, búsqueda, informe, paginación y los casos de sin red, error 500, JSON inválido y respuesta vacía.
- Durante esas pruebas aparecieron dos problemas que se corrigieron: guardar los Pokémon completos habría llenado localStorage (de ahí el recorte con `slim`) y una respuesta vacía se quedaba cacheada (de ahí `cacheIf`).

## Autopsia

**1. Recortar la respuesta antes de cachearla.** La caché guarda solo los campos que la app usa. La alternativa era guardar la respuesta tal cual, que es más simple y no obliga a mantener una lista de campos. La descarté porque la respuesta de `/pokemon/{id}` incluye cientos de movimientos y versiones de juego: con dos o tres zonas exploradas se llenaba el límite de localStorage y la caché dejaba de funcionar justo cuando más falta hacía.

**2. `Promise.allSettled` en lugar de `Promise.all`.** Cada página son 20 peticiones en paralelo. Con `Promise.all`, un solo Pokémon que fallara (un timeout, un 500 puntual) rechazaría la promesa entera y el usuario vería un error en lugar de 19 fichas válidas. Con `allSettled` se pintan los que llegaron y se avisa de cuántos faltan. La alternativa era hacer las peticiones una a una con `await` dentro de un bucle, que da el mismo control de errores, pero multiplica por 20 el tiempo de espera.

## Historial de Git

```
1. chore(m2): Fase 1 - Proyecto Vite, package.json y estructura base
2. feat(m2): Fase 2 - Capa de API con fetch, async/await y cache en localStorage
3. feat(m2): Fase 3 - Transformacion de datos con map, filter y reduce
4. feat(m2): Fase 4 - Render en el DOM, estados de carga/error y orquestador
5. docs(m2): Fase 5 - README con declaracion de IA y autopsia
```
