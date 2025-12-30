import { useMemo } from "react";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";

interface ReturnDataPoint {
  date: string;
  dailyReturn: number;
  cumulativeReturn: number;
}

interface ReturnsChartProps {
  data: ReturnDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as ReturnDataPoint;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
      <p className="text-xs text-muted-foreground mb-1.5">
        {format(new Date(data.date), "MMMM d, yyyy")}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Daily Return</span>
          <span className={`text-sm font-semibold ${data.dailyReturn >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {data.dailyReturn >= 0 ? '+' : ''}${data.dailyReturn.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Cumulative</span>
          <span className={`text-sm font-semibold ${data.cumulativeReturn >= 0 ? 'text-primary' : 'text-destructive'}`}>
            ${data.cumulativeReturn.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export function ReturnsChart({ data }: ReturnsChartProps) {
  const isMobile = useIsMobile();

  const chartData = useMemo(() => {
    if (!data.length) return [];
    return [...data].reverse();
  }, [data]);

  const yAxisDomain = useMemo(() => {
    if (!chartData.length) return [0, 100];
    const values = chartData.map(d => d.cumulativeReturn);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 10;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData]);

  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    return isMobile ? format(date, "M/d") : format(date, "MMM d");
  };

  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No return data available
      </div>
    );
  }

  const chartHeight = isMobile ? 200 : 280;

  return (
    <div className="w-full">
      {!isMobile && (
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-primary rounded-full" />
            <span>Cumulative Returns</span>
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: isMobile ? 10 : 20,
            left: isMobile ? -10 : 0,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            tick={{ fontSize: isMobile ? 10 : 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
            tickMargin={8}
            interval={chartData.length <= 7 ? 0 : "preserveStartEnd"}
          />
          <YAxis
            domain={yAxisDomain}
            tickFormatter={formatYAxis}
            tick={{ fontSize: isMobile ? 10 : 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            width={isMobile ? 45 : 60}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: "hsl(var(--muted-foreground))",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />
          <Line
            type="monotone"
            dataKey="cumulativeReturn"
            stroke="url(#lineGradient)"
            strokeWidth={2.5}
            dot={{
              fill: "hsl(var(--background))",
              stroke: "hsl(var(--primary))",
              strokeWidth: 2,
              r: chartData.length === 1 ? 6 : 4,
            }}
            activeDot={{
              fill: "hsl(var(--primary))",
              stroke: "hsl(var(--background))",
              strokeWidth: 2,
              r: 6,
            }}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
