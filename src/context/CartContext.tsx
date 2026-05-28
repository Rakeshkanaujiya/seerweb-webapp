import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { Cart, CartItem, CartVariantItem, Product, ProductVariant } from "../types";
import { toast } from "sonner";

// ── Context type ──────────────────────────────────────────────────────────────

interface CartContextType {
  cart:              Cart;
  addToCart:         (product: Product, quantity: number) => void;
  addVariantToCart:  (product: Product, variant: ProductVariant, quantity: number) => void;
  addGarmentBundle: (
    product: Product,
    variants: Array<ProductVariant & { quantity: number; color?: string; setQuantity?: number }>,
    garmentMeta?: CartItem["garmentMeta"]
  ) => void;
  removeFromCart:    (productId: string) => void;
  removeVariant:     (productId: string, variantId: number | string) => void;
  updateQuantity:    (productId: string, quantity: number) => void;
  updateVariantQty:  (productId: string, variantId: number | string, quantity: number) => void;
  clearCart:         () => void;
  cartCount:         number;
  cartTotal:         number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ── Helpers ───────────────────────────────────────────────────────────────────

const getCartKey = (userId?: string | null) =>
  userId ? `cart_${userId}` : "cart_guest";

const calcTotal = (items: CartItem[]): number =>
  items.reduce(
    (sum, item) =>
      sum + item.variants.reduce((s, v) => s + v.price * v.quantity, 0),
    0
  );

const calcCount = (items: CartItem[]): number =>
  items.reduce(
    (sum, item) => sum + item.variants.reduce((s, v) => s + v.quantity, 0),
    0
  );

// ── Provider ──────────────────────────────────────────────────────────────────

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart]     = useState<Cart>({ items: [], total: 0 });
  const [userId, setUserId] = useState<string | null>(null);

  // ── On mount: load cart for current user ─────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      const id     = stored ? String(JSON.parse(stored)?.id ?? "") || null : null;
      setUserId(id);
      const saved = localStorage.getItem(getCartKey(id));
      setCart(saved ? JSON.parse(saved) : { items: [], total: 0 });
    } catch {
      setCart({ items: [], total: 0 });
    }
  }, []);

  // ── Persist on every change ───────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(getCartKey(userId), JSON.stringify(cart));
  }, [cart, userId]);

  // ── Auth events: switch / clear cart on login / logout ───────────────────
  useEffect(() => {
    const handleLogin = (e: CustomEvent) => {
      const newId = String(e.detail.userId);
      setUserId(newId);
      const saved = localStorage.getItem(getCartKey(newId));
      setCart(saved ? JSON.parse(saved) : { items: [], total: 0 });
    };

    const handleLogout = (e: CustomEvent) => {
      const oldId = String(e.detail.userId);
      localStorage.removeItem(getCartKey(oldId));
      setUserId(null);
      setCart({ items: [], total: 0 });
    };

    window.addEventListener("userLogin",  handleLogin  as EventListener);
    window.addEventListener("userLogout", handleLogout as EventListener);
    return () => {
      window.removeEventListener("userLogin",  handleLogin  as EventListener);
      window.removeEventListener("userLogout", handleLogout as EventListener);
    };
  }, []);

  // ── addVariantToCart — for products that have size variants ──────────────
  const addVariantToCart = (product: Product, variant: ProductVariant, quantity: number) => {
    if (quantity <= 0) return;

    const pId  = String(product.id);
    const vItem: CartVariantItem = {
            variantId: `${variant.id}-${(variant.color || garmentMeta?.selectedColor || "").toLowerCase() || "default"}`,
      size:      variant.size  || "",
      color:     variant.color || product.attributes?.color || "",
      price:     variant.rate  || variant.mrp || product.price,
      mrp:       variant.mrp   || product.price,
      quantity,
      stock:     variant.qty,
      rack:      variant.rack  || "",
    };

    setCart((prev) => {
      const existingProduct = prev.items.find((i) => i.productId === pId);

      let newItems: CartItem[];
      if (existingProduct) {
        // Product already in cart — update or add variant
        const hasVariant = existingProduct.variants.find((v) => v.variantId === variant.id);
        newItems = prev.items.map((item) =>
          item.productId !== pId
            ? item
            : {
                ...item,
                variants: hasVariant
                  ? item.variants.map((v) =>
                      v.variantId === variant.id
                        ? { ...v, quantity: v.quantity + quantity }
                        : v
                    )
                  : [...item.variants, vItem],
              }
        );
      } else {
        // New product - include all attributes
        newItems = [
          ...prev.items,
          {
            productId:      pId,
            productName:    product.name,
            image:          product.image ?? null,
            brand:          product.brand || product.attributes?.brand || "",
            model:          product.model || product.attributes?.model || "",
            businessTypeId: product.business_type_id ?? null,
            attributes:     product.attributes ?? {},
            variants:       [vItem],
          },
        ];
      }

      toast.success(
        `Added ${quantity}× ${product.name}${variant.size ? ` (${variant.size})` : ""}`
      );
      return { items: newItems, total: calcTotal(newItems) };
    });
  };

  const addGarmentBundle = (
    product: Product,
    variants: Array<ProductVariant & { quantity: number; color?: string; setQuantity?: number }>,
    garmentMeta?: CartItem["garmentMeta"]
  ) => {
    const validVariants = variants.filter((variant) => variant.quantity > 0);
    if (validVariants.length === 0) return;

    const pId = String(product.id);
    const incomingVariants: CartVariantItem[] = validVariants.map((variant) => ({
      variantId: variant.id,
      size: variant.size || "",
      color: variant.color || garmentMeta?.selectedColor || product.attributes?.color || "",
      price: variant.rate || variant.mrp || product.price,
      mrp: variant.mrp || product.price,
      quantity: variant.quantity,
      stock: variant.qty,
      rack: variant.rack || "",
      setQuantity: variant.setQuantity,
    }));

    setCart((prev) => {
      const existingProduct = prev.items.find((item) => item.productId === pId);

      let newItems: CartItem[];
      if (existingProduct) {
        newItems = prev.items.map((item) => {
          if (item.productId !== pId) return item;

          const mergedVariants = [...item.variants];
          incomingVariants.forEach((incomingVariant) => {
            const existingIndex = mergedVariants.findIndex(
              (variant) =>
                variant.variantId === incomingVariant.variantId &&
                variant.color === incomingVariant.color
            );

            if (existingIndex >= 0) {
              mergedVariants[existingIndex] = {
                ...mergedVariants[existingIndex],
                quantity: mergedVariants[existingIndex].quantity + incomingVariant.quantity,
                setQuantity: (mergedVariants[existingIndex].setQuantity ?? 0) + (incomingVariant.setQuantity ?? 0),
              };
            } else {
              mergedVariants.push(incomingVariant);
            }
          });

          return {
            ...item,
            garmentMeta: garmentMeta ?? item.garmentMeta,
            variants: mergedVariants,
          };
        });
      } else {
        newItems = [
          ...prev.items,
          {
            productId: pId,
            productName: product.name,
            image: product.image ?? null,
            brand: product.brand || product.attributes?.brand || "",
            model: product.model || product.attributes?.model || "",
            businessTypeId: product.business_type_id ?? null,
            attributes: product.attributes ?? {},
            variants: incomingVariants,
            garmentMeta,
            color: garmentMeta?.selectedColor ?? "",
          },
        ];
      }

      toast.success(`Added ${incomingVariants.length} garment line${incomingVariants.length > 1 ? "s" : ""}`);
      return { items: newItems, total: calcTotal(newItems) };
    });
  };

  // ── addToCart — for products WITHOUT variants (simple product) ────────────
  const addToCart = (product: Product, quantity: number) => {
    if (quantity <= 0) return;

    // If product has variants, delegate to addVariantToCart
    if (product.variants && product.variants.length > 0) {
      // Add all variants or just call addVariantToCart for each — here we
      // treat the whole product as a single "no-size" variant (variantId = 0)
    }

    const pId = String(product.id);
    const vItem: CartVariantItem = {
      variantId: 0,           // 0 = no variant
      size:      product.attributes?.size  || "",
      color:     product.attributes?.color || "",
      price:     product.price,
      mrp:       Number(product.attributes?.mrp) || product.price,
      quantity,
      stock:     product.stock,
      rack:      product.attributes?.rack || "",
    };

    setCart((prev) => {
      const existingProduct = prev.items.find((i) => i.productId === pId);

      let newItems: CartItem[];
      if (existingProduct) {
        // Update quantity of the single variant (variantId 0)
        newItems = prev.items.map((item) =>
          item.productId !== pId
            ? item
            : {
                ...item,
                variants: item.variants.some((v) => v.variantId === 0)
                  ? item.variants.map((v) =>
                      v.variantId === 0 ? { ...v, quantity: v.quantity + quantity } : v
                    )
                  : [...item.variants, vItem],
              }
        );
      } else {
        // New product - include all attributes
        newItems = [
          ...prev.items,
          {
            productId:      pId,
            productName:    product.name,
            image:          product.image ?? null,
            brand:          product.brand || product.attributes?.brand || "",
            model:          product.model || product.attributes?.model || "",
            businessTypeId: product.business_type_id ?? null,
            attributes:     product.attributes ?? {},
            variants:       [vItem],
          },
        ];
      }

      toast.success(`Added ${quantity}× ${product.name} to cart`);
      return { items: newItems, total: calcTotal(newItems) };
    });
  };

  // ── removeFromCart — remove entire product (all sizes) ───────────────────
  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const newItems = prev.items.filter((i) => i.productId !== productId);
      return { items: newItems, total: calcTotal(newItems) };
    });
  };

  // ── removeVariant — remove one size from a product ───────────────────────
  const removeVariant = (productId: string, variantId: number | string) => {
    setCart((prev) => {
      const newItems = prev.items
        .map((item) =>
          item.productId !== productId
            ? item
            : { ...item, variants: item.variants.filter((v) => v.variantId !== variantId) }
        )
        .filter((item) => item.variants.length > 0); // remove product if no variants left
      return { items: newItems, total: calcTotal(newItems) };
    });
  };

  // ── updateQuantity — update qty of the single (no-variant) product ───────
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setCart((prev) => {
      const newItems = prev.items.map((item) =>
        item.productId !== productId
          ? item
          : {
              ...item,
              variants: item.variants.map((v) =>
                v.variantId === 0 ? { ...v, quantity } : v
              ),
            }
      );
      return { items: newItems, total: calcTotal(newItems) };
    });
  };

  // ── updateVariantQty — update qty of a specific size ─────────────────────
  const updateVariantQty = (productId: string, variantId: number | string, quantity: number) => {
    if (quantity <= 0) { removeVariant(productId, variantId); return; }
    setCart((prev) => {
      const newItems = prev.items.map((item) =>
        item.productId !== productId
          ? item
          : {
              ...item,
              variants: item.variants.map((v) =>
                v.variantId === variantId ? { ...v, quantity } : v
              ),
            }
      );
      return { items: newItems, total: calcTotal(newItems) };
    });
  };

  const clearCart = () => {
    setCart({ items: [], total: 0 });
    localStorage.removeItem(getCartKey(userId));
  };

  const cartCount = calcCount(cart.items);
  const cartTotal = calcTotal(cart.items);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        addVariantToCart,
        addGarmentBundle,
        removeFromCart,
        removeVariant,
        updateQuantity,
        updateVariantQty,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
