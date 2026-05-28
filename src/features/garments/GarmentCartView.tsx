import { CSSProperties, useEffect, useMemo, useState } from "react";
import { MessageCircle, Printer, ShoppingBag, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/url";
import { getImageUrl } from "@/lib/imageUrl";
import { GARMENT_CART_SETTINGS_UPDATED_EVENT, getGarmentCartSettings } from "./cartSettings";

function getCardSetCount(item: ReturnType<typeof useCart>["cart"]["items"][number]) {
  return item.variants.some((variant) => (variant.setQuantity ?? 0) > 0) ? 1 : 0;
}

export function GarmentCartView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, updateVariantQty, removeVariant, removeFromCart, clearCart, cartTotal } = useCart();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retailers, setRetailers] = useState<Array<{ id: number; name: string; store_name?: string }>>([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState("");
  const [cartSettings, setCartSettings] = useState(() => getGarmentCartSettings(user?.id));

  const needsRetailerSelection = user?.role === "dealer" || user?.role === "staff";

  useEffect(() => {
    const loadSettings = () => {
      setCartSettings(getGarmentCartSettings(user?.id));
    };

    loadSettings();
    window.addEventListener("storage", loadSettings);
    window.addEventListener(GARMENT_CART_SETTINGS_UPDATED_EVENT, loadSettings);

    return () => {
      window.removeEventListener("storage", loadSettings);
      window.removeEventListener(GARMENT_CART_SETTINGS_UPDATED_EVENT, loadSettings);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!needsRetailerSelection || !user?.id) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const dealerId = user.role === "dealer" ? user.id : user.dealer_id;
        const endpoint =
          user.role === "staff"
            ? `${apiUrl}/staff/get_retailers_by_executive?executiveid=${user.id}`
            : `${apiUrl}/retailers?dealerid=${dealerId}`;
        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setRetailers(Array.isArray(data) ? data : []);
      } catch {
        toast.error("Could not load retailers for garments booking");
      }
    })();
  }, [needsRetailerSelection, user]);

  const summary = useMemo(() => {
    const totalPieces = cart.items.reduce(
      (sum, item) => sum + item.variants.reduce((variantSum, variant) => variantSum + variant.quantity, 0),
      0
    );
    const totalSets = cart.items.reduce((sum, item) => sum + getCardSetCount(item), 0);
    const gst = cartTotal * 0.05;
    return {
      totalPieces,
      totalSets,
      gst,
      finalAmount: cartTotal + gst,
    };
  }, [cart.items, cartTotal]);

  const cardGridStyle = useMemo(() => {
    return {
      "--garment-cards-per-row": String(cartSettings.cardsPerRow),
    } as CSSProperties;
  }, [cartSettings.cardsPerRow]);

  const submitOrder = async () => {
    if (!user || cart.items.length === 0) return;
    if (needsRetailerSelection && !selectedRetailerId) {
      toast.error("Select a retailer before submitting this booking");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const selectedRetailer = retailers.find((retailer) => String(retailer.id) === selectedRetailerId);
      const orderItems = cart.items.flatMap((item) =>
        item.variants.map((variant) => ({
          productId: item.productId,
          variantId: variant.variantId,
          size: variant.size,
          color: variant.color,
          quantity: variant.quantity,
          price: variant.price,
          subtotal: variant.price * variant.quantity,
          rack: variant.rack || "",
          attributes_snapshot: {
            ...item.attributes,
            brand: item.brand,
            model: item.model || "",
            business_type_id: item.businessTypeId,
            garment_meta: item.garmentMeta,
            set_quantity: variant.setQuantity ?? 0,
          },
        }))
      );

      const response = await fetch(`${apiUrl}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          retailerId: user?.role === "retailer" ? user.id : selectedRetailer?.id,
          retailerName: user?.role === "retailer" ? user?.name : selectedRetailer?.name,
          dealerId: user?.dealer_id ?? user?.id,
          total: summary.finalAmount,
          notes,
          order_by: user?.role,
          order_by_id: user?.id,
          items: orderItems,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit garments order");
      }

      toast.success("Garments order submitted");
      clearCart();
      navigate(user?.role === "retailer" ? "/retailer/orders" : "/dealer/orders");
    } catch (error: any) {
      toast.error(error?.message || "Could not submit garments order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,_#fff7ed,_#ffffff_45%,_#f8fafc)] p-6 shadow-sm">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Wholesale Garments Cart</h1>
          <p className="mt-1 text-sm text-slate-500">Review size-wise pieces, set quantities, colors, and the dealer summary before booking.</p>
        </div>

        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:[grid-template-columns:repeat(var(--garment-cards-per-row),minmax(0,1fr))]"
          style={cardGridStyle}
        >
          {cart.items.map((item) => {
            const cardSetCount = getCardSetCount(item);

            return (
              <div key={item.productId} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      {cartSettings.visibleDetails.image ? (
                        <img
                          src={item.garmentMeta?.galleryImages?.[0] || getImageUrl(item.image)}
                          alt={item.productName}
                          className="h-28 w-28 shrink-0 rounded-3xl border border-slate-200 object-cover"
                        />
                      ) : null}

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                          {item.garmentMeta?.designNumber || "Design"}
                        </div>
                        {cartSettings.visibleDetails.productName ? (
                          <h3 className="mt-1 text-xl font-bold text-slate-900 xl:text-2xl">{item.productName}</h3>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          {item.brand ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.brand}</span> : null}
                          {item.garmentMeta?.fabricType ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.garmentMeta.fabricType}</span> : null}
                          {item.garmentMeta?.selectedColor ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.garmentMeta.selectedColor}</span> : null}
                        </div>
                      </div>
                    </div>

                    {cartSettings.visibleDetails.buttons ? (
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="rounded-2xl border border-red-200 p-2 text-red-500 transition hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-slate-200">
                    {/* Header */}
                    <div className="grid grid-cols-[minmax(0,1fr)_70px_100px_52px] items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <span>Size / Color</span>
                      <span className="text-center">Qty</span>
                      <span className="text-left">
                        {cartSettings.visibleDetails.price ? "Dealer Rate" : "Rate"}
                      </span>
                      <span />
                    </div>

                    {/* Body */}
                    <div className="divide-y divide-slate-100">
                      {item.variants.map((variant) => (
                        <div
                          key={`${variant.variantId}-${variant.color}`}
                          className="grid grid-cols-[minmax(0,1fr)_70px_100px_52px] items-center gap-2 px-4 py-3"
                        >
                          {/* Size + Color */}
                          <div className="min-w-0">
                            <div className="text-base font-semibold text-slate-900">
                              {variant.size || "Single"}
                            </div>

                            <div className="truncate text-xs text-slate-500">
                              {variant.color ||
                                item.garmentMeta?.selectedColor ||
                                "Default Color"}
                            </div>
                          </div>

                          {/* Quantity */}
                          {cartSettings.visibleDetails.quantity ? (
                            <input
                              type="number"
                              min="1"
                              value={variant.quantity}
                              onChange={(event) =>
                                updateVariantQty(
                                  item.productId,
                                  variant.variantId,
                                  Number(event.target.value || 1)
                                )
                              }
                              className="h-9 w-14 rounded-lg border border-slate-200 px-2 text-center text-sm outline-none focus:border-slate-400"
                            />
                          ) : (
                            <div className="text-center text-sm text-slate-600">
                              {variant.quantity}
                            </div>
                          )}

                          {/* Price */}
                          {cartSettings.visibleDetails.price ? (
                            <div className="text-sm font-semibold text-slate-900">
                              ₹{variant.price.toLocaleString("en-IN")}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500">Hidden</div>
                          )}

                          {/* Delete Button */}
                          {cartSettings.visibleDetails.buttons ? (
                            <button
                              type="button"
                              onClick={() =>
                                removeVariant(item.productId, variant.variantId)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-red-500"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <div />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cart Summary</div>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Rs.{summary.finalAmount.toLocaleString("en-IN")}</h2>
          </div>

          {needsRetailerSelection ? (
            <select
              value={selectedRetailerId}
              onChange={(event) => setSelectedRetailerId(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-amber-400 focus:outline-none"
            >
              <option value="">Select Retailer</option>
              {retailers.map((retailer) => (
                <option key={retailer.id} value={retailer.id}>
                  {retailer.store_name || retailer.name}
                </option>
              ))}
            </select>
          ) : null}

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-500">Total Pieces</span><span className="font-semibold text-slate-900">{summary.totalPieces}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Total Sets</span><span className="font-semibold text-slate-900">{summary.totalSets}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Dealer Rate Total</span><span className="font-semibold text-slate-900">Rs.{cartTotal.toLocaleString("en-IN")}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">GST</span><span className="font-semibold text-slate-900">Rs.{summary.gst.toLocaleString("en-IN")}</span></div>
          </div>

          <Textarea
            rows={5}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes for packing, dispatch, assortments, or booking instructions"
          />

          <Button type="button" onClick={submitOrder} disabled={submitting || cart.items.length === 0} className="w-full bg-slate-900 text-white hover:bg-slate-800">
            <ShoppingBag size={15} className="mr-2" />
            {submitting ? "Submitting..." : "Submit Booking"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => window.print()}>
            <Printer size={15} className="mr-2" />
            Print Invoice
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              const text = encodeURIComponent(`Garments booking total: Rs.${summary.finalAmount.toLocaleString("en-IN")}`);
              window.open(`https://wa.me/?text=${text}`, "_blank");
            }}
          >
            <MessageCircle size={15} className="mr-2" />
            Share Via WhatsApp
          </Button>
        </div>
      </aside>
    </div>
  );
}
