import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/url";
import { toast } from "sonner";
import { DynamicSelect } from "@/components/DynamicSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getImageUrl } from "@/lib/imageUrl";
import {
  ArrowLeft, Plus, Trash2, ImagePlus, Tag,
  BarChart2, AlignLeft, Layers, Package, X, ChevronDown,
} from "lucide-react";
import React from "react";
import MainLayout from "@/components/MainLayoutProps";
import { isGarmentsBusiness } from "@/lib/businessType";
import GarmentAddProduct from "@/features/garments/GarmentAddProduct";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AttributeField {
  id: number;
  field_key: string;
  field_label: string;
  field_type: "text" | "select" | "number" | "multiselect";
  field_options: string | null;
  is_required: number;
  sort_order: number;
}

interface VariantRow {
  id:   string;
  size: string;
  qty:  string;
  mrp:  string;
  rate: string;
  rack: string;
}

const newVariant = (): VariantRow => ({
  id: crypto.randomUUID(),
  size: "", qty: "", mrp: "", rate: "", rack: "",
});

// ── Multi-size selector ───────────────────────────────────────────────────────

const MultiSizeSelect = ({
  options, selected, onChange,
}: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[38px] flex items-center flex-wrap gap-1.5 px-3 py-2 rounded-md border border-gray-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {selected.length === 0
          ? <span className="text-gray-400">Select sizes…</span>
          : selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {s}
              <X size={10} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggle(s); }} />
            </span>
          ))}
        <ChevronDown size={14} className="ml-auto text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selected.includes(opt)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const LegacyAddProduct = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const imageRef  = useRef<HTMLInputElement>(null);

  // Edit mode
  const editProduct = (location.state as any)?.editProduct ?? null;
  const isEditing   = !!editProduct;

  // ── State ──────────────────────────────────────────────────────────────────
  const [schema, setSchema]               = useState<AttributeField[]>([]);
  const [customFields, setCustomFields]   = useState<AttributeField[]>([]);
  const [liveOptions, setLiveOptions]     = useState<Record<number, string[]>>({});
  const [submitting, setSubmitting]       = useState(false);

  const [name, setName]                   = useState("");
  const [color, setColor]                 = useState("");
  const [description, setDescription]     = useState("");
  const [image, setImage]                 = useState<File | null>(null);
  const [preview, setPreview]             = useState<string | null>(null);
  const [attrValues, setAttrValues]       = useState<Record<string, string>>({});
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [variants, setVariants]           = useState<VariantRow[]>([newVariant()]);

  // Guard: while FALSE the size-sync effect must NOT overwrite variants
  const prefillDoneRef = useRef(!isEditing);

  // Auth guard
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { navigate("/"); return; }
    if (user?.role !== "dealer") navigate("/retailer/dashboard");
  }, [loading, isAuthenticated, user, navigate]);

  // ── STEP 1: Pre-fill edit values ──────────────────────────────────────────
  useEffect(() => {
    if (!editProduct) return;

    prefillDoneRef.current = false;

    setName(editProduct.name || "");
    setDescription(editProduct.description || "");

    const existingAttrs: Record<string, string> = {};
    if (editProduct.attributes && typeof editProduct.attributes === "object") {
      Object.entries(editProduct.attributes).forEach(([k, v]) => {
        existingAttrs[k] = String(v ?? "");
      });
    }
    if (editProduct.brand && !existingAttrs.brand) existingAttrs.brand = editProduct.brand;
    if (editProduct.model && !existingAttrs.model) existingAttrs.model = editProduct.model;
    setAttrValues(existingAttrs);

    setColor(editProduct.color || existingAttrs.color || "");

    if (editProduct.image) {
      setPreview(getImageUrl(editProduct.image));
    }

    if (editProduct.variants && editProduct.variants.length > 0) {
      const rows: VariantRow[] = editProduct.variants.map((v: any) => ({
        id:   crypto.randomUUID(),
        size: v.size  || "",
        qty:  String(v.qty   ?? ""),
        mrp:  String(v.mrp   ?? ""),
        rate: String(v.rate  ?? ""),
        rack: v.rack  || "",
      }));
      setVariants(rows);

      const sizes = (editProduct.variants as any[])
        .map((v) => v.size as string)
        .filter(Boolean);
      setSelectedSizes([...new Set<string>(sizes)]);
    } else {
      setVariants([{
        id:   crypto.randomUUID(),
        size: existingAttrs.size  || "",
        qty:  String(editProduct.stock ?? ""),
        mrp:  existingAttrs.mrp   || String(editProduct.price ?? ""),
        rate: String(editProduct.price  ?? ""),
        rack: existingAttrs.rack  || "",
      }]);
      if (existingAttrs.size) setSelectedSizes([existingAttrs.size]);
    }

    prefillDoneRef.current = true;
  }, [editProduct?.id]);

  // ── STEP 2: Fetch schema ─────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !isAuthenticated || !user?.business_type_id) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res   = await fetch(
          `${apiUrl}/dealers/business-types/schema/${user.business_type_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data: AttributeField[] = await res.json();
        const s = Array.isArray(data) ? data : [];
        setSchema(s);

        const opts: Record<number, string[]> = {};
        s.forEach((f) => {
          if (f.field_type === "select" && f.field_options) {
            try { opts[f.id] = JSON.parse(f.field_options); } catch { opts[f.id] = []; }
          }
        });
        setLiveOptions(opts);

        setAttrValues((prev) => {
          const next = { ...prev };
          s.forEach((f) => { if (!(f.field_key in next)) next[f.field_key] = ""; });
          return next;
        });
      } catch (err) { console.error("Schema fetch failed:", err); }
    })();
  }, [loading, isAuthenticated, user]);

  // ── STEP 3: Fetch custom fields ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res   = await fetch(`${apiUrl}/custom-fields?dealer_id=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!Array.isArray(data)) return;

        const mapped: AttributeField[] = data.map((f: any) => ({
          id:            f.id,
          field_key:     f.field_key,
          field_label:   f.field_label,
          field_type:    f.field_type,
          field_options: f.options?.length ? JSON.stringify(f.options) : null,
          is_required:   f.is_required,
          sort_order:    f.sort_order,
        }));
        setCustomFields(mapped);

        setAttrValues((prev) => {
          const next = { ...prev };
          mapped.forEach((f) => { if (!(f.field_key in next)) next[f.field_key] = ""; });
          return next;
        });
        setLiveOptions((prev) => {
          const next = { ...prev };
          mapped.forEach((f) => {
            if (f.field_type === "select" && f.field_options && !(f.id in next)) {
              try { next[f.id] = JSON.parse(f.field_options); } catch { next[f.id] = []; }
            }
          });
          return next;
        });
      } catch (err) { console.error("Custom fields fetch failed:", err); }
    })();
  }, [user?.id]);

  // ── Sync selectedSizes → variant rows ────────────────────────────────────
  useEffect(() => {
    if (!prefillDoneRef.current) return;

    if (selectedSizes.length === 0) {
      if (!isEditing) setVariants([newVariant()]);
      return;
    }

    setVariants((prev) => {
      const kept     = prev.filter((v) => !v.size || selectedSizes.includes(v.size));
      const existing = new Set(prev.map((v) => v.size).filter(Boolean));
      const newRows  = selectedSizes
        .filter((size) => !existing.has(size))
        .map((size) => ({ ...newVariant(), size }));
      const merged = [...kept, ...newRows];
      return merged.length ? merged : [newVariant()];
    });
  }, [selectedSizes, isEditing]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const sizeField   = schema.find((f) => f.field_key === "size");
  const sizeOptions = sizeField?.field_options
    ? JSON.parse(sizeField.field_options) as string[]
    : [];

  const topFields = schema.filter(
    (f) => f.field_key !== "size" && f.field_key !== "mrp" && f.field_key !== "color"
  );
  const mrpField    = schema.find((f) => f.field_key === "mrp");
  const mrpRequired = !!mrpField?.is_required;

  const filteredCustomFields = customFields.filter((f) => f.field_key !== "color");
  const allFields = [...topFields, ...filteredCustomFields];
  const hasSize   = sizeOptions.length > 0;

  const setAttr = (key: string, val: string) =>
    setAttrValues((p) => ({ ...p, [key]: val }));

  const setVariantField = (id: string, field: keyof VariantRow, val: string) =>
    setVariants((p) => p.map((v) => v.id === id ? { ...v, [field]: val } : v));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) { toast.error("Product name is required"); return; }

    for (const f of schema) {
      if (f.is_required && !["size", "mrp", "color"].includes(f.field_key)) {
        if (!attrValues[f.field_key]) { toast.error(`${f.field_label} is required`); return; }
      }
    }
    for (const f of filteredCustomFields) {
      if (f.is_required && !attrValues[f.field_key]) {
        toast.error(`${f.field_label} is required`); return;
      }
    }
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const label = variants.length > 1 ? `Row ${i + 1}` : "Product";
      if (mrpRequired && !v.mrp.trim()) { toast.error(`${label}: MRP is required`); return; }
      if (!v.qty.trim() || Number(v.qty) <= 0) { toast.error(`${label}: Quantity must be > 0`); return; }
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");

      const variantsPayload = variants.map((v) => ({
        size: v.size,
        qty:  Number(v.qty),
        mrp:  Number(v.mrp),
        rate: Number(v.rate || v.mrp),
        rack: v.rack,
      }));

      const attrs: Record<string, string> = {};
      Object.entries(attrValues).forEach(([k, v]) => {
        if (!["size", "color", "mrp", "rack"].includes(k)) attrs[k] = v;
      });

      const fd = new FormData();
      fd.append("name",             name);
      fd.append("color",            color);
      fd.append("description",      description);
      fd.append("dealerid",         String(user?.id));
      fd.append("business_type_id", String(user?.business_type_id ?? ""));
      fd.append("attributes",       JSON.stringify(attrs));
      fd.append("variants",         JSON.stringify(variantsPayload));
      if (attrs.brand) fd.append("brand", attrs.brand);
      if (attrs.model) fd.append("model", attrs.model);
      if (image)       fd.append("image", image);

      const url = isEditing && editProduct
        ? `${apiUrl}/products/update/${editProduct.id}`
        : `${apiUrl}/products`;

      const res    = await fetch(url, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });
      const result = await res.json();

      if (!res.ok || (!result.success && !result.id)) {
        toast.error(result.message || "Failed to save product");
      } else {
        toast.success(isEditing ? "Product updated successfully!" : "Product added successfully!");
        navigate("/dealer/products");
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isAuthenticated || user?.role !== "dealer") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 font-semibold">
        Loading...
      </div>
    );
  }

  const capitalizeWords = (str: string): string => {
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // No sidebar: full-width layout so all form fields are easily accessible
    <MainLayout>
      <div className="px-4">

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="h-9 w-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 shadow-sm"
            >
              <ArrowLeft size={16} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? "Edit Product" : "Add New Product"}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEditing
                  ? `Editing: ${editProduct?.name}`
                  : "One product entry — all sizes stored as variants"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Product Info ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Package size={15} className="text-blue-600" /> Product Info
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                {/* Product Name — full row */}
                <div className="md:col-span-2 lg:col-span-1 space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Tag size={13} className="text-gray-400" />
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(capitalizeWords(e.target.value))}
                    placeholder="e.g. Night Suit"
                    required
                  />
                </div>

                {/* Dynamic Fields — 3 columns on large screens */}
                {allFields.map((field) => {
                  const val = attrValues[field.field_key] ?? "";
                  const supportsDynamicOptions =
                    field.field_type === "select" ||
                    ["brand", "design"].includes(field.field_key.toLowerCase());
                  const opts =
                    liveOptions[field.id] ??
                    (field.field_options ? JSON.parse(field.field_options) : []);

                  return (
                    <div key={field.field_key} className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Layers size={13} className="text-gray-400" />
                        {field.field_label}
                        {!!field.is_required && <span className="text-red-500">*</span>}
                      </Label>

                      {supportsDynamicOptions ? (
                        <DynamicSelect
                          schemaId={field.id}
                          fieldKey={field.field_key}
                          fieldLabel={field.field_label}
                          options={opts}
                          value={val}
                          required={!!field.is_required}
                          onSelect={(v) => setAttr(field.field_key, v)}
                          onOptionsUpdate={(newOpts) =>
                            setLiveOptions((p) => ({ ...p, [field.id]: newOpts }))
                          }
                        />
                      ) : (
                        <Input
                          type={field.field_type === "number" ? "number" : "text"}
                          value={val}
                          onChange={(e) =>
                            setAttr(
                              field.field_key,
                              field.field_type === "number"
                                ? e.target.value
                                : capitalizeWords(e.target.value)
                            )
                          }
                          required={!!field.is_required}
                          placeholder={`Enter ${field.field_label.toLowerCase()}`}
                          min={field.field_type === "number" ? "0" : undefined}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Simple-product variant fields (no size schema) */}
                {!hasSize &&
                  variants.map((v, i) => (
                    <React.Fragment key={v.id || i}>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Layers size={13} className="text-gray-400" /> Quantity <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={v.qty}
                          onChange={(e) => setVariantField(v.id, "qty", e.target.value)}
                          placeholder="0"
                          className={!v.qty || Number(v.qty) <= 0 ? "border-red-200" : ""}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Layers size={13} className="text-gray-400" /> Rate (₹) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={v.rate}
                          onChange={(e) => setVariantField(v.id, "rate", e.target.value)}
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Layers size={13} className="text-gray-400" /> MRP (₹) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={v.mrp}
                          onChange={(e) => setVariantField(v.id, "mrp", e.target.value)}
                          placeholder="0"
                          className={mrpRequired && !v.mrp ? "border-red-300" : ""}
                        />
                      </div>
                    </React.Fragment>
                  ))
                }

                {/* Color */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Layers size={13} className="text-gray-400" /> Color / Style
                  </Label>
                  <Input
                    value={color}
                    onChange={(e) => setColor(capitalizeWords(e.target.value))}
                    placeholder="e.g. Navy, Red, Multicolor"
                  />
                </div>

                {/* Description — full row */}
                <div className="md:col-span-2 lg:col-span-1 space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <AlignLeft size={13} className="text-gray-400" /> Description
                  </Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(capitalizeWords(e.target.value))}
                    placeholder="Additional product details…"
                  />
                </div>

              </div>
            </div>

            {/* ── Size selector ── */}
            {sizeOptions.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <Tag size={15} className="text-blue-600" /> Select Sizes
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                  {isEditing ? "Add or remove sizes for this product" : "Selecting sizes auto-generates variant rows below"}
                </p>
                <MultiSizeSelect options={sizeOptions} selected={selectedSizes} onChange={setSelectedSizes} />
                {selectedSizes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {selectedSizes.map((s) => (
                      <Badge key={s} className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
                        {s}
                        <X size={10} className="cursor-pointer" onClick={() => setSelectedSizes((p) => p.filter((x) => x !== s))} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Variant rows (size-based) ── */}
            {hasSize && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <BarChart2 size={15} className="text-blue-600" /> Product Variants
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {variants.length} variant{variants.length !== 1 ? "s" : ""} — all stored in one product entry
                    </p>
                  </div>
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={() => setVariants((p) => [...p, newVariant()])}
                    className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Plus size={13} /> Add Row
                  </Button>
                </div>

                {/* Header */}
                <div className="grid grid-cols-[1fr_80px_100px_100px_100px_44px] gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                  <span>Size</span>
                  <span>Qty <span className="text-red-500">*</span></span>
                  <span>Rate (₹)</span>
                  <span>MRP (₹){mrpRequired && <span className="text-red-500"> *</span>}</span>
                  <span>Rack</span>
                  <span />
                </div>

                <div className="space-y-2">
                  {variants.map((v, i) => (
                    <div
                      key={v.id}
                      className={`grid grid-cols-[1fr_80px_100px_100px_100px_44px] gap-2 items-center rounded-lg px-3 py-2 border ${
                        isEditing && i === 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-100"
                      }`}
                    >
                      <select
                        value={v.size}
                        onChange={(e) => setVariantField(v.id, "size", e.target.value)}
                        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">—</option>
                        {sizeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <Input type="number" min="0" value={v.qty} onChange={(e) => setVariantField(v.id, "qty", e.target.value)} placeholder="0" className={`h-8 text-sm ${!v.qty.trim() || Number(v.qty) <= 0 ? "border-red-200" : ""}`} />
                      <Input type="number" min="0" value={v.rate} onChange={(e) => setVariantField(v.id, "rate", e.target.value)} placeholder="0" className="h-8 text-sm" />
                      <Input type="number" min="0" value={v.mrp} onChange={(e) => setVariantField(v.id, "mrp", e.target.value)} placeholder="0" className={`h-8 text-sm ${mrpRequired && !v.mrp.trim() ? "border-red-300" : ""}`} />
                      <Input value={v.rack} onChange={(e) => setVariantField(v.id, "rack", e.target.value)} placeholder="A1" className="h-8 text-sm" />
                      <button
                        type="button"
                        onClick={() => setVariants((p) => { const u = p.filter((x) => x.id !== v.id); return u.length ? u : [newVariant()]; })}
                        disabled={variants.length === 1}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-20 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Product Image ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ImagePlus size={15} className="text-blue-600" /> Product Image
              </h2>
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-5 flex items-center gap-5 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                onClick={() => imageRef.current?.click()}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="Preview" className="h-20 w-20 object-cover rounded-lg border flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Image selected</p>
                      <p className="text-xs text-gray-400">Click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <ImagePlus size={24} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Click to upload</p>
                      <p className="text-xs text-gray-400">PNG, JPG, WEBP — shared across all variants</p>
                    </div>
                  </>
                )}
                <input
                  ref={imageRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (f) { setImage(f); setPreview(URL.createObjectURL(f)); }
                  }}
                />
              </div>
            </div>

            {/* ── Submit ── */}
            <div className="flex items-center justify-between pb-6">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="gap-2">
                <ArrowLeft size={14} /> Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8">
                {submitting ? (
                  <><span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving…</>
                ) : (
                  <><Plus size={15} /> {isEditing ? "Save Changes" : `Save Product${variants.length > 1 ? ` (${variants.length} sizes)` : ""}`}</>
                )}
              </Button>
            </div>

          </form>
          </div>
      </MainLayout>
  );
};

const AddProduct = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (!loading && isAuthenticated && isGarmentsBusiness(user?.business_type_id)) {
    return <GarmentAddProduct />;
  }

  return <LegacyAddProduct />;
};

export default AddProduct;
