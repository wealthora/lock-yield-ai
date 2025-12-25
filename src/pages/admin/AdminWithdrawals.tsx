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
  method: string;
  wallet_address: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
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
        { event: "*", schema: "public", table: "withdrawal_requests" },
        () => fetchWithdrawals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchWithdrawals = async () => {
    const { data: withdrawalsData, error } = await supabase
      .from("withdrawal_requests")
      .select("*")
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
    // Update the withdrawal_requests status to approved
    const { error: updateError } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "approved",
        admin_notes: notes[withdrawal.id] || null,
      })
      .eq("id", withdrawal.id);

    if (updateError) {
      toast({ title: "Error approving withdrawal", variant: "destructive" });
      return;
    }

    // Deduct from user's available balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("available_balance")
      .eq("user_id", withdrawal.user_id)
      .single();

    if (wallet) {
      await supabase
        .from("wallets")
        .update({ available_balance: wallet.available_balance - withdrawal.amount })
        .eq("user_id", withdrawal.user_id);
    }

    // Update existing pending activity to completed using request_id in metadata
    const { data: pendingActivities } = await supabase
      .from("activities")
      .select("id")
      .eq("user_id", withdrawal.user_id)
      .eq("activity_type", "withdrawal")
      .eq("status", "pending");

    // Find the activity that matches this withdrawal's request_id
    if (pendingActivities) {
      for (const activity of pendingActivities) {
        const { data: activityData } = await supabase
          .from("activities")
          .select("metadata")
          .eq("id", activity.id)
          .single();
        
        const metadata = activityData?.metadata as { request_id?: string } | null;
        if (metadata?.request_id === withdrawal.id) {
          await supabase
            .from("activities")
            .update({ 
              status: "completed",
              description: `Withdrawal approved: $${withdrawal.amount} via ${withdrawal.method}`
            })
            .eq("id", activity.id);
          break;
        }
      }
    }

    toast({ title: "Withdrawal approved successfully" });
    fetchWithdrawals();
  };

  const handleDecline = async (withdrawal: WithdrawalRequest) => {
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "declined",
        admin_notes: notes[withdrawal.id] || null,
      })
      .eq("id", withdrawal.id);

    if (error) {
      toast({ title: "Error declining withdrawal", variant: "destructive" });
      return;
    }

    // Update existing pending activity to rejected using request_id in metadata
    const { data: pendingActivities } = await supabase
      .from("activities")
      .select("id")
      .eq("user_id", withdrawal.user_id)
      .eq("activity_type", "withdrawal")
      .eq("status", "pending");

    // Find the activity that matches this withdrawal's request_id
    if (pendingActivities) {
      for (const activity of pendingActivities) {
        const { data: activityData } = await supabase
          .from("activities")
          .select("metadata")
          .eq("id", activity.id)
          .single();
        
        const metadata = activityData?.metadata as { request_id?: string } | null;
        if (metadata?.request_id === withdrawal.id) {
          await supabase
            .from("activities")
            .update({ 
              status: "rejected",
              description: `Withdrawal rejected: $${withdrawal.amount} via ${withdrawal.method}`
            })
            .eq("id", activity.id);
          break;
        }
      }
    }

    toast({ title: "Withdrawal declined" });
    fetchWithdrawals();
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
                          {withdrawal.profiles?.first_name && withdrawal.profiles?.other_names
                            ? `${withdrawal.profiles.first_name} ${withdrawal.profiles.other_names}`
                            : withdrawal.profiles?.first_name || "Unknown"}
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
                        <p className="text-sm">{withdrawal.admin_notes || "—"}</p>
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
