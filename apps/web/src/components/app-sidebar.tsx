import { ClipboardCheckIcon, PackageIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type Destination = "wizard" | "catalog"

const navItems: {
  title: string
  icon: typeof PackageIcon
  destination: Destination
}[] = [
  { title: "Exame guiado", icon: ClipboardCheckIcon, destination: "wizard" },
  { title: "Catálogo", icon: PackageIcon, destination: "catalog" },
]

type AppSidebarProps = {
  destination: Destination
  onSelectDestination: (destination: Destination) => void
}

export function AppSidebar({
  destination,
  onSelectDestination,
}: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-1.5 text-sm font-semibold">
          Agents for Commerce
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={item.destination === destination}
                    onClick={() => onSelectDestination(item.destination)}
                  >
                    <item.icon data-icon="inline-start" />
                    {item.title}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
