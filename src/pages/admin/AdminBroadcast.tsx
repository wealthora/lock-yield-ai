import { useState } from 'react';
import { Send, Users, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminBroadcast() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in both title and message',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
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
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      toast({
        title: 'Broadcast Sent',
        description: `Notification sent to ${profiles.length} users`,
      });

      setTitle('');
      setMessage('');
    } catch (error: any) {
      console.error('Error sending broadcast:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send broadcast',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Broadcast Notifications</h1>
          <p className="text-muted-foreground">Send news and updates to all users</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                New Broadcast
              </CardTitle>
              <CardDescription>
                Create a notification that will be sent to all registered users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                onClick={handleSendBroadcast}
                disabled={isSending || !title.trim() || !message.trim()}
              >
                {isSending ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to All Users
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Broadcast Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm text-muted-foreground">
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
