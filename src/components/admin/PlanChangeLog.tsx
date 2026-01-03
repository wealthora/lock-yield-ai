import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowRight, Loader2 } from "lucide-react";

interface LogEntry {
  id: string;
  plan_id: string;
  changed_by: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

interface PlanChangeLogProps {
  planId: string;
}

export const PlanChangeLog = ({ planId }: PlanChangeLogProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [planId]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("investment_plan_logs")
        .select("*")
        .eq("plan_id", planId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map to LogEntry type
      const mappedLogs: LogEntry[] = (data || []).map(log => ({
        id: log.id,
        plan_id: log.plan_id,
        changed_by: log.changed_by,
        action: log.action,
        field_changed: log.field_changed,
        old_value: log.old_value,
        new_value: log.new_value,
        created_at: log.created_at,
      }));
      
      setLogs(mappedLogs);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "create":
        return <Badge className="bg-green-500/20 text-green-500">Created</Badge>;
      case "update":
        return <Badge className="bg-blue-500/20 text-blue-500">Updated</Badge>;
      case "archive":
        return <Badge className="bg-muted text-muted-foreground">Archived</Badge>;
      case "activate":
        return <Badge className="bg-green-500/20 text-green-500">Activated</Badge>;
      case "delete":
        return <Badge className="bg-red-500/20 text-red-500">Deleted</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatFieldName = (field: string | null) => {
    if (!field) return "-";
    return field
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No changes recorded yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                <div>
                  <div className="font-medium">
                    {format(new Date(log.created_at), "MMM d, yyyy")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "h:mm a")}
                  </div>
                </div>
              </TableCell>
              <TableCell>{getActionBadge(log.action)}</TableCell>
              <TableCell className="text-sm">
                {formatFieldName(log.field_changed)}
              </TableCell>
              <TableCell>
                {log.old_value || log.new_value ? (
                  <div className="flex items-center gap-2 text-sm">
                    {log.old_value && (
                      <span className="text-muted-foreground line-through">
                        {log.old_value.length > 20 
                          ? `${log.old_value.substring(0, 20)}...` 
                          : log.old_value}
                      </span>
                    )}
                    {log.old_value && log.new_value && (
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    )}
                    {log.new_value && (
                      <span className="font-medium">
                        {log.new_value.length > 20 
                          ? `${log.new_value.substring(0, 20)}...` 
                          : log.new_value}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
