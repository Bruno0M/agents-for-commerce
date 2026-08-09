import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@/components/ui/tooltip.tsx"
import { TransportGate } from "@/transport/TransportGate.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        {/* A escolha do transporte acontece AQUI e só aqui — dentro do
            Studio, o bridge; fora, o modo avulso. Nenhum componente abaixo
            sabe qual venceu (D2 da spec `web-como-view-do-studio`). */}
        <TransportGate>
          <App />
        </TransportGate>
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)
