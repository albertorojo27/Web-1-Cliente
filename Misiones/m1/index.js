/**
 * CYBER-GRID 2026 // BREACH PROTOCOL
 * Vanilla JavaScript (ES6+) - Sin librerías ni frameworks.
 * 
 * FASE 5: Modo nocturno secreto (tecla "n"), atajos de accesibilidad,
 * efectos de audio sintético retro (Web Audio API) y finalización.
 */

// --- CONSTANTES DE CONFIGURACIÓN ---
const GRID_SIZE = 5;
const BUFFER_CAPACITY = 4;
const GAME_DURATION_SECONDS = 30;
const HEX_CODES = ['1C', '55', 'BD', 'E9', '7A', 'FF'];

// --- CACHÉ DE ELEMENTOS DEL DOM ---
const matrixElement = document.querySelector('#code-matrix');
const bufferDisplayElement = document.querySelector('#buffer-display');
const bufferUsageElement = document.querySelector('#buffer-usage');
const sequencesDisplayElement = document.querySelector('#sequences-display');
const timerDisplayElement = document.querySelector('#timer-display');
const systemStatusElement = document.querySelector('#system-status');
const btnStart = document.querySelector('#btn-start');
const btnReset = document.querySelector('#btn-reset');
const gameOverScreen = document.querySelector('#game-over-screen');
const gameResultTitle = document.querySelector('#game-result-title');
const gameResultSub = document.querySelector('#game-result-sub');
const btnRestart = document.querySelector('#btn-restart');

// --- ESTADO GLOBAL DE LA APLICACIÓN ---
let gridData = [];
let usedCells = new Set();
let activeDirection = 'row'; // Alterna entre 'row' y 'col'
let activeCoord = 0;         // Índice de la fila o columna activa
let buffer = [];
let targetSequences = [];
let gameState = 'IDLE';      // 'IDLE' | 'PLAYING' | 'VICTORY' | 'FAILURE'
let timerInterval = null;
let endTime = 0;

// --- EFECTOS DE AUDIO SINTÉTICO (Web Audio API nativo) ---
let audioCtx = null;

const playBleep = (freq = 600, duration = 0.08, type = 'sine') => {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!audioCtx) {
      return;
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Si el navegador bloquea audio sin interacción, se silencia de forma transparente
  }
};

// --- FUNCIONES DE GENERACIÓN Y LÓGICA DE DATOS ---

/**
 * Obtiene un código hexadecimal aleatorio de la lista disponible.
 * @returns {string}
 */
const getRandomHexCode = () => {
  const index = Math.floor(Math.random() * HEX_CODES.length);
  return HEX_CODES[index];
};

/**
 * Genera la matriz de 5x5 con códigos aleatorios.
 * Simula una ruta válida de 4 movimientos alternados para garantizar que
 * al menos una secuencia objetivo sea matemáticamente resoluble.
 */
const generateGridAndSequences = () => {
  // 1. Rellenar tablero con códigos aleatorios
  gridData = [];
  for (let r = 0; r < GRID_SIZE; r += 1) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c += 1) {
      row.push(getRandomHexCode());
    }
    gridData.push(row);
  }

  // 2. Trazar una ruta resoluble válida (fila 0 -> col -> fila -> col)
  const pathCodes = [];
  const startCol = Math.floor(Math.random() * GRID_SIZE);
  pathCodes.push(gridData[0][startCol]);

  // Selección en la misma columna (fila diferente)
  let nextRow = Math.floor(Math.random() * GRID_SIZE);
  while (nextRow === 0) {
    nextRow = Math.floor(Math.random() * GRID_SIZE);
  }
  pathCodes.push(gridData[nextRow][startCol]);

  // Selección en la misma fila (columna diferente)
  let nextCol = Math.floor(Math.random() * GRID_SIZE);
  while (nextCol === startCol) {
    nextCol = Math.floor(Math.random() * GRID_SIZE);
  }
  pathCodes.push(gridData[nextRow][nextCol]);

  // Selección en la misma columna
  let finalRow = Math.floor(Math.random() * GRID_SIZE);
  while (finalRow === nextRow) {
    finalRow = Math.floor(Math.random() * GRID_SIZE);
  }
  pathCodes.push(gridData[finalRow][nextCol]);

  // 3. Crear 2 secuencias objetivo basadas en la ruta generada
  targetSequences = [
    {
      id: 1,
      sequence: pathCodes.slice(0, 2), // Longitud 2
      solved: false,
      missed: false,
    },
    {
      id: 2,
      sequence: pathCodes.slice(1, 4), // Longitud 3
      solved: false,
      missed: false,
    },
  ];
};

// --- ALGORITMO DE COMPROBACIÓN DE SECUENCIAS ---

/**
 * Calcula la longitud del mayor prefijo de la secuencia que coincide
 * con un sufijo del buffer actual.
 * @param {string[]} sequence
 * @returns {number}
 */
const getMatchingPrefixLength = (sequence) => {
  const maxPossible = Math.min(buffer.length, sequence.length);
  for (let len = maxPossible; len > 0; len -= 1) {
    const bufSuffix = buffer.slice(buffer.length - len);
    const seqPrefix = sequence.slice(0, len);
    const matches = bufSuffix.every((code, i) => code === seqPrefix[i]);
    if (matches) {
      return len;
    }
  }
  return 0;
};

/**
 * Evalúa las secuencias objetivo contra el contenido actual del buffer:
 * 1. Marca como 'solved' si la secuencia completa aparece como subsecuencia contigua.
 * 2. Marca como 'missed' si los huecos restantes del buffer no bastan para completarla.
 */
const evaluateSequences = () => {
  const remainingSlots = BUFFER_CAPACITY - buffer.length;

  targetSequences.forEach((target) => {
    if (target.solved) {
      return;
    }

    const seqLen = target.sequence.length;

    // Comprobar si ya existe como subsecuencia contigua en el buffer
    let isMatched = false;
    for (let i = 0; i <= buffer.length - seqLen; i += 1) {
      const slice = buffer.slice(i, i + seqLen);
      if (slice.every((code, idx) => code === target.sequence[idx])) {
        isMatched = true;
        break;
      }
    }

    if (isMatched) {
      target.solved = true;
      target.missed = false;
      playBleep(880, 0.15, 'square');
      return;
    }

    // Si aún no está resuelta, evaluar si sigue siendo alcanzable
    const matchPrefixLen = getMatchingPrefixLength(target.sequence);
    const slotsNeeded = seqLen - matchPrefixLen;

    if (slotsNeeded > remainingSlots) {
      target.missed = true;
    }
  });

  renderSequences();
};

// --- GESTIÓN DEL TEMPORIZADOR Y FIN DE PARTIDA ---

/**
 * Detiene el temporizador activo.
 */
const stopTimer = () => {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

/**
 * Finaliza la partida, actualiza la UI y despliega el modal de resultado.
 * @param {'VICTORY' | 'FAILURE' | 'TIMEOUT'} reason
 */
const endGame = (reason) => {
  stopTimer();

  const solvedCount = targetSequences.filter((seq) => seq.solved).length;
  const isFullVictory = solvedCount === targetSequences.length;

  if (isFullVictory) {
    gameState = 'VICTORY';
    playBleep(587, 0.1, 'sine');
    setTimeout(() => playBleep(880, 0.25, 'triangle'), 120);

    updateSystemStatus('VICTORY', 'BREACH_SUCCESSFUL');
    gameResultTitle.textContent = 'BREACH_SUCCESSFUL';
    gameResultTitle.style.color = 'var(--cyber-green)';
    gameResultSub.textContent = `¡Mainframe infiltrado al 100%! Todas las secuencias (${solvedCount}/${targetSequences.length}) cargadas con éxito.`;
  } else if (solvedCount > 0) {
    gameState = 'VICTORY';
    playBleep(520, 0.2, 'sine');

    updateSystemStatus('VICTORY', 'PARTIAL_BREACH');
    gameResultTitle.textContent = 'PARTIAL_BREACH';
    gameResultTitle.style.color = 'var(--cyber-blue)';
    gameResultSub.textContent = `Infiltración parcial: ${solvedCount} de ${targetSequences.length} secuencias descifradas.`;
  } else {
    gameState = 'FAILURE';
    playBleep(140, 0.35, 'sawtooth');

    const statusText = reason === 'TIMEOUT' ? 'SECURITY_LOCKOUT' : 'BUFFER_OVERFLOW';
    const titleText = reason === 'TIMEOUT' ? 'CONNECTION_LOST' : 'ACCESS_DENIED';
    const descText = reason === 'TIMEOUT'
      ? 'El cortafuegos corporativo cerró la conexión por tiempo agotado.'
      : 'Capacidad de buffer excedida sin completar secuencias válidas.';

    updateSystemStatus('FAILURE', statusText);
    gameResultTitle.textContent = titleText;
    gameResultTitle.style.color = 'var(--cyber-red)';
    gameResultSub.textContent = descText;
  }

  btnStart.disabled = false;
  btnReset.disabled = true;

  // Desplegar modal de fin de partida
  gameOverScreen.classList.remove('hidden');

  // Re-renderizar matriz para deshabilitar celdas activas
  renderMatrix();
};

/**
 * Actualiza el temporizador en cada tic.
 */
const updateTimerTick = () => {
  const remainingMs = Math.max(0, endTime - Date.now());
  const seconds = (remainingMs / 1000).toFixed(2);
  timerDisplayElement.textContent = `${seconds}s`;

  if (remainingMs <= 0) {
    endGame('TIMEOUT');
  }
};

/**
 * Inicia el temporizador preciso sin desfase por retrasos de hilo.
 */
const startTimer = () => {
  stopTimer();
  endTime = Date.now() + GAME_DURATION_SECONDS * 1000;
  timerDisplayElement.textContent = `${GAME_DURATION_SECONDS.toFixed(2)}s`;
  timerInterval = setInterval(updateTimerTick, 50);
};

// --- RENDERIZADO EN EL DOM (SIN innerHTML vulnerable) ---

/**
 * Renderiza los 4 slots del buffer en el DOM.
 */
const renderBuffer = () => {
  bufferDisplayElement.replaceChildren();

  for (let i = 0; i < BUFFER_CAPACITY; i += 1) {
    const slot = document.createElement('div');
    slot.className = 'buffer-slot';

    if (i < buffer.length) {
      slot.textContent = buffer[i];
    } else {
      slot.classList.add('empty');
      slot.textContent = '[ ]';
    }

    bufferDisplayElement.append(slot);
  }

  bufferUsageElement.textContent = `${buffer.length} / ${BUFFER_CAPACITY} RANURAS`;
};

/**
 * Renderiza las secuencias objetivo en el panel derecho con feedback visual de coincidencias.
 */
const renderSequences = () => {
  sequencesDisplayElement.replaceChildren();

  targetSequences.forEach((target, index) => {
    const row = document.createElement('div');
    row.className = 'sequence-row';
    if (target.solved) {
      row.classList.add('completed');
    } else if (target.missed) {
      row.classList.add('failed');
    }

    const indexSpan = document.createElement('span');
    indexSpan.className = 'seq-index';
    indexSpan.textContent = String(index + 1).padStart(2, '0');

    const codesContainer = document.createElement('div');
    codesContainer.className = 'seq-codes';

    let matchedCount = 0;
    if (target.solved) {
      matchedCount = target.sequence.length;
    } else if (!target.missed) {
      matchedCount = getMatchingPrefixLength(target.sequence);
    }

    target.sequence.forEach((code, codeIdx) => {
      const codeSpan = document.createElement('span');
      codeSpan.className = 'seq-code';
      if (codeIdx < matchedCount) {
        codeSpan.classList.add('matched');
      }
      codeSpan.textContent = code;
      codesContainer.append(codeSpan);
    });

    const statusSpan = document.createElement('span');
    statusSpan.className = 'seq-status';
    if (target.solved) {
      statusSpan.classList.add('solved');
      statusSpan.textContent = '[RESUELTO]';
    } else if (target.missed) {
      statusSpan.classList.add('missed');
      statusSpan.textContent = '[FALLIDO]';
    } else {
      statusSpan.classList.add('pending');
      statusSpan.textContent = '[PENDIENTE]';
    }

    row.append(indexSpan, codesContainer, statusSpan);
    sequencesDisplayElement.append(row);
  });
};

/**
 * Renderiza la matriz 5x5 en el DOM y aplica los estilos según
 * la fila/columna activa y las celdas ya usadas.
 */
const renderMatrix = () => {
  matrixElement.replaceChildren();

  for (let r = 0; r < GRID_SIZE; r += 1) {
    for (let c = 0; c < GRID_SIZE; c += 1) {
      const cell = document.createElement('div');
      cell.className = 'matrix-cell';
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);

      const cellKey = `${r},${c}`;
      const isUsed = usedCells.has(cellKey);

      if (isUsed) {
        cell.classList.add('empty');
        cell.textContent = '--';
      } else {
        cell.textContent = gridData[r][c];

        if (gameState === 'PLAYING') {
          const isRowActive = activeDirection === 'row' && r === activeCoord;
          const isColActive = activeDirection === 'col' && c === activeCoord;

          if (isRowActive || isColActive) {
            cell.classList.add('highlight-active');
            cell.classList.add('highlight-hover-allowed');
          } else {
            cell.classList.add('disabled');
          }
        } else {
          // En estados no activos (IDLE o fin de juego), deshabilitar celdas
          cell.classList.add('disabled');
        }
      }

      matrixElement.append(cell);
    }
  }
};

/**
 * Actualiza el indicador visual de estado en el header.
 * @param {string} state
 * @param {string} text
 */
const updateSystemStatus = (state, text) => {
  systemStatusElement.className = `status-value ${state.toLowerCase()}`;
  systemStatusElement.textContent = text;
};

// --- CONTROL DE EVENTOS Y MECÁNICA DE MOVIMIENTO ---

/**
 * Maneja el clic en una celda de la matriz mediante delegación de eventos.
 * @param {MouseEvent} event
 */
const handleCellClick = (event) => {
  const cell = event.target.closest('.matrix-cell');
  if (!cell || gameState !== 'PLAYING') {
    return;
  }

  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  const cellKey = `${row},${col}`;

  // Verificar si la celda ya fue consumida
  if (usedCells.has(cellKey)) {
    return;
  }

  // Verificar si la celda pertenece a la guía direccional activa
  const isRowTurn = activeDirection === 'row' && row === activeCoord;
  const isColTurn = activeDirection === 'col' && col === activeCoord;

  if (!isRowTurn && !isColTurn) {
    playBleep(200, 0.05, 'sawtooth');
    return;
  }

  // 1. Sonido de pulsación correcta
  playBleep(650, 0.06, 'sine');

  // 2. Registrar celda usada
  usedCells.add(cellKey);

  // 3. Extraer el código e ingresarlo en el buffer
  const chosenCode = gridData[row][col];
  buffer.push(chosenCode);

  // 4. Alternar la dirección activa y actualizar la coordenada permitida
  if (activeDirection === 'row') {
    activeDirection = 'col';
    activeCoord = col;
  } else {
    activeDirection = 'row';
    activeCoord = row;
  }

  // 5. Evaluar secuencias con el nuevo código en el buffer
  evaluateSequences();

  // 6. Comprobar si se ha alcanzado condición de fin de partida
  const allSolved = targetSequences.every((seq) => seq.solved);
  const bufferFull = buffer.length >= BUFFER_CAPACITY;

  if (allSolved) {
    renderMatrix();
    renderBuffer();
    endGame('VICTORY');
    return;
  }

  if (bufferFull) {
    renderMatrix();
    renderBuffer();
    endGame('FAILURE');
    return;
  }

  // 7. Actualizar vistas en juego normal
  renderMatrix();
  renderBuffer();
};

/**
 * Reinicia la terminal a su estado inicial inactivo.
 */
const resetBreachGame = () => {
  stopTimer();
  gameOverScreen.classList.add('hidden');

  usedCells.clear();
  buffer = [];
  activeDirection = 'row';
  activeCoord = 0;
  gameState = 'IDLE';

  timerDisplayElement.textContent = `${GAME_DURATION_SECONDS.toFixed(2)}s`;
  updateSystemStatus('IDLE', 'IDLE_STATE');

  btnStart.disabled = false;
  btnReset.disabled = true;

  generateGridAndSequences();
  renderMatrix();
  renderBuffer();
  renderSequences();
};

/**
 * Inicia una nueva partida configurando el estado, temporizador y la interfaz.
 */
const startBreachGame = () => {
  gameOverScreen.classList.add('hidden');
  generateGridAndSequences();
  usedCells.clear();
  buffer = [];
  activeDirection = 'row';
  activeCoord = 0;
  gameState = 'PLAYING';

  updateSystemStatus('PLAYING', 'BREACHING...');
  btnStart.disabled = true;
  btnReset.disabled = false;

  renderMatrix();
  renderBuffer();
  renderSequences();
  startTimer();
};

/**
 * Inicialización al cargar el DOM.
 */
const initPhase5 = () => {
  generateGridAndSequences();
  renderMatrix();
  renderBuffer();
  renderSequences();

  // Delegación de eventos en el contenedor de la matriz
  matrixElement.addEventListener('click', handleCellClick);

  // Botones de acción
  btnStart.addEventListener('click', startBreachGame);
  btnReset.addEventListener('click', resetBreachGame);
  btnRestart.addEventListener('click', () => {
    startBreachGame();
  });

  // BONUS M1: Atajo de teclado secreto "n" para alternar modo nocturno profundo
  // y tecla Escape para cerrar modal
  document.addEventListener('keydown', (event) => {
    if (event.key === 'n' || event.key === 'N') {
      document.body.classList.toggle('nocturnal');
      playBleep(440, 0.05, 'sine');
    }

    if (event.key === 'Escape') {
      if (!gameOverScreen.classList.contains('hidden')) {
        gameOverScreen.classList.add('hidden');
      }
    }
  });
};

document.addEventListener('DOMContentLoaded', initPhase5);

