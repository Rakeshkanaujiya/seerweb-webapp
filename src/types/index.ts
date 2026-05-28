import { ReactNode } from "react";

// ── User ──────────────────────────────────────────────────────────────────────

export type UserRole    = "admin" | "dealer" | "retailer" | "staff";
export type UserSubRole = "sales_executive" | "employee";

export interface User {
  business_type_id:  any;
  id:                string;
  username:          string;
  email:             string;
  name:              string;
  role:              UserRole;
  sub_role:          string;
  dealer_id?:        string;
  active:            boolean;
  createdBy:         string;
  createdAt:         string;
  assigned:          string;
  user:              string;
  passwordChangedAt: Date;
  phone:             string;
  address:           string;
  company_name:      string;
}

// ── Retailer / Staff ──────────────────────────────────────────────────────────

export interface Retailer extends User {
  contact_person:    string;
  store_name:        string;
  phone:             string;
  address:           string;
  dealer_id:         string;
  registration_date: string;
  assigned:          string;
  city:              string;
}

export interface Staff extends User {
  contact_person:    string;
  sub_role:          string;
  phone:             string;
  address:           string;
  dealer_id:         string;
  registration_date: string;
}

// ── Product ───────────────────────────────────────────────────────────────────

export interface ProductVariant {
  id:         number;
  product_id: number;
  size:       string;
  color:      string;
  qty:        number;
  mrp:        number;
  rate:       number;
  rack:       string;
}

export type Product = {
  id:                string;
  name:              string;
  brand:             string;
  model:             string;
  price:             number;
  stock:             number;
  description:       string;
  dealer_id?:        number;
  dealerid?:         number;
  created_at?:       string;
  color?:            string;
  image?:            string | null;
  attributes?:       Record<string, any>;
  business_type_id?: number | null;
  variants?:         ProductVariant[];
};

// ── Cart ──────────────────────────────────────────────────────────────────────

export interface CartVariantItem {
  variantId: number | string;  // 0 for products with no size variants
  size:      string;
  color:     string;
  price:     number;  // selling rate
  mrp:       number;
  quantity:  number;  // retailer's ordered qty
  stock:     number;  // available stock
  rack?:     string;  // rack location
  setQuantity?: number;
}

export interface CartItem {
  color: any;
  productId:       string;
  productName:     string;
  image:           string | null;
  brand:           string;
  model?:          string;
  name?:            string;
  businessTypeId?: number | null;  // business type for schema lookup
  attributes:      Record<string, any>;  // all product attributes (dynamic fields)
  variants:        CartVariantItem[];
  garmentMeta?: {
    designNumber?: string;
    fabricType?: string;
    bookingType?: string;
    selectedColor?: string;
    selectedColorHex?: string;
    selectedSizes?: string[];
    productTags?: string[];
    galleryImages?: string[];
  };
}

export interface Cart {
  items: CartItem[];
  total: number;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "approved" | "dispatched" | "delivered" | "cancelled";

export interface Order {
  id:           string;
  retailerId:   string;
  retailerName: string;
  dealerId:     string;
  total:        number;
  notes:        string;
  status:       OrderStatus;
  createdAt:    string;
  storeName:    string;
  order_by:     string;
  order_by_id:  number;
  items: {
    productId: number;
    variantId?: number | string;
    size?: string;
    color?: string;
    quantity:  number;
    price:     number;
    subtotal?: number;
    rack?: string;
    attributes_snapshot?: Record<string, any>;
    product: {
      name:  string;
      price: number;
      mrp?: number;
    };
  }[];
}

// ── Voice ─────────────────────────────────────────────────────────────────────

export interface VoiceParsedItem {
  productId:   string;
  productName: string;
  quantity:    number;
  confidence:  number;
  matchReason: string;
}

export interface VoiceUnmatchedSegment {
  text:                string;
  detectedKeywords:    string[];
  suggestedProductIds?: string[];
}

export interface VoiceParseResult {
  success:            boolean;
  error?:             string;
  message?:           string;
  parsed:             VoiceParsedItem[];
  unmatchedSegments?: VoiceUnmatchedSegment[];
  rawTranscript:      string;
}
