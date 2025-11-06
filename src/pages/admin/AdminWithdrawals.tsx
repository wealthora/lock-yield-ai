import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  method: string | null;
  wallet_address: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  profiles: {
    first_name: string | null;
    other_names: string | null;
    email: string | null;
  } | null;
}

export default function AdminWithdrawals() {
  const { isLoading } = useAdminCheck();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchWithdrawals();

    const channel = supabase
      .channel("withdrawal-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: "type=eq.withdrawal" },
        () => fetchWithdrawals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchWithdrawals = async () => {
    const { data: withdrawalsData, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("type", "withdrawal")
      .order("created_at", { ascending: false });

    if (error || !withdrawalsData) {
      toast({ title: "Error fetching withdrawals", variant: "destructive" });
      return;
    }

    const withdrawalsWithProfiles = await Promise.all(
      withdrawalsData.map(async (withdrawal) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, other_names, email")
          .eq("user_id", withdrawal.user_id)
          .single();

        return {
          ...withdrawal,
          profiles: profile,
        };
      })
    );

    setWithdrawals(withdrawalsWithProfiles);
  };

  const handleApprove = async (withdrawal: WithdrawalRequest) => {
    // Update the transaction status to approved (trigger will handle balance deduction)
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "approved",
        notes: notes[withdrawal.id] || null,
      })
      .eq("id", withdrawal.id)
      .eq("type", "withdrawal");

    if (updateError) {
      toast({ title: "Error approving withdrawal", variant: "destructive" });
      return;
    }

    await supabase.from("activities").insert({
      user_id: withdrawal.user_id,
      activity_type: "withdrawal",
      description: `Withdrawal approved: $${withdrawal.amount} via ${withdrawal.method}`,
      amount: withdrawal.amount,
      method: withdrawal.method,
    });

    toast({ title: "Withdrawal approved successfully" });
    fetchWithdrawals();
  };

  const handleDecline = async (withdrawal: WithdrawalRequest) => {
    const { error } = await supabase
      .from("transactions")
      .update({
        status: "rejected",
        notes: notes[withdrawal.id] || null,
      })
      .eq("id", withdrawal.id)
      .eq("type", "withdrawal");

    if (error) {
      toast({ title: "Error declining withdrawal", variant: "destructive" });
    } else {
      toast({ title: "Withdrawal declined" });
      fetchWithdrawals();
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div>Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Withdrawal Requests</h2>
          <p className="text-muted-foreground">Review and approve user withdrawals</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Withdrawals</CardTitle>
            <CardDescription>
              Pending requests: {withdrawals.filter((w) => w.status === "pending").length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Wallet/Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Admin Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {withdrawal.profiles?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {withdrawal.profiles?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      ${Number(withdrawal.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{withdrawal.method}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {withdrawal.wallet_address || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          withdrawal.status === "approved"
                            ? "default"
                            : withdrawal.status === "declined"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {withdrawal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(withdrawal.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {withdrawal.status === "pending" ? (
                        <Textarea
                          placeholder="Add notes..."
                          value={notes[withdrawal.id] || ""}
                          onChange={(e) =>
                            setNotes({ ...notes, [withdrawal.id]: e.target.value })
                          }
                          className="min-h-[60px]"
                        />
                       ) : (
                        <p className="text-sm">{withdrawal.notes || "—"}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {withdrawal.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(withdrawal)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDecline(withdrawal)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
