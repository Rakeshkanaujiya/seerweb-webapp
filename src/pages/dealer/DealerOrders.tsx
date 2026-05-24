import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import OrdersList from "@/components/OrdersList";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, Clock, CheckCircle, Truck } from "lucide-react";
import { OrderStatus, Order, Retailer, Staff } from "@/types";

const DealerOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [newOrdersCount, setNewOrdersCount] = useState<number>(0);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [filteredRetailers, setFilteredRetailers] = useState<Retailer[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    } else if (user?.role !== "dealer") {
      navigate("/retailer/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  // Load orders and check for new ones
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    const token = localStorage.getItem("jwt") || localStorage.getItem("token");

    const fetchOrders = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/orders/fordealer?dealerId=${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch orders");

        const data: Order[] = await response.json();
        if (isMounted) {
          setOrders(data);
          setNewOrdersCount(data.filter((o) => o.status === "pending").length);
        }
      } catch (error) {
        console.error("Order fetch error:", error);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem("jwt") || localStorage.getItem("token");
    const fetchStaff = async () => {
      try {
        const response = await fetch(`${apiUrl}/staff?dealerid=${user?.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        if (isMounted) setFilteredStaff(data);
      } catch (error) {
        console.error("Failed to fetch staff:", error);
      }
    };

    fetchStaff();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const fetchRetailers = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(
          `${apiUrl}/retailers?dealerid=${user?.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch retailers");

        const data = await response.json();
        setRetailers(data);
        setFilteredRetailers(data);
      } catch (error) {
        console.error("Failed to fetch retailers:", error);
      }
    };

    if (user?.id) {
      fetchRetailers();
    }
  }, [user?.id]);

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredOrders(getFilteredOrders());
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = getFilteredOrders().filter(
      (order) =>
        order.id.toLowerCase().includes(lowerQuery) ||
        order.notes?.toLowerCase().includes(lowerQuery) ||
        order.storeName?.toLowerCase().includes(lowerQuery) ||
        order.total.toString().toLowerCase().includes(lowerQuery) ||
        order.retailerName?.toLowerCase().includes(lowerQuery)
    );

    setFilteredOrders(filtered);
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${apiUrl}/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );

      toast.success(`Order status updated to ${status}`);
    } catch (error) {
      console.error("Status update failed:", error);
      toast.error("Failed to update order status");
    }
  };

  const getFilteredOrders = () => {
    if (activeTab === "all") {
      return orders;
    }
    return orders.filter((order) => order.status === activeTab);
  };

  const getStatusCount = (status: OrderStatus) => {
    return orders.filter((order) => order.status === status).length;
  };

  useEffect(() => {
    setFilteredOrders(getFilteredOrders());
  }, [activeTab, orders]);

  const statusConfig = [
    { key: "pending", label: "Pending", icon: Clock, color: "text-yellow-500", bgColor: "bg-yellow-50" },
    { key: "approved", label: "Approved", icon: CheckCircle, color: "text-blue-500", bgColor: "bg-blue-50" },
    { key: "dispatched", label: "Dispatched", icon: Truck, color: "text-purple-500", bgColor: "bg-purple-50" },
    { key: "delivered", label: "Delivered", icon: Package, color: "text-green-500", bgColor: "bg-green-50" },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-64 fixed top-0 left-0 h-full z-10">
        <Sidebar />
      </div>

      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <div className="flex-1 overflow-y-auto pt-16">
          <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
              <p className="text-gray-600 mt-1">Manage and track all orders</p>

              {newOrdersCount > 0 && (
                <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <AlertTriangle size={18} />
                  <span className="font-medium">
                    You have {newOrdersCount} new order
                    {newOrdersCount > 1 ? "s" : ""} pending for review
                  </span>
                </div>
              )}
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {statusConfig.map((status) => {
                const Icon = status.icon;
                const count = getStatusCount(status.key as OrderStatus);
                return (
                  <Card
                    key={status.key}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      activeTab === status.key ? "ring-2 ring-royal" : ""
                    } ${status.key === "pending" && count > 0 ? "border-yellow-400 border-2" : ""}`}
                    onClick={() => setActiveTab(status.key)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className={`text-sm font-medium ${status.color}`}>
                        {status.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{count}</span>
                        <div className={`p-2 rounded-full ${status.bgColor}`}>
                          <Icon className={`h-5 w-5 ${status.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Orders Table */}
            <Card>
              <CardHeader className="border-b">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="text-lg">Orders List</CardTitle>
                  <SearchBar onSearch={handleSearch} />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="p-4 border-b overflow-x-auto">
                    <TabsList className="flex gap-2 min-w-max">
                      <TabsTrigger value="all" className="gap-2">
                        All Orders
                        <Badge variant="secondary" className="ml-1">
                          {orders.length}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="pending" className="gap-2">
                        Pending
                        {newOrdersCount > 0 && (
                          <Badge variant="destructive" className="ml-1">
                            {getStatusCount("pending")}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="approved">Approved</TabsTrigger>
                      <TabsTrigger value="dispatched">Dispatched</TabsTrigger>
                      <TabsTrigger value="delivered">Delivered</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value={activeTab} className="m-0">
                    <div className="p-4">
                      <OrdersList
                        orders={filteredOrders}
                        isAdmin
                        onStatusChange={handleStatusChange}
                        highlightNew={
                          activeTab === "pending" || activeTab === "all"
                        }
                        retailers={retailers}
                        staff={filteredStaff}
                      />

                      {filteredOrders.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="font-medium">No orders found</p>
                          <p className="text-sm">
                            {activeTab === "all"
                              ? "Orders will appear here once created"
                              : `No ${activeTab} orders at the moment`}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealerOrders;
