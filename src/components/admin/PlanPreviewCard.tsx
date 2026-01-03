import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Clock, Shield, AlertTriangle, RefreshCw } from "lucide-react";

interface InvestmentPlan {
  id: string;
  name: string;
  description: string | null;
  daily_return_rate: number;
  minimum_investment: number;
  max_investment: number | null;
  duration_days: number;
  early_withdrawal_allowed: boolean;
  early_withdrawal_penalty: number;
  auto_reinvest_enabled: boolean;
  risk_level: string | null;
  strategy: string | null;
  status: string;
  roi_period: string;
}

interface PlanPreviewCardProps {
  plan: InvestmentPlan;
}

export const PlanPreviewCard = ({ plan }: PlanPreviewCardProps) => {
  const getRiskColor = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case "low":
        return "text-green-500 border-green-500/30 bg-green-500/10";
      case "medium":
        return "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
      case "high":
        return "text-red-500 border-red-500/30 bg-red-500/10";
      default:
        return "";
    }
  };

  const getRoiLabel = (period: string) => {
    switch (period) {
      case "daily":
        return "Daily Returns";
      case "weekly":
        return "Weekly Returns";
      case "monthly":
        return "Monthly Returns";
      default:
        return "Returns";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            {plan.strategy && (
              <CardDescription className="mt-1">{plan.strategy}</CardDescription>
            )}
          </div>
          {plan.risk_level && (
            <Badge variant="outline" className={getRiskColor(plan.risk_level)}>
              {plan.risk_level} Risk
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}

        {/* ROI Highlight */}
        <div className="text-center p-6 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <span className="text-4xl font-bold text-primary">{plan.daily_return_rate}%</span>
          </div>
          <p className="text-sm text-muted-foreground">{getRoiLabel(plan.roi_period)}</p>
        </div>

        {/* Key Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Minimum</p>
            <p className="font-semibold">${plan.minimum_investment.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Maximum</p>
            <p className="font-semibold">
              {plan.max_investment ? `$${plan.max_investment.toLocaleString()}` : "No limit"}
            </p>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{plan.duration_days} Days</p>
            <p className="text-xs text-muted-foreground">Investment Duration</p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          {plan.early_withdrawal_allowed && (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span>
                Early withdrawal allowed ({plan.early_withdrawal_penalty}% penalty)
              </span>
            </div>
          )}
          {plan.auto_reinvest_enabled && (
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4 text-primary" />
              <span>Auto-reinvestment available</span>
            </div>
          )}
        </div>

        {/* Sample CTA */}
        <Button className="w-full" disabled>
          Invest Now
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Preview only - This is how users will see the plan
        </p>
      </CardContent>
    </Card>
  );
};
