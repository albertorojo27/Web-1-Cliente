const intento = document.querySelector('#intento');
const probar = document.querySelector('#probar');
const respuesta = document.querySelector('#respuesta');
const intentosElement = document.querySelector('#intentos');

let secreto = Math.floor(Math.random() * 100) + 1;
let intentos = 0;

console.log('Psst... el secreto es:', secreto);

probar.addEventListener('click', () => {
  const valor = intento.value.trim();

  if (valor === '') {
    respuesta.textContent = 'Debes introducir un número antes de intentar adivinar.';
    respuesta.style.color = '#b35b00';
    return;
  }

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    respuesta.textContent = 'Eso no es un número válido.';
    respuesta.style.color = '#b35b00';
    return;
  }

  if (numero < 1 || numero > 100) {
    respuesta.textContent = 'El número debe estar entre 1 y 100.';
    respuesta.style.color = '#b35b00';
    return;
  }

  intentos += 1;
  intentosElement.textContent = String(intentos);

  if (numero === secreto) {
    respuesta.textContent = `¡Correcto! Has dicho: ${numero}. El oráculo ha elegido ${secreto}. ¡Has ganado!`;
    respuesta.style.color = '#1d8d5b';
    probar.disabled = true;
    intento.disabled = true;
    return;
  }

  if (numero < secreto) {
    respuesta.textContent = `Has dicho: ${numero}. Demasiado bajo. El oráculo te sugiere un número mayor.`;
  } else {
    respuesta.textContent = `Has dicho: ${numero}. Demasiado alto. El oráculo te sugiere un número menor.`;
  }

  respuesta.style.color = '#294e73';
  intento.value = '';
  intento.focus();
});

intento.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    probar.click();
  }
});
