import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface BotReturn {
  id: string;
  user_id: string;
  amount: number;
  bot_id: string | null;
  status: string;
  notes: string | null;
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

export default function AdminBotReturns() {
  const { isLoading } = useAdminCheck();
  const [returns, setReturns] = useState<BotReturn[]>([]);

  useEffect(() => {
    fetchReturns();

    const channel = supabase
      .channel("returns-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: "type=eq.bot_return_credit" },
        () => fetchReturns()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReturns = async () => {
    const { data: returnsData, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("type", "bot_return_credit")
      .order("created_at", { ascending: false });

    if (error || !returnsData) {
      toast({ title: "Error fetching bot returns", variant: "destructive" });
      return;
    }

    const returnsWithDetails = await Promise.all(
      returnsData.map(async (returnItem) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, other_names, email")
          .eq("user_id", returnItem.user_id)
          .single();

        let bot = null;
        if (returnItem.bot_id) {
          const { data: botData } = await supabase
            .from("ai_bots")
            .select("name")
            .eq("id", returnItem.bot_id)
            .single();
          bot = botData;
        }

        return {
          ...returnItem,
          profiles: profile,
          bot,
        };
      })
    );

    setReturns(returnsWithDetails);
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
          <h2 className="text-3xl font-bold tracking-tight">Bot Returns</h2>
          <p className="text-muted-foreground">View all bot return credits</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Bot Returns</CardTitle>
            <CardDescription>
              Total returns: {returns.length}
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
                  <TableHead>Notes</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((returnItem) => (
                  <TableRow key={returnItem.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {returnItem.profiles?.first_name && returnItem.profiles?.other_names
                            ? `${returnItem.profiles.first_name} ${returnItem.profiles.other_names}`
                            : returnItem.profiles?.first_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {returnItem.profiles?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{returnItem.bot?.name || "Unknown Bot"}</Badge>
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      +${Number(returnItem.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={returnItem.status === "approved" ? "default" : "secondary"}
                      >
                        {returnItem.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {returnItem.notes || "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(returnItem.created_at).toLocaleString()}
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
