import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Target } from "lucide-react";

interface AIBotsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const aiBots = [
  {
    id: "quantum-edge",
    name: "Quantum Edge Bot",
    strategy: "High-Frequency Trading",
    description: "Sharp entry/exit points with millisecond precision for maximum profit opportunities",
    icon: Zap,
    performance: "+127% (30d)",
    riskLevel: "High",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    id: "titan-growth",
    name: "Titan Growth Bot",
    strategy: "Medium-Term Strategy",
    description: "Balanced approach focused on steady, compound returns with controlled risk management",
    icon: TrendingUp,
    performance: "+48% (30d)",
    riskLevel: "Medium",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "astra-horizon",
    name: "Astra Horizon Bot",
    strategy: "Long-Term Diversified",
    description: "AI-powered portfolio diversification across multiple pairs for sustainable growth",
    icon: Target,
    performance: "+32% (30d)",
    riskLevel: "Low",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
];

export function AIBotsModal({ open, onOpenChange }: AIBotsModalProps) {
  const handleBotClick = (botId: string) => {
    console.log("Selected AI bot:", botId);
    // Handle bot allocation logic here
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Allocate to AI Trading Bots</DialogTitle>
          <DialogDescription>
            Choose an AI bot that matches your trading strategy and risk appetite
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {aiBots.map((bot) => {
            const Icon = bot.icon;
            return (
              <Card
                key={bot.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:scale-[1.01]"
                onClick={() => handleBotClick(bot.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${bot.bgColor}`}>
                      <Icon className={`h-7 w-7 ${bot.color}`} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-lg">{bot.name}</h3>
                          <p className="text-sm text-muted-foreground">{bot.strategy}</p>
                        </div>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {bot.performance}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{bot.description}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs font-medium text-muted-foreground">Risk Level:</span>
                        <Badge 
                          variant={
                            bot.riskLevel === "High" ? "destructive" : 
                            bot.riskLevel === "Medium" ? "secondary" : 
                            "outline"
                          }
                          className="text-xs"
                        >
                          {bot.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
