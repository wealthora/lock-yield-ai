import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  category: string;
  network: string | null;
  icon: string | null;
  min_deposit: number;
  max_deposit: number;
  min_withdrawal: number;
  max_withdrawal: number;
  fee_percent: number;
  processing_time: string;
  deposit_address: string | null;
  deposit_instructions: string | null;
  supports_deposit: boolean;
  supports_withdrawal: boolean;
  is_active: boolean;
  sort_order: number;
}

type Mode = "deposit" | "withdrawal";

interface Props {
  mode: Mode;
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentMethodsTable({ mode, onSelect }: Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "crypto" | "bank">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setMethods((data || []) as PaymentMethod[]);
      setLoading(false);
    })();
  }, []);

  const filtered = methods
    .filter((m) => (mode === "deposit" ? m.supports_deposit : m.supports_withdrawal))
    .filter((m) => filter === "all" || m.category === filter)
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  const minLabel = mode === "deposit" ? "min_deposit" : "min_withdrawal";
  const maxLabel = mode === "deposit" ? "max_deposit" : "max_withdrawal";

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 border-b border-border">
        <h3 className="text-base font-semibold">
          Select {mode === "deposit" ? "Deposit" : "Withdrawal"} Method
        </h3>
      </div>

      <div className="p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between border-b border-border">
        <div className="flex gap-2">
          {(["all", "crypto", "bank"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" ? "All Methods" : f === "crypto" ? "Crypto" : "Bank Transfer"}
            </button>
          ))}
        </div>
        <div className="relative md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search payment methods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wider">Method</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-center">Action</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">Limits</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-center">Fee</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">Processing Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  No payment methods available
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-base">
                        {m.icon || "💳"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.name}</p>
                        {m.network && (
                          <p className="text-xs text-muted-foreground">{m.network}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" onClick={() => onSelect(m)}>
                      {mode === "deposit" ? "Deposit" : "Withdraw"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    <div>Min: ${Number((m as any)[minLabel]).toLocaleString()}</div>
                    <div>Max: ${Number((m as any)[maxLabel]).toLocaleString()}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-normal">
                      {Number(m.fee_percent)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {m.processing_time}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
