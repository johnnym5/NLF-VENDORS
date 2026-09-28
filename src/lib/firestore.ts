/**
 * Backward compatibility re-exports.
 * Application logic has fully migrated to Supabase queries in `@/lib/supabase-queries`.
 */

export {
  useTiers,
  useReservations,
  useReservations as useOrders,
  useVendorReservations,
  useVendorReservations as useVendorOrders,
  saveBoothReservation,
  saveBoothReservation as purchaseBoothTransaction,
  updateReservationStatus,
  addCustomSurcharge,
  assignBoothNumber,
  adminRegisterOrganization,
  updateTierPrice,
  updateTierStock,
  toggleTierLock,
  addBoothTier,
  updateTierName,
  editBoothTierFull,
  deleteBoothTier,
} from '@/lib/supabase-queries';
