import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { DynamicSelect } from "@/components/DynamicSelect";
import { GARMENT_DROPDOWN_OPEN_EVENT, announceGarmentDropdownOpen } from "./dropdownEvents";

interface GarmentSingleSelectProps {
  id?: string;
  schemaId?: number;
  fieldKey: string;
  fieldLabel: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onOptionsChange: (values: string[]) => void;
  userManaged?: boolean;
}

export function GarmentSingleSelect({
  id,
  schemaId,
  fieldKey,
  fieldLabel,
  options,
  value,
  onChange,
  onOptionsChange,
  userManaged = false,
}: GarmentSingleSelectProps) {
  const dropdownId = useMemo(() => id ?? crypto.randomUUID(), [id]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => options.filter((option) => option.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  useEffect(() => {
    if (!open) return;

    const syncPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanelStyle({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleOtherOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id !== dropdownId) {
        setOpen(false);
      }
    };

    syncPosition();
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);
    window.addEventListener("mousedown", handleClick);
    window.addEventListener(GARMENT_DROPDOWN_OPEN_EVENT, handleOtherOpen);

    return () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener(GARMENT_DROPDOWN_OPEN_EVENT, handleOtherOpen);
    };
  }, [dropdownId, open]);

  if (schemaId && !userManaged) {
    return (
      <DynamicSelect
        schemaId={schemaId}
        fieldKey={fieldKey}
        fieldLabel={fieldLabel}
        options={options}
        value={value}
        onSelect={onChange}
        onOptionsUpdate={onOptionsChange}
      />
    );
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) {
            announceGarmentDropdownOpen(dropdownId);
          }
        }}
        className="flex min-h-[44px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-slate-300"
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {value || `Select ${fieldLabel}`}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
              className="fixed z-[200] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
            >
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${fieldLabel}`}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="max-h-48 space-y-1 overflow-y-auto">
                {filtered.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                      value === option
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-amber-50"
                    }`}
                  >
                    {option}
                    {value === option ? <Check size={14} /> : null}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                <input
                  value={customValue}
                  onChange={(event) => setCustomValue(event.target.value)}
                  placeholder={`Add ${fieldLabel}`}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const normalized = customValue.trim();
                    if (!normalized) return;
                    if (!options.includes(normalized)) {
                      onOptionsChange([...options, normalized]);
                    }
                    onChange(normalized);
                    setCustomValue("");
                    setOpen(false);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white transition hover:bg-amber-600"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
