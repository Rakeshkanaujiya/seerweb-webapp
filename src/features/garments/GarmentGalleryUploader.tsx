import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { GarmentGalleryImage } from "./types";

interface GarmentGalleryUploaderProps {
  images: GarmentGalleryImage[];
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "left" | "right") => void;
  inputId?: string;
}

export function GarmentGalleryUploader({
  images,
  onAdd,
  onRemove,
  onMove,
  inputId = "garment-gallery-input",
}: GarmentGalleryUploaderProps) {
  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-amber-300 bg-amber-50/70 px-4 py-6 text-center transition hover:bg-amber-50"
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
          <ImagePlus size={22} />
        </div>
        <div className="text-sm font-semibold text-slate-800">Upload gallery images</div>
        <div className="mt-1 text-xs text-slate-500">Add, replace, remove, and reorder product shots</div>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => onAdd(event.target.files)}
      />

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.map((image, index) => (
            <div key={image.id} className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <img
                src={image.url}
                alt={`Gallery ${index + 1}`}
                className="h-32 w-full rounded-xl object-cover"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">Slot {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onMove(image.id, "left")}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50"
                  >
                    <ArrowUp size={14} className="-rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(image.id, "right")}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50"
                  >
                    <ArrowDown size={14} className="-rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(image.id)}
                    className="rounded-lg border border-red-200 p-1.5 text-red-500 transition hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
