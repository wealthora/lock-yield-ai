import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Lock, Copy, Users, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
interface Balance {
  available_balance: number;
  locked_balance: number;
  returns_balance: number;
}
interface ReferredUser {
  id: string;
  referred_id: string;
  created_at: string;
  profile?: {
    first_name: string;
    other_names: string;
  };
  reward?: number;
}
export default function DashboardHome() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState({
    totalReferred: 0,
    totalEarned: 0
  });
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadData();

    // Set up real-time subscription for balance updates
    const channel = supabase.channel("wallet_changes").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "wallets"
    }, () => {
      console.log("Wallet updated - reloading data");
      loadData();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const loadData = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [balanceRes, profileRes] = await Promise.all([supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(), supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle()]);
    setBalance(balanceRes.data || {
      available_balance: 0,
      locked_balance: 0,
      returns_balance: 0
    });
    setProfile(profileRes.data);

    // Load referral data
    await loadReferralData(user.id);
  };
  const loadReferralData = async (currentUserId: string) => {
    // Get all referrals where current user is the referrer
    const {
      data: referrals
    } = await supabase.from("referrals").select("id, referred_id, created_at").eq("referrer_id", currentUserId);

    // Get total rewards earned
    const {
      data: rewards
    } = await supabase.from("referral_rewards").select("reward_amount, referred_id").eq("referrer_id", currentUserId);
    const totalEarned = rewards?.reduce((sum, r) => sum + Number(r.reward_amount), 0) || 0;
    setReferralStats({
      totalReferred: referrals?.length || 0,
      totalEarned
    });

    // Get profile info for each referred user
    if (referrals && referrals.length > 0) {
      const referredUserIds = referrals.map(r => r.referred_id);
      const {
        data: profiles
      } = await supabase.from("profiles").select("id, first_name, other_names").in("id", referredUserIds);

      // Map rewards to referred users
      const rewardsMap = new Map(rewards?.map(r => [r.referred_id, Number(r.reward_amount)]));
      const usersWithProfiles: ReferredUser[] = referrals.map(r => ({
        ...r,
        profile: profiles?.find(p => p.id === r.referred_id),
        reward: rewardsMap.get(r.referred_id) || 0
      }));
      setReferredUsers(usersWithProfiles);
    } else {
      setReferredUsers([]);
    }
  };
  const referralLink = `${window.location.origin}/auth?ref=${userId || ""}`;
  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard"
    });
  };
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back to your trading hub, {profile?.first_name || "User"}
        </p>
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
                $
                {((balance?.available_balance || 0) + (balance?.locked_balance || 0)).toFixed(2)}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Returns Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${balance?.returns_balance?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Daily returns earned</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {((balance?.available_balance || 0) + (balance?.locked_balance || 0) + (balance?.returns_balance || 0)).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All assets combined</p>
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
            Share your unique link, and when your friend registers and makes their first deposit, you will receive a 10% bonus!
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-primary/10">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold">{referralStats.totalReferred}</div>
                <p className="text-sm text-muted-foreground mt-1">Total Referred</p>
              </CardContent>
            </Card>
            <Card className="border-primary/10">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary">
                  ${referralStats.totalEarned.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Total Bonus Earned</p>
              </CardContent>
            </Card>
            <Card className="border-primary/10">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold">10%</div>
                <p className="text-sm text-muted-foreground mt-1">Bonus Rate</p>
                <p className="text-xs text-muted-foreground">On first deposit</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Input readOnly value={referralLink} className="font-mono text-sm" />
            <Button onClick={copyReferralLink} size="icon" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Referred Users Table */}
          {referredUsers.length > 0 && <div className="mt-6">
              <h4 className="font-semibold mb-3">Your Referrals</h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Bonus Earned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referredUsers.map(user => <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.profile ? `${user.profile.first_name} ${user.profile.other_names}` : "Unknown User"}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.reward ? <span className="text-primary font-medium">
                              ${user.reward.toFixed(2)}
                            </span> : <span className="text-muted-foreground">Pending</span>}
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </div>}
        </CardContent>
      </Card>
    </div>;
}