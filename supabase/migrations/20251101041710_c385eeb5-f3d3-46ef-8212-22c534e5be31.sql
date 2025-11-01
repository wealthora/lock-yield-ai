-- Add status column to activities table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activities' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.activities ADD COLUMN status TEXT DEFAULT 'completed';
  END IF;
END $$;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_user_type_status ON public.activities(user_id, activity_type, status);