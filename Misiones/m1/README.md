# Breach Protocol: El Despertar del DOM

Misión M1 · El Despertar del DOM — Minijuego de hacking interactivo en JavaScript puro, sin frameworks ni librerías.

## Cómo Probarlo

Abre index.html en el navegador (o con Live Server). Pulsa INICIAR_BREACH y elige códigos hexadecimales en la matriz 5x5 respetando la alternancia fila/columna. Tienes 30 segundos para resolver las dos secuencias objetivo.

Tecla secreta: presiona `N` para activar el modo nocturno.

## Estructura del Proyecto

```
.
├── index.html          # Estructura semántica HTML5
├── index.css           # Estilos con variables CSS y efectos retro
├── index.js            # Lógica del juego
└── README.md           # Este archivo
```

## Uso de IA

Construí este proyecto con Antigravity en modo agente. La idea, las reglas del juego y las decisiones de diseño las fui marcando yo a través de prompts: le indicaba cómo quería que funcionara cada mecánica y el agente iba escribiendo el código fase a fase mientras yo revisaba y ajustaba el rumbo.

Algunos de los prompts que usé para guiar el desarrollo:

- "Necesito que la generación del tablero nunca cree un puzzle imposible de resolver con las reglas de alternancia. Piensa cómo garantizarlo antes de escribir nada."
- "No quiero 25 listeners en las celdas. Móntalo con un solo listener en el contenedor y detecta la celda con closest()."
- "Para los códigos de las celdas usa textContent, no innerHTML. No quiero riesgo de inyección."

Verifiqué lo que iba generando jugando partidas completas y probando los casos límite: clic en una celda fuera de turno, buffer lleno sin resolver, secuencia ya imposible de completar, y que el temporizador llegara justo a cero. Cuando algo no encajaba con lo que buscaba, corregía el prompt y volvía a iterar.

## Autopsia

**1. Guardar el estado en memoria en lugar de leerlo del DOM.** El estado del juego (dirección activa, celdas usadas, buffer y secuencias) vive en variables de JavaScript, y el DOM solo lo refleja. La alternativa era averiguar qué fila o columna está activa leyendo las clases CSS del HTML. La descarté porque acopla la lógica al diseño: cualquier retoque visual podría romper el juego, y consultar el DOM constantemente es más lento y frágil que mirar una variable.

**2. Delegación de eventos en vez de un listener por celda.** Hay un único listener en el contenedor de la matriz que identifica la celda pulsada con `closest()`. La alternativa era poner 25 listeners, uno por celda. La descarté porque al regenerar el tablero en cada partida habría que quitarlos y volverlos a crear, y ahí es donde aparecen los listeners duplicados y las fugas de memoria. Con un solo listener el problema desaparece.

## Historial de Git

```
1. feat(m1): Fase 1 - Generacion dinamica del tablero y secuencias en el DOM
2. feat(m1): Fase 2 - Delegacion de eventos y mecanica de seleccion alternada
3. feat(m1): Fase 3 - Buffer de memoria y algoritmo de validacion de secuencias
4. feat(m1): Fase 4 - Temporizador, gestion de estados de partida y modal de resultado
5. feat(m1): Fase 5 - Modo nocturno secreto, README con Autopsia y pulido final
```

## Bonus: Modo Nocturno

Presiona `N` en cualquier momento para activar o desactivar el modo nocturno. Está resuelto con un listener de `keydown` sobre `document` que hace un `toggle` de la clase `nocturnal` sobre el `body`; esa clase redefine las variables CSS con tonos mucho más oscuros y azulados.
