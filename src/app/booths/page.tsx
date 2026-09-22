'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { useTiers } from '@/lib/firestore';
import { getTierColors, formatNaira } from '@/lib/design-tokens';
import { FadeIn } from '@/components/ui/FadeIn';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { BoothTier } from '@/lib/types';

export default function BoothsPage() {
  const router = useRouter();
  const { tiers, loading, error } = useTiers();

  const handleBook = (tierId: string) => {
    router.push(`/booths/checkout?tier=${tierId}`);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">
            National Livestock Festival 2026
          </p>
          <h1 className="text-3xl font-heading font-bold text-slate-900 mb-4">
            Commercial Exhibition Booths
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Secure your presence at the premier livestock exhibition. Choose a booth tier that fits your organization&apos;s needs.
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-8 max-w-2xl mx-auto">
            Failed to load booth tiers. Please try again later.
          </Alert>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-pulse h-96"
              ></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier: BoothTier, index: number) => {
              const colors = getTierColors(tier.colorCode);
              const isOutOfStock = tier.stock === 0;
              const isDisabled = isOutOfStock || tier.isLocked;

              // We manually construct the border-l class or inject a style because colors.borderColor is a border utility class
              const borderColorMatch = colors.borderColor.match(/border-\[(#[0-9a-fA-F]+)\]/);
              const inlineBorderColor = borderColorMatch ? borderColorMatch[1] : undefined;

              return (
                <FadeIn key={tier.id} delay={index * 150}>
                  <div
                    className={`bg-white rounded-xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow duration-500 p-6 flex flex-col h-full ${
                      tier.isLocked ? 'opacity-75' : ''
                    }`}
                    style={{ borderLeftWidth: '3px', borderLeftColor: inlineBorderColor }}
                  >
                    <div className="mb-4">
                      <Badge variant={tier.colorCode} className="mb-2">
                        {tier.name}
                      </Badge>
                      <h2 className="font-heading text-xl font-semibold text-slate-900">
                        {tier.name}
                      </h2>
                      <p className="text-sm text-slate-500 font-mono mt-1">
                        {tier.dimension}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 my-4"></div>

                    <div className="flex-grow">
                      <ul className="space-y-3">
                        {tier.perks.map((perk, i) => (
                          <li key={i} className="flex items-start">
                            <CheckCircle
                              className={`w-4 h-4 mt-0.5 mr-2 flex-shrink-0 ${colors.headingText.replace('text-', 'text-')}`}
                              style={inlineBorderColor ? { color: inlineBorderColor } : {}}
                            />
                            <span className="text-sm text-slate-600">{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <div className="mb-4">
                        <span className={`text-2xl font-heading font-bold`} style={inlineBorderColor ? { color: inlineBorderColor } : {}}>
                          {formatNaira(tier.price)}
                        </span>
                      </div>

                      <div className="mb-4">
                        <Badge variant="slate">
                          {tier.stock} Stalls Available
                        </Badge>
                      </div>

                      {tier.isLocked && (
                        <Alert variant="error" className="mb-4 text-sm">
                          Tier Locked by Administration. New reservations are paused. Existing allocations remain active.
                        </Alert>
                      )}

                      {!tier.isLocked && isOutOfStock && (
                        <Alert variant="warning" className="mb-4 text-sm">
                          Out of stock. Please select another booth tier or reach out to the Secretariat team.
                        </Alert>
                      )}

                      <Button
                        onClick={() => handleBook(tier.id)}
                        disabled={isDisabled}
                        className="w-full"
                      >
                        Reserve and Book Booth
                      </Button>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
