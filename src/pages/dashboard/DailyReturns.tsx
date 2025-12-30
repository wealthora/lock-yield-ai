import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ReturnsChart } from "@/components/dashboard/ReturnsChart";
interface BotReturn {
  id: string;
  bot_id: string;
  date: string;
  daily_return: number;
  cumulative_return: number;
  ai_bots?: {
    name: string;
  };
}
export default function DailyReturns() {
  const [returns, setReturns] = useState<BotReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const {
    toast
  } = useToast();
  const loadReturns = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from("bot_returns").select(`
          *,
          ai_bots (
            name
          )
        `).eq("user_id", user.id).order("date", {
        ascending: false
      }).limit(30);
      if (error) throw error;
      setReturns(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const handleRefresh = () => {
    setRefreshing(true);
    loadReturns();
  };
  useEffect(() => {
    loadReturns();

    // Set up real-time subscription
    const channel = supabase.channel("bot_returns_changes").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "bot_returns"
    }, () => {
      console.log("Bot returns updated - reloading data");
      loadReturns();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Prepare chart data (last 7 days)
  const chartData = returns.slice(0, 7).map(r => ({
    date: r.date,
    dailyReturn: Number(r.daily_return),
    cumulativeReturn: Number(r.cumulative_return),
  }));
  const totalReturns = returns.reduce((sum, r) => sum + Number(r.daily_return), 0);
  const avgDailyReturn = returns.length > 0 ? totalReturns / returns.length : 0;
  if (loading) {
    return <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Returns</h1>
          <p className="text-muted-foreground mt-1">Track your bot performance over time</p>
        </div>
        
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Returns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${totalReturns.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Daily Return</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${avgDailyReturn.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Trading Days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {returns.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {returns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              7-Day Performance
            </CardTitle>
            <CardDescription>
              Cumulative returns over the last 7 trading days
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ReturnsChart data={chartData} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Return History</CardTitle>
          <CardDescription>
            Detailed daily returns from all your allocated bots
          </CardDescription>
        </CardHeader>
        <CardContent>
          {returns.length === 0 ? <div className="text-center py-12">
              <p className="text-muted-foreground">No returns data yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Returns will appear here once you allocate funds to trading bots
              </p>
            </div> : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bot</TableHead>
                  <TableHead className="text-right">Daily Return</TableHead>
                  <TableHead className="text-right">Total Returns</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map(returnData => <TableRow key={returnData.id}>
                    <TableCell>
                      {format(new Date(returnData.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {returnData.ai_bots?.name || "Unknown Bot"}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${Number(returnData.daily_return) >= 0 ? "text-primary" : "text-destructive"}`}>
                      {Number(returnData.daily_return) >= 0 ? "+" : ""}$
                      {Number(returnData.daily_return).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      ${Number(returnData.cumulative_return).toFixed(2)}
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>
    </div>;
}