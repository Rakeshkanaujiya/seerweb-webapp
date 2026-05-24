import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  UserCog,
  ClipboardList,
  BarChart3,
  LogOut,
  Menu,
  X,
  User,
  Box,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setLogoutDialogOpen(false);
    logout();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  const linkClasses = (path: string) =>
    `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? "bg-white/10 text-white"
        : "text-gray-300 hover:bg-white/5 hover:text-white"
    }`;

  const renderLinks = () => {
    if (user?.role === "admin") {
      return (
        <>
          <Link to="/admin" className={linkClasses("/admin")}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link to="/admin/dealers" className={linkClasses("/admin/dealers")}>
            <Users className="h-4 w-4" />
            Manage Dealers
          </Link>
        </>
      );
    }

    if (user?.role === "dealer") {
      return (
        <>
          <Link to="/dealer" className={linkClasses("/dealer")}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link to="/dealer/orders" className={linkClasses("/dealer/orders")}>
            <ShoppingCart className="h-4 w-4" />
            Orders
          </Link>
          <Link to="/dealer/retailers" className={linkClasses("/dealer/retailers")}>
            <Users className="h-4 w-4" />
            Customers
          </Link>
          <Link to="/dealer/products" className={linkClasses("/dealer/products")}>
            <Package className="h-4 w-4" />
            Products
          </Link>
          <Link to="/dealer/staff" className={linkClasses("/dealer/staff")}>
            <UserCog className="h-4 w-4" />
            Staff
          </Link>
          <Link to="/dealer/takeorder" className={linkClasses("/dealer/takeorder")}>
            <ClipboardList className="h-4 w-4" />
            Create Order
          </Link>
        </>
      );
    }

    if (user?.role === "retailer") {
      return (
        <>
          <Link to="/retailer/dashboard" className={linkClasses("/retailer/dashboard")}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link to="/retailer/products" className={linkClasses("/retailer/products")}>
            <Box className="h-4 w-4" />
            Products
          </Link>
          <Link to="/retailer/orders" className={linkClasses("/retailer/orders")}>
            <ShoppingCart className="h-4 w-4" />
            My Orders
          </Link>
          <Link to="/retailer/profile" className={linkClasses("/retailer/profile")}>
            <User className="h-4 w-4" />
            Profile
          </Link>
        </>
      );
    }

    if (user?.role === "staff") {
      return (
        <>
          <Link to="/staff" className={linkClasses("/staff/dashboard")}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link to="/staff/take_order" className={linkClasses("/take_order")}>
            <ClipboardList className="h-4 w-4" />
            Create Order
          </Link>
          <Link to="/staff/sales_report" className={linkClasses("/staff/sales_report")}>
            <BarChart3 className="h-4 w-4" />
            Sales Report
          </Link>
        </>
      );
    }

    return null;
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 rounded-md bg-gray-800 p-2 text-white lg:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col
        bg-gradient-to-b from-[#1f2937] to-[#111827]
        transition-transform duration-300 lg:translate-x-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header Branding (ONLY HERE) */}
        <div className="flex h-16 bg-blue-500 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">
              SeerWeb OMS
            </h1>
            <p className="text-xs text-gray-400 capitalize">
              {user?.role} Panel
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {renderLinks()}
        </nav>

        {/* User Section */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm text-white font-medium">
                {user?.name}
              </p>
              <p className="truncate text-xs text-gray-400">
                {user?.email}
              </p>
            </div>
            <button
              onClick={() => setLogoutDialogOpen(true)}
              className="text-gray-400 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Yes, Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Sidebar;