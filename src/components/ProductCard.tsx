import { useState } from 'react';
import { Plus, Minus, ImageOff, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getImageUrl } from '@/lib/imageUrl';

interface ProductCardProps {
  product: Product;
}

function resolveProductColor(product: Partial<Product>): string {
  const c =
    (product as any).color ||
    product.attributes?.color ||
    product.attributes?.Color ||
    product.attributes?.colour ||
    product.attributes?.Colour ||
    (product as any).colour ||
    "";
  return String(c).trim();
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [quantity, setQuantity] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const {
    addToCart, cart, updateQuantity, removeFromCart,
    removeVariant, updateVariantQty, cartCount, cartTotal,
  } = useCart();

  const cartProduct = cart.items.find((i) => i.productId === product.id);
  const cartVariant = cartProduct?.variants.find((v) => v.variantId === 0) ?? null;
  const isOutOfStock = product.stock === 0;
  const productColor = resolveProductColor(product);

  const attrPills = Object.entries(product.attributes ?? {})
.filter(([k, v]) => v && !["mrp", "size", "color", "Color", "colour", "Colour"].includes(k))
.slice(0, 4);

  const handleIncrement   = () => setQuantity((p) => Math.min(p + 1, product.stock));
  const handleDecrement   = () => setQuantity((p) => Math.max(p - 1, 0));
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    setQuantity(!isNaN(v) ? Math.min(Math.max(v, 0), product.stock) : 0);
  };
  const handleAddToCart = () => {
    if (quantity > 0) {
      addToCart(product, quantity);
      setQuantity(0);
      setIsCartOpen(true);
    }
  };
  const handleCartQtyChange = (change: number) => {
    if (!cartVariant) return;
    const newQty = cartVariant.quantity + change;
    if (newQty < 1) removeFromCart(product.id);
    else updateQuantity(product.id, newQty);
  };

  const imageUrl  = getImageUrl(product.image);
  const showImage = imageUrl && !imgError;

  return (
    <>
      <Card className={`bg-white border overflow-hidden transition-all duration-200 flex flex-col ${
        isOutOfStock ? "opacity-60" : "hover:shadow-md hover:border-blue-200"
      } ${cartVariant ? "border-blue-200 ring-1 ring-blue-100" : ""}`}>

        {/* Image */}
        <div className="w-full h-36 border-b overflow-hidden flex-shrink-0 flex items-center justify-center">
          {showImage ? (
            <img
              src={imageUrl} alt={product.name}
              className="w-full h-full object-contain p-2"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-300">
              <ImageOff size={28} />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1">

          {/* Name + Price */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm text-gray-900 leading-snug line-clamp-2 flex-1">
              {product.name}
            </h3>
            <span className="text-sm font-bold text-blue-600 flex-shrink-0 whitespace-nowrap">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Brand · Model + Color */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
            {(product.brand || product.attributes?.brand || product.attributes?.Brand || product.model || product.attributes?.model || product.attributes?.Model) && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                {(product.brand || product.attributes?.brand || product.attributes?.Brand) && (
                  <span>
                    <span className="text-gray-400">Brand:</span>{" "}
                    <span className="font-medium text-gray-700">
                      {product.brand || product.attributes?.brand || product.attributes?.Brand}
                    </span>
                  </span>
                )}
                {(product.brand || product.attributes?.brand || product.attributes?.Brand) &&
                 (product.model || product.attributes?.model || product.attributes?.Model) && (
                  <span className="text-gray-300">·</span>
                )}
                {(product.model || product.attributes?.model || product.attributes?.Model) && (
                  <span>
                    <span className="text-gray-400">Model:</span>{" "}
                    <span className="font-medium text-gray-700">
                      {product.model || product.attributes?.model || product.attributes?.Model}
                    </span>
                  </span>
                )}
              </div>
            )}
            {productColor && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span className="text-gray-400">Color:</span>
                <span
                  className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                  style={{ backgroundColor: productColor.toLowerCase() }}
                />
                <span className="font-medium text-gray-700">{productColor}</span>
              </span>
            )}
          </div>

          {/* Attribute pills (RAM, Storage, etc.) */}
          {attrPills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attrPills.map(([k, v]) => (
                <span
                  key={k}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium capitalize"
                >
                  {k} : {v}
                </span>
              ))}
            </div>
          )}

          {/* In-cart indicator */}
          {cartVariant && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-1.5 mb-2 bg-blue-50 rounded-lg px-2 py-1.5 border border-blue-100 hover:bg-blue-100 transition-colors w-full text-left"
            >
              <ShoppingCart size={11} className="text-blue-500 flex-shrink-0" />
              <span className="text-[11px] text-blue-600 font-medium flex-1">
                {cartVariant.quantity} in cart — view cart
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeFromCart(product.id); }}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={11} />
              </button>
            </button>
          )}

          {/* Stock + Controls */}
          <div className="flex items-center justify-between mt-auto gap-2">
            {isOutOfStock ? (
              <Badge variant="outline" className="text-red-500 border-red-200 text-xs">
                Out of Stock
              </Badge>
            ) : (
              <Badge variant="secondary" className={`text-xs font-medium ${
                product.stock <= 5
                  ? "bg-orange-50 text-orange-600 border border-orange-200"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {product.stock <= 5 ? `Only ${product.stock} left` : `Stock: ${product.stock}`}
              </Badge>
            )}

            {cartVariant ? (
              <div className="flex items-center border border-blue-200 rounded-lg overflow-hidden bg-blue-50">
                <button
                  onClick={() => handleCartQtyChange(-1)}
                  className="px-2.5 py-1.5 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Minus size={12} />
                </button>
                <span className="px-2 text-sm font-semibold text-blue-700 min-w-[24px] text-center">
                  {cartVariant.quantity}
                </span>
                <button
                  onClick={() => handleCartQtyChange(1)}
                  disabled={cartVariant.quantity >= product.stock}
                  className="px-2.5 py-1.5 text-blue-600 hover:bg-blue-100 disabled:opacity-30 transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={handleDecrement}
                    disabled={quantity === 0}
                    className="px-2 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    <Minus size={11} />
                  </button>
                  <input
                    type="text" value={quantity} onChange={handleInputChange}
                    className="w-8 text-center text-xs font-medium text-gray-800 bg-white focus:outline-none"
                    min="0" max={product.stock}
                  />
                  <button
                    onClick={handleIncrement}
                    disabled={quantity >= product.stock}
                    className="px-2 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                </div>
                <Button
                  onClick={handleAddToCart}
                  disabled={quantity === 0 || isOutOfStock}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1 h-8 px-3 text-xs"
                >
                  <Plus size={11} /> Add
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </>
  );
};

export default ProductCard;