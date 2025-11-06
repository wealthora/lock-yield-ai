import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Clock, User, ArrowRight } from "lucide-react";

interface ProfileChangeRequest {
  id: string;
  user_id: string;
  requested_changes: any;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles: {
    name: string;
    email: string;
    phone: string;
    country: string;
    date_of_birth: string;
    avatar: string | null;
  };
}

export default function AdminProfileRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ProfileChangeRequest | null>(null);
  const [actionDialog, setActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'decline' | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<string>("pending");

  useEffect(() => {
    loadRequests();

    // Real-time subscription
    const channel = supabase
      .channel('profile-requests-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profile_change_requests' },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const loadRequests = async () => {
    try {
      let query = supabase
        .from("profile_change_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data: requestsData, error: requestsError } = await query;

      if (requestsError) throw requestsError;

      // Fetch profiles separately for each request
      const requestsWithProfiles = await Promise.all(
        (requestsData || []).map(async (request) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, email, phone, country, date_of_birth, avatar")
            .eq("user_id", request.user_id)
            .single();

          return {
            ...request,
            profiles: profile || {
              name: '',
              email: '',
              phone: '',
              country: '',
              date_of_birth: '',
              avatar: null
            }
          };
        })
      );

      setRequests(requestsWithProfiles);
    } catch (error: any) {
      console.error("Error loading requests:", error);
      toast({
        title: "Error",
        description: "Failed to load profile change requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessing(true);
    try {
      // If approving, first update the user's profile with the requested changes
      if (actionType === 'approve') {
        const { error: profileError } = await supabase
          .from("profiles")
          .update(selectedRequest.requested_changes)
          .eq("user_id", selectedRequest.user_id);

        if (profileError) throw profileError;
      }

      // Then update the request status
      const { error } = await supabase
        .from("profile_change_requests")
        .update({
          status: actionType === 'approve' ? 'approved' : 'declined',
          admin_notes: adminNotes || null,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Profile change request ${actionType === 'approve' ? 'approved' : 'declined'} successfully.`,
      });

      setActionDialog(false);
      setSelectedRequest(null);
      setAdminNotes("");
      setActionType(null);
      loadRequests();
    } catch (error: any) {
      console.error("Error processing request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (request: ProfileChangeRequest, type: 'approve' | 'decline') => {
    setSelectedRequest(request);
    setActionType(type);
    setActionDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case "approved":
        return <Badge variant="default"><Check className="mr-1 h-3 w-3" />Approved</Badge>;
      case "declined":
        return <Badge variant="destructive"><X className="mr-1 h-3 w-3" />Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderFieldComparison = (field: string, oldValue: any, newValue: any) => {
    if (oldValue === newValue) return null;

    // Handle avatar specially
    if (field === 'avatar') {
      return (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium mb-2">Profile Photo</p>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Current</p>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={oldValue || undefined} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">New</p>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={newValue} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <p className="text-sm font-medium mb-1 capitalize">{field.replace('_', ' ')}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{oldValue || 'Not set'}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{newValue}</span>
          </div>
        </div>
      </div>
    );
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    declined: requests.filter(r => r.status === 'declined').length,
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile Change Requests</h1>
          <p className="text-muted-foreground">Review and manage user profile update requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Requests</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-3xl text-orange-500">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-3xl text-green-500">{stats.approved}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Declined</CardDescription>
              <CardTitle className="text-3xl text-red-500">{stats.declined}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="declined">Declined</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No {filter !== 'all' ? filter : ''} profile change requests found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Changes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={request.profiles.avatar || undefined} />
                              <AvatarFallback>
                                {request.profiles.name?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            {request.profiles.name}
                          </div>
                        </TableCell>
                        <TableCell>{request.profiles.email}</TableCell>
                        <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {Object.keys(request.requested_changes).length} field(s)
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-right">
                          {request.status === 'pending' ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openActionDialog(request, 'approve')}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openActionDialog(request, 'decline')}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Decline
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionDialog(true);
                                setActionType(null);
                              }}
                            >
                              View Details
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialog} onOpenChange={setActionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Profile Change Request'}
              {actionType === 'decline' && 'Decline Profile Change Request'}
              {!actionType && 'Profile Change Request Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Request from {selectedRequest.profiles.name} on {new Date(selectedRequest.created_at).toLocaleDateString()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Requested Changes:</h4>
                {Object.entries(selectedRequest.requested_changes).map(([field, newValue]) => 
                  renderFieldComparison(
                    field,
                    selectedRequest.profiles[field as keyof typeof selectedRequest.profiles],
                    newValue
                  )
                )}
              </div>

              {actionType && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Admin Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes about this decision..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {selectedRequest.admin_notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Admin Notes:</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog(false);
                setSelectedRequest(null);
                setAdminNotes("");
                setActionType(null);
              }}
              disabled={processing}
            >
              {actionType ? 'Cancel' : 'Close'}
            </Button>
            {actionType && (
              <Button
                onClick={handleAction}
                disabled={processing}
                variant={actionType === 'approve' ? 'default' : 'destructive'}
              >
                {processing ? 'Processing...' : actionType === 'approve' ? 'Approve Request' : 'Decline Request'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}