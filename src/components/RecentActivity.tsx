import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityItem } from "./ActivityItem";
import { RecentActivityFilters } from "./RecentActivityFilters";
import { DateRange } from "react-day-picker";
import { Loader2 } from "lucide-react";

interface ActivityData {
  id: string;
  activityType: string;
  description: string;
  amount?: number;
  method?: string;
  status?: string;
  createdAt: string;
}

export const RecentActivity = () => {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityType, setActivityType] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const loadActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("activities")
        .select("*")
        .eq("user_id", user.id)
        .neq("activity_type", "bot_return") // Exclude daily returns
        .order("created_at", { ascending: false })
        .limit(50);

      // Apply activity type filter
      if (activityType !== "all") {
        query = query.eq("activity_type", activityType);
      }

      // Apply status filter
      if (status !== "all") {
        query = query.eq("status", status);
      }

      // Apply date range filters
      if (dateRange?.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }

      if (dateRange?.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedActivities = (data || []).map((activity: any) => ({
        id: activity.id,
        activityType: activity.activity_type,
        description: activity.description,
        amount: activity.amount,
        method: activity.method,
        status: activity.status,
        createdAt: activity.created_at,
      }));

      setActivities(formattedActivities);
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();

    // Set up real-time subscription
    const channel = supabase
      .channel("activities-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activityType, status, dateRange]);

  const handleClearFilters = () => {
    setActivityType("all");
    setStatus("all");
    setDateRange(undefined);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">
            Track all your transactions and activities
          </p>
        </div>

        <RecentActivityFilters
          activityType={activityType}
          status={status}
          dateRange={dateRange}
          onActivityTypeChange={setActivityType}
          onStatusChange={setStatus}
          onDateRangeChange={setDateRange}
          onClearFilters={handleClearFilters}
        />

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activities found
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {activities.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activityType={activity.activityType}
                  description={activity.description}
                  amount={activity.amount}
                  method={activity.method}
                  status={activity.status}
                  createdAt={activity.createdAt}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
};
