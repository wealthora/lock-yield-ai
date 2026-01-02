import { ReactNode } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Wallet,
  TrendingUp,
  FileCheck,
  ScrollText,
  Settings,
  UserCog,
  LogOut,
  Sun,
  Moon,
  Bot,
  PiggyBank,
  MessageCircle,
  Megaphone
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/useTheme";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";

const adminNavItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Deposits", url: "/admin/deposits", icon: Wallet },
  { title: "Withdrawals", url: "/admin/withdrawals", icon: TrendingUp },
  { title: "Bot Allocations", url: "/admin/bot-allocations", icon: Bot },
  { title: "Bot Returns", url: "/admin/bot-returns", icon: PiggyBank },
  { title: "KYC Verification", url: "/admin/kyc", icon: FileCheck },
  { title: "Profile Requests", url: "/admin/profile-requests", icon: UserCog },
  { title: "Support Chat", url: "/admin/chat", icon: MessageCircle },
  { title: "Broadcast", url: "/admin/broadcast", icon: Megaphone },
  { title: "System Logs", url: "/admin/logs", icon: ScrollText },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

function AdminSidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar className="w-64" collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-6">
          <h2 className="font-bold text-xl">
            Admin Portal
          </h2>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Logout</span>
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className={theme}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-16 border-b flex items-center px-6 bg-card">
              <SidebarTrigger />
              <h1 className="ml-4 text-xl font-semibold text-foreground">Admin Dashboard</h1>
              <div className="ml-auto flex items-center gap-2">
                <AdminNotificationBell />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={toggleTheme}
                  className="transition-transform hover:scale-110"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              </div>
            </header>
            <main className="flex-1 p-6 bg-background">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
