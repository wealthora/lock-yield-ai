import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  title?: string;
  description?: string;
}

export function PasswordConfirmDialog({
  open,
  onOpenChange,
  onVerified,
  title = "Secure Area",
  description = "Please confirm your password before continuing",
}: Props) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!password) {
      toast({ title: "Password required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Not authenticated");
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (error) {
        toast({ title: "Incorrect password", description: "Please try again.", variant: "destructive" });
        setLoading(false);
        return;
      }
      setPassword("");
      setLoading(false);
      onOpenChange(false);
      onVerified();
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setPassword("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center pt-2 pb-1">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full border border-dashed border-primary/40 animate-pulse" />
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>

        <div className="rounded-lg border bg-card/50 p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-pwd">
              Enter Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-pwd"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                className="pl-9 pr-9"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-primary to-accent"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Confirm Identity
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Info className="h-3 w-3" />
          This extra security step helps protect your account
        </p>
      </DialogContent>
    </Dialog>
  );
}
