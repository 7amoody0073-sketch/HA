import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { apiBaseUrl, formatApiError, formatPrice } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["بقلاوة", "كليجة (زنجباري)", "سمبوسة", "معجنات", "مشروبات", "بارسلات", "أخرى"];
const EMPTY = { name: "", description: "", price: "", unit: "حبة", category: "معجنات", image: "", available: true, featured: false, options: [] };

export default function ProductsManager({ onChange }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/products");
      setProducts(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditing("new"); };
  const openEdit = (p) => { setForm({ ...p }); setEditing(p.id); };

  const compressImage = async (file) => {
    const source = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.72, 0.62, 0.52]) {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= 375 * 1024) {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error("تعذّرت قراءة الصورة"));
            reader.readAsDataURL(blob);
          });
        }
      }
      throw new Error("حجم الصورة كبير؛ اختر صورة أصغر");
    } finally {
      URL.revokeObjectURL(source);
    }
  };

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      const { data } = await api.post("/admin/upload", { data_url: dataUrl });
      setForm((current) => ({ ...current, image: `${apiBaseUrl}${data.url}` }));
      toast.success("تم رفع الصورة وحفظها");
    } catch (err) {
      toast.error(formatApiError(err, err.message || "فشل رفع الصورة"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };
  const addOption = () => setForm((f) => ({ ...f, options: [...(f.options || []), { name: "", price: "" }] }));
  const setOption = (idx, k, v) => setForm((f) => ({ ...f, options: (f.options || []).map((o, i) => (i === idx ? { ...o, [k]: v } : o)) }));
  const removeOption = (idx) => setForm((f) => ({ ...f, options: (f.options || []).filter((_, i) => i !== idx) }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: parseFloat(form.price) || 0,
      options: (form.options || []).filter((o) => o.name.trim() && o.price !== "").map((o) => ({ name: o.name.trim(), price: parseFloat(o.price) || 0 })),
    };
    try {
      if (editing === "new") await api.post("/admin/products", payload);
      else await api.put(`/admin/products/${editing}`, payload);
      toast.success("تم حفظ المنتج");
      setEditing(null);
      await load();
      onChange?.();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/admin/products/${deleting.id}`);
      toast.success("تم حذف المنتج");
      setDeleting(null);
      await load();
      onChange?.();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div data-testid="products-manager">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">{products.length} منتج</p>
        <button
          onClick={openNew}
          data-testid="product-add-button"
          className="flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-bold transition-colors duration-300 hover:bg-primary hover:text-primary-foreground"
        >
          <Plus className="w-4 h-4" />
          إضافة منتج
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-10 text-center">جارٍ التحميل...</p>
      ) : (
        <div className="bg-card border border-border/40 rounded-xl overflow-x-auto">
          <table className="w-full text-sm" data-testid="products-table">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground text-xs">
                <th className="text-right p-4 font-medium">المنتج</th>
                <th className="text-right p-4 font-medium">التصنيف</th>
                <th className="text-right p-4 font-medium">السعر</th>
                <th className="text-right p-4 font-medium">متوفر</th>
                <th className="text-right p-4 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border/30 last:border-0" data-testid={`product-row-${p.id}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={p.image || "https://images.unsplash.com/photo-1595353611215-3ea27a66f0b6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwzfHxhcmFiaWMlMjBzd2VldHN8ZW58MHx8fHwxNzg2NzkzMjQ4fDA&ixlib=rb-4.1.0&q=85"} alt="" className="w-11 h-11 rounded-lg object-cover warm-img" />
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">/ {p.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{p.category}</td>
                  <td className="p-4 font-bold whitespace-nowrap">{formatPrice(p.price)}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${p.available ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"}`}>
                      {p.available ? "متوفر" : "موقوف"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} data-testid={`product-edit-${p.id}`} className="p-2 rounded-lg hover:bg-accent transition-colors" aria-label="تعديل">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleting(p)} data-testid={`product-delete-${p.id}`} className="p-2 rounded-lg hover:bg-red-50 hover:text-destructive transition-colors" aria-label="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="product-form-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold">{editing === "new" ? "منتج جديد" : "تعديل المنتج"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3 mt-1" data-testid="product-form">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>اسم المنتج</Label>
                <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} data-testid="product-name-input" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>الوصف</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} data-testid="product-desc-input" />
              </div>
              <div className="space-y-1.5">
                <Label>السعر (د.ب)</Label>
                <Input required type="number" step="0.001" min="0" dir="ltr" className="text-left" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} data-testid="product-price-input" />
              </div>
              <div className="space-y-1.5">
                <Label>الوحدة</Label>
                <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="كيلو / صينية / حبة" data-testid="product-unit-input" />
              </div>
              <div className="space-y-1.5">
                <Label>التصنيف</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="product-category-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>صورة المنتج</Label>
                {form.image && (
                  <img src={form.image} alt="معاينة" className="w-24 h-24 rounded-xl object-cover warm-img border border-border/60" data-testid="product-image-preview" />
                )}
                <label
                  data-testid="product-image-upload-label"
                  className={`flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl px-4 py-4 text-sm font-bold cursor-pointer transition-colors duration-300 hover:border-primary hover:text-primary ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <input type="file" accept="image/*" className="hidden" onChange={uploadImage} data-testid="product-image-file-input" />
                  {uploading ? "جارٍ ضغط الصورة ورفعها..." : "ارفع صورة من جهازك"}
                </label>
                <Input dir="ltr" className="text-left" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="أو الصق رابط صورة https://..." data-testid="product-image-input" />
                <p className="text-xs text-muted-foreground">تُضغط الصور تلقائياً وتُحفظ في قاعدة البيانات المجانية.</p>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>خيارات الحجم (اختياري) — مثل: صحن نصف كيلو / صحن كيلو</Label>
                {(form.options || []).map((o, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input placeholder="اسم الخيار" value={o.name} onChange={(e) => setOption(idx, "name", e.target.value)} data-testid={`option-name-${idx}`} />
                    <Input type="number" step="0.001" min="0" dir="ltr" className="text-left w-24 shrink-0" placeholder="السعر" value={o.price} onChange={(e) => setOption(idx, "price", e.target.value)} data-testid={`option-price-${idx}`} />
                    <button type="button" onClick={() => removeOption(idx)} className="p-2 text-muted-foreground hover:text-destructive transition-colors shrink-0" aria-label="حذف الخيار" data-testid={`option-remove-${idx}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addOption} className="text-sm font-bold text-primary hover:text-secondary transition-colors" data-testid="option-add-button">
                  + إضافة خيار حجم
                </button>
                <p className="text-xs text-muted-foreground leading-relaxed">إذا أضفت خيارات، الزبون يختار الحجم من المنيو والسعر يتحدد من الخيار — والسعر الأساسي فوق يصير احتياطي</p>
              </div>
              <div className="flex items-center justify-between col-span-2 border border-border/60 rounded-xl px-4 py-3">
                <Label>متوفر في المنيو</Label>
                <Switch checked={form.available} onCheckedChange={(v) => setForm((f) => ({ ...f, available: v }))} data-testid="product-available-switch" />
              </div>
            </div>
            <button type="submit" disabled={saving} data-testid="product-save-button" className="w-full rounded-full bg-foreground text-background py-3.5 font-bold transition-colors duration-300 hover:bg-primary hover:text-primary-foreground disabled:opacity-50">
              {saving ? "جارٍ الحفظ..." : "حفظ المنتج"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent data-testid="product-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف "{deleting?.name}"؟</AlertDialogTitle>
            <AlertDialogDescription>سيُحذف المنتج نهائياً من المنيو ولا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="product-delete-cancel">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="product-delete-confirm">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
