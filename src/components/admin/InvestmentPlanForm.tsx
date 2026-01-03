import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Loader2 } from "lucide-react";
import { z } from "zod";

const planSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  daily_return_rate: z.number().min(0.01, "ROI must be at least 0.01%").max(100, "ROI cannot exceed 100%"),
  minimum_investment: z.number().min(1, "Minimum investment must be at least $1"),
  max_investment: z.number().nullable().optional(),
  duration_days: z.number().min(1, "Duration must be at least 1 day").max(365, "Duration cannot exceed 365 days"),
  early_withdrawal_allowed: z.boolean(),
  early_withdrawal_penalty: z.number().min(0).max(100),
  auto_reinvest_enabled: z.boolean(),
  risk_level: z.enum(["low", "medium", "high"]),
  strategy: z.string().max(200).optional(),
  status: z.enum(["draft", "active", "archived"]),
  roi_period: z.enum(["daily", "weekly", "monthly"]),
});

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

interface InvestmentPlanFormProps {
  plan?: InvestmentPlan;
  onSuccess: () => void;
  onCancel: () => void;
}

export const InvestmentPlanForm = ({ plan, onSuccess, onCancel }: InvestmentPlanFormProps) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const isEditing = !!plan;
  const isActive = plan?.status === "active";

  const [formData, setFormData] = useState({
    name: plan?.name || "",
    description: plan?.description || "",
    daily_return_rate: plan?.daily_return_rate || 1.5,
    minimum_investment: plan?.minimum_investment || 50,
    max_investment: plan?.max_investment || null,
    duration_days: plan?.duration_days || 30,
    early_withdrawal_allowed: plan?.early_withdrawal_allowed || false,
    early_withdrawal_penalty: plan?.early_withdrawal_penalty || 10,
    auto_reinvest_enabled: plan?.auto_reinvest_enabled || false,
    risk_level: plan?.risk_level || "medium",
    strategy: plan?.strategy || "",
    status: plan?.status || "draft",
    roi_period: plan?.roi_period || "daily",
  });

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

  const getChangedFields = () => {
    if (!plan) return [];
    const changes: { field: string; old: string; new: string }[] = [];

    Object.keys(formData).forEach((key) => {
      const oldVal = String(plan[key as keyof InvestmentPlan] ?? "");
      const newVal = String(formData[key as keyof typeof formData] ?? "");
      if (oldVal !== newVal) {
        changes.push({ field: key, old: oldVal, new: newVal });
      }
    });

    return changes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      // Validate
      const validated = planSchema.parse({
        ...formData,
        max_investment: formData.max_investment || null,
      });

      // Check max > min if max is set
      if (validated.max_investment && validated.max_investment <= validated.minimum_investment) {
        setErrors({ max_investment: "Maximum must be greater than minimum" });
        return;
      }

      setLoading(true);

      const dataToSave = {
        name: validated.name,
        description: validated.description || null,
        daily_return_rate: validated.daily_return_rate,
        minimum_investment: validated.minimum_investment,
        max_investment: validated.max_investment,
        duration_days: validated.duration_days,
        early_withdrawal_allowed: validated.early_withdrawal_allowed,
        early_withdrawal_penalty: validated.early_withdrawal_penalty,
        auto_reinvest_enabled: validated.auto_reinvest_enabled,
        risk_level: validated.risk_level,
        strategy: validated.strategy || null,
        status: validated.status,
        roi_period: validated.roi_period,
        is_active: validated.status === "active",
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        // For active plans, prevent changing critical fields
        if (isActive) {
          const criticalFields = ["daily_return_rate", "minimum_investment", "duration_days"];
          const changes = getChangedFields();
          const criticalChanges = changes.filter(c => criticalFields.includes(c.field));
          
          if (criticalChanges.length > 0) {
            toast({
              title: "Cannot Edit Critical Fields",
              description: "ROI rate, minimum investment, and duration cannot be changed on active plans. Archive the plan first.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }

        const { error } = await supabase
          .from("ai_bots")
          .update(dataToSave)
          .eq("id", plan.id);

        if (error) throw error;

        // Log all changes
        const changes = getChangedFields();
        for (const change of changes) {
          await logChange(plan.id, "update", change.field, change.old, change.new);
        }

        toast({ title: "Success", description: "Plan updated successfully" });
      } else {
        const { data, error } = await supabase
          .from("ai_bots")
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;

        await logChange(data.id, "create");

        toast({ title: "Success", description: "Plan created successfully" });
      }

      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[String(err.path[0])] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const criticalFieldsLocked = isEditing && isActive;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {criticalFieldsLocked && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Critical fields (ROI, min investment, duration) are locked on active plans</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div className="space-y-2">
          <Label htmlFor="name">Plan Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Bot Alpha"
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the investment plan..."
            rows={3}
          />
        </div>

        {/* ROI Configuration */}
        <div className="space-y-2">
          <Label htmlFor="daily_return_rate">ROI Rate (%) *</Label>
          <Input
            id="daily_return_rate"
            type="number"
            step="0.01"
            min="0.01"
            max="100"
            value={formData.daily_return_rate}
            onChange={(e) => setFormData({ ...formData, daily_return_rate: parseFloat(e.target.value) || 0 })}
            disabled={criticalFieldsLocked}
          />
          {errors.daily_return_rate && <p className="text-sm text-destructive">{errors.daily_return_rate}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="roi_period">ROI Period *</Label>
          <Select
            value={formData.roi_period}
            onValueChange={(v) => setFormData({ ...formData, roi_period: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Investment Limits */}
        <div className="space-y-2">
          <Label htmlFor="minimum_investment">Minimum Investment ($) *</Label>
          <Input
            id="minimum_investment"
            type="number"
            min="1"
            value={formData.minimum_investment}
            onChange={(e) => setFormData({ ...formData, minimum_investment: parseFloat(e.target.value) || 0 })}
            disabled={criticalFieldsLocked}
          />
          {errors.minimum_investment && <p className="text-sm text-destructive">{errors.minimum_investment}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_investment">Maximum Investment ($)</Label>
          <Input
            id="max_investment"
            type="number"
            min="0"
            value={formData.max_investment || ""}
            onChange={(e) => setFormData({ ...formData, max_investment: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="No limit"
          />
          {errors.max_investment && <p className="text-sm text-destructive">{errors.max_investment}</p>}
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="duration_days">Duration (days) *</Label>
          <Input
            id="duration_days"
            type="number"
            min="1"
            max="365"
            value={formData.duration_days}
            onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 1 })}
            disabled={criticalFieldsLocked}
          />
          {errors.duration_days && <p className="text-sm text-destructive">{errors.duration_days}</p>}
        </div>

        {/* Risk Level */}
        <div className="space-y-2">
          <Label htmlFor="risk_level">Risk Level *</Label>
          <Select
            value={formData.risk_level}
            onValueChange={(v) => setFormData({ ...formData, risk_level: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Strategy */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="strategy">Investment Strategy</Label>
          <Input
            id="strategy"
            value={formData.strategy}
            onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
            placeholder="e.g., Conservative growth, Aggressive trading..."
          />
        </div>

        {/* Early Withdrawal */}
        <div className="space-y-4 md:col-span-2 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Early Withdrawal</Label>
              <p className="text-sm text-muted-foreground">Users can withdraw before duration ends</p>
            </div>
            <Switch
              checked={formData.early_withdrawal_allowed}
              onCheckedChange={(v) => setFormData({ ...formData, early_withdrawal_allowed: v })}
            />
          </div>

          {formData.early_withdrawal_allowed && (
            <div className="space-y-2">
              <Label htmlFor="early_withdrawal_penalty">Penalty Rate (%)</Label>
              <Input
                id="early_withdrawal_penalty"
                type="number"
                min="0"
                max="100"
                value={formData.early_withdrawal_penalty}
                onChange={(e) => setFormData({ ...formData, early_withdrawal_penalty: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Percentage deducted from returns on early withdrawal
              </p>
            </div>
          )}
        </div>

        {/* Auto Reinvest */}
        <div className="space-y-4 md:col-span-2 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Reinvestment Option</Label>
              <p className="text-sm text-muted-foreground">Allow users to auto-reinvest at maturity</p>
            </div>
            <Switch
              checked={formData.auto_reinvest_enabled}
              onCheckedChange={(v) => setFormData({ ...formData, auto_reinvest_enabled: v })}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? "Update Plan" : "Create Plan"}
        </Button>
      </div>
    </form>
  );
};
