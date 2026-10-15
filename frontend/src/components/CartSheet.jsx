import { Minus, Plus, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/api";

export default function CartSheet({ open, onOpenChange, onCheckout }) {
  const { items, setQty, total } = useCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col p-0" data-testid="cart-sheet">
        <SheetHeader className="p-6 border-b border-border/60">
          <SheetTitle className="font-serif text-2xl font-bold">سلة الطلبات</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6" data-testid="cart-empty-state">
            <p className="font-serif text-xl">سلتك فارغة</p>
            <p className="text-sm">أضف شيئاً حلواً من المنيو</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-6">
              <ul className="space-y-6">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-4" data-testid={`cart-item-${item.key}`}>
                    <img src={item.product.image} alt={item.product.name} className="w-20 h-20 rounded-xl object-cover warm-img shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif font-bold leading-snug">
                          {item.product.name}
                          {item.optionName && (
                            <span className="block text-xs font-sans font-bold text-primary mt-0.5">{item.optionName}</span>
                          )}
                        </h4>
                        <button
                          onClick={() => setQty(item.key, 0)}
                          data-testid={`cart-remove-${item.key}`}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatPrice(item.price)} / {item.unit}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3 border border-border rounded-full px-2 py-1">
                          <button onClick={() => setQty(item.key, item.quantity - 1)} data-testid={`cart-decrease-${item.key}`} className="p-1 hover:text-primary transition-colors" aria-label="إنقاص">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-bold w-5 text-center" data-testid={`cart-qty-${item.key}`}>{item.quantity}</span>
                          <button onClick={() => setQty(item.key, item.quantity + 1)} data-testid={`cart-increase-${item.key}`} className="p-1 hover:text-primary transition-colors" aria-label="زيادة">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="font-bold text-secondary text-sm">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
            <div className="border-t border-border/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الإجمالي</span>
                <span className="font-serif font-bold text-2xl" data-testid="cart-total">{formatPrice(total)}</span>
              </div>
              <button
                onClick={onCheckout}
                data-testid="checkout-open-button"
                className="w-full rounded-full bg-primary py-4 font-bold text-primary-foreground transition-colors duration-300 hover:bg-secondary hover:text-secondary-foreground"
              >
                إتمام الطلب — الدفع عند الاستلام
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
