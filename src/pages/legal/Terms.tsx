import { Link } from "react-router-dom";
import logo from "@/assets/wealthora-logo.png";

const Terms = () => {
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
        <article className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">Last Updated: 3rd May 2024</p>

          <p className="text-muted-foreground mb-8">
            Welcome to Wealthora AI. By accessing or using our platform, website, mobile application, or
            services, you agree to these Terms of Service.
          </p>

          <Section title="1. Eligibility">
            <p>
              You must be at least 18 years old and legally capable of entering binding agreements to use
              Wealthora AI.
            </p>
          </Section>

          <Section title="2. Services">
            <p>Wealthora AI provides:</p>
            <ul>
              <li>AI-powered market insights</li>
              <li>Trading analytics</li>
              <li>Wealth management tools</li>
              <li>Educational financial content</li>
            </ul>
            <p>We do not guarantee profits, successful trades, or financial outcomes.</p>
          </Section>

          <Section title="3. No Financial Advice">
            <p>
              All information provided on Wealthora AI is for informational and educational purposes only.
            </p>
            <p>Nothing on this platform constitutes:</p>
            <ul>
              <li>investment advice</li>
              <li>tax advice</li>
              <li>legal advice</li>
              <li>financial advisory services</li>
            </ul>
            <p>Users are solely responsible for their own investment decisions.</p>
          </Section>

          <Section title="4. Account Responsibility">
            <p>You are responsible for:</p>
            <ul>
              <li>maintaining account security</li>
              <li>safeguarding passwords</li>
              <li>all activity under your account</li>
            </ul>
            <p>Wealthora AI is not liable for unauthorized access caused by user negligence.</p>
          </Section>

          <Section title="5. Subscription & Payments">
            <p>Paid plans are billed according to selected pricing.</p>
            <p>Subscriptions may renew automatically unless canceled before renewal.</p>
            <p>Payments are non-refundable unless required by law.</p>
          </Section>

          <Section title="6. Prohibited Conduct">
            <p>Users may not:</p>
            <ul>
              <li>misuse platform tools</li>
              <li>engage in fraud</li>
              <li>upload malicious software</li>
              <li>attempt unauthorized access</li>
              <li>scrape platform data</li>
            </ul>
            <p>Violation may result in account suspension or termination.</p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              All platform content, branding, software, algorithms, and designs remain property of Wealthora
              AI.
            </p>
            <p>Users may not reproduce or redistribute without permission.</p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>Wealthora AI is not liable for:</p>
            <ul>
              <li>trading losses</li>
              <li>missed opportunities</li>
              <li>data inaccuracies</li>
              <li>service interruptions</li>
            </ul>
            <p>Use of the platform is at your own risk.</p>
          </Section>

          <Section title="9. Termination">
            <p>We reserve the right to suspend or terminate accounts violating these terms.</p>
          </Section>

          <Section title="10. Changes">
            <p>Terms may be updated periodically. Continued use constitutes acceptance.</p>
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

export default Terms;
