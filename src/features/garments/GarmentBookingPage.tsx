import { useEffect, useState } from "react";
import { toast } from "sonner";
import MainLayout from "@/components/MainLayoutProps";
import { Product } from "@/types";
import { apiUrl } from "@/url";
import { GarmentCatalogView } from "./GarmentCatalogView";

interface GarmentBookingPageProps {
  dealerId?: string | number | null;
  title: string;
  subtitle: string;
}

export function GarmentBookingPage({ dealerId, title, subtitle }: GarmentBookingPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealerId) return;
    setLoading(true);
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${apiUrl}/products?dealerid=${dealerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load garments catalog");
        const data = await response.json();
        const formatted = (data.products || data).map((item: any) => ({
          id: String(item.id),
          name: item.name || "",
          brand: item.brand || "",
          model: item.model || "",
          color: item.color || "",
          price: Number(item.price),
          stock: Number(item.stock),
          description: item.description || "",
          dealer_id: Number(item.dealerid),
          dealerid: Number(item.dealerid),
          image: item.image || null,
          attributes: typeof item.attributes === "string" ? JSON.parse(item.attributes) : item.attributes || {},
          business_type_id: item.business_type_id ?? null,
          variants: item.variants ?? [],
        }));
        setProducts(formatted);
      } catch (error: any) {
        toast.error(error?.message || "Could not load garments catalog");
      } finally {
        setLoading(false);
      }
    })();
  }, [dealerId]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),linear-gradient(180deg,_#fffdf8_0%,_#ffffff_32%,_#f8fafc_100%)] px-4 py-6">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-20 text-center text-sm font-medium text-slate-500 shadow-sm">
              Loading garments catalog...
            </div>
          ) : (
            <GarmentCatalogView products={products} title={title} subtitle={subtitle} />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
