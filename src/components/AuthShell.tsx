import { ReactNode } from "react";
import { ShieldCheck, Activity, Zap, TrendingUp } from "lucide-react";
import logo from "@/assets/wealthora-logo.png";

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-200 flex items-center justify-center p-4 selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center py-8">
        {/* Left: Branding */}
        <div className="hidden lg:flex flex-col space-y-10 pr-8">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Wealthora AI"
              className="h-14 w-auto drop-shadow-[0_0_25px_rgba(34,211,238,0.4)]"
            />
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight">
              Invest in the <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                Future of Wealth.
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-md leading-relaxed">
              Our AI-driven engine analyzes millions of data points to deliver
              institutional-grade insights directly to your portfolio.
            </p>
          </div>

          <div className="space-y-5">
            {[
              {
                icon: ShieldCheck,
                title: "Secure Trading",
                desc: "Military-grade encryption for every transaction.",
              },
              {
                icon: Activity,
                title: "Real-Time Analytics",
                desc: "Live market signals updated in milliseconds.",
              },
              {
                icon: Zap,
                title: "Expert AI Support",
                desc: "Personalized financial guidance available 24/7.",
              },
              {
                icon: TrendingUp,
                title: "Proven Performance",
                desc: "Backed by data-driven, AI-optimized strategies.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 group">
                <div className="mt-1 p-2 rounded-md bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{title}</h3>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Card slot */}
        <div className="flex justify-center w-full">
          <div className="w-full max-w-md relative">
            {/* Mobile logo */}
            <div className="flex lg:hidden justify-center mb-6">
              <img
                src={logo}
                alt="Wealthora AI"
                className="h-12 w-auto drop-shadow-[0_0_25px_rgba(34,211,238,0.4)]"
              />
            </div>
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 blur-[60px] pointer-events-none" />
              <div className="relative">{children}</div>
            </div>
            <p className="mt-6 text-center text-[11px] text-slate-600 uppercase tracking-[0.2em]">
              © 2026 Wealthora AI · Secure AES-256 Encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
