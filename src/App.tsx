import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

import Layout from "@/components/Layout";

import Index from "./pages/Index";
import RetailerHome from "./pages/customer/RetailerHome";
import DealerDashboard from "./pages/dealer/DealerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Cart from "./pages/Cart";
import RetailerOrders from "./pages/customer/RetailerOrders";
import ManageProducts from "./pages/dealer/ManageProducts";
import ManageRetailers from "./pages/dealer/ManageRetailers";
import ManageDealers from "./pages/admin/ManageDealers";
import NotFound from "./pages/NotFound";
import DealerStaff from "./pages/dealer/ManageStaff";
import SalesExecutiveDashboard from "./pages/staff/SalesExecutiveDashboard";
import Orders from "./pages/staff/Orders";
import TakeOrder from "./pages/dealer/TakeOrder";
import DealerOrders from "./pages/dealer/DealerOrders";
import RetailerDashboard from "./pages/customer/RetailerDashboard";
import RetailerProfile from "./pages/customer/RetailerProfile";
import StaffDashboard from "./pages/staff/StaffDashboard";
import AddProduct from "./pages/dealer/AddProduct";
import ManageCustomFields from "./pages/dealer/ManageCustomFields";
import Profile from "./components/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <Routes>
              {/* No layout — standalone login page */}
              <Route path="/" element={<Index />} />

              {/* ✅ Pages with their OWN Sidebar + Navbar — NO Layout wrapper */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/dealers" element={<ManageDealers />} />
              <Route path="/dealer" element={<DealerDashboard />} />

              {/* ✅ Pages that use Layout for Sidebar + Navbar */}
              <Route path="/retailer/dashboard" element={<Layout><RetailerDashboard /></Layout>} />
              <Route path="/retailer/products" element={<Layout><RetailerHome /></Layout>} />
              <Route path="/retailer/orders" element={<Layout><RetailerOrders /></Layout>} />
              <Route path="/retailer/profile" element={<Layout><RetailerProfile /></Layout>} />
              <Route path="/dealer/cart" element={<Layout><Cart /></Layout>} />
              <Route path="/dealer/takeorder" element={<Layout><TakeOrder /></Layout>} />
              <Route path="/dealer/orders" element={<Layout><DealerOrders /></Layout>} />
              <Route path="/dealer/products" element={<Layout><ManageProducts /></Layout>} />
              <Route path="/dealer/products/add" element={<AddProduct />} />
              <Route path="/dealer/retailers" element={<Layout><ManageRetailers /></Layout>} />
              <Route path="/dealer/staff" element={<Layout><DealerStaff /></Layout>} />
              <Route path="/dealer/staff" element={<Layout><DealerStaff /></Layout>} />
              <Route path="/dealer/custom-fields" element={<ManageCustomFields />} />
              <Route path="/staff/sales_report" element={<Layout><Orders /></Layout>} />
              <Route path="/staff/take_order" element={<Layout><SalesExecutiveDashboard /></Layout>} />
              <Route path="/staff/" element={<Layout><StaffDashboard /></Layout>} />
              <Route path="/profile" element={<Layout><Profile /></Layout>} />

              {/* Not Found fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </TooltipProvider>
      </CartProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
