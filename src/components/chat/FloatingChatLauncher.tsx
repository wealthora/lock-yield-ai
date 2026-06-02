import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChatWidget } from "./ChatWidget";
import { getOrCreateGuestId } from "@/hooks/useChat";

export function FloatingChatLauncher() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [guestId, setGuestId] = useState<string>("");

  useEffect(() => {
    // Guest id is stable in localStorage so the same browser keeps its chat
    setGuestId(getOrCreateGuestId());
  }, []);

  useEffect(() => {
    const init = async (uid: string | null) => {
      setUserId(uid);
      if (uid) {
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
        setSessionId(existing?.id ?? null);
      } else {
        setIsAdmin(false);
        const gid = getOrCreateGuestId();
        const { data: existing } = await supabase
          .from("chat_sessions")
          .select("id")
          .eq("guest_id", gid)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setSessionId(existing?.id ?? null);
      }
    };

    supabase.auth.getUser().then(({ data }) => init(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      init(session?.user?.id ?? null);
    });
    const openHandler = () => setOpen(true);
    window.addEventListener("open-support-chat", openHandler);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("open-support-chat", openHandler);
    };
  }, []);

  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return null;
  }
  if (isAdmin) return null;

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          size="icon"
          className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-xl bg-gradient-to-br from-[hsl(220,90%,55%)] to-[hsl(230,80%,45%)] hover:scale-105 transition-transform"
          aria-label="Open support chat"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      )}
      <ChatWidget
        isOpen={open}
        onClose={() => setOpen(false)}
        sessionId={sessionId}
        onSessionCreated={(id) => setSessionId(id)}
        guestId={guestId}
        isGuest={!userId}
      />
    </>
  );
}
