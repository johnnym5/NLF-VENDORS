import Link from 'next/link';

const legalLinks = [
  { href: '/terms', label: 'Terms of Use' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/refunds', label: 'Refunds & Cancellations' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/accessibility', label: 'Accessibility' },
  { href: '/faq', label: 'FAQ' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 National Livestock Festival — Vendor Portal</p>
        <nav aria-label="Legal and support" className="flex flex-wrap gap-x-5 gap-y-2">
          {legalLinks.map((link) => <Link key={link.href} href={link.href} className="hover:text-[#1E4D38] hover:underline">{link.label}</Link>)}
          <Link href="/contact" className="hover:text-[#1E4D38] hover:underline">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
