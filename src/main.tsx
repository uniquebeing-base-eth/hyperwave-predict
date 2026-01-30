

import { createRoot } from "react-dom/client";
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from "./App.tsx";
import { FarcasterProvider } from "./contexts/FarcasterContext";
import { wagmiConfig } from "./lib/wagmiConfig";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <FarcasterProvider>
        <App />
      </FarcasterProvider>
    </QueryClientProvider>
  </WagmiProvider>
);
