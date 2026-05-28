export const GARMENT_DROPDOWN_OPEN_EVENT = "garment-dropdown-open";

export function announceGarmentDropdownOpen(id: string) {
  window.dispatchEvent(new CustomEvent(GARMENT_DROPDOWN_OPEN_EVENT, { detail: { id } }));
}
