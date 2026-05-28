import { GarmentColorOption } from "./types";

export const DEFAULT_GARMENT_COLOR_OPTIONS: GarmentColorOption[] = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#f5f5f5" },
  { name: "Navy", hex: "#1f3c88" },
  { name: "Red", hex: "#d62828" },
  { name: "Maroon", hex: "#7f1734" },
  { name: "Bottle Green", hex: "#1b5e20" },
  { name: "Olive", hex: "#708238" },
  { name: "Mustard", hex: "#d89b00" },
  { name: "Peach", hex: "#f4a261" },
  { name: "Grey", hex: "#6b7280" },
  { name: "Sky Blue", hex: "#4ea8de" },
  { name: "Royal Blue", hex: "#2563eb" },
];

export const GARMENT_OPTION_FIELDS = [
  "bookingType",
  "brand",
  "fabricType",
  "masterCategory",
  "category",
  "subCategory",
  "styleDesign",
  "hsnCode",
  "rackNumber",
  "fitType",
] as const;

export type GarmentOptionField = (typeof GARMENT_OPTION_FIELDS)[number];

function optionKey(field: GarmentOptionField, userId?: string | number | null) {
  return `garment_options_${field}_${userId ?? "guest"}`;
}

export const DEFAULT_GARMENT_OPTIONS: Record<GarmentOptionField, string[]> = {
  bookingType: ["Ready Stock", "Booking", "Catalog Launch", "Pre-Booking"],
  brand: ["House Label", "Premium Edit", "Daily Wear"],
  fabricType: ["Cotton", "Rayon", "Silk", "Linen", "Georgette", "Denim"],
  masterCategory: ["Women", "Men", "Kids", "Unisex"],
  category: ["Kurta", "Co-Ord Set", "Shirt", "Dress", "T-Shirt", "Bottom Wear"],
  subCategory: ["Festive", "Casual", "Party Wear", "Office Wear", "Loungewear"],
  styleDesign: ["Printed", "Solid", "Embroidery", "A-Line", "Straight Cut", "Oversized"],
  hsnCode: ["6101", "6102", "6103", "6104", "6201", "6202"],
  rackNumber: ["A1", "A2", "B1", "B2", "C1"],
  fitType: ["Regular", "Slim", "Relaxed", "Oversized"],
};

export function getStoredGarmentOptions(field: GarmentOptionField, userId?: string | number | null): string[] {
  try {
    const raw = localStorage.getItem(optionKey(field, userId));
    if (!raw) return DEFAULT_GARMENT_OPTIONS[field];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_GARMENT_OPTIONS[field];
  } catch {
    return DEFAULT_GARMENT_OPTIONS[field];
  }
}

export function saveStoredGarmentOptions(field: GarmentOptionField, values: string[], userId?: string | number | null) {
  localStorage.setItem(optionKey(field, userId), JSON.stringify(values));
}

function colorKey(userId?: string | number | null) {
  return `garment_colors_${userId ?? "guest"}`;
}

export function getStoredGarmentColors(userId?: string | number | null): GarmentColorOption[] {
  try {
    const raw = localStorage.getItem(colorKey(userId));
    if (!raw) return DEFAULT_GARMENT_COLOR_OPTIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_GARMENT_COLOR_OPTIONS;
  } catch {
    return DEFAULT_GARMENT_COLOR_OPTIONS;
  }
}

export function saveStoredGarmentColors(values: GarmentColorOption[], userId?: string | number | null) {
  localStorage.setItem(colorKey(userId), JSON.stringify(values));
}
