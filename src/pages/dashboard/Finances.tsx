import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Unlock, Lock, TrendingUp } from "lucide-react";
import { DepositModal } from "@/components/DepositModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { AIBotsModal } from "@/components/AIBotsModal";
import { RecentActivity } from "@/components/RecentActivity";
export default function Finances() {
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [aiBotsModalOpen, setAIBotsModalOpen] = useState(false);
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finances</h1>
        <p className="text-muted-foreground mt-1">Manage your deposits, withdrawals, and investments</p>
      </div>

      <Tabs defaultValue="quick-actions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-actions" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Unlock className="h-5 w-5 text-accent" />
                  Deposit
                </CardTitle>
                <CardDescription>Add funds to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setDepositModalOpen(true)}>Deposit Funds</Button>
              </CardContent>
            </Card>

            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-warning" />
                  Withdraw
                </CardTitle>
                <CardDescription>Transfer funds out</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={() => setWithdrawModalOpen(true)}>
                  Withdraw Funds
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  AI Bots
                </CardTitle>
                <CardDescription>Allocate to trading bots</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full" onClick={() => setAIBotsModalOpen(true)}>
                  Allocate Funds
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="border-warning/20 bg-warning/5">
            <CardHeader>
              <CardTitle className="text-warning">Risk Disclaimer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Trading leveraged FX instruments carries significant risk of loss.</p>
              <p>• AI trading bots do not guarantee returns. Past performance does not indicate future results.</p>
              <p>• Cryptocurrency transactions are irreversible. Ensure addresses are correct before withdrawal.</p>
              <p>• Only invest funds you can afford to lose.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <RecentActivity />
        </TabsContent>
      </Tabs>

      <DepositModal open={depositModalOpen} onOpenChange={setDepositModalOpen} />
      <WithdrawModal open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen} />
      <AIBotsModal open={aiBotsModalOpen} onOpenChange={setAIBotsModalOpen} />
    </div>;
}