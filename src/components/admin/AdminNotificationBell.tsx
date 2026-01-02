import { useState, useEffect } from 'react';
import { Bell, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ChatSession {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  unread_count: number;
  user_email?: string;
}

export function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const navigate = useNavigate();

  const fetchUnreadChats = async () => {
    try {
      // Get active sessions with unread messages
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get unread counts for each session
      const sessionsWithUnread = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('sender_role', 'user')
            .eq('is_read', false);

          // Get user email
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', session.user_id)
            .maybeSingle();

          return {
            ...session,
            unread_count: count || 0,
            user_email: profile?.email || 'Unknown User',
          };
        })
      );

      const filtered = sessionsWithUnread.filter(s => s.unread_count > 0);
      setSessions(filtered);
      setTotalUnread(filtered.reduce((acc, s) => acc + s.unread_count, 0));
    } catch (error) {
      console.error('Error fetching unread chats:', error);
    }
  };

  useEffect(() => {
    fetchUnreadChats();

    // Subscribe to new messages
    const channel = supabase
      .channel('admin-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          if ((payload.new as any).sender_role === 'user') {
            fetchUnreadChats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenChat = (sessionId: string) => {
    setOpen(false);
    navigate(`/admin/chat?session=${sessionId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm">New Messages</h4>
        </div>
        <ScrollArea className="h-[300px]">
          {sessions.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No unread messages</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="p-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleOpenChat(session.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/10 text-blue-500 shrink-0">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {session.user_email}
                      </p>
                      <span className="h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium shrink-0">
                        {session.unread_count}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
