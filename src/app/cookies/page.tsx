import { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Cookies & Browser Storage | NLF 2026 Vendor Portal',
  description: 'Information about cookies and essential browser storage used by the Vendor Portal.',
};

export default function CookiesPage() {
  return <LegalPage
    eyebrow="Privacy preferences"
    title="Cookies & Browser Storage"
    intro={<>The Portal uses necessary browser storage to keep sign-in sessions working and protect account features. This notice explains what that means and how third-party services may use their own technologies.</>}
    sections={[
      { title: 'Essential authentication storage', content: <p>Supabase Auth stores session information in browser storage so you can remain signed in and securely access your account. This storage is needed for the Portal’s requested account and reservation services. Clearing browser storage or signing out may end your session.</p> },
      { title: 'Payment and third-party technologies', content: <p>When you open Paystack checkout or choose Google sign-in, those providers may use cookies or similar technologies under their own privacy and cookie notices. Their technologies support payment security, authentication, and fraud prevention. The Portal does not control third-party cookies.</p> },
      { title: 'Analytics and choices', content: <p>The Portal does not currently use advertising cookies or third-party analytics cookies. You can clear or block browser storage through your browser settings, but sign-in, checkout, or other requested features may then stop working as intended. If the Portal adds non-essential tracking in the future, this notice will be updated and any required consent will be requested.</p> },
      { title: 'Contact', content: <p>Questions about browser storage or privacy? Email <a className="font-semibold text-[#1E4D38] hover:underline" href="mailto:support@livestockcarnival.ng">support@livestockcarnival.ng</a>.</p> },
    ]}
  />;
}
