import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PM {
  id?: string;
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

const empty: PM = {
  name: "",
  code: "",
  category: "crypto",
  network: "",
  icon: "💳",
  min_deposit: 50,
  max_deposit: 1000000,
  min_withdrawal: 10,
  max_withdrawal: 1000000,
  fee_percent: 0,
  processing_time: "Instant",
  deposit_address: "",
  deposit_instructions: "",
  supports_deposit: true,
  supports_withdrawal: true,
  is_active: true,
  sort_order: 0,
};

export default function AdminPaymentMethods() {
  const [items, setItems] = useState<PM[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PM>(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("payment_methods")
      .select("*")
      .order("sort_order");
    setItems((data || []) as PM[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const payload = { ...editing };
    if (!payload.name || !payload.code) {
      toast({ title: "Name and code required", variant: "destructive" });
      return;
    }
    const op = payload.id
      ? (supabase as any).from("payment_methods").update(payload).eq("id", payload.id)
      : (supabase as any).from("payment_methods").insert(payload);
    const { error } = await op;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    setOpen(false);
    setEditing(empty);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this payment method?")) return;
    const { error } = await (supabase as any).from("payment_methods").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Payment Methods</h1>
            <p className="text-sm text-muted-foreground">Manage deposit and withdrawal options</p>
          </div>
          <Button
            onClick={() => {
              setEditing(empty);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Method
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Limits (Dep / With)</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{m.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{m.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.code} {m.network && `· ${m.network}`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{m.category}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      ${m.min_deposit} / ${m.min_withdrawal}
                    </TableCell>
                    <TableCell className="text-sm">{m.fee_percent}%</TableCell>
                    <TableCell>
                      <Badge variant={m.is_active ? "default" : "secondary"}>
                        {m.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(m);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(m.id!)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit" : "Add"} Payment Method</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Code (unique)</Label>
                <Input
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={editing.category}
                  onValueChange={(v) => setEditing({ ...editing, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Network</Label>
                <Input
                  value={editing.network ?? ""}
                  onChange={(e) => setEditing({ ...editing, network: e.target.value })}
                  placeholder="TRC20, ERC20..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Icon (emoji)</Label>
                <Input
                  value={editing.icon ?? ""}
                  onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) =>
                    setEditing({ ...editing, sort_order: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Min Deposit</Label>
                <Input
                  type="number"
                  value={editing.min_deposit}
                  onChange={(e) =>
                    setEditing({ ...editing, min_deposit: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max Deposit</Label>
                <Input
                  type="number"
                  value={editing.max_deposit}
                  onChange={(e) =>
                    setEditing({ ...editing, max_deposit: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Min Withdrawal</Label>
                <Input
                  type="number"
                  value={editing.min_withdrawal}
                  onChange={(e) =>
                    setEditing({ ...editing, min_withdrawal: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max Withdrawal</Label>
                <Input
                  type="number"
                  value={editing.max_withdrawal}
                  onChange={(e) =>
                    setEditing({ ...editing, max_withdrawal: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fee %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editing.fee_percent}
                  onChange={(e) =>
                    setEditing({ ...editing, fee_percent: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Processing Time</Label>
                <Input
                  value={editing.processing_time}
                  onChange={(e) =>
                    setEditing({ ...editing, processing_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Deposit Address</Label>
                <Input
                  value={editing.deposit_address ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, deposit_address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Deposit Instructions</Label>
                <Textarea
                  rows={3}
                  value={editing.deposit_instructions ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, deposit_instructions: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center justify-between col-span-2 pt-2 border-t">
                <Label>Supports Deposit</Label>
                <Switch
                  checked={editing.supports_deposit}
                  onCheckedChange={(v) => setEditing({ ...editing, supports_deposit: v })}
                />
              </div>
              <div className="flex items-center justify-between col-span-2">
                <Label>Supports Withdrawal</Label>
                <Switch
                  checked={editing.supports_withdrawal}
                  onCheckedChange={(v) => setEditing({ ...editing, supports_withdrawal: v })}
                />
              </div>
              <div className="flex items-center justify-between col-span-2">
                <Label>Active</Label>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
