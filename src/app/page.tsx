import Link from 'next/link';
import { Beef, Tent, Tractor, ArrowRight, ShieldCheck } from 'lucide-react';

const boothHighlights = [
  {
    icon: Beef,
    title: 'Standard Stall',
    description: '3m × 3m demarcated floor space with shared cold storage and basic signage.',
    color: '#1E4D38',
    bgColor: '#F2F7F4',
    borderColor: '#B8D8C5',
  },
  {
    icon: Tent,
    title: 'Premium Pavilion',
    description: '6m × 3m covered pavilion with dedicated power, premium branding, and VIP badges.',
    color: '#8D6B1B',
    bgColor: '#FAF6EC',
    borderColor: '#E8D7B0',
  },
  {
    icon: Tractor,
    title: 'Corporate Island',
    description: '9m × 6m island plot with heavy machinery lane, private meeting area, and full media package.',
    color: '#1F2937',
    bgColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">
        <div className="animate-fade-in">
          <p className="text-sm text-slate-500 uppercase tracking-widest mb-3 font-medium">
            Federal Ministry of Livestock Development
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-slate-900 mb-4 leading-tight">
            National Livestock<br />Festival 2026
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto mb-10">
            Secure your commercial exhibition booth at Nigeria&apos;s premier livestock and agribusiness showcase. Abuja, 2026.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/booths"
              className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-medium px-8 py-3.5 rounded-lg hover:bg-slate-800 transition-colors duration-200 text-base shadow-sm"
            >
              Browse Exhibition Booths
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border border-slate-300 text-slate-700 font-medium px-8 py-3.5 rounded-lg hover:bg-slate-50 transition-colors duration-200 text-base"
            >
              Vendor Login
            </Link>
          </div>
        </div>
      </section>

      {/* Booth Highlights */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm text-slate-500 uppercase tracking-wider mb-8 font-medium">
            Three Exhibition Tiers
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {boothHighlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border p-6 transition-shadow duration-500 hover:shadow-md"
                  style={{
                    backgroundColor: item.bgColor,
                    borderColor: item.borderColor,
                    animationDelay: `${index * 150}ms`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: item.color }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3
                    className="font-heading font-semibold text-lg mb-2"
                    style={{ color: item.color }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <p>© 2026 National Livestock Festival — Vendor Portal</p>
          <div className="flex items-center gap-6">
            <Link
              href="/setup"
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              Setup
            </Link>
            <Link
              href="/admin/booths"
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Administration
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
