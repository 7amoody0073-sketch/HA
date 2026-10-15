import { useEffect, useRef, useState } from "react";
import { Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError, formatPrice } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const STATUS = {
  new: { label: "جديد", cls: "bg-primary/15 text-secondary border-primary/30" },
  confirmed: { label: "مؤكد", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  preparing: { label: "قيد التحضير", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  delivered: { label: "تم التوصيل", cls: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "ملغي", cls: "bg-red-50 text-red-600 border-red-200" },
};

export default function OrdersManager({ onChange }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const q = query.trim().toLowerCase();
  const day = (o) => o.order_date || (o.created_at || "").slice(0, 10);
  const filtered = orders.filter((o) => {
    const matchesQ = !q || o.order_number.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q) || o.phone.includes(q);
    const matchesD = !dateFilter || day(o) === dateFilter;
    return matchesQ && matchesD;
  });

  const knownIds = useRef(null);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      o.start();
      o.stop(ctx.currentTime + 0.6);
    } catch { /* صوت اختياري */ }
  };

  const load = async (silent = false) => {
    try {
      const { data } = await api.get("/admin/orders");
      if (knownIds.current !== null) {
        const fresh = data.filter((o) => !knownIds.current.has(o.id) && o.status === "new");
        if (fresh.length > 0) {
          toast.success(`طلب جديد! ${fresh[0].order_number} — ${fresh[0].customer_name}`, { duration: 10000 });
          playBeep();
          onChange?.();
        }
      }
      knownIds.current = new Set(data.map((o) => o.id));
      setOrders(data);
    } catch (e) {
      if (!silent) toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (id, status) => {
    try {
      const { data } = await api.patch(`/admin/orders/${id}/status`, { status });
      setOrders((prev) => prev.map((o) => (o.id === id ? data : o)));
      toast.success("تم تحديث حالة الطلب");
      onChange?.();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/admin/orders/${deleting.id}`);
      toast.success(`تم حذف الطلب ${deleting.order_number}`);
      setDeleting(null);
      await load();
      onChange?.();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const PAY_LABEL = {
    unpaid: { label: "غير مدفوع", cls: "bg-muted text-muted-foreground border-border hover:border-primary hover:text-primary" },
    deposit: { label: "تم دفع مقدم", cls: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
    paid: { label: "مدفوع", cls: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" },
  };

  const payState = (o) => o.payment || (o.paid ? "paid" : "unpaid");

  const waLink = (o) => {
    let digits = (o.phone || "").replace(/\D/g, "");
    if (digits.length === 8) digits = "973" + digits;
    const msg =
      o.status === "cancelled"
        ? `حلويات الحلواچي: نعتذر منك، طلبك ${o.order_number} غير متوفر حالياً. تواصل معنا لطلب بديل أو استرجاع المبلغ.`
        : `حلويات الحلواچي: السلام عليكم، بخصوص طلبك ${o.order_number} — `;
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };

  const cyclePayment = async (o) => {
    const order = ["unpaid", "deposit", "paid"];
    const next = order[(order.indexOf(payState(o)) + 1) % order.length];
    try {
      const { data } = await api.patch(`/admin/orders/${o.id}/payment`, { payment: next });
      setOrders((prev) => prev.map((x) => (x.id === o.id ? data : x)));
      toast.success(`حالة الدفع: ${PAY_LABEL[next].label}`);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (loading) return <p className="text-muted-foreground py-10 text-center">جارٍ تحميل الطلبات...</p>;

  if (orders.length === 0)
    return (
      <div className="bg-card border border-border/40 rounded-xl py-16 text-center text-muted-foreground" data-testid="orders-empty">
        لا توجد طلبات بعد — أول طلب من الموقع سيظهر هنا.
      </div>
    );

  return (
    <div className="space-y-4" data-testid="orders-list">
      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث برقم الطلب (HW-1005) أو اسم الزبون أو رقم الجوال..."
          className="bg-card flex-1 min-w-52"
          data-testid="orders-search-input"
        />
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="bg-card w-44"
          dir="ltr"
          data-testid="orders-date-filter"
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter("")}
            data-testid="orders-date-clear"
            className="text-xs font-bold rounded-full border border-border px-4 text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
          >
            مسح التاريخ
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-2" data-testid="orders-auto-refresh-hint">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
        تتحدّث الطلبات تلقائياً كل ٣٠ ثانية — ويطلع لك تنبيه مع صوت أول ما يوصل طلب جديد
      </p>
      {filtered.length === 0 && (
        <div className="bg-card border border-border/40 rounded-xl py-12 text-center text-muted-foreground" data-testid="orders-no-results">
          ما في طلب يطابق بحثك
        </div>
      )}
      {filtered.map((o) => (
        <article key={o.id} className="bg-card border border-border/40 rounded-xl p-5" data-testid={`order-row-${o.order_number}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-bold" data-testid={`order-number-${o.order_number}`}>{o.order_number}</span>
                <Badge variant="outline" className={STATUS[o.status]?.cls} data-testid={`order-status-badge-${o.order_number}`}>
                  {STATUS[o.status]?.label}
                </Badge>
                <button
                  onClick={() => cyclePayment(o)}
                  data-testid={`order-paid-toggle-${o.order_number}`}
                  className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors duration-300 ${PAY_LABEL[payState(o)].cls}`}
                >
                  {PAY_LABEL[payState(o)].label}
                </button>
              </div>
              <p className="text-sm mt-1.5">{o.customer_name} · <span dir="ltr">{o.phone}</span></p>
              <p className="text-xs text-muted-foreground mt-1" data-testid={`order-fulfillment-${o.order_number}`}>
                {o.fulfillment === "pickup" ? "استلام من المحل" : `توصيل${o.delivery_area ? ` — ${o.delivery_area}` : ""}`}
                {o.address ? ` · ${o.address}` : ""}
              </p>
              {o.delivery_fee > 0 && <p className="text-xs text-muted-foreground mt-0.5">رسوم التوصيل: {formatPrice(o.delivery_fee)}</p>}
              {o.order_date && (
                <p className="text-xs font-bold text-secondary mt-0.5" data-testid={`order-date-${o.order_number}`}>
                  موعد الطلب: {new Date(o.order_date + "T00:00:00").toLocaleDateString("ar-BH", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              )}
              {o.notes && <p className="text-xs text-muted-foreground mt-1">ملاحظات: {o.notes}</p>}
            </div>
            <div className="text-left">
              <p className="font-serif font-bold text-xl">{formatPrice(o.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString("ar-BH")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-border/40">
            <p className="text-sm text-muted-foreground">
              {o.items.map((i) => `${i.name} ×${i.quantity}`).join("، ")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {o.status === "new" && (
                <>
                  <button
                    onClick={() => setStatus(o.id, "confirmed")}
                    data-testid={`order-approve-${o.order_number}`}
                    className="rounded-full bg-green-600 text-white px-5 py-2 text-sm font-bold transition-colors duration-300 hover:bg-green-700"
                  >
                    قبول
                  </button>
                  <button
                    onClick={() => setStatus(o.id, "cancelled")}
                    data-testid={`order-reject-${o.order_number}`}
                    className="rounded-full border border-destructive/50 text-destructive px-5 py-2 text-sm font-bold transition-colors duration-300 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    رفض
                  </button>
                </>
              )}
              <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)}>
                <SelectTrigger className="w-44" data-testid={`order-status-select-${o.order_number}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <a
                href={waLink(o)}
                target="_blank"
                rel="noreferrer"
                data-testid={`order-whatsapp-${o.order_number}`}
                className="p-2.5 rounded-lg border border-border/60 text-muted-foreground hover:border-green-600 hover:text-green-600 hover:bg-green-50 transition-colors"
                aria-label="مراسلة الزبون واتساب"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <button
                onClick={() => setDeleting(o)}
                data-testid={`order-delete-${o.order_number}`}
                className="p-2.5 rounded-lg border border-border/60 text-muted-foreground hover:border-destructive hover:text-destructive hover:bg-red-50 transition-colors"
                aria-label="حذف الطلب"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </article>
      ))}

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent data-testid="order-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الطلب {deleting?.order_number}؟</AlertDialogTitle>
            <AlertDialogDescription>سيُحذف الطلب نهائياً ولا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="order-delete-cancel">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="order-delete-confirm">
              حذف الطلب
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
