import { useMemo, useState } from "react";
import { Heart, MessageCircle, Plus, ShoppingBag } from "lucide-react";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getImageUrl } from "@/lib/imageUrl";
import { useCart } from "@/context/CartContext";
import {
  getGarmentBookingType,
  getGarmentColors,
  getGarmentDesignNumber,
  getGarmentFabric,
  getGarmentGallery,
  getGarmentTags,
} from "./productUtils";

interface GarmentProductCardProps {
  product: Product;
}

export function GarmentProductCard({ product }: GarmentProductCardProps) {
  const { addGarmentBundle } = useCart();
  const [selectedColor, setSelectedColor] = useState(() => getGarmentColors(product)[0] ?? "");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [pieceQty, setPieceQty] = useState<Record<string, number>>({});
  const [setQty, setSetQty] = useState(1);
  const [liked, setLiked] = useState(false);

  const gallery = getGarmentGallery(product).map((path) => getImageUrl(path)).filter(Boolean);
  const colors = getGarmentColors(product);
  const sizes = useMemo(
    () =>
      (product.variants ?? [])
        .map((variant) => variant.size)
        .filter(Boolean)
        .filter((value, index, all) => all.indexOf(value) === index),
    [product.variants]
  );
  const designNumber = getGarmentDesignNumber(product);
  const fabric = getGarmentFabric(product);
  const bookingType = getGarmentBookingType(product);
  const tags = getGarmentTags(product);

  const addPiecesToCart = () => {
    const selectedVariants = (product.variants ?? [])
      .filter((variant) => selectedSizes.includes(variant.size))
      .map((variant) => ({
        ...variant,
        quantity: pieceQty[variant.size] ?? 1,
        color: selectedColor,
      }))
      .filter((variant) => variant.quantity > 0);

    if (selectedVariants.length === 0) return;

    addGarmentBundle(product, selectedVariants, {
      designNumber,
      fabricType: fabric,
      bookingType,
      selectedColor,
      selectedSizes,
      productTags: tags,
      galleryImages: gallery,
    });
  };

  const addSetToCart = () => {
    if (sizes.length === 0) return;
    const bundle = (product.variants ?? [])
      .filter((variant) => sizes.includes(variant.size))
      .map((variant) => ({
        ...variant,
        quantity: setQty,
        setQuantity: setQty,
        color: selectedColor,
      }));
    addGarmentBundle(product, bundle, {
      designNumber,
      fabricType: fabric,
      bookingType,
      selectedColor,
      selectedSizes: sizes,
      productTags: tags,
      galleryImages: gallery,
    });
  };

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="grid gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_72px]">
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
            <img
              src={gallery[0] || getImageUrl(product.image)}
              alt={product.name}
              className="h-64 w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-2 md:grid-cols-1">
            {gallery.slice(0, 4).map((image, index) => (
              <img key={`${image}-${index}`} src={image} alt={`${product.name} ${index + 1}`} className="h-16 w-full rounded-2xl border border-slate-200 object-cover" />
            ))}
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              {designNumber || "Design Pending"}
            </div>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{product.name}</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {bookingType ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{bookingType}</span> : null}
              {fabric ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{fabric}</span> : null}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">MRP</div>
            <div className="text-2xl font-black text-slate-900">₹{product.price.toLocaleString("en-IN")}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Colors</div>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    selectedColor === color
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sizes</div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const active = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() =>
                      setSelectedSizes((current) =>
                        current.includes(size) ? current.filter((item) => item !== size) : [...current, size]
                      )
                    }
                    className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-amber-400 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {selectedSizes.length > 0 ? (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Piece-Wise Ordering</div>
              <div className="text-xs text-slate-500">Enter qty per size</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {selectedSizes.map((size) => (
                <div key={size} className="flex items-center gap-2 rounded-2xl bg-white p-2">
                  <div className="min-w-[48px] rounded-xl bg-slate-900 px-2 py-2 text-center text-xs font-bold text-white">{size}</div>
                  <Input
                    type="number"
                    min="1"
                    value={pieceQty[size] ?? 1}
                    onChange={(event) =>
                      setPieceQty((current) => ({
                        ...current,
                        [size]: Number(event.target.value || 1),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-[24px] border border-dashed border-amber-300 bg-amber-50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Set Ordering</div>
              <div className="text-xs text-slate-500">1 set = {sizes.join(" + ") || "All sizes"}</div>
            </div>
            <Input
              type="number"
              min="1"
              value={setQty}
              onChange={(event) => setSetQty(Number(event.target.value || 1))}
              className="w-24"
            />
          </div>
          <Button type="button" onClick={addSetToCart} className="w-full bg-amber-500 text-white hover:bg-amber-600">
            <ShoppingBag size={15} className="mr-2" />
            Add Sets To Cart
          </Button>
        </div>

        <div className="flex gap-2">
          <Button type="button" onClick={addPiecesToCart} className="flex-1 bg-slate-900 text-white hover:bg-slate-800">
            <Plus size={15} className="mr-2" />
            Add To Cart
          </Button>
          <Button type="button" variant="outline" className={liked ? "border-red-300 text-red-500" : ""} onClick={() => setLiked((current) => !current)}>
            <Heart size={16} fill={liked ? "currentColor" : "none"} />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const message = encodeURIComponent(`Check this design: ${product.name} (${designNumber})`);
              window.open(`https://wa.me/?text=${message}`, "_blank");
            }}
          >
            <MessageCircle size={16} />
          </Button>
        </div>
      </div>
    </article>
  );
}
