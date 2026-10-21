import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../estilos.css";
import Saludo from "./Saludo.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <div className="tarjeta">
      <Saludo nombre="Alberto" apellido="García" />
    </div>
  </StrictMode>,
);
