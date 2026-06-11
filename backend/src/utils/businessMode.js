const BUSINESS_MODES = {
  WATER_19L: 'water_19l',
  PET_TRADING: 'pet_trading',
  HYBRID: 'hybrid',
};

const normalizeBusinessMode = (value) => {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === BUSINESS_MODES.PET_TRADING) return BUSINESS_MODES.PET_TRADING;
  if (mode === BUSINESS_MODES.HYBRID) return BUSINESS_MODES.HYBRID;
  return BUSINESS_MODES.WATER_19L;
};

const isPetTradingMode = (shopOrUser) =>
  normalizeBusinessMode(shopOrUser?.business_mode) === BUSINESS_MODES.PET_TRADING;

const isHybridMode = (shopOrUser) =>
  normalizeBusinessMode(shopOrUser?.business_mode) === BUSINESS_MODES.HYBRID;

const hasPetInventoryMode = (shopOrUser) =>
  [BUSINESS_MODES.PET_TRADING, BUSINESS_MODES.HYBRID].includes(normalizeBusinessMode(shopOrUser?.business_mode));

const isRestrictedPetCashier = (user, shop) =>
  Boolean(
    user?.type === 'staff' &&
    user?.role === 'cashier' &&
    hasPetInventoryMode(shop || user)
  );

module.exports = {
  BUSINESS_MODES,
  normalizeBusinessMode,
  isPetTradingMode,
  isHybridMode,
  hasPetInventoryMode,
  isRestrictedPetCashier,
};
