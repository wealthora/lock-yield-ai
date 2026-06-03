import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ label, value, icon: Icon, iconColor }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-start justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        <p className="text-2xl font-bold mt-2">{value}</p>
      </div>
      <div className={cn("h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center", iconColor)}>
        <Icon className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}
