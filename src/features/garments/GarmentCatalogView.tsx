import { useMemo, useState } from "react";
import { Package2, Search, SlidersHorizontal } from "lucide-react";
import { Product } from "@/types";
import { Input } from "@/components/ui/input";
import { GarmentProductCard } from "./GarmentProductCard";
import {
  getGarmentBookingType,
  getGarmentCategory,
  getGarmentColors,
  getGarmentDesignNumber,
  getGarmentFabric,
  getGarmentSubCategory,
  isNewArrivalGarment,
  isTrendingGarment,
} from "./productUtils";

interface GarmentCatalogViewProps {
  products: Product[];
  title: string;
  subtitle: string;
}

export function GarmentCatalogView({ products, title, subtitle }: GarmentCatalogViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    bookingType: "all",
    brand: "all",
    category: "all",
    subCategory: "all",
    fabricType: "all",
    size: "all",
    color: "all",
    trend: "all",
    design: "",
  });

  const optionSets = useMemo(() => ({
    bookingTypes: Array.from(new Set(products.map(getGarmentBookingType).filter(Boolean))).sort(),
    brands: Array.from(new Set(products.map((product) => product.brand || product.attributes?.brand).filter(Boolean))).sort(),
    categories: Array.from(new Set(products.map(getGarmentCategory).filter(Boolean))).sort(),
    subCategories: Array.from(new Set(products.map(getGarmentSubCategory).filter(Boolean))).sort(),
    fabrics: Array.from(new Set(products.map(getGarmentFabric).filter(Boolean))).sort(),
    sizes: Array.from(new Set(products.flatMap((product) => (product.variants ?? []).map((variant) => variant.size)).filter(Boolean))).sort(),
    colors: Array.from(new Set(products.flatMap(getGarmentColors).filter(Boolean))).sort(),
  }), [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const haystack = [
          product.name,
          product.brand,
          getGarmentDesignNumber(product),
          getGarmentCategory(product),
          getGarmentSubCategory(product),
          getGarmentFabric(product),
          ...getGarmentColors(product),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (filters.bookingType !== "all" && getGarmentBookingType(product) !== filters.bookingType) return false;
      if (filters.brand !== "all" && (product.brand || product.attributes?.brand) !== filters.brand) return false;
      if (filters.category !== "all" && getGarmentCategory(product) !== filters.category) return false;
      if (filters.subCategory !== "all" && getGarmentSubCategory(product) !== filters.subCategory) return false;
      if (filters.fabricType !== "all" && getGarmentFabric(product) !== filters.fabricType) return false;
      if (filters.size !== "all" && !(product.variants ?? []).some((variant) => variant.size === filters.size)) return false;
      if (filters.color !== "all" && !getGarmentColors(product).includes(filters.color)) return false;
      if (filters.design && !getGarmentDesignNumber(product).toLowerCase().includes(filters.design.toLowerCase())) return false;
      if (filters.trend === "trending" && !isTrendingGarment(product)) return false;
      if (filters.trend === "new" && !isNewArrivalGarment(product)) return false;
      return true;
    });
  }, [filters, products, searchQuery]);

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const renderSelect = (key: keyof typeof filters, values: string[], placeholder: string) => (
    <select
      value={filters[key]}
      onChange={(event) => setFilter(key, event.target.value)}
      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-amber-400 focus:outline-none"
    >
      <option value="all">{placeholder}</option>
      {values.map((value) => (
        <option key={value} value={value}>
          {value}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,_#fff7ed,_#ffffff_45%,_#f8fafc)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              <SlidersHorizontal size={12} />
              Booking Catalog
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search design, category, fabric, color..."
              className="h-12 rounded-2xl border-slate-200 pl-9"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <SlidersHorizontal size={13} />
          Filters
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {renderSelect("bookingType", optionSets.bookingTypes, "All Booking Types")}
          {renderSelect("brand", optionSets.brands, "All Brands")}
          {renderSelect("category", optionSets.categories, "All Categories")}
          {renderSelect("subCategory", optionSets.subCategories, "All Sub Categories")}
          {renderSelect("fabricType", optionSets.fabrics, "All Fabrics")}
          {renderSelect("size", optionSets.sizes, "All Sizes")}
          {renderSelect("color", optionSets.colors, "All Colors")}
          <select
            value={filters.trend}
            onChange={(event) => setFilter("trend", event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-amber-400 focus:outline-none"
          >
            <option value="all">Trending / New</option>
            <option value="trending">Trending</option>
            <option value="new">New Arrival</option>
          </select>
          <Input
            value={filters.design}
            onChange={(event) => setFilter("design", event.target.value)}
            placeholder="Design Number"
            className="h-11 rounded-2xl border-slate-200"
          />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
          <Package2 className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900">No garments matched these filters</h3>
          <p className="mt-1 text-sm text-slate-500">Try widening the booking filters or searching with fewer keywords.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredProducts.map((product) => (
            <GarmentProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
