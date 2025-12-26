import { createRoot } from "react-dom/client";
import { NeynarContextProvider, MiniAppProvider } from "@neynar/react";
import App from "./App.tsx";
import { FarcasterProvider } from "./contexts/FarcasterContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <NeynarContextProvider
    settings={{
      clientId: "c508ca87-29d3-48b1-b2cd-5e639edb4b32",
    }}
  >
    <MiniAppProvider>
      <FarcasterProvider>
        <App />
      </FarcasterProvider>
    </MiniAppProvider>
  </NeynarContextProvider>
);
