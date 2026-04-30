import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { LayoutDashboard, MessagesSquare, Brain, Plug, Settings as SettingsIcon, ScrollText, Sparkles, LogOut, Wand2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Overview", url: "/app", icon: LayoutDashboard, end: true },
  { title: "Conversations", url: "/app/conversations", icon: MessagesSquare },
  { title: "Memory", url: "/app/memory", icon: Brain },
  { title: "Platforms", url: "/app/platforms", icon: Plug },
  { title: "Playground", url: "/app/playground", icon: Wand2 },
  { title: "Logs", url: "/app/logs", icon: ScrollText },
  { title: "Settings", url: "/app/settings", icon: SettingsIcon },
];

const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const isActive = (url: string, end?: boolean) => end ? pathname === url : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center surface-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && <div className="font-semibold tracking-tight">Aria</div>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={isActive(it.url, it.end)}>
                    <NavLink to={it.url} end={it.end} className="flex items-center gap-2">
                      <it.icon className="h-4 w-4" />
                      {!collapsed && <span>{it.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        {!collapsed && user && <div className="text-xs text-muted-foreground truncate mb-2">{user.email}</div>}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start">
          <LogOut className="h-4 w-4" />{!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export const AppLayout = () => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 flex items-center border-b bg-card/50 backdrop-blur px-3 sticky top-0 z-10">
          <SidebarTrigger />
          <div className="ml-3 text-sm text-muted-foreground">Human-Like AI Communication</div>
        </header>
        <main className="flex-1 p-6"><Outlet /></main>
      </div>
    </div>
  </SidebarProvider>
);
