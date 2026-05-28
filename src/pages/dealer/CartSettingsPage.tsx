import { useEffect, useState } from "react";
import { ArrowLeft, LayoutGrid, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import MainLayout from "@/components/MainLayoutProps";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { GarmentCartSettings, getGarmentCartSettings, saveGarmentCartSettings } from "@/features/garments/cartSettings";

const cardsPerRowOptions: Array<GarmentCartSettings["cardsPerRow"]> = [1, 2, 3, 4];

const fieldLabels: Record<keyof GarmentCartSettings["visibleDetails"], string> = {
  image: "Image",
  productName: "Product Name",
  price: "Price",
  quantity: "Quantity",
  stock: "Stock",
  setCount: "Set Count",
  buttons: "Action Buttons",
};

const CartSettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState<GarmentCartSettings>(() => getGarmentCartSettings(user?.id));

  useEffect(() => {
    setSettings(getGarmentCartSettings(user?.id));
  }, [user?.id]);

  const saveSettings = () => {
    saveGarmentCartSettings(settings, user?.id);
    toast.success("Cart settings updated");
  };

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
              <h1 className="text-2xl font-bold text-slate-900">Cart Settings</h1>
              <p className="text-sm text-slate-500">Customize how wholesale cart cards are displayed for this dealer account.</p>
            </div>
          </div>

          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <section>
              <div className="mb-4 flex items-center gap-2 text-slate-900">
                <LayoutGrid size={18} />
                <h2 className="text-lg font-semibold">Cards Per Row</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {cardsPerRowOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSettings((current) => ({ ...current, cardsPerRow: option }))}
                    className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
                      settings.cardsPerRow === option
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    {option} per row
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Visible Cart Details</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(fieldLabels).map(([key, label]) => {
                  const typedKey = key as keyof GarmentCartSettings["visibleDetails"];
                  const checked = settings.visibleDetails[typedKey];
                  return (
                    <label
                      key={key}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition ${
                        checked ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <span className="text-sm font-medium text-slate-800">{label}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            visibleDetails: {
                              ...current.visibleDetails,
                              [typedKey]: event.target.checked,
                            },
                          }))
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </section>

            <div className="flex justify-end">
              <Button onClick={saveSettings} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
                <Save size={15} />
                Save Cart Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CartSettingsPage;
