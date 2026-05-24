import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { apiUrl } from "@/url";
import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const AdminDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [dealerCount, setDealerCount] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    } else if (user?.role !== "admin") {
      navigate("/dealer");
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const fetchDealerCount = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${apiUrl}/dealers/count`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        setDealerCount(data.total);
      } catch (error) {
        console.error("Failed to fetch dealer count:", error);
        toast.error("Failed to fetch dealer count");
      }
    };

    fetchDealerCount();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden ">
      {/* Sidebar */}
      <div className="w-64 fixed top-0 left-0 h-full z-10">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />

        <div className="flex-1 overflow-y-auto pt-16">
          <div className="container mx-auto px-4 py-6">

            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage dealers and monitor the platform</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Link to="/admin/dealers">
                <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Dealers
                    </CardTitle>
                    <Users className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">{dealerCount}</div>
                    <p className="text-xs text-gray-500 mt-1">Registered dealers</p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Recent Activity */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-500">No recent activity to display.</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
