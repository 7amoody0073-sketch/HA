import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ShoppingBag, ClipboardList, Package, Coins, Bike } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import OrdersManager from "@/components/admin/OrdersManager";
import ProductsManager from "@/components/admin/ProductsManager";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem("halwaji_token")) {
      navigate("/admin/login");
      return;
    }
    api.get("/auth/me")
      .then(() => setReady(true))
      .catch(() => {
        localStorage.removeItem("halwaji_token");
        navigate("/admin/login");
      });
  }, [navigate]);

  const loadStats = async () => {
    try {
      const [orders, products] = await Promise.all([api.get("/admin/orders"), api.get("/admin/products")]);
      setStats({
        newOrders: orders.data.filter((o) => o.status === "new").length,
        totalOrders: orders.data.length,
        products: products.data.length,
        revenue: orders.data.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0),
        deliveryFees: orders.data.filter((o) => ["confirmed", "preparing", "delivered"].includes(o.status)).reduce((s, o) => s + (o.delivery_fee || 0), 0),
      });
    } catch {
      /* stats are decorative */
    }
  };

  useEffect(() => {
    if (ready) loadStats();
  }, [ready]);

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    localStorage.removeItem("halwaji_token");
    navigate("/admin/login");
  };

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-muted-foreground" data-testid="admin-loading">جارٍ التحميل...</div>;

  return (
    <div className="min-h-screen bg-[#FAFAF8]" data-testid="admin-dashboard">
      <header className="bg-card border-b border-border/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <p className="font-serif text-xl font-bold">
            الحلواچي <span className="text-xs font-sans font-normal text-muted-foreground tracking-widest">لوحة التحكم</span>
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="admin-view-site">
              عرض الموقع
            </button>
            <button
              onClick={logout}
              data-testid="admin-logout-button"
              className="flex items-center gap-2 text-sm rounded-full border border-border px-4 py-2 hover:border-destructive hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8" data-testid="admin-stats">
            {[
              { icon: ClipboardList, label: "طلبات جديدة", value: stats.newOrders },
              { icon: ShoppingBag, label: "إجمالي الطلبات", value: stats.totalOrders },
              { icon: Package, label: "المنتجات", value: stats.products },
              { icon: Coins, label: "إجمالي المبيعات", value: `${stats.revenue.toFixed(3)} د.ب` },
              { icon: Bike, label: "رسوم التوصيل", value: `${stats.deliveryFees.toFixed(3)} د.ب` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-card border border-border/40 rounded-xl p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                  <Icon className="w-4 h-4 text-primary" />
                  {label}
                </div>
                <p className="font-serif font-bold text-2xl">{value}</p>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="orders" dir="rtl">
          <TabsList className="mb-6" data-testid="admin-tabs">
            <TabsTrigger value="orders" data-testid="tab-orders">الطلبات</TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">المنتجات</TabsTrigger>
          </TabsList>
          <TabsContent value="orders">
            <OrdersManager onChange={loadStats} />
          </TabsContent>
          <TabsContent value="products">
            <ProductsManager onChange={loadStats} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
