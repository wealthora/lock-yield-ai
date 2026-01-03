-- Add new columns to ai_bots table for enhanced investment plan features
ALTER TABLE public.ai_bots
ADD COLUMN IF NOT EXISTS max_investment numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS early_withdrawal_allowed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS early_withdrawal_penalty numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS auto_reinvest_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
ADD COLUMN IF NOT EXISTS roi_period text DEFAULT 'daily' CHECK (roi_period IN ('daily', 'weekly', 'monthly'));

-- Create enum for plan change action types
DO $$ BEGIN
    CREATE TYPE public.plan_change_action AS ENUM ('create', 'update', 'archive', 'activate', 'delete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create investment plan change logs table
CREATE TABLE IF NOT EXISTS public.investment_plan_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid REFERENCES public.ai_bots(id) ON DELETE CASCADE NOT NULL,
    changed_by uuid NOT NULL,
    action text NOT NULL,
    field_changed text,
    old_value text,
    new_value text,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on the logs table
ALTER TABLE public.investment_plan_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for investment_plan_logs
-- Admins can view all logs
CREATE POLICY "Admins can view all plan logs"
ON public.investment_plan_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert logs
CREATE POLICY "Admins can insert plan logs"
ON public.investment_plan_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_investment_plan_logs_plan_id ON public.investment_plan_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_investment_plan_logs_created_at ON public.investment_plan_logs(created_at DESC);

-- Update existing ai_bots RLS to allow admin full control
DROP POLICY IF EXISTS "Admins can manage all bots" ON public.ai_bots;
CREATE POLICY "Admins can manage all bots"
ON public.ai_bots
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can only view active bots
DROP POLICY IF EXISTS "Users can view active bots" ON public.ai_bots;
CREATE POLICY "Users can view active bots"
ON public.ai_bots
FOR SELECT
TO authenticated
USING (status = 'active' OR public.has_role(auth.uid(), 'admin'));