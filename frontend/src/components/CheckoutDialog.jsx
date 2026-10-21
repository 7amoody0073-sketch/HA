import { useState } from "react";
import { Bike, MessageCircle, Store } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api, { apiBaseUrl, formatApiError, formatPrice } from "@/lib/api";
import { useCart } from "@/context/CartContext";

const EMPTY = { customer_name: "", phone: "", address: "", order_date: "", notes: "" };
const ORDER_WHATSAPP = "97339047775";

export default function CheckoutDialog({ open, onOpenChange }) {
  const { items, total, clear } = useCart();
  const [form, setForm] = useState(EMPTY);
  const [fulfillment, setFulfillment] = useState("delivery");
  const [area, setArea] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const close = (v) => {
    onOpenChange(v);
    if (!v && order) {
      setOrder(null);
      setError("");
      setForm(EMPTY);
      setArea("");
      setFulfillment("delivery");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const orderLines = items.map((item) =>
      `- ${item.product.name}${item.optionName ? ` (${item.optionName})` : ""} × ${item.quantity}: ${formatPrice(item.price * item.quantity)}`
    );
    const message = [
      "السلام عليكم، أود تأكيد هذا الطلب:",
      `الاسم: ${form.customer_name}`,
      `الهاتف: ${form.phone}`,
      `نوع الطلب: ${fulfillment === "pickup" ? "استلام من المحل" : "توصيل"}`,
      ...(fulfillment === "delivery" ? [`المنطقة: ${area}`, `العنوان: ${form.address}`] : []),
      ...(form.order_date ? [`التاريخ المطلوب: ${form.order_date}`] : []),
      "",
      ...orderLines,
      `قيمة الأصناف: ${formatPrice(total)}`,
      ...(fulfillment === "delivery" ? ["رسوم التوصيل: يرجى التأكيد"] : []),
      ...(form.notes ? [`ملاحظات: ${form.notes}`] : []),
    ].join("\n");
    const whatsappUrl = `https://wa.me/${ORDER_WHATSAPP}?text=${encodeURIComponent(message)}`;
    setError("");

    if (!apiBaseUrl) {
      setOrder({ total, fulfillment, whatsappUrl, saved: false });
      toast.info("سيُرسل الطلب مباشرة إلى المحل عبر واتساب");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_name: form.customer_name,
        phone: form.phone,
        fulfillment,
        delivery_area: area,
        address: form.address,
        order_date: form.order_date,
        notes: form.notes,
        items: items.map((item) => ({
          product_id: item.product.id,
          option_name: item.optionName,
          quantity: item.quantity,
        })),
      };
      const { data } = await api.post("/orders", payload);
      const savedMessage = [
        "السلام عليكم، أؤكد الطلب المسجل في الموقع:",
        `رقم الطلب: ${data.order_number}`,
        `الاسم: ${form.customer_name}`,
        `الهاتف: ${form.phone}`,
        `نوع الطلب: ${fulfillment === "pickup" ? "استلام من المحل" : "توصيل"}`,
        ...(fulfillment === "delivery" ? [`المنطقة: ${area}`, `العنوان: ${form.address}`] : []),
        ...(form.order_date ? [`التاريخ المطلوب: ${form.order_date}`] : []),
        "",
        ...orderLines,
        `الإجمالي: ${formatPrice(data.total)}`,
        ...(form.notes ? [`ملاحظات: ${form.notes}`] : []),
      ].join("\n");
      setOrder({
        total: data.total,
        fulfillment,
        order_number: data.order_number,
        whatsappUrl: `https://wa.me/${ORDER_WHATSAPP}?text=${encodeURIComponent(savedMessage)}`,
        saved: true,
      });
      clear();
      toast.success("تم حفظ الطلب في الموقع");
    } catch (err) {
      setError(formatApiError(err, "تعذّر حفظ الطلب"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="checkout-dialog">
        {order ? (
          <div className="py-8 text-center" data-testid="order-whatsapp-fallback">
            <MessageCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <DialogHeader>
              <DialogTitle className="font-serif text-3xl font-bold text-center">
                {order.saved ? "تم تسجيل طلبك" : "أرسل طلبك عبر واتساب"}
              </DialogTitle>
            </DialogHeader>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
                {order.saved
                  ? <>تم حفظ الطلب برقم <span className="font-bold text-foreground">{order.order_number}</span>. أرسل تفاصيله للمحل عبر واتساب لتأكيده.</>
                  : "الطلب لا يُحفظ في الموقع. أرسله إلى المحل عبر واتساب لتأكيده."}
                <br />
                قيمة الأصناف: <span className="font-bold text-foreground">{formatPrice(order.total)}</span>
                {order.fulfillment === "delivery" && <><br />سيتم تأكيد رسوم التوصيل عبر واتساب.</>}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={order.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => !order.saved && clear()}
                data-testid="order-whatsapp-send"
                className="rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground transition-colors duration-300 hover:bg-secondary hover:text-secondary-foreground"
              >
                {order.saved ? "إرسال تفاصيل الطلب للمحل عبر واتساب" : "إرسال الطلب عبر واتساب"}
              </a>
              <button
                onClick={() => close(false)}
                className="rounded-full bg-foreground text-background px-8 py-3 font-bold transition-colors duration-300 hover:bg-primary hover:text-primary-foreground"
              >
                رجوع
              </button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-bold">بيانات الطلب</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4 mt-2" data-testid="checkout-form">
              <div className="grid grid-cols-2 gap-3" data-testid="fulfillment-toggle">
                <button
                  type="button"
                  onClick={() => setFulfillment("delivery")}
                  data-testid="fulfillment-delivery"
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-bold transition-colors duration-300 ${
                    fulfillment === "delivery" ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Bike className="w-5 h-5" />
                  توصيل
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillment("pickup")}
                  data-testid="fulfillment-pickup"
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-bold transition-colors duration-300 ${
                    fulfillment === "pickup" ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Store className="w-5 h-5" />
                  استلام من المحل
                </button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="co-name">الاسم الكريم</Label>
                <Input id="co-name" required minLength={2} value={form.customer_name} onChange={set("customer_name")} placeholder="مثال: الحاج جعفر" data-testid="checkout-name-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-phone">رقم الهاتف</Label>
                <Input id="co-phone" required minLength={8} dir="ltr" className="text-right" value={form.phone} onChange={set("phone")} placeholder="3XXXXXXX" data-testid="checkout-phone-input" />
              </div>

              {fulfillment === "delivery" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-area">منطقة التوصيل</Label>
                    <Input id="co-area" required value={area} onChange={(e) => setArea(e.target.value)} placeholder="اكتب منطقتك" data-testid="checkout-area-input" />
                    <p className="text-xs text-muted-foreground">سيتم تأكيد توفر التوصيل والرسوم عبر واتساب.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-address">عنوان التوصيل</Label>
                    <Input id="co-address" required={fulfillment === "delivery"} minLength={3} value={form.address} onChange={set("address")} placeholder="الطريق، رقم المنزل، أقرب معلم" data-testid="checkout-address-input" />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="co-notes">ملاحظات (اختياري)</Label>
                <Textarea id="co-notes" rows={2} value={form.notes} onChange={set("notes")} placeholder="وقت مفضل، بدون مكسرات..." data-testid="checkout-notes-input" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="co-date">تاريخ {fulfillment === "pickup" ? "الاستلام" : "التوصيل"} (اختياري)</Label>
                <Input id="co-date" type="date" dir="ltr" className="text-right" min={new Date().toISOString().slice(0, 10)} value={form.order_date} onChange={set("order_date")} data-testid="checkout-date-input" />
              </div>

              {error && <p className="text-sm text-destructive" role="alert" data-testid="checkout-error">{error}</p>}

              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">قيمة الطلب</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">رسوم التوصيل</span>
                  <span data-testid="checkout-delivery-fee">{fulfillment === "pickup" ? "مجاناً" : "يؤكد عبر واتساب"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">قيمة الأصناف</span>
                  <span className="font-serif font-bold text-xl" data-testid="checkout-total">{formatPrice(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || items.length === 0 || (fulfillment === "delivery" && !area)}
                data-testid="checkout-submit-button"
                className="w-full rounded-full bg-primary py-4 font-bold text-primary-foreground transition-colors duration-300 hover:bg-secondary hover:text-secondary-foreground disabled:opacity-50"
              >
                {saving ? "جارٍ تسجيل الطلب..." : apiBaseUrl ? "تسجيل الطلب" : "متابعة إلى واتساب لإرسال الطلب"}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
