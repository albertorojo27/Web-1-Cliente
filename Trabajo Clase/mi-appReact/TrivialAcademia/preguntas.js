export const PREGUNTAS = [
  {
    id: "q1",
    texto: "¿Qué hook añade memoria a un componente?",
    opciones: ["useEffect", "useState", "useRef", "useContext"],
    correcta: 1,
  },
  {
    id: "q2",
    texto: "¿Qué prop necesita cada elemento de una lista renderizada con map?",
    opciones: ["id", "index", "key", "ref"],
    correcta: 2,
  },
  {
    id: "q3",
    texto: "¿Cómo se actualiza correctamente un array guardado en el estado?",
    opciones: [
      "Con push sobre el array original",
      "Asignando directamente arr[0] = valor",
      "Creando un array nuevo y pasándoselo al setter",
      "No se puede guardar un array en el estado",
    ],
    correcta: 2,
  },
  {
    id: "q4",
    texto: "¿Qué devuelve un componente de React?",
    opciones: ["Un string HTML", "JSX", "Un objeto del DOM", "Una promesa"],
    correcta: 1,
  },
];
