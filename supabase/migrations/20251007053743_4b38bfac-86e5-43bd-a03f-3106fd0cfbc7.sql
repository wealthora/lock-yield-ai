-- Create user_roles table using the existing app_role enum
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function with proper type
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Create deposit_requests table
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own deposits" ON public.deposit_requests;
DROP POLICY IF EXISTS "Users can create deposit requests" ON public.deposit_requests;
DROP POLICY IF EXISTS "Admins can view all deposits" ON public.deposit_requests;
DROP POLICY IF EXISTS "Admins can update deposits" ON public.deposit_requests;

CREATE POLICY "Users can view their own deposits"
ON public.deposit_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create deposit requests"
ON public.deposit_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all deposits"
ON public.deposit_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update deposits"
ON public.deposit_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  method TEXT NOT NULL,
  wallet_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can create withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update withdrawals" ON public.withdrawal_requests;

CREATE POLICY "Users can view their own withdrawals"
ON public.withdrawal_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawal requests"
ON public.withdrawal_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawal_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update withdrawals"
ON public.withdrawal_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Update balances RLS for admin access
DROP POLICY IF EXISTS "Admins can view all balances" ON public.balances;
DROP POLICY IF EXISTS "Admins can update all balances" ON public.balances;

CREATE POLICY "Admins can view all balances"
ON public.balances FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update all balances"
ON public.balances FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Update profiles RLS for admin access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Update activities RLS for admin access
DROP POLICY IF EXISTS "Admins can view all activities" ON public.activities;

CREATE POLICY "Admins can view all activities"
ON public.activities FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));