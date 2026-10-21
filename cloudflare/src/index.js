import { fallbackProducts } from "../../frontend/src/lib/fallbackProducts.js";

const ORDER_STATUSES = new Set(["new", "confirmed", "preparing", "delivered", "cancelled"]);
const PAYMENT_STATUSES = new Set(["unpaid", "deposit", "paid"]);
const DELIVERY_AREAS = {
  near: {
    label: "مناطق قريبة",
    fee: 2,
    areas: ["جد علي", "عالي", "الرفاع الشرقي", "الرفاع الغربي", "سار", "الدراز", "كرانة", "باربار", "القدم", "بوري"],
  },
  far: {
    label: "مناطق بعيدة",
    fee: 2.5,
    areas: ["المحرق", "عراد", "سترة", "عسكر", "جو", "المنامة", "الحد", "قلالي", "دمستان", "المالكية", "البديع", "الجسرة", "الزنج", "أبو صيبع", "مدينة حمد", "مدينة عيسى", "توبلي", "الجدحفص"],
  },
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const json = (data, status, headers) =>
  new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });

const corsHeaders = (origin, env) => {
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
};

const parseBody = async (request) => {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Expected a JSON object");
    return body;
  } catch {
    throw new HttpError(400, "بيانات الطلب غير صالحة");
  }
};

const stringValue = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const toProduct = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  price: row.price,
  unit: row.unit,
  category: row.category,
  image: row.image,
  available: Boolean(row.available),
  featured: Boolean(row.featured),
  options: JSON.parse(row.options_json || "[]"),
  created_at: row.created_at,
});

const toOrder = (row) => ({
  id: row.id,
  order_number: row.order_number,
  customer_name: row.customer_name,
  phone: row.phone,
  fulfillment: row.fulfillment,
  delivery_area: row.delivery_area,
  delivery_fee: row.delivery_fee,
  address: row.address,
  notes: row.notes,
  items: JSON.parse(row.items_json || "[]"),
  total: row.total,
  paid: Boolean(row.paid),
  payment: row.payment,
  order_date: row.order_date,
  status: row.status,
  created_at: row.created_at,
});

let seeded = false;
async function seedProducts(db) {
  if (seeded) return;
  const existing = await db.prepare("SELECT id FROM products LIMIT 1").first();
  if (!existing) {
    const now = new Date().toISOString();
    await db.batch(
      fallbackProducts.map((product) =>
        db
          .prepare(
            `INSERT OR IGNORE INTO products
              (id, name, description, price, unit, category, image, available, featured, options_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, '[]', ?)`,
          )
          .bind(
            product.id,
            product.name,
            product.description || "",
            product.price,
            product.unit || "حبة",
            product.category || "أخرى",
            product.image || "",
            now,
          ),
      ),
    );
  }
  seeded = true;
}

const toHex = (bytes) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) => Uint8Array.from(hex.match(/.{2}/g) || [], (byte) => parseInt(byte, 16));

async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 },
    key,
    256,
  );
  return { hash: toHex(hash), salt: toHex(salt) };
}

const secureEqual = (left, right) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
};

const digest = async (value) => toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));

const makeToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function requireAdmin(request, db) {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new HttpError(401, "غير مصرح");
  const tokenHash = await digest(token);
  const session = await db
    .prepare("SELECT email FROM sessions WHERE token_hash = ? AND expires_at > ?")
    .bind(tokenHash, Math.floor(Date.now() / 1000))
    .first();
  if (!session) throw new HttpError(401, "الجلسة غير صالحة");
  const admin = await db.prepare("SELECT email FROM admins WHERE email = ?").bind(session.email).first();
  if (!admin) throw new HttpError(401, "غير مصرح");
  return admin;
}

function validateProduct(input) {
  const name = stringValue(input.name);
  const price = Number(input.price);
  const options = Array.isArray(input.options) ? input.options : [];
  if (name.length < 2 || name.length > 120) throw new HttpError(400, "اسم المنتج مطلوب");
  if (!Number.isFinite(price) || price < 0) throw new HttpError(400, "سعر المنتج غير صالح");
  if (options.length > 20 || options.some((option) =>
    !stringValue(option?.name) || !Number.isFinite(Number(option?.price)) || Number(option.price) < 0
  )) {
    throw new HttpError(400, "خيارات المنتج غير صالحة");
  }
  return {
    name,
    description: stringValue(input.description).slice(0, 1000),
    price,
    unit: stringValue(input.unit, "حبة").slice(0, 40),
    category: stringValue(input.category, "أخرى").slice(0, 80),
    image: stringValue(input.image).slice(0, 2000),
    available: input.available !== false,
    featured: input.featured === true,
    options: options.map((option) => ({ name: stringValue(option.name).slice(0, 60), price: Number(option.price) })),
  };
}

async function login(request, env) {
  const input = await parseBody(request);
  const email = stringValue(input.email).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";
  if (!email || !password || password.length > 256) throw new HttpError(400, "أدخل اسم المستخدم وكلمة المرور");

  let admin = await env.DB.prepare("SELECT email, password_hash, password_salt FROM admins WHERE email = ?").bind(email).first();
  if (!admin) {
    const adminCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM admins").first();
    const bootstrapEmail = stringValue(env.ADMIN_EMAIL).toLowerCase();
    if (adminCount.count === 0 && bootstrapEmail === email && env.ADMIN_PASSWORD && secureEqual(password, env.ADMIN_PASSWORD)) {
      const credentials = await hashPassword(password);
      await env.DB
        .prepare("INSERT OR IGNORE INTO admins (email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?)")
        .bind(email, credentials.hash, credentials.salt, new Date().toISOString())
        .run();
      admin = await env.DB.prepare("SELECT email, password_hash, password_salt FROM admins WHERE email = ?").bind(email).first();
    }
  }
  if (!admin) throw new HttpError(401, "اسم المستخدم أو كلمة المرور غير صحيحة");

  const credentials = await hashPassword(password, admin.password_salt);
  if (!secureEqual(credentials.hash, admin.password_hash)) throw new HttpError(401, "اسم المستخدم أو كلمة المرور غير صحيحة");

  const token = makeToken();
  const tokenHash = await digest(token);
  const expiresAt = Math.floor(Date.now() / 1000) + 43200;
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(Math.floor(Date.now() / 1000)).run();
  await env.DB
    .prepare("INSERT INTO sessions (token_hash, email, expires_at) VALUES (?, ?, ?)")
    .bind(tokenHash, email, expiresAt)
    .run();
  return json({ token, user: { id: email, email, name: "Admin", role: "admin" } }, 200);
}

async function createOrder(input, db) {
  const customerName = stringValue(input.customer_name);
  const phone = stringValue(input.phone);
  const fulfillment = input.fulfillment || "delivery";
  const itemsInput = input.items;
  if (customerName.length < 2 || customerName.length > 80) throw new HttpError(400, "أدخل الاسم بشكل صحيح");
  if (phone.length < 8 || phone.length > 20) throw new HttpError(400, "أدخل رقم الجوال بشكل صحيح");
  if (!["delivery", "pickup"].includes(fulfillment)) throw new HttpError(400, "طريقة الاستلام غير صالحة");
  if (!Array.isArray(itemsInput) || itemsInput.length < 1 || itemsInput.length > 50) throw new HttpError(400, "السلة فارغة");
  if (fulfillment === "delivery" && stringValue(input.address).length < 3) throw new HttpError(400, "أدخل عنوان التوصيل بالتفصيل");

  const ids = [...new Set(itemsInput.map((item) => stringValue(item.product_id)).filter(Boolean))];
  if (!ids.length || ids.length > 50) throw new HttpError(400, "منتجات الطلب غير صالحة");
  const placeholders = ids.map(() => "?").join(",");
  const productRows = await db
    .prepare(`SELECT * FROM products WHERE available = 1 AND id IN (${placeholders})`)
    .bind(...ids)
    .all();
  const byId = new Map(productRows.results.map((row) => [row.id, toProduct(row)]));
  const orderItems = [];
  let total = 0;
  for (const item of itemsInput) {
    const productId = stringValue(item.product_id);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new HttpError(400, "كمية المنتج غير صالحة");
    const product = byId.get(productId);
    if (!product) throw new HttpError(400, "أحد المنتجات غير متوفر حالياً");
    let price = product.price;
    let unit = product.unit;
    if (product.options.length) {
      const option = product.options.find((candidate) => candidate.name === stringValue(item.option_name));
      if (!option) throw new HttpError(400, `اختر الحجم لمنتج: ${product.name}`);
      price = option.price;
      unit = option.name;
    }
    const lineTotal = Math.round(price * quantity * 1000) / 1000;
    total += lineTotal;
    orderItems.push({
      product_id: product.id,
      name: product.name + (product.options.length ? ` (${unit})` : ""),
      price,
      unit,
      quantity,
      line_total: lineTotal,
    });
  }

  const nextSequence = await db.prepare("UPDATE order_sequence SET value = value + 1 WHERE id = 1 RETURNING value").first();
  if (!nextSequence) throw new Error("Order sequence is not initialized");
  const order = {
    id: crypto.randomUUID(),
    order_number: `HW-${1000 + nextSequence.value}`,
    customer_name: customerName,
    phone,
    fulfillment,
    delivery_area: fulfillment === "delivery" ? stringValue(input.delivery_area).slice(0, 120) : "",
    delivery_fee: 0,
    address: fulfillment === "delivery" ? stringValue(input.address).slice(0, 500) : "",
    notes: stringValue(input.notes).slice(0, 500),
    items: orderItems,
    total: Math.round(total * 1000) / 1000,
    paid: false,
    payment: "unpaid",
    order_date: stringValue(input.order_date).slice(0, 10),
    status: "new",
    created_at: new Date().toISOString(),
  };
  await db
    .prepare(
      `INSERT INTO orders
        (id, order_number, customer_name, phone, fulfillment, delivery_area, delivery_fee, address, notes,
         items_json, total, paid, payment, order_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'unpaid', ?, 'new', ?)`,
    )
    .bind(
      order.id,
      order.order_number,
      order.customer_name,
      order.phone,
      order.fulfillment,
      order.delivery_area,
      order.delivery_fee,
      order.address,
      order.notes,
      JSON.stringify(order.items),
      order.total,
      order.order_date,
      order.created_at,
    )
    .run();
  return order;
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  if (path === "/api/auth/login" && method === "POST") return login(request, env);
  if (path === "/api/auth/logout" && method === "POST") {
    const token = (request.headers.get("Authorization") || "").replace(/^Bearer /, "");
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await digest(token)).run();
    return json({ ok: true });
  }
  if (path === "/api/auth/me" && method === "GET") {
    const admin = await requireAdmin(request, env.DB);
    return json({ id: admin.email, email: admin.email, name: "Admin", role: "admin" });
  }
  if (path === "/api/products" && method === "GET") {
    const result = await env.DB.prepare("SELECT * FROM products WHERE available = 1 ORDER BY created_at, name LIMIT 500").all();
    return json(result.results.map(toProduct));
  }
  if (path === "/api/delivery-areas" && method === "GET") return json(DELIVERY_AREAS);
  if (path === "/api/orders" && method === "POST") return json(await createOrder(await parseBody(request), env.DB), 201);

  const imageMatch = path.match(/^\/api\/files\/([a-f0-9-]+)$/i);
  if (imageMatch && method === "GET") {
    const image = await env.DB.prepare("SELECT content_type, data_base64 FROM product_images WHERE id = ?").bind(imageMatch[1]).first();
    if (!image) throw new HttpError(404, "الصورة غير موجودة");
    const bytes = Uint8Array.from(atob(image.data_base64), (character) => character.charCodeAt(0));
    return new Response(bytes, {
      headers: {
        "Content-Type": image.content_type,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (path === "/api/orders/track" && method === "POST") {
    const input = await parseBody(request);
    const orderNumber = stringValue(input.order_number).toUpperCase();
    const phoneDigits = stringValue(input.phone).replace(/\D/g, "");
    const row = await env.DB.prepare("SELECT * FROM orders WHERE order_number = ?").bind(orderNumber).first();
    const orderDigits = row ? row.phone.replace(/\D/g, "") : "";
    if (!row || phoneDigits.length < 8 || !orderDigits.endsWith(phoneDigits.slice(-8))) {
      throw new HttpError(404, "رقم الطلب أو رقم الجوال غير صحيح");
    }
    const order = toOrder(row);
    delete order.phone;
    return json(order);
  }
  if (path === "/api/orders/history" && method === "POST") {
    const input = await parseBody(request);
    const digits = stringValue(input.phone).replace(/\D/g, "");
    if (digits.length < 8) throw new HttpError(400, "رقم الجوال غير صحيح");
    const result = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500").all();
    const orders = result.results
      .filter((row) => row.phone.replace(/\D/g, "").endsWith(digits.slice(-8)))
      .map((row) => {
        const order = toOrder(row);
        delete order.phone;
        return order;
      });
    return json(orders);
  }

  if (path.startsWith("/api/admin/")) await requireAdmin(request, env.DB);

  if (path === "/api/admin/upload" && method === "POST") {
    const input = await parseBody(request);
    const match = typeof input.data_url === "string"
      ? input.data_url.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
      : null;
    if (!match || match[2].length > 500000) throw new HttpError(400, "الصورة غير صالحة أو حجمها كبير");
    const id = crypto.randomUUID();
    await env.DB
      .prepare("INSERT INTO product_images (id, content_type, data_base64, created_at) VALUES (?, ?, ?, ?)")
      .bind(id, match[1], match[2], new Date().toISOString())
      .run();
    return json({ path: id, url: `/api/files/${id}` }, 201);
  }

  if (path === "/api/admin/products" && method === "GET") {
    const result = await env.DB.prepare("SELECT * FROM products ORDER BY created_at, name LIMIT 500").all();
    return json(result.results.map(toProduct));
  }
  if (path === "/api/admin/products" && method === "POST") {
    const product = validateProduct(await parseBody(request));
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await env.DB
      .prepare(
        `INSERT INTO products
          (id, name, description, price, unit, category, image, available, featured, options_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        product.name,
        product.description,
        product.price,
        product.unit,
        product.category,
        product.image,
        Number(product.available),
        Number(product.featured),
        JSON.stringify(product.options),
        createdAt,
      )
      .run();
    return json(toProduct({ ...product, id, available: Number(product.available), featured: Number(product.featured), options_json: JSON.stringify(product.options), created_at: createdAt }), 201);
  }

  const productMatch = path.match(/^\/api\/admin\/products\/([^/]+)$/);
  if (productMatch && ["PUT", "DELETE"].includes(method)) {
    const id = decodeURIComponent(productMatch[1]);
    if (method === "DELETE") {
      const result = await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
      if (!result.meta.changes) throw new HttpError(404, "المنتج غير موجود");
      return json({ ok: true });
    }
    const product = validateProduct(await parseBody(request));
    const result = await env.DB
      .prepare(
        `UPDATE products SET name = ?, description = ?, price = ?, unit = ?, category = ?, image = ?,
         available = ?, featured = ?, options_json = ? WHERE id = ?`,
      )
      .bind(
        product.name,
        product.description,
        product.price,
        product.unit,
        product.category,
        product.image,
        Number(product.available),
        Number(product.featured),
        JSON.stringify(product.options),
        id,
      )
      .run();
    if (!result.meta.changes) throw new HttpError(404, "المنتج غير موجود");
    const updated = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
    return json(toProduct(updated));
  }

  if (path === "/api/admin/orders" && method === "GET") {
    const result = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 1000").all();
    return json(result.results.map(toOrder));
  }
  const orderMatch = path.match(/^\/api\/admin\/orders\/([^/]+)(?:\/(status|payment))?$/);
  if (orderMatch) {
    const id = decodeURIComponent(orderMatch[1]);
    const action = orderMatch[2];
    if (!action && method === "DELETE") {
      const result = await env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();
      if (!result.meta.changes) throw new HttpError(404, "الطلب غير موجود");
      return json({ ok: true });
    }
    if (action && method === "PATCH") {
      const input = await parseBody(request);
      const isStatus = action === "status";
      const value = stringValue(input[isStatus ? "status" : "payment"]);
      const allowed = isStatus ? ORDER_STATUSES : PAYMENT_STATUSES;
      if (!allowed.has(value)) throw new HttpError(400, isStatus ? "حالة غير صالحة" : "حالة دفع غير صالحة");
      const query = isStatus
        ? "UPDATE orders SET status = ? WHERE id = ?"
        : "UPDATE orders SET payment = ?, paid = ? WHERE id = ?";
      const result = isStatus
        ? await env.DB.prepare(query).bind(value, id).run()
        : await env.DB.prepare(query).bind(value, Number(value === "paid"), id).run();
      if (!result.meta.changes) throw new HttpError(404, "الطلب غير موجود");
      const updated = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
      return json(toOrder(updated));
    }
  }

  throw new HttpError(404, "المسار غير موجود");
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request.headers.get("Origin"), env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    try {
      await seedProducts(env.DB);
      const response = await handle(request, env);
      const responseHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(headers)) responseHeaders.set(key, value);
      responseHeaders.set("X-Content-Type-Options", "nosniff");
      if (!new URL(request.url).pathname.startsWith("/api/files/")) responseHeaders.set("Cache-Control", "no-store");
      return new Response(response.body, { status: response.status, headers: responseHeaders });
    } catch (error) {
      if (error instanceof HttpError) return json({ detail: error.message }, error.status, headers);
      console.error("Cloudflare API request failed", error);
      return json({ detail: "حدث خطأ في الخادم، حاول مرة أخرى" }, 500, headers);
    }
  },
};
