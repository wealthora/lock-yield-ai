import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string | null;
  sender_role: 'user' | 'admin';
  content: string;
  is_read: boolean;
  created_at: string;
  guest_id?: string | null;
}

export interface ChatSession {
  id: string;
  user_id: string | null;
  guest_id?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  status: 'active' | 'closed';
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

const GUEST_ID_KEY = 'wealthora_guest_id';
export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function useChat(sessionId?: string, guestId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const loadSession = async () => {
      setIsLoading(true);
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', sessionId)
          .maybeSingle();
        if (sessionError) throw sessionError;
        setSession(sessionData as ChatSession);

        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        if (messagesError) throw messagesError;
        setMessages(messagesData as ChatMessage[]);
      } catch (error: any) {
        console.error('Error loading chat:', error);
        toast({ title: 'Error', description: 'Failed to load chat session', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, [sessionId, toast]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`chat-messages-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const newMessage = payload.new as ChatMessage;
        setMessages((prev) => prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`typing-${sessionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'typing_indicators',
        filter: `session_id=eq.${sessionId}`,
      }, async (payload) => {
        const indicator = payload.new as { user_id: string | null; is_typing: boolean };
        if (!indicator.user_id) return;
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', indicator.user_id)
          .eq('role', 'admin')
          .maybeSingle();
        if (roles) setIsAdminTyping(indicator.is_typing);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const sendMessage = useCallback(async (content: string, senderRole: 'user' | 'admin' = 'user') => {
    if (!sessionId || !content.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      session_id: sessionId,
      sender_id: user?.id ?? null,
      sender_role: senderRole,
      content: content.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
      guest_id: !user ? guestId ?? null : null,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const payload: any = {
        session_id: sessionId,
        sender_id: user?.id ?? null,
        sender_role: senderRole,
        content: content.trim(),
      };
      if (!user && guestId) payload.guest_id = guestId;

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      setMessages((prev) => prev.map((m) => m.id === tempId ? (data as ChatMessage) : m));
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    }
  }, [sessionId, guestId, toast]);

  const updateTypingStatus = useCallback(async (_isTyping: boolean) => {
    // Typing indicator updates skipped for guests (unique constraint scoped to user_id)
    if (!sessionId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      await supabase.from('typing_indicators').upsert({
        session_id: sessionId,
        user_id: user.id,
        is_typing: _isTyping,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id,user_id' });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [sessionId]);

  const closeSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
      setSession((prev) => prev ? { ...prev, status: 'closed' } : null);
    } catch (error: any) {
      console.error('Error closing session:', error);
      toast({ title: 'Error', description: 'Failed to close chat session', variant: 'destructive' });
    }
  }, [sessionId, toast]);

  return { messages, session, isLoading, isAdminTyping, isOnline, sendMessage, updateTypingStatus, closeSession };
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<(ChatSession & { unread_count?: number; user_email?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const { data: sessionsData, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .order('updated_at', { ascending: false });
        if (error) throw error;

        const sessionsWithDetails = await Promise.all(
          (sessionsData as ChatSession[]).map(async (session) => {
            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('session_id', session.id)
              .eq('sender_role', 'user')
              .eq('is_read', false);

            let email = session.guest_email || 'Guest visitor';
            if (session.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('user_id', session.user_id)
                .maybeSingle();
              email = profile?.email || 'Unknown User';
            } else if (session.guest_name) {
              email = `${session.guest_name}${session.guest_email ? ` · ${session.guest_email}` : ''}`;
            }

            return { ...session, unread_count: count || 0, user_email: email };
          })
        );
        setSessions(sessionsWithDetails);
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();

    const channel = supabase
      .channel('chat-sessions-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, () => loadSessions())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => loadSessions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { sessions, isLoading };
}
