import { CheckCircle2, ShieldCheck, FileText, Clock, Wallet, Layers, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const processSteps = [
  { n: 1, title: "Select Method", desc: "Choose your preferred deposit method from the available options." },
  { n: 2, title: "Enter Amount", desc: "Specify the amount you wish to deposit to your account." },
  { n: 3, title: "Complete Payment", desc: "Follow the instructions to complete your deposit through the selected method." },
  { n: 4, title: "Confirmation", desc: "Your deposit will be confirmed and credited to your account." },
];

const securityTips = [
  "Always verify payment details before confirming transactions.",
  "Use secure and private internet connections when making deposits.",
  "For crypto deposits, double-check the network type to avoid loss of funds.",
  "Never share your payment credentials with anyone.",
];

const policyItems = [
  { icon: Clock, title: "Processing Time", sub: "All payment methods", value: "Instant" },
  { icon: Wallet, title: "Minimum Deposit", sub: "Platform requirement", value: "$50.00" },
  { icon: Layers, title: "Deposit Methods", sub: "Available options", value: "Multiple" },
];

export function DepositInfoPanels() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Deposit Process
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
            <p className="text-xs">Need help with your deposit? Contact our support team via the help center.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Deposit Policy
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
          <a href="/dashboard/transactions" className="block text-xs text-primary hover:underline mt-2">
            View deposit history ›
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
