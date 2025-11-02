import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  kyc_status: string | null;
  created_at: string;
}

export default function AdminUsers() {
  const { isLoading } = useAdminCheck();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userBalance, setUserBalance] = useState<{ available: number; locked: number } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.country?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching users", variant: "destructive" });
    } else {
      setUsers(data || []);
      setFilteredUsers(data || []);
    }
  };

  const viewUserDetails = async (user: UserProfile) => {
    setSelectedUser(user);
    
    const { data: wallet } = await supabase
      .from("wallets")
      .select("available_balance, locked_balance")
      .eq("user_id", user.user_id)
      .maybeSingle();

    if (wallet) {
      setUserBalance({
        available: Number(wallet.available_balance),
        locked: Number(wallet.locked_balance),
      });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div>Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage and view all registered users</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Total users: {users.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                    <TableCell>{user.email || "N/A"}</TableCell>
                    <TableCell>{user.country || "N/A"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.kyc_status === "verified"
                            ? "default"
                            : user.kyc_status === "pending"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {user.kyc_status || "Not Started"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => viewUserDetails(user)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <p className="text-sm font-medium">{selectedUser.name || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm font-medium">{selectedUser.email || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm font-medium">{selectedUser.phone || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Country</Label>
                    <p className="text-sm font-medium">{selectedUser.country || "N/A"}</p>
                  </div>
                  <div>
                    <Label>KYC Status</Label>
                    <Badge
                      variant={
                        selectedUser.kyc_status === "verified"
                          ? "default"
                          : selectedUser.kyc_status === "pending"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {selectedUser.kyc_status || "Not Started"}
                    </Badge>
                  </div>
                </div>

                {userBalance && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Account Balance</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Available Balance</Label>
                        <p className="text-lg font-bold text-primary">
                          ${userBalance.available.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label>Locked Balance</Label>
                        <p className="text-lg font-bold text-muted-foreground">
                          ${userBalance.locked.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
