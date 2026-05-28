import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Minus, Trash2, ShoppingCart, User,
  Search, AlertCircle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { apiUrl } from "@/url";
import Sidebar from "@/components/Sidebar";
import { Package } from "lucide-react";
import MainLayout from "@/components/MainLayoutProps";
import { isGarmentsBusiness } from "@/lib/businessType";
import { GarmentCartView } from "@/features/garments/GarmentCartView";

interface RetailerOption {
  id:         number;
  name:       string;
  store_name: string;
  phone:      string;
  address:    string;
}

const Cart = () => {
  const navigate = useNavigate();
  const {
    cart, updateQuantity, updateVariantQty,
    removeFromCart, removeVariant,
    clearCart, cartTotal, cartCount,
  } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [notes, setNotes]                       = useState("");
  const [isOrderConfirmOpen, setIsOrderConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting]         = useState(false);

  // Retailer selection (for staff / dealer)
  const [retailers, setRetailers]               = useState<RetailerOption[]>([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>("");
  const [retailerSearch, setRetailerSearch]     = useState("");

  const needsRetailerSelection = user?.role === "staff" || user?.role === "dealer";
  const selectedRetailer = retailers.find((r) => String(r.id) === selectedRetailerId) ?? null;

  const handleRetailerSelection = (retailerId: string) => {
    const nextRetailer = retailers.find((r) => String(r.id) === retailerId);
    const currentRetailer = retailers.find((r) => String(r.id) === selectedRetailerId);
    const retailerChanged =
      currentRetailer &&
      nextRetailer &&
      String(currentRetailer.id) !== String(nextRetailer.id);

    if (retailerChanged && cart.items.length > 0) {
      clearCart();
      toast.info("Cart cleared because the retailer was changed.");
    }

    setSelectedRetailerId(retailerId);
    if (nextRetailer) {
      localStorage.setItem("selectedRetailer", JSON.stringify(nextRetailer));
    }
  };

  // ── Pre-select retailer saved from TakeOrder / SalesExecutiveDashboard ────
  useEffect(() => {
    if (!needsRetailerSelection) return;
    try {
      const saved = localStorage.getItem("selectedRetailer");
      if (saved) {
        const parsed = JSON.parse(saved);
        setRetailers((prev) => {
          const exists = prev.find((r) => String(r.id) === String(parsed.id));
          return exists ? prev : [...prev, parsed];
        });
        setSelectedRetailerId(String(parsed.id));
      }
    } catch {}
  }, [needsRetailerSelection]);

  // ── Fetch retailers for staff / dealer ────────────────────────────────────
  useEffect(() => {
    if (!needsRetailerSelection || !user?.id) return;
    (async () => {
      try {
        const token    = localStorage.getItem("token");
        const dealerId = user.role === "dealer" ? user.id : user.dealer_id;
        const res      = await fetch(`${apiUrl}/retailers?dealerid=${dealerId}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setRetailers(data);
        // Re-apply saved selection after retailers load
        try {
          const saved = localStorage.getItem("selectedRetailer");
          if (saved) setSelectedRetailerId(String(JSON.parse(saved).id));
        } catch {}
      } catch {
        console.error("Failed to fetch retailers");
      }
    })();
  }, [user?.id, needsRetailerSelection]);

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = () => {
    if (needsRetailerSelection && !selectedRetailerId) {
      toast.error("Please select a customer before checkout.");
      return;
    }
    setIsOrderConfirmOpen(true);
  };

  // ── Submit order ──────────────────────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (!user || !cart.items.length) return;
    if (needsRetailerSelection && !selectedRetailerId) {
      toast.error("Please select a customer first."); return;
    }

    setIsSubmitting(true);
    try {
      const token        = localStorage.getItem("token");
      const retailerId   = needsRetailerSelection ? selectedRetailer?.id   : user.id;
      const retailerName = needsRetailerSelection ? selectedRetailer?.name : user.name;
      const dealerId     = needsRetailerSelection
        ? (user.role === "dealer" ? user.id : user.dealer_id)
        : user.dealer_id;

      // Flatten grouped cart into order line items with attribute snapshots
      const orderItems = cart.items.flatMap((item) =>
        item.variants.map((v) => ({
          productId:          item.productId,
          variantId:          v.variantId,
          size:               v.size,
          color:              v.color,
          quantity:           v.quantity,
          price:              v.price,
          subtotal:           v.price * v.quantity,
          rack:               v.rack || "",
          // Include attribute snapshot for business-type-specific data
          attributes_snapshot: {
            ...item.attributes,
            brand:           item.brand,
            model:           item.model || "",
            business_type_id: item.businessTypeId,
          },
        }))
      );

      const res = await fetch(`${apiUrl}/orders`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          retailerId,
          retailerName,
          dealerId,
          total:       cartTotal,
          notes:       notes || "",
          order_by:    user?.role,
          order_by_id: user?.id,
          items:       orderItems,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit order");

      clearCart();
      setIsOrderConfirmOpen(false);
      setNotes("");
      setSelectedRetailerId("");
      localStorage.removeItem("selectedRetailer");
      toast.success("Order submitted successfully!");

      if      (user?.role === "staff")    navigate("/staff");
      else if (user?.role === "retailer") navigate("/retailer/orders");
      else                                navigate("/dealer");
    } catch {
      toast.error("Failed to submit order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRetailers = retailerSearch.trim()
    ? retailers.filter((r) =>
        r.name.toLowerCase().includes(retailerSearch.toLowerCase()) ||
        r.store_name?.toLowerCase().includes(retailerSearch.toLowerCase()) ||
        r.phone?.includes(retailerSearch)
      )
    : retailers;

  if (isGarmentsBusiness(user?.business_type_id)) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),linear-gradient(180deg,_#fffdf8_0%,_#ffffff_32%,_#f8fafc_100%)] px-4 py-6">
          <div className="mx-auto max-w-7xl">
            <GarmentCartView />
          </div>
        </div>
      </MainLayout>
    );
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="px-8 py-6">
          <div className="container mx-auto px-4 py-6">

            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
              <p className="text-gray-500 text-sm mt-1">
                {cartCount > 0
                  ? `${cartCount} item${cartCount !== 1 ? "s" : ""} · ₹${cartTotal.toLocaleString("en-IN")}`
                  : "Review your items before checkout"}
              </p>
            </div>

            {cart.items.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Left: Retailer selection + Cart items ── */}
                <div className="lg:col-span-2 space-y-4">

                  {/* Retailer selector */}
                  {needsRetailerSelection && (
                    <div className={`bg-white rounded-xl border shadow-sm p-5 ${!selectedRetailerId ? "border-yellow-300" : "border-green-200"}`}>
                      <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User size={15} className="text-blue-600" />
                        Select Customer
                        <span className="text-red-500 text-xs">*required</span>
                      </h2>

                      {!selectedRetailerId && (
                        <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3 text-xs">
                          <AlertCircle size={13} />
                          You must select a customer to place the order.
                        </div>
                      )}

                      {selectedRetailer && (
                        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-xs flex-shrink-0">
                            {(selectedRetailer.store_name || selectedRetailer.name)?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-green-900 truncate">{selectedRetailer.store_name || selectedRetailer.name}</p>
                            <p className="text-xs text-green-600">{selectedRetailer.name} · {selectedRetailer.phone}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedRetailerId("");
                              localStorage.removeItem("selectedRetailer");
                            }}
                            className="text-green-500 hover:text-green-700 text-xs underline flex-shrink-0"
                          >
                            Change
                          </button>
                        </div>
                      )}

                      <Select value={selectedRetailerId} onValueChange={handleRetailerSelection}>
                        <SelectTrigger className={`w-full ${!selectedRetailerId ? "border-yellow-400" : "border-green-300"}`}>
                          <SelectValue placeholder="Select a customer..." />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1.5 border-b">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                              <input
                                placeholder="Search customers..."
                                value={retailerSearch}
                                onChange={(e) => setRetailerSearch(e.target.value)}
                                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300"
                              />
                            </div>
                          </div>
                          {filteredRetailers.length > 0 ? (
                            filteredRetailers.map((r) => (
                              <SelectItem key={r.id} value={String(r.id)}>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{r.store_name || r.name}</span>
                                  <span className="text-xs text-gray-400">{r.name} · {r.phone}</span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-xs text-gray-400 text-center">No customers found</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* ── Cart items — grouped by product ── */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-5">
                      <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <ShoppingCart size={16} className="text-blue-600" />
                        Cart Items
                        <span className="ml-1 text-xs font-normal text-gray-400">({cart.items.length} product{cart.items.length !== 1 ? "s" : ""})</span>
                      </h2>

                      <div className="space-y-4">
                        {cart.items.map((item) => {
                          const imageUrl = item.image
                            ? `${apiUrl.replace("/api", "")}/${item.image}` : null;
                          const itemTotal = item.variants.reduce((s, v) => s + v.price * v.quantity, 0);
                          const itemCount = item.variants.reduce((s, v) => s + v.quantity, 0);
                          
                          // Get display attributes (exclude internal fields)
                          const displayAttrs = Object.entries(item.attributes || {})
                            .filter(([k, v]) => v && !["size", "color", "mrp", "rack", "brand", "model"].includes(k))
                            .slice(0, 3);

                          return (
                            <div key={item.productId} className="border border-gray-100 rounded-xl overflow-hidden">
                              {/* Product header */}
                              <div className="flex items-center gap-3 p-3 border-b border-gray-100">
                                {imageUrl ? (
                                  <img src={imageUrl} alt={item.productName} className="w-10 h-10 object-contain rounded-lg border bg-white flex-shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg border bg-white flex items-center justify-center flex-shrink-0">
                                    <Package size={14} className="text-gray-300" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.productName}</p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {item.brand && <p className="text-xs text-gray-400">{item.brand}</p>}
                                    {item.model && <p className="text-xs text-gray-400">• {item.model}</p>}
                                  </div>
                                  {/* Show business-type-specific attributes */}
                                  {displayAttrs.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {displayAttrs.map(([k, v]) => (
                                        <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium capitalize">
                                          {String(v)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-bold text-blue-600">₹{itemTotal.toLocaleString("en-IN")}</p>
                                  <p className="text-[10px] text-gray-400">{itemCount} pcs</p>
                                </div>
                                {/* Remove whole product */}
                                <button
                                  onClick={() => removeFromCart(item.productId)}
                                  className="p-1.5 text-red-400 hover:bg-red-50 rounded ml-1 flex-shrink-0"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Variant rows */}
                              <div className="divide-y divide-gray-50">
                                {item.variants.map((v) => (
                                  <div key={`${item.productId}_${v.variantId}`} className="flex items-center gap-3 px-4 py-2.5">
                                    {/* Size + color */}
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      {v.size && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
                                          {v.size}
                                        </span>
                                      )}
                                      {v.color && (
                                        <span className="text-xs text-gray-500 truncate">{v.color}</span>
                                      )}
                                      {!v.size && !v.color && (
                                        <span className="text-xs text-gray-500">Standard</span>
                                      )}
                                    </div>

                                    {/* Price per unit */}
                                    <span className="text-xs text-gray-400 flex-shrink-0">₹{v.price}</span>

                                    {/* Qty stepper */}
                                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                      <button
                                        onClick={() =>
                                          v.variantId === 0
                                            ? updateQuantity(item.productId, v.quantity - 1)
                                            : updateVariantQty(item.productId, v.variantId, v.quantity - 1)
                                        }
                                        className="px-2 py-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
                                      >
                                        <Minus size={11} />
                                      </button>
                                      <span className="px-2.5 text-sm font-medium text-gray-800 min-w-[32px] text-center">
                                        {v.quantity}
                                      </span>
                                      <button
                                        onClick={() =>
                                          v.variantId === 0
                                            ? updateQuantity(item.productId, v.quantity + 1)
                                            : updateVariantQty(item.productId, v.variantId, v.quantity + 1)
                                        }
                                        disabled={v.quantity >= v.stock}
                                        className="px-2 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                      >
                                        <Plus size={11} />
                                      </button>
                                    </div>

                                    {/* Line total */}
                                    <span className="text-sm font-semibold text-gray-900 w-20 text-right flex-shrink-0">
                                      ₹{(v.price * v.quantity).toLocaleString("en-IN")}
                                    </span>

                                    {/* Remove variant */}
                                    <button
                                      onClick={() =>
                                        v.variantId === 0
                                          ? removeFromCart(item.productId)
                                          : removeVariant(item.productId, v.variantId)
                                      }
                                      className="p-1 text-red-400 hover:bg-red-50 rounded flex-shrink-0"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Order Summary ── */}
                <div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-4">
                    <div className="p-5">
                      <h2 className="text-base font-semibold text-gray-900 mb-4">Order Summary</h2>

                      {needsRetailerSelection && selectedRetailer && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4 text-xs text-green-700">
                          <User size={12} />
                          <span className="truncate">{selectedRetailer.store_name || selectedRetailer.name}</span>
                        </div>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Items ({cartCount})</span>
                          <span>₹{cartTotal.toLocaleString("en-IN")}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
                          <span>Total</span>
                          <span className="text-blue-600">₹{cartTotal.toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      <Button
                        onClick={handleCheckout}
                        className={`w-full mt-5 gap-2 text-white ${
                          needsRetailerSelection && !selectedRetailerId
                            ? "bg-gray-300 hover:bg-gray-300 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                        disabled={needsRetailerSelection && !selectedRetailerId}
                      >
                        <ShoppingCart size={15} />
                        {needsRetailerSelection && !selectedRetailerId ? "Select Customer First" : "Checkout"}
                      </Button>

                      {needsRetailerSelection && !selectedRetailerId && (
                        <p className="text-xs text-center text-yellow-600 mt-2 flex items-center justify-center gap-1">
                          <AlertCircle size={11} /> Select a customer to proceed
                        </p>
                      )}

                      <Button
                        variant="ghost"
                        onClick={() => {
                          if      (user?.role === "staff")    navigate("/staff");
                          else if (user?.role === "retailer") navigate("/retailer/products");
                          else                                navigate("/dealer/takeorder");
                        }}
                        className="w-full mt-2 text-gray-500 hover:text-gray-700 text-sm"
                      >
                        Continue Shopping
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty cart */
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center max-w-md mx-auto mt-12">
                <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-7 w-7 text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Your cart is empty</h2>
                <p className="text-gray-400 text-sm mb-6">Add products to your cart to place an order.</p>
                <Button
                  onClick={() => {
                    if      (user?.role === "staff")    navigate("/staff");
                    else if (user?.role === "retailer") navigate("/retailer/products");
                    else                                navigate("/dealer/takeorder");
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue Shopping
                </Button>
              </div>
            )}
          </div>

          {/* ── Order Confirmation Dialog ── */}
          <Dialog open={isOrderConfirmOpen} onOpenChange={setIsOrderConfirmOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                  </div>
                  Confirm Order
                </DialogTitle>
                <DialogDescription>Review your order details before submitting.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {needsRetailerSelection && selectedRetailer && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-800">
                    <User size={13} className="text-blue-500 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{selectedRetailer.store_name || selectedRetailer.name}</span>
                      <span className="text-blue-400 text-xs ml-2">{selectedRetailer.name}</span>
                    </div>
                  </div>
                )}

                {/* Order line items */}
                <div className="rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {cart.items.map((item) =>
                    item.variants.map((v) => (
                      <div key={`${item.productId}_${v.variantId}`} className="flex justify-between text-sm">
                        <span className="text-gray-700 flex items-center gap-1.5">
                          {item.productName}
                          {v.size && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">{v.size}</span>
                          )}
                          <span className="text-gray-400">×{v.quantity}</span>
                        </span>
                        <span className="font-medium text-gray-900 flex-shrink-0">
                          ₹{(v.price * v.quantity).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <Separator />
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-blue-600">₹{cartTotal.toLocaleString("en-IN")}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
                  <Textarea
                    placeholder="Add any special instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-20 resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsOrderConfirmOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleSubmitOrder}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Order"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          </div>
    </MainLayout>
  );
};

export default Cart;
