import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import api, { apiBaseUrl, formatPrice } from "@/lib/api";
import { fallbackProducts } from "@/lib/fallbackProducts";
import { useCart } from "@/context/CartContext";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1595353611215-3ea27a66f0b6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwzfHxhcmFiaWMlMjBzd2VldHN8ZW58MHx8fHwxNzg2NzkzMjQ4fDA&ixlib=rb-4.1.0&q=70&w=900&auto=format";

function ProductCard({ p, index }) {
  const { add } = useCart();
  const [optIdx, setOptIdx] = useState(0);
  const hasOptions = Array.isArray(p.options) && p.options.length > 0;
  const option = hasOptions ? p.options[Math.min(optIdx, p.options.length - 1)] : null;
  const price = option ? option.price : p.price;

  const handleAdd = () => {
    add(p, option);
    toast.success(`أُضيف "${p.name}${option ? ` — ${option.name}` : ""}" إلى السلة`);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      data-testid={`product-card-${p.id}`}
    >
      <div className="group overflow-hidden rounded-tr-[3.5rem] rounded-bl-[3.5rem] rounded-tl-xl rounded-br-xl shadow-sm transition-shadow duration-500 hover:shadow-xl hover:shadow-foreground/10">
        <div className="overflow-hidden aspect-[4/3]">
          <img
            src={p.image || FALLBACK_IMG}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover warm-img transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-xl sm:text-2xl leading-snug">{p.name}</h3>
          <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed max-w-xs">{p.description}</p>
        </div>
        <div className="text-start shrink-0">
          <span className="font-bold text-lg text-secondary whitespace-nowrap" data-testid={`product-price-${p.id}`}>{formatPrice(price)}</span>
          <span className="block text-xs text-muted-foreground">{option ? option.name : `/ ${p.unit}`}</span>
        </div>
      </div>
      {hasOptions && (
        <div className="flex flex-wrap gap-2 mt-3" data-testid={`product-options-${p.id}`}>
          {p.options.map((o, i) => (
            <button
              key={o.name}
              onClick={() => setOptIdx(i)}
              data-testid={`option-${p.id}-${i}`}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors duration-300 ${
                i === optIdx ? "bg-foreground text-background" : "bg-card text-foreground/70 hover:bg-accent hover:text-foreground"
              }`}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={handleAdd}
        data-testid={`add-to-cart-${p.id}`}
        className="mt-4 flex items-center gap-2 rounded-full border border-foreground/20 px-5 py-2.5 text-sm font-bold transition-colors duration-300 hover:bg-primary hover:border-primary hover:text-primary-foreground"
      >
        <Plus className="w-4 h-4" />
        أضف إلى السلة
      </button>
    </motion.article>
  );
}

export default function MenuSection() {
  const [products, setProducts] = useState(fallbackProducts);
  const [category, setCategory] = useState("الكل");

  useEffect(() => {
    if (!apiBaseUrl) return;
    api.get("/products")
      .then(({ data }) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch((error) => {
        console.error("Could not load products from the ordering service; using the local menu.", error);
      });
  }, []);

  const categories = ["الكل", ...new Set(products.map((product) => product.category).filter(Boolean))];
  const visible = useMemo(() => (category === "الكل" ? products : products.filter((p) => p.category === category)), [products, category]);

  return (
    <section id="menu" className="py-24 lg:py-36 bg-muted/40 grain-overlay relative" data-testid="menu-section">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-end justify-between gap-6 mb-12"
        >
          <div>
            <p className="text-sm text-muted-foreground mb-4">المنيو</p>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl leading-snug">من زارنا نورنا</h2>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">الأسعار بالدينار البحريني، ويؤكد المحل السعر والتوفر عبر واتساب.</p>
        </motion.div>

        <div className="flex flex-wrap gap-3 mb-14" data-testid="category-filters">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              data-testid={`category-filter-${c}`}
              className={`rounded-full px-6 py-2.5 text-sm font-bold transition-colors duration-300 ${
                category === c ? "bg-foreground text-background" : "bg-card text-foreground/70 hover:bg-accent hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14" data-testid="products-grid">
          {visible.map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
