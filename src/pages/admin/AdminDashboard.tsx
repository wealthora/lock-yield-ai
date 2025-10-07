import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import AdminLayout from "@/components/admin/AdminLayout";
import StatsCard from "@/components/admin/StatsCard";
import { Users, Wallet, TrendingDown, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DashboardStats {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingTransactions: number;
}

export default function AdminDashboard() {
  const { isLoading } = useAdminCheck();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingTransactions: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    // Fetch user count
    const { count: userCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Fetch deposit stats
    const { data: deposits } = await supabase
      .from("deposit_requests")
      .select("amount, status");

    const totalDeposits = deposits
      ?.filter((d) => d.status === "approved")
      .reduce((sum, d) => sum + Number(d.amount), 0) || 0;

    // Fetch withdrawal stats
    const { data: withdrawals } = await supabase
      .from("withdrawal_requests")
      .select("amount, status");

    const totalWithdrawals = withdrawals
      ?.filter((w) => w.status === "approved")
      .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

    const pendingDeposits = deposits?.filter((d) => d.status === "pending").length || 0;
    const pendingWithdrawals = withdrawals?.filter((w) => w.status === "pending").length || 0;

    setStats({
      totalUsers: userCount || 0,
      totalDeposits,
      totalWithdrawals,
      pendingTransactions: pendingDeposits + pendingWithdrawals,
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  const chartData = [
    { name: "Mon", deposits: 4000, withdrawals: 2400 },
    { name: "Tue", deposits: 3000, withdrawals: 1398 },
    { name: "Wed", deposits: 2000, withdrawals: 9800 },
    { name: "Thu", deposits: 2780, withdrawals: 3908 },
    { name: "Fri", deposits: 1890, withdrawals: 4800 },
    { name: "Sat", deposits: 2390, withdrawals: 3800 },
    { name: "Sun", deposits: 3490, withdrawals: 4300 },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your platform.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            description="Registered platform users"
          />
          <StatsCard
            title="Total Deposits"
            value={`$${stats.totalDeposits.toLocaleString()}`}
            icon={Wallet}
            description="All approved deposits"
          />
          <StatsCard
            title="Total Withdrawals"
            value={`$${stats.totalWithdrawals.toLocaleString()}`}
            icon={TrendingDown}
            description="All approved withdrawals"
          />
          <StatsCard
            title="Pending Transactions"
            value={stats.pendingTransactions}
            icon={Activity}
            description="Awaiting approval"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Transaction Overview</CardTitle>
            <CardDescription>
              Deposits and withdrawals over the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="deposits"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="withdrawals"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
