import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../estilos.css";
import Aplausometro from "./Aplausometro.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <div className="tarjeta">
      <Aplausometro />
    </div>
  </StrictMode>,
);
