import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield } from 'lucide-react';

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
  const { toast } = useToast();

  const sendCode = async () => {
    setResending(true);
    try {
      const { error } = await supabase.functions.invoke('send-2fa-code', {
        body: { purpose },
      });

      if (error) throw error;

      toast({
        title: "Code Sent",
        description: "A verification code has been sent to your email.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
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
            Enter the 6-digit verification code sent to your email
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
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
              className="text-center text-2xl tracking-widest"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
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
            {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resend Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
