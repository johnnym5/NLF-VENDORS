import { TierColorCode } from './types';

export const tierColorMap: Record<TierColorCode, { cardBg: string, borderColor: string, badgeBg: string, badgeText: string, headingText: string, buttonBg: string, buttonHover: string }> = {
  sage: {
    cardBg: 'bg-[#F2F7F4]',
    borderColor: 'border-[#B8D8C5]',
    badgeBg: 'bg-[#D8EADF]',
    badgeText: 'text-[#1E4D38]',
    headingText: 'text-[#1E4D38]',
    buttonBg: 'bg-[#1E4D38]',
    buttonHover: 'hover:bg-[#163d2c]',
  },
  champagne: {
    cardBg: 'bg-[#FAF6EC]',
    borderColor: 'border-[#E8D7B0]',
    badgeBg: 'bg-[#FEF3D6]',
    badgeText: 'text-[#8D6B1B]',
    headingText: 'text-[#8D6B1B]',
    buttonBg: 'bg-[#8D6B1B]',
    buttonHover: 'hover:bg-[#745812]',
  },
  slate: {
    cardBg: 'bg-[#F3F4F6]',
    borderColor: 'border-[#D1D5DB]',
    badgeBg: 'bg-[#E5E7EB]',
    badgeText: 'text-[#1F2937]',
    headingText: 'text-[#1F2937]',
    buttonBg: 'bg-[#1F2937]',
    buttonHover: 'hover:bg-[#111827]',
  },
};

export function getTierColors(colorCode: TierColorCode) {
  return tierColorMap[colorCode];
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('NGN', 'NGN ');
}
