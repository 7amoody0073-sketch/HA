import { motion } from "framer-motion";

const CHAPTERS = [
  {
    num: "٠١",
    title: "التُّراث",
    text: "من أزقّة جد علي القديمة بدأت الحكاية. وصفات بحرينية أصيلة حفظناها كما توارثتها الأجيال — بلا اختصار، وبلا مساومة على المكوّن.",
    img: "https://images.unsplash.com/photo-1674251853978-bd93ba6d320c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwyfHxiYWhyYWluJTIwdHJhZGl0aW9uYWwlMjBhcmNoaXRlY3R1cmV8ZW58MHx8fHwxNzg2NzkzMjQzfDA&ixlib=rb-4.1.0&q=85",
    alt: "باب بحريني تقليدي",
  },
  {
    num: "٠٢",
    title: "الحِرفة",
    text: "كل صينية كنافة وكل رقاقة بقلاوة تمرّ بأيدي حرفيين يعرفون أن الحلوى البحرينية لا تُستعجَل. نخبز يومياً، ونقدّم طازجاً دائماً.",
    img: "https://images.unsplash.com/photo-1701978300223-6fe449f3bc20?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwyfHxjaGVmJTIwY29va2luZyUyMGFyYWJpYyUyMHN3ZWV0c3xlbnwwfHx8fDE3ODY3OTMyNDN8MA&ixlib=rb-4.1.0&q=85",
    alt: "حرفي يصنع الحلويات",
  },
  {
    num: "٠٣",
    title: "الضِّيافة",
    text: "من عزومات العيد إلى قهوة العصر، حلوياتنا جزء من فرح البيوت البحرينية. اطلب أونلاين ونوصّلها لباب بيتك وهي ساخنة.",
    img: "https://images.unsplash.com/photo-1595353611215-3ea27a66f0b6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwzfHxhcmFiaWMlMjBzd2VldHN8ZW58MHx8fHwxNzg2NzkzMjQ4fDA&ixlib=rb-4.1.0&q=85",
    alt: "تشكيلة حلويات فاخرة",
  },
];

export default function Manifesto() {
  return (
    <section id="story" className="py-24 lg:py-36 bg-background" data-testid="manifesto-section">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-sm tracking-[0.3em] text-muted-foreground mb-4"
        >
          قصتنا
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl leading-snug max-w-2xl mb-20 lg:mb-28"
        >
          ثلاثة فصول صنعت اسم <span className="text-primary">الحلواجي</span>
        </motion.h2>

        <div className="space-y-24 lg:space-y-32">
          {CHAPTERS.map((c, i) => (
            <motion.div
              key={c.num}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className={`grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center ${i % 2 === 1 ? "" : ""}`}
            >
              <div className={`lg:col-span-5 ${i % 2 === 1 ? "lg:order-2" : ""}`}>
                <div className="overflow-hidden rounded-t-[10rem] rounded-b-2xl shadow-xl shadow-foreground/5">
                  <img src={c.img} alt={c.alt} className="w-full aspect-[3/4] object-cover warm-img transition-transform duration-700 hover:scale-105" />
                </div>
              </div>
              <div className={`lg:col-span-6 ${i % 2 === 1 ? "lg:order-1 lg:col-start-1" : "lg:col-start-7"}`}>
                <span className="font-serif text-7xl lg:text-8xl text-primary/25 leading-none block">{c.num}</span>
                <h3 className="font-serif font-bold text-2xl sm:text-3xl mt-2 mb-5">{c.title}</h3>
                <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-md">{c.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
