import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, MapPin } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

function MaskedLine({ children, delay, className }) {
  return (
    <span className="block overflow-hidden pb-4 -mb-1">
      <motion.span
        className={`block pt-3 ${className || ""}`}
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1.1, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const scrollToMenu = () => document.querySelector("#menu")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="hero" ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden grain-overlay bg-[#E7DABE]" data-testid="hero-section">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 65% 55% at 50% 36%, rgba(255,252,244,0.75), transparent 70%)" }}
      />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 90% 60% at 50% 110%, rgba(200,155,60,0.14), transparent 60%)" }} />

      <motion.div style={{ opacity: fade }} className="relative z-10 flex flex-col items-center text-center px-6 pt-28 pb-20 w-full">
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: EASE }}
            className="relative"
          >
            <div className="absolute -inset-10 sm:-inset-16 rounded-full bg-[#FFFDF6] opacity-80 blur-3xl -z-10" />
            <div className="absolute -inset-4 rounded-full border border-[#C8A75C]/50" />
            <div className="absolute -inset-9 rounded-full border border-[#C8A75C]/25 hidden sm:block" />
            <img
              src="/logo.png"
              alt="شعار الحلواچي"
              data-testid="hero-logo"
              className="w-44 h-44 sm:w-60 sm:h-60 rounded-full shadow-2xl shadow-[#8B5A2B]/25 object-cover"
            />
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
          className="mt-10 text-xs sm:text-sm text-secondary font-bold text-center leading-relaxed px-4 max-w-full"
        >
          حلويات أبناء الحاج جعفر الحلواجي
        </motion.p>

        <h1 className="mt-5 font-serif font-bold text-[#241C12] text-5xl sm:text-6xl lg:text-7xl leading-[1.35] tracking-tight">
          <MaskedLine delay={0.65}>حلويات الحلواچي</MaskedLine>
          <MaskedLine delay={0.8} className="text-primary text-3xl sm:text-4xl lg:text-5xl">عراقة وتُراث الأجداد</MaskedLine>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.05, ease: EASE }}
          className="mt-6 flex items-center gap-2 text-[#241C12]/60"
        >
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm">مملكة البحرين — المنامة</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.3, ease: EASE }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            onClick={scrollToMenu}
            data-testid="hero-cta-menu"
            className="group flex items-center gap-3 rounded-full bg-[#241C12] px-8 py-4 text-[#F6EFE2] font-bold transition-colors duration-300 hover:bg-primary hover:text-primary-foreground"
          >
            تصفّح المنيو
            <ArrowDown className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-1" />
          </button>
          <button
            onClick={scrollToMenu}
            data-testid="hero-cta-order"
            className="rounded-full border border-[#241C12]/30 px-8 py-4 text-[#241C12] font-bold transition-colors duration-300 hover:border-secondary hover:text-secondary"
          >
            اطلب أونلاين
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
