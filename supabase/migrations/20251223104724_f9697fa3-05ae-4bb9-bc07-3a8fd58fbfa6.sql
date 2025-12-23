-- Fix existing pending activities that correspond to declined deposits
UPDATE public.activities 
SET status = 'declined', 
    description = 'Deposit declined: $2000 via BTC'
WHERE id = '18e8a25e-9cac-4d54-9562-00ed3544cfa7';

-- Fix existing pending withdrawal that may need updating (check first)
UPDATE public.activities 
SET status = 'pending'
WHERE id = 'b9c3c517-1d3e-43b5-8a5e-d92c670659a2' 
AND status = 'pending';