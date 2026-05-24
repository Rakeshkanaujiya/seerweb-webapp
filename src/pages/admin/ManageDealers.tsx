import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, Plus, Search, Building2, Phone, Mail, User, Lock, MapPin, Calendar } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { apiUrl } from "@/url";

interface Dealer {
  id: number;
  username: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  contact_person: string;
  store_name: string;
  company_name: string;
  registration_date: string;
  business_type_id: number | null;

}

type DealerFormData = {
  username: string;
  name: string;
  email: string;
  address: string;
  company_name: string;
  password: string;
  phone: string;
  confirmPassword?: string;
  dealer_id?: string;
  role?: string;
  business_type_id: string;
};

const emptyFormData: DealerFormData = {
  username: "",
  name: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  company_name: "",
  business_type_id: "",
};

const ManageDealers = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [dealers, setDealers] = useState([]);
  const [filteredDealers, setFilteredDealers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentDealer, setCurrentDealer] = useState(null);
  const navigate = useNavigate();
  const [businessTypes, setBusinessTypes] = useState([]);

  useEffect(() => {
    const fetchBusinessTypes = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${apiUrl}/dealers/business-types`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setBusinessTypes(data);
      } catch (error) {
        console.error("Failed to fetch business types:", error);
      }
    };
    fetchBusinessTypes();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    } else if (user?.role !== "admin") {
      navigate("/admin");
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const fetchDealers = async () => {
      if (!user?.id) return;
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${apiUrl}/dealers`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error("Failed to fetch Dealers");
        const data = await response.json();
        setDealers(data);
        setFilteredDealers(data);
      } catch (error) {
        console.error("Failed to fetch Dealers:", error);
      }
    };
    fetchDealers();
  }, [user]);

  // Live search filter
  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredDealers(
      dealers.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.username?.toLowerCase().includes(q) ||
          d.email?.toLowerCase().includes(q) ||
          d.company_name?.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, dealers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddDealer = () => {
    setIsEditing(false);
    setFormData(emptyFormData);
    setIsDialogOpen(true);
  };

  const handleEditDealer = (dealer: Dealer) => {
    setIsEditing(true);
    setCurrentDealer(dealer);
    setFormData({
      username: dealer.username,
      name: dealer.name,
      email: dealer.email,
      phone: dealer.phone,
      password: "",
      confirmPassword: "",
      dealer_id: user.id,
      role: "dealer",
      address: dealer.address,
      company_name: dealer.company_name,
      business_type_id: dealer.business_type_id?.toString() ?? "",
    });
    setIsDialogOpen(true);
  };

  const validateDealerForm = () => {
    const { username, name, email, phone } = formData;
    if (!username || !name || !email || !phone) {
      toast.error("Please fill all required fields");
      return false;
    }
    const existingDealer = dealers.find(
      (d) =>
        d.username.toLowerCase() === username.toLowerCase() &&
        (!isEditing || d.id !== currentDealer?.id)
    );
    if (existingDealer) {
      toast.error("Username already exists");
      return false;
    }
    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDealerForm()) return;
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Unauthorized: Token not found"); return; }
      const baseUrl = `${apiUrl}/dealers`;

      if (isEditing && currentDealer) {
        const res = await fetch(`${baseUrl}/${currentDealer.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const result = await res.json();
        if (!res.ok) {
          toast.error(result.message || "Failed to update dealer");
          return;
        }
        toast.success("Dealer updated successfully");

      } else {
        const payload = {
          ...formData,
          dealer_id: String(user?.id ?? ""),
          role: "dealer",
          gst: "",
          master_id: 29,
        };
        const res = await fetch(baseUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok) {
          toast.error(result.message || "Failed to create dealer");
          return;
        }
        toast.success("Dealer added successfully");
      }

      const response = await fetch(baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch updated dealer list");
      const updated = await response.json();
      setDealers(updated);
      setFilteredDealers(updated);
      setIsDialogOpen(false);

    } catch (error) {
      console.error("Error saving dealer:", error);
      toast.error("Failed to save dealer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDealer = (dealer: Dealer) => {
    setCurrentDealer(dealer);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteDealer = async () => {
    if (!currentDealer) return;
    try {
      const token = localStorage.getItem("token");
      const baseUrl = `${apiUrl}/dealers`;
      await fetch(`${baseUrl}/${currentDealer.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      toast.success("Dealer deleted successfully");
      const response = await fetch(baseUrl, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const updated = await response.json();
      setDealers(updated);
      setFilteredDealers(updated);
    } catch (error) {
      console.error("Failed to delete dealer:", error);
      toast.error("Failed to delete dealer");
    }
    setIsDeleteDialogOpen(false);
  };

  // Avatar initials helper
  const getInitials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  const avatarColors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-teal-100 text-teal-700",
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 fixed top-0 left-0 h-full z-10">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />

        <div className="flex-1 overflow-y-auto pt-16">
          <div className="container mx-auto px-6 py-6">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Dealers</h1>
                <p className="text-gray-500 mt-1 text-sm">
                  Add and manage dealer accounts &mdash;
                  <span className="ml-1 font-semibold text-blue-600">{dealers.length} total</span>
                </p>
              </div>
              <Button
                onClick={handleAddDealer}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
              >
                <Plus size={16} />
                Add Dealer
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-5 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, username, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-gray-200 focus:ring-blue-500"
              />
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-100">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Dealer</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">User ID</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDealers.length > 0 ? (
                    filteredDealers.map((dealer, index) => (
                      <TableRow
                        key={dealer.id}
                        className="hover:bg-blue-50/40 transition-colors border-b border-gray-50 last:border-0"
                      >
                        {/* Dealer Name + Username */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold flex-shrink-0 ${avatarColors[index % avatarColors.length]}`}>
                              {getInitials(dealer.name)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{dealer.name}</p>
                              <p className="text-xs text-gray-400">@{dealer.username}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm text-gray-700 flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-gray-400" />
                              {dealer.email}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {dealer.phone}
                            </p>
                          </div>
                        </TableCell>

                        {/* Company */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{dealer.company_name || "—"}</span>
                          </div>
                        </TableCell>

                        {/* User ID */}
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs bg-gray-100 text-gray-600">
                            #{dealer.id}
                          </Badge>
                        </TableCell>

                        {/* Joined Date */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {formatDate(dealer.registration_date)}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDealer(dealer)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDealer(dealer)}
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <Building2 className="h-10 w-10 opacity-30" />
                          <p className="text-sm font-medium">
                            {searchQuery ? "No dealers match your search" : "No dealers found"}
                          </p>
                          {!searchQuery && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleAddDealer}
                              className="mt-1 gap-1"
                            >
                              <Plus size={14} /> Add your first dealer
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Add / Edit Dealer Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    {isEditing ? "Edit Dealer" : "Add New Dealer"}
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
                        <Input id="username" name="username" value={formData.username} onChange={handleInputChange} placeholder="e.g. johndoe123" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-gray-400" /> Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. John Doe" required />
                      </div>
                    </div>

                    
                    {/* Row 3: Phone + Email */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-gray-400" /> Phone <span className="text-red-500">*</span>
                        </Label>
                        <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="e.g. 9876543210" required />
                      </div>
                      {/* Row 2: Email */}
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-gray-400" /> Email <span className="text-red-500">*</span>
                        </Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="e.g. john@company.com" required />
                      </div>
                      
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Row 3b: Business Type — add after company_name row */}
                      <div className="space-y-1.5">
                        <Label htmlFor="business_type_id" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          Business Type <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="business_type_id"
                          name="business_type_id"
                          value={formData.business_type_id}
                          onChange={handleInputChange}
                          required
                          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm 
                                    text-gray-900 shadow-sm focus:outline-none focus:ring-2 
                                    focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select business type</option>
                          {businessTypes.map((bt) => (
                            <option key={bt.id} value={bt.id}>
                              {bt.name}
                            </option>
                          ))}
                        </select>
                      </div>
                          
                      {/* Company Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="company_name" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" /> Company
                        </Label>
                        <Input id="company_name" name="company_name" value={formData.company_name} onChange={handleInputChange} placeholder="e.g. Acme Pvt Ltd" />
                      </div>
                    </div>

                    {/* Row 4: Address */}
                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" /> Address
                      </Label>
                      <Input id="address" name="address" value={formData.address} onChange={handleInputChange} placeholder="e.g. 123 Main St, Mumbai" />
                    </div>
                    

                    {/* Row 5: Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5 text-gray-400" /> Password
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={isEditing ? "Leave blank to keep unchanged" : "Leave empty to auto-generate"}
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                      {isLoading
                        ? isEditing ? "Updating..." : "Adding..."
                        : isEditing ? "Update Dealer" : "Add Dealer"}
                    </Button>
                  </DialogFooter>
                </form>
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
                    Delete Dealer
                  </DialogTitle>
                </DialogHeader>
                <div className="py-3">
                  <p className="text-sm text-gray-700">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-gray-900">{currentDealer?.name}</span>?
                  </p>
                  <p className="text-xs text-gray-400 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    ⚠️ This action cannot be undone.
                  </p>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={confirmDeleteDealer} className="bg-red-500 hover:bg-red-600 text-white">
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageDealers;
