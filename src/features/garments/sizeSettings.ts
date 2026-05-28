import { GarmentSizeSystem, GarmentSizeSystemKey } from "./types";

export const GARMENT_SIZE_SYSTEMS: GarmentSizeSystem[] = [
  { key: "alpha", label: "Alpha Sizes", enabledByDefault: true, options: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] },
  { key: "numeric", label: "Numeric Sizes", enabledByDefault: true, options: ["28", "30", "32", "34", "36", "38", "40", "42", "44", "46"] },
  { key: "additional", label: "Custom Sizes", enabledByDefault: true, options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] },
  { key: "kids", label: "Kids Sizes", enabledByDefault: false, options: ["0-6M", "6-12M", "1Y", "2Y", "3Y", "4Y", "5Y", "6Y", "7Y", "8Y", "9Y", "10Y"] },
  { key: "shirt", label: "Shirt Sizes", enabledByDefault: false, options: ["36", "38", "39", "40", "42", "44", "46"] },
  { key: "fit", label: "Fit Types", enabledByDefault: false, options: ["Slim", "Regular", "Relaxed", "Oversized", "Comfort"] },
  { key: "footwear", label: "Footwear Sizes", enabledByDefault: false, options: ["5", "6", "7", "8", "9", "10", "11", "12"] },
  { key: "free", label: "Free Size", enabledByDefault: false, options: ["Free Size"] },
  { key: "combo", label: "Combo Sizes", enabledByDefault: false, options: ["S-M", "M-L", "L-XL", "XL-2XL"] },
];

function settingsKey(userId?: string | number | null) {
  return `garment_size_settings_${userId ?? "guest"}`;
}

export function getEnabledSizeSystems(userId?: string | number | null): GarmentSizeSystemKey[] {
  try {
    const raw = localStorage.getItem(settingsKey(userId));
    if (!raw) {
      return GARMENT_SIZE_SYSTEMS.filter((system) => system.enabledByDefault).map((system) => system.key);
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return GARMENT_SIZE_SYSTEMS.filter((system) => system.enabledByDefault).map((system) => system.key);
  }
}

export function saveEnabledSizeSystems(keys: GarmentSizeSystemKey[], userId?: string | number | null) {
  localStorage.setItem(settingsKey(userId), JSON.stringify(keys));
}

export function getActiveSizeOptions(userId?: string | number | null) {
  const enabled = new Set(getEnabledSizeSystems(userId));
  return GARMENT_SIZE_SYSTEMS.filter((system) => enabled.has(system.key)).flatMap((system) => system.options);
}

export function getEnabledSizeSystemConfigs(userId?: string | number | null) {
  const enabled = new Set(getEnabledSizeSystems(userId));
  return GARMENT_SIZE_SYSTEMS.filter((system) => enabled.has(system.key));
}
