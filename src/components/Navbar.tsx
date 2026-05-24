import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useIsMobile } from "@/hooks/use-mobile";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false); // controlled dialog
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    // close dialog first (optional) then logout & navigate
    setLogoutDialogOpen(false);
    logout();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;
  const linkClasses = (path: string) =>
  `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
    isActive(path)
      ? "bg-blue-50 text-blue-600"
      : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
  }`;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  return (
    <nav className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-blue-500 border-b border-gray-200 
      flex items-center justify-between px-6 z-30">

      {/* LEFT SIDE — Page Title */}
      <div>
        <h1 className="text-lg font-semibold text-white">
          Welcome back, {user?.name}
        </h1>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-4">

        {/* Cart (if allowed) */}
        {user?.role !== "admin" && (
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-gray-300"
            onClick={() => navigate("/dealer/cart")}
          >
            <ShoppingCart className="h-5 w-5 text-white" />
            {cart.items.length > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">
                {cart.items.length}
              </span>
            )}
          </Button>
        )}

        {/* Avatar */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-200">
                <Avatar>
                  <AvatarFallback>
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
                <Link to="/profile" className={linkClasses("/profile")}>
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role}
                    </p>
                  </div>
                </Link>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => setLogoutDialogOpen(true)}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
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
    </nav>
  );
};

export default Navbar;
