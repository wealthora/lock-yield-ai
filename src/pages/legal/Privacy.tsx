import { Link } from "react-router-dom";
import logo from "@/assets/wealthora-logo.png";

const Privacy = () => {
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
          <h1 className="text-4xl font-bold mb-2 text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last Updated: 3rd May 2024</p>

          <p className="text-muted-foreground mb-8">Wealthora AI values your privacy.</p>

          <Section title="Information We Collect">
            <p>We may collect:</p>
            <ul>
              <li>name</li>
              <li>email</li>
              <li>account credentials</li>
              <li>payment information</li>
              <li>device/browser information</li>
              <li>usage analytics</li>
            </ul>
          </Section>

          <Section title="How We Use Information">
            <p>We use collected data to:</p>
            <ul>
              <li>provide services</li>
              <li>improve platform performance</li>
              <li>personalize user experience</li>
              <li>process payments</li>
              <li>prevent fraud/security risks</li>
            </ul>
          </Section>

          <Section title="Data Protection">
            <p>We implement industry-standard security measures to protect user data.</p>
            <p>However, no system is 100% secure.</p>
          </Section>

          <Section title="Third-Party Services">
            <p>We may use third-party providers for:</p>
            <ul>
              <li>payment processing</li>
              <li>analytics</li>
              <li>hosting</li>
              <li>authentication</li>
            </ul>
            <p>These providers may process data under their own privacy policies.</p>
          </Section>

          <Section title="Cookies">
            <p>We use cookies for:</p>
            <ul>
              <li>authentication</li>
              <li>analytics</li>
              <li>personalization</li>
            </ul>
            <p>Users may disable cookies in browser settings.</p>
          </Section>

          <Section title="User Rights">
            <p>Users may request:</p>
            <ul>
              <li>data access</li>
              <li>correction</li>
              <li>deletion</li>
            </ul>
            <p>
              Contact:{" "}
              <a href="mailto:support@wealthora.ai" className="text-primary hover:underline">
                support@wealthora.ai
              </a>
            </p>
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

export default Privacy;
