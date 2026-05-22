
-- Helper: insert a notification row
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'general',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, metadata, is_read)
  VALUES (p_user_id, p_title, p_message, p_type, p_metadata, false);
END;
$$;

-- Deposits
CREATE OR REPLACE FUNCTION public.notify_deposit_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.create_notification(NEW.user_id, 'Deposit Approved',
        'Your deposit of $' || NEW.amount || ' has been approved and credited to your wallet.',
        'deposit', jsonb_build_object('request_id', NEW.id, 'amount', NEW.amount));
    ELSIF NEW.status IN ('declined','rejected') THEN
      PERFORM public.create_notification(NEW.user_id, 'Deposit Declined',
        'Your deposit of $' || NEW.amount || ' was declined.' ||
        COALESCE(' Reason: ' || NEW.admin_notes, ''),
        'deposit', jsonb_build_object('request_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_deposit_status ON public.deposit_requests;
CREATE TRIGGER trg_notify_deposit_status
AFTER UPDATE ON public.deposit_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_deposit_status_change();

-- Withdrawals
CREATE OR REPLACE FUNCTION public.notify_withdrawal_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.create_notification(NEW.user_id, 'Withdrawal Approved',
        'Your withdrawal of $' || NEW.amount || ' via ' || NEW.method || ' has been approved.',
        'withdrawal', jsonb_build_object('request_id', NEW.id, 'amount', NEW.amount));
    ELSIF NEW.status IN ('declined','rejected') THEN
      PERFORM public.create_notification(NEW.user_id, 'Withdrawal Declined',
        'Your withdrawal of $' || NEW.amount || ' was declined.' ||
        COALESCE(' Reason: ' || NEW.admin_notes, ''),
        'withdrawal', jsonb_build_object('request_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_withdrawal_status ON public.withdrawal_requests;
CREATE TRIGGER trg_notify_withdrawal_status
AFTER UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_withdrawal_status_change();

-- Profile change requests
CREATE OR REPLACE FUNCTION public.notify_profile_request_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.create_notification(NEW.user_id, 'Profile Update Approved',
        'Your profile change request has been approved and applied to your account.',
        'profile_update', jsonb_build_object('request_id', NEW.id));
    ELSIF NEW.status IN ('declined','rejected') THEN
      PERFORM public.create_notification(NEW.user_id, 'Profile Update Declined',
        'Your profile change request was declined.' ||
        COALESCE(' Reason: ' || NEW.admin_notes, ''),
        'profile_update', jsonb_build_object('request_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_profile_request_status ON public.profile_change_requests;
CREATE TRIGGER trg_notify_profile_request_status
AFTER UPDATE ON public.profile_change_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_profile_request_status_change();

-- Bot allocations (transactions of type bot_allocation)
CREATE OR REPLACE FUNCTION public.notify_transaction_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.type = 'bot_allocation' THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.create_notification(NEW.user_id, 'Bot Allocation Approved',
        'Your bot allocation of $' || NEW.amount || ' has been approved and is now active.',
        'bot_allocation', jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount));
    ELSIF NEW.status IN ('declined','rejected') THEN
      PERFORM public.create_notification(NEW.user_id, 'Bot Allocation Declined',
        'Your bot allocation request of $' || NEW.amount || ' was declined.' ||
        COALESCE(' Reason: ' || NEW.notes, ''),
        'bot_allocation', jsonb_build_object('transaction_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_transaction_status ON public.transactions;
CREATE TRIGGER trg_notify_transaction_status
AFTER UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_transaction_status_change();

-- KYC status changes (including revocation)
CREATE OR REPLACE FUNCTION public.notify_kyc_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    IF NEW.kyc_status = 'verified' THEN
      PERFORM public.create_notification(NEW.user_id, 'KYC Verified',
        'Congratulations! Your KYC verification has been approved.',
        'kyc', '{}'::jsonb);
    ELSIF NEW.kyc_status = 'rejected' THEN
      PERFORM public.create_notification(NEW.user_id, 'KYC Rejected',
        'Your KYC submission was rejected.' ||
        COALESCE(' Reason: ' || NEW.kyc_rejection_reason, '') ||
        ' Please resubmit your documents.',
        'kyc', '{}'::jsonb);
    ELSIF NEW.kyc_status = 'revoked' THEN
      PERFORM public.create_notification(NEW.user_id, 'KYC Verification Revoked',
        'Your KYC verification has been revoked by an administrator.' ||
        COALESCE(' Reason: ' || NEW.kyc_rejection_reason, '') ||
        ' Please resubmit your identity documents to regain verified status.',
        'kyc', '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_kyc_status ON public.profiles;
CREATE TRIGGER trg_notify_kyc_status
AFTER UPDATE OF kyc_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_kyc_status_change();
