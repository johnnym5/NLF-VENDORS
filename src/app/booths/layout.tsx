import React from 'react';

export default function BoothsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FBFBFA]">
      <main>{children}</main>
    </div>
  );
}
