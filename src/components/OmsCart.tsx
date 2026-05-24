import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, Package } from "lucide-react";
import { Product, ProductVariant } from "@/types";
import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/imageUrl";
import { toast } from "sonner";

type QtyState = Record<string, Record<number, string>>;

interface OmsCartProps {
  product: Product;
  showSize?: boolean;
  onAddSuccess?: () => void;
}

function resolveProductColor(product: Partial<Product>): string {
  // 1. Top-level color column
  const direct = String((product as any).color ?? "").trim();
  if (direct && direct !== "null" && direct !== "undefined") return direct;

  // 2. attributes.color (exact key)
  const attrs = product.attributes ?? {};
  const attrColor = String(attrs["color"] ?? "").trim();
  if (attrColor && attrColor !== "null") return attrColor;

  // 3. Any attribute key containing "color" (case-insensitive)
  for (const [k, v] of Object.entries(attrs)) {
    if (k.toLowerCase().includes("color")) {
      const val = String(v ?? "").trim();
      if (val && val !== "null") return val;
    }
  }

  return "";
}

const OmsCart: React.FC<OmsCartProps> = ({ product, showSize = false, onAddSuccess }) => {
  const {
    cart,
    addToCart,
    addVariantToCart,
    removeFromCart,
    removeVariant,
    updateQuantity,
    updateVariantQty,
  } = useCart();

  const [qtyState, setQtyState] = useState<QtyState>(() => {
    const initQty: QtyState = { [product.id]: {} };
    (product.variants ?? []).forEach((v) => {
      initQty[product.id][v.id] = String(v.qty);
    });
    return initQty;
  });

  const [imgError, setImgError] = useState(false);

  const hasVariants = (product.variants ?? []).length > 0;
  const imageUrl = getImageUrl(product.image);
  const productColor = resolveProductColor(product);
  const attrPills = Object.entries(product.attributes ?? {})
    .filter(([k, v]) => v && !["mrp", "size", "color", "brand", "model"].includes(k))
    .slice(0, 2);
  const inCartCount =
    cart.items.find((i) => i.productId === product.id)?.variants.reduce((s, v) => s + v.quantity, 0) ?? 0;

  // Grid template strings
  const gridWithSize = "grid-cols-[36px_1fr_52px_minmax(52px,auto)]";
  const gridWithoutSize = "grid-cols-[1fr_52px_minmax(52px,auto)]";
  const gridCols = showSize ? gridWithSize : gridWithoutSize;

  // Cart helpers
  const getCartVariant = (productId: string, variantId: number) =>
    cart.items.find((i) => i.productId === productId)?.variants.find((v) => v.variantId === variantId) ?? null;

  const getCartSimple = (productId: string) =>
    cart.items.find((i) => i.productId === productId)?.variants.find((v) => v.variantId === 0) ?? null;

  const handleAddVariant = (p: Product, variant: ProductVariant) => {
    const qty = parseInt(qtyState[p.id]?.[variant.id] ?? String(variant.qty), 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    if (qty > variant.qty) {
      toast.error(`Only ${variant.qty} in stock`);
      return;
    }
    addVariantToCart(p, variant, qty);
    setQtyState((prev) => ({
      ...prev,
      [p.id]: { ...prev[p.id], [variant.id]: String(variant.qty) },
    }));
    onAddSuccess?.();
  };

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-all duration-200 ${
        inCartCount > 0 ? "border-blue-300 ring-1 ring-blue-100" : "border-gray-100 hover:border-blue-200"
      }`}
    >
      {/* Product Image */}
      {imageUrl && !imgError ? (
        <div className="w-full h-44 border-b overflow-hidden flex-shrink-0">
          <img
            src={imageUrl}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-2"
          />
        </div>
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-gray-50 to-gray-100 border-b flex items-center justify-center flex-shrink-0">
          <Package className="h-10 w-10 text-gray-200" />
        </div>
      )}

      <div className="p-3 flex flex-col flex-1 gap-2">
        {/* Name + price */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-900">
              <span className="text-[11px] text-gray-400">Name: </span>
              <span className="text-xs text-gray-900 items-center">{product.name}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <label className="text-[10px] text-gray-400">Brand:</label>
              {(product.brand || product.attributes?.brand) && (
                <span className="text-[11px] text-gray-900 items-center">
                  {product.attributes?.brand || product.brand}
                </span>
              )}
            </div>
            {productColor ? (
              <div className="flex items-center gap-1 mt-0.5">
                <label className="text-[10px] text-gray-400">Color:</label>
                <span className="text-[12px] text-gray-900">{productColor}</span>
              </div>
            ) : null}
          </div>
          <div className="flex-shrink-0 text-right">
            <span className="text-sm font-bold text-blue-600">₹{product.price.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Attribute pills */}
        {attrPills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attrPills.map(([k, v]) => (
              <span
                key={k}
                className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium capitalize"
              >
                {k} : {v}
              </span>
            ))}
          </div>
        )}

        {/* Variant table */}
        {hasVariants ? (
          <div className="mt-1 flex flex-col flex-1">
            {/* Header row */}
            <div
              className={`grid ${gridCols} gap-2 text-[9px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1`}
            >
              {showSize && <span>Size</span>}
              <span>Price</span>
              <span className="text-center">Qty</span>
              <span />
            </div>

            <div className="space-y-1 flex-1">
              {(product.variants ?? []).map((variant) => {
                const cv = getCartVariant(product.id, variant.id);
                const outOfStock = variant.qty === 0;
                const curQty = qtyState[product.id]?.[variant.id] ?? String(variant.qty);

                return (
                  <div
                    key={variant.id}
                    className={`grid ${gridCols} gap-2 items-center px-1.5 py-1 rounded-lg ${
                      cv
                        ? "bg-blue-50 border border-blue-200"
                        : outOfStock
                        ? "bg-gray-50 opacity-50"
                        : "bg-gray-50 border border-transparent"
                    }`}
                  >
                    {/* Size badge */}
                    {showSize && (
                      <span
                        className={`text-[10px] font-bold text-center px-1 py-0.5 rounded ${
                          cv ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-200"
                        }`}
                      >
                        {variant.size || "—"}
                      </span>
                    )}

                    {/* Price */}
                    <div>
                      <p className="text-xs font-semibold text-gray-800">
                        ₹{(variant.rate || variant.mrp || product.price).toLocaleString("en-IN")}
                      </p>
                    </div>

                    {/* Qty - stepper when in cart, input when not */}
                    {cv ? (
                      <div className="flex items-center justify-center border border-blue-300 rounded overflow-hidden bg-white">
                        <button
                          onClick={() => updateVariantQty(product.id, variant.id, cv.quantity - 1)}
                          className="px-1 py-0.5 text-blue-600 hover:bg-blue-50"
                        >
                          <Minus size={9} />
                        </button>
                        <span className="text-xs font-bold text-blue-700 min-w-[16px] text-center">{cv.quantity}</span>
                        <button
                          onClick={() => updateVariantQty(product.id, variant.id, cv.quantity + 1)}
                          disabled={cv.quantity >= variant.qty}
                          className="px-1 py-0.5 text-blue-600 hover:bg-blue-50 disabled:opacity-30"
                        >
                          <Plus size={9} />
                        </button>
                      </div>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        max={variant.qty}
                        value={curQty}
                        disabled={outOfStock}
                        onChange={(e) =>
                          setQtyState((prev) => ({
                            ...prev,
                            [product.id]: { ...prev[product.id], [variant.id]: e.target.value },
                          }))
                        }
                        className="w-full text-center text-xs font-medium text-gray-800 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 py-0.5 disabled:opacity-40"
                      />
                    )}

                    {/* Add / Remove button */}
                    {cv ? (
                      <button
                        onClick={() => removeVariant(product.id, variant.id)}
                        className="flex items-center justify-center h-6 w-6 mx-auto rounded text-red-400 hover:bg-red-50"
                      >
                        <Trash2 size={11} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddVariant(product, variant)}
                        disabled={outOfStock}
                        className="w-full text-[9px] px-1 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold disabled:opacity-30 transition-colors text-center whitespace-nowrap"
                      >
                        {outOfStock ? "Out" : "Add"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-gray-400 mt-1.5 text-right">
              {(product.variants ?? []).reduce((s, v) => s + v.qty, 0)} units ·{" "}
              {(product.variants ?? []).length} sizes
            </p>
          </div>
        ) : (
          /* Simple product */
          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
            {product.stock === 0 ? (
              <Badge variant="outline" className="text-red-500 border-red-200 text-xs">
                Out of Stock
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className={`text-xs font-medium ${
                  product.stock <= 5
                    ? "bg-orange-50 text-orange-600 border border-orange-200"
                    : "bg-green-50 text-green-700 border border-green-200"
                }`}
              >
                {product.stock <= 5 ? `Only ${product.stock} left` : `Stock: ${product.stock}`}
              </Badge>
            )}
            {(() => {
              const cv = getCartSimple(product.id);
              return cv ? (
                <div className="flex items-center border border-blue-300 rounded-lg overflow-hidden bg-blue-50">
                  <button
                    onClick={() => updateQuantity(product.id, cv.quantity - 1)}
                    className="px-2 py-1.5 text-blue-600 hover:bg-blue-100"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="px-2 text-sm font-bold text-blue-700 min-w-[24px] text-center">{cv.quantity}</span>
                  <button
                    onClick={() => updateQuantity(product.id, cv.quantity + 1)}
                    disabled={cv.quantity >= product.stock}
                    className="px-2 py-1.5 text-blue-600 hover:bg-blue-100 disabled:opacity-30"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    addToCart(product, 1);
                    onAddSuccess?.();
                  }}
                  disabled={product.stock === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs gap-1"
                >
                  <Plus size={11} /> Add
                </Button>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default OmsCart;
