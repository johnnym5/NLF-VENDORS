import Link from 'next/link';
import { ReactNode } from 'react';

export interface LegalSection {
  title: string;
  content: ReactNode;
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-[70vh] bg-[#FBFBFA] px-4 py-12 sm:py-16">
      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-12 sm:py-12">
        <Link href="/" className="text-sm font-semibold text-[#1E4D38] hover:underline">NLF 2026 Vendor Portal</Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h1>
        <div className="mt-5 text-base leading-7 text-slate-600">{intro}</div>
        <p className="mt-4 text-xs text-slate-400">Last updated: 3 October 2026</p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-heading text-lg font-bold text-slate-900">{section.title}</h2>
              <div className="mt-2 space-y-3 text-sm leading-7 text-slate-600">{section.content}</div>
            </section>
          ))}
        </div>
        <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
          Questions? Email <a className="font-semibold text-[#1E4D38] hover:underline" href="mailto:support@livestockcarnival.ng">support@livestockcarnival.ng</a>.
        </div>
      </article>
    </main>
  );
}

export function BulletList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-[#1E4D38]">{children}</ul>;
}
