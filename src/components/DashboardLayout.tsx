import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  LayoutDashboard, 
  CreditCard, 
  Gift, 
  TrendingUp, 
  HelpCircle, 
  Settings, 
  LogOut,
  Menu,
  X,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Finances", href: "/dashboard/finances", icon: CreditCard },
  { title: "Daily Returns", href: "/dashboard/daily-returns", icon: DollarSign },
  { title: "Rewards Hub", href: "/dashboard/rewards", icon: Gift },
  { title: "Analytics & Education", href: "/dashboard/analytics", icon: TrendingUp },
  { title: "Help Center", href: "/dashboard/help", icon: HelpCircle },
  { title: "Profile Settings", href: "/dashboard/profile", icon: Settings },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
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

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden border-b border-border bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
            FA
          </div>
          <span className="font-semibold">Forex AI Trading</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      <div className="flex min-h-screen">
        {/* Sidebar - Desktop & Mobile Overlay */}
        <aside
          className={cn(
            "fixed lg:sticky top-0 left-0 h-screen bg-card border-r border-border z-40 transition-transform duration-300",
            "lg:translate-x-0 lg:w-60",
            isSidebarOpen ? "translate-x-0 w-60" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo - Desktop Only */}
            <div className="hidden lg:flex items-center gap-2 p-4 border-b border-border">
              <div className="h-10 w-10 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
                FA
              </div>
              <span className="font-semibold">Forex AI Trading</span>
            </div>

            {/* Profile Section */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar} alt={profile?.name || "User"} />
                  <AvatarFallback>{profile?.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      navigate(item.href);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Log Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 w-full lg:w-auto">
          <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
