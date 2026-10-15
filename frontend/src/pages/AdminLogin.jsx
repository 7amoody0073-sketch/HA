import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api, { formatApiError } from "@/lib/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("halwaji_token", data.token);
      navigate("/admin");
    } catch (err) {
      setError(formatApiError(err, "تعذّر تسجيل الدخول"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grain-overlay flex items-center justify-center px-6" data-testid="admin-login-page">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="font-serif text-4xl font-bold">الحلواچي</p>
          <p className="text-xs tracking-[0.3em] text-muted-foreground mt-2">لوحة تحكم الفرع</p>
        </div>
        <form onSubmit={submit} className="bg-card border border-border/60 rounded-2xl p-8 space-y-5 shadow-sm" data-testid="admin-login-form">
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">اسم المستخدم</Label>
            <Input
              id="admin-email"
              type="text"
              required
              dir="ltr"
              className="text-left"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              data-testid="admin-email-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-password">كلمة المرور</Label>
            <Input
              id="admin-password"
              type="password"
              required
              dir="ltr"
              className="text-left"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              data-testid="admin-password-input"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" data-testid="admin-login-error">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            data-testid="admin-login-submit"
            className="w-full rounded-full bg-foreground text-background py-3.5 font-bold transition-colors duration-300 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
        <button onClick={() => navigate("/")} className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="back-to-site-link">
          العودة إلى الموقع
        </button>
      </div>
    </div>
  );
}
