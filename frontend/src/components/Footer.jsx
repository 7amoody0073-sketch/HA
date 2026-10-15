import { Link } from "react-router-dom";
import { Clock, MapPin, Phone, Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#14100a] text-white/80 grain-overlay relative" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div>
          <img src="/logo.png" alt="الحلواچي" className="w-20 h-20 rounded-full ring-1 ring-primary/40 object-cover" />
          <p className="font-serif text-3xl font-bold text-white mt-4">الحلواچي</p>
        </div>
        <div className="space-y-4">
          <h4 className="font-serif font-bold text-xl text-white">فروعنا</h4>
          <div>
            <p className="text-sm font-bold text-primary mb-1.5">فرع جد علي</p>
            <p className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span data-testid="footer-address">جد علي، مملكة البحرين — الشارع الرئيسي</span>
            </p>
            <p className="flex items-center gap-3 text-sm mt-1.5" dir="ltr">
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <span data-testid="footer-phone" className="[direction:ltr]">+973 3904 7775</span>
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-primary mb-1.5">فرع المنامة</p>
            <p className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span data-testid="footer-address-manama">المنامة، مملكة البحرين</span>
            </p>
            <p className="flex items-center gap-3 text-sm mt-1.5" dir="ltr">
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <span data-testid="footer-phone-manama" className="[direction:ltr]">+973 3914 7775</span>
            </p>
          </div>
          <p className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span>يومياً من ٩ صباحاً حتى ١٠ مساءً</span>
          </p>
        </div>
        <div className="space-y-4">
          <h4 className="font-serif font-bold text-xl text-white">اطلب أونلاين</h4>
          <p className="text-sm text-white/60 leading-relaxed">
            تصفّح المنيو، املأ سلتك، وأرسل طلبك — نتصل بك للتأكيد والدفع عند الاستلام.
          </p>
          <button
            onClick={() => document.querySelector("#menu")?.scrollIntoView({ behavior: "smooth" })}
            data-testid="footer-order-button"
            className="rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground transition-colors duration-300 hover:bg-white hover:text-foreground"
          >
            ابدأ طلبك
          </button>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 flex items-center justify-center gap-4 text-xs text-white/40">
        <span>حلويات الحلواچي © {new Date().getFullYear()} — فرع جد علي</span>
        <Link
          to="/admin"
          data-testid="admin-login-link"
          className="flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-white/40 transition-colors duration-300 hover:border-primary hover:text-primary"
        >
          <Lock className="w-3 h-3" />
          دخول الإدارة
        </Link>
      </div>
    </footer>
  );
}
