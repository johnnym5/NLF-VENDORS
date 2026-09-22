export type TierColorCode = 'sage' | 'champagne' | 'slate';

export interface BoothTier {
  id: string;
  name: string;
  dimension: string;
  colorCode: TierColorCode;
  price: number;
  stock: number;
  initialStock: number;
  isLocked: boolean;
  perks: string[];
  updatedAt: string;
}

export interface BoothOrder {
  id: string;
  docId: string;
  userId: string;
  orgName: string;
  contactPerson: string;
  email: string;
  phone: string;
  sector: string;
  website?: string;
  businessDescription?: string;
  tierId: string;
  tierName: string;
  pricePaid: number;
  assignedBoothNumber: string;
  vendorSequence: number;
  status: 'ACTIVE' | 'REVOKED';
  paymentReference: string;
  purchasedAt: string;
  revokedAt?: string;
  revocationReason?: string;
}

export const SECTORS = [
  'Fresh Meat and Loins',
  'Halal Culinary',
  'Livestock Breeding',
  'Agricultural Machinery',
  'Cold-Chain Logistics',
  'Veterinary Tech',
] as const;

export type Sector = (typeof SECTORS)[number];
