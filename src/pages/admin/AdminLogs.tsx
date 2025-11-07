import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  amount: number | null;
  method: string | null;
  created_at: string;
  profiles: {
    first_name: string | null;
    other_names: string | null;
    email: string | null;
  } | null;
}

export default function AdminLogs() {
  const { isLoading } = useAdminCheck();
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    const { data: activitiesData, error } = await supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !activitiesData) {
      console.error("Error fetching activities:", error);
      return;
    }

    const activitiesWithProfiles = await Promise.all(
      activitiesData.map(async (activity) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, other_names, email")
          .eq("user_id", activity.user_id)
          .single();

        return {
          ...activity,
          profiles: profile,
        };
      })
    );

    setActivities(activitiesWithProfiles);
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
          <h2 className="text-3xl font-bold tracking-tight">System Activity Logs</h2>
          <p className="text-muted-foreground">View all platform activities and transactions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Last 100 system activities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Activity Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {activity.profiles?.first_name && activity.profiles?.other_names
                            ? `${activity.profiles.first_name} ${activity.profiles.other_names}`
                            : activity.profiles?.first_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.profiles?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {activity.activity_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">{activity.description}</TableCell>
                    <TableCell>
                      {activity.amount ? `$${Number(activity.amount).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>
                      {activity.method ? (
                        <Badge variant="secondary">{activity.method}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(activity.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
