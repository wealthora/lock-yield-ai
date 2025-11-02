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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  method: string | null;
  wallet_address: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  profiles: {
    name: string | null;
    email: string | null;
  } | null;
}

export default function AdminTransactions() {
  const { isLoading } = useAdminCheck();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel("transaction-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTransactions = async () => {
    const { data: transactionsData, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !transactionsData) {
      toast({ title: "Error fetching transactions", variant: "destructive" });
      return;
    }

    const transactionsWithProfiles = await Promise.all(
      transactionsData.map(async (transaction) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("user_id", transaction.user_id)
          .maybeSingle();

        return {
          ...transaction,
          profiles: profile,
        };
      })
    );

    setTransactions(transactionsWithProfiles);
  };

  const handleApprove = async (transaction: Transaction) => {
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "approved",
        notes: notes[transaction.id] || transaction.notes,
      })
      .eq("id", transaction.id);

    if (updateError) {
      toast({ title: "Error approving transaction", variant: "destructive" });
      return;
    }

    await supabase.from("activities").insert({
      user_id: transaction.user_id,
      activity_type: transaction.type,
      description: `${transaction.type === 'withdrawal' ? 'Withdrawal' : 'Transaction'} approved: $${transaction.amount}`,
      amount: transaction.amount,
      method: transaction.method,
    });

    toast({ title: "Transaction approved successfully" });
    fetchTransactions();
  };

  const handleReject = async (transaction: Transaction) => {
    const { error } = await supabase
      .from("transactions")
      .update({
        status: "rejected",
        notes: notes[transaction.id] || transaction.notes,
      })
      .eq("id", transaction.id);

    if (error) {
      toast({ title: "Error rejecting transaction", variant: "destructive" });
    } else {
      toast({ title: "Transaction rejected" });
      fetchTransactions();
    }
  };

  const filterByType = (type: string | null) => {
    if (!type) return transactions;
    return transactions.filter((t) => t.type === type);
  };

  const TransactionTable = ({ data }: { data: Transaction[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Wallet/Details</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>
              <div>
                <p className="font-medium">
                  {transaction.profiles?.name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {transaction.profiles?.email}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {transaction.type.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell className="font-bold">
              ${Number(transaction.amount).toLocaleString()}
            </TableCell>
            <TableCell>
              {transaction.method ? (
                <Badge variant="secondary">{transaction.method}</Badge>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {transaction.wallet_address || "—"}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  transaction.status === "approved"
                    ? "default"
                    : transaction.status === "rejected"
                    ? "destructive"
                    : "secondary"
                }
              >
                {transaction.status}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(transaction.created_at).toLocaleString()}
            </TableCell>
            <TableCell>
              {transaction.status === "pending" ? (
                <Textarea
                  placeholder="Add notes..."
                  value={notes[transaction.id] || ""}
                  onChange={(e) =>
                    setNotes({ ...notes, [transaction.id]: e.target.value })
                  }
                  className="min-h-[60px]"
                />
              ) : (
                <p className="text-sm">{transaction.notes || "—"}</p>
              )}
            </TableCell>
            <TableCell>
              {transaction.status === "pending" && transaction.type === "withdrawal" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleApprove(transaction)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(transaction)}
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
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div>Loading...</div>
      </AdminLayout>
    );
  }

  const pendingWithdrawals = transactions.filter(
    (t) => t.type === "withdrawal" && t.status === "pending"
  ).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">
            Manage all user transactions and withdrawals
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
            <CardDescription>
              Pending withdrawals: {pendingWithdrawals}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
                <TabsTrigger value="bot_allocation">Bot Allocations</TabsTrigger>
                <TabsTrigger value="bot_return_credit">Returns</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <TransactionTable data={transactions} />
              </TabsContent>
              <TabsContent value="withdrawal" className="mt-4">
                <TransactionTable data={filterByType("withdrawal")} />
              </TabsContent>
              <TabsContent value="bot_allocation" className="mt-4">
                <TransactionTable data={filterByType("bot_allocation")} />
              </TabsContent>
              <TabsContent value="bot_return_credit" className="mt-4">
                <TransactionTable data={filterByType("bot_return_credit")} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
