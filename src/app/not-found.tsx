import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBFA] px-4 text-center">
      <h1 className="text-4xl font-heading font-bold text-slate-900 mb-2">404</h1>
      <p className="text-slate-600 mb-6">Page not found.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
