import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardList, CheckCircle2, XCircle, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api, { formatApiError, formatPrice } from "@/lib/api";

const STEPS = [
  { key: "new", label: "تم الاستلام", icon: ClipboardList },
  { key: "confirmed", label: "مؤكد", icon: CheckCircle2 },
];

const STATUS_LABEL = { new: "جديد", confirmed: "مؤكد", preparing: "قيد التحضير", delivered: "تم التوصيل", cancelled: "ملغي" };

export default function TrackOrder() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState("track");
  const [orderNumber, setOrderNumber] = useState(params.get("num") || "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState(null);
  const [myOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("halwaji_my_orders")) || [];
    } catch {
      return [];
    }
  });

  const searchOrder = async (num, ph) => {
    setError("");
    setOrder(null);
    setLoading(true);
    try {
      const { data } = await api.post("/orders/track", { order_number: num, phone: ph });
      setOrder(data);
    } catch (err) {
      setError(formatApiError(err, "لم نعثر على الطلب — تأكد من رقم الطلب ورقم الجوال"));
    } finally {
      setLoading(false);
    }
  };

  const submitTrack = (e) => {
    e.preventDefault();
    searchOrder(orderNumber, phone);
  };

  const submitHistory = async (e) => {
    e.preventDefault();
    setError("");
    setHistory(null);
    setOrder(null);
    setLoading(true);
    try {
      const { data } = await api.post("/orders/history", { phone });
      setHistory(data);
      if (data.length === 0) setError("ما لقينا طلبات على هذا الرقم");
    } catch (err) {
      setError(formatApiError(err, "تعذّر جلب الطلبات"));
    } finally {
      setLoading(false);
    }
  };

  const openFromHistory = (o) => {
    setMode("track");
    setOrderNumber(o.order_number);
    searchOrder(o.order_number, phone);
  };

  const currentStep = order ? (order.status === "new" ? 0 : 1) : -1;

  return (
    <div className="min-h-screen bg-background grain-overlay" data-testid="track-page">
      <header className="border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          <Link to="/" className="font-serif text-2xl font-bold" data-testid="track-logo">
            الحلواچي
            <span className="block text-[10px] font-sans font-normal tracking-[0.3em] text-muted-foreground">جد علي · البحرين</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="track-back-link">
            العودة للموقع
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-16 lg:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <p className="text-sm tracking-[0.3em] text-muted-foreground mb-3">تتبع الطلب</p>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl leading-snug mb-3">وين وصل طلبك؟</h1>
          <p className="text-muted-foreground text-sm sm:text-base mb-8">تتبّع طلب برقمه، أو شوف سجل كل طلباتك برقم جوالك.</p>

          <div className="flex gap-2 mb-6" data-testid="track-mode-toggle">
            <button
              onClick={() => { setMode("track"); setError(""); }}
              data-testid="track-mode-order"
              className={`flex-1 rounded-full py-2.5 text-sm font-bold transition-colors duration-300 ${mode === "track" ? "bg-foreground text-background" : "bg-card text-foreground/70 hover:bg-accent"}`}
            >
              برقم الطلب
            </button>
            <button
              onClick={() => { setMode("history"); setError(""); setOrder(null); }}
              data-testid="track-mode-history"
              className={`flex-1 rounded-full py-2.5 text-sm font-bold transition-colors duration-300 flex items-center justify-center gap-2 ${mode === "history" ? "bg-foreground text-background" : "bg-card text-foreground/70 hover:bg-accent"}`}
            >
              <History className="w-4 h-4" />
              سجل طلباتي
            </button>
          </div>

          {mode === "track" ? (
            <form onSubmit={submitTrack} className="bg-card border border-border/60 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm" data-testid="track-form">
              <div className="space-y-1.5">
                <Label htmlFor="track-num">رقم الطلب</Label>
                <Input id="track-num" required dir="ltr" className="text-left" placeholder="HW-1002" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} data-testid="track-order-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="track-phone">رقم الجوال</Label>
                <Input id="track-phone" required minLength={8} dir="ltr" className="text-left" placeholder="3XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="track-phone-input" />
              </div>
              {error && <p className="text-sm text-destructive" data-testid="track-error">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                data-testid="track-submit-button"
                className="w-full rounded-full bg-foreground text-background py-3.5 font-bold transition-colors duration-300 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              >
                {loading ? "جارٍ البحث..." : "تتبع الطلب"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitHistory} className="bg-card border border-border/60 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm" data-testid="history-form">
              <div className="space-y-1.5">
                <Label htmlFor="history-phone">رقم الجوال</Label>
                <Input id="history-phone" required minLength={8} dir="ltr" className="text-left" placeholder="3XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="history-phone-input" />
              </div>
              {myOrders.length > 0 && (
                <div className="flex flex-wrap items-center gap-2" data-testid="my-orders-chips">
                  <span className="text-xs text-muted-foreground">طلباتك من هذا الجهاز:</span>
                  {myOrders.map((o) => (
                    <button
                      key={o.order_number}
                      type="button"
                      onClick={() => { setPhone(o.phone); setMode("track"); setOrderNumber(o.order_number); searchOrder(o.order_number, o.phone); }}
                      data-testid={`my-order-chip-${o.order_number}`}
                      className="text-xs font-bold rounded-full bg-accent px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors duration-300"
                    >
                      {o.order_number}
                    </button>
                  ))}
                </div>
              )}
              {error && <p className="text-sm text-destructive" data-testid="history-error">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                data-testid="history-submit-button"
                className="w-full rounded-full bg-foreground text-background py-3.5 font-bold transition-colors duration-300 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              >
                {loading ? "جارٍ البحث..." : "عرض طلباتي"}
              </button>
            </form>
          )}

          {history && history.length > 0 && !order && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="mt-8 space-y-3" data-testid="history-list">
              {history.map((o) => (
                <button
                  key={o.order_number}
                  onClick={() => openFromHistory(o)}
                  data-testid={`history-item-${o.order_number}`}
                  className="w-full text-right bg-card border border-border/60 rounded-xl p-5 flex items-center justify-between gap-4 transition-colors duration-300 hover:border-primary"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{o.order_number}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full ${o.status === "cancelled" ? "bg-red-50 text-red-600" : o.status === "delivered" ? "bg-green-50 text-green-700" : "bg-primary/15 text-secondary"}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{new Date(o.created_at).toLocaleString("ar-BH")}</p>
                  </div>
                  <span className="font-serif font-bold text-lg shrink-0">{formatPrice(o.total)}</span>
                </button>
              ))}
            </motion.div>
          )}

          {order && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 bg-card border border-border/60 rounded-2xl p-6 sm:p-8 shadow-sm"
              data-testid="track-result"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="font-bold text-lg" data-testid="track-result-number">{order.order_number}</p>
                  {order.fulfillment && (
                    <p className="text-xs text-muted-foreground mt-0.5">{order.fulfillment === "pickup" ? "استلام من المحل" : `توصيل${order.delivery_area ? ` — ${order.delivery_area}` : ""}`}</p>
                  )}
                  {(order.payment === "paid" || (!order.payment && order.paid)) && <p className="text-xs font-bold text-green-700 mt-0.5" data-testid="track-paid-badge">مدفوع</p>}
                  {order.payment === "deposit" && <p className="text-xs font-bold text-amber-700 mt-0.5" data-testid="track-deposit-badge">تم دفع مقدم</p>}
                  {order.order_date && (
                    <p className="text-xs font-bold text-primary mt-0.5" data-testid="track-order-date">
                      الموعد: {new Date(order.order_date + "T00:00:00").toLocaleDateString("ar-BH", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleString("ar-BH")}</p>
                </div>
                <p className="font-serif font-bold text-xl" data-testid="track-result-total">{formatPrice(order.total)}</p>
              </div>

              {order.status === "cancelled" ? (
                <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 text-red-700 px-5 py-4" data-testid="track-cancelled-banner">
                  <XCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">نعتذر منك — المنتج غير متوفر حالياً. تواصل معنا على 39047775 لطلب بديل أو استرجاع المبلغ.</p>
                </div>
              ) : (
                <ol className="flex items-start justify-between gap-1 mb-8" data-testid="track-status-timeline">
                  {STEPS.map((s, i) => {
                    const done = i <= currentStep;
                    const Icon = s.icon;
                    return (
                      <li key={s.key} className="flex-1 flex flex-col items-center gap-2 relative" data-testid={`track-step-${s.key}`}>
                        {i > 0 && (
                          <span className={`absolute top-5 start-[-50%] end-[50%] h-0.5 ${done ? "bg-primary" : "bg-border"}`} />
                        )}
                        <span className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${done ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground"}`}>
                          <Icon className="w-4.5 h-4.5" />
                        </span>
                        <span className={`text-xs font-medium text-center ${done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                      </li>
                    );
                  })}
                </ol>
              )}

              <div className="border-t border-border/60 pt-5">
                <p className="text-xs text-muted-foreground mb-3">محتويات الطلب</p>
                <ul className="space-y-2">
                  {order.items.map((i) => (
                    <li key={i.product_id} className="flex items-center justify-between text-sm">
                      <span>{i.name} <span className="text-muted-foreground">×{i.quantity}</span></span>
                      <span className="font-medium">{formatPrice(i.line_total)}</span>
                    </li>
                  ))}
                  {order.delivery_fee > 0 && (
                    <li className="flex items-center justify-between text-sm text-muted-foreground" data-testid="track-delivery-fee">
                      <span>رسوم التوصيل</span>
                      <span className="font-medium">{formatPrice(order.delivery_fee)}</span>
                    </li>
                  )}
                </ul>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
