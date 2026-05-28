import { Product } from "@/types";

export function getGarmentAttribute(product: Product, key: string) {
  return String(product.attributes?.[key] ?? "").trim();
}

export function getGarmentColors(product: Product): string[] {
  const availableColors = product.attributes?.available_colors;
  if (Array.isArray(availableColors)) {
    return availableColors.map((value) => String(value)).filter(Boolean);
  }

  const raw = product.color || getGarmentAttribute(product, "color");
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getGarmentTags(product: Product): string[] {
  const tags = product.attributes?.product_tags;
  return Array.isArray(tags) ? tags.map((value) => String(value)) : [];
}

export function getGarmentGallery(product: Product): string[] {
  const gallery = product.attributes?.gallery_images;
  return Array.isArray(gallery) ? gallery.map((value) => String(value)) : [];
}

export function getGarmentDesignNumber(product: Product) {
  return getGarmentAttribute(product, "design_number");
}

export function getGarmentCategory(product: Product) {
  return getGarmentAttribute(product, "category") || getGarmentAttribute(product, "master_category");
}

export function getGarmentFabric(product: Product) {
  return getGarmentAttribute(product, "fabric_type");
}

export function getGarmentBookingType(product: Product) {
  return getGarmentAttribute(product, "booking_type");
}

export function getGarmentSubCategory(product: Product) {
  return getGarmentAttribute(product, "sub_category");
}

export function getGarmentRack(product: Product) {
  return getGarmentAttribute(product, "rack_number");
}

export function isTrendingGarment(product: Product) {
  return getGarmentAttribute(product, "trending_product").toLowerCase() === "yes";
}

export function isNewArrivalGarment(product: Product) {
  return getGarmentAttribute(product, "new_arrival").toLowerCase() === "yes";
}
