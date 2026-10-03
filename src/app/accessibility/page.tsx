import { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Accessibility Statement | NLF 2026 Vendor Portal',
  description: 'Accessibility support and feedback for the NLF 2026 Vendor Portal.',
};

export default function AccessibilityPage() {
  return <LegalPage
    eyebrow="Help using the Portal"
    title="Accessibility Statement"
    intro={<>The National Livestock Festival Secretariat wants vendors to be able to access information and complete application tasks through this Portal. We are working to make the experience clear and usable across devices and assistive technologies.</>}
    sections={[
      { title: 'Accessibility support', content: <p>If you have difficulty viewing a page, completing a form, signing in, or using checkout, email <a className="font-semibold text-[#1E4D38] hover:underline" href="mailto:exhibit@carnival.ng?subject=Accessibility%20support">exhibit@carnival.ng</a>. Describe the page and task, the device or assistive technology you use if you are comfortable sharing it, and an alternative way we can assist. Do not send passwords or payment credentials.</p> },
      { title: 'Feedback', content: <p>We welcome specific suggestions that can help us improve the Portal. We will review accessibility issues and work to provide a reasonable alternative when a task cannot be completed through the site.</p> },
    ]}
  />;
}
