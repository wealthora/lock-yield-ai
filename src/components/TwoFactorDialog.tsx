import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, CheckCircle2, Mail, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TwoFactorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purpose: 'login' | 'withdrawal' | 'settings';
  onVerified: () => void;
}

export function TwoFactorDialog({ open, onOpenChange, purpose, onVerified }: TwoFactorDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Auto-send code when dialog opens
  useEffect(() => {
    if (open && !codeSent) {
      sendCode();
    }
    // Reset state when dialog closes
    if (!open) {
      setCode('');
      setCodeSent(false);
      setMaskedEmail('');
      setError('');
    }
  }, [open]);

  const sendCode = async () => {
    setResending(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('send-2fa-code', {
        body: { purpose },
      });

      if (invokeError) {
        console.error('Function invoke error:', invokeError);
        throw new Error(invokeError.message || 'Failed to send verification code');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setCodeSent(true);
      if (data?.email) {
        setMaskedEmail(data.email);
      }

      toast({
        title: "Code Sent",
        description: data?.message || "A verification code has been sent to your email.",
      });
    } catch (err: any) {
      console.error('Send code error:', err);
      setError(err.message || 'Failed to send verification code');
      toast({
        title: "Error",
        description: err.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { code, purpose },
      });

      if (error) throw error;

      if (data?.verified) {
        toast({
          title: "Verified",
          description: "Two-factor authentication successful",
        });
        onVerified();
        onOpenChange(false);
        setCode('');
      } else {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect or expired",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">Two-Factor Authentication</DialogTitle>
          <DialogDescription className="text-center">
            {codeSent 
              ? `Enter the 6-digit code sent to ${maskedEmail || 'your email'}`
              : 'Sending verification code to your email...'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Status Alert */}
          {codeSent && !error && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Code sent successfully! Check your inbox.
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Sending state */}
          {resending && !codeSent && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Sending code to your email...</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
              disabled={!codeSent}
            />
            <p className="text-xs text-muted-foreground text-center">
              Code expires in 10 minutes
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleVerify}
            disabled={loading || code.length !== 6 || !codeSent}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Code
          </Button>
          <Button
            variant="outline"
            onClick={sendCode}
            disabled={resending}
            className="w-full"
          >
            {resending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Resend Code
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
