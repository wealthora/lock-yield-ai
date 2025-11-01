import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut, TrendingUp, Lock, Unlock, DollarSign, Activity, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MarketTicker from "@/components/MarketTicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DepositModal } from "@/components/DepositModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { AIBotsModal } from "@/components/AIBotsModal";
import { KYCModal } from "@/components/KYCModal";
import { RecentActivity } from "@/components/RecentActivity";
import { ActiveInvestments } from "@/components/ActiveInvestments";

interface Profile {
  email: string | null;
  name: string | null;
  kyc_status: string;
  avatar?: string | null;
}

interface Balance {
  available_balance: number;
  locked_balance: number;
}

interface ActivityData {
  id: string;
  activity_type: string;
  description: string;
  amount?: number;
  method?: string;
  created_at: string;
}

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [aiBotsModalOpen, setAIBotsModalOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        loadUserData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserData = async (userId: string) => {
    try {
      const [profileRes, balanceRes, activitiesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("balances").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("activities").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      ]);

      if (profileRes.error && profileRes.error.code !== 'PGRST116') {
        console.error("Profile error:", profileRes.error);
      }
      if (balanceRes.error && balanceRes.error.code !== 'PGRST116') {
        console.error("Balance error:", balanceRes.error);
      }

      // Set profile data or use session email as fallback
      setProfile(profileRes.data || {
        email: session?.user?.email || null,
        name: session?.user?.user_metadata?.name || session?.user?.user_metadata?.full_name || null,
        kyc_status: 'not_started'
      });
      
      // Set balance data or use defaults
      setBalance(balanceRes.data || {
        available_balance: 0,
        locked_balance: 0
      });

      // Set activities
      setActivities(activitiesRes.data || []);

      // Setup realtime subscription for activities
      const channel = supabase
        .channel('activities-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'activities',
            filter: `user_id=eq.${userId}`
          },
          () => {
            // Reload activities on any change
            supabase
              .from("activities")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(10)
              .then(({ data }) => {
                if (data) setActivities(data);
              });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error: any) {
      console.error("Error loading user data:", error);
      // Set defaults on error
      setProfile({
        email: session?.user?.email || null,
        name: session?.user?.user_metadata?.name || session?.user?.user_metadata?.full_name || null,
        kyc_status: 'not_started'
      });
      setBalance({
        available_balance: 0,
        locked_balance: 0
      });
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kycStatusColor: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
    not_started: "secondary",
    pending: "outline",
    approved: "default",
    rejected: "destructive",
  };
  
  const currentKycStatus = profile?.kyc_status || "not_started";
  const badgeVariant = kycStatusColor[currentKycStatus] || "secondary";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-primary/20 bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 cursor-pointer" onClick={() => navigate("/profile")}>
              <AvatarImage src={profile?.avatar} alt={profile?.name || "User"} />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-primary">Forex AI Trading</h1>
              <p className="text-sm text-muted-foreground">Welcome, {profile?.name || profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/profile")}>
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${balance?.available_balance.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready to invest</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locked Balance</CardTitle>
              <Lock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${balance?.locked_balance.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-muted-foreground mt-1">In active positions</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${((balance?.available_balance || 0) + (balance?.locked_balance || 0)).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Portfolio value</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setKycModalOpen(true)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={badgeVariant} className="capitalize">
                {currentKycStatus.replace("_", " ")}
              </Badge>
              {currentKycStatus === "not_started" && (
                <p className="text-xs text-muted-foreground mt-2">Click to complete KYC verification</p>
              )}
            </CardContent>
          </Card>
        </div>

        <ActiveInvestments />

        <div className="grid gap-6 md:grid-cols-2 mb-8 mt-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your account and funds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => setDepositModalOpen(true)}>
                <Unlock className="h-4 w-4 mr-2" />
                Deposit Crypto
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setWithdrawModalOpen(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Withdraw Funds
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setAIBotsModalOpen(true)}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Allocate to AI Bots
              </Button>
            </CardContent>
          </Card>

          <RecentActivity />
        </div>

        <Card className="border-warning/20 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-warning">Risk Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Trading leveraged FX instruments carries significant risk of loss.</p>
            <p>• AI trading bots do not guarantee returns. Past performance does not indicate future results.</p>
            <p>• Cryptocurrency transactions are irreversible. Ensure addresses are correct before withdrawal.</p>
            <p>• Only invest funds you can afford to lose.</p>
          </CardContent>
        </Card>
      </main>

      <DepositModal open={depositModalOpen} onOpenChange={setDepositModalOpen} />
      <WithdrawModal open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen} />
      <AIBotsModal 
        open={aiBotsModalOpen} 
        onOpenChange={setAIBotsModalOpen}
        onInvestmentCreated={() => loadUserData(session?.user?.id || "")}
      />
      <KYCModal 
        isOpen={kycModalOpen} 
        onClose={() => setKycModalOpen(false)} 
        currentStatus={currentKycStatus}
        onStatusUpdate={() => loadUserData(session?.user?.id || "")}
      />
      
      <MarketTicker />
    </div>
  );
}
