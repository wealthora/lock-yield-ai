import { Link } from "react-router-dom";
import logo from "@/assets/wealthora-logo.png";

const Compliance = () => {
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
          <h1 className="text-4xl font-bold mb-2 text-foreground">Compliance Statement</h1>
          <p className="text-muted-foreground mb-8">
            Wealthora AI is committed to ethical operations and regulatory awareness.
          </p>

          <Section title="AML/KYC">
            <p>Where applicable, users may be required to complete identity verification.</p>
            <p>We reserve the right to restrict accounts suspected of:</p>
            <ul>
              <li>fraud</li>
              <li>money laundering</li>
              <li>sanctions violations</li>
            </ul>
          </Section>

          <Section title="Restricted Jurisdictions">
            <p>Services may not be available in jurisdictions where prohibited by law.</p>
            <p>Users are responsible for ensuring legal compliance in their location.</p>
          </Section>

          <Section title="Regulatory Disclaimer">
            <p>
              Wealthora AI is a technology platform and does not represent itself as:
            </p>
            <ul>
              <li>a broker</li>
              <li>licensed investment advisor</li>
              <li>bank</li>
              <li>regulated financial institution unless otherwise stated</li>
            </ul>
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

export default Compliance;
