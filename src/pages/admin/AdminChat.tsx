import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, MessageCircle, User, Clock, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChat, useChatSessions } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminChat() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { sessions, isLoading: sessionsLoading } = useChatSessions();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Support Chat</h1>
          <p className="text-muted-foreground mt-1">Manage customer support conversations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)] min-h-[500px]">
          {/* Sessions List */}
          <Card className="lg:col-span-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Chat Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {sessionsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
                  <p>No chat sessions yet</p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-2">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSessionId(session.id)}
                        className={cn(
                          'w-full p-3 rounded-lg text-left transition-colors',
                          selectedSessionId === session.id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm truncate max-w-[120px]">
                              {session.user_email}
                            </span>
                          </div>
                          {session.unread_count > 0 && (
                            <Badge variant="default" className="h-5 min-w-5 px-1.5">
                              {session.unread_count}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}</span>
                          </div>
                          <Badge variant={session.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {session.status}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Chat View */}
          <Card className="lg:col-span-2 flex flex-col overflow-hidden">
            {selectedSessionId ? (
              <AdminChatView sessionId={selectedSessionId} onClose={() => setSelectedSessionId(null)} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a chat session from the list to start responding</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function AdminChatView({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    messages,
    session,
    isLoading,
    isOnline,
    sendMessage,
    updateTypingStatus,
    closeSession,
  } = useChat(sessionId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when session changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [sessionId]);

  // Mark messages as read when viewing
  useEffect(() => {
    const markAsRead = async () => {
      if (!sessionId) return;
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('session_id', sessionId)
        .eq('sender_role', 'user')
        .eq('is_read', false);
    };
    markAsRead();
  }, [sessionId, messages]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;

    await sendMessage(inputValue, 'admin');
    setInputValue('');
    updateTypingStatus(false);
  }, [inputValue, sendMessage, updateTypingStatus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    updateTypingStatus(true);
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Chat Session</CardTitle>
          <p className="text-sm text-muted-foreground">
            Started {format(new Date(session?.created_at || Date.now()), 'PPp')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session?.status === 'active' && (
            <Button variant="outline" size="sm" onClick={closeSession}>
              <X className="h-4 w-4 mr-1" />
              Close Chat
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p>No messages yet. The user started this chat session.</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex flex-col max-w-[80%]',
                  message.sender_role === 'admin' ? 'ml-auto items-end' : 'mr-auto items-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2 text-sm',
                    message.sender_role === 'admin'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  )}
                >
                  {message.content}
                </div>
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(message.created_at), 'HH:mm')}
                  </span>
                  {message.sender_role === 'admin' && message.is_read && (
                    <CheckCheck className="h-3 w-3 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {session?.status === 'active' ? (
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a reply..."
                className="flex-1"
                disabled={!isOnline}
              />
              <Button onClick={handleSend} disabled={!inputValue.trim() || !isOnline}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t text-center text-muted-foreground text-sm">
            This chat session has been closed.
          </div>
        )}
      </CardContent>
    </>
  );
}
