import { useState, useEffect } from 'react';
import { Bell, CheckCheck, MessageCircle, Megaphone, Info, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'chat':
      return MessageCircle;
    case 'broadcast':
      return Megaphone;
    default:
      return Info;
  }
};

const NotificationItem = ({ 
  notification, 
  isExpanded,
  onToggle,
  onMarkAsRead 
}: { 
  notification: Notification;
  isExpanded: boolean;
  onToggle: () => void;
  onMarkAsRead: (id: string) => void;
}) => {
  const Icon = getNotificationIcon(notification.type);

  // Mark as read when expanded
  useEffect(() => {
    if (isExpanded && !notification.is_read) {
      onMarkAsRead(notification.id);
    }
  }, [isExpanded, notification.is_read, notification.id, onMarkAsRead]);
  
  return (
    <div
      className={cn(
        "border-b border-border last:border-0 transition-all duration-200",
        isExpanded && "bg-muted/30 border-l-2 border-l-primary"
      )}
    >
      {/* Collapsed Header - Always Visible */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full p-3 flex items-center gap-3 text-left transition-colors hover:bg-muted/50",
          !notification.is_read && "bg-primary/5"
        )}
      >
        {/* Icon */}
        <div className={cn(
          "p-2 rounded-full shrink-0",
          notification.type === 'chat' && "bg-blue-500/10 text-blue-500",
          notification.type === 'broadcast' && "bg-amber-500/10 text-amber-500",
          notification.type === 'general' && "bg-muted text-muted-foreground"
        )}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Title & Timestamp */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm truncate",
              !notification.is_read ? "font-semibold" : "font-medium"
            )}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>

        {/* Expand/Collapse Indicator */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 ml-11">
              <div className="p-3 bg-background rounded-md border border-border">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                  {notification.message}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span className="text-primary">•</span>
                Tap to collapse
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  // Reset expanded state when popover closes
  useEffect(() => {
    if (!open) {
      setExpandedId(null);
    }
  }, [open]);

  const handleToggle = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border bg-card">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto py-1 px-2 text-xs hover:bg-muted"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[350px] sm:h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  isExpanded={expandedId === notification.id}
                  onToggle={() => handleToggle(notification.id)}
                  onMarkAsRead={markAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
