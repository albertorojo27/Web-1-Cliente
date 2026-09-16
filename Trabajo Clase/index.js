const input = document.querySelector('#guessInput');
const button = document.querySelector('#guessButton');
const message = document.querySelector('#message');
const intentosElement = document.querySelector('#intentos');

let secreto = Math.floor(Math.random() * 100) + 1;
let intentos = 0;

console.log('Psst... el secreto es:', secreto);

button.addEventListener('click', () => {
  const valor = input.value.trim();

  if (valor === '') {
    message.textContent = 'Debes introducir un número antes de intentar adivinar.';
    message.style.color = '#b35b00';
    return;
  }

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    message.textContent = 'Eso no es un número válido.';
    message.style.color = '#b35b00';
    return;
  }

  if (numero < 1 || numero > 100) {
    message.textContent = 'El número debe estar entre 1 y 100.';
    message.style.color = '#b35b00';
    return;
  }

  intentos += 1;
  intentosElement.textContent = String(intentos);

  if (numero === secreto) {
    message.textContent = `¡Correcto! El oráculo ha elegido ${secreto}. Has ganado.`;
    message.style.color = '#1d8d5b';
    button.disabled = true;
    input.disabled = true;
    return;
  }

  if (numero < secreto) {
    message.textContent = 'Demasiado bajo. El oráculo te sugiere un número mayor.';
  } else {
    message.textContent = 'Demasiado alto. El oráculo te sugiere un número menor.';
  }

  message.style.color = '#294e73';
  input.value = '';
  input.focus();
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    button.click();
  }
});
