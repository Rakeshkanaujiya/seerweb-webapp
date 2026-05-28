export type GarmentSizeSystemKey =
  | "alpha"
  | "numeric"
  | "additional"
  | "kids"
  | "shirt"
  | "fit"
  | "footwear"
  | "free"
  | "combo";

export interface GarmentGalleryImage {
  id: string;
  url: string;
  rawPath?: string;
  file?: File | null;
  existing?: boolean;
}

export interface GarmentColorOption {
  name: string;
  hex: string;
}

export interface GarmentVariantDraft {
  id: string;
  size: string;
  qty: string;
  mrp: string;
  rate: string;
  rack: string;
}

export interface GarmentFormValues {
  productName: string;
  designNumber: string;
  brand: string;
  bookingType: string;
  launchDate: string;
  masterCategory: string;
  category: string;
  subCategory: string;
  fabricType: string;
  styleDesign: string;
  hsnCode: string;
  productDescription: string;
  productTags: string[];
  trendingProduct: boolean;
  newArrival: boolean;
  rackNumber: string;
  barcodeSku: string;
  fitType: string;
}

export interface GarmentSizeSystem {
  key: GarmentSizeSystemKey;
  label: string;
  enabledByDefault: boolean;
  options: string[];
}
