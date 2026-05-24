import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types";
import { apiUrl } from "@/url";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Package, SlidersHorizontal, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import OmsCart from "@/components/OmsCart";

// ─────────────────────────────────────────────────────────────────────────────
const RetailerHome = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const { cart, clearCart, cartTotal } = useCart();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDesign, setFilterDesign] = useState("");

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { navigate("/"); return; }
    if (user?.role !== "retailer") navigate("/dealer");
  }, [loading, isAuthenticated, user, navigate]);

  // ── Fetch products ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !isAuthenticated || user?.role !== "retailer" || !user?.dealer_id) return;
    setFetching(true);
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${apiUrl}/products?dealerid=${user.dealer_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();

        const formatted: Product[] = data.map((item: any) => {
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
            color:            item.color || attrs.color || "",
            price:            Number(item.price),
            stock:            Number(item.stock),
            description:      item.description || "",
            dealer_id:        Number(item.dealerid),
            dealerid:         Number(item.dealerid),
            image:            item.image || null,
            attributes:       attrs,
            business_type_id: item.business_type_id ?? null,
            variants: (item.variants ?? []).map((v: any) => ({
              ...v,
              color: v.color || item.color || attrs.color || "",
            })),
          };
        });

        setProducts(formatted);
      } catch {
        toast.error("Failed to load products");
      } finally {
        setFetching(false);
      }
    })();
  }, [loading, isAuthenticated, user]);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const brands = useMemo(() => {
    const s = new Set(products.map((p) => p.attributes?.brand || p.brand).filter(Boolean));
    return Array.from(s).sort();
  }, [products]);

  const categories = useMemo(() => {
    const s = new Set(
      products.map((p) => p.attributes?.category || p.attributes?.master_category || "").filter(Boolean)
    );
    return Array.from(s).sort();
  }, [products]);

  const filtered = useMemo(() => products.filter((p) => {
    const q = searchQuery.toLowerCase();
    if (q && !p.name.toLowerCase().includes(q) &&
      !Object.values(p.attributes ?? {}).some((v) => String(v).toLowerCase().includes(q)))
      return false;
    if (filterBrand !== "all" && (p.attributes?.brand || p.brand) !== filterBrand) return false;
    if (filterCategory !== "all") {
      const c = p.attributes?.category || p.attributes?.master_category;
      if (c !== filterCategory) return false;
    }
    if (filterDesign && !p.name.toLowerCase().includes(filterDesign.toLowerCase())) return false;
    return true;
  }), [products, searchQuery, filterBrand, filterCategory, filterDesign]);

  const resetFilters = () => {
    setSearchQuery(""); setFilterBrand("all");
    setFilterCategory("all"); setFilterDesign("");
  };

  // ── Place order ──────────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!cart.items.length) { toast.error("Cart is empty"); return; }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const orderItems = cart.items.flatMap((item) =>
        item.variants.map((v) => ({
          productId:           item.productId,
          variantId:           v.variantId,
          size:                v.size,
          color:               v.color,
          quantity:            v.quantity,
          price:               v.price,
          subtotal:            v.price * v.quantity,
          rack:                v.rack || "",
          attributes_snapshot: {
            ...item.attributes,
            brand:            item.brand,
            model:            item.model || "",
            business_type_id: item.businessTypeId,
          },
        }))
      );
      const res = await fetch(`${apiUrl}/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          retailerId:   user?.id,
          retailerName: user?.name,
          dealerId:     user?.dealer_id,
          total:        cartTotal,
          items:        orderItems,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Order placed successfully!");
      clearCart();
    } catch {
      toast.error("Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSize = Number(user?.business_type_id) === 2;

  if (loading || !isAuthenticated || user?.role !== "retailer") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 font-semibold">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-64 fixed top-0 left-0 h-full z-10"><Sidebar /></div>

      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <div className="flex-1 overflow-y-auto pt-16">
          <div className="container mx-auto px-4 py-5 max-w-7xl">

            {/* ── Page header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Place Order</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {fetching
                    ? "Loading…"
                    : `${filtered.length} product${filtered.length !== 1 ? "s" : ""} available`}
                </p>
              </div>

            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal size={14} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Filters</span>
                {(filterBrand !== "all" || filterCategory !== "all" || filterDesign || searchQuery) && (
                  <button onClick={resetFilters} className="ml-auto flex items-center gap-1 text-xs text-blue-600">
                    <RefreshCw size={11} /> Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="relative col-span-2 md:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input placeholder="Search products…" value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-sm bg-gray-50" />
                </div>
                {brands.length > 0 && (
                  <Select value={filterBrand} onValueChange={setFilterBrand}>
                    <SelectTrigger className="h-9 text-sm bg-gray-50"><SelectValue placeholder="Brand" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {categories.length > 0 && (
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-9 text-sm bg-gray-50"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Input placeholder="Search by design…" value={filterDesign}
                  onChange={(e) => setFilterDesign(e.target.value)}
                  className="h-9 text-sm bg-gray-50" />
              </div>
            </div>

            {/* ── Product grid ── */}
            {fetching ? (
              <div className="text-center py-16 text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30 animate-pulse" />
                <p className="text-sm">Loading catalog…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No products found</p>
                <button onClick={resetFilters} className="text-xs text-blue-600 hover:underline mt-2">Clear filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
                {filtered.map((product) => (
                  <OmsCart key={product.id} product={product} showSize={showSize} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailerHome;
