import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';
import { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  metadataBase: new URL('https://vendors.livestockcarnival.ng'),
  title: 'NLF 2026 - Vendor Booth Portal',
  description: 'National Livestock Festival 2026 Vendor Booth Reservation Portal',
  icons: {
    icon: [
      { url: '/logo.jpeg' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  openGraph: {
    title: 'NLF 2026 - Vendor Booth Portal',
    description: 'National Livestock Festival 2026 Vendor Booth Reservation Portal',
    url: 'https://vendors.livestockcarnival.ng',
    siteName: 'NLF Vendors',
    images: [
      {
        url: '/logo.jpeg',
        width: 800,
        height: 800,
        alt: 'National Livestock Festival Logo',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable} ${jetbrains.variable}`}>
      <head>
        <link rel="icon" href="/logo.jpeg" />
        <link rel="apple-touch-icon" href="/logo.jpeg" />
      </head>
      <body className="font-sans antialiased bg-[#FBFBFA] text-gray-900 min-h-screen">
        <AuthProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
