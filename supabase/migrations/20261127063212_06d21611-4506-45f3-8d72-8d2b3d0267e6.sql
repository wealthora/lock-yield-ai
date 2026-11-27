ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kitepay_reserved_balance numeric(20,2) NOT NULL DEFAULT 0;
ALTER TABLE public.bot_investments ADD COLUMN IF NOT EXISTS reinvestment_source_id uuid;
ALTER TABLE public.bot_investments ADD CONSTRAINT bot_investments_reinvestment_source_id_key UNIQUE (reinvestment_source_id);
ALTER TABLE public.referral_rewards ADD COLUMN IF NOT EXISTS reversed_at timestamptz;
ALTER TABLE public.referral_rewards ADD COLUMN IF NOT EXISTS reversal_transfer_id uuid;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'bot_allocation'::text, 'bot_return_credit'::text, 'kitepay_reversal'::text]));

CREATE TABLE public.kitepay_customer_links (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  kitepay_customer_id text NOT NULL UNIQUE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kitepay_customer_id_nonempty CHECK (length(btrim(kitepay_customer_id)) BETWEEN 1 AND 128)
);
GRANT SELECT ON public.kitepay_customer_links TO authenticated;
GRANT ALL ON public.kitepay_customer_links TO service_role;
ALTER TABLE public.kitepay_customer_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can read their own KitePay link" ON public.kitepay_customer_links FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.kitepay_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  kitepay_customer_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('deposit','withdrawal')),
  status text NOT NULL CHECK (status IN ('INITIATED','PENDING','RESERVED','PROCESSING','COMPLETED','FAILED','CANCELLED','REVERSAL_PENDING','REVERSED')),
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  idempotency_key text NOT NULL UNIQUE,
  external_reference text UNIQUE,
  deposit_request_id uuid REFERENCES public.deposit_requests(id) ON DELETE SET NULL,
  withdrawal_request_id uuid REFERENCES public.withdrawal_requests(id) ON DELETE SET NULL,
  destination_wallet text,
  failure_reason text,
  webhook_delivery_status text NOT NULL DEFAULT 'not_configured' CHECK (webhook_delivery_status IN ('not_configured','pending','sent','failed')),
  webhook_attempts integer NOT NULL DEFAULT 0 CHECK (webhook_attempts >= 0),
  last_webhook_at timestamptz,
  last_webhook_error text,
  completed_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kitepay_amount_two_decimals CHECK (amount = round(amount,2))
);
GRANT SELECT ON public.kitepay_transfers TO authenticated;
GRANT ALL ON public.kitepay_transfers TO service_role;
ALTER TABLE public.kitepay_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers and admins can read KitePay transfers" ON public.kitepay_transfers FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.kitepay_transfer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.kitepay_transfers(id) ON DELETE RESTRICT,
  provider_event_id text UNIQUE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  actor text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kitepay_transfer_events TO authenticated;
GRANT ALL ON public.kitepay_transfer_events TO service_role;
ALTER TABLE public.kitepay_transfer_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read KitePay transfer events" ON public.kitepay_transfer_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.kitepay_request_nonces (
  nonce text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kitepay_nonce_length CHECK (length(nonce) BETWEEN 12 AND 128)
);
GRANT ALL ON public.kitepay_request_nonces TO service_role;
ALTER TABLE public.kitepay_request_nonces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.kitepay_rate_limits (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  PRIMARY KEY (bucket_key, window_start)
);
GRANT ALL ON public.kitepay_rate_limits TO service_role;
ALTER TABLE public.kitepay_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX kitepay_transfers_user_created_idx ON public.kitepay_transfers (user_id, created_at DESC);
CREATE INDEX kitepay_transfers_status_created_idx ON public.kitepay_transfers (status, created_at DESC);
CREATE INDEX kitepay_transfer_events_transfer_created_idx ON public.kitepay_transfer_events (transfer_id, created_at DESC);

ALTER TABLE public.referral_rewards ADD CONSTRAINT referral_rewards_reversal_transfer_id_fkey FOREIGN KEY (reversal_transfer_id) REFERENCES public.kitepay_transfers(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.kitepay_check_rate_limit(p_bucket_key text, p_window_seconds integer, p_max_requests integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_window_start timestamptz;
  v_hits integer;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_bucket_key IS NULL OR length(p_bucket_key) NOT BETWEEN 1 AND 160 OR p_window_seconds NOT BETWEEN 1 AND 3600 OR p_max_requests NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters' USING ERRCODE = '22023';
  END IF;
  v_window_start := to_timestamp(floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds);
  INSERT INTO public.kitepay_rate_limits (bucket_key, window_start, hit_count)
  VALUES (p_bucket_key, v_window_start, 1)
  ON CONFLICT (bucket_key, window_start) DO UPDATE SET hit_count = public.kitepay_rate_limits.hit_count + 1
  RETURNING hit_count INTO v_hits;
  DELETE FROM public.kitepay_request_nonces WHERE expires_at < clock_timestamp() - interval '1 day';
  RETURN v_hits <= p_max_requests;
END;
$function$;
REVOKE ALL ON FUNCTION public.kitepay_check_rate_limit(text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kitepay_check_rate_limit(text,integer,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.kitepay_link_customer(p_user_id uuid, p_kitepay_customer_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_link public.kitepay_customer_links%ROWTYPE;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_kitepay_customer_id IS NULL OR length(btrim(p_kitepay_customer_id)) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION 'Invalid customer link' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.kitepay_customer_links (user_id, kitepay_customer_id)
  VALUES (p_user_id, btrim(p_kitepay_customer_id))
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_link FROM public.kitepay_customer_links WHERE user_id = p_user_id FOR UPDATE;
  IF v_link.kitepay_customer_id <> btrim(p_kitepay_customer_id) THEN
    RAISE EXCEPTION 'Wealthora customer is already linked to a different KitePay account' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.kitepay_customer_links WHERE kitepay_customer_id = btrim(p_kitepay_customer_id) AND user_id <> p_user_id) THEN
    RAISE EXCEPTION 'KitePay customer is already linked to a different Wealthora account' USING ERRCODE = '23505';
  END IF;
  UPDATE public.kitepay_customer_links SET updated_at = now() WHERE user_id = p_user_id;
  RETURN jsonb_build_object('linked', true, 'wealthora_user_id', p_user_id, 'kitepay_customer_id', v_link.kitepay_customer_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.kitepay_link_customer(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kitepay_link_customer(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.kitepay_create_transfer(p_user_id uuid, p_direction text, p_amount numeric, p_currency text, p_idempotency_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_method public.payment_methods%ROWTYPE;
  v_link public.kitepay_customer_links%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_transfer public.kitepay_transfers%ROWTYPE;
  v_request_id uuid;
  v_pending numeric(20,2);
  v_withdrawable numeric(20,2);
  v_status text;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_direction NOT IN ('deposit','withdrawal') OR p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount,2) OR p_currency <> 'USD' OR p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'Invalid transfer details' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_transfer FROM public.kitepay_transfers WHERE idempotency_key = btrim(p_idempotency_key);
  IF FOUND THEN
    IF v_transfer.user_id <> p_user_id OR v_transfer.direction <> p_direction OR v_transfer.amount <> p_amount OR v_transfer.currency <> p_currency THEN
      RAISE EXCEPTION 'Idempotency key was already used for different transfer details' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('id',v_transfer.id,'reference',v_transfer.reference,'user_id',v_transfer.user_id,'direction',v_transfer.direction,'status',v_transfer.status,'amount',v_transfer.amount,'currency',v_transfer.currency,'destination_wallet',v_transfer.destination_wallet,'created_at',v_transfer.created_at,'completed_at',v_transfer.completed_at,'failure_reason',v_transfer.failure_reason,'webhook_delivery_status',v_transfer.webhook_delivery_status,'idempotent_replay',true);
  END IF;
  SELECT * INTO v_method FROM public.payment_methods WHERE lower(code) = 'kitepay' LIMIT 1;
  IF NOT FOUND OR NOT v_method.is_active THEN
    RAISE EXCEPTION 'KitePay is not enabled by Wealthora administration' USING ERRCODE = '55000';
  END IF;
  IF (p_direction = 'deposit' AND (NOT v_method.supports_deposit OR p_amount < v_method.min_deposit OR p_amount > v_method.max_deposit)) OR (p_direction = 'withdrawal' AND (NOT v_method.supports_withdrawal OR p_amount < v_method.min_withdrawal OR p_amount > v_method.max_withdrawal)) THEN
    RAISE EXCEPTION 'Amount is outside the active KitePay limits' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_link FROM public.kitepay_customer_links WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wealthora account is not linked to a KitePay customer' USING ERRCODE = '23503';
  END IF;
  v_status := CASE WHEN p_direction = 'withdrawal' THEN 'RESERVED' ELSE 'INITIATED' END;
  INSERT INTO public.kitepay_transfers (reference,user_id,kitepay_customer_id,direction,status,amount,currency,idempotency_key,destination_wallet,webhook_delivery_status)
  VALUES ('KPW-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,18)),p_user_id,v_link.kitepay_customer_id,p_direction,v_status,p_amount,p_currency,btrim(p_idempotency_key),CASE WHEN p_direction='withdrawal' THEN v_link.kitepay_customer_id ELSE NULL END,'not_configured')
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING * INTO v_transfer;
  IF NOT FOUND THEN
    SELECT * INTO v_transfer FROM public.kitepay_transfers WHERE idempotency_key = btrim(p_idempotency_key);
    IF v_transfer.user_id <> p_user_id OR v_transfer.direction <> p_direction OR v_transfer.amount <> p_amount OR v_transfer.currency <> p_currency THEN
      RAISE EXCEPTION 'Idempotency key was already used for different transfer details' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('id',v_transfer.id,'reference',v_transfer.reference,'user_id',v_transfer.user_id,'direction',v_transfer.direction,'status',v_transfer.status,'amount',v_transfer.amount,'currency',v_transfer.currency,'destination_wallet',v_transfer.destination_wallet,'created_at',v_transfer.created_at,'completed_at',v_transfer.completed_at,'failure_reason',v_transfer.failure_reason,'webhook_delivery_status',v_transfer.webhook_delivery_status,'idempotent_replay',true);
  END IF;
  IF p_direction = 'withdrawal' THEN
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Wealthora wallet was not found' USING ERRCODE = 'P0002'; END IF;
    SELECT coalesce(sum(amount),0) INTO v_pending FROM public.withdrawal_requests WHERE user_id = p_user_id AND status = 'pending' AND lower(method) <> 'kitepay';
    v_withdrawable := v_wallet.available_balance - v_pending;
    IF v_withdrawable < p_amount THEN RAISE EXCEPTION 'Insufficient withdrawable balance' USING ERRCODE = '22023'; END IF;
    UPDATE public.wallets SET available_balance = available_balance - p_amount, kitepay_reserved_balance = kitepay_reserved_balance + p_amount, updated_at = now() WHERE user_id = p_user_id;
    INSERT INTO public.withdrawal_requests (user_id,amount,method,wallet_address,status) VALUES (p_user_id,p_amount,'KitePay',v_link.kitepay_customer_id,'pending') RETURNING id INTO v_request_id;
    UPDATE public.kitepay_transfers SET withdrawal_request_id = v_request_id WHERE id = v_transfer.id RETURNING * INTO v_transfer;
    INSERT INTO public.activities (user_id,activity_type,description,amount,method,status,metadata) VALUES (p_user_id,'withdrawal','KitePay withdrawal reserved: $' || to_char(p_amount,'FM999999999999990.00'),p_amount,'KitePay','pending',jsonb_build_object('request_id',v_request_id,'kitepay_reference',v_transfer.reference));
  ELSE
    INSERT INTO public.deposit_requests (user_id,amount,method,status,transaction_reference) VALUES (p_user_id,p_amount,'KitePay','pending',v_transfer.reference) RETURNING id INTO v_request_id;
    UPDATE public.kitepay_transfers SET deposit_request_id = v_request_id WHERE id = v_transfer.id RETURNING * INTO v_transfer;
    INSERT INTO public.activities (user_id,activity_type,description,amount,method,status,metadata) VALUES (p_user_id,'deposit','KitePay deposit initiated: $' || to_char(p_amount,'FM999999999999990.00'),p_amount,'KitePay','pending',jsonb_build_object('request_id',v_request_id,'kitepay_reference',v_transfer.reference));
  END IF;
  INSERT INTO public.kitepay_transfer_events (transfer_id,event_type,from_status,to_status,actor,details) VALUES (v_transfer.id,'transfer.created',NULL,v_transfer.status,'wealthora_user',jsonb_build_object('direction',v_transfer.direction,'amount',v_transfer.amount,'currency',v_transfer.currency));
  RETURN jsonb_build_object('id',v_transfer.id,'reference',v_transfer.reference,'user_id',v_transfer.user_id,'direction',v_transfer.direction,'status',v_transfer.status,'amount',v_transfer.amount,'currency',v_transfer.currency,'destination_wallet',v_transfer.destination_wallet,'created_at',v_transfer.created_at,'completed_at',v_transfer.completed_at,'failure_reason',v_transfer.failure_reason,'webhook_delivery_status',v_transfer.webhook_delivery_status,'idempotent_replay',false);
END;
$function$;
REVOKE ALL ON FUNCTION public.kitepay_create_transfer(uuid,text,numeric,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kitepay_create_transfer(uuid,text,numeric,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.kitepay_apply_transfer_event(p_reference text,p_action text,p_amount numeric,p_currency text,p_provider_event_id text,p_external_reference text DEFAULT NULL,p_target_status text DEFAULT NULL,p_failure_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_transfer public.kitepay_transfers%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_reward public.referral_rewards%ROWTYPE;
  v_referrer_balance numeric(20,2);
  v_old_status text;
  v_next_status text;
  v_activity_status text;
  v_event_exists boolean;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_reference IS NULL OR length(p_reference) NOT BETWEEN 4 AND 64 OR p_action NOT IN ('progress','confirm','release','fail','deposit_credit','deposit_reverse') OR p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount,2) OR p_currency <> 'USD' OR p_provider_event_id IS NULL OR length(btrim(p_provider_event_id)) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'Invalid transfer event' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_transfer FROM public.kitepay_transfers WHERE reference = btrim(p_reference) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer reference was not found' USING ERRCODE = 'P0002'; END IF;
  IF v_transfer.amount <> p_amount OR v_transfer.currency <> p_currency THEN RAISE EXCEPTION 'Transfer amount or currency does not match the reserved request' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.kitepay_transfer_events WHERE provider_event_id = btrim(p_provider_event_id) AND transfer_id <> v_transfer.id) THEN RAISE EXCEPTION 'Provider event ID was already used for another transfer' USING ERRCODE = '23505'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.kitepay_transfer_events WHERE provider_event_id = btrim(p_provider_event_id) AND transfer_id = v_transfer.id) INTO v_event_exists;
  IF v_event_exists AND NOT (p_action = 'deposit_reverse' AND v_transfer.status = 'REVERSAL_PENDING') THEN
    RETURN jsonb_build_object('id',v_transfer.id,'reference',v_transfer.reference,'direction',v_transfer.direction,'status',v_transfer.status,'amount',v_transfer.amount,'currency',v_transfer.currency,'completed_at',v_transfer.completed_at,'reversed_at',v_transfer.reversed_at,'failure_reason',v_transfer.failure_reason,'idempotent_replay',true);
  END IF;
  v_old_status := v_transfer.status;
  IF p_action = 'progress' THEN
    IF p_target_status NOT IN ('PENDING','PROCESSING') OR v_transfer.status IN ('COMPLETED','FAILED','CANCELLED','REVERSED','REVERSAL_PENDING') OR (v_transfer.status = 'RESERVED' AND p_target_status <> 'PROCESSING') OR (v_transfer.status = 'PENDING' AND p_target_status = 'PENDING') THEN
      RAISE EXCEPTION 'Invalid transfer state transition' USING ERRCODE = '22023';
    END IF;
    v_next_status := p_target_status;
    UPDATE public.kitepay_transfers SET status = v_next_status, failure_reason = NULL WHERE id = v_transfer.id RETURNING * INTO v_transfer;
  ELSIF p_action = 'confirm' THEN
    IF v_transfer.direction <> 'withdrawal' OR v_transfer.status NOT IN ('RESERVED','PROCESSING') THEN RAISE EXCEPTION 'Only reserved or processing withdrawals can be confirmed' USING ERRCODE = '22023'; END IF;
    UPDATE public.wallets SET kitepay_reserved_balance = kitepay_reserved_balance - v_transfer.amount, updated_at = now() WHERE user_id = v_transfer.user_id AND kitepay_reserved_balance >= v_transfer.amount;
    IF NOT FOUND THEN RAISE EXCEPTION 'Reserved withdrawal balance is inconsistent' USING ERRCODE = '23514'; END IF;
    UPDATE public.withdrawal_requests SET status = 'approved', updated_at = now() WHERE id = v_transfer.withdrawal_request_id AND status = 'pending';
    UPDATE public.activities SET status = 'completed', description = 'KitePay withdrawal completed: $' || to_char(v_transfer.amount,'FM999999999999990.00') WHERE user_id = v_transfer.user_id AND activity_type = 'withdrawal' AND metadata->>'request_id' = v_transfer.withdrawal_request_id::text;
    v_next_status := 'COMPLETED';
    UPDATE public.kitepay_transfers SET status = v_next_status, external_reference = coalesce(nullif(btrim(p_external_reference),''),external_reference), completed_at = now(), failure_reason = NULL WHERE id = v_transfer.id RETURNING * INTO v_transfer;
  ELSIF p_action = 'release' THEN
    IF v_transfer.direction <> 'withdrawal' OR v_transfer.status NOT IN ('RESERVED','PROCESSING') OR p_target_status NOT IN ('FAILED','CANCELLED') THEN RAISE EXCEPTION 'Only reserved withdrawals can be released as failed or cancelled' USING ERRCODE = '22023'; END IF;
    UPDATE public.wallets SET available_balance = available_balance + v_transfer.amount, kitepay_reserved_balance = kitepay_reserved_balance - v_transfer.amount, updated_at = now() WHERE user_id = v_transfer.user_id AND kitepay_reserved_balance >= v_transfer.amount;
    IF NOT FOUND THEN RAISE EXCEPTION 'Reserved withdrawal balance is inconsistent' USING ERRCODE = '23514'; END IF;
    v_activity_status := CASE WHEN p_target_status = 'CANCELLED' THEN 'declined' ELSE 'rejected' END;
    UPDATE public.withdrawal_requests SET status = v_activity_status, admin_notes = left(coalesce(p_failure_reason,'KitePay transfer released'),500), updated_at = now() WHERE id = v_transfer.withdrawal_request_id AND status = 'pending';
    UPDATE public.activities SET status = v_activity_status, description = 'KitePay withdrawal ' || lower(p_target_status) || ': $' || to_char(v_transfer.amount,'FM999999999999990.00') WHERE user_id = v_transfer.user_id AND activity_type = 'withdrawal' AND metadata->>'request_id' = v_transfer.withdrawal_request_id::text;
    v_next_status := p_target_status;
    UPDATE public.kitepay_transfers SET status = v_next_status, failure_reason = left(coalesce(p_failure_reason,'KitePay transfer released'),500) WHERE id = v_transfer.id RETURNING * INTO v_transfer;
  ELSIF p_action = 'fail' THEN
    IF v_transfer.direction <> 'deposit' OR v_transfer.status NOT IN ('INITIATED','PENDING','PROCESSING') OR p_target_status NOT IN ('FAILED','CANCELLED') THEN RAISE EXCEPTION 'Only uncredited deposits can be marked failed or cancelled' USING ERRCODE = '22023'; END IF;
    v_activity_status := CASE WHEN p_target_status = 'CANCELLED' THEN 'declined' ELSE 'rejected' END;
    UPDATE public.deposit_requests SET status = 'declined', admin_notes = left(coalesce(p_failure_reason,'KitePay deposit failed'),500), updated_at = now() WHERE id = v_transfer.deposit_request_id AND status = 'pending';
    UPDATE public.activities SET status = v_activity_status, description = 'KitePay deposit ' || lower(p_target_status) || ': $' || to_char(v_transfer.amount,'FM999999999999990.00') WHERE user_id = v_transfer.user_id AND activity_type = 'deposit' AND metadata->>'request_id' = v_transfer.deposit_request_id::text;
    v_next_status := p_target_status;
    UPDATE public.kitepay_transfers SET status = v_next_status, failure_reason = left(coalesce(p_failure_reason,'KitePay deposit failed'),500) WHERE id = v_transfer.id RETURNING * INTO v_transfer;
  ELSIF p_action = 'deposit_credit' THEN
    IF v_transfer.direction <> 'deposit' OR v_transfer.status NOT IN ('INITIATED','PENDING','PROCESSING') THEN RAISE EXCEPTION 'Only initiated or pending deposits can be credited' USING ERRCODE = '22023'; END IF;
    IF p_external_reference IS NULL OR length(btrim(p_external_reference)) NOT BETWEEN 1 AND 128 THEN RAISE EXCEPTION 'KitePay transaction reference is required' USING ERRCODE = '22023'; END IF;
    IF EXISTS (SELECT 1 FROM public.kitepay_transfers WHERE external_reference = btrim(p_external_reference) AND id <> v_transfer.id) THEN RAISE EXCEPTION 'KitePay transaction reference was already processed' USING ERRCODE = '23505'; END IF;
    UPDATE public.deposit_requests SET status = 'approved', transaction_reference = btrim(p_external_reference), updated_at = now() WHERE id = v_transfer.deposit_request_id AND status = 'pending';
    IF NOT FOUND THEN RAISE EXCEPTION 'Deposit request is no longer pending' USING ERRCODE = '23514'; END IF;
    UPDATE public.wallets SET available_balance = available_balance + v_transfer.amount, updated_at = now() WHERE user_id = v_transfer.user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Wealthora wallet was not found' USING ERRCODE = 'P0002'; END IF;
    UPDATE public.activities SET status = 'completed', description = 'KitePay deposit completed: $' || to_char(v_transfer.amount,'FM999999999999990.00') WHERE user_id = v_transfer.user_id AND activity_type = 'deposit' AND metadata->>'request_id' = v_transfer.deposit_request_id::text;
    v_next_status := 'COMPLETED';
    UPDATE public.kitepay_transfers SET status = v_next_status, external_reference = btrim(p_external_reference), completed_at = now(), failure_reason = NULL WHERE id = v_transfer.id RETURNING * INTO v_transfer;
  ELSIF p_action = 'deposit_reverse' THEN
    IF v_transfer.direction <> 'deposit' OR v_transfer.status NOT IN ('COMPLETED','REVERSAL_PENDING') THEN RAISE EXCEPTION 'Only completed deposits can be reversed' USING ERRCODE = '22023'; END IF;
    SELECT * INTO v_reward FROM public.referral_rewards WHERE referred_id = v_transfer.user_id AND reversed_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    PERFORM 1 FROM public.wallets WHERE user_id = v_transfer.user_id OR user_id = v_reward.referrer_id ORDER BY user_id FOR UPDATE;
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_transfer.user_id;
    IF NOT FOUND OR v_wallet.available_balance < v_transfer.amount THEN
      v_next_status := 'REVERSAL_PENDING';
      UPDATE public.kitepay_transfers SET status = v_next_status, failure_reason = 'Reversal requires reconciliation: available balance is insufficient' WHERE id = v_transfer.id RETURNING * INTO v_transfer;
      IF NOT v_event_exists THEN INSERT INTO public.kitepay_transfer_events (transfer_id,provider_event_id,event_type,from_status,to_status,actor,details) VALUES (v_transfer.id,btrim(p_provider_event_id),'deposit.reversal_pending',v_old_status,v_next_status,'kitepay_api',jsonb_build_object('reason',v_transfer.failure_reason)); END IF;
      RETURN jsonb_build_object('id',v_transfer.id,'reference',v_transfer.reference,'direction',v_transfer.direction,'status',v_transfer.status,'amount',v_transfer.amount,'currency',v_transfer.currency,'requires_reconciliation',true,'failure_reason',v_transfer.failure_reason);
    END IF;
    IF v_reward.id IS NOT NULL THEN
      SELECT available_balance INTO v_referrer_balance FROM public.wallets WHERE user_id = v_reward.referrer_id;
      IF v_referrer_balance IS NULL OR v_referrer_balance < v_reward.reward_amount THEN
        v_next_status := 'REVERSAL_PENDING';
        UPDATE public.kitepay_transfers SET status = v_next_status, failure_reason = 'Reversal requires reconciliation: referral reward is no longer available' WHERE id = v_transfer.id RETURNING * INTO v_transfer;
        IF NOT v_event_exists THEN INSERT INTO public.kitepay_transfer_events (transfer_id,provider_event_id,event_type,from_status,to_status,actor,details) VALUES (v_transfer.id,btrim(p_provider_event_id),'deposit.reversal_pending',v_old_status,v_next_status,'kitepay_api',jsonb_build_object('reason',v_transfer.failure_reason)); END IF;
        RETURN jsonb_build_object('id',v_transfer.id,'reference',v_transfer.reference,'direction',v_transfer.direction,'status',v_transfer.status,'amount',v_transfer.amount,'currency',v_transfer.currency,'requires_reconciliation',true,'failure_reason',v_transfer.failure_reason);
      END IF;
    END IF;
    UPDATE public.wallets SET available_balance = available_balance - v_transfer.amount, updated_at = now() WHERE user_id = v_transfer.user_id AND available_balance >= v_transfer.amount;
    IF NOT FOUND THEN RAISE EXCEPTION 'Available balance changed during reversal' USING ERRCODE = '40001'; END IF;
    IF v_reward.id IS NOT NULL THEN
      UPDATE public.wallets SET available_balance = available_balance - v_reward.reward_amount, updated_at = now() WHERE user_id = v_reward.referrer_id AND available_balance >= v_reward.reward_amount;
      IF NOT FOUND THEN RAISE EXCEPTION 'Referral reward balance changed during reversal' USING ERRCODE = '40001'; END IF;
      UPDATE public.referral_rewards SET reversed_at = now(), reversal_transfer_id = v_transfer.id WHERE id = v_reward.id;
    END IF;
    UPDATE public.deposit_requests SET status = 'reversed', admin_notes = left('KitePay deposit reversed: ' || btrim(coalesce(p_failure_reason,'provider reversal')),500), updated_at = now() WHERE id = v_transfer.deposit_request_id;
    UPDATE public.activities SET status = 'reversed', description = 'KitePay deposit reversed: $' || to_char(v_transfer.amount,'FM999999999999990.00') WHERE user_id = v_transfer.user_id AND activity_type = 'deposit' AND metadata->>'request_id' = v_transfer.deposit_request_id::text;
    INSERT INTO public.transactions (user_id,type,amount,status,notes,method,processed_at) VALUES (v_transfer.user_id,'kitepay_reversal',v_transfer.amount,'approved','Compensating reversal for KitePay transfer ' || v_transfer.reference,'KitePay',now());
    v_next_status := 'REVERSED';
    UPDATE public.kitepay_transfers SET status = v_next_status, reversed_at = now(), failure_reason = NULL WHERE id = v_transfer.id RETURNING * INTO v_transfer;
    PERFORM public.create_notification(v_transfer.user_id,'KitePay Deposit Reversed','A KitePay deposit reversal was recorded for $' || to_char(v_transfer.amount,'FM999999999999990.00') || '.','deposit',jsonb_build_object('reference',v_transfer.reference));
  END IF;
  IF NOT v_event_exists THEN
    INSERT INTO public.kitepay_transfer_events (transfer_id,provider_event_id,event_type,from_status,to_status,actor,details)
    VALUES (v_transfer.id,btrim(p_provider_event_id),'transfer.' || p_action,v_old_status,v_transfer.status,'kitepay_api',jsonb_build_object('external_reference',p_external_reference,'target_status',p_target_status,'failure_reason',left(p_failure_reason,500)));
  ELSE
    INSERT INTO public.kitepay_transfer_events (transfer_id,event_type,from_status,to_status,actor,details)
    VALUES (v_transfer.id,'transfer.deposit_reverse_retry',v_old_status,v_transfer.status,'kitepay_api',jsonb_build_object('external_reference',p_external_reference,'failure_reason',left(p_failure_reason,500)));
  END IF;
  RETURN jsonb_build_object('id',v_transfer.id,'reference',v_transfer.reference,'direction',v_transfer.direction,'status',v_transfer.status,'amount',v_transfer.amount,'currency',v_transfer.currency,'completed_at',v_transfer.completed_at,'reversed_at',v_transfer.reversed_at,'failure_reason',v_transfer.failure_reason,'idempotent_replay',false);
END;
$function$;
REVOKE ALL ON FUNCTION public.kitepay_apply_transfer_event(text,text,numeric,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kitepay_apply_transfer_event(text,text,numeric,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.kitepay_record_webhook_delivery(p_reference text,p_status text,p_error text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_transfer public.kitepay_transfers%ROWTYPE;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'Service authentication required' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('not_configured','pending','sent','failed') THEN RAISE EXCEPTION 'Invalid webhook status' USING ERRCODE = '22023'; END IF;
  UPDATE public.kitepay_transfers SET webhook_delivery_status = p_status, webhook_attempts = webhook_attempts + CASE WHEN p_status IN ('pending','sent','failed') THEN 1 ELSE 0 END, last_webhook_at = CASE WHEN p_status = 'not_configured' THEN last_webhook_at ELSE now() END, last_webhook_error = left(p_error,500) WHERE reference = p_reference RETURNING * INTO v_transfer;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer reference was not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.kitepay_transfer_events (transfer_id,event_type,from_status,to_status,actor,details) VALUES (v_transfer.id,'webhook.' || p_status,v_transfer.status,v_transfer.status,'wealthora_webhook',jsonb_build_object('error',left(p_error,500),'attempt',v_transfer.webhook_attempts));
  RETURN jsonb_build_object('reference',v_transfer.reference,'webhook_delivery_status',v_transfer.webhook_delivery_status,'webhook_attempts',v_transfer.webhook_attempts,'last_webhook_at',v_transfer.last_webhook_at,'last_webhook_error',v_transfer.last_webhook_error);
END;
$function$;
REVOKE ALL ON FUNCTION public.kitepay_record_webhook_delivery(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kitepay_record_webhook_delivery(text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.create_bot_investment(p_user_id uuid,p_bot_id uuid,p_amount numeric,p_lock_days integer,p_auto_reinvest boolean,p_reinvestment_source_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_bot public.ai_bots%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_investment public.bot_investments%ROWTYPE;
  v_pending numeric(20,2);
  v_effective numeric(20,2);
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not authorized for this account' USING ERRCODE = '42501'; END IF;
  IF p_user_id IS NULL OR p_bot_id IS NULL OR p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount,2) OR p_lock_days IS NULL OR p_lock_days < 1 THEN RAISE EXCEPTION 'Invalid investment details' USING ERRCODE = '22023'; END IF;
  IF p_reinvestment_source_id IS NOT NULL THEN
    SELECT * INTO v_investment FROM public.bot_investments WHERE reinvestment_source_id = p_reinvestment_source_id;
    IF FOUND THEN RETURN jsonb_build_object('id',v_investment.id,'user_id',v_investment.user_id,'bot_id',v_investment.bot_id,'initial_amount',v_investment.initial_amount,'end_date',v_investment.end_date,'idempotent_replay',true); END IF;
  END IF;
  SELECT * INTO v_bot FROM public.ai_bots WHERE id = p_bot_id AND is_active = true AND coalesce(status,'active') NOT IN ('archived','inactive');
  IF NOT FOUND THEN RAISE EXCEPTION 'Investment plan is not active' USING ERRCODE = '22023'; END IF;
  IF p_amount < v_bot.minimum_investment OR (v_bot.max_investment IS NOT NULL AND p_amount > v_bot.max_investment) OR p_lock_days < v_bot.minimum_lockup_days THEN RAISE EXCEPTION 'Investment amount or lock period is outside plan terms' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wealthora wallet was not found' USING ERRCODE = 'P0002'; END IF;
  SELECT coalesce(sum(amount),0) INTO v_pending FROM public.withdrawal_requests WHERE user_id = p_user_id AND status = 'pending' AND lower(method) <> 'kitepay';
  v_effective := v_wallet.available_balance - v_pending;
  IF v_effective < p_amount THEN RAISE EXCEPTION 'Insufficient available balance after pending withdrawals' USING ERRCODE = '22023'; END IF;
  UPDATE public.wallets SET available_balance = available_balance - p_amount, locked_balance = locked_balance + p_amount, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO public.bot_investments (user_id,bot_id,initial_amount,locked_amount,accumulated_returns,daily_return_rate,start_date,end_date,status,auto_reinvest,reinvestment_source_id)
  VALUES (p_user_id,p_bot_id,p_amount,p_amount,0,v_bot.daily_return_rate,now(),now()+make_interval(days => p_lock_days),'active',coalesce(p_auto_reinvest,false) AND coalesce(v_bot.auto_reinvest_enabled,false),p_reinvestment_source_id)
  ON CONFLICT (reinvestment_source_id) DO NOTHING RETURNING * INTO v_investment;
  IF NOT FOUND THEN
    SELECT * INTO v_investment FROM public.bot_investments WHERE reinvestment_source_id = p_reinvestment_source_id;
    IF FOUND THEN RAISE EXCEPTION 'Investment retry detected after balance update; transaction aborted for safe retry' USING ERRCODE = '40001'; END IF;
    RAISE EXCEPTION 'Investment could not be created' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.transactions (user_id,type,amount,status,bot_id,allocation_id) VALUES (p_user_id,'bot_allocation',p_amount,'approved',p_bot_id,v_investment.id);
  INSERT INTO public.activities (user_id,activity_type,description,amount,status,metadata) VALUES (p_user_id,'bot_allocation','Allocated $' || to_char(p_amount,'FM999999999999990.00') || ' to ' || v_bot.name,p_amount,'approved',jsonb_build_object('request_id',v_investment.id));
  RETURN jsonb_build_object('id',v_investment.id,'user_id',v_investment.user_id,'bot_id',v_investment.bot_id,'initial_amount',v_investment.initial_amount,'end_date',v_investment.end_date,'idempotent_replay',false);
END;
$function$;
REVOKE ALL ON FUNCTION public.create_bot_investment(uuid,uuid,numeric,integer,boolean,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_bot_investment(uuid,uuid,numeric,integer,boolean,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_approve_deposit_request(p_request_id uuid,p_admin_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_request public.deposit_requests%ROWTYPE;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' AND NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_request FROM public.deposit_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending' THEN RAISE EXCEPTION 'Deposit request is not pending' USING ERRCODE = '23514'; END IF;
  IF lower(v_request.method) = 'kitepay' THEN RAISE EXCEPTION 'KitePay transfers are finalized through verified callbacks' USING ERRCODE = '42501'; END IF;
  UPDATE public.deposit_requests SET status='approved',admin_notes=left(p_admin_notes,500),updated_at=now() WHERE id=p_request_id;
  UPDATE public.wallets SET available_balance=available_balance+v_request.amount,updated_at=now() WHERE user_id=v_request.user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wealthora wallet was not found' USING ERRCODE = 'P0002'; END IF;
  UPDATE public.activities SET status='completed',description='Deposit approved: $' || to_char(v_request.amount,'FM999999999999990.00') || ' via ' || v_request.method WHERE user_id=v_request.user_id AND activity_type='deposit' AND metadata->>'request_id'=p_request_id::text;
  RETURN jsonb_build_object('request_id',p_request_id,'status','approved','amount',v_request.amount);
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_approve_deposit_request(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit_request(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal_request(p_request_id uuid,p_admin_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_request public.withdrawal_requests%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' AND NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal request is not pending' USING ERRCODE = '23514'; END IF;
  IF lower(v_request.method) = 'kitepay' THEN RAISE EXCEPTION 'KitePay transfers are finalized through verified callbacks' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id=v_request.user_id FOR UPDATE;
  IF NOT FOUND OR v_wallet.available_balance < v_request.amount THEN RAISE EXCEPTION 'Insufficient available balance to approve this withdrawal' USING ERRCODE = '22023'; END IF;
  UPDATE public.wallets SET available_balance=available_balance-v_request.amount,updated_at=now() WHERE user_id=v_request.user_id;
  UPDATE public.withdrawal_requests SET status='approved',admin_notes=left(p_admin_notes,500),updated_at=now() WHERE id=p_request_id;
  UPDATE public.activities SET status='completed',description='Withdrawal approved: $' || to_char(v_request.amount,'FM999999999999990.00') || ' via ' || v_request.method WHERE user_id=v_request.user_id AND activity_type='withdrawal' AND metadata->>'request_id'=p_request_id::text;
  RETURN jsonb_build_object('request_id',p_request_id,'status','approved','amount',v_request.amount);
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_approve_withdrawal_request(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal_request(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.prevent_client_kitepay_request_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF lower(coalesce(NEW.method,''))='kitepay' AND current_user NOT IN ('postgres','service_role') THEN
    RAISE EXCEPTION 'KitePay requests must be created and finalized through the verified integration' USING ERRCODE = '42501';
  END IF;
  IF TG_OP='UPDATE' AND lower(coalesce(OLD.method,''))='kitepay' AND current_user NOT IN ('postgres','service_role') AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.amount IS DISTINCT FROM OLD.amount OR NEW.method IS DISTINCT FROM OLD.method OR NEW.status IS DISTINCT FROM OLD.status OR NEW.wallet_address IS DISTINCT FROM OLD.wallet_address OR NEW.transaction_reference IS DISTINCT FROM OLD.transaction_reference) THEN
    RAISE EXCEPTION 'KitePay request details are managed by the verified integration' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.prevent_client_kitepay_request_mutation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_kitepay_deposit_requests BEFORE INSERT OR UPDATE ON public.deposit_requests FOR EACH ROW EXECUTE FUNCTION public.prevent_client_kitepay_request_mutation();
CREATE TRIGGER protect_kitepay_withdrawal_requests BEFORE INSERT OR UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.prevent_client_kitepay_request_mutation();

CREATE OR REPLACE FUNCTION public.process_transaction_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    NEW.processed_at = now();
    IF NEW.type = 'withdrawal' THEN
      UPDATE public.wallets SET available_balance = available_balance - NEW.amount, updated_at = now() WHERE user_id = NEW.user_id AND available_balance >= NEW.amount;
      IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient available balance to approve this withdrawal transaction' USING ERRCODE = '22023'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_kitepay_customer_link_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
CREATE TRIGGER update_kitepay_customer_link_timestamp BEFORE UPDATE ON public.kitepay_customer_links FOR EACH ROW EXECUTE FUNCTION public.update_kitepay_customer_link_updated_at();
CREATE TRIGGER update_kitepay_transfers_timestamp BEFORE UPDATE ON public.kitepay_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

REVOKE INSERT, UPDATE ON public.wallets FROM authenticated;
DROP POLICY IF EXISTS "Users can update their own balance" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert their own balance" ON public.wallets;
REVOKE INSERT ON public.bot_investments FROM authenticated;
DROP POLICY IF EXISTS "Users can create their own investments" ON public.bot_investments;
REVOKE INSERT ON public.transactions FROM authenticated;
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;

INSERT INTO public.payment_methods (name,code,category,network,icon,min_deposit,max_deposit,min_withdrawal,max_withdrawal,fee_percent,processing_time,deposit_address,deposit_instructions,supports_deposit,supports_withdrawal,is_active,sort_order,created_at,updated_at)
SELECT 'KitePay','kitepay','bank',NULL,'KP',50,1000000,10,1000000,0,'Instant',NULL,'KitePay transfers are unavailable until the server integration is configured and an administrator activates the method.',true,true,false,90,now(),now()
WHERE NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE lower(code)='kitepay');

REVOKE ALL ON FUNCTION public.credit_expired_investment(uuid,numeric,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_expired_investment(uuid,numeric,numeric) TO service_role;
REVOKE ALL ON FUNCTION public.increment_returns_balance(uuid,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_returns_balance(uuid,numeric) TO service_role;