const IMG_BAKLAVA = "https://images.unsplash.com/photo-1705663106388-6c1c51ff5a8d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxiYWtsYXZhfGVufDB8fHx8MTc4Njc5MzI0OHww&ixlib=rb-4.1.0&q=80&w=900&auto=format";
const IMG_CLOCHE = "https://images.unsplash.com/photo-1595353611215-3ea27a66f0b6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwzfHxhcmFiaWMlMjBzd2VldHN8ZW58MHx8fHwxNzg2NzkzMjQ4fDA&ixlib=rb-4.1.0&q=80&w=900&auto=format";
const IMG_PISTACHIO = "https://images.unsplash.com/photo-1778447830669-8fe9626ed738?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHw0fHxhcmFiaWMlMjBzd2VldHN8ZW58MHx8fHwxNzg2NzkzMjQ4fDA&ixlib=rb-4.1.0&q=80&w=900&auto=format";
const IMG_TRAY = "https://images.unsplash.com/photo-1676014959543-81df1079b423?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHw0fHxiYWtsYXZhfGVufDB8fHx8MTc4Njc5MzI0OHww&ixlib=rb-4.1.0&q=80&w=900&auto=format";

export const fallbackProducts = [
  { id: "fallback-kunafa-cheese", name: "كنافة نابلسية بالجبن", description: "طبقات ذهبية من الكنافة الناعمة مع جبن ذائب وقطر الزعفران", price: 4.5, unit: "صينية", category: "كنافة", image: IMG_TRAY },
  { id: "fallback-kunafa-cream", name: "كنافة بالقشطة والفستق", description: "كنافة محشوة بالقشطة الطازجة ومزينة بالفستق الحلبي المجروش", price: 5.5, unit: "صينية", category: "كنافة", image: IMG_PISTACHIO },
  { id: "fallback-baklava-mix", name: "بقلاوة مشكلة فاخرة", description: "تشكيلة بقلاوة بالجوز واللوز والفستق بعسل طبيعي", price: 6, unit: "كيلو", category: "بقلاوة", image: IMG_BAKLAVA },
  { id: "fallback-baklava-pistachio", name: "بقلاوة بالفستق الحلبي", description: "رقائق مقرمشة محشوة بالفستق الحلبي الفاخر", price: 8, unit: "كيلو", category: "بقلاوة", image: IMG_PISTACHIO },
  { id: "fallback-luqaimat", name: "لقيمات بالدبس", description: "لقيمات ذهبية مقرمشة تُقدم ساخنة مع دبس التمر", price: 1.5, unit: "طبق", category: "حلويات شعبية", image: IMG_CLOCHE },
  { id: "fallback-zalabia", name: "زلابية مقرمشة", description: "زلابية على الطريقة البحرينية بالقطر والهيل", price: 1.5, unit: "طبق", category: "حلويات شعبية", image: IMG_TRAY },
  { id: "fallback-halwa-shaariya", name: "حلاوة شعرية", description: "حلاوة الشعرية البحرينية الأصيلة بالزعفران والهيل", price: 2, unit: "طبق", category: "حلويات شعبية", image: IMG_BAKLAVA },
  { id: "fallback-khanfaroosh", name: "خنفروش بحريني", description: "خنفروش تقليدي بالبيض والدقيق يُقدم مع الشاي", price: 1, unit: "٦ حبات", category: "حلويات شعبية", image: IMG_CLOCHE },
  { id: "fallback-maamoul", name: "معمول التمر", description: "معمول محشو بعجوة التمر الفاخرة ومخبوز يومياً", price: 4, unit: "كيلو", category: "معمول وكعك", image: IMG_CLOCHE },
  { id: "fallback-kleija", name: "كليجة بحرينية", description: "كليجة محشوة بالتمر والهيل على الطريقة القديمة", price: 3.5, unit: "كيلو", category: "معمول وكعك", image: IMG_TRAY },
  { id: "fallback-ghrayba", name: "غريبة بالهيل", description: "غريبة ناعمة تذوب في الفم بنكهة الهيل", price: 2.5, unit: "علبة", category: "معمول وكعك", image: IMG_PISTACHIO },
  { id: "fallback-hospitality", name: "تشكيلة ضيافة مشكلة", description: "صينية ضيافة فاخرة تجمع أشهر حلوياتنا للمناسبات", price: 12, unit: "صينية", category: "تشكيلات الضيافة", image: IMG_BAKLAVA },
];
