import { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Refunds & Cancellations | NLF 2026 Vendor Portal',
  description: 'How to request cancellation or a refund for an NLF 2026 exhibition reservation.',
};

export default function RefundsPage() {
  return <LegalPage
    eyebrow="Bookings and payments"
    title="Refunds & Cancellations"
    intro={<>This page explains how to request cancellation or a refund for a booth reservation made through the National Livestock Festival 2026 Vendor Portal. Refund eligibility depends on the event booking terms and applicable law; submitting a request does not itself mean it has been approved.</>}
    sections={[
      { title: 'Request a cancellation or refund', content: <p>Email <a className="font-semibold text-[#1E4D38] hover:underline" href="mailto:exhibit@livestockcarnival.ng?subject=Booth%20cancellation%20or%20refund%20request">exhibit@livestockcarnival.ng</a> as soon as possible. Include your account email, reservation reference, organization name, Paystack transaction reference (if paid), and a short explanation. Do not include your full card number, PIN, password, or one-time code.</p> },
      { title: 'Review and decision', content: <p>The Secretariat will review the request against the event’s applicable booking terms, event announcements, the status of booth allocation and event services, and applicable law. The Portal does not publish a fixed cancellation deadline, automatic refund entitlement, or refund processing guarantee; ask the Secretariat for the terms that apply to your reservation before relying on a refund.</p> },
      { title: 'Approved refunds', content: <p>If a refund is approved, the Secretariat will initiate it through Paystack or the relevant payment channel and provide available status information. Paystack and the banks or payment providers involved handle the movement of funds; the time for funds to appear can vary. If Paystack needs additional information, the Secretariat will contact you using the details on your account.</p> },
      { title: 'Duplicate, failed, or unrecognized payments', content: <p>If you believe you were charged more than once, paid but your reservation remains unpaid, or see a transaction you do not recognize, contact <a className="font-semibold text-[#1E4D38] hover:underline" href="mailto:support@livestockcarnival.ng">support@livestockcarnival.ng</a> with the date, amount, and transaction reference. Never send card credentials or a one-time password. You may also contact your bank or Paystack through its official support channels.</p> },
    ]}
  />;
}
