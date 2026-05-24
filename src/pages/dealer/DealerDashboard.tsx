import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { apiUrl } from "@/url";
import Sidebar from "@/components/Sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  FileText,
  Users,
  Package,
  UserCheck,
  Settings,
  Plus,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { OrderStatus, Order, Retailer, Staff, Product } from "@/types";

const COLORS = ["#eab308", "#3b82f6", "#22c55e", "#ef4444"];

// ✅ Removed "dispatched" from STATUS_COLORS
const STATUS_COLORS: Record<string, string> = {
  pending: "#eab308",
  approved: "#3b82f6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

const DealerDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    } else if (user?.role !== "dealer") {
      navigate("/retailer/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (!user?.id) return;

    const token = localStorage.getItem("jwt") || localStorage.getItem("token");

    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const ordersRes = await fetch(`${apiUrl}/orders/fordealer?dealerId=${user.id}`, { headers });
        if (ordersRes.ok) setOrders(await ordersRes.json());

        const retailersRes = await fetch(`${apiUrl}/retailers?dealerid=${user.id}`, { headers });
        if (retailersRes.ok) setRetailers(await retailersRes.json());

        const staffRes = await fetch(`${apiUrl}/staff?dealerid=${user.id}`, { headers });
        if (staffRes.ok) setStaff(await staffRes.json());

        const productsRes = await fetch(`${apiUrl}/products?dealerid=${user.id}`, { headers });
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || productsData);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysOrders = orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    const totalRevenue = orders.reduce((sum, o) => {
      const orderTotal = typeof o.total === "number" ? o.total : parseFloat(o.total) || 0;
      return sum + orderTotal;
    }, 0);

    const pendingCount = orders.filter((o) => o.status === "pending").length;

    return {
      totalOrders: orders.length,
      pendingOrders: pendingCount,
      totalRevenue,
      todaysOrders: todaysOrders.length,
      totalRetailers: retailers.length,
      totalProducts: products.length,
      salesTeam: staff.filter((s) => s.sub_role === "executive" || s.sub_role === "sales_executive").length,
    };
  }, [orders, retailers, products, staff]);

  const ordersOverTime = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      last7Days.push(date);
    }

    return last7Days.map((date) => {
      const dayOrders = orders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === date.getTime();
      });

      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => {
          const total = typeof o.total === "number" ? o.total : parseFloat(o.total) || 0;
          return sum + total;
        }, 0) / 1000,
      };
    });
  }, [orders]);

  // ✅ Removed "dispatched" from statusCounts
  const ordersByStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {
      pending: 0,
      approved: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach((o) => {
      if (statusCounts[o.status] !== undefined) {
        statusCounts[o.status]++;
      }
    });

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        color: STATUS_COLORS[status],
      }));
  }, [orders]);

  // ✅ Removed "dispatched" from statusRevenue
  const revenueByStatus = useMemo(() => {
    const statusRevenue: Record<string, number> = {
      pending: 0,
      approved: 0,
      delivered: 0,
    };

    orders.forEach((o) => {
      if (statusRevenue[o.status] !== undefined) {
        const total = typeof o.total === "number" ? o.total : parseFloat(o.total) || 0;
        statusRevenue[o.status] += total;
      }
    });

    return Object.entries(statusRevenue).map(([status, revenue]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      revenue: revenue / 1000,
      fill: STATUS_COLORS[status],
    }));
  }, [orders]);

  const formatCurrency = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) return "₹0";
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const todayDate = new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="flex h-screen overflow-hidden ">
      <div className="w-64 fixed top-0 left-0 h-full z-10">
        <Sidebar />
      </div>

      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <div className="flex-1 overflow-y-auto pt-16">
          <div className="container mx-auto px-4 py-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Manage orders and track performance</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                <Button variant="outline" onClick={() => navigate("/dealer/products")} className="gap-2">
                  <Settings size={16} /> Manage Products
                </Button>
                <Button variant="outline" onClick={() => navigate("/dealer/retailers")} className="gap-2">
                  <Users size={16} /> Manage Retailers
                </Button>
                <Button onClick={() => navigate("/dealer/takeorder")} className="bg-royal hover:bg-royal-dark gap-2">
                  <Plus size={16} /> Create Order
                </Button>
              </div>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
                  <ShoppingCart className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{stats.totalOrders}</div>
                  <p className="text-xs text-gray-500 mt-1">All time</p>
                </CardContent>
              </Card>

              <Card className={`border-l-4 ${stats.pendingOrders > 0 ? "border-l-yellow-500 border-2 border-yellow-200" : "border-l-yellow-500"}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Pending Orders</CardTitle>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{stats.pendingOrders}</div>
                  <p className="text-xs text-yellow-600 mt-1">Requires attention</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</div>
                  <p className="text-xs text-gray-500 mt-1">All time</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Today's Orders</CardTitle>
                  <FileText className="h-5 w-5 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{stats.todaysOrders}</div>
                  <p className="text-xs text-gray-500 mt-1">{todayDate}</p>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Retailers</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.totalRetailers}</div>
                    <p className="text-xs text-gray-500">Active customers</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-100" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.totalProducts}</div>
                    <p className="text-xs text-gray-500">In catalog</p>
                  </div>
                  <Package className="h-8 w-8 text-green-100" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Sales Team</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{stats.salesTeam}</div>
                    <p className="text-xs text-gray-500">Active executives</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-purple-100" />
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Orders Over Time (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ordersOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                        <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Revenue Over Time (₹ in thousands)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ordersOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} formatter={(value: number) => [`₹${value.toFixed(1)}K`, "Revenue"]} />
                        <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Orders by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {ordersByStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={ordersByStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {ordersByStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No orders data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Revenue by Status (₹ in thousands)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByStatus} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="#6b7280" width={80} />
                        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} formatter={(value: number) => [`₹${value.toFixed(1)}K`, "Revenue"]} />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                          {revenueByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Links */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/dealer/retailers">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-semibold">Manage Retailers</p>
                        <p className="text-sm text-gray-500">View & edit customers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dealer/products">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Package className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-semibold">Manage Products</p>
                        <p className="text-sm text-gray-500">Update inventory</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dealer/staff">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-purple-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="font-semibold">Manage Staff</p>
                        <p className="text-sm text-gray-500">Team management</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dealer/takeorder">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-orange-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-8 w-8 text-orange-500" />
                      <div>
                        <p className="font-semibold">Create Order</p>
                        <p className="text-sm text-gray-500">New sales order</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DealerDashboard;
