import { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Contact the Secretariat | NLF 2026 Vendor Portal',
  description: 'Contact the National Livestock Festival Secretariat for vendor portal support.',
};

export default function ContactPage() {
  return <LegalPage
    eyebrow="Vendor support"
    title="Contact the Secretariat"
    intro={<>Need help with a vendor account, booth application, payment, or permit? Contact the National Livestock Festival Secretariat using the support address below.</>}
    sections={[
      { title: 'Email support', content: <><p><a className="font-semibold text-[#1E4D38] hover:underline" href="mailto:exhibit@carnival.ng">exhibit@carnival.ng</a></p><p>To help us investigate, include the email address on your vendor account and your reservation reference. For a payment question, include the Paystack transaction reference and amount. Never send passwords, card numbers, PINs, or one-time passwords.</p></> },
      { title: 'What to expect', content: <p>Support requests are reviewed by the Secretariat. Please allow reasonable time for a response, especially during application and event periods. For a cancellation or refund, see <Link className="font-semibold text-[#1E4D38] hover:underline" href="/refunds">Refunds &amp; Cancellations</Link>.</p> },
    ]}
  />;
}
