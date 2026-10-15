from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import requests
import bcrypt
import jwt as pyjwt
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent

mongo_url = os.environ.get("MONGO_URL") or os.environ.get("MANGO_URL")
if not mongo_url:
    raise RuntimeError("MongoDB is not configured: set MONGO_URL.")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------- Auth ----------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=12), "type": "access"}
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="غير مصرح")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="جلسة غير صالحة")
    user = await db.users.find_one({"_id": payload["sub"]}, {"password_hash": 0})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=401, detail="غير مصرح")
    user["id"] = user.pop("_id")
    return user

class LoginInput(BaseModel):
    email: str
    password: str

@api_router.post("/auth/login")
async def login(input: LoginInput, response: Response):
    email = input.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="البريد الإلكتروني أو كلمة المرور غير صحيحة")
    token = create_access_token(user["_id"], email)
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    return {"token": token, "user": {"id": user["_id"], "email": email, "name": user.get("name", "Admin"), "role": user["role"]}}

@api_router.get("/auth/me")
async def me(admin: dict = Depends(get_current_admin)):
    return admin

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

# ---------- Products ----------

class OptionIn(BaseModel):
    name: str
    price: float

class ProductIn(BaseModel):
    name: str
    description: str = ""
    price: float
    unit: str = "حبة"
    category: str = "حلويات"
    image: str = ""
    available: bool = True
    featured: bool = False
    options: List[OptionIn] = []

def product_out(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

@api_router.get("/products")
async def list_products():
    products = await db.products.find({"available": True}, {"_id": 0}).to_list(500)
    return products

@api_router.get("/admin/products")
async def admin_list_products(admin: dict = Depends(get_current_admin)):
    return await db.products.find({}, {"_id": 0}).to_list(500)

@api_router.post("/admin/products", status_code=201)
async def create_product(input: ProductIn, admin: dict = Depends(get_current_admin)):
    doc = input.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.insert_one(doc)
    return product_out(doc)

@api_router.put("/admin/products/{product_id}")
async def update_product(product_id: str, input: ProductIn, admin: dict = Depends(get_current_admin)):
    result = await db.products.update_one({"id": product_id}, {"$set": input.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    return doc

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    return {"ok": True}

# ---------- Orders ----------

class OrderItem(BaseModel):
    product_id: str
    option_name: str = ""
    quantity: int = Field(ge=1, le=100)

class OrderIn(BaseModel):
    customer_name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=8, max_length=20)
    fulfillment: str = "delivery"
    delivery_area: str = ""
    address: str = ""
    order_date: str = ""
    notes: str = ""
    items: List[OrderItem] = Field(min_length=1)

ORDER_STATUSES = ["new", "confirmed", "preparing", "delivered", "cancelled"]

DELIVERY_AREAS = {
    "near": {"label": "مناطق قريبة", "fee": 2.0, "areas": ["جد علي", "عالي", "الرفاع الشرقي", "الرفاع الغربي", "سار", "الدراز", "كرانة", "باربار", "القدم", "بوري"]},
    "far": {"label": "مناطق بعيدة", "fee": 2.5, "areas": ["المحرق", "عراد", "سترة", "عسكر", "جو", "المنامة", "الحد", "قلالي", "دمستان", "المالكية", "البديع", "الجسرة", "الزنج", "أبو صيبع", "مدينة حمد", "مدينة عيسى", "توبلي", "الجدحفص"]},
}

@api_router.get("/delivery-areas")
async def get_delivery_areas():
    return DELIVERY_AREAS

def _normalize_bh_phone(phone: str) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if len(digits) == 8:
        digits = "973" + digits
    return "+" + digits if digits else ""

def _send_sms_sync(to: str, body: str):
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    from_number = os.environ.get("TWILIO_FROM_NUMBER", "")
    if not (sid and token and from_number and to):
        return
    try:
        from twilio.rest import Client
        Client(sid, token).messages.create(to=to, from_=from_number, body=body)
        logger.info("SMS sent to %s", to)
    except Exception as e:
        logger.warning("SMS to %s failed: %s", to, e)

async def send_order_sms(order: dict):
    import asyncio
    total_txt = f"{order['total']:.3f}"
    owner = os.environ.get("OWNER_PHONE", "")
    if owner:
        items_txt = "، ".join(f"{i['name']} ×{i['quantity']}" for i in order["items"])
        await asyncio.to_thread(_send_sms_sync, _normalize_bh_phone(owner), f"طلب جديد {order['order_number']} — {order['customer_name']} ({order['phone']}) — {items_txt} — الإجمالي {total_txt} د.ب")
    await asyncio.to_thread(_send_sms_sync, _normalize_bh_phone(order["phone"]), f"حلويات الحلواچي: تم اتمام طلبك {order['order_number']} بنجاح، الإجمالي {total_txt} د.ب (الدفع عند الاستلام). سنتواصل معك قريباً للتأكيد.")

async def send_rejection_sms(order: dict):
    import asyncio
    await asyncio.to_thread(_send_sms_sync, _normalize_bh_phone(order.get("phone", "")), f"حلويات الحلواچي: نعتذر منك، طلبك {order.get('order_number', '')} غير متوفر حالياً. للطلب البديل أو الاستفسار تواصل معنا على 39047775.")

@api_router.post("/orders", status_code=201)
async def create_order(input: OrderIn):
    if input.fulfillment not in ("delivery", "pickup"):
        raise HTTPException(status_code=400, detail="طريقة الاستلام غير صالحة")
    delivery_fee = 0.0
    area = ""
    if input.fulfillment == "delivery":
        for group in DELIVERY_AREAS.values():
            if input.delivery_area in group["areas"]:
                area = input.delivery_area
                delivery_fee = group["fee"]
                break
        if not area:
            raise HTTPException(status_code=400, detail="اختر منطقة التوصيل")
        if len(input.address.strip()) < 3:
            raise HTTPException(status_code=400, detail="أدخل عنوان التوصيل بالتفصيل")
    ids = [i.product_id for i in input.items]
    products = await db.products.find({"id": {"$in": ids}, "available": True}, {"_id": 0}).to_list(500)
    by_id = {p["id"]: p for p in products}
    items, total = [], 0.0
    for i in input.items:
        p = by_id.get(i.product_id)
        if not p:
            raise HTTPException(status_code=400, detail="أحد المنتجات غير متوفر حالياً")
        price, unit_label = p["price"], p["unit"]
        options = p.get("options") or []
        if options:
            match = next((o for o in options if o["name"] == i.option_name), None)
            if not match:
                raise HTTPException(status_code=400, detail=f"اختر الحجم لمنتج: {p['name']}")
            price, unit_label = match["price"], match["name"]
        line = round(price * i.quantity, 3)
        total += line
        items.append({"product_id": p["id"], "name": p["name"] + (f" ({unit_label})" if options else ""), "price": price, "unit": unit_label, "quantity": i.quantity, "line_total": line})
    count = await db.orders.count_documents({})
    doc = {
        "id": str(uuid.uuid4()),
        "order_number": f"HW-{1000 + count + 1}",
        "customer_name": input.customer_name.strip(),
        "phone": input.phone.strip(),
        "fulfillment": input.fulfillment,
        "delivery_area": area,
        "delivery_fee": delivery_fee,
        "address": input.address.strip(),
        "notes": input.notes.strip(),
        "items": items,
        "total": round(total + delivery_fee, 3),
        "paid": False,
        "payment": "unpaid",
        "order_date": input.order_date.strip(),
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(doc)
    doc.pop("_id", None)
    import asyncio
    asyncio.create_task(send_order_sms(doc))
    return doc

@api_router.get("/admin/orders")
async def admin_list_orders(admin: dict = Depends(get_current_admin)):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

class StatusIn(BaseModel):
    status: str

@api_router.patch("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, input: StatusIn, admin: dict = Depends(get_current_admin)):
    if input.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="حالة غير صالحة")
    result = await db.orders.update_one({"id": order_id}, {"$set": {"status": input.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if input.status == "cancelled":
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        import asyncio
        asyncio.create_task(send_rejection_sms(order))
    return await db.orders.find_one({"id": order_id}, {"_id": 0})

PAYMENT_STATUSES = ["unpaid", "deposit", "paid"]

class PaymentIn(BaseModel):
    payment: str

@api_router.patch("/admin/orders/{order_id}/payment")
async def set_order_payment(order_id: str, input: PaymentIn, admin: dict = Depends(get_current_admin)):
    if input.payment not in PAYMENT_STATUSES:
        raise HTTPException(status_code=400, detail="حالة دفع غير صالحة")
    result = await db.orders.update_one({"id": order_id}, {"$set": {"payment": input.payment, "paid": input.payment == "paid"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    return await db.orders.find_one({"id": order_id}, {"_id": 0})

@api_router.delete("/admin/orders/{order_id}")
async def delete_order(order_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    return {"ok": True}

class TrackIn(BaseModel):
    order_number: str
    phone: str

@api_router.post("/orders/track")
async def track_order(input: TrackIn):
    order = await db.orders.find_one({"order_number": input.order_number.strip().upper()}, {"_id": 0, "order_number": 1, "status": 1, "items": 1, "total": 1, "created_at": 1, "phone": 1, "fulfillment": 1, "delivery_area": 1, "delivery_fee": 1, "paid": 1, "payment": 1, "order_date": 1})
    digits = "".join(ch for ch in input.phone if ch.isdigit())
    order_digits = "".join(ch for ch in (order or {}).get("phone", "") if ch.isdigit())
    if not order or len(digits) < 8 or not order_digits.endswith(digits[-8:]):
        raise HTTPException(status_code=404, detail="رقم الطلب أو رقم الجوال غير صحيح")
    order.pop("phone", None)
    return order

class HistoryIn(BaseModel):
    phone: str

@api_router.post("/orders/history")
async def order_history(input: HistoryIn):
    digits = "".join(ch for ch in input.phone if ch.isdigit())
    if len(digits) < 8:
        raise HTTPException(status_code=400, detail="رقم الجوال غير صحيح")
    suffix = digits[-8:]
    orders = await db.orders.find({}, {"_id": 0, "order_number": 1, "status": 1, "total": 1, "created_at": 1, "phone": 1, "items": 1, "fulfillment": 1, "delivery_area": 1, "delivery_fee": 1, "paid": 1, "payment": 1, "order_date": 1}).sort("created_at", -1).to_list(500)
    result = []
    for o in orders:
        od = "".join(ch for ch in o.get("phone", "") if ch.isdigit())
        if od.endswith(suffix):
            o.pop("phone", None)
            result.append(o)
    return result

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "halwaji"
storage_key = None
LOCAL_STORAGE_DIR = ROOT_DIR / "local_storage"
LOCAL_STORAGE_DIR.mkdir(exist_ok=True, parents=True)


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key

    if not os.environ.get("EMERGENT_LLM_KEY") or not os.environ.get("INTEGRATION_PROXY_URL"):
        storage_key = "local"
        return storage_key

    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ.get("EMERGENT_LLM_KEY")}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json().get("storage_key") or "local"
        return storage_key
    except Exception:
        storage_key = "local"
        return storage_key


def _local_object_path(path: str) -> Path:
    clean_path = path.strip("/")
    full_path = LOCAL_STORAGE_DIR / clean_path
    full_path.parent.mkdir(parents=True, exist_ok=True)
    return full_path


def put_object(path: str, data: bytes, content_type: str) -> dict:
    if init_storage() == "local":
        file_path = _local_object_path(path)
        file_path.write_bytes(data)
        return {"path": path, "url": f"/api/files/{path}"}

    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage(), "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    if init_storage() == "local":
        file_path = _local_object_path(path)
        if not file_path.exists():
            raise FileNotFoundError(path)
        return file_path.read_bytes(), "application/octet-stream"

    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage()}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

ALLOWED_IMG_EXTS = {"jpg", "jpeg", "png", "webp", "gif"}

@api_router.post("/admin/upload", status_code=201)
async def upload_image(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ALLOWED_IMG_EXTS:
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم — ارفع صورة (jpg, png, webp)")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="حجم الصورة أكبر من 5MB")
    path = f"{APP_NAME}/products/{uuid.uuid4()}.{ext}"
    import asyncio
    result = await asyncio.to_thread(put_object, path, data, file.content_type or "image/jpeg")
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}

@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    if not path.startswith(f"{APP_NAME}/"):
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    import asyncio
    try:
        data, content_type = await asyncio.to_thread(get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    return Response(content=data, media_type=content_type)

@api_router.get("/")
async def root():
    return {"message": "حلويات الحلواجي API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

IMG_BAKLAVA = "https://images.unsplash.com/photo-1705663106388-6c1c51ff5a8d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwxfHxiYWtsYXZhfGVufDB8fHx8MTc4Njc5MzI0OHww&ixlib=rb-4.1.0&q=85"
IMG_CLOCHE = "https://images.unsplash.com/photo-1595353611215-3ea27a66f0b6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwzfHxhcmFiaWMlMjBzd2VldHN8ZW58MHx8fHwxNzg2NzkzMjQ4fDA&ixlib=rb-4.1.0&q=85"
IMG_PISTACHIO = "https://images.unsplash.com/photo-1778447830669-8fe9626ed738?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHw0fHxhcmFiaWMlMjBzd2VldHN8ZW58MHx8fHwxNzg2NzkzMjQ4fDA&ixlib=rb-4.1.0&q=85"
IMG_TRAY = "https://images.unsplash.com/photo-1676014959543-81df1079b423?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHw0fHxiYWtsYXZhfGVufDB8fHx8MTc4Njc5MzI0OHww&ixlib=rb-4.1.0&q=85"

SEED_PRODUCTS = [
    {"name": "كنافة نابلسية بالجبن", "description": "طبقات ذهبية من الكنافة الناعمة مع جبن ذائب وقطر الزعفران", "price": 4.5, "unit": "صينية", "category": "كنافة", "image": IMG_TRAY, "featured": True},
    {"name": "كنافة بالقشطة والفستق", "description": "كنافة محشوة بالقشطة الطازجة ومزينة بالفستق الحلبي المجروش", "price": 5.5, "unit": "صينية", "category": "كنافة", "image": IMG_PISTACHIO},
    {"name": "بقلاوة مشكلة فاخرة", "description": "تشكيلة بقلاوة بالجوز واللوز والفستق بعسل طبيعي", "price": 6.0, "unit": "كيلو", "category": "بقلاوة", "image": IMG_BAKLAVA, "featured": True},
    {"name": "بقلاوة بالفستق الحلبي", "description": "رقائق مقرمشة محشوة بالفستق الحلبي الفاخر", "price": 8.0, "unit": "كيلو", "category": "بقلاوة", "image": IMG_PISTACHIO},
    {"name": "لقيمات بالدبس", "description": "لقيمات ذهبية مقرمشة تُقدم ساخنة مع دبس التمر", "price": 1.5, "unit": "طبق", "category": "حلويات شعبية", "image": IMG_CLOCHE},
    {"name": "زلابية مقرمشة", "description": "زلابية على الطريقة البحرينية بالقطر والهيل", "price": 1.5, "unit": "طبق", "category": "حلويات شعبية", "image": IMG_TRAY},
    {"name": "حلاوة شعرية", "description": "حلاوة الشعرية البحرينية الأصيلة بالزعفران والهيل", "price": 2.0, "unit": "طبق", "category": "حلويات شعبية", "image": IMG_BAKLAVA},
    {"name": "خنفروش بحريني", "description": "خنفروش تقليدي بالبيض والدقيق يُقدم مع الشاي", "price": 1.0, "unit": "٦ حبات", "category": "حلويات شعبية", "image": IMG_CLOCHE},
    {"name": "معمول التمر", "description": "معمول محشو بعجوة التمر الفاخرة ومخبوز يومياً", "price": 4.0, "unit": "كيلو", "category": "معمول وكعك", "image": IMG_CLOCHE},
    {"name": "كليجة بحرينية", "description": "كليجة محشوة بالتمر والهيل على الطريقة القديمة", "price": 3.5, "unit": "كيلو", "category": "معمول وكعك", "image": IMG_TRAY},
    {"name": "غريبة بالهيل", "description": "غريبة ناعمة تذوب في الفم بنكهة الهيل", "price": 2.5, "unit": "علبة", "category": "معمول وكعك", "image": IMG_PISTACHIO},
    {"name": "تشكيلة ضيافة مشكلة", "description": "صينية ضيافة فاخرة تجمع أشهر حلوياتنا للمناسبات", "price": 12.0, "unit": "صينية", "category": "تشكيلات الضيافة", "image": IMG_BAKLAVA, "featured": True},
]

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "_id": str(uuid.uuid4()), "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "مدير الحلواجي", "role": "admin", "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin user seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

async def seed_products():
    if await db.products.count_documents({}) == 0:
        now = datetime.now(timezone.utc).isoformat()
        docs = [{"id": str(uuid.uuid4()), "available": True, "featured": False, "created_at": now, **p} for p in SEED_PRODUCTS]
        await db.products.insert_many(docs)
        logger.info("Seeded %d products", len(docs))

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("id", unique=True)
    await db.orders.create_index("id", unique=True)
    await seed_admin()
    await seed_products()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
