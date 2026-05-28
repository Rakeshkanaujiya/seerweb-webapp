import { useMemo, useState } from "react";
import { Ruler, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GARMENT_SIZE_SYSTEMS, getEnabledSizeSystems, saveEnabledSizeSystems } from "./sizeSettings";
import { GarmentSizeSystemKey } from "./types";
import { toast } from "sonner";

interface GarmentSizeSettingsPanelProps {
  userId?: string | number | null;
}

export function GarmentSizeSettingsPanel({ userId }: GarmentSizeSettingsPanelProps) {
  const [enabled, setEnabled] = useState<GarmentSizeSystemKey[]>(() => getEnabledSizeSystems(userId));

  const enabledSet = useMemo(() => new Set(enabled), [enabled]);

  const toggleSystem = (key: GarmentSizeSystemKey) => {
    setEnabled((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const handleSave = () => {
    saveEnabledSizeSystems(enabled, userId);
    toast.success("Garments size settings updated");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
      <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
            <Ruler size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Garments Size Settings</h3>
            <p className="text-xs text-slate-500">Choose which size systems appear on the garments product form</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 py-5">
        {GARMENT_SIZE_SYSTEMS.map((system) => {
          const active = enabledSet.has(system.key);
          return (
            <button
              key={system.key}
              type="button"
              onClick={() => toggleSystem(system.key)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300 hover:bg-amber-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{system.label}</div>
                  <div className={`mt-1 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>
                    {system.options.slice(0, 6).join(", ")}
                    {system.options.length > 6 ? "..." : ""}
                  </div>
                </div>
                <Badge className={active ? "bg-white/10 text-white" : "bg-white text-slate-600"}>
                  {system.options.length} sizes
                </Badge>
              </div>
            </button>
          );
        })}

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} className="gap-2 bg-amber-500 text-white hover:bg-amber-600">
            <Save size={15} />
            Save Size Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
