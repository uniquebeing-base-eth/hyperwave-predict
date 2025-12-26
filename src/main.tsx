import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { FarcasterProvider } from "./contexts/FarcasterContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <FarcasterProvider>
    <App />
  </FarcasterProvider>
);
