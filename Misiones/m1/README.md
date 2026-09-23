# Cyber-Grid: Breach Protocol

Misión M1 · El Despertar del DOM — Web Development I.

## Cómo probarlo
Abre `index.html` en el navegador (directamente o usando Live Server).
1. Pulsa **`INICIAR_BREACH`**: dispones de **30 segundos** para infiltrarte en el mainframe antes de que el cortafuegos bloquee la terminal.
2. Selecciona códigos en la matriz de 5x5 respetando la regla direccional: el primer movimiento se realiza en la **fila activa**, el siguiente en la **columna** de la celda elegida, luego en la **fila**, alternando en cada turno.
3. Cada código se almacena en el **buffer de memoria** (máximo 4 ranuras). Debes completar las **secuencias objetivo** de forma contigua antes de agotar el espacio o el tiempo.
4. **Tecla secreta (Bonus M1):** Pulsa la tecla <kbd>n</kbd> en cualquier momento para alternar el modo nocturno profundo (*nocturnal matrix*).
5. **Atajo de accesibilidad:** Pulsa <kbd>Escape</kbd> para cerrar el modal de diagnóstico y fin de partida.

---

## Uso de IA
Usé **Gemini CLI / Antigravity** en VS Code como pareja de programación (*pair programming*) de forma incremental fase a fase.

- **Ejemplo de prompt real:**
  > *"Voy a construir un minijuego de hacking interactivo (Breach Protocol) con HTML5 semántico, CSS y JavaScript ES6+ puro, sin frameworks ni librerías. Antes de escribir código: propón 4 o 5 fases pequeñas para construirlo, cada una con un entregable visual y funcional, y especifica qué estado necesito guardar en memoria de JavaScript y por qué. No escribas todavía ningún archivo."*
- **Cómo verifiqué lo generado:**
  - Jugué partidas completas comprobando el ciclo de vida completo: victoria al resolver todas las secuencias, victoria parcial, derrota por desbordamiento de buffer (*buffer overflow*) y derrota por tiempo agotado (*timeout* a los 30.00s exactos).
  - Verifiqué casos límite en la matriz: intentos de clic en filas o columnas inactivas, clics repetidos en celdas ya consumidas, y comprobación de que el temporizador se detiene correctamente con `clearInterval` sin dejar procesos zombi.
  - Inspeccioné que no existiera ninguna vulnerabilidad XSS, auditando que toda actualización dinámica del DOM se realice mediante `textContent` y `replaceChildren()`, sin rastro de `innerHTML`.
- **Escribí y ajusté a mano:**
  - El algoritmo de generación procedural del tablero con trazado de ruta garantizada de 4 pasos, asegurando que la matriz siempre tenga al menos una solución matemática válida.
  - La síntesis de efectos de audio retro mediante la API nativa `AudioContext` (Web Audio API), evitando dependencias externas y manejando el bloqueo de autoplay del navegador con un bloque `try/catch`.
  - La integración de los atajos de teclado globales en `document` para alternar la clase `nocturnal` en `document.body` y cerrar el modal con `Escape`.

---

## Autopsia
1. **Estado centralizado en memoria vs. lectura directa desde el DOM:**
   - **Decisión:** Almaceno el estado completo de la partida (`gridData`, `usedCells`, `activeDirection`, `activeCoord`, `buffer`, `targetSequences`, `gameState`) en variables y estructuras de datos nativas de JavaScript (`Array`, `Set`, `number`, `string`).
   - **Justificación:** El DOM debe funcionar exclusivamente como una proyección visual de la aplicación (la vista), nunca como la fuente única de verdad (*single source of truth*).
   - **Alternativa descartada:** Descarté deducir el estado consultando clases CSS del DOM (como leer si una celda tiene `.empty` o buscar la fila activa mediante `document.querySelectorAll('.highlight-active')`). Dicho enfoque acopla estrechamente la lógica de negocio al diseño visual, degrada el rendimiento al forzar continuos *reflows* y *repaints*, y hace que cualquier cambio estético rompa el funcionamiento del juego.
2. **Delegación de eventos vs. múltiples listeners individuales:**
   - **Decisión:** Utilizo un único listener en el contenedor de la matriz (`#code-matrix`) aprovechando la propagación de eventos (*event bubbling*) mediante `event.target.closest('.matrix-cell')`.
   - **Justificación:** Optimiza el uso de memoria y asegura un manejo de eventos limpio y centralizado.
   - **Alternativa descartada:** Descarté registrar 25 `addEventListener('click', ...)` individuales (uno por cada celda). Esta alternativa obligaría a desvincular y volver a asociar los 25 listeners cada vez que se regenera el tablero o se reinicia la partida, aumentando la complejidad, el consumo de memoria y el riesgo de listeners duplicados o fugas de memoria (*memory leaks*).

---

## Preguntas de Defensa Oral Preparadas
1. **¿Por qué se utiliza `Set` para `usedCells` en lugar de un `Array`?**
   - *Respuesta:* Porque `Set.prototype.has()` ofrece una complejidad algorítmica de búsqueda $O(1)$ en tiempo constante frente a $O(n)$ de `Array.prototype.includes()`, garantizando validaciones instantáneas al verificar coordenadas de celdas consumidas en cada interacción.
2. **¿Cómo se asegura que no existan desfases en el temporizador si el hilo principal de JavaScript se satura?**
   - *Respuesta:* En lugar de decrementar un contador manual en cada tic de `setInterval`, se calcula la diferencia contra una marca de tiempo absoluta en el futuro (`endTime = Date.now() + duration`), asegurando que el tiempo restante sea matemáticamente exacto independientemente de posibles retardos en la cola de tareas (*event loop*).
3. **¿Cómo se previene el riesgo de ataques XSS al renderizar los datos del juego?**
   - *Respuesta:* Se prescinde totalmente de `innerHTML` con cadenas interpoladas. Se crean nodos explícitos con `document.createElement()`, se rellenan mediante la propiedad segura `textContent` y se montan en el árbol utilizando métodos modernos y atómicos como `replaceChildren()` y `append()`.
