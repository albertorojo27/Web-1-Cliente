/**
 * CYBER-GRID 2026 // BREACH PROTOCOL
 * Vanilla JavaScript (ES6+) - Sin librerías ni frameworks.
 * 
 * FASE 2: Mecánica de selección alternada (Fila <-> Columna) y delegación
 * de eventos única en el contenedor de la matriz.
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
let timeRemaining = GAME_DURATION_SECONDS;
let timerInterval = null;

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
 * Renderiza las secuencias objetivo en el panel derecho.
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

    target.sequence.forEach((code) => {
      const codeSpan = document.createElement('span');
      codeSpan.className = 'seq-code';
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
    // Clic fuera del eje permitido: ignorar
    return;
  }

  // 1. Registrar celda usada
  usedCells.add(cellKey);

  // 2. Extraer el código e ingresarlo en el buffer
  const chosenCode = gridData[row][col];
  buffer.push(chosenCode);

  // 3. Alternar la dirección activa y actualizar la coordenada permitida
  if (activeDirection === 'row') {
    activeDirection = 'col';
    activeCoord = col;
  } else {
    activeDirection = 'row';
    activeCoord = row;
  }

  // 4. Actualizar vista
  renderMatrix();
  renderBuffer();
};

/**
 * Inicia una nueva partida configurando el estado y la interfaz.
 */
const startBreachGame = () => {
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
};

/**
 * Inicialización al cargar el DOM.
 */
const initPhase2 = () => {
  generateGridAndSequences();
  renderMatrix();
  renderBuffer();
  renderSequences();

  // Delegación de eventos en el contenedor de la matriz
  matrixElement.addEventListener('click', handleCellClick);
  btnStart.addEventListener('click', startBreachGame);
};

document.addEventListener('DOMContentLoaded', initPhase2);

