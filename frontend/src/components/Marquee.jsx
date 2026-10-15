const ITEMS = ["كنافة نابلسية", "بقلاوة بالفستق", "لقيمات بالدبس", "معمول التمر", "كليجة بحرينية", "حلاوة شعرية", "زلابية مقرمشة", "غريبة بالهيل"];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="bg-accent border-y border-border/60 py-6 overflow-hidden" dir="ltr" data-testid="editorial-marquee">
      <div className="marquee-track flex w-max gap-16">
        {[0, 1].map((half) => (
          <div key={half} className="flex gap-16 shrink-0">
            {row.map((item, i) => (
              <span key={`${half}-${i}`} className="flex items-center gap-16 font-serif text-2xl sm:text-3xl text-accent-foreground/80 whitespace-nowrap">
                {item}
                <span className="w-2 h-2 rotate-45 bg-primary inline-block" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
