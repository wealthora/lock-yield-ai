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

interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles: {
    first_name: string | null;
    other_names: string | null;
    email: string | null;
  } | null;
}

export default function AdminDeposits() {
  const { isLoading } = useAdminCheck();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchDeposits();

    const channel = supabase
      .channel("deposit-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deposit_requests" },
        () => fetchDeposits()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDeposits = async () => {
    const { data: depositsData, error } = await supabase
      .from("deposit_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !depositsData) {
      toast({ title: "Error fetching deposits", variant: "destructive" });
      return;
    }

    const depositsWithProfiles = await Promise.all(
      depositsData.map(async (deposit) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, other_names, email")
          .eq("user_id", deposit.user_id)
          .single();

        return {
          ...deposit,
          profiles: profile,
        };
      })
    );

    setDeposits(depositsWithProfiles);
  };

  const handleApprove = async (deposit: DepositRequest) => {
    const { error: updateError } = await supabase
      .from("deposit_requests")
      .update({
        status: "approved",
        admin_notes: notes[deposit.id] || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deposit.id);

    if (updateError) {
      toast({ title: "Error approving deposit", variant: "destructive" });
      return;
    }

    const { data: wallet } = await supabase
      .from("wallets")
      .select("available_balance")
      .eq("user_id", deposit.user_id)
      .maybeSingle();

    const currentBalance = Number(wallet?.available_balance || 0);
    const newBalance = currentBalance + Number(deposit.amount);

    const { error: balanceError } = await supabase
      .from("wallets")
      .update({ available_balance: newBalance })
      .eq("user_id", deposit.user_id);

    if (balanceError) {
      toast({ title: "Error updating balance", variant: "destructive" });
      return;
    }

    // Update existing pending activity to completed using request_id in metadata
    const { data: pendingActivities } = await supabase
      .from("activities")
      .select("id")
      .eq("user_id", deposit.user_id)
      .eq("activity_type", "deposit")
      .eq("status", "pending");

    // Find the activity that matches this deposit's request_id
    if (pendingActivities) {
      for (const activity of pendingActivities) {
        const { data: activityData } = await supabase
          .from("activities")
          .select("metadata")
          .eq("id", activity.id)
          .single();
        
        const metadata = activityData?.metadata as { request_id?: string } | null;
        if (metadata?.request_id === deposit.id) {
          await supabase
            .from("activities")
            .update({ 
              status: "completed",
              description: `Deposit approved: $${deposit.amount} via ${deposit.method}`
            })
            .eq("id", activity.id);
          break;
        }
      }
    }

    toast({ title: "Deposit approved successfully" });
    fetchDeposits();
  };

  const handleDecline = async (deposit: DepositRequest) => {
    const { error } = await supabase
      .from("deposit_requests")
      .update({
        status: "declined",
        admin_notes: notes[deposit.id] || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deposit.id);

    if (error) {
      toast({ title: "Error declining deposit", variant: "destructive" });
      return;
    }

    // Update existing pending activity to declined using request_id in metadata
    const { data: pendingActivities } = await supabase
      .from("activities")
      .select("id")
      .eq("user_id", deposit.user_id)
      .eq("activity_type", "deposit")
      .eq("status", "pending");

    // Find the activity that matches this deposit's request_id
    if (pendingActivities) {
      for (const activity of pendingActivities) {
        const { data: activityData } = await supabase
          .from("activities")
          .select("metadata")
          .eq("id", activity.id)
          .single();
        
        const metadata = activityData?.metadata as { request_id?: string } | null;
        if (metadata?.request_id === deposit.id) {
          await supabase
            .from("activities")
            .update({ 
              status: "declined",
              description: `Deposit declined: $${deposit.amount} via ${deposit.method}`
            })
            .eq("id", activity.id);
          break;
        }
      }
    }

    toast({ title: "Deposit declined" });
    fetchDeposits();
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
          <h2 className="text-3xl font-bold tracking-tight">Deposit Requests</h2>
          <p className="text-muted-foreground">Review and approve user deposits</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Deposits</CardTitle>
            <CardDescription>
              Pending requests: {deposits.filter((d) => d.status === "pending").length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference/Screenshot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Admin Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {deposit.profiles?.first_name && deposit.profiles?.other_names ? `${deposit.profiles.first_name} ${deposit.profiles.other_names}` : deposit.profiles?.first_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {deposit.profiles?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      ${Number(deposit.amount).toLocaleString()}
                    </TableCell>
                     <TableCell>
                       <Badge variant="outline">{deposit.method}</Badge>
                     </TableCell>
                     <TableCell>
                       <div className="space-y-1">
                         {(deposit as any).transaction_reference && (
                           <div className="text-xs">
                             <span className="font-medium">Ref: </span>
                             {(deposit as any).transaction_reference}
                           </div>
                         )}
                         {(deposit as any).screenshot_url && (
                           <a 
                             href={(deposit as any).screenshot_url} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-xs text-primary hover:underline block"
                           >
                             View Screenshot
                           </a>
                         )}
                         {!(deposit as any).transaction_reference && !(deposit as any).screenshot_url && "—"}
                       </div>
                     </TableCell>
                     <TableCell>
                       <Badge
                         variant={
                           deposit.status === "approved"
                             ? "default"
                             : deposit.status === "declined"
                             ? "destructive"
                             : "secondary"
                         }
                       >
                         {deposit.status}
                       </Badge>
                     </TableCell>
                    <TableCell>
                      {new Date(deposit.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {deposit.status === "pending" ? (
                        <Textarea
                          placeholder="Add notes..."
                          value={notes[deposit.id] || ""}
                          onChange={(e) =>
                            setNotes({ ...notes, [deposit.id]: e.target.value })
                          }
                          className="min-h-[60px]"
                        />
                      ) : (
                        <p className="text-sm">{deposit.admin_notes || "—"}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {deposit.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(deposit)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDecline(deposit)}
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
