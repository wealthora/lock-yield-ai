import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, CreditCard, Gift, TrendingUp, HelpCircle, Settings, LogOut, Menu, X, DollarSign, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useTheme } from "@/hooks/useTheme";
import { NotificationBell } from "@/components/NotificationBell";
import { UserAvatar } from "@/components/AvatarSelector";
import logo from "@/assets/wealthora-logo.png";
interface DashboardLayoutProps {
  children: React.ReactNode;
}
interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}
const navItems: NavItem[] = [{
  title: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard
}, {
  title: "Finances",
  href: "/dashboard/finances",
  icon: CreditCard
}, {
  title: "Daily Returns",
  href: "/dashboard/daily-returns",
  icon: DollarSign
}, {
  title: "Rewards Hub",
  href: "/dashboard/rewards",
  icon: Gift
}, {
  title: "Analytics & Education",
  href: "/dashboard/analytics",
  icon: TrendingUp
}, {
  title: "Help Center",
  href: "/dashboard/help",
  icon: HelpCircle
}, {
  title: "Profile Settings",
  href: "/dashboard/profile",
  icon: Settings
}];
export function DashboardLayout({
  children
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Auto-logout on inactivity
  useInactivityLogout();
  useEffect(() => {
    loadProfile();
    
    // Subscribe to profile changes for real-time avatar updates
    const channel = supabase
      .channel('sidebar-profile-changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
        },
        () => {
          loadProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const loadProfile = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      const {
        data
      } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      setProfile(data);
    }
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };
  return <div className={theme}>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="lg:hidden border-b border-border bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Wealthora ai" className="h-[40px] w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleTheme}
              className="transition-transform hover:scale-110"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        <div className="flex min-h-screen">
          {/* Sidebar - Desktop & Mobile Overlay */}
          <aside className={cn("fixed lg:sticky top-0 left-0 h-screen bg-card border-r border-border z-40 transition-transform duration-300", "lg:translate-x-0 lg:w-60", isSidebarOpen ? "translate-x-0 w-60" : "-translate-x-full")}>
            <div className="flex flex-col h-full">
              {/* Logo with Avatar */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <UserAvatar 
                  src={profile?.avatar} 
                  fallback={profile?.first_name || "U"} 
                  size="sm"
                />
                <div className="hidden lg:flex items-center">
                  <img src={logo} alt="Wealthora ai" className="h-[32px] w-auto" />
                </div>
              </div>

              

              {/* Navigation */}
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map(item => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return <button key={item.href} onClick={() => {
                  navigate(item.href);
                  setIsSidebarOpen(false);
                }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </button>;
              })}
              </nav>

              {/* Logout */}
              <div className="p-3 border-t border-border">
                <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-3" />
                  Log Out
                </Button>
              </div>
            </div>
          </aside>

          {/* Mobile Overlay */}
          {isSidebarOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

          {/* Main Content */}
          <main className="flex-1 w-full lg:w-auto">
            {/* Desktop Header with Notification Bell and Theme Toggle */}
            <div className="hidden lg:flex items-center justify-end gap-2 px-6 py-4 border-b border-border bg-card">
              <NotificationBell />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleTheme}
                className="transition-transform hover:scale-110"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
            <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>;
}