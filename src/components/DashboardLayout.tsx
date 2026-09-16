import { useState, useEffect } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  User as UserIcon,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Briefcase,
  FolderOpen,
  LineChart,
  Users as UsersIcon,
  HelpCircle,
  Settings,
  LogOut,
  Sun,
  Moon,
  Plus,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useTheme } from "@/hooks/useTheme";
import { NotificationBell } from "@/components/NotificationBell";
import { UserAvatar } from "@/components/AvatarSelector";
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
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navGroups = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Profile", href: "/dashboard/profile", icon: UserIcon },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Deposit", href: "/dashboard/deposit", icon: ArrowDownToLine },
      { title: "Withdraw", href: "/dashboard/withdraw", icon: ArrowUpFromLine },
      { title: "Transactions", href: "/dashboard/transactions", icon: History },
    ],
  },
  {
    label: "Investments",
    items: [
      { title: "Trading Plans", href: "/dashboard/trading-plans", icon: Briefcase },
      { title: "My Plans", href: "/dashboard/my-plans", icon: FolderOpen },
      { title: "Profit History", href: "/dashboard/profit-history", icon: LineChart },
    ],
  },
  {
    label: "Services",
    items: [
      { title: "Referrals", href: "/dashboard/referrals", icon: UsersIcon },
      { title: "Help Center", href: "/dashboard/help", icon: HelpCircle },
    ],
  },
];

function SidebarInner({ profile, balance }: { profile: any; balance: number }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const fullName = profile?.first_name
    ? `${profile.first_name}${profile.other_names ? " " + profile.other_names : ""}`
    : "Member";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-3 space-y-3">
        {/* Profile card */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <UserAvatar src={profile?.avatar} fallback={profile?.first_name || "U"} size="sm" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate">
                online{memberSince ? ` · member since ${memberSince}` : ""}
              </p>
            </div>
          )}
        </div>

        {/* Balance card */}
        {!collapsed && (
          <div className="rounded-lg bg-muted/50 border border-border p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</p>
              <p className="text-base font-bold">
                ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => navigate("/dashboard/deposit")}
                className="h-8 w-8 rounded-md bg-background border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/40 transition-colors"
                aria-label="Deposit"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate("/dashboard/withdraw")}
                className="h-8 w-8 rounded-md bg-background border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/40 transition-colors"
                aria-label="Withdraw"
              >
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-1">
        {navGroups.map((group) => (
          <CollapsibleGroup key={group.label} label={group.label} items={group.items} collapsed={collapsed} />
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/");
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && <span>Log Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function CollapsibleGroup({
  label,
  items,
  collapsed,
}: {
  label: string;
  items: { title: string; href: string; icon: React.ElementType }[];
  collapsed: boolean;
}) {
  const { pathname } = useLocation();
  const hasActive = items.some((i) =>
    i.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(i.href)
  );
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarGroup>
        {!collapsed && (
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="cursor-pointer flex items-center justify-between hover:text-foreground transition-colors group/label">
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-muted/60 border border-border/50 text-muted-foreground uppercase tracking-wider">
                {label}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform",
                  !open && "-rotate-90"
                )}
              />
            </SidebarGroupLabel>
          </CollapsibleTrigger>
        )}
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={hasActive && (item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href))}>
                      <NavLink
                        to={item.href}
                        end={item.href === "/dashboard"}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 rounded-md text-sm",
                            isActive && "bg-primary/15 text-primary"
                          )
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
      {hasActive && null}
    </Collapsible>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [profile, setProfile] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const { theme, toggleTheme } = useTheme();
  useInactivityLogout();

  useEffect(() => {
    loadProfile();
    const channel = supabase
      .channel("dashboard-layout-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadProfile)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, loadProfile)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [p, w] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallets").select("available_balance").eq("user_id", user.id).maybeSingle(),
    ]);
    setProfile(p.data);
    setBalance(Number(w.data?.available_balance ?? 0));
  };

  return (
    <div className="dark">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <SidebarInner profile={profile} balance={balance} />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 border-b border-border flex items-center px-4 gap-2 bg-card/50 backdrop-blur sticky top-0 z-30">
              <SidebarTrigger />
              <div className="ml-auto flex items-center gap-2">
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="transition-transform hover:scale-110"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              </div>
            </header>
            <main className="flex-1">
              <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">{children}</div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
