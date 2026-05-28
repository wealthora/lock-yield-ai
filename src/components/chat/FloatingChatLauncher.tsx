import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChatWidget } from "./ChatWidget";

export function FloatingChatLauncher() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async (uid: string | null) => {
      setUserId(uid);
      if (!uid) {
        setSessionId(null);
        setIsAdmin(false);
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!roleRow);

      const { data: existing } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("user_id", uid)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) setSessionId(existing.id);
    };

    supabase.auth.getUser().then(({ data }) => init(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      init(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Hide on admin routes (admins have their own chat console)
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return null;
  }
  if (isAdmin) return null;

  const handleClick = () => {
    if (!userId) {
      navigate("/auth");
      return;
    }
    setOpen(true);
  };

  return (
    <>
      {!open && (
        <Button
          onClick={handleClick}
          size="icon"
          className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform"
          aria-label="Open support chat"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
      {userId && (
        <ChatWidget
          isOpen={open}
          onClose={() => setOpen(false)}
          sessionId={sessionId}
          onSessionCreated={(id) => setSessionId(id)}
        />
      )}
    </>
  );
}
