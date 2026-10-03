import React from 'react';

export default function BoothsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent">
      <main>{children}</main>
    </div>
  );
}
