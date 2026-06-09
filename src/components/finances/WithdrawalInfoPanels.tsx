import { CheckCircle2, ShieldCheck, FileText, Clock, Wallet, CalendarDays, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const processSteps = [
  { n: 1, title: "Select Method", desc: "Choose your preferred withdrawal method from the available options." },
  { n: 2, title: "Enter Details", desc: "Provide your withdrawal amount and destination details securely." },
  { n: 3, title: "Confirmation", desc: "Review and confirm your withdrawal request details." },
  { n: 4, title: "Processing", desc: "Your request will be processed according to the method's timeframe." },
];

const securityTips = [
  "Always verify withdrawal addresses before confirming transactions.",
  "Enable two-factor authentication (2FA) for enhanced account security.",
  "For crypto withdrawals, confirm network type to avoid loss of funds.",
  "Start with small test withdrawals when using a new withdrawal address.",
  "Never share your account credentials or verification codes with anyone.",
  "Be cautious of phishing attempts asking for your withdrawal information.",
];

const policyItems = [
  { icon: Clock, title: "Processing Time", sub: "Varies by method", value: "24-72 hours" },
  { icon: Wallet, title: "Minimum Withdrawal", sub: "Varies by method", value: "See method details" },
  { icon: ShieldCheck, title: "Daily Limit", sub: "Maximum per day", value: "$0.00" },
  { icon: CalendarDays, title: "Processing Days", sub: "Business days only", value: "Monday-Friday" },
];

export function WithdrawalInfoPanels() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Withdrawal Process
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {processSteps.map((s) => (
            <div key={s.n} className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {s.n}
              </div>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {securityTips.map((t) => (
            <div key={t} className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <p className="text-xs text-muted-foreground">{t}</p>
            </div>
          ))}
          <div className="mt-4 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
            <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <p className="text-xs">Need help with your withdrawal? Contact our support team via the help center.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Withdrawal Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {policyItems.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.sub}</p>
                  </div>
                </div>
                <p className="text-xs font-medium text-right">{p.value}</p>
              </div>
            );
          })}
          <a href="/dashboard/help" className="block text-xs text-primary hover:underline mt-2">
            View full withdrawal policy ›
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
