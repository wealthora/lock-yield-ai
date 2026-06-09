import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowUpFromLine, Clock, History } from "lucide-react";
import { StatCard } from "@/components/finances/StatCards";
import { PaymentMethodsTable, type PaymentMethod } from "@/components/finances/PaymentMethodsTable";
import { WithdrawFlowDialog } from "@/components/finances/WithdrawFlowDialog";
import { PasswordConfirmDialog } from "@/components/PasswordConfirmDialog";

export default function Withdraw() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ available: 0, total: 0, pending: 0, last: 0 });
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [w, withs] = await Promise.all([
      supabase.from("wallets").select("available_balance").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("withdrawal_requests")
        .select("amount,status,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    const list = withs.data || [];
    const approved = list.filter((d) => d.status === "approved");
    const pending = list.filter((d) => d.status === "pending");
    setStats({
      available: Number(w.data?.available_balance ?? 0),
      total: approved.reduce((s, d) => s + Number(d.amount), 0),
      pending: pending.reduce((s, d) => s + Number(d.amount), 0),
      last: Number(approved[0]?.amount ?? 0),
    });
  };

  useEffect(() => {
    load();
  }, []);

  const fmt = (v: number) =>
    `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowUpFromLine className="h-5 w-5" />
          Withdrawals
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/transactions")}>
            Withdrawal History
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available Balance" value={fmt(stats.available)} icon={Wallet} />
        <StatCard label="Total Withdrawn" value={fmt(stats.total)} icon={ArrowUpFromLine} />
        <StatCard label="Pending Withdrawals" value={fmt(stats.pending)} icon={Clock} />
        <StatCard label="Last Withdrawal" value={fmt(stats.last)} icon={History} />
      </div>

      <PaymentMethodsTable mode="withdrawal" onSelect={setSelected} />

      <WithdrawFlowDialog
        method={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onSuccess={load}
      />
    </div>
  );
}
