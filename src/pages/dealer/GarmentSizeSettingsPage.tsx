import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayoutProps";
import { useAuth } from "@/context/AuthContext";
import { isGarmentsBusiness } from "@/lib/businessType";
import { GarmentSizeSettingsPanel } from "@/features/garments/GarmentSizeSettingsPanel";

const GarmentSizeSettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="px-4 py-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Garments Size Settings</h1>
              <p className="text-sm text-slate-500">Choose which garment size systems should appear in the product form.</p>
            </div>
          </div>

          {isGarmentsBusiness(user?.business_type_id) ? (
            <GarmentSizeSettingsPanel userId={user?.id} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              This settings page is available only for garments business profiles.
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default GarmentSizeSettingsPage;
