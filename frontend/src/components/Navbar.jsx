import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";

const links = [
  { href: "#hero", label: "الرئيسية" },
  { href: "#menu", label: "المنيو" },
  { href: "#contact", label: "تواصل" },
];

export default function Navbar({ onCartOpen }) {
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (e, href) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      data-testid="main-navbar"
      className={`fixed top-0 inset-x-0 z-50 transition-[background-color,box-shadow] duration-500 ${
        scrolled ? "bg-background/90 backdrop-blur-md shadow-[0_1px_0_hsl(var(--border))]" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
        <a href="#hero" onClick={(e) => go(e, "#hero")} className="flex items-center gap-3" data-testid="nav-logo">
          <img src="/logo.png" alt="الحلواچي" className="w-11 h-11 rounded-full ring-1 ring-primary/40 object-cover" />
          <span className="font-serif text-2xl font-bold text-foreground transition-colors duration-500">الحلواچي</span>
        </a>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => go(e, l.href)}
              data-testid={`nav-link-${l.href.slice(1)}`}
              className="text-sm font-medium text-foreground/80 transition-colors duration-500 hover:text-primary"
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/track"
            data-testid="nav-link-track"
            className="text-sm font-medium text-foreground/80 transition-colors duration-500 hover:text-primary"
          >
            تتبع طلبك
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            data-testid="mobile-menu-button"
            aria-label="القائمة"
            className="md:hidden p-2.5 rounded-full text-foreground hover:bg-accent transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            onClick={onCartOpen}
            data-testid="cart-open-button"
            className="relative flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold transition-colors duration-300 hover:bg-secondary hover:text-secondary-foreground"
          >
            <ShoppingBag className="w-4 h-4" />
            السلة
            {count > 0 && (
              <span data-testid="cart-count-badge" className="absolute -top-2 -start-2 bg-foreground text-background text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden bg-background/95 backdrop-blur-md border-t border-border/60 px-6 py-4 flex flex-col" data-testid="mobile-menu">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => { go(e, l.href); setMenuOpen(false); }}
              data-testid={`mobile-nav-link-${l.href.slice(1)}`}
              className="py-3 font-medium text-foreground/85 border-b border-border/40 last:border-0 hover:text-primary transition-colors"
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/track"
            onClick={() => setMenuOpen(false)}
            data-testid="mobile-nav-link-track"
            className="py-3 font-medium text-foreground/85 hover:text-primary transition-colors"
          >
            تتبع طلبك
          </Link>
        </nav>
      )}
    </header>
  );
}
