export default function Resultado({ puntos, total, onReiniciar }) {
  // Mensaje derivado del porcentaje de aciertos, no es estado
  const porcentaje = (puntos / total) * 100;

  let mensaje;
  if (porcentaje === 100) {
    mensaje = "¡Perfecto! Eres un crack de React 🏆";
  } else if (porcentaje >= 50) {
    mensaje = "¡Bien hecho! Vas por buen camino 👍";
  } else {
    mensaje = "Toca repasar un poco más 📚";
  }

  return (
    <div>
      <h2>Resultado</h2>
      <p>
        {puntos} de {total} aciertos
      </p>
      <p>{mensaje}</p>
      <button onClick={onReiniciar}>Jugar otra vez</button>
    </div>
  );
}
