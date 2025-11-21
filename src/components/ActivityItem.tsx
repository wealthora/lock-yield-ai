import { formatDistanceToNow } from "date-fns";
import { DollarSign, ArrowUpRight, ArrowDownRight, Bot, Shield, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActivityItemProps {
  activityType: string;
  description: string;
  amount?: number;
  method?: string;
  status?: string;
  createdAt: string;
}

export const ActivityItem = ({ activityType, description, amount, method, status, createdAt }: ActivityItemProps) => {
  const getIcon = () => {
    switch (activityType) {
      case "deposit":
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      case "withdrawal":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case "allocation":
        return <Bot className="h-4 w-4 text-blue-500" />;
      case "investment_completed":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "kyc_update":
        return <Shield className="h-4 w-4 text-purple-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;

    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      approved: { variant: "default", label: "Approved" },
      pending: { variant: "secondary", label: "Pending" },
      declined: { variant: "destructive", label: "Declined" },
      completed: { variant: "default", label: "Completed" },
    };

    const config = statusConfig[status.toLowerCase()] || { variant: "outline" as const, label: status };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-1 p-2 rounded-full bg-muted">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{description}</p>
          {getStatusBadge()}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {amount && (
            <span className="text-sm font-semibold text-primary">
              ${amount.toFixed(2)}
            </span>
          )}
          {method && (
            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
              {method}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};
