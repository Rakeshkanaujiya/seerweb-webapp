import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Plus, Search } from "lucide-react";
import { GARMENT_DROPDOWN_OPEN_EVENT, announceGarmentDropdownOpen } from "./dropdownEvents";

interface GarmentTagSelectorProps<T extends string = string> {
  id?: string;
  placeholder: string;
  searchPlaceholder?: string;
  options: T[];
  selected: T[];
  onChange: (values: T[]) => void;
  onCreateOption?: (value: string) => void;
  allowCreate?: boolean;
  selectAllLabel?: string;
}

export function GarmentTagSelector<T extends string = string>({
  id,
  placeholder,
  searchPlaceholder,
  options,
  selected,
  onChange,
  onCreateOption,
  allowCreate = true,
  selectAllLabel,
}: GarmentTagSelectorProps<T>) {
  const dropdownId = useMemo(() => id ?? crypto.randomUUID(), [id]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const filtered = useMemo(
    () => options.filter((option) => option.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const toggleValue = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  };

  const handleCreate = () => {
    const normalized = customValue.trim();
    if (!normalized) return;
    onCreateOption?.(normalized);
    if (!selected.includes(normalized as T)) {
      onChange([...selected, normalized as T]);
    }
    setCustomValue("");
  };

  const selectAll = () => {
    onChange(options);
  };

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
        className="flex min-h-[46px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-slate-300"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {selected.length === 0 ? (
            <span className="text-sm text-slate-400">{placeholder}</span>
          ) : (
            selected.map((value) => (
              <span
                key={value}
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900"
              >
                {value}
              </span>
            ))
          )}
        </div>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
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
                  placeholder={searchPlaceholder ?? "Search"}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>

              {selectAllLabel ? (
                <button
                  type="button"
                  onClick={selectAll}
                  className="mb-3 rounded-xl border border-dashed border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
                >
                  {selectAllLabel}
                </button>
              ) : null}

              <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                {filtered.map((option) => {
                  const active = selected.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleValue(option)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300 hover:bg-amber-50"
                      }`}
                    >
                      {option}
                      {active ? <Check size={12} /> : null}
                    </button>
                  );
                })}
              </div>

              {allowCreate ? (
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <input
                    value={customValue}
                    onChange={(event) => setCustomValue(event.target.value)}
                    placeholder="Add custom"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white transition hover:bg-amber-600"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
