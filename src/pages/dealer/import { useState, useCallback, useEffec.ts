import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Minus, Plus, Trash2, Phone, MapPin, Search,
  ShoppingCart, User, Store, Package, X,
} from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useVoiceOrder } from "@/hooks/useVoiceOrder";
import VoiceMicButton from "@/components/voice/VoiceMicButton";
import VoiceFallbackModal from "@/components/voice/VoiceFallbackModal";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import OmsCart from "@/components/OmsCart";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/url";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/Sidebar";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getImageUrl, getProxiedImageUrl } from "@/lib/imageUrl";

interface Retailer {
  id:         number;
  name:       string;
  city:       string;
  phone:      string;
  email:      string;
  address:    string;
  store_name: string;
}

const TakeOrder = () => {
  const {
    cart, addToCart, removeFromCart, removeVariant,
    updateQuantity, updateVariantQty,
    clearCart, cartTotal, cartCount,
  } = useCart();

  const [searchQuery, setSearchQuery]         = useState("");
  const [isOrderConfirmOpen, setIsOrderConfirmOpen] = useState(false);
  const [notes, setNotes]                     = useState("");
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [products, setProducts]               = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError]     = useState("");
  const { user, isAuthenticated }             = useAuth();
  const navigate                              = useNavigate();
  const isMobile                              = useIsMobile();
  const [filteredRetailers, setFilteredRetailers] = useState<Retailer[]>([]);
  const [retailers, setRetailers]             = useState<Retailer[]>([]);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [activeTab, setActiveTab]             = useState<string>("retailers");
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [retailerSearch, setRetailerSearch]   = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDesign, setFilterDesign] = useState("");
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  
    // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) { navigate("/"); return; }
    if (user?.role !== "dealer") { navigate("/retailer/dashboard"); return; }
  }, [isAuthenticated, user, navigate]);

  // ── Fetch retailers ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res   = await fetch(`${apiUrl}/retailers?dealerid=${user.id}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setRetailers(data);
        setFilteredRetailers(data);
      } catch { console.error("Retailers fetch error"); }
    })();
  }, [user?.id]);

  // ── Fetch products ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoadingProducts(true);
        const token = localStorage.getItem("token");
        const res   = await fetch(`${apiUrl}/products?dealerid=${user?.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        // Format products with proper typing and business_type_id
        const formatted: Product[] = (data.products || data).map((item: any) => {
          let attrs: Record<string, string> = {};
          if (item.attributes) {
            attrs = typeof item.attributes === "string" ? JSON.parse(item.attributes) : item.attributes;
          }
          return {
            id:               String(item.id),
            name:             item.name || "",
            brand:            item.brand || attrs.brand || "",
            model:            item.model || attrs.model || "",
            price:            Number(item.price),
            stock:            Number(item.stock),
            description:      item.description || "",
            dealer_id:        Number(item.dealerid),
            dealerid:         Number(item.dealerid),
            image:            item.image || null,
            attributes:       attrs,
            business_type_id: item.business_type_id ?? null,
            variants:         item.variants ?? [],
          };
        });
        setProducts(formatted);
      } catch {
        setProductsError("Unable to load products");
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, [user?.id]);

  // ── Voice ─────────────────────────────────────────────────────────────────
  const {
    voiceState, rawTranscript, parseResult, errorMessage,
    startListening, stopListening, reprocessTranscript, reset: resetVoice,
  } = useVoiceOrder({ products });

  const handleVoiceStart = useCallback(() => { resetVoice(); startListening(); }, [resetVoice, startListening]);

  const handleVoiceAutoAdd = useCallback(() => {
    if (!parseResult) return;
    if (voiceState === "success") {
      let addedCount = 0;
      parseResult.parsed.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product) { addToCart(product, item.quantity); addedCount++; }
      });
      if (addedCount > 0) toast.success(`Added ${addedCount} product(s) to cart`);
      resetVoice();
    } else if (voiceState === "fallback" || voiceState === "error") {
      setShowFallbackModal(true);
    }
  }, [parseResult, voiceState, products, addToCart, resetVoice]);

  if (voiceState === "success" && parseResult && !showFallbackModal)
    setTimeout(() => handleVoiceAutoAdd(), 0);
  if ((voiceState === "fallback" || (voiceState === "error" && rawTranscript)) && !showFallbackModal)
    setTimeout(() => setShowFallbackModal(true), 0);

  const handleConfirmItems = (items: { productId: string; quantity: number }[]) => {
    let count = 0;
    items.forEach(({ productId, quantity }) => {
      const p = products.find((x) => x.id === productId);
      if (p) { addToCart(p, quantity); count++; }
    });
    if (count > 0) toast.success(`Added ${count} product(s) to cart`);
    resetVoice();
  };

  // ── Retailer search ───────────────────────────────────────────────────────
  const handleRetailerSearch = (query: string) => {
    setRetailerSearch(query);
    if (!query.trim()) { setFilteredRetailers(retailers); return; }
    const q = query.toLowerCase();
    setFilteredRetailers(retailers.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.store_name.toLowerCase().includes(q)
    ));
  };

const brands = useMemo(() => {
  const uniqueBrands = new Set(
    products
      .map(p => p.brand || p.attributes?.brand)
      .filter(Boolean)
  );
  return Array.from(uniqueBrands).sort();
}, [products]);

const categories = useMemo(() => {
  const catValues = products
    .map(p => p.attributes?.category || p.attributes?.master_category)
    .filter(Boolean);
  const uniqueCategories = new Set(catValues);
  return Array.from(uniqueCategories).sort();
}, [products]);

const filteredProducts = useMemo(() => {
  return products.filter((p) => {
    const q = searchQuery.toLowerCase();

    if (
      q &&
      !p.name.toLowerCase().includes(q) &&
      !Object.values(p.attributes ?? {}).some((v) =>
        String(v).toLowerCase().includes(q)
      )
    ) return false;

    if (filterBrand !== "all" && (p.attributes?.brand || p.brand) !== filterBrand)
      return false;

    if (filterCategory !== "all") {
      const c = p.attributes?.category || p.attributes?.master_category;
      if (c !== filterCategory) return false;
    }

    if (filterDesign && !p.name.toLowerCase().includes(filterDesign.toLowerCase()))
      return false;

    return true;
  });
}, [products, searchQuery, filterBrand, filterCategory, filterDesign]);

const resetFilters = () => {
  setSearchQuery("");
  setFilterBrand("all");
  setFilterCategory("all");
  setFilterDesign("");
};

// Replace toBase64 entirely with this
const loadImageAsBase64 = async (url: string, retries = 3): Promise<string> => {
  if (!url) return "";

  // If external URL, skip canvas tainting - use placeholder for PDF
  if (url.startsWith("http") && !url.includes(apiUrl.replace("/api", ""))) {
    return ""; 
  }

  const attemptLoad = (delay = 0): Promise<string> => 
    new Promise((resolve) => {
      setTimeout(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        const timeout = setTimeout(() => resolve(""), 10000); // 10s timeout
        
        img.onload = () => {
          clearTimeout(timeout);
          try {
            const canvas = document.createElement("canvas");
            const maxDim = 800;
            let ratio = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight);
            ratio = Math.max(ratio, 1.5);
            canvas.width = img.naturalWidth * ratio;
            canvas.height = img.naturalHeight * ratio;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL("image/jpeg", 0.95));
            } else {
              resolve("");
            }
          } catch {
            resolve("");
          }
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          resolve("");
        };
        
        img.src = url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
      }, delay);
    });

  // Retry with exponential backoff
  for (let i = 0; i < retries; i++) {
    const delay = i * 2000; // 0s, 2s, 4s
    const result = await attemptLoad(delay);
    if (result && result !== "") return result;
  }
  return "";
};
// ── Generate Catalog PDF ─────────────────────────────────────────────────
  const generateCatalogPDF = async () => {
    if (!pdfContainerRef.current) return;

    const productsToExport = filteredProducts.length > 0 ? filteredProducts : products;
    if (productsToExport.length === 0) {
      toast.error("No products available to generate catalog");
      return;
    }

    console.time('PDF Generation');

    const pdf = new jsPDF("p", "mm", "a4", 0);
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = pageHeight - 2 * margin;
    const imgSectionHeight = contentHeight * 0.7;
    const detailsHeight = contentHeight * 0.3;
    const imgWidth = contentWidth * 0.8;

    pdfContainerRef.current.innerHTML = "";

    const toastId = toast.loading("🔄 Fast PDF generation started - loading images in parallel...");

    // PARALLEL IMAGE LOADING - HUGE SPEEDUP
    const productData = await Promise.all(
      productsToExport.map(async (product) => {
        let imgBase64 = "";

        try {
          if (product.image) {
            const imgUrl = getProxiedImageUrl(product.image);
            imgBase64 = await loadImageAsBase64(imgUrl);
          }
        } catch (e) {
          console.error("Image load failed for", product.name, e);
        }

        return { product, imgBase64 };
      })
    );


    try {
      let pageIndex = 0;

      for (const {product, imgBase64} of productData) {
        // Parse attributes safely
        let attributes: Record<string, string> = {};
        try {
          attributes = typeof product.attributes === "string" ? JSON.parse(product.attributes) : product.attributes;
        } catch (e) {
          console.error("Attributes parse failed", e);
        }
        
        let designNo = product.name.slice(0, 20) + "...";
        const designMatch = product.name.match(/Design No:\\s*([\\d]+)/i);
        if (designMatch) designNo = designMatch[1];
        else if (attributes.design) designNo = attributes.design;

        const isPhoneBusiness = Number(product.business_type_id) === 1;
        
        // Garments variants
        const variants = product.variants || [];
        const sizes = [...new Set(variants.map((v: any) => v.size).filter(Boolean))];
        const sizeRates: Record<string, number> = {};
        variants.forEach((v: any) => {
          if (v.size && v.rate) sizeRates[v.size] = v.rate;
        });
        
        // Phone specs
        const model = attributes.model || product.model || product.name.slice(0, 25) + (product.name.length > 25 ? "..." : "");
        const ram = attributes.ram || "N/A";
        const storage = attributes.storage || "N/A";
        const phoneConfig = `${ram}/${storage}`;
        const phoneSpecs = [phoneConfig];
        const phonePrices = [product.price];
        
        const singlePrice = product.price;

        // Build table HTML
        let tableHTML = "";
        if (isPhoneBusiness) {
          tableHTML = `
            <div style="width: 100%; background: white; border-radius: 4mm; padding: 4mm; box-shadow: 0 1mm 2mm rgba(0,0,0,0.1);">
              <div style="font-size: 11pt; font-weight: bold; margin-bottom: 2mm;">Model: ${model}</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10pt; text-align: center;">
                <tr>
                  <td style="border: 1px solid #000; padding: 2mm; font-weight: bold;">Config</td>
                  ${phoneSpecs.map(spec => `<td style="border: 1px solid #000; padding: 2mm; font-weight: bold;">${spec}</td>`).join("")}
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 2mm; font-weight: bold;">MRP</td>
                  ${phonePrices.map(p => `<td style="border: 1px solid #000; padding: 2mm;">₹${p.toLocaleString('en-IN')}</td>`).join("")}
                </tr>
              </table>
            </div>
          `;
        } else if (sizes.length > 0) {
          // Garment table
          tableHTML = `
            <div style="width: 100%; background: white; border-radius: 4mm; padding: 4mm; box-shadow: 0 1mm 2mm rgba(0,0,0,0.1);">
              <div style="font-size: 11pt; font-weight: bold; margin-bottom: 2mm;">Design No : ${designNo}</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10pt; text-align: center;">
                <tr>
                  <td style="border: 1px solid #000; padding: 2mm; font-weight: bold;">Size</td>
                  ${sizes.map(size => `<td style="border: 1px solid #000; padding: 2mm; font-weight: bold;">${size}</td>`).join("")}
                </tr>
                <tr>
                  <td style="border: 1px solid #000; padding: 2mm; font-weight: bold;">MRP</td>
                  ${sizes.map(size => `<td style="border: 1px solid #000; padding: 2mm;">${sizeRates[size]?.toLocaleString("en-IN") || "-"}</td>`).join("")}
                </tr>
              </table>
            </div>
          `;
        } else {
          tableHTML = `<div style="width: 100%; padding: 6mm; background: white; text-align: center;">₹${singlePrice.toLocaleString('en-IN')}</div>`;
        }


        // Create DOM (unchanged for now - next step canvas)
        const productDiv = document.createElement("div");
        productDiv.style.width = `${contentWidth}mm`;
        productDiv.style.height = `${contentHeight}mm`;
        productDiv.style.padding = "0";
        productDiv.style.backgroundColor = "#fafbfc";
        productDiv.style.fontFamily = "-apple-system, BlinkMacSystemFont, sans-serif";
        productDiv.style.display = "flex";
        productDiv.style.flexDirection = "column";
        productDiv.style.alignItems = "center";
        productDiv.style.color = "#1f2937";
        productDiv.innerHTML = `
          <div style="width: 100%; height: ${imgSectionHeight}mm; background: white; border-radius: 0 0 8mm 8mm; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 10mm;">
            ${imgBase64 
              ? `<img 
                  src="${imgBase64}" 
                  style="max-width: ${imgWidth}mm; max-height: 100%; width: auto; height: auto; object-fit: contain;" 
                />` 
              : `<div style="width: 80mm; height: 80mm; background: #e5e7eb; border-radius: 8mm; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 12pt; border: 2px dashed #d1d5db;">
                  No Image
                </div>`
            }
          </div>

          <div style="width: 100%; height: ${detailsHeight}mm; padding: 8mm 12mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-start; background: white; border-radius: 8mm 8mm 0 0;">
            
            <div style="text-align: center; margin-bottom: 4mm;">
              <h2 style="font-size: 16pt; font-weight: bold; color: #1f2937; margin: 0 0 2mm 0;">
                ${product.name}
              </h2>
              
            </div>

            ${tableHTML}

          </div>
        `;


        pdfContainerRef.current.appendChild(productDiv);

        // Wait for image if present
        const pdfImg = productDiv.querySelector("img") as HTMLImageElement | null;
        if (pdfImg && imgBase64) {
          await new Promise((resolve) => {
            let loaded = false;
            const timeoutId = setTimeout(() => resolve(true), 2000); // Reduced timeout
            
            if (pdfImg.complete && pdfImg.naturalWidth > 0) {
              clearTimeout(timeoutId);
              resolve(true);
              return;
            }
            
            const onLoad = () => {
              if (!loaded) {
                loaded = true;
                pdfImg.onload = null;
                pdfImg.onerror = null;
                clearTimeout(timeoutId);
                resolve(true);
              }
            };
            pdfImg.onload = onLoad;
            pdfImg.onerror = onLoad;
          });
        }

        const canvas = await html2canvas(productDiv, {
          scale: 2, // Reduced from 3
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#fafbfc',
          imageTimeout: 3000,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9); // JPEG faster
        const pdfImgHeight = contentHeight * 0.95; // Fixed height

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, pdfImgHeight);

        pdfContainerRef.current.removeChild(productDiv);

        pageIndex++;
      }

      pdf.save('Product-Catalog.pdf');
      toast.success(`✅ Fast Catalog PDF generated for ${productsToExport.length} products!`, {
        id: toastId,
      });

      console.timeEnd('PDF Generation');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Check console for details.', {
        id: toastId,
      });
    }
  };


  // ── Place order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!selectedRetailer) { toast.error("Select a customer first!"); return; }
    if (!cart.items.length) { toast.error("Cart is empty!"); return; }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");

      // Flatten grouped cart into line items with attribute snapshots
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
          dealerId:     user?.id,
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

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="w-64 fixed top-0 left-0 h-full z-10"><Sidebar /></div>

      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <div className="flex-1 overflow-y-auto pt-16">
          <div className="container mx-auto px-4 py-6">

            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Create Order</h1>
              <p className="text-gray-500 text-sm mt-1">Select a customer and add products to the cart</p>
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
                    <p className="text-xs text-gray-400 mt-0.5">{retailers.length} customers available</p>
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

                {/* Search + Voice */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, brand, or model..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-white"
                    />
                  </div>
                  <VoiceMicButton voiceState={voiceState} onStart={handleVoiceStart} onStop={stopListening} />
                </div>

                {/* Hidden PDF temp container */}
                <div ref={pdfContainerRef} style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm', height: '297mm' }} />

                {/* ── Filters ── */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5"> 
                  <div className="flex items-center gap-2 mb-3">
                    <Search size={14} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Filters
                    </span>

                    {(filterBrand !== "all" || filterCategory !== "all" || filterDesign || searchQuery) && (
                      <button
                        onClick={resetFilters}
                        className="flex items-center gap-1 text-xs text-blue-600"
                      >
                        Reset
                      </button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={generateCatalogPDF}
                      className="ml-2 h-8 px-3"
                    >
                      📄 Generate Catalog PDF
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3"> 
                    {/* Search */}
                    <div className="relative col-span-2 md:col-span-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        placeholder="Search products…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-9 text-sm bg-gray-50"
                      />
                    </div>

                    {/* Brand */}
                    {brands.length > 0 && (
                      <select
                        value={filterBrand}
                        onChange={(e) => setFilterBrand(e.target.value)}
                        className="h-9 text-sm bg-gray-50 border rounded px-2"
                      >
                        <option value="all">All Brands</option>
                        {brands.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    )}

                    {/* Category */}
                    {categories.length > 0 && (
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="h-9 text-sm bg-gray-50 border rounded px-2"
                      >
                        <option value="all">All Categories</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}

                    {/* Design */}
                    <Input
                      placeholder="Search by design…"
                      value={filterDesign}
                      onChange={(e) => setFilterDesign(e.target.value)}
                      className="h-9 text-sm bg-gray-50"
                    />
                  </div>
                </div>

                {/* Live transcript */}
                {(voiceState === "listening" || voiceState === "processing") && rawTranscript && (
                  <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-xs text-blue-400 mb-1">{voiceState === "listening" ? "Hearing:" : "Processing:"}</p>
                    <p className="text-sm italic text-blue-700">"{rawTranscript}"</p>
                  </div>
                )}
                {voiceState === "error" && !rawTranscript && errorMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100">
                    <p className="text-sm text-red-600">{errorMessage}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={resetVoice}>Try Again</Button>
                  </div>
                )}

                {!loadingProducts && (
                  <p className="text-xs text-gray-400 mb-3">
                    {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} {searchQuery ? "found" : "available"}
                  </p>
                )}

                {/* Products grid */}
                {loadingProducts ? (
                  <div className="text-center py-16 text-gray-400">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-30 animate-pulse" />
                    <p className="text-sm">Loading products...</p>
                  </div>
                ) : productsError ? (
                  <div className="text-center py-16 text-red-400"><p className="text-sm">{productsError}</p></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredProducts.map((product) => (
                      <OmsCart
                        key={product.id}
                        product={product}
                        showSize={Number(user?.business_type_id) === 2}
                      />
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="text-center py-16 text-gray-400">
                        <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No products found.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Cart Summary (grouped) ── */}
                {cart.items.length > 0 && (
                  <Card className="mt-6 p-5 shadow-md bg-white border-gray-100 max-w-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingCart size={16} className="text-blue-600" />
                        Cart Summary
                      </h3>
                      <Badge variant="secondary" className="text-xs">{cartCount} item{cartCount !== 1 ? "s" : ""}</Badge>
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
                                <span className="text-xs font-semibold text-gray-800 w-16 text-right flex-shrink-0">₹{(v.price * v.quantity).toLocaleString("en-IN")}</span>
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

            {/* Voice Fallback Modal */}
            <VoiceFallbackModal
              open={showFallbackModal}
              onClose={() => { setShowFallbackModal(false); resetVoice(); }}
              parseResult={parseResult}
              rawTranscript={rawTranscript}
              products={products}
              onReprocess={reprocessTranscript}
              onConfirmItems={handleConfirmItems}
              errorMessage={errorMessage}
            />

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

                  {/* Order line items */}
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
      </div>
    </div>
  );
};

export default TakeOrder;
