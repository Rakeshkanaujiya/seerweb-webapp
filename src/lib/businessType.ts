export const BUSINESS_TYPE_MOBILE = 1;
export const BUSINESS_TYPE_GARMENTS = 2;

export function toBusinessTypeId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isGarmentsBusiness(value: unknown): boolean {
  return toBusinessTypeId(value) === BUSINESS_TYPE_GARMENTS;
}

export function isMobileBusiness(value: unknown): boolean {
  return toBusinessTypeId(value) === BUSINESS_TYPE_MOBILE;
}
