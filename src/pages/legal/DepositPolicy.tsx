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

const DepositPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="glass-strong sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Wealthora ai" className="h-[40px] w-auto" />
          </Link>
          <Link to="/dashboard/deposit" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <article>
          <h1 className="text-4xl font-bold mb-2 text-foreground">Deposit Policy</h1>
          <p className="text-muted-foreground mb-8">Effective as of 2026</p>
          <p className="text-sm text-muted-foreground mb-6">
            This page is maintained by Wealthora.ai to outline the deposit rules and procedures for the platform. It is provided as app-owned content and does not constitute legal certification or independent verification.
          </p>

          <Section title="1. Overview">
            <p>This Deposit Policy outlines the rules, procedures, and requirements governing deposits made into the platform. By making a deposit, users acknowledge and agree to comply with this policy as well as the Platform's Terms and Conditions.</p>
          </Section>

          <Section title="2. Deposit Eligibility">
            <p>Users may make deposits provided that:</p>
            <ul>
              <li>The account is registered and active.</li>
              <li>The user has completed any required identity verification (KYC), where applicable.</li>
              <li>Deposits are made using payment methods registered in the user's own name where required by law.</li>
              <li>The account is not suspended, restricted, or under investigation.</li>
            </ul>
            <p>The platform reserves the right to reject deposits that do not meet these requirements.</p>
          </Section>

          <Section title="3. Accepted Deposit Methods">
            <p>Available deposit methods may include:</p>
            <ul>
              <li>Bank Transfer</li>
              <li>Mobile Money (e.g., M-Pesa)</li>
              <li>Debit/Credit Cards</li>
              <li>Supported Digital Wallets</li>
              <li>Other payment methods offered by the platform</li>
            </ul>
            <p>Available methods may vary depending on your country or region.</p>
          </Section>

          <Section title="4. Minimum Deposit Amount">
            <p>The minimum deposit amount varies depending on the selected payment method.</p>
            <p>Users can view the applicable minimum deposit before confirming the transaction.</p>
          </Section>

          <Section title="5. Maximum Deposit Limits">
            <p>Deposit limits may vary depending on:</p>
            <ul>
              <li>Account verification level</li>
              <li>Payment method</li>
              <li>Applicable laws and regulations</li>
              <li>Internal risk management policies</li>
            </ul>
            <p>The platform may increase or decrease deposit limits without prior notice where necessary for security or regulatory compliance.</p>
          </Section>

          <Section title="6. Deposit Processing Time">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Deposit Method</th>
                    <th className="text-left px-4 py-2 font-semibold">Estimated Processing Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Mobile Money</td>
                    <td className="px-4 py-2">Instant – 30 Minutes</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Debit/Credit Card</td>
                    <td className="px-4 py-2">Instant</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Digital Wallet</td>
                    <td className="px-4 py-2">Instant – 1 Hour</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Bank Transfer</td>
                    <td className="px-4 py-2">1 – 3 Business Days</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>Actual processing times may vary due to:</p>
            <ul>
              <li>Banking systems</li>
              <li>Payment provider delays</li>
              <li>Weekends and public holidays</li>
              <li>Regulatory reviews</li>
              <li>Network interruptions</li>
            </ul>
          </Section>

          <Section title="7. Deposit Confirmation">
            <p>A deposit is considered successful only after:</p>
            <ul>
              <li>Payment has been received by the platform.</li>
              <li>The payment provider confirms the transaction.</li>
              <li>Required compliance and fraud checks have been completed.</li>
            </ul>
            <p>Users will receive a notification once funds have been credited to their account.</p>
          </Section>

          <Section title="8. Deposit Fees">
            <p>The platform may charge deposit fees depending on:</p>
            <ul>
              <li>Payment method</li>
              <li>Payment provider</li>
              <li>Country or region</li>
            </ul>
            <p>Any applicable fees will be displayed before the user confirms the transaction.</p>
            <p>Third-party providers may also charge additional fees outside the platform's control.</p>
          </Section>

          <Section title="9. Currency">
            <p>Deposits may be accepted in supported currencies.</p>
            <p>Where currency conversion is required:</p>
            <ul>
              <li>Exchange rates will be determined by the payment provider or financial institution.</li>
              <li>Currency conversion fees may apply.</li>
            </ul>
          </Section>

          <Section title="10. Security Measures">
            <p>To protect users and maintain platform integrity, the platform may implement:</p>
            <p><strong>Identity Verification (KYC)</strong></p>
            <p>Users may be required to verify their identity before deposits are accepted.</p>
            <p><strong>Payment Verification</strong></p>
            <p>The platform may request proof of payment or ownership of the payment method.</p>
            <p><strong>Two-Factor Authentication (2FA)</strong></p>
            <p>Users are encouraged or required to complete 2FA before making deposits.</p>
            <p><strong>Fraud Detection</strong></p>
            <p>All deposits are monitored for unusual or suspicious activity. Transactions may be delayed or reviewed if they trigger fraud prevention systems.</p>
          </Section>

          <Section title="11. Anti-Money Laundering (AML) Compliance">
            <p>The platform complies with applicable Anti-Money Laundering (AML) and Know Your Customer (KYC) regulations.</p>
            <p>Users may be required to provide:</p>
            <ul>
              <li>Government-issued identification</li>
              <li>Proof of address</li>
              <li>Source of funds documentation</li>
              <li>Additional verification information</li>
            </ul>
            <p>Failure to provide requested documentation may result in deposits being delayed, rejected, or refunded where appropriate.</p>
          </Section>

          <Section title="12. Prohibited Activities">
            <p>Users may not:</p>
            <ul>
              <li>Use stolen or unauthorized payment methods.</li>
              <li>Deposit funds on behalf of another person without authorization.</li>
              <li>Engage in money laundering or terrorist financing.</li>
              <li>Attempt to manipulate bonuses or promotional offers.</li>
              <li>Create multiple accounts to circumvent deposit limits.</li>
            </ul>
            <p>Violations may result in account suspension, deposit reversal, or permanent account closure.</p>
          </Section>

          <Section title="13. Failed or Reversed Deposits">
            <p>A deposit may fail or be reversed if:</p>
            <ul>
              <li>Payment authorization is declined.</li>
              <li>Insufficient funds exist.</li>
              <li>Incorrect payment information is provided.</li>
              <li>Fraud or suspicious activity is detected.</li>
              <li>The payment provider reverses or disputes the transaction.</li>
            </ul>
            <p>The platform is not responsible for delays caused by third-party payment providers.</p>
          </Section>

          <Section title="14. Chargebacks and Payment Disputes">
            <p>Unauthorized chargebacks or payment disputes may result in:</p>
            <ul>
              <li>Immediate suspension of the account.</li>
              <li>Reversal of credited funds.</li>
              <li>Recovery of any associated costs or fees.</li>
              <li>Permanent restriction from using the platform.</li>
            </ul>
            <p>Users should contact customer support before initiating a dispute with their payment provider.</p>
          </Section>

          <Section title="15. Promotional Deposits and Bonuses">
            <p>Where deposit bonuses or promotional offers are available:</p>
            <ul>
              <li>They are subject to separate Bonus Terms and Conditions.</li>
              <li>Abuse of promotional offers may result in forfeiture of bonuses and account restrictions.</li>
            </ul>
          </Section>

          <Section title="16. User Responsibilities">
            <p>Users are responsible for:</p>
            <ul>
              <li>Providing accurate payment information.</li>
              <li>Using payment methods they are legally authorized to use.</li>
              <li>Keeping their account credentials secure.</li>
              <li>Promptly reporting unauthorized transactions.</li>
              <li>Complying with all applicable laws and tax obligations.</li>
            </ul>
          </Section>

          <Section title="17. Platform Rights">
            <p>The platform reserves the right to:</p>
            <ul>
              <li>Reject or cancel deposits.</li>
              <li>Request additional verification.</li>
              <li>Delay processing for compliance reviews.</li>
              <li>Suspend accounts suspected of fraudulent activity.</li>
              <li>Modify deposit limits or available payment methods at its discretion.</li>
            </ul>
          </Section>

          <Section title="18. Refund Policy">
            <p>Deposits are generally non-refundable once successfully credited to a user's account.</p>
            <p>Refunds may only be considered in exceptional circumstances, including:</p>
            <ul>
              <li>Duplicate payments.</li>
              <li>Technical processing errors.</li>
              <li>Payments made in error and approved by the platform.</li>
              <li>Legal or regulatory requirements.</li>
            </ul>
            <p>Approved refunds will be returned to the original payment method where possible.</p>
          </Section>

          <Section title="19. Policy Updates">
            <p>The platform reserves the right to amend this Deposit Policy at any time.</p>
            <p>Users will be notified of significant changes through the website, mobile application, or registered email address.</p>
          </Section>

          <Section title="20. Contact Support">
            <p>For deposit-related inquiries, users may contact Customer Support through:</p>
            <ul>
              <li>Support Ticket System</li>
              <li>Email Support</li>
              <li>Live Chat (where available)</li>
            </ul>
            <p>Please provide:</p>
            <ul>
              <li>Account ID</li>
              <li>Transaction Reference Number</li>
              <li>Deposit Date</li>
              <li>Payment Method</li>
              <li>Supporting documentation (if applicable)</li>
            </ul>
          </Section>

          <Section title="Quick Summary">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Item</th>
                    <th className="text-left px-4 py-2 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Minimum Deposit</td>
                    <td className="px-4 py-2">Varies by payment method</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Maximum Deposit</td>
                    <td className="px-4 py-2">Based on account limits and verification level</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Processing Time</td>
                    <td className="px-4 py-2">Instant to 3 Business Days</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Processing Days</td>
                    <td className="px-4 py-2">24/7 (subject to banking schedules)</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Accepted Methods</td>
                    <td className="px-4 py-2">Bank Transfer, Mobile Money, Cards, Digital Wallets</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Deposit Fees</td>
                    <td className="px-4 py-2">May apply depending on payment method</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Identity Verification</td>
                    <td className="px-4 py-2">Required where applicable</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">AML &amp; Fraud Checks</td>
                    <td className="px-4 py-2">Active on all deposits</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Refunds</td>
                    <td className="px-4 py-2">Generally non-refundable after successful credit</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">Security</td>
                    <td className="px-4 py-2">2FA, KYC, fraud monitoring, and payment verification</td>
                  </tr>
                </tbody>
              </table>
            </div>
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

export default DepositPolicy;
