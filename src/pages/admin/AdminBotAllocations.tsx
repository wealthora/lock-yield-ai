import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface BotAllocation {
  id: string;
  user_id: string;
  amount: number;
  bot_id: string | null;
  status: string;
  created_at: string;
  profiles: {
    first_name: string | null;
    other_names: string | null;
    email: string | null;
  } | null;
  bot: {
    name: string;
  } | null;
}

export default function AdminBotAllocations() {
  const { isLoading } = useAdminCheck();
  const [allocations, setAllocations] = useState<BotAllocation[]>([]);

  useEffect(() => {
    fetchAllocations();

    const channel = supabase
      .channel("allocation-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: "type=eq.bot_allocation" },
        () => fetchAllocations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAllocations = async () => {
    const { data: allocationsData, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("type", "bot_allocation")
      .order("created_at", { ascending: false });

    if (error || !allocationsData) {
      toast({ title: "Error fetching bot allocations", variant: "destructive" });
      return;
    }

    const allocationsWithDetails = await Promise.all(
      allocationsData.map(async (allocation) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, other_names, email")
          .eq("user_id", allocation.user_id)
          .single();

        let bot = null;
        if (allocation.bot_id) {
          const { data: botData } = await supabase
            .from("ai_bots")
            .select("name")
            .eq("id", allocation.bot_id)
            .single();
          bot = botData;
        }

        return {
          ...allocation,
          profiles: profile,
          bot,
        };
      })
    );

    setAllocations(allocationsWithDetails);
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
          <h2 className="text-3xl font-bold tracking-tight">Bot Allocations</h2>
          <p className="text-muted-foreground">View all user bot investments</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Bot Allocations</CardTitle>
            <CardDescription>
              Total allocations: {allocations.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Bot</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((allocation) => (
                  <TableRow key={allocation.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {allocation.profiles?.first_name && allocation.profiles?.other_names
                            ? `${allocation.profiles.first_name} ${allocation.profiles.other_names}`
                            : allocation.profiles?.first_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {allocation.profiles?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{allocation.bot?.name || "Unknown Bot"}</Badge>
                    </TableCell>
                    <TableCell className="font-bold">
                      ${Number(allocation.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={allocation.status === "approved" ? "default" : "secondary"}
                      >
                        {allocation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(allocation.created_at).toLocaleString()}
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
