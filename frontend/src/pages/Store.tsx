import { useState } from "react";
import { Coffee, MessageCircle, Minus, Plus, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme/mode-toggle";
import UserMenu from "@/components/layout/user-menu";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import ChatBox from "@/components/chats/chat-box";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/api/products";
import type { Product } from "@/api/products";
import { Spinner } from "@/components/ui/spinner";

export function Store() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isChatOpen, setIsChatOpen] = useState(false);

  const {
    data: products = [],
    isLoading,
    error,
  } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const categoryOrder = ["Coffee", "Drinking Chocolate", "Flavours", "Bakery", "Packaged Chocolate"];
  const sortedProducts = [...products].sort(
    (a, b) =>
      (categoryOrder.indexOf(a.category) === -1 ? categoryOrder.length : categoryOrder.indexOf(a.category)) -
      (categoryOrder.indexOf(b.category) === -1 ? categoryOrder.length : categoryOrder.indexOf(b.category))
  );

  const getQuantity = (id: string) => quantities[id] || 0;

  const updateQuantity = (id: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const totalItems = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const totalPrice = Object.entries(quantities).reduce((sum, [id, qty]) => {
    const product = products.find((p) => p._id === id);
    return sum + (product?.price || 0) * qty;
  }, 0);

  const handleCheckOut = () => {
    if (totalItems === 0) {
      toast.error("Please add at least one item to your order.");
      return;
    }

    const orderItems = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = products.find((p) => p._id === id);
        return `${qty}x ${product?.name}`;
      })
      .join(", ");

    toast.success(`Order placed! ${orderItems}. Total: $${totalPrice.toFixed(2)}`);
    setQuantities({});
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* HEADER */}
      <div className="w-full p-4 md:p-8 flex justify-between bg-muted">
        <div className="flex gap-2 items-center justify-center">
          <Coffee className="text-primary" />
          <h1 className="text-2xl font-bold text-primary">Version Coffee</h1>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
          <ModeToggle />
        </div>
      </div>

      {/* STORE CONTENT */}
      <div className="relative flex-1 overflow-auto p-4 md:p-8 pb-32">
        {/* CHATBOT TOGGLE BUTTON */}
        <Button
          onClick={() => setIsChatOpen((prev) => !prev)}
          className="sticky top-0 ml-auto z-50 shadow-lg float-right flex gap-2"
        >
          <MessageCircle className="h-5 w-5" />
          Order via Chatbot
        </Button>

        {/* CHATBOX */}
        {isChatOpen && (
          <ChatBox
            onClose={() => setIsChatOpen(false)}
            products={products}
            setQuantities={setQuantities}
          />
        )}

        <div className="mx-auto">
          <h2 className="text-xl font-semibold mb-1">Our Menu</h2>
          <p className="text-muted-foreground mb-6">
            Select your favorites below, or ask the chatbot for more details and to place your order.
          </p>

          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <Spinner />
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-destructive">Failed to load products.</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedProducts.map((product) => {
                const qty = getQuantity(product._id);
                return (
                  <Card
                    key={product._id}
                    className={`transition-all ${qty > 0 ? "ring-2 ring-primary" : ""}`}
                  >
                    <CardContent className="flex flex-col gap-3">
                      <div className="relative">
                        <img
                          src={product.image_path}
                          alt={product.name}
                          className="w-full h-40 object-cover rounded-md"
                        />
                        <span className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {product.category}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-semibold text-lg">{product.name}</h3>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-bold text-primary text-lg">
                          ${product.price.toFixed(2)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(product._id, -1)}
                            disabled={qty === 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center font-medium">{qty}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(product._id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CHECK OUT BAR */}
      <div className="bg-muted p-4 md:px-8 z-40">
        <div className="mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <span className="font-bold text-lg">${totalPrice.toFixed(2)}</span>
          </div>
          <Button
            onClick={handleCheckOut}
            disabled={totalItems === 0}
            className="px-8"
          >
            Check Out
          </Button>
        </div>
      </div>




    </div>
  );
}

export default Store;
