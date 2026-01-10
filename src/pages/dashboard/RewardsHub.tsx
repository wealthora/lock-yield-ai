import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Trophy, Star, Zap, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isComingSoon?: boolean;
}

const FeatureCard = ({ title, description, icon, children, isComingSoon = true }: FeatureCardProps) => {
  return (
    <Card className={`border-primary/20 relative overflow-hidden transition-all ${
      isComingSoon ? 'opacity-70 border-dashed' : ''
    }`}>
      {isComingSoon && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none">
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs font-medium bg-muted text-muted-foreground">
              Coming Soon
            </Badge>
          </div>
        </div>
      )}
      <div className={isComingSoon ? 'pointer-events-none select-none' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </div>
    </Card>
  );
};

export default function RewardsHub() {
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  // Feature flags - can be controlled from backend in the future
  const [featureFlags] = useState({
    welcomeBonus: false, // Set to true when feature is ready
    loyaltyProgram: false,
    referralRewards: false,
    tradingBonuses: false,
  });

  useEffect(() => {
    const fetchReferralData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [referralsRes, rewardsRes] = await Promise.all([
        supabase.from("referrals").select("id").eq("referrer_id", user.id),
        supabase.from("referral_rewards").select("reward_amount").eq("referrer_id", user.id),
      ]);

      setTotalReferrals(referralsRes.data?.length || 0);
      setTotalEarnings(
        rewardsRes.data?.reduce((sum, r) => sum + (r.reward_amount || 0), 0) || 0
      );
      setLoading(false);
    };

    fetchReferralData();
  }, []);

  const allComingSoon = !featureFlags.welcomeBonus && !featureFlags.loyaltyProgram && 
                        !featureFlags.referralRewards && !featureFlags.tradingBonuses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Rewards Hub</h1>
        <p className="text-muted-foreground mt-1">Earn rewards and unlock exclusive benefits</p>
      </div>

      {allComingSoon && (
        <div className="p-4 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
          <p className="text-sm text-muted-foreground text-center">
            🚀 These features are currently under development and will be available soon. Stay tuned for exciting rewards!
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <FeatureCard
          title="Welcome Bonus"
          description="New user rewards"
          icon={<Gift className="h-5 w-5 text-primary" />}
          isComingSoon={!featureFlags.welcomeBonus}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">First Deposit Bonus</span>
              <Badge>100%</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Subsequent Deposits</span>
              <Badge variant="secondary">60%</Badge>
            </div>
          </div>
        </FeatureCard>

        <FeatureCard
          title="Loyalty Program"
          description="Your current tier"
          icon={<Trophy className="h-5 w-5 text-warning" />}
          isComingSoon={!featureFlags.loyaltyProgram}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Level</span>
              <Badge variant="outline">Bronze</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Points Earned</span>
              <span className="font-semibold">0 / 1,000</span>
            </div>
          </div>
        </FeatureCard>

        <FeatureCard
          title="Referral Rewards"
          description="Earn from referrals"
          icon={<Star className="h-5 w-5 text-accent" />}
          isComingSoon={!featureFlags.referralRewards}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Total Referrals</span>
              <span className="font-semibold">{loading ? "..." : totalReferrals}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Earned from Referrals</span>
              <span className="font-semibold text-primary">
                {loading ? "..." : `$${totalEarnings.toFixed(2)}`}
              </span>
            </div>
          </div>
        </FeatureCard>

        <FeatureCard
          title="Trading Bonuses"
          description="Volume-based rewards"
          icon={<Zap className="h-5 w-5 text-primary" />}
          isComingSoon={!featureFlags.tradingBonuses}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Trading Volume</span>
              <span className="font-semibold">$0</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Bonus Unlocked</span>
              <span className="font-semibold text-primary">$0.00</span>
            </div>
          </div>
        </FeatureCard>
      </div>

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle>How to Earn More Rewards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <p>Complete your KYC verification to unlock higher deposit bonuses</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <p>Refer friends and earn 10% of their first deposit</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <p>Increase your trading volume to unlock tier bonuses</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">4</span>
            </div>
            <p>Participate in promotional campaigns and contests</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
