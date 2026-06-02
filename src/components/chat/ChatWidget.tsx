import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, WifiOff, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  onSessionCreated: (sessionId: string) => void;
  guestId?: string;
  isGuest?: boolean;
}

const WELCOME_MESSAGE = "Welcome to Wealthora! 👋 Whether you have a specific question or need assistance, we're here for you. 😊 What would you like to know?";

export function ChatWidget({ isOpen, onClose, sessionId, onSessionCreated, guestId, isGuest }: ChatWidgetProps) {
  const [inputValue, setInputValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const { messages, session, isLoading, isAdminTyping, isOnline, sendMessage, updateTypingStatus } =
    useChat(sessionId || undefined, guestId);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isAdminTyping]);

  useEffect(() => {
    if (isOpen && sessionId && inputRef.current) inputRef.current.focus();
  }, [isOpen, sessionId]);

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = user
        ? { user_id: user.id }
        : { user_id: null, guest_id: guestId, guest_name: guestName.trim() || null, guest_email: guestEmail.trim() || null };

      const { data, error } = await supabase.from('chat_sessions').insert(payload).select().single();
      if (error) throw error;
      onSessionCreated(data.id);
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !sessionId) return;
    await sendMessage(inputValue, 'user');
    setInputValue('');
    updateTypingStatus(false);
  }, [inputValue, sessionId, sendMessage, updateTypingStatus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateTypingStatus(true);
    typingTimeoutRef.current = setTimeout(() => updateTypingStatus(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const widgetSize = expanded
    ? 'w-[440px] h-[640px]'
    : 'w-[380px] h-[560px]';

  // Render welcome bubble even before first user message
  const showWelcome = !!sessionId && messages.length === 0;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200',
        widgetSize
      )}
    >
      {/* Header — blue gradient */}
      <div className="relative px-5 pt-4 pb-5 text-white bg-gradient-to-br from-[hsl(220,90%,55%)] via-[hsl(225,85%,50%)] to-[hsl(230,80%,45%)]">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded hover:bg-white/15 transition-colors"
            aria-label={expanded ? 'Shrink' : 'Expand'}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/15 transition-colors"
            aria-label="Close chat"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-lg font-semibold">
            W
          </div>
          <div>
            <h3 className="text-lg font-semibold leading-tight">How can we help?</h3>
            <div className="flex items-center gap-1.5 text-xs text-white/90 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
              <span>We reply immediately</span>
            </div>
          </div>
        </div>
      </div>

      {/* Offline */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive text-sm">
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Reconnecting…</span>
        </div>
      )}

      {/* Pre-session: optional guest contact form */}
      {!sessionId ? (
        <div className="flex-1 flex flex-col p-5 gap-3 overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            Start a conversation with our support team. {isGuest && 'No account needed.'}
          </p>
          {isGuest && (
            <>
              <Input
                placeholder="Your name (optional)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <Input
                type="email"
                placeholder="Email (optional, so we can follow up)"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
            </>
          )}
          <Button onClick={handleCreateSession} disabled={isCreating} className="mt-1">
            {isCreating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Starting…</>) : 'Start Chat'}
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-4 bg-muted/30" ref={scrollRef}>
            <div className="space-y-4">
              {showWelcome && (
                <AdminBubble content={WELCOME_MESSAGE} createdAt={session?.created_at} />
              )}

              {messages.map((message) =>
                message.sender_role === 'admin' ? (
                  <AdminBubble key={message.id} content={message.content} createdAt={message.created_at} />
                ) : (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[80%]">
                      <div className="rounded-2xl rounded-br-md px-4 py-2 text-sm bg-primary text-primary-foreground">
                        {message.content}
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-1 px-1 block text-right">
                        {format(new Date(message.created_at), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                )
              )}

              {isAdminTyping && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Agent is typing…</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          {session?.status !== 'closed' ? (
            <div className="p-3 border-t border-border bg-card">
              <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-1.5">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message here"
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-0 h-9"
                  disabled={!isOnline}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || !isOnline}
                  size="icon"
                  className="h-8 w-8 rounded-full shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-border text-center text-muted-foreground text-sm">
              This chat session has been closed.
            </div>
          )}
        </>
      )}

      <div className="text-[10px] text-center text-muted-foreground py-1.5 border-t border-border bg-card">
        Powered by Wealthora
      </div>
    </div>
  );
}

function AdminBubble({ content, createdAt }: { content: string; createdAt?: string }) {
  return (
    <div className="flex items-end gap-2">
      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
        W
      </div>
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-bl-md px-4 py-2 text-sm bg-background border border-border text-foreground shadow-sm whitespace-pre-wrap">
          {content}
        </div>
        {createdAt && (
          <span className="text-[11px] text-muted-foreground mt-1 px-1 block">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}
