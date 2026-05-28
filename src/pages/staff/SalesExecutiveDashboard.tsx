import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Product } from "@/types";
import { apiUrl } from "@/url";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Minus, Plus, Trash2, Phone, MapPin, Search,
  User, Package, ShoppingCart, Store, X,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import Sidebar from "@/components/Sidebar";
import OmsCart from "@/components/OmsCart";
import { Retailer } from "@/types";
import { useBusinessSchema } from "@/hooks/useBusinessSchema";
import MainLayout from "@/components/MainLayoutProps";
import { isGarmentsBusiness } from "@/lib/businessType";
import { GarmentBookingPage } from "@/features/garments/GarmentBookingPage";

const LegacySalesExecutiveDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const {
    cart, clearCart,
    updateQuantity, updateVariantQty,
    removeFromCart, removeVariant,
    cartTotal, cartCount,
  } = useCart();

  const navigate   = useNavigate();
  const isMobile   = useIsMobile();

  const [filteredRetailers, setFilteredRetailers] = useState<Retailer[]>([]);
  const [retailers, setRetailers]                 = useState<Retailer[]>([]);
  const [selectedRetailer, setSelectedRetailer]   = useState<Retailer | null>(null);
  const [products, setProducts]                   = useState<Product[]>([]);
  const [activeTab, setActiveTab]                 = useState<string>("retailers");
  const [isSubmitting, setIsSubmitting]           = useState(false);
  const [notes, setNotes]                         = useState("");
  const [isOrderConfirmOpen, setIsOrderConfirmOpen] = useState(false);
  const [retailerSearch, setRetailerSearch]       = useState("");
  const [searchQuery, setSearchQuery]             = useState("");
  const [loadingProducts, setLoadingProducts]     = useState(false);

  // ── Use shared hook so showSize stays consistent with TakeOrder ────────────
  const { hasSize } = useBusinessSchema(user?.business_type_id ?? user?.business_type_id);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) { navigate("/"); return; }
    if (user?.role !== "staff") { navigate("/dealer"); return; }
  }, [isAuthenticated, user, navigate]);

  // ── Fetch retailers ────────────────────────────────────────────────────────
  useEffect(() => {
  if (!user?.id) return;
  console.log("Fetching retailers for user.id:", user?.id);  // ← add
  (async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { console.error("No token!"); return; }  // ← add
      const res = await fetch(
        `${apiUrl}/staff/get_retailers_by_executive?executiveid=${user.id}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      const data = await res.json();
      setRetailers(data);
      setFilteredRetailers(data);
    } catch(e) { console.error("Retailers fetch error", e); }
  })();
}, [user?.id]);


  // ── Fetch products — same mapping as TakeOrder ────────────────────────────
  useEffect(() => {
    if (!user?.dealer_id) return;
    (async () => {
      try {
        setLoadingProducts(true);
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${apiUrl}/products?dealerid=${user.dealer_id}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        // ── Identical mapping to TakeOrder ────────────────────────────────
        const formatted: Product[] = (data.products || data).map((item: any) => {
          let attrs: Record<string, string> = {};
          if (item.attributes) {
            attrs = typeof item.attributes === "string"
              ? JSON.parse(item.attributes)
              : item.attributes;
          }
          return {
            id:               String(item.id),
            name:             item.name || "",
            brand:            item.brand || attrs.brand || "",
            model:            item.model || attrs.model || "",
            color:            item.color || attrs.color || "",   // ← color mapped
            price:            Number(item.price),
            stock:            Number(item.stock),
            description:      item.description || "",
            dealer_id:        Number(item.dealerid),
            dealerid:         Number(item.dealerid),
            image:            item.image || null,
            attributes:       attrs,
            business_type_id: item.business_type_id ?? null,
            variants:         item.variants ?? [],               // ← variants mapped
          };
        });
        setProducts(formatted);
      } catch { console.error("Products fetch error"); }
      finally { setLoadingProducts(false); }
    })();
  }, [user?.dealer_id]);

  // ── Live retailer search ───────────────────────────────────────────────────
  useEffect(() => {
    if (!retailerSearch.trim()) { setFilteredRetailers(retailers); return; }
    const q = retailerSearch.toLowerCase();
    setFilteredRetailers(retailers.filter((r) =>
      r.name?.toLowerCase().includes(q) ||
      r.store_name?.toLowerCase().includes(q) ||
      r.phone?.includes(q) ||
      r.address?.toLowerCase().includes(q)
    ));
  }, [retailerSearch, retailers]);

  // ── Filtered products ──────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q) ||
      (p.model || "").toLowerCase().includes(q) ||
      Object.values(p.attributes ?? {}).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // ── Place order — same payload structure as TakeOrder ─────────────────────
  const handlePlaceOrder = async () => {
    if (!selectedRetailer) { toast.error("Select a customer first!"); return; }
    if (!cart.items.length) { toast.error("Cart is empty!"); return; }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");

      const orderItems = cart.items.flatMap((item) =>
        item.variants.map((v) => ({
          productId:  item.productId,
          variantId:  v.variantId,
          size:       v.size,
          color:      v.color,
          quantity:   v.quantity,
          price:      v.price,
          subtotal:   v.price * v.quantity,
          rack:       v.rack || "",
          attributes_snapshot: {
            ...item.attributes,
            brand:            item.brand,
            model:            item.model || "",
            business_type_id: item.businessTypeId,
          },
        }))
      );

      const res = await fetch(`${apiUrl}/orders`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          retailerId:   selectedRetailer.id,
          retailerName: selectedRetailer.name,
          dealerId:     user?.dealer_id,
          order_by:     user?.role,
          order_by_id:  user?.id,
          total:        cartTotal,
          notes:        notes || "",
          items:        orderItems,
        }),
      });

      if (!res.ok) throw new Error();
      clearCart();
      setIsOrderConfirmOpen(false);
      setNotes("");
      localStorage.removeItem("selectedRetailer");
      toast.success("Order submitted successfully!");
      navigate("/staff/sales_report");
    } catch {
      toast.error("Failed to submit order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarColors = [
    "bg-blue-100 text-blue-700", "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700", "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
  ];

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="px-4">
          <div className="container mx-auto px-2">

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Create Order</h1>
              <p className="text-gray-500 text-sm mt-1">Select a customer and add products to cart</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {isMobile ? (
                <ScrollArea className="w-full pb-2">
                  <TabsList className="flex w-max mb-4 bg-white border shadow-sm">
                    <TabsTrigger value="retailers" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                      <User size={14} /> Customers
                    </TabsTrigger>
                    <TabsTrigger value="order" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                      <Package size={14} /> Create Order
                      {cartCount > 0 && (
                        <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                          {cartCount}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </ScrollArea>
              ) : (
                <TabsList className="mb-6 bg-white border shadow-sm">
                  <TabsTrigger value="retailers" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <User size={14} /> Customers
                  </TabsTrigger>
                  <TabsTrigger value="order" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <Package size={14} /> Create Order
                    {cartCount > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              )}

              {/* ── Customers Tab ── */}
              <TabsContent value="retailers">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Select Customer</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{retailers.length} customers assigned to you</p>
                  </div>
                  {selectedRetailer && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5">
                      <Store size={12} /> {selectedRetailer.store_name} selected
                    </Badge>
                  )}
                </div>

                <div className="relative mb-4 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
                    value={retailerSearch}
                    onChange={(e) => setRetailerSearch(e.target.value)}
                    className="pl-9 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRetailers.map((r, index) => {
                    const isSelected = selectedRetailer?.id === r.id;
                    return (
                      <Card
                        key={r.id}
                        onClick={() => {
                          setSelectedRetailer(r);
                          localStorage.setItem("selectedRetailer", JSON.stringify(r));
                        }}
                        className={`p-4 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "border-blue-500 border-2 bg-blue-50 shadow-md"
                            : "hover:shadow-md hover:border-blue-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${avatarColors[index % avatarColors.length]}`}>
                            {r.store_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-gray-900 text-sm truncate">{r.store_name}</p>
                              {isSelected && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{r.name}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1 truncate">
                              <MapPin size={10} /> {r.address}
                            </p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Phone size={10} /> {r.phone}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                          <Button
                            size="sm"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRetailer(r);
                              localStorage.setItem("selectedRetailer", JSON.stringify(r));
                              setActiveTab("order");
                            }}
                          >
                            <ShoppingCart size={12} className="mr-1" /> Create Order
                          </Button>
                          <a
                            href={`tel:${r.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="h-8 w-8 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                          >
                            <Phone size={13} />
                          </a>
                          <a
                            href={`https://www.google.com/maps?q=${encodeURIComponent(r.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="h-8 w-8 flex items-center justify-center rounded-md bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                          >
                            <MapPin size={13} />
                          </a>
                        </div>
                      </Card>
                    );
                  })}

                  {filteredRetailers.length === 0 && (
                    <div className="col-span-3 text-center py-16 text-gray-400">
                      <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No customers found</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Create Order Tab ── */}
              <TabsContent value="order">
                {/* Selected customer banner */}
                {!selectedRetailer ? (
                  <div className="mb-5 flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                    <span className="text-yellow-500 text-lg">⚠️</span>
                    <p className="text-sm text-yellow-700">
                      Please select a customer from the <strong>Customers</strong> tab first.
                    </p>
                    <Button size="sm" variant="outline" className="ml-auto border-yellow-300 text-yellow-700 hover:bg-yellow-100" onClick={() => setActiveTab("retailers")}>
                      Go to Customers
                    </Button>
                  </div>
                ) : (
                  <div className="mb-5 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                      {selectedRetailer.store_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">{selectedRetailer.store_name}</p>
                      <p className="text-xs text-blue-600">{selectedRetailer.name} · {selectedRetailer.phone}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-100 text-xs" onClick={() => setActiveTab("retailers")}>
                      Change
                    </Button>
                  </div>
                )}

                {/* Search */}
                <div className="relative max-w-md mb-5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, brand, or model..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white"
                  />
                </div>

                {!loadingProducts && (
                  <p className="text-xs text-gray-400 mb-3">
                    {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} available
                  </p>
                )}

                {/* ── Products grid using OmsCart (same as TakeOrder) ── */}
                {loadingProducts ? (
                  <div className="text-center py-16 text-gray-400">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-30 animate-pulse" />
                    <p className="text-sm">Loading products...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredProducts.map((product) => (
                      <OmsCart
                        key={product.id}
                        product={product}
                        showSize={hasSize}   // ← from useBusinessSchema hook
                      />
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="col-span-4 text-center py-16 text-gray-400">
                        <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No products found.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Cart Summary — same grouped structure as TakeOrder ── */}
                {cart.items.length > 0 && (
                  <Card className="mt-6 p-5 shadow-md bg-white border-gray-100 max-w-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingCart size={16} className="text-blue-600" /> Cart Summary
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {cartCount} item{cartCount !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                      {cart.items.map((item) => {
                        const itemTotal = item.variants.reduce((s, v) => s + v.price * v.quantity, 0);
                        return (
                          <div key={item.productId} className="border border-gray-100 rounded-lg overflow-hidden">
                            {/* Product header */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                              <p className="text-sm font-semibold text-gray-900 flex-1 truncate">{item.productName}</p>
                              <span className="text-sm font-bold text-blue-600 flex-shrink-0">₹{itemTotal.toLocaleString("en-IN")}</span>
                              <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-1">
                                <Trash2 size={13} />
                              </button>
                            </div>
                            {/* Variant rows */}
                            {item.variants.map((v) => (
                              <div key={`${item.productId}_${v.variantId}`} className="flex items-center gap-2 px-3 py-1.5">
                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                  {v.size && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">{v.size}</span>}
                                  {v.color && <span className="text-xs text-gray-400 truncate">{v.color}</span>}
                                  {!v.size && !v.color && <span className="text-xs text-gray-400">Standard</span>}
                                </div>
                                <span className="text-xs text-gray-400 flex-shrink-0">₹{v.price}</span>
                                <div className="flex items-center border border-gray-200 rounded overflow-hidden flex-shrink-0">
                                  <button
                                    onClick={() => v.variantId === 0 ? updateQuantity(item.productId, v.quantity - 1) : updateVariantQty(item.productId, v.variantId, v.quantity - 1)}
                                    className="px-1.5 py-1 text-gray-500 hover:bg-gray-50"
                                  ><Minus size={10} /></button>
                                  <span className="px-2 text-xs font-medium text-gray-800 min-w-[20px] text-center">{v.quantity}</span>
                                  <button
                                    onClick={() => v.variantId === 0 ? updateQuantity(item.productId, v.quantity + 1) : updateVariantQty(item.productId, v.variantId, v.quantity + 1)}
                                    disabled={v.quantity >= v.stock}
                                    className="px-1.5 py-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                                  ><Plus size={10} /></button>
                                </div>
                                <span className="text-xs font-semibold text-gray-800 w-16 text-right flex-shrink-0">
                                  ₹{(v.price * v.quantity).toLocaleString("en-IN")}
                                </span>
                                <button
                                  onClick={() => v.variantId === 0 ? removeFromCart(item.productId) : removeVariant(item.productId, v.variantId)}
                                  className="text-red-400 hover:text-red-600 flex-shrink-0"
                                ><X size={11} /></button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>

                    <Separator className="my-3" />
                    <div className="flex justify-between font-bold text-gray-900 text-sm mb-4">
                      <span>Total</span>
                      <span className="text-blue-600 text-base">₹{cartTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <Button
                      onClick={() => setIsOrderConfirmOpen(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                      disabled={!selectedRetailer}
                    >
                      <ShoppingCart size={15} />
                      {selectedRetailer ? "Place Order" : "Select a Customer First"}
                    </Button>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* Order Confirmation Dialog */}
            <Dialog open={isOrderConfirmOpen} onOpenChange={setIsOrderConfirmOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                    </div>
                    Confirm Order
                  </DialogTitle>
                  <DialogDescription>Review your order before submitting.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {selectedRetailer && (
                    <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2">
                      <Store size={15} className="text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">{selectedRetailer.store_name}</p>
                        <p className="text-xs text-blue-600">{selectedRetailer.name}</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
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
                    <span className="text-blue-600">₹{cartTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
                    <Textarea
                      placeholder="Add special instructions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-20 mt-1 resize-none"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsOrderConfirmOpen(false)}>Cancel</Button>
                  <Button onClick={handlePlaceOrder} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Order"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </div>
    </MainLayout>
  );
};

const SalesExecutiveDashboard = () => {
  const { user } = useAuth();

  if (isGarmentsBusiness(user?.business_type_id)) {
    return (
      <GarmentBookingPage
        dealerId={user?.dealer_id}
        title="Executive Garments Booking"
        subtitle="Capture size-wise garment orders for assigned retailers using the wholesale booking catalog."
      />
    );
  }

  return <LegacySalesExecutiveDashboard />;
};

export default SalesExecutiveDashboard;
