import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { Retailer, Staff, Order } from "@/types";
import { toast } from "sonner";
import {
  Pencil, Trash2, Plus, Users, TrendingUp, ShoppingCart, Calendar, Eye,
  User, Mail, Phone, Lock, MapPin, Store, UserCheck, KeyRound,
} from "lucide-react";
import { apiUrl } from "@/url";
import Sidebar from "@/components/Sidebar";
import { ChevronLeft, ChevronRight, Download, ArrowUpDown } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

interface RetailerFormData {
  username: string;
  name: string;
  contact_person: string;
  store_name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  confirmPassword: string;
  dealer_id: string;
  role: string;
  assigned: string;
}

const emptyFormData: RetailerFormData = {
  username: "",
  name: "",
  contact_person: "",
  store_name: "",
  email: "",
  phone: "",
  address: "",
  password: "",
  confirmPassword: "",
  dealer_id: "",
  role: "",
  assigned: "",
};

interface RetailerStats {
  retailerId: string;
  totalOrders: number;
  totalRevenue: number;
  lastOrderDate: string | null;
}

const ManageRetailers = () => {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [filteredRetailers, setFilteredRetailers] = useState<Retailer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isOrderHistoryDialogOpen, setIsOrderHistoryDialogOpen] = useState(false);
  const [currentRetailer, setCurrentRetailer] = useState<Retailer | null>(null);
  const [formData, setFormData] = useState<RetailerFormData>(emptyFormData);
  const [isEditing, setIsEditing] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [entriesPerPage, setEntriesPerPage] = useState("10");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortBy, setSortBy] = useState<"name" | "revenue" | "orders">("name");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    } else if (user?.role !== "dealer") {
      navigate("/retailer/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const fetchRetailers = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const response = await fetch(`${apiUrl}/retailers?dealerid=${user?.id}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to fetch retailers");
        const data = await response.json();
        setRetailers(data);
        setFilteredRetailers(data);
      } catch (error) {
        console.error("Failed to fetch retailers:", error);
      }
    };
    if (user?.id) fetchRetailers();
  }, [user?.id]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("jwt") || localStorage.getItem("token");
        if (!token) return;
        const response = await fetch(`${apiUrl}/orders/fordealer?dealerId=${user?.id}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to fetch orders");
        const data = await response.json();
        setOrders(data);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      }
    };
    if (user?.id) fetchOrders();
  }, [user?.id]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const response = await fetch(`${apiUrl}/staff/sales_executive?dealerid=${user?.id}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to fetch staff");
        const data = await response.json();
        setStaff(data);
        setFilteredStaff(data);
      } catch (error) {
        console.error("Failed to fetch staff:", error);
      }
    };
    if (user?.id) fetchStaff();
  }, [user?.id]);

  const retailerStats = useMemo(() => {
    const statsMap: Record<string, RetailerStats> = {};
    orders.forEach((order) => {
      const retailerId = String(order.retailerId);
      if (!statsMap[retailerId]) {
        statsMap[retailerId] = { retailerId, totalOrders: 0, totalRevenue: 0, lastOrderDate: null };
      }
      statsMap[retailerId].totalOrders += 1;
      const orderTotal = typeof order.total === "number" ? order.total : parseFloat(order.total) || 0;
      statsMap[retailerId].totalRevenue += orderTotal;
      const orderDate = new Date(order.createdAt);
      if (!statsMap[retailerId].lastOrderDate || orderDate > new Date(statsMap[retailerId].lastOrderDate!)) {
        statsMap[retailerId].lastOrderDate = order.createdAt;
      }
    });
    return statsMap;
  }, [orders]);

  const overallStats = useMemo(() => {
    const totalRetailers = retailers.length;
    const activeRetailers = new Set(orders.map((o) => String(o.retailerId))).size;
    const totalRevenue = orders.reduce((sum, o) => {
      const total = typeof o.total === "number" ? o.total : parseFloat(o.total) || 0;
      return sum + total;
    }, 0);
    const totalOrders = orders.length;
    return { totalRetailers, activeRetailers, totalRevenue, totalOrders };
  }, [retailers, orders]);

  const handleRetailerSearch = (query: string) => {
    if (!query.trim()) { setFilteredRetailers(retailers); return; }
    const lowerQuery = query.toLowerCase();
    const filtered = retailers.filter(
      (retailer) =>
        retailer.username?.toLowerCase().includes(lowerQuery) ||
        retailer.name?.toLowerCase().includes(lowerQuery) ||
        retailer.contact_person?.toLowerCase().includes(lowerQuery) ||
        retailer.email?.toLowerCase().includes(lowerQuery) ||
        retailer.phone?.toLowerCase().includes(lowerQuery) ||
        retailer.store_name?.toLowerCase().includes(lowerQuery)
    );
    setFilteredRetailers(filtered);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddRetailer = () => {
    setIsEditing(false);
    setFormData(emptyFormData);
    setIsDialogOpen(true);
  };

  const handleEditRetailer = (retailer: Retailer) => {
    setIsEditing(true);
    setCurrentRetailer(retailer);
    setFormData({
      username: retailer.username,
      name: retailer.name,
      contact_person: retailer.contact_person,
      store_name: retailer.store_name,
      email: retailer.email,
      phone: retailer.phone,
      address: retailer.address,
      password: "",
      confirmPassword: "",
      dealer_id: user?.id || "",
      role: "",
      assigned: retailer.assigned,
    });
    setIsDialogOpen(true);
  };

  const handleViewOrderHistory = (retailer: Retailer) => {
    setCurrentRetailer(retailer);
    setIsOrderHistoryDialogOpen(true);
  };

  const handleDeleteRetailer = (retailer: Retailer) => {
    setCurrentRetailer(retailer);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteRetailer = async () => {
    if (!currentRetailer) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Unauthorized: Token not found"); return; }
      const deleteResponse = await fetch(`${apiUrl}/retailers/${currentRetailer.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!deleteResponse.ok) throw new Error("Failed to delete retailer");
      toast.success("Retailer deleted successfully");
      const listResponse = await fetch(`${apiUrl}/retailers?dealerid=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!listResponse.ok) throw new Error("Failed to fetch updated retailer list");
      const updatedList = await listResponse.json();
      setRetailers(updatedList);
      setFilteredRetailers(updatedList);
    } catch (error) {
      console.error("Failed to delete retailer:", error);
      toast.error("Failed to delete retailer");
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const { username, name, email, phone } = formData;

    // Basic required field check
    if (!username || !name || !email || !phone) {
      toast.error("Please fill all required fields");
      return false;
    }

    // Local duplicate check first (fast)
    const duplicateUsername = retailers.find(
      (r) => r.username?.toLowerCase() === username.toLowerCase() &&
            (!isEditing || String(r.id) !== String(currentRetailer?.id))
    );
    if (duplicateUsername) {
      toast.error(`Username "${username}" is already taken. Please choose a different username.`);
      return false;
    }

    const duplicateEmail = retailers.find(
      (r) => r.email?.toLowerCase() === email.toLowerCase() &&
            (!isEditing || String(r.id) !== String(currentRetailer?.id))
    );
    if (duplicateEmail) {
      toast.error(`Email "${email}" is already registered to "${duplicateEmail.store_name}". Use a different email.`);
      return false;
    }

    // Server-side duplicate check (checks full DB, not just current dealer)
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${apiUrl}/retailers/check-duplicate?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}&excludeId=${isEditing ? currentRetailer?.id : ""}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.duplicateUsername) {
          toast.error(`Username "${username}" is already taken across the system.`);
          return false;
        }
        if (data.duplicateEmail) {
          toast.error(`Email "${email}" is already registered in the system.`);
          return false;
        }
      }
    } catch {
      // If server check fails, local check already passed — allow submission
      console.warn("Server duplicate check unavailable, proceeding with local validation only");
    }

    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateForm(); // ← was: if (!validateForm()) return;
    if (!isValid) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Unauthorized: Token not found");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      let res;

      if (isEditing && currentRetailer) {
        res = await fetch(`${apiUrl}/retailers/${currentRetailer.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(formData),
        });
      } else {
        formData.dealer_id = user?.id || "";
        formData.role = "retailer";

        res = await fetch(`${apiUrl}/retailers`, {
          method: "POST",
          headers,
          body: JSON.stringify(formData),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        console.error("API ERROR:", data);

        // 🔥 Extract proper message
        let message = "Something went wrong";

        if (data?.messages?.error) {
          message = data.messages.error;
        } else if (data?.message) {
          message = data.message;
        }

        if (message.includes("Duplicate entry") && message.includes("store_name")) {
          message = "Store name already exists. Please use a different name.";
        }

        throw new Error(message);
      }

      toast.success(isEditing ? "Retailer updated successfully" : "Retailer added successfully");

      const listResponse = await fetch(`${apiUrl}/retailers?dealerid=${user?.id}`, { headers });
      const updatedList = await listResponse.json();

      setRetailers(updatedList);
      setFilteredRetailers(updatedList);
      setIsDialogOpen(false);

    } catch (error: any) {
      console.error("FULL ERROR:", error);

      // 🔥 Show exact DB error to user
      toast.error(error.message);
    }
  };

  const handleExport = (type: "xlsx" | "csv") => {
    const data = retailers.map((c) => {
      const stats = retailerStats[String(c.id)] || { totalOrders: 0, totalRevenue: 0, lastOrderDate: null };
      return {
        Username: c.username, Name: c.name, "Store Name": c.store_name,
        Email: c.email, Phone: c.phone, Address: c.address,
        "Total Orders": stats.totalOrders, "Total Revenue (₹)": stats.totalRevenue.toFixed(2),
        "Last Order": stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString() : "-",
        "Assigned To": c.assigned || "-",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, `customers.${type}`);
  };

  const retailerOrders = useMemo(() => {
    if (!currentRetailer) return [];
    return orders
      .filter((o) => String(o.retailerId) === String(currentRetailer.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [currentRetailer, orders]);

  const sortedRetailers = useMemo(() => {
    return [...filteredRetailers].sort((a, b) => {
      const statsA = retailerStats[String(a.id)] || { totalOrders: 0, totalRevenue: 0 };
      const statsB = retailerStats[String(b.id)] || { totalOrders: 0, totalRevenue: 0 };
      let comparison = 0;
      switch (sortBy) {
        case "name": comparison = (a.name || "").localeCompare(b.name || ""); break;
        case "revenue": comparison = statsA.totalRevenue - statsB.totalRevenue; break;
        case "orders": comparison = statsA.totalOrders - statsB.totalOrders; break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredRetailers, retailerStats, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedRetailers.length / limit);
  const paginatedRetailers = sortedRetailers.slice((page - 1) * limit, page * limit);

  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString("en-IN")}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="w-64 fixed top-0 left-0 h-full z-10">
        <Sidebar />
      </div>

      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <div className="flex-1 overflow-y-auto pt-16">
          <div className="container mx-auto px-4 py-6">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Customers</h1>
                <p className="text-gray-600 mt-1">Add, edit, or delete customer accounts</p>
              </div>
              <Button onClick={handleAddRetailer} className="bg-royal hover:bg-royal-dark gap-2">
                <Plus size={16} />
                Add Customer
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Users size={16} /> Total Customers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{overallStats.totalRetailers}</div>
                  <p className="text-xs text-gray-500">Registered accounts</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <ShoppingCart size={16} /> Active Customers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{overallStats.activeRetailers}</div>
                  <p className="text-xs text-gray-500">With orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <TrendingUp size={16} /> Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(overallStats.totalRevenue)}</div>
                  <p className="text-xs text-gray-500">From all customers</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Calendar size={16} /> Total Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{overallStats.totalOrders}</div>
                  <p className="text-xs text-gray-500">All time</p>
                </CardContent>
              </Card>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <SearchBar onSearch={handleRetailerSearch} />
            </div>

            {/* Table Card */}
            <Card>
              <CardContent className="p-0">
                {/* Top Controls */}
                <div className="p-4 border-b flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show</span>
                    <Select
                      value={entriesPerPage}
                      onValueChange={(value) => {
                        setEntriesPerPage(value);
                        setPage(1);
                        if (value === "all") setLimit(sortedRetailers.length);
                        else setLimit(Number(value));
                      }}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Select entries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">entries</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="orders">Orders</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                      <ArrowUpDown className="w-4 h-4 mr-1" />
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
                      <Download className="w-4 h-4 mr-1" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
                      <Download className="w-4 h-4 mr-1" /> Excel
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Name</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Last Order</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRetailers.length > 0 ? (
                      paginatedRetailers.map((retailer) => {
                        const stats = retailerStats[String(retailer.id)] || {
                          totalOrders: 0, totalRevenue: 0, lastOrderDate: null,
                        };
                        return (
                          <TableRow key={retailer.id}>
                            <TableCell className="font-medium">{retailer.store_name}</TableCell>
                            <TableCell>
                              <div>
                                <p>{retailer.name}</p>
                                <p className="text-xs text-gray-500">{retailer.username}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{retailer.phone}</p>
                                <p className="text-xs text-gray-500">{retailer.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{stats.totalOrders}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-green-600">{formatCurrency(stats.totalRevenue)}</span>
                            </TableCell>
                            <TableCell>
                              {stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button variant="outline" size="sm" onClick={() => handleViewOrderHistory(retailer)} title="View Orders">
                                  <Eye size={16} />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleEditRetailer(retailer)} title="Edit">
                                  <Pencil size={16} />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteRetailer(retailer)} className="text-red-500 hover:text-red-700" title="Delete">
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-gray-500">No customers found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="p-4 border-t flex justify-between items-center text-sm text-gray-600 flex-wrap gap-2">
                  <div>
                    Showing {sortedRetailers.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
                    {Math.min(page * limit, sortedRetailers.length)} of {sortedRetailers.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <span className="font-semibold">{page} / {totalPages || 1}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ✅ ENHANCED Add/Edit Customer Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Store className="h-4 w-4 text-blue-600" />
                    </div>
                    {isEditing ? "Edit Customer" : "Add New Customer"}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleFormSubmit}>
                  <div className="grid gap-4 py-4">

                    {/* Row 1: Username + Name */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="username" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-gray-400" /> Username <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="username"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          placeholder="e.g. shopowner1"
                          required
                          className={
                            retailers.some(
                              (r) => r.username?.toLowerCase() === formData.username.toLowerCase() &&
                                    (!isEditing || String(r.id) !== String(currentRetailer?.id))
                            ) ? "border-red-400 focus-visible:ring-red-400" : ""
                          }
                        />
                        {retailers.some(
                          (r) => r.username?.toLowerCase() === formData.username.toLowerCase() &&
                                (!isEditing || String(r.id) !== String(currentRetailer?.id))
                        ) && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            ⚠️ Username already taken
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-gray-400" /> Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Ramesh Kumar" required />
                      </div>
                    </div>

                    {/* Row 2: Store Name + Email */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="store_name" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Store className="h-3.5 w-3.5 text-gray-400" /> Store Name <span className="text-red-500">*</span>
                        </Label>
                        <Input id="store_name" name="store_name" value={formData.store_name} onChange={handleInputChange} placeholder="e.g. Ramesh Electronics" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-gray-400" /> Email <span className="text-red-500">*</span>
                        </Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="e.g. ramesh@store.com" required />
                      </div>
                    </div>

                    {/* Row 3: Phone + Address */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-gray-400" /> Phone <span className="text-red-500">*</span>
                        </Label>
                        <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="e.g. 9876543210" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="address" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" /> Address
                        </Label>
                        <Input id="address" name="address" value={formData.address} onChange={handleInputChange} placeholder="e.g. Shop 5, Main Rd" />
                      </div>
                    </div>

                    {/* Row 4: Password + Confirm Password */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5 text-gray-400" /> Password{!isEditing && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required={!isEditing}
                          placeholder={isEditing ? "Leave blank to keep" : "Enter password"}
                        />
                      </div>
                      {!isEditing && (
                        <div className="space-y-1.5">
                          <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <KeyRound className="h-3.5 w-3.5 text-gray-400" /> Confirm Password <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            required
                            placeholder="Re-enter password"
                          />
                        </div>
                      )}
                    </div>

                    {/* Row 5: Assign Sales Executive — full width */}
                    <div className="space-y-1.5">
                      <Label htmlFor="assigned" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-gray-400" /> Assign Sales Executive
                      </Label>
                      <Select
                        value={formData.assigned}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, assigned: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Sales Executive" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredStaff.map((executive) => (
                            <SelectItem key={executive.id} value={String(executive.id)}>
                              {executive.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                  </div>

                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-royal hover:bg-royal-dark text-white">
                      {isEditing ? "Update Customer" : "Add Customer"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Order History Dialog — unchanged */}
            <Dialog open={isOrderHistoryDialogOpen} onOpenChange={setIsOrderHistoryDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Order History - {currentRetailer?.store_name}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  {retailerOrders.length > 0 ? (
                    <div className="space-y-3">
                      {retailerOrders.map((order) => (
                        <Card key={order.id} className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">Order #{order.id.slice(-8)}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(order.createdAt).toLocaleDateString()} at{" "}
                                {new Date(order.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge
                                className={
                                  order.status === "delivered" ? "bg-green-500"
                                    : order.status === "pending" ? "bg-yellow-500"
                                    : order.status === "approved" ? "bg-blue-500"
                                    : "bg-purple-500"
                                }
                              >
                                {order.status}
                              </Badge>
                              <p className="font-semibold mt-1">
                                ₹{(typeof order.total === "number" ? order.total : parseFloat(order.total) || 0).toLocaleString("en-IN")}
                              </p>
                            </div>
                          </div>
                          {order.items && order.items.length > 0 && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs text-gray-500 mb-1">Items:</p>
                              <div className="text-sm">
                                {order.items.slice(0, 3).map((item, idx) => (
                                  <span key={idx}>
                                    {item.product?.name || `Product ${item.productId}`} x{item.quantity}
                                    {idx < Math.min(order.items.length, 3) - 1 ? ", " : ""}
                                  </span>
                                ))}
                                {order.items.length > 3 && (
                                  <span className="text-gray-500"> +{order.items.length - 3} more</span>
                                )}
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No orders found for this customer</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </div>
                    Delete Customer
                  </DialogTitle>
                </DialogHeader>
                <div className="py-3">
                  <p className="text-sm text-gray-700">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-gray-900">{currentRetailer?.name}</span>?
                  </p>
                  <p className="text-xs text-gray-400 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    ⚠️ This action cannot be undone.
                  </p>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                  <Button onClick={confirmDeleteRetailer} className="bg-red-500 hover:bg-red-600 text-white">Delete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageRetailers;
