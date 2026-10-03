import { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | NLF 2026 Vendor Portal',
  description: 'Answers to common questions about NLF vendor accounts, applications, payments, and permits.',
};

export default function FaqPage() {
  return <LegalPage
    eyebrow="Vendor help"
    title="Frequently Asked Questions"
    intro={<>Quick answers about using the National Livestock Festival 2026 Vendor Portal.</>}
    sections={[
      { title: 'Does submitting an application guarantee a booth?', content: <p>No. Applications are reviewed by the Secretariat. A reservation becomes paid only after Paystack confirms the payment, and booth placement may remain provisional until the Secretariat confirms allocation.</p> },
      { title: 'What if Paystack says payment succeeded but my permit does not update?', content: <p>Allow a short time for verification, then refresh your permit page. If it remains unpaid, email <a className="font-semibold text-[#1E4D38] hover:underline" href="mailto:support@livestockcarnival.ng">support@livestockcarnival.ng</a> with your reservation reference and Paystack transaction reference. Do not pay again until support has checked whether the first charge succeeded.</p> },
      { title: 'How do I request a cancellation or refund?', content: <p>Send your request and reservation/payment references to <a className="font-semibold text-[#1E4D38] hover:underline" href="mailto:exhibit@livestockcarnival.ng">exhibit@livestockcarnival.ng</a>. Refund requests are reviewed under the event’s applicable booking terms and law. Read the <Link className="font-semibold text-[#1E4D38] hover:underline" href="/refunds">Refunds &amp; Cancellations</Link> page.</p> },
      { title: 'How is my information used?', content: <p>We use account and business information to manage applications, booths, permits, payments, security, and support. Read the <Link className="font-semibold text-[#1E4D38] hover:underline" href="/privacy">Privacy Notice</Link> for details about data collected, service providers, retention, and your choices.</p> },
      { title: 'I cannot sign in or complete a form. What should I do?', content: <p>Try refreshing the page and confirm you are using the email associated with your vendor account. If the issue continues, contact <a className="font-semibold text-[#1E4D38] hover:underline" href="mailto:support@livestockcarnival.ng">support@livestockcarnival.ng</a> and tell us which page you were using. See also our <Link className="font-semibold text-[#1E4D38] hover:underline" href="/accessibility">Accessibility Statement</Link>.</p> },
    ]}
  />;
}
