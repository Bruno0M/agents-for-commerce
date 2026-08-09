import { useState } from "react"

import { AppSidebar, type Destination } from "@/components/app-sidebar"
import { CatalogPage } from "@/components/catalog-page"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const DESTINATION_TITLE: Record<Destination, string> = {
  catalog: "Catálogo",
}

export function App() {
  const [destination, setDestination] = useState<Destination>("catalog")

  return (
    <SidebarProvider>
      <AppSidebar
        destination={destination}
        onSelectDestination={setDestination}
      />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium">
            {DESTINATION_TITLE[destination]}
          </span>
        </header>
        <CatalogPage />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
