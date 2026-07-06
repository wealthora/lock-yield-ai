import { Link } from "react-router-dom";
import logo from "/wealthora-logo.png";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-2xl font-semibold mb-3 text-foreground">{title}</h2>
    <div className="text-muted-foreground space-y-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1">
      {children}
    </div>
  </section>
);

const WithdrawalPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="glass-strong sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Wealthora ai" className="h-[40px] w-auto" />
          </Link>
          <Link to="/dashboard/withdraw" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <article>
          <h1 className="text-4xl font-bold mb-2 text-foreground">Withdrawal Policy</h1>
          <p className="text-muted-foreground mb-8">Effective as of 2026</p>

          <Section title="1. Overview">
            <p>This Withdrawal Policy outlines the rules, procedures, and requirements governing withdrawals from the platform. By submitting a withdrawal request, users agree to comply with the terms stated herein.</p>
          </Section>

          <Section title="2. Withdrawal Eligibility">
            <p>Users may request withdrawals subject to the following conditions:</p>
            <ul>
              <li>The account must be fully registered and verified.</li>
              <li>The user must have sufficient available balance.</li>
              <li>Funds under active investment, pending transactions, bonuses, or promotional lock periods may not be eligible for withdrawal.</li>
              <li>The account must not be under investigation for suspicious or fraudulent activity.</li>
            </ul>
          </Section>

          <Section title="3. Withdrawal Methods">
            <p>Available withdrawal methods may include:</p>
            <ul>
              <li>Bank Transfer</li>
              <li>Mobile Money (e.g., M-Pesa)</li>
              <li>Debit/Credit Card Refunds (where applicable)</li>
              <li>Supported Digital Wallets</li>
            </ul>
            <p>The availability of withdrawal methods may vary by country and account type.</p>
          </Section>

          <Section title="4. Minimum Withdrawal Amount">
            <p>The minimum withdrawal amount varies depending on the selected withdrawal method.</p>
            <p>Users can view the applicable minimum amount before submitting a withdrawal request.</p>
          </Section>

          <Section title="5. Maximum Withdrawal Limits">
            <p><strong>Daily Withdrawal Limit</strong></p>
            <p>Maximum withdrawal per user per day: USD 10,000</p>
            <p><strong>Additional Limits</strong></p>
            <p>The platform reserves the right to impose:</p>
            <ul>
              <li>Transaction limits per withdrawal request.</li>
              <li>Monthly withdrawal limits.</li>
              <li>Enhanced verification requirements for large withdrawals.</li>
            </ul>
          </Section>

          <Section title="6. Processing Time">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Method</th>
                    <th className="text-left px-4 py-2 font-semibold">Estimated Processing Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Mobile Money</td>
                    <td className="px-4 py-2">24 – 48 Hours</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Bank Transfer</td>
                    <td className="px-4 py-2">24 – 72 Hours</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Digital Wallet</td>
                    <td className="px-4 py-2">24 – 48 Hours</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>Processing times are estimates and may be affected by:</p>
            <ul>
              <li>Banking delays</li>
              <li>Public holidays</li>
              <li>Weekends</li>
              <li>Additional compliance reviews</li>
              <li>Third-party payment providers</li>
            </ul>
          </Section>

          <Section title="7. Processing Days">
            <p>Withdrawal requests are processed during:</p>
            <p>Monday – Friday</p>
            <p>Requests submitted outside business days or during public holidays will be processed on the next business day.</p>
          </Section>

          <Section title="8. Verification Requirements">
            <p>To protect user funds and comply with regulatory requirements, the platform may require:</p>
            <ul>
              <li>Government-issued identification.</li>
              <li>Proof of address.</li>
              <li>Selfie verification.</li>
              <li>Source of funds documentation.</li>
              <li>Additional Know Your Customer (KYC) information.</li>
            </ul>
            <p>Failure to provide requested documents may result in delays or rejection of withdrawal requests.</p>
          </Section>

          <Section title="9. Security Precautions">
            <p>For user protection, the platform may:</p>
            <p><strong>Account Verification</strong></p>
            <p>Require identity verification before processing withdrawals.</p>
            <p><strong>Two-Factor Authentication (2FA)</strong></p>
            <p>Require users to enable and pass 2FA verification before withdrawals are approved.</p>
            <p><strong>Withdrawal Review</strong></p>
            <p>Flag and manually review withdrawals that:</p>
            <ul>
              <li>Exceed normal account activity.</li>
              <li>Originate from new devices.</li>
              <li>Originate from unusual locations.</li>
              <li>Trigger fraud prevention systems.</li>
            </ul>
            <p><strong>Cooling-Off Period</strong></p>
            <p>The platform may impose a temporary withdrawal hold after:</p>
            <ul>
              <li>Password changes.</li>
              <li>Email address changes.</li>
              <li>Mobile number changes.</li>
              <li>Security setting modifications.</li>
            </ul>
          </Section>

          <Section title="10. Anti-Fraud & Anti-Money Laundering Measures">
            <p>The platform strictly prohibits:</p>
            <ul>
              <li>Money laundering activities.</li>
              <li>Terrorist financing.</li>
              <li>Identity theft.</li>
              <li>Use of stolen payment instruments.</li>
              <li>Multiple accounts created to bypass withdrawal limits.</li>
              <li>Fraudulent transactions.</li>
            </ul>
            <p>Suspicious transactions may be:</p>
            <ul>
              <li>Delayed.</li>
              <li>Investigated.</li>
              <li>Reported to relevant authorities where required by law.</li>
              <li>Frozen pending verification.</li>
            </ul>
          </Section>

          <Section title="11. Withdrawal Fees">
            <p>Withdrawal fees, where applicable, will be clearly displayed before the user confirms the withdrawal request.</p>
            <p>The platform reserves the right to update fees at any time with prior notice.</p>
          </Section>

          <Section title="12. Failed or Rejected Withdrawals">
            <p>A withdrawal request may be rejected if:</p>
            <ul>
              <li>Account verification is incomplete.</li>
              <li>Incorrect payment details are provided.</li>
              <li>Insufficient available balance exists.</li>
              <li>Fraud prevention checks fail.</li>
              <li>Regulatory requirements are not met.</li>
            </ul>
            <p>Rejected withdrawals will typically be returned to the user's account balance after review.</p>
          </Section>

          <Section title="13. Account Suspension or Restriction">
            <p>The platform reserves the right to suspend, delay, or deny withdrawals where:</p>
            <ul>
              <li>Fraudulent activity is suspected.</li>
              <li>Terms and Conditions have been violated.</li>
              <li>Legal or regulatory obligations require action.</li>
              <li>A court order or government directive has been received.</li>
            </ul>
          </Section>

          <Section title="14. User Responsibilities">
            <p>Users are responsible for:</p>
            <ul>
              <li>Maintaining accurate payment details.</li>
              <li>Keeping login credentials secure.</li>
              <li>Enabling recommended security features.</li>
              <li>Reporting unauthorized account activity immediately.</li>
              <li>Ensuring compliance with local laws and tax obligations.</li>
            </ul>
          </Section>

          <Section title="15. Risk Disclosure">
            <p>The platform is not responsible for delays caused by:</p>
            <ul>
              <li>Banks or payment providers.</li>
              <li>Network outages.</li>
              <li>Regulatory reviews.</li>
              <li>Events beyond reasonable control.</li>
            </ul>
            <p>Users acknowledge that withdrawal processing may occasionally require additional verification and review.</p>
          </Section>

          <Section title="16. Policy Changes">
            <p>The platform reserves the right to amend this Withdrawal Policy at any time. Material changes will be communicated through the website, application, or registered email address.</p>
          </Section>

          <Section title="17. Contact Support">
            <p>For withdrawal-related inquiries, users may contact the support team through:</p>
            <ul>
              <li>Support Ticket System</li>
              <li>Email Support</li>
              <li>Live Chat (where available)</li>
            </ul>
            <p>Please include:</p>
            <ul>
              <li>Account ID</li>
              <li>Withdrawal Reference Number</li>
              <li>Date of Request</li>
              <li>Relevant supporting information</li>
            </ul>
          </Section>

          <Section title="Quick Summary">
            <ul>
              <li>Minimum Withdrawal: Varies by method</li>
              <li>Maximum Daily Withdrawal: USD 10,000</li>
              <li>Processing Time: 24–72 hours</li>
              <li>Processing Days: Monday–Friday</li>
              <li>KYC Verification: Required</li>
              <li>2FA Protection: Recommended/Required</li>
              <li>Fraud Monitoring: Active</li>
              <li>Withdrawal Holds: May apply after security changes</li>
              <li>Withdrawal Fees: May apply depending on method and region</li>
            </ul>
            <p>This policy is designed to protect users, ensure regulatory compliance, and maintain the security and integrity of the platform.</p>
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

export default WithdrawalPolicy;
