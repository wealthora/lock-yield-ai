import { RecentActivity } from "@/components/RecentActivity";

export default function Transactions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All your deposits, withdrawals and investment activity.
        </p>
      </div>
      <RecentActivity />
    </div>
  );
}
