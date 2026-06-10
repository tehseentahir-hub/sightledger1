export const BUSINESS_MODES = {
  WATER_19L: 'water_19l',
  PET_TRADING: 'pet_trading',
}

export function normalizeBusinessMode(value) {
  return String(value || '').trim().toLowerCase() === BUSINESS_MODES.PET_TRADING
    ? BUSINESS_MODES.PET_TRADING
    : BUSINESS_MODES.WATER_19L
}

export function isPetTradingMode(subject) {
  return normalizeBusinessMode(subject?.business_mode) === BUSINESS_MODES.PET_TRADING
}

export function isRestrictedPetCashier(subject) {
  return (
    isPetTradingMode(subject) &&
    subject?.type === 'staff' &&
    subject?.role === 'cashier'
  )
}

export function canViewPetFinancials(subject) {
  return !isRestrictedPetCashier(subject)
}

export function getBusinessModeLabel(value) {
  return normalizeBusinessMode(value) === BUSINESS_MODES.PET_TRADING
    ? 'PET / Multi-Size Inventory'
    : 'Standard Water Delivery'
}
