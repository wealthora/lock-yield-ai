-- Backfill: Update activities whose corresponding withdrawal_requests have been approved
UPDATE activities
SET status = 'completed',
    description = CONCAT('Withdrawal approved: $', (
      SELECT wr.amount FROM withdrawal_requests wr 
      WHERE wr.id::text = activities.metadata->>'request_id'
    ), ' via ', (
      SELECT wr.method FROM withdrawal_requests wr 
      WHERE wr.id::text = activities.metadata->>'request_id'
    ))
WHERE activity_type = 'withdrawal'
  AND status = 'pending'
  AND metadata->>'request_id' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM withdrawal_requests wr 
    WHERE wr.id::text = activities.metadata->>'request_id' 
    AND wr.status = 'approved'
  );

-- Backfill: Update activities whose corresponding withdrawal_requests have been declined
UPDATE activities
SET status = 'rejected',
    description = CONCAT('Withdrawal rejected: $', (
      SELECT wr.amount FROM withdrawal_requests wr 
      WHERE wr.id::text = activities.metadata->>'request_id'
    ), ' via ', (
      SELECT wr.method FROM withdrawal_requests wr 
      WHERE wr.id::text = activities.metadata->>'request_id'
    ))
WHERE activity_type = 'withdrawal'
  AND status = 'pending'
  AND metadata->>'request_id' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM withdrawal_requests wr 
    WHERE wr.id::text = activities.metadata->>'request_id' 
    AND wr.status = 'declined'
  );

-- Backfill: Update activities whose corresponding deposit_requests have been approved
UPDATE activities
SET status = 'completed',
    description = CONCAT('Deposit approved: $', (
      SELECT dr.amount FROM deposit_requests dr 
      WHERE dr.id::text = activities.metadata->>'request_id'
    ), ' via ', (
      SELECT dr.method FROM deposit_requests dr 
      WHERE dr.id::text = activities.metadata->>'request_id'
    ))
WHERE activity_type = 'deposit'
  AND status = 'pending'
  AND metadata->>'request_id' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM deposit_requests dr 
    WHERE dr.id::text = activities.metadata->>'request_id' 
    AND dr.status = 'approved'
  );

-- Backfill: Update activities whose corresponding deposit_requests have been declined
UPDATE activities
SET status = 'declined',
    description = CONCAT('Deposit declined: $', (
      SELECT dr.amount FROM deposit_requests dr 
      WHERE dr.id::text = activities.metadata->>'request_id'
    ), ' via ', (
      SELECT dr.method FROM deposit_requests dr 
      WHERE dr.id::text = activities.metadata->>'request_id'
    ))
WHERE activity_type = 'deposit'
  AND status = 'pending'
  AND metadata->>'request_id' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM deposit_requests dr 
    WHERE dr.id::text = activities.metadata->>'request_id' 
    AND dr.status = 'declined'
  );