export const BUSINESS_MODES = {
  WATER_19L: 'water_19l',
  PET_TRADING: 'pet_trading',
  HYBRID: 'hybrid',
}

export function normalizeBusinessMode(value) {
  const mode = String(value || '').trim().toLowerCase()
  if (mode === BUSINESS_MODES.PET_TRADING) return BUSINESS_MODES.PET_TRADING
  if (mode === BUSINESS_MODES.HYBRID) return BUSINESS_MODES.HYBRID
  return BUSINESS_MODES.WATER_19L
}

export function isPetTradingMode(subject) {
  return normalizeBusinessMode(subject?.business_mode) === BUSINESS_MODES.PET_TRADING
}

export function isHybridMode(subject) {
  return normalizeBusinessMode(subject?.business_mode) === BUSINESS_MODES.HYBRID
}

export function hasPetInventoryMode(subject) {
  return [BUSINESS_MODES.PET_TRADING, BUSINESS_MODES.HYBRID].includes(normalizeBusinessMode(subject?.business_mode))
}

export function isRestrictedPetCashier(subject) {
  return (
    hasPetInventoryMode(subject) &&
    subject?.type === 'staff' &&
    subject?.role === 'cashier'
  )
}

export function canViewPetFinancials(subject) {
  return !isRestrictedPetCashier(subject)
}

export function getBusinessModeLabel(value) {
  const mode = normalizeBusinessMode(value)
  if (mode === BUSINESS_MODES.PET_TRADING) return 'PET / Multi-Size Inventory'
  if (mode === BUSINESS_MODES.HYBRID) return 'Hybrid: 19L + PET Inventory'
  return 'Standard Water Delivery'
}
