-- Add UPDATE policy for admins on activities table
CREATE POLICY "Admins can update activities" 
ON public.activities 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));