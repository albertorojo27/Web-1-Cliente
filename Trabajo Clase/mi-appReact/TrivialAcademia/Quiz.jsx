import { useState } from "react";
import { PREGUNTAS } from "./preguntas.js";
import Resultado from "./Resultado.jsx";

export default function Quiz() {
  const [indice, setIndice] = useState(0);
  const [puntos, setPuntos] = useState(0);
  // Índice de la opción elegida en la pregunta actual (null = aún sin responder)
  const [seleccion, setSeleccion] = useState(null);

  function reiniciar() {
    setIndice(0);
    setPuntos(0);
    setSeleccion(null);
  }

  // Pantalla final: se deriva del índice, no hace falta otro estado
  if (indice >= PREGUNTAS.length) {
    return (
      <Resultado
        puntos={puntos}
        total={PREGUNTAS.length}
        onReiniciar={reiniciar}
      />
    );
  }

  const pregunta = PREGUNTAS[indice];

  function responder(i) {
    if (seleccion !== null) return; // ya se ha respondido
    setSeleccion(i);
    if (i === pregunta.correcta) {
      setPuntos(puntos + 1);
    }
  }

  function siguiente() {
    setSeleccion(null);
    setIndice(indice + 1);
  }

  // Verde la correcta, roja la elegida si es incorrecta (solo tras responder)
  function claseOpcion(i) {
    if (seleccion === null) return undefined;
    if (i === pregunta.correcta) return "correcta";
    if (i === seleccion) return "incorrecta";
    return undefined;
  }

  return (
    <div>
      <h2>Trivial de la Academia</h2>
      <p>
        Pregunta {indice + 1} de {PREGUNTAS.length} · Puntos: {puntos}
      </p>
      <h3>{pregunta.texto}</h3>
      <ul className="opciones">
        {pregunta.opciones.map((opcion, i) => (
          <li key={opcion}>
            <button
              onClick={() => responder(i)}
              disabled={seleccion !== null}
              className={claseOpcion(i)}
            >
              {opcion}
            </button>
          </li>
        ))}
      </ul>
      {seleccion !== null && (
        <button onClick={siguiente}>
          {indice + 1 === PREGUNTAS.length ? "Ver resultado" : "Siguiente"}
        </button>
      )}
    </div>
  );
}
