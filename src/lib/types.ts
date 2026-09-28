export type TierColorCode = 'sage' | 'champagne' | 'slate';

export type UserRole = 'vendor' | 'admin';

export type ReservationStatus =
  | 'CART'
  | 'RESERVED_PENDING_APPROVAL'
  | 'APPROVED_PENDING_PAYMENT'
  | 'CONFIRMED_PAID'
  | 'REVOKED';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  orgName?: string;
  contactPerson?: string;
  phone?: string;
  sector?: string;
  website?: string;
  businessDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

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

export interface CustomRequest {
  id: string;
  reservationId: string;
  requestText: string;
  additionalFee: number;
  status: RequestStatus;
  adminNotes?: string;
  createdAt: string;
}

export interface BoothReservation {
  id: string;
  referenceId: string;
  userId: string;
  tierId: string;
  tierName: string;
  basePrice: number;
  additionalFees: number;
  totalAmount: number;
  status: ReservationStatus;
  assignedBoothNumber: string;
  vendorSequence?: number;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfile;
  customRequests?: CustomRequest[];
}

// Alias for backward compatibility if needed
export type BoothOrder = BoothReservation;

export const SECTORS = [
  'Fresh Meat and Loins',
  'Halal Culinary',
  'Livestock Breeding',
  'Agricultural Machinery',
  'Cold-Chain Logistics',
  'Veterinary Tech',
] as const;

export type Sector = (typeof SECTORS)[number];
