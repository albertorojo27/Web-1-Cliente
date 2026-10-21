import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../estilos.css";
import Boton from "./Boton.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <div className="tarjeta">
      <Boton />
    </div>
  </StrictMode>,
);
