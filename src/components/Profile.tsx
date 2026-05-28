import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/url";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  User, Mail, Phone, MapPin, Building2, Shield,
  KeyRound, Eye, EyeOff, LogOut, Calendar,
  BadgeCheck, Hash, Store, Settings2, ChevronRight, Ruler, ShoppingCart,
} from "lucide-react";
import MainLayout from "./MainLayoutProps";
import { isGarmentsBusiness } from "@/lib/businessType";

// ── Helpers ───────────────────────────────────────────────────────────────────

const roleColor: Record<string, string> = {
  admin:    "bg-purple-100 text-purple-700 border-purple-200",
  dealer:   "bg-blue-100 text-blue-700 border-blue-200",
  retailer: "bg-green-100 text-green-700 border-green-200",
  staff:    "bg-orange-100 text-orange-700 border-orange-200",
};

const roleLabel: Record<string, string> = {
  admin:    "Admin",
  dealer:   "Dealer",
  retailer: "Retailer",
  staff:    "Staff",
};

// ── Component ─────────────────────────────────────────────────────────────────

const Profile = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();

  // ── Password change dialog state ──────────────────────────────────────────
  const [pwDialogOpen, setPwDialogOpen]       = useState(false);
  const [currentPw, setCurrentPw]             = useState("");
  const [newPw, setNewPw]                     = useState("");
  const [confirmPw, setConfirmPw]             = useState("");
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [savingPw, setSavingPw]               = useState(false);

  // ── Logout confirm dialog ─────────────────────────────────────────────────
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 font-semibold">
        Loading...
      </div>
    );
  }
  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  // ── Change password — same API as mobile app ──────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPw.trim() || !newPw.trim() || !confirmPw.trim()) {
      toast.error("All password fields are required");
      return;
    }
    if (newPw.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New password and confirm password do not match");
      return;
    }

    setSavingPw(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${apiUrl}/change-password`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id:          user?.id,
          current_password: currentPw,
          new_password:     newPw,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Password change failed");
        return;
      }

      toast.success("Password changed successfully");
      setPwDialogOpen(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setSavingPw(false);
    }
  };

  const handleLogout = () => {
    logout();
    setLogoutDialogOpen(false);
  };

  // ── User avatar initials ──────────────────────────────────────────────────
  const initials = user?.name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  // ── Info row component ────────────────────────────────────────────────────
  const InfoRow = ({
    icon: Icon,
    label,
    value,
    iconBg = "bg-gray-100",
    iconColor = "text-gray-500",
  }: {
    icon: any;
    label: string;
    value?: string | null;
    iconBg?: string;
    iconColor?: string;
  }) => (
    <div className="flex items-center gap-4 py-3">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={16} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-900 font-medium truncate mt-0.5">
          {value || <span className="text-gray-300 font-normal">Not set</span>}
        </p>
      </div>
    </div>
  );
 
  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="px-4">
          <div className="container mx-auto px-2">

            {/* ── Page Header ── */}
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                View your account details and manage your password
              </p>

            {/* ── Profile Hero Card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="h-20 w-20 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-2xl font-bold text-white">{initials}</span>
                </div>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">{user?.name}</h2>
                  <p className="text-sm text-gray-500 truncate mt-0.5">@{user?.username}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge
                      className={`text-xs font-medium capitalize border ${
                        roleColor[user?.role ?? ""] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <BadgeCheck size={11} className="mr-1" />
                      {roleLabel[user?.role ?? ""] ?? user?.role}
                    </Badge>
                    {user?.sub_role && (
                      <Badge className="bg-orange-50 text-orange-600 border-orange-200 text-xs">
                        {user.sub_role}
                      </Badge>
                    )}
                    {user?.role === "dealer" && user?.company_name && (
                      <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
                        <Building2 size={10} className="mr-1" />
                        {(user as any).company_name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Account Details ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <User size={14} className="text-blue-600" /> Account Details
              </h3>
              <p className="text-xs text-gray-400 mb-4">Your personal information on file</p>

              <div className="divide-y divide-gray-50">
                <InfoRow
                  icon={User}
                  label="Full Name"
                  value={user?.name}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                />
                <InfoRow
                  icon={Mail}
                  label="Email Address"
                  value={user?.email}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-500"
                />
                <InfoRow
                  icon={Phone}
                  label="Phone Number"
                  value={user?.phone}
                  iconBg="bg-green-50"
                  iconColor="text-green-600"
                />
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={user?.address}
                  iconBg="bg-pink-50"
                  iconColor="text-pink-500"
                />
                {(user?.role === "retailer" || user?.role === "dealer") && (
                  <InfoRow
                    icon={Store}
                    label="Store / Company"
                    value={(user as any).store_name || (user as any).company_name}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                  />
                )}
                {(user as any).gst && (
                  <InfoRow
                    icon={Hash}
                    label="GST Number"
                    value={(user as any).gst}
                    iconBg="bg-teal-50"
                    iconColor="text-teal-600"
                  />
                )}
                <InfoRow
                  icon={Calendar}
                  label="Member Since"
                  value={
                    (user as any).registration_date
                      ? new Date((user as any).registration_date).toLocaleDateString("en-IN", {
                          day: "numeric", month: "long", year: "numeric",
                        })
                      : undefined
                  }
                  iconBg="bg-indigo-50"
                  iconColor="text-indigo-600"
                />
              </div>
            </div>

            {/* ── Custom Fields (dealer only) ── */}
            {user?.role === "dealer" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
                <button
                  onClick={() => navigate("/dealer/custom-fields")}
                  className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Settings2 size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900">Custom Product Fields</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Create and manage your own product fields (HSN Code, Fabric Type, etc.)
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                </button>
              </div>
            )}

            {user?.role === "dealer" && isGarmentsBusiness(user?.business_type_id) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
                <button
                  onClick={() => navigate("/dealer/garment-size-settings")}
                  className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Ruler size={16} className="text-amber-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900">Garments Size Settings</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Enable or disable size systems on a separate settings page.
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                </button>
              </div>
            )}

            {user?.role === "dealer" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
                <button
                  onClick={() => navigate("/dealer/cart-settings")}
                  className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart size={16} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900">Cart Settings</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Configure cards per row and choose which details appear on cart cards.
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                </button>
              </div>
            )}

            {/* ── Security ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
              <div className="px-5 pt-5 pb-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Shield size={14} className="text-red-500" /> Security
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Manage your login credentials</p>
              </div>
              <Separator className="mt-3" />
              <button
                onClick={() => setPwDialogOpen(true)}
                className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <KeyRound size={16} className="text-red-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900">Change Password</p>
                  <p className="text-xs text-gray-400 mt-0.5">Update your account password</p>
                </div>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </button>
            </div>

            {/* ── Logout ── */}
            <button
              onClick={() => setLogoutDialogOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-semibold rounded-2xl py-3.5 transition-colors mb-8"
            >
              <LogOut size={16} />
              Logout
            </button>

          </div>

      {/* ── Change Password Dialog ── */}
      <Dialog open={pwDialogOpen} onOpenChange={(o) => {
        if (!o) { setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
        setPwDialogOpen(o);
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center">
                <KeyRound className="h-4 w-4 text-red-500" />
              </div>
              Change Password
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">

            {/* Current Password */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Current Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                New Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength indicator */}
              {newPw.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          newPw.length >= level * 3
                            ? newPw.length < 6
                              ? "bg-red-400"
                              : newPw.length < 9
                              ? "bg-yellow-400"
                              : "bg-green-400"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {newPw.length < 6 ? "Weak" : newPw.length < 9 ? "Fair" : "Strong"}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Confirm New Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`pr-10 ${
                    confirmPw && confirmPw !== newPw ? "border-red-300" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPw && confirmPw !== newPw && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
              {confirmPw && confirmPw === newPw && newPw.length >= 6 && (
                <p className="text-xs text-green-600">✓ Passwords match</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPwDialogOpen(false);
                setCurrentPw(""); setNewPw(""); setConfirmPw("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={savingPw}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {savingPw ? "Saving…" : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Logout Confirm Dialog ── */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center">
                <LogOut className="h-4 w-4 text-red-500" />
              </div>
              Logout
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600">
              Are you sure you want to logout? You'll need to sign in again to access your account.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Yes, Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
  </MainLayout>
  );
};

export default Profile;
