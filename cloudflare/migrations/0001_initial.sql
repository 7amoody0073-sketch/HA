CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL CHECK (price >= 0),
  unit TEXT NOT NULL DEFAULT 'حبة',
  category TEXT NOT NULL DEFAULT 'أخرى',
  image TEXT NOT NULL DEFAULT '',
  available INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  options_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS products_available_idx ON products(available);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  data_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  fulfillment TEXT NOT NULL,
  delivery_area TEXT NOT NULL DEFAULT '',
  delivery_fee REAL NOT NULL DEFAULT 0,
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  items_json TEXT NOT NULL,
  total REAL NOT NULL CHECK (total >= 0),
  paid INTEGER NOT NULL DEFAULT 0,
  payment TEXT NOT NULL DEFAULT 'unpaid',
  order_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);
CREATE INDEX IF NOT EXISTS orders_order_number_idx ON orders(order_number);

CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES admins(email) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS order_sequence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value INTEGER NOT NULL
);

INSERT OR IGNORE INTO order_sequence (id, value) VALUES (1, 0);
