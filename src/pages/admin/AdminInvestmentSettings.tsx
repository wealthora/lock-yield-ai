import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Archive, Eye, History, AlertTriangle, CheckCircle, Clock, Trash2 } from "lucide-react";
import { InvestmentPlanForm } from "@/components/admin/InvestmentPlanForm";
import { PlanPreviewCard } from "@/components/admin/PlanPreviewCard";
import { PlanChangeLog } from "@/components/admin/PlanChangeLog";

interface InvestmentPlan {
  id: string;
  name: string;
  description: string | null;
  daily_return_rate: number;
  minimum_investment: number;
  max_investment: number | null;
  duration_days: number;
  early_withdrawal_allowed: boolean;
  early_withdrawal_penalty: number;
  auto_reinvest_enabled: boolean;
  risk_level: string | null;
  strategy: string | null;
  status: string;
  roi_period: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AdminInvestmentSettings = () => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [previewPlan, setPreviewPlan] = useState<InvestmentPlan | null>(null);
  const [logsForPlan, setLogsForPlan] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; plan: InvestmentPlan } | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_bots")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const logChange = async (planId: string, action: string, fieldChanged?: string, oldValue?: string, newValue?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("investment_plan_logs").insert({
      plan_id: planId,
      changed_by: user.id,
      action,
      field_changed: fieldChanged,
      old_value: oldValue,
      new_value: newValue,
    });
  };

  const handleStatusChange = async (plan: InvestmentPlan, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("ai_bots")
        .update({ 
          status: newStatus, 
          is_active: newStatus === "active",
          updated_at: new Date().toISOString() 
        })
        .eq("id", plan.id);

      if (error) throw error;

      await logChange(plan.id, newStatus === "archived" ? "archive" : "activate", "status", plan.status, newStatus);

      toast({
        title: "Success",
        description: `Plan ${newStatus === "archived" ? "archived" : "activated"} successfully`,
      });

      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setConfirmAction(null);
  };

  const handleDeletePlan = async (plan: InvestmentPlan) => {
    try {
      // Check if plan has active investments
      const { data: investments } = await supabase
        .from("bot_investments")
        .select("id")
        .eq("bot_id", plan.id)
        .eq("status", "active")
        .limit(1);

      if (investments && investments.length > 0) {
        toast({
          title: "Cannot Delete",
          description: "This plan has active investments. Archive it instead.",
          variant: "destructive",
        });
        setConfirmAction(null);
        return;
      }

      const { error } = await supabase
        .from("ai_bots")
        .delete()
        .eq("id", plan.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });

      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setConfirmAction(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "draft":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case "archived":
        return <Badge className="bg-muted text-muted-foreground border-border"><Archive className="w-3 h-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRiskBadge = (riskLevel: string | null) => {
    switch (riskLevel?.toLowerCase()) {
      case "low":
        return <Badge variant="outline" className="border-green-500/30 text-green-500">Low Risk</Badge>;
      case "medium":
        return <Badge variant="outline" className="border-yellow-500/30 text-yellow-500">Medium Risk</Badge>;
      case "high":
        return <Badge variant="outline" className="border-red-500/30 text-red-500">High Risk</Badge>;
      default:
        return null;
    }
  };

  const filteredPlans = plans.filter(plan => {
    if (activeTab === "all") return true;
    return plan.status === activeTab;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Investment Plans</h1>
            <p className="text-muted-foreground">Manage investment products and ROI configurations</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Investment Plan</DialogTitle>
                <DialogDescription>
                  Set up a new investment plan with ROI configuration
                </DialogDescription>
              </DialogHeader>
              <InvestmentPlanForm
                onSuccess={() => {
                  setIsCreateOpen(false);
                  fetchPlans();
                }}
                onCancel={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{plans.length}</div>
              <p className="text-sm text-muted-foreground">Total Plans</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">
                {plans.filter(p => p.status === "active").length}
              </div>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-500">
                {plans.filter(p => p.status === "draft").length}
              </div>
              <p className="text-sm text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">
                {plans.filter(p => p.status === "archived").length}
              </div>
              <p className="text-sm text-muted-foreground">Archived</p>
            </CardContent>
          </Card>
        </div>

        {/* Plans Table */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Plans</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="draft">Drafts</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading plans...</div>
            ) : filteredPlans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {activeTab !== "all" ? activeTab : ""} plans found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>ROI</TableHead>
                      <TableHead>Min/Max Investment</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{plan.name}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {plan.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-primary">
                            {plan.daily_return_rate}%
                          </span>
                          <span className="text-sm text-muted-foreground ml-1">
                            /{plan.roi_period || "daily"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>${plan.minimum_investment.toLocaleString()}</div>
                            {plan.max_investment && (
                              <div className="text-muted-foreground">
                                Max: ${plan.max_investment.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{plan.duration_days} days</TableCell>
                        <TableCell>{getRiskBadge(plan.risk_level)}</TableCell>
                        <TableCell>{getStatusBadge(plan.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPreviewPlan(plan)}
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingPlan(plan)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLogsForPlan(plan.id)}
                              title="View History"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                            {plan.status !== "archived" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmAction({ type: "archive", plan })}
                                title="Archive"
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            )}
                            {plan.status === "archived" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmAction({ type: "activate", plan })}
                                title="Activate"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            {plan.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmAction({ type: "delete", plan })}
                                title="Delete"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Plan Dialog */}
        <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Investment Plan</DialogTitle>
              <DialogDescription>
                {editingPlan?.status === "active" && (
                  <span className="flex items-center gap-2 text-yellow-500 mt-2">
                    <AlertTriangle className="w-4 h-4" />
                    Some fields cannot be edited on active plans
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            {editingPlan && (
              <InvestmentPlanForm
                plan={editingPlan}
                onSuccess={() => {
                  setEditingPlan(null);
                  fetchPlans();
                }}
                onCancel={() => setEditingPlan(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewPlan} onOpenChange={(open) => !open && setPreviewPlan(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Plan Preview</DialogTitle>
              <DialogDescription>
                How this plan appears to users
              </DialogDescription>
            </DialogHeader>
            {previewPlan && <PlanPreviewCard plan={previewPlan} />}
          </DialogContent>
        </Dialog>

        {/* Change Log Dialog */}
        <Dialog open={!!logsForPlan} onOpenChange={(open) => !open && setLogsForPlan(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Change History</DialogTitle>
              <DialogDescription>
                All modifications made to this plan
              </DialogDescription>
            </DialogHeader>
            {logsForPlan && <PlanChangeLog planId={logsForPlan} />}
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction?.type === "archive" && "Archive Plan?"}
                {confirmAction?.type === "activate" && "Activate Plan?"}
                {confirmAction?.type === "delete" && "Delete Plan?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction?.type === "archive" && 
                  "Archived plans won't be visible to users. You can reactivate them later."}
                {confirmAction?.type === "activate" && 
                  "This will make the plan visible and available for investment."}
                {confirmAction?.type === "delete" && 
                  "This action cannot be undone. The plan will be permanently deleted."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!confirmAction) return;
                  if (confirmAction.type === "archive") {
                    handleStatusChange(confirmAction.plan, "archived");
                  } else if (confirmAction.type === "activate") {
                    handleStatusChange(confirmAction.plan, "active");
                  } else if (confirmAction.type === "delete") {
                    handleDeletePlan(confirmAction.plan);
                  }
                }}
                className={confirmAction?.type === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
              >
                {confirmAction?.type === "archive" && "Archive"}
                {confirmAction?.type === "activate" && "Activate"}
                {confirmAction?.type === "delete" && "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminInvestmentSettings;
