import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Product, Retailer, Staff } from "@/types";
import { apiUrl } from "@/url";
import { useIsMobile } from "@/hooks/use-mobile";
import OrdersList from "@/components/OrdersList";
import Sidebar from "@/components/Sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Package, ShoppingCart, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import OmsCart from "@/components/OmsCart";
import { useCart } from "@/context/CartContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const Orders = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    cart,
    clearCart,
    cartTotal,
    cartCount,
  } = useCart();
  
  const [filteredRetailers, setFilteredRetailers] = useState<Retailer[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeTabForOrder, setActiveTabForOrder] = useState<string>("all");
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [activeTab, setActiveTab] = useState<string>("orders");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [retailerSearch, setRetailerSearch] = useState("");
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [isOrderConfirmOpen, setIsOrderConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isAuthenticated) { navigate("/"); return; }
    if (user?.role !== "staff") { navigate("/dealer"); return; }
  }, [isAuthenticated, user, navigate]);

  // ✅ Fixed: executiveid (not executive_id)
  useEffect(() => {
    if (!user?.id) return;
    const fetchRetailers = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const response = await fetch(
          `${apiUrl}/staff/get_retailers_by_executive?executiveid=${user.id}`,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
        if (!response.ok) throw new Error("Failed to fetch retailers");
        const data = await response.json();
        setRetailers(data);
        setFilteredRetailers(data);
      } catch (err) {
        console.error("Retailers fetch error:", err);
      }
    };
    fetchRetailers();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    const token = localStorage.getItem("token") || localStorage.getItem("jwt");

    const fetchOrders = async () => {
      try {
        const res = await fetch(`${apiUrl}/orders/byexecutive?executiveid=${user.id}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch orders");
        const data = await res.json();
        if (isMounted) { setOrders(data); setFilteredOrders(data); }
      } catch (err) {
        console.error("Orders fetch error:", err);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [user?.id]);

  useEffect(() => {
    const filtered = activeTabForOrder === "all"
      ? orders
      : orders.filter(o => o.status === activeTabForOrder);
    setFilteredOrders(filtered);
  }, [orders, activeTabForOrder]);

  // ── Fetch products ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.dealer_id) return;
    (async () => {
      try {
        setLoadingProducts(true);
        const token = localStorage.getItem("token");
        const res = await fetch(`${apiUrl}/products?dealerid=${user.dealer_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const formatted: Product[] = (data.products || data).map((item: any) => {
          let attrs: Record<string, string> = {};
          if (item.attributes) {
            attrs = typeof item.attributes === "string" ? JSON.parse(item.attributes) : item.attributes;
          }
          return {
            id: String(item.id),
            name: item.name || "",
            brand: item.brand || attrs.brand || "",
            model: item.model || attrs.model || "",
            color:            item.color || attrs.color || "",
            price: Number(item.price),
            stock: Number(item.stock),
            description: item.description || "",
            dealer_id: Number(item.dealerid),
            dealerid: Number(item.dealerid),
            image: item.image || null,
            attributes: attrs,
            business_type_id: item.business_type_id ?? null,
            variants: item.variants ?? [],
          };
        });
        setProducts(formatted);
      } catch {
        console.error("Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, [user?.dealer_id]);

  // ── Retailer search ───────────────────────────────────────────────────────
  const handleRetailerSearch = (query: string) => {
    setRetailerSearch(query);
    if (!query.trim()) {
      setFilteredRetailers(retailers);
      return;
    }
    const q = query.toLowerCase();
    setFilteredRetailers(
      retailers.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          r.store_name.toLowerCase().includes(q)
      )
    );
  };

  const filteredProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.model.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  // ── Place order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!selectedRetailer) {
      toast.error("Select a customer first!");
      return;
    }
    if (!cart.items.length) {
      toast.error("Cart is empty!");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const orderItems = cart.items.flatMap((item) =>
        item.variants.map((v) => ({
          productId: item.productId,
          variantId: v.variantId,
          size: v.size,
          color: v.color,
          quantity: v.quantity,
          price: v.price,
          subtotal: v.price * v.quantity,
          rack: v.rack || "",
          attributes_snapshot: {
            ...item.attributes,
            brand: item.brand,
            model: item.model || "",
            business_type_id: item.businessTypeId,
          },
        }))
      );

      const res = await fetch(`${apiUrl}/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          retailerId: selectedRetailer.id,
          retailerName: selectedRetailer.name,
          dealerId: user?.dealer_id,
          order_by: user?.role,
          order_by_id: user?.id,
          total: cartTotal,
          notes: notes || "",
          items: orderItems,
        }),
      });

      if (!res.ok) throw new Error();
      clearCart();
      setIsOrderConfirmOpen(false);
      setNotes("");
      setSelectedRetailer(null);
      toast.success("Order submitted successfully!");
      // Refresh orders
      const ordersRes = await fetch(`${apiUrl}/orders/byexecutive?executiveid=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data);
        setFilteredOrders(data);
      }
    } catch {
      toast.error("Failed to submit order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarColors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-teal-100 text-teal-700",
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="w-64 fixed top-0 left-0 h-full z-10">
        <Sidebar />
      </div>

      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />

        <div className="flex-1 overflow-y-auto pt-16">
          <div className="container mx-auto px-4 py-6">

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Sales Report & Orders</h1>
              <p className="text-gray-500 text-sm mt-1">View your orders or create new ones</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {isMobile ? (
                <ScrollArea className="w-full pb-2">
                  <TabsList className="flex w-max mb-4 bg-white border shadow-sm">
                    <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                      <Package size={14} /> Orders
                    </TabsTrigger>
                    <TabsTrigger value="create" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                      <ShoppingCart size={14} /> Create Order
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
                  <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <Package size={14} /> Orders
                  </TabsTrigger>
                  <TabsTrigger value="create" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <ShoppingCart size={14} /> Create Order
                    {cartCount > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              )}

              {/* Orders Tab */}
              <TabsContent value="orders">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="p-4 md:p-6">
                    <OrdersList
                      orders={filteredOrders}
                      highlightNew={activeTabForOrder === "pending" || activeTabForOrder === "all"}
                      retailers={retailers}
                      staff={filteredStaff}
                    />
                    {filteredOrders.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No orders found.
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Create Order Tab */}
              <TabsContent value="create">
                <Tabs defaultValue="customers">
                  <TabsList className="mb-6 bg-white border shadow-sm">
                    <TabsTrigger value="customers" className="gap-2">
                      <User size={14} /> Select Customer
                    </TabsTrigger>
                    <TabsTrigger value="products" className="gap-2">
                      <Package size={14} /> Add Products
                    </TabsTrigger>
                  </TabsList>

                  {/* Customers Tab */}
                  <TabsContent value="customers">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Select Customer</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{retailers.length} customers available</p>
                      </div>
                      {selectedRetailer && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5">
                          <User size={12} /> {selectedRetailer.store_name} selected
                        </Badge>
                      )}
                    </div>

                    <div className="relative mb-4 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search customers..."
                        value={retailerSearch}
                        onChange={(e) => handleRetailerSearch(e.target.value)}
                        className="pl-9 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredRetailers.map((r, index) => {
                        const isSelected = selectedRetailer?.id === r.id;
                        return (
                          <Card
                            key={r.id}
                            onClick={() => setSelectedRetailer(r)}
                            className={`p-4 cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? "border-blue-500 border-2 bg-blue-50 shadow-md"
                                : "hover:shadow-md hover:border-blue-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                                  avatarColors[index % avatarColors.length]
                                }`}
                              >
                                {r.store_name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-gray-900 text-sm truncate">{r.store_name}</p>
                                  {isSelected && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                                </div>
                                <p className="text-xs text-gray-500 truncate">{r.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{r.phone}</p>
                              </div>
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

                  {/* Products Tab */}
                  <TabsContent value="products">
                    {!selectedRetailer ? (
                      <div className="mb-5 flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                        <span className="text-yellow-500 text-lg">⚠️</span>
                        <p className="text-sm text-yellow-700">
                          Please select a customer from the <strong>Select Customer</strong> tab first.
                        </p>
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
                      </div>
                    )}

                    {/* Search */}
                    <div className="relative mb-5 max-w-md">
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
                        {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}{" "}
                        {searchQuery ? "found" : "available"}
                      </p>
                    )}

                    {/* Products grid */}
                    {loadingProducts ? (
                      <div className="text-center py-16 text-gray-400">
                        <Package className="h-10 w-10 mx-auto mb-3 opacity-30 animate-pulse" />
                        <p className="text-sm">Loading products...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts.map((product) => (
                          <OmsCart
                            key={product.id}
                            product={product}
                            showSize={Number(user?.business_type_id) === 2}
                          />
                        ))}
                        {filteredProducts.length === 0 && (
                          <div className="col-span-3 text-center py-16 text-gray-400">
                            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No products found.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cart Summary */}
                    {cart.items.length > 0 && (
                      <Card className="mt-6 p-5 shadow-md bg-white border-gray-100 max-w-lg">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <ShoppingCart size={16} className="text-blue-600" />
                            Cart Summary
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {cartCount} item{cartCount !== 1 ? "s" : ""}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          {cart.items.map((item) => {
                            const itemTotal = item.variants.reduce((s, v) => s + v.price * v.quantity, 0);
                            return (
                              <div key={item.productId} className="text-sm flex justify-between items-center">
                                <span className="text-gray-700 truncate flex-1">{item.productName}</span>
                                <span className="font-medium text-gray-900 ml-2">
                                  ₹{itemTotal.toLocaleString("en-IN")}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <Separator className="my-3" />
                        <div className="flex justify-between font-bold text-gray-900 text-sm mb-4">
                          <span>Total</span>
                          <span className="text-blue-600 text-base">
                            ₹{cartTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
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
                      <User size={15} className="text-blue-500 flex-shrink-0" />
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
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">
                                {v.size}
                              </span>
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
                    <span className="text-blue-600">
                      ₹{cartTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
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
                  <Button variant="outline" onClick={() => setIsOrderConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePlaceOrder}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Order"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
