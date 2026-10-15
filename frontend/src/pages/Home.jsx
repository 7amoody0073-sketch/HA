import { useEffect, useState } from "react";
import Lenis from "lenis";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import MenuSection from "@/components/MenuSection";
import Footer from "@/components/Footer";
import CartSheet from "@/components/CartSheet";
import CheckoutDialog from "@/components/CheckoutDialog";

export default function Home() {
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 0.9, smoothWheel: true });
    let raf;
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <main className="min-h-screen" data-testid="home-page">
      <Navbar onCartOpen={() => setCartOpen(true)} />
      <Hero />
      <MenuSection />
      <Footer />
      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </main>
  );
}
