import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, ImagePlus, Package2, Shirt, Sparkles, Warehouse } from "lucide-react";
import { toast } from "sonner";
import MainLayout from "@/components/MainLayoutProps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/url";
import { getImageUrl } from "@/lib/imageUrl";
import { GarmentGalleryUploader } from "./GarmentGalleryUploader";
import { GarmentSingleSelect } from "./GarmentSingleSelect";
import { GarmentTagSelector } from "./GarmentTagSelector";
import {
  DEFAULT_GARMENT_OPTIONS,
  DEFAULT_GARMENT_COLOR_OPTIONS,
  GARMENT_OPTION_FIELDS,
  GarmentOptionField,
  getStoredGarmentColors,
  getStoredGarmentOptions,
  saveStoredGarmentColors,
  saveStoredGarmentOptions,
} from "./options";
import { getEnabledSizeSystemConfigs } from "./sizeSettings";
import { GarmentColorOption, GarmentFormValues, GarmentGalleryImage, GarmentSizeSystemKey, GarmentVariantDraft } from "./types";

const DEFAULT_FORM: GarmentFormValues = {
  productName: "",
  designNumber: "",
  brand: "",
  bookingType: "",
  launchDate: "",
  masterCategory: "",
  category: "",
  subCategory: "",
  fabricType: "",
  styleDesign: "",
  hsnCode: "",
  productDescription: "",
  productTags: [],
  trendingProduct: false,
  newArrival: false,
  rackNumber: "",
  barcodeSku: "",
  fitType: "",
};

function newVariant(size = "", defaults?: Partial<GarmentVariantDraft>): GarmentVariantDraft {
  return {
    id: crypto.randomUUID(),
    size,
    qty: defaults?.qty ?? "1",
    mrp: defaults?.mrp ?? "",
    rate: defaults?.rate ?? "",
    rack: defaults?.rack ?? "",
  };
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function defaultHex(name: string) {
  return DEFAULT_GARMENT_COLOR_OPTIONS.find((option) => option.name.toLowerCase() === name.toLowerCase())?.hex ?? "#d1d5db";
}

export default function GarmentAddProduct() {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainImageRef = useRef<HTMLInputElement>(null);

  const editProduct = (location.state as any)?.editProduct ?? null;
  const isEditing = Boolean(editProduct);

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<GarmentFormValues>(DEFAULT_FORM);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GarmentGalleryImage[]>([]);
  const [colorOptions, setColorOptions] = useState<GarmentColorOption[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizeType, setSelectedSizeType] = useState<GarmentSizeSystemKey | "">("");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState("");
  const [customSizesByType, setCustomSizesByType] = useState<Record<string, string[]>>({});
  const [variants, setVariants] = useState<GarmentVariantDraft[]>([]);
  const [optionsMap, setOptionsMap] = useState<Record<GarmentOptionField, string[]>>(() => {
    const initial = {} as Record<GarmentOptionField, string[]>;
    GARMENT_OPTION_FIELDS.forEach((field) => {
      initial[field] = DEFAULT_GARMENT_OPTIONS[field];
    });
    return initial;
  });

  const enabledSizeSystems = useMemo(() => {
    if (!user?.id) return getEnabledSizeSystemConfigs();
    return getEnabledSizeSystemConfigs(user.id);
  }, [user?.id]);

  const selectedSizeSystem = useMemo(
    () => enabledSizeSystems.find((system) => system.key === selectedSizeType) ?? enabledSizeSystems[0] ?? null,
    [enabledSizeSystems, selectedSizeType]
  );

  const sizeTypeOptions = useMemo(() => enabledSizeSystems.map((system) => system.label), [enabledSizeSystems]);

  const sizeOptions = useMemo(() => {
    if (!selectedSizeSystem) return [];
    const customOptions = customSizesByType[selectedSizeSystem.key] ?? [];
    return [...selectedSizeSystem.options, ...customOptions];
  }, [customSizesByType, selectedSizeSystem]);

  const bookingFilters = useMemo(
    () => colorOptions.filter((option) => selectedColors.includes(option.name)),
    [colorOptions, selectedColors]
  );

  useEffect(() => {
    if (!user?.id) return;
    const nextOptions = {} as Record<GarmentOptionField, string[]>;
    GARMENT_OPTION_FIELDS.forEach((field) => {
      nextOptions[field] = getStoredGarmentOptions(field, user.id);
    });
    setOptionsMap(nextOptions);
    setColorOptions(getStoredGarmentColors(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (!editProduct) return;

    const attributes = typeof editProduct.attributes === "string"
      ? JSON.parse(editProduct.attributes)
      : editProduct.attributes ?? {};

    setForm({
      productName: editProduct.name ?? "",
      designNumber: attributes.design_number ?? "",
      brand: attributes.brand ?? editProduct.brand ?? "",
      bookingType: attributes.booking_type ?? "",
      launchDate: attributes.launch_date ?? "",
      masterCategory: attributes.master_category ?? "",
      category: attributes.category ?? "",
      subCategory: attributes.sub_category ?? "",
      fabricType: attributes.fabric_type ?? "",
      styleDesign: attributes.style_design ?? attributes.design ?? "",
      hsnCode: attributes.hsn_code ?? attributes.custom_hsn_code ?? "",
      productDescription: editProduct.description ?? attributes.product_description ?? "",
      productTags: Array.isArray(attributes.product_tags) ? attributes.product_tags : [],
      trendingProduct: String(attributes.trending_product ?? "").toLowerCase() === "yes" || attributes.trending_product === true,
      newArrival: String(attributes.new_arrival ?? "").toLowerCase() === "yes" || attributes.new_arrival === true,
      rackNumber: attributes.rack_number ?? "",
      barcodeSku: attributes.barcode_sku ?? attributes.sku ?? "",
      fitType: attributes.fit_type ?? "",
    });

    setSelectedColors(Array.isArray(attributes.available_colors) ? attributes.available_colors : []);
    const editSizes: string[] =
      Array.isArray(editProduct.variants) && editProduct.variants.length > 0
        ? Array.from(
            new Set(
              editProduct.variants
                .map((variant: any) => variant.size)
                .filter((size: unknown): size is string => typeof size === "string" && size.trim() !== "")
            )
          )
        : [];
    setSelectedSizes(editSizes);
    if (editSizes.length > 0) {
      const matchedSystem = enabledSizeSystems.find((system) =>
        editSizes.some((size) => system.options.includes(size))
      );
      if (matchedSystem) {
        setSelectedSizeType(matchedSystem.key);
      }
    }
    setVariants(
      Array.isArray(editProduct.variants) && editProduct.variants.length > 0
        ? editProduct.variants.map((variant: any) => ({
            id: crypto.randomUUID(),
            size: variant.size ?? "",
            qty: String(variant.qty ?? "1"),
            mrp: String(variant.mrp ?? ""),
            rate: String(variant.rate ?? ""),
            rack: String(variant.rack ?? ""),
          }))
        : [newVariant("")]
    );

    if (editProduct.image) {
      setMainPreview(getImageUrl(editProduct.image));
    }

    const existingGallery = Array.isArray(attributes.gallery_images) ? attributes.gallery_images : [];
    setGalleryImages(
      existingGallery.map((url: string) => ({
        id: crypto.randomUUID(),
        url: getImageUrl(url),
        rawPath: url,
        existing: true,
      }))
    );
  }, [editProduct, enabledSizeSystems]);

  useEffect(() => {
    if (selectedSizes.length === 0) {
      setVariants((current) => (current.length > 0 ? current : [newVariant("")]));
      return;
    }

    setVariants((current) => {
      const defaults = current[0];
      const next = selectedSizes.map((size) => {
        const existing = current.find((variant) => variant.size === size);
        return existing ?? newVariant(size, defaults);
      });
      return next;
    });
  }, [selectedSizes]);

  useEffect(() => {
    if (enabledSizeSystems.length === 0) {
      setSelectedSizeType("");
      return;
    }

    setSelectedSizeType((current) => {
      if (current && enabledSizeSystems.some((system) => system.key === current)) {
        return current;
      }
      return enabledSizeSystems[0].key;
    });
  }, [enabledSizeSystems]);

  useEffect(() => {
    if (sizeOptions.length === 0) {
      setSelectedSizes([]);
      return;
    }

    setSelectedSizes((current) => current.filter((size) => sizeOptions.includes(size)));
  }, [sizeOptions]);

  const setField = <K extends keyof GarmentFormValues>(key: K, value: GarmentFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateOptionField = (field: GarmentOptionField, values: string[]) => {
    setOptionsMap((current) => ({ ...current, [field]: values }));
    if (user?.id) {
      saveStoredGarmentOptions(field, values, user.id);
    }
  };

  const addColorOption = (name: string) => {
    const normalized = titleCase(name.trim());
    if (!normalized) return;
    const exists = colorOptions.some((option) => option.name.toLowerCase() === normalized.toLowerCase());
    if (exists) return;
    const next = [...colorOptions, { name: normalized, hex: defaultHex(normalized) }];
    setColorOptions(next);
    if (user?.id) {
      saveStoredGarmentColors(next, user.id);
    }
  };

  const addCustomSize = () => {
    const normalized = customSize.trim().toUpperCase();
    if (!normalized || !selectedSizeSystem) return;
    setCustomSizesByType((current) => {
      const existing = current[selectedSizeSystem.key] ?? [];
      if (existing.includes(normalized)) {
        return current;
      }

      return {
        ...current,
        [selectedSizeSystem.key]: [...existing, normalized],
      };
    });
    if (!selectedSizes.includes(normalized)) {
      setSelectedSizes((current) => [...current, normalized]);
    }
    setCustomSize("");
  };

  const updateVariant = (id: string, field: keyof GarmentVariantDraft, value: string) => {
    setVariants((current) => current.map((variant) => (variant.id === id ? { ...variant, [field]: value } : variant)));
  };

  const addGalleryFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const nextFiles = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      file,
      existing: false,
    }));
    setGalleryImages((current) => [...current, ...nextFiles]);
  };

  const removeGalleryImage = (id: string) => {
    setGalleryImages((current) => current.filter((image) => image.id !== id));
  };

  const moveGalleryImage = (id: string, direction: "left" | "right") => {
    setGalleryImages((current) => {
      const index = current.findIndex((image) => image.id === id);
      if (index < 0) return current;
      const target = direction === "left" ? index - 1 : index + 1;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const syncColorOptions = (values: string[]) => {
    setSelectedColors(values);
    const next = [...colorOptions];
    values.forEach((value) => {
      if (!next.some((option) => option.name.toLowerCase() === value.toLowerCase())) {
        next.push({ name: titleCase(value), hex: defaultHex(value) });
      }
    });
    setColorOptions(next);
    if (user?.id) {
      saveStoredGarmentColors(next, user.id);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.productName.trim()) {
      toast.error("Product Name is required");
      return;
    }
    if (!form.designNumber.trim()) {
      toast.error("Design Number is required");
      return;
    }
    if (variants.length === 0 || variants.some((variant) => !variant.mrp || !variant.qty)) {
      toast.error("Complete the garments variants table");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      const attributes = {
        brand: form.brand,
        design_number: form.designNumber,
        booking_type: form.bookingType,
        launch_date: form.launchDate,
        master_category: form.masterCategory,
        category: form.category,
        sub_category: form.subCategory,
        fabric_type: form.fabricType,
        style_design: form.styleDesign,
        hsn_code: form.hsnCode,
        product_description: form.productDescription,
        product_tags: form.productTags,
        trending_product: form.trendingProduct ? "Yes" : "No",
        new_arrival: form.newArrival ? "Yes" : "No",
        rack_number: form.rackNumber,
        barcode_sku: form.barcodeSku,
        fit_type: form.fitType,
        available_colors: selectedColors,
      };

      formData.append("name", form.productName);
      formData.append("description", form.productDescription);
      formData.append("dealerid", String(user?.id ?? ""));
      formData.append("business_type_id", String(user?.business_type_id ?? ""));
      formData.append("color", selectedColors.join(", "));
      formData.append("brand", form.brand);
      formData.append("attributes", JSON.stringify(attributes));
      formData.append(
        "variants",
        JSON.stringify(
          variants.map((variant) => ({
            size: variant.size,
            qty: Number(variant.qty),
            mrp: Number(variant.mrp),
            rate: Number(variant.rate),
            rack: variant.rack || form.rackNumber,
            color: selectedColors.join(", "),
          }))
        )
      );

      if (mainImage) {
        formData.append("image", mainImage);
      }

      const existingGallery = galleryImages.filter((image) => image.existing).map((image) => image.rawPath || image.url);
      formData.append("gallery_keep", JSON.stringify(existingGallery));
      galleryImages
        .filter((image) => image.file)
        .forEach((image) => {
          if (image.file) {
            formData.append("gallery", image.file);
          }
        });

      const url = isEditing ? `${apiUrl}/products/update/${editProduct.id}` : `${apiUrl}/products`;
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || (!result.success && !result.id)) {
        throw new Error(result.message || "Failed to save product");
      }

      toast.success(isEditing ? "Garments product updated" : "Garments product created");
      navigate("/dealer/products");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save garments product");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isAuthenticated) {
    return <div className="flex h-screen items-center justify-center text-sm font-medium text-slate-500">Loading...</div>;
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.25),_transparent_30%),linear-gradient(180deg,_#fffdf7_0%,_#fff_30%,_#f8fafc_100%)] px-4 py-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                <Sparkles size={12} />
                Garments ERP
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                {isEditing ? "Edit Garments Product" : "Create Garments Booking Product"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Product entry with size chips, colorways, gallery slots, and wholesale-ready variants.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white">
                  <div className="flex items-center gap-3">
                    <Package2 size={18} />
                    <div>
                      <h2 className="text-lg font-semibold">Product Information</h2>
                      <p className="text-xs text-slate-300">Core garment identity, catalog placement, and booking metadata.</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Product Name</Label>
                    <Input value={form.productName} onChange={(event) => setField("productName", titleCase(event.target.value))} placeholder="Premium Cotton Co-Ord Set" />
                  </div>
                  <div className="space-y-2">
                    <Label>Design Number</Label>
                    <Input value={form.designNumber} onChange={(event) => setField("designNumber", event.target.value.toUpperCase())} placeholder="AN-2407" />
                  </div>
                  <div className="space-y-2">
                    <Label>Launch Date</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input type="date" className="pl-9" value={form.launchDate} onChange={(event) => setField("launchDate", event.target.value)} />
                    </div>
                  </div>

                  {(
                    [
                      ["bookingType", "Booking Type"],
                      ["brand", "Brand"],
                      ["masterCategory", "Master Category"],
                      ["category", "Category"],
                      ["subCategory", "Sub Category"],
                      ["fabricType", "Style / Fabric"],
                      ["styleDesign", "Style / Design"],
                      ["hsnCode", "HSN Code"],
                      ["rackNumber", "Rack"],
                      ["fitType", "Fit Type"],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="space-y-2">
                      <Label>{label}</Label>
                      <GarmentSingleSelect
                        fieldKey={field}
                        fieldLabel={label}
                        value={form[field]}
                        options={optionsMap[field]}
                        onChange={(value) => setField(field, value as any)}
                        onOptionsChange={(values) => updateOptionField(field, values)}
                        userManaged
                      />
                    </div>
                  ))}

                  <div className="space-y-2 xl:col-span-3">
                    <Label>Product Description</Label>
                    <Textarea
                      value={form.productDescription}
                      onChange={(event) => setField("productDescription", event.target.value)}
                      rows={4}
                      placeholder="Fabric feel, work details, lining, dispatch notes, set contents..."
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <Label>Product Tags</Label>
                    <GarmentTagSelector
                      placeholder="Add tags like festive, bestseller, wedding edit"
                      searchPlaceholder="Search tags"
                      options={form.productTags}
                      selected={form.productTags}
                      onChange={(values) => setField("productTags", values)}
                      onCreateOption={() => undefined}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-sm font-medium text-slate-700">Trending Product</span>
                      <input type="checkbox" checked={form.trendingProduct} onChange={(event) => setField("trendingProduct", event.target.checked)} />
                    </label>
                    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-sm font-medium text-slate-700">New Arrival</span>
                      <input type="checkbox" checked={form.newArrival} onChange={(event) => setField("newArrival", event.target.checked)} />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label>Barcode / SKU</Label>
                    <Input value={form.barcodeSku} onChange={(event) => setField("barcodeSku", event.target.value.toUpperCase())} placeholder="SKU-9834" />
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <Shirt size={18} className="text-amber-600" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Sizes And Colors</h2>
                      <p className="text-xs text-slate-500">Select enabled size systems, then auto-generate your wholesale booking rows.</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 px-6 py-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Available Sizes</Label>
                      <span className="text-xs text-slate-400">Enabled from Profile → Size Settings</span>
                    </div>
                    <GarmentSingleSelect
                      id="garment-size-type"
                      fieldKey="sizeType"
                      fieldLabel="Size Type"
                      value={selectedSizeSystem?.label ?? ""}
                      options={sizeTypeOptions}
                      onChange={(value) => {
                        const nextSystem = enabledSizeSystems.find((system) => system.label === value);
                        setSelectedSizeType(nextSystem?.key ?? "");
                      }}
                      onOptionsChange={() => undefined}
                      userManaged
                    />
                    <GarmentTagSelector
                      id="garment-size-selector"
                      placeholder="Select sizes"
                      searchPlaceholder="Search sizes"
                      options={sizeOptions}
                      selected={selectedSizes}
                      onChange={setSelectedSizes}
                      onCreateOption={() => undefined}
                      selectAllLabel="Select All Sizes"
                    />
                    <div className="flex gap-2">
                      <Input value={customSize} onChange={(event) => setCustomSize(event.target.value)} placeholder="Add custom size" />
                      <Button type="button" variant="outline" onClick={addCustomSize}>Add Size</Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Available Colors / Styles</Label>
                    <GarmentTagSelector
                      id="garment-color-selector"
                      placeholder="Select colors"
                      searchPlaceholder="Search colors"
                      options={colorOptions.map((option) => option.name)}
                      selected={selectedColors}
                      onChange={syncColorOptions}
                      onCreateOption={addColorOption}
                    />
                    <div className="flex flex-wrap gap-2">
                      {bookingFilters.map((color) => (
                        <div key={color.name} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                          <span className="h-3 w-3 rounded-full border border-slate-200" style={{ backgroundColor: color.hex }} />
                          {color.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Variant Generator</h2>
                    <p className="text-xs text-slate-500">Size chips drive the rows below. Remove a chip and its row disappears automatically.</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {variants.length} rows
                  </div>
                </div>

                <div className="overflow-x-auto px-6 py-6">
                  <div className="min-w-[720px] rounded-3xl border border-slate-200">
                    <div className="grid grid-cols-[1fr_90px_120px_120px_120px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <span>Size</span>
                      <span>Qty</span>
                      <span>MRP</span>
                      <span>Rate</span>
                      <span>Rack</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {variants.map((variant) => (
                        <div key={variant.id} className="grid grid-cols-[1fr_90px_120px_120px_120px] gap-3 px-4 py-3">
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                            {variant.size || "Free Entry"}
                          </div>
                          <Input type="number" min="1" value={variant.qty} onChange={(event) => updateVariant(variant.id, "qty", event.target.value)} />
                          <Input type="number" min="0" value={variant.mrp} onChange={(event) => updateVariant(variant.id, "mrp", event.target.value)} />
                          <Input type="number" min="0" value={variant.rate} onChange={(event) => updateVariant(variant.id, "rate", event.target.value)} />
                          <Input value={variant.rack} onChange={(event) => updateVariant(variant.id, "rack", event.target.value)} placeholder={form.rackNumber || "A1"} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-lg font-semibold text-slate-900">Images And Gallery</h2>
                  <p className="text-xs text-slate-500">Separate hero image and gallery slots for booking catalogs.</p>
                </div>
                <div className="space-y-5 px-6 py-6">
                  <button
                    type="button"
                    onClick={() => mainImageRef.current?.click()}
                    className="flex w-full items-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-amber-300 hover:bg-amber-50"
                  >
                    {mainPreview ? (
                      <img src={mainPreview} alt="Main preview" className="h-20 w-20 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                        <ImagePlus size={24} />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Main product image</div>
                      <div className="mt-1 text-xs text-slate-500">This appears as the lead catalog image and order card cover.</div>
                    </div>
                  </button>
                  <input
                    ref={mainImageRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setMainImage(file);
                      setMainPreview(file ? URL.createObjectURL(file) : null);
                    }}
                  />

                  <GarmentGalleryUploader
                    images={galleryImages}
                    onAdd={addGalleryFiles}
                    onRemove={removeGalleryImage}
                    onMove={moveGalleryImage}
                  />
                </div>
              </section>

              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <Warehouse size={18} className="text-emerald-600" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Quick Summary</h2>
                      <p className="text-xs text-slate-500">A live snapshot of the booking setup you’re saving.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 px-6 py-6 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Design</span>
                    <span className="font-semibold text-slate-900">{form.designNumber || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Colors</span>
                    <span className="font-semibold text-slate-900">{selectedColors.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Sizes</span>
                    <span className="font-semibold text-slate-900">{selectedSizes.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total Pieces</span>
                    <span className="font-semibold text-slate-900">
                      {variants.reduce((sum, variant) => sum + Number(variant.qty || 0), 0)}
                    </span>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="flex-1 bg-slate-900 text-white hover:bg-slate-800">
                      {submitting ? "Saving..." : isEditing ? "Save Product" : "Create Product"}
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
