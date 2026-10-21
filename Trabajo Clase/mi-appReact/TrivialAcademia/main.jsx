import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../estilos.css";
import Quiz from "./Quiz.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <div className="tarjeta">
      <Quiz />
    </div>
  </StrictMode>,
);
