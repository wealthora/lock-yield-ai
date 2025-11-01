import { ActiveInvestments } from "@/components/ActiveInvestments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, Award, BarChart3 } from "lucide-react";

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics & Education</h1>
        <p className="text-muted-foreground mt-1">Track your performance and learn trading strategies</p>
      </div>

      <ActiveInvestments />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Your trading statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Total Invested</span>
              <span className="font-semibold">$0.00</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Total Returns</span>
              <span className="font-semibold text-primary">+$0.00</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">ROI</span>
              <span className="font-semibold">0%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-warning" />
              Trading Achievements
            </CardTitle>
            <CardDescription>Your milestones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Active Investments</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Successful Trades</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Days Active</span>
              <span className="font-semibold">0</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            Educational Resources
          </CardTitle>
          <CardDescription>Learn and improve your trading skills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border border-border hover:border-primary/40 transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Forex Basics</h3>
              <p className="text-sm text-muted-foreground">
                Learn the fundamentals of forex trading
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border hover:border-primary/40 transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold mb-1">Technical Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Master charts and indicators
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border hover:border-primary/40 transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center mb-3">
                <Award className="h-5 w-5 text-warning" />
              </div>
              <h3 className="font-semibold mb-1">Risk Management</h3>
              <p className="text-sm text-muted-foreground">
                Protect your capital effectively
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
