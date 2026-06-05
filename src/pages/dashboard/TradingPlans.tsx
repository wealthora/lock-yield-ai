import { useState } from "react";
import { AIBotsModal } from "@/components/AIBotsModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function TradingPlans() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [bots, setBots] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("ai_bots")
      .select("*")
      .eq("is_active", true)
      .order("minimum_investment")
      .then(({ data }) => setBots(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Trading Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose an AI trading plan that matches your goals.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Sparkles className="h-4 w-4 mr-2" /> Allocate Funds
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bots.map((b) => (
          <Card key={b.id} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">{b.name}</CardTitle>
              <CardDescription>{b.strategy}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{b.description}</p>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Daily</p>
                  <p className="font-semibold text-primary">{b.daily_return_rate}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Min</p>
                  <p className="font-semibold">${b.minimum_investment}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Risk</p>
                  <p className="font-semibold">{b.risk_level}</p>
                </div>
              </div>
              <Button className="w-full" size="sm" onClick={() => setOpen(true)}>
                Invest
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AIBotsModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
