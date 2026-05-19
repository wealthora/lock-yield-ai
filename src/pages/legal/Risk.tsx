import { Link } from "react-router-dom";
import logo from "@/assets/wealthora-logo.png";

const Risk = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="glass-strong sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Wealthora ai" className="h-[40px] w-auto" />
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to Home
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <article>
          <h1 className="text-4xl font-bold mb-2 text-foreground">Risk Disclosure</h1>
          <p className="text-muted-foreground mb-8">Trading and investing involve substantial risk.</p>
          <p className="text-muted-foreground mb-8">By using Wealthora AI, you acknowledge:</p>

          <Section title="Market Risk">
            <p>Financial markets are volatile and unpredictable.</p>
            <p>Past performance does not guarantee future results.</p>
          </Section>

          <Section title="AI Limitations">
            <p>AI-generated insights may contain:</p>
            <ul>
              <li>inaccuracies</li>
              <li>delays</li>
              <li>incomplete analysis</li>
            </ul>
            <p>AI outputs should not be relied upon as sole decision-making tools.</p>
          </Section>

          <Section title="Loss of Capital">
            <p>Users may lose some or all invested capital.</p>
            <p>Only invest funds you can afford to lose.</p>
          </Section>

          <Section title="User Responsibility">
            <p>You remain fully responsible for:</p>
            <ul>
              <li>investment decisions</li>
              <li>broker actions</li>
              <li>portfolio management</li>
            </ul>
            <p>Wealthora AI bears no responsibility for losses.</p>
          </Section>
        </article>
      </main>

      <footer className="border-t border-border bg-muted/30 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 Wealthora.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-2xl font-semibold mb-3 text-foreground">{title}</h2>
    <div className="text-muted-foreground space-y-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
      {children}
    </div>
  </section>
);

export default Risk;
