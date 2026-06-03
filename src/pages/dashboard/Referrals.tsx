import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Copy, DollarSign, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Referrals() {
  const [link, setLink] = useState("");
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setLink(`${window.location.origin}/auth?ref=${user.id}`);
      const [r, rw] = await Promise.all([
        supabase.from("referrals").select("id").eq("referrer_id", user.id),
        supabase.from("referral_rewards").select("reward_amount").eq("referrer_id", user.id),
      ]);
      setTotalReferrals(r.data?.length || 0);
      setTotalEarnings(rw.data?.reduce((s, x) => s + Number(x.reward_amount || 0), 0) || 0);
    })();
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(link);
    toast({ title: "Copied", description: "Referral link copied" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Referrals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Earn 10% of every referred user's first deposit.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Total Referrals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalReferrals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Total Earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              ${totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>Share this link to earn rewards.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input readOnly value={link} />
          <Button onClick={copy} variant="outline">
            <Copy className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
