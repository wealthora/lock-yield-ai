import { useState } from 'react';
import { Send, Users, Megaphone, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import UserSearchSelect from '@/components/admin/UserSearchSelect';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SelectedUser {
  user_id: string;
  email: string | null;
  first_name: string | null;
  other_names: string | null;
}

export default function AdminBroadcast() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [recipientType, setRecipientType] = useState<'all' | 'single'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const handleUserSelect = (userId: string | null, user: SelectedUser | null) => {
    setSelectedUserId(userId);
    setSelectedUser(user);
  };

  const getRecipientDisplayName = () => {
    if (!selectedUser) return '';
    const name = [selectedUser.first_name, selectedUser.other_names].filter(Boolean).join(' ');
    return name || selectedUser.email || selectedUser.user_id;
  };

  const validateForm = () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in both title and message',
        variant: 'destructive',
      });
      return false;
    }

    if (recipientType === 'single' && !selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user to send the notification to',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSendClick = () => {
    if (!validateForm()) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirmDialog(false);
    setIsSending(true);

    try {
      // Get current admin user
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error('Not authenticated');

      if (recipientType === 'all') {
        // Get all user IDs from profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id');

        if (profilesError) throw profilesError;

        if (!profiles || profiles.length === 0) {
          toast({
            title: 'No Users',
            description: 'No users found to send notification to',
            variant: 'destructive',
          });
          return;
        }

        // Create notifications for all users
        const notifications = profiles.map((profile) => ({
          user_id: profile.user_id,
          title: title.trim(),
          message: message.trim(),
          type: 'broadcast',
          is_read: false,
          metadata: {
            recipient_type: 'all',
            sent_by_admin_id: adminUser.id,
            sent_at: new Date().toISOString(),
          },
        }));

        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (insertError) throw insertError;

        toast({
          title: 'Broadcast Sent',
          description: `Notification sent to ${profiles.length} users`,
        });
      } else {
        // Send to specific user
        const { error: insertError } = await supabase
          .from('notifications')
          .insert({
            user_id: selectedUserId,
            title: title.trim(),
            message: message.trim(),
            type: 'notification',
            is_read: false,
            metadata: {
              recipient_type: 'single_user',
              recipient_user_id: selectedUserId,
              sent_by_admin_id: adminUser.id,
              sent_at: new Date().toISOString(),
            },
          });

        if (insertError) throw insertError;

        toast({
          title: 'Notification Sent',
          description: `Notification sent to ${getRecipientDisplayName()}`,
        });
      }

      // Reset form
      setTitle('');
      setMessage('');
      setSelectedUserId(null);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send notification',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const isFormValid = title.trim() && message.trim() && (recipientType === 'all' || selectedUserId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Broadcast Notifications</h1>
          <p className="text-muted-foreground">Send news and updates to all users or specific individuals</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                New Notification
              </CardTitle>
              <CardDescription>
                Send a notification to all users or a specific user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Recipient Type Toggle */}
              <div className="space-y-2">
                <Label>Recipient</Label>
                <ToggleGroup
                  type="single"
                  value={recipientType}
                  onValueChange={(value) => {
                    if (value) setRecipientType(value as 'all' | 'single');
                  }}
                  className="justify-start"
                >
                  <ToggleGroupItem value="all" aria-label="Broadcast to all" className="gap-2">
                    <Users className="h-4 w-4" />
                    All Users
                  </ToggleGroupItem>
                  <ToggleGroupItem value="single" aria-label="Send to specific user" className="gap-2">
                    <User className="h-4 w-4" />
                    Specific User
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* User Selector - Only shown when specific user is selected */}
              {recipientType === 'single' && (
                <div className="space-y-2">
                  <Label htmlFor="user-select">Select User</Label>
                  <UserSearchSelect
                    value={selectedUserId}
                    onChange={handleUserSelect}
                    placeholder="Search by name, email, or ID..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose a specific user to send a private notification.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., New Feature Launch!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Write your announcement here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/500 characters
                </p>
              </div>

              <Button 
                className="w-full" 
                onClick={handleSendClick}
                disabled={isSending || !isFormValid}
              >
                {isSending ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {recipientType === 'all' ? 'Send to All Users' : 'Send to Selected User'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {recipientType === 'all' ? 'Broadcast Tips' : 'Private Notification Tips'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                {recipientType === 'all' ? (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">1</span>
                      <p>Keep titles short and attention-grabbing (under 60 characters works best)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">2</span>
                      <p>Use clear, actionable language in your message</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">3</span>
                      <p>Avoid sending too many broadcasts - users may disable notifications</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">4</span>
                      <p>Consider time zones when sending time-sensitive announcements</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">1</span>
                      <p>Use private notifications for user-specific updates (account status, KYC, etc.)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">2</span>
                      <p>Address the user by name when possible for a personal touch</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">3</span>
                      <p>Be specific about any actions the user needs to take</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">4</span>
                      <p>Include relevant details like deadlines or reference numbers</p>
                    </div>
                  </>
                )}
              </div>

              {/* Mode indicator */}
              <div className={`mt-4 p-3 rounded-lg border ${recipientType === 'all' ? 'bg-primary/5 border-primary/20' : 'bg-muted border-border'}`}>
                <div className="flex items-center gap-2">
                  {recipientType === 'all' ? (
                    <>
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Broadcast Mode</span>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">Private Notification Mode</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {recipientType === 'all' 
                    ? 'This notification will be sent to all registered users.'
                    : 'This notification will only be sent to the selected user.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send Notification</AlertDialogTitle>
            <AlertDialogDescription>
              {recipientType === 'all' 
                ? 'Are you sure you want to send this notification to all users?'
                : `Are you sure you want to send this notification to ${getRecipientDisplayName()}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>
              Send Notification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
