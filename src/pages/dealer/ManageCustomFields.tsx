import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/url";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Pencil, X, GripVertical, Type, List,
  Hash, ArrowLeft, Settings2, ToggleLeft,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomField {
  id: number;
  dealer_id: number;
  field_label: string;
  field_key: string;
  field_type: "text" | "select" | "number";
  is_required: number;
  sort_order: number;
  options: string[];
}

const EMPTY_FIELD: Omit<CustomField, "id" | "dealer_id" | "field_key" | "sort_order"> = {
  field_label: "",
  field_type:  "text",
  is_required: 0,
  options:     [],
};

const typeIcon = (t: string) => {
  if (t === "select") return <List size={14} className="text-blue-500" />;
  if (t === "number") return <Hash size={14} className="text-green-500" />;
  return <Type size={14} className="text-gray-500" />;
};

const typeLabel = (t: string) => {
  if (t === "select") return "Dropdown";
  if (t === "number") return "Number";
  return "Text";
};

// ── Component ─────────────────────────────────────────────────────────────────

const ManageCustomFields = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [fields, setFields]       = useState<CustomField[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);
  const [editing, setEditing]     = useState<CustomField | null>(null);

  // Form state
  const [label, setLabel]         = useState("");
  const [type, setType]           = useState<"text" | "select" | "number">("text");
  const [required, setRequired]   = useState(false);
  const [options, setOptions]     = useState<string[]>([""]);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { navigate("/"); return; }
    if (user?.role !== "dealer") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  // ── Fetch custom fields ─────────────────────────────────────────────────────
  const fetchFields = async () => {
    if (!user?.id) return;
    setFetching(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${apiUrl}/custom-fields?dealer_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFields(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch custom fields:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && isAuthenticated && user?.role === "dealer") fetchFields();
  }, [loading, isAuthenticated, user]);

  // ── Open dialog for creating ────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setLabel("");
    setType("text");
    setRequired(false);
    setOptions([""]);
    setDialogOpen(true);
  };

  // ── Open dialog for editing ─────────────────────────────────────────────────
  const openEdit = (field: CustomField) => {
    setEditing(field);
    setLabel(field.field_label);
    setType(field.field_type);
    setRequired(!!field.is_required);
    setOptions(field.options.length > 0 ? [...field.options, ""] : [""]);
    setDialogOpen(true);
  };

  // ── Option list helpers ─────────────────────────────────────────────────────
  const setOption = (i: number, val: string) =>
    setOptions((prev) => {
      const next = [...prev];
      next[i] = val;
      // Auto-add empty row when typing in last row
      if (i === next.length - 1 && val.trim() !== "") next.push("");
      return next;
    });

  const removeOption = (i: number) =>
    setOptions((prev) => prev.filter((_, idx) => idx !== i));

  const cleanOptions = () => options.filter((o) => o.trim() !== "");

  // ── Save (create or update) ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!label.trim()) { toast.error("Field label is required"); return; }
    if (type === "select" && cleanOptions().length === 0) {
      toast.error("Add at least one option for dropdown fields");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      if (editing) {
        // Update
        const res = await fetch(`${apiUrl}/custom-fields/${editing.id}`, {
          method:  "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body:    JSON.stringify({
            field_label: label.trim(),
            is_required: required ? 1 : 0,
            options:     type === "select" ? cleanOptions() : [],
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("Field updated");
      } else {
        // Create
        const res = await fetch(`${apiUrl}/custom-fields`, {
          method:  "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body:    JSON.stringify({
            dealer_id:   user?.id,
            field_label: label.trim(),
            field_type:  type,
            is_required: required ? 1 : 0,
            options:     type === "select" ? cleanOptions() : [],
          }),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success("Field created successfully");
      }

      setDialogOpen(false);
      fetchFields();
    } catch (err) {
      toast.error("Failed to save field");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${apiUrl}/custom-fields/${deleteId}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Field deleted");
      setDeleteId(null);
      fetchFields();
    } catch {
      toast.error("Failed to delete field");
    }
  };

  // ── Render guard ────────────────────────────────────────────────────────────
  if (loading || !isAuthenticated || user?.role !== "dealer") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 font-semibold">
        Loading...
      </div>
    );
  }

  // ── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-64 fixed top-0 left-0 h-full z-10"><Sidebar /></div>

      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />

        <div className="flex-1 overflow-y-auto pt-16">
          <div className="container mx-auto px-6 py-6 max-w-4xl">

            {/* ── Header ── */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 shadow-sm"
              >
                <ArrowLeft size={16} className="text-gray-600" />
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">Custom Product Fields</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Create your own fields (text, number, dropdown) to use in the product form
                </p>
              </div>
              <Button
                onClick={openCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Plus size={15} /> New Field
              </Button>
            </div>

            {/* ── Info Banner ── */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
              <Settings2 size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                Custom fields appear in your product form alongside standard fields.
                Dropdown fields let you define selectable options (like HSN codes, fabric types, etc.)
                that your team can pick from — or add new ones on the fly while filling the form.
              </div>
            </div>

            {/* ── Fields List ── */}
            {fetching ? (
              <div className="text-center py-16 text-gray-400">
                <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-30 animate-pulse" />
                <p className="text-sm">Loading fields…</p>
              </div>
            ) : fields.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Settings2 size={24} className="text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">No custom fields yet</h3>
                <p className="text-sm text-gray-400 mb-5">
                  Create your first field — like HSN Code, Fabric Type, or any attribute specific to your business
                </p>
                <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <Plus size={14} /> Create First Field
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4"
                  >
                    {/* Drag handle (visual only) */}
                    <div className="mt-1 text-gray-300">
                      <GripVertical size={16} />
                    </div>

                    {/* Field info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {typeIcon(field.field_type)}
                        <span className="font-semibold text-gray-900 text-sm">{field.field_label}</span>
                        {!!field.is_required && (
                          <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] px-1.5 py-0 h-4">
                            Required
                          </Badge>
                        )}
                        <Badge className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0 h-4 font-mono">
                          {field.field_key}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          {typeIcon(field.field_type)} {typeLabel(field.field_type)}
                        </span>

                        {field.field_type === "select" && field.options.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {field.options.slice(0, 6).map((opt) => (
                              <span
                                key={opt}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100"
                              >
                                {opt}
                              </span>
                            ))}
                            {field.options.length > 6 && (
                              <span className="text-[10px] text-gray-400">
                                +{field.options.length - 6} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(field)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(field.id)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <Settings2 className="h-4 w-4 text-blue-600" />
              </div>
              {editing ? "Edit Field" : "Create Custom Field"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">

            {/* Field Label */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Field Label <span className="text-red-500">*</span>
              </Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. HSN Code, Fabric Type, Season"
              />
              {label.trim() && (
                <p className="text-[11px] text-gray-400">
                  Key: <span className="font-mono">custom_{label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}</span>
                </p>
              )}
            </div>

            {/* Field Type — only editable when creating */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Field Type</Label>
              {editing ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-600">
                  {typeIcon(editing.field_type)}
                  <span>{typeLabel(editing.field_type)}</span>
                  <span className="text-xs text-gray-400 ml-1">(cannot change after creation)</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(["text", "select", "number"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setType(t); if (t !== "select") setOptions([""]); }}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-xs font-medium transition-colors ${
                        type === t
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                      }`}
                    >
                      {typeIcon(t)}
                      <span>{typeLabel(t)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Required toggle */}
            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Required field</p>
                <p className="text-xs text-gray-400">Product form will not submit without this field</p>
              </div>
              <button
                type="button"
                onClick={() => setRequired((r) => !r)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  required ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  required ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </button>
            </div>

            {/* Dropdown options — only for select type */}
            {(type === "select" || editing?.field_type === "select") && (
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">
                    Dropdown Options <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-xs text-gray-400">
                    {cleanOptions().length} option{cleanOptions().length !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Type an option and press Enter or Tab to add more. Dealers can also add new options while filling the product form.
                </p>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-300 w-5 text-right flex-shrink-0">{i + 1}.</span>
                      <Input
                        value={opt}
                        onChange={(e) => setOption(i, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (opt.trim() && i === options.length - 1) {
                              setOptions((p) => [...p, ""]);
                            }
                          }
                          if (e.key === "Backspace" && opt === "" && options.length > 1) {
                            e.preventDefault();
                            removeOption(i);
                          }
                        }}
                        placeholder={i === 0 ? "e.g. 6101, 6102, 6103…" : "Another option…"}
                        className="h-8 text-sm flex-1"
                      />
                      {options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="h-8 w-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOptions((p) => [...p, ""])}
                  className="w-full gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 mt-1"
                >
                  <Plus size={12} /> Add Option
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? "Saving…" : editing ? "Update Field" : "Create Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
              Delete Field
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-gray-700">
              Are you sure? This field will be removed from your product form.
              Existing product data saved under this field will not be deleted.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Delete Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageCustomFields;
