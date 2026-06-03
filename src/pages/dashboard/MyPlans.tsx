import { ActiveInvestments } from "@/components/ActiveInvestments";
import { FolderOpen } from "lucide-react";

export default function MyPlans() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen className="h-5 w-5" /> My Plans
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Active investments and their performance.
        </p>
      </div>
      <ActiveInvestments />
    </div>
  );
}
