import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Lock, Copy, Users, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Balance {
  available_balance: number;
  locked_balance: number;
}

export default function DashboardHome() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [balanceRes, profileRes] = await Promise.all([
      supabase.from("balances").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);

    setBalance(balanceRes.data || { available_balance: 0, locked_balance: 0 });
    setProfile(profileRes.data);
  };

  const referralLink = `${window.location.origin}/auth?ref=${profile?.id || ""}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back to your trading hub</p>
      </div>

      {/* Account Info Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Account Balance
              </CardTitle>
              <div className="text-3xl font-bold mt-1">
                ${((balance?.available_balance || 0) + (balance?.locked_balance || 0)).toFixed(2)}
              </div>
            </div>
            <Button variant="outline" size="sm">
              Restore
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${balance?.available_balance.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready to invest</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locked Balance</CardTitle>
            <Lock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${balance?.locked_balance.toFixed(2) || "0.00"}
            </div>
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
      </div>

      {/* Account Info */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Account Type</p>
              <p className="font-medium">Standard</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Account ID</p>
              <p className="font-medium">{profile?.id?.slice(0, 8) || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="default">Active</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Leverage</p>
              <p className="font-medium">1:500</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bonus Promotion */}
      <Card className="border-warning/20 bg-gradient-to-r from-warning/5 to-warning/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
              <Gift className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">100% Bonus on your next deposit</h3>
              <p className="text-sm text-muted-foreground mt-1">
                and up to 60% on each one after that
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite Friends & Earn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share your unique link, and when your friend registers and trades, you will receive profit!
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-primary/10">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold">0</div>
                <p className="text-sm text-muted-foreground mt-1">Total clients</p>
              </CardContent>
            </Card>
            <Card className="border-primary/10">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold">$0.00</div>
                <p className="text-sm text-muted-foreground mt-1">Profit earned</p>
              </CardContent>
            </Card>
            <Card className="border-primary/10">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold">30%</div>
                <p className="text-sm text-muted-foreground mt-1">of spread</p>
                <p className="text-xs text-muted-foreground">You earn now</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Input
              readOnly
              value={referralLink}
              className="font-mono text-sm"
            />
            <Button onClick={copyReferralLink} size="icon" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
