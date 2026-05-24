import { useState, useEffect } from "react";
import { apiUrl } from "@/url";

export interface AttributeField {
  id: number;
  field_key: string;
  field_label: string;
  field_type: "text" | "select" | "number" | "multiselect";
  field_options: string | null;
  is_required: number;
  sort_order: number;
}

interface UseBusinessSchemaResult {
  schema: AttributeField[];
  hasSize: boolean;
  sizeOptions: string[];
  loading: boolean;
}

export function useBusinessSchema(businessTypeId: number | null | undefined): UseBusinessSchemaResult {
  const [schema, setSchema] = useState<AttributeField[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessTypeId) { setSchema([]); return; }
    setLoading(true);
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${apiUrl}/dealers/business-types/schema/${businessTypeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setSchema(Array.isArray(data) ? data : []);
      } catch {
        setSchema([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [businessTypeId]);

  const sizeField = schema.find((f) => f.field_key === "size");
  const sizeOptions: string[] = sizeField?.field_options
    ? JSON.parse(sizeField.field_options)
    : [];
  const hasSize = sizeOptions.length > 0;

  return { schema, hasSize, sizeOptions, loading };
}