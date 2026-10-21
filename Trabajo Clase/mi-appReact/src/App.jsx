import Boton from "./components/button.jsx";
import Saludo from "./components/saludo.jsx";
import Aplausometro from "../Aplausometro/Aplausometro.jsx";

export default function App() {
  return (
    <>
      <Boton />
      <Saludo nombre="Alberto" apellido="García" />
      <Aplausometro />
    </>
  )
}