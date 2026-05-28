export interface GarmentCartVisibilitySettings {
  image: boolean;
  productName: boolean;
  price: boolean;
  quantity: boolean;
  stock: boolean;
  setCount: boolean;
  buttons: boolean;
}

export interface GarmentCartSettings {
  cardsPerRow: 1 | 2 | 3 | 4;
  visibleDetails: GarmentCartVisibilitySettings;
}

export const GARMENT_CART_SETTINGS_UPDATED_EVENT = "garment-cart-settings-updated";

const defaultSettings: GarmentCartSettings = {
  cardsPerRow: 2,
  visibleDetails: {
    image: true,
    productName: true,
    price: true,
    quantity: true,
    stock: true,
    setCount: true,
    buttons: true,
  },
};

function cartSettingsKey(userId?: string | number | null) {
  return `garment_cart_settings_${userId ?? "guest"}`;
}

export function getGarmentCartSettings(userId?: string | number | null): GarmentCartSettings {
  try {
    const raw = localStorage.getItem(cartSettingsKey(userId));
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      cardsPerRow: parsed.cardsPerRow ?? defaultSettings.cardsPerRow,
      visibleDetails: {
        ...defaultSettings.visibleDetails,
        ...(parsed.visibleDetails ?? {}),
      },
    };
  } catch {
    return defaultSettings;
  }
}

export function saveGarmentCartSettings(settings: GarmentCartSettings, userId?: string | number | null) {
  localStorage.setItem(cartSettingsKey(userId), JSON.stringify(settings));
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(GARMENT_CART_SETTINGS_UPDATED_EVENT, {
        detail: { userId: userId ?? "guest", settings },
      })
    );
  }
}
