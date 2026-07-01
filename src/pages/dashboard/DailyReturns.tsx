import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TrendingUp, CalendarIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ReturnsChart } from "@/components/dashboard/ReturnsChart";

interface BotReturn {
  id: string;
  bot_id: string;
  date: string;
  daily_return: number;
  cumulative_return: number;
  ai_bots?: { name: string };
}

type PresetKey = "all" | "7" | "30" | "90" | "month" | "custom";

export default function DailyReturns() {
  const [returns, setReturns] = useState<BotReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<PresetKey>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { toast } = useToast();

  const loadReturns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("bot_returns")
        .select(`*, ai_bots (name)`)
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (error) throw error;
      setReturns(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
    const channel = supabase.channel("bot_returns_changes").on("postgres_changes", {
      event: "*", schema: "public", table: "bot_returns"
    }, () => loadReturns()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handlePresetChange = (value: PresetKey) => {
    setPreset(value);
    const now = new Date();
    if (value === "all") {
      setDateRange(undefined);
    } else if (value === "month") {
      setDateRange({ from: new Date(now.getFullYear(), now.getMonth(), 1), to: now });
    } else if (value !== "custom") {
      const days = parseInt(value, 10);
      const start = new Date();
      start.setDate(start.getDate() - days);
      setDateRange({ from: start, to: now });
    }
  };

  const filteredReturns = useMemo(() => {
    if (!dateRange?.from) return returns;
    const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
    const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    to.setHours(23, 59, 59, 999);
    return returns.filter(r => {
      const d = new Date(r.date);
      return d >= from && d <= to;
    });
  }, [returns, dateRange]);

  const chartData = useMemo(() => {
    return [...filteredReturns].slice(0, 30).map(r => ({
      date: r.date,
      dailyReturn: Number(r.daily_return),
      cumulativeReturn: Number(r.cumulative_return),
    }));
  }, [filteredReturns]);

  const totalReturns = filteredReturns.reduce((s, r) => s + Number(r.daily_return), 0);
  const avgDailyReturn = filteredReturns.length > 0 ? totalReturns / filteredReturns.length : 0;

  const rangeLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`
      : format(dateRange.from, "MMM d, yyyy")
    : "All time";

  const clearFilters = () => { setPreset("all"); setDateRange(undefined); };

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

    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Filter by Date</CardTitle>
        <CardDescription>Showing: {rangeLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={preset} onValueChange={(v) => handlePresetChange(v as PresetKey)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")
                ) : <span>Pick a date range</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => { setDateRange(range); setPreset("custom"); }}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {(preset !== "all" || dateRange) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Earned {dateRange?.from ? "(Selected Range)" : "(All Time)"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            ${totalReturns.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{rangeLabel}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardDescription>Average Daily Return</CardDescription></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${avgDailyReturn.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardDescription>Trading Days in Range</CardDescription></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{filteredReturns.length}</div>
        </CardContent>
      </Card>
    </div>

    {chartData.length > 0 && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />Performance
          </CardTitle>
          <CardDescription>Cumulative returns for {rangeLabel}</CardDescription>
        </CardHeader>
        <CardContent className="pt-2"><ReturnsChart data={chartData} /></CardContent>
      </Card>
    )}

    <Card>
      <CardHeader>
        <CardTitle>Return History</CardTitle>
        <CardDescription>Detailed daily returns from all your allocated bots</CardDescription>
      </CardHeader>
      <CardContent>
        {filteredReturns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No returns data for this period</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting the date range</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bot</TableHead>
                <TableHead className="text-right">Daily Return</TableHead>
                <TableHead className="text-right">Total Returns</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReturns.map(r => <TableRow key={r.id}>
                <TableCell>{format(new Date(r.date), "MMM dd, yyyy")}</TableCell>
                <TableCell className="font-medium">{r.ai_bots?.name || "Unknown Bot"}</TableCell>
                <TableCell className={`text-right font-semibold ${Number(r.daily_return) >= 0 ? "text-primary" : "text-destructive"}`}>
                  {Number(r.daily_return) >= 0 ? "+" : ""}${Number(r.daily_return).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  ${Number(r.cumulative_return).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
                </TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  </div>;
}
